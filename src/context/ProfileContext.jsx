import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useTasks } from './TaskContext';
import { syncService } from '../services/syncService';

const ProfileContext = createContext();

export const useProfile = () => useContext(ProfileContext);

export const ProfileProvider = ({ children }) => {
    const { preferences, theme, tasks, setPreferences, setTheme, setTasks } = useTasks();
    const [user, setUser] = useState(null); // { id, email, handle }
    const [syncStatus, setSyncStatus] = useState('idle'); // 'idle', 'syncing', 'error', 'synced'
    const [conflict, setConflict] = useState(null); // { local, remote }

    // Atomic lock to prevent "Echo Pushes" (Client A -> Server -> Client A -> Server)
    const isApplyingRemote = useRef(false);

    // SYNC METADATA REFS
    const deviceId = useRef(localStorage.getItem('ticktasker_device_id') || (() => {
        const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem('ticktasker_device_id', id);
        return id;
    })()).current;

    // Track timestamps for 3-way merge
    // lastSyncedAt: Time we last successfully agreed with server
    // localUpdatedAt: Time of last user interaction (change) on this device
    const syncState = useRef({
        lastSyncedAt: parseInt(localStorage.getItem('ticktasker_last_synced') || '0', 10),
        localUpdatedAt: 0
    });

    const updateLastSynced = (ts) => {
        syncState.current.lastSyncedAt = ts;
        localStorage.setItem('ticktasker_last_synced', ts.toString());
    };

    // HELPER: Sort object keys for stable stringify comparison

    // HELPER: Sort object keys for stable stringify comparison
    const stableStringify = (obj) => {
        if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
        if (Array.isArray(obj)) return JSON.stringify(obj.map(item => JSON.parse(stableStringify(item))));
        const sortedKeys = Object.keys(obj).sort();
        const result = {};
        sortedKeys.forEach(key => {
            result[key] = JSON.parse(stableStringify(obj[key]));
        });
        return JSON.stringify(result);
    };

    // Load user from session on mount (simplified auth persistence)
    useEffect(() => {
        const storedUser = sessionStorage.getItem('ticktasker_user');
        if (storedUser) {
            const parsed = JSON.parse(storedUser);
            setUser(parsed);
            // Trigger initial pull to ensure fresh data on reload
            pullProfile(parsed.email);
        }
    }, []);

    // POLLING (Heartbeat) - Pull every 3 seconds
    useEffect(() => {
        if (!user || conflict) return;

        const interval = setInterval(() => {
            pullProfile(user.email, true); // true = isBackground
        }, 3000);

        return () => clearInterval(interval);
    }, [user, conflict]);

    // -------------------------------------------------------------------------
    // LOGIN / LOGOUT
    // -------------------------------------------------------------------------
    const login = async (email) => {
        setSyncStatus('syncing');
        try {
            const userData = await syncService.login(email);
            setUser(userData);
            sessionStorage.setItem('ticktasker_user', JSON.stringify(userData));

            // Initial Pull
            await pullProfile(userData.email);
        } catch (err) {
            console.error(err);
            setSyncStatus('error');
        }
    };

    const logout = () => {
        setUser(null);
        sessionStorage.removeItem('ticktasker_user');
        setSyncStatus('idle');
        setConflict(null);
    };

    // -------------------------------------------------------------------------
    // SYNC LOGIC
    // -------------------------------------------------------------------------

    // PULL (Downstream)
    const pullProfile = async (email, isBackground = false) => {
        if (!isBackground) setSyncStatus('syncing');
        try {
            const remoteData = await syncService.getProfile(email);

            if (remoteData) {
                // Construct comparable objects
                const localData = { preferences, theme, tasks };

                // Ensure field consistency for comparison (remote might have extra fields like updatedAt)
                const comparableRemote = {
                    preferences: remoteData.preferences,
                    theme: remoteData.theme,
                    tasks: remoteData.tasks || []
                };

                // Check metadata
                const remoteUpdatedAt = remoteData.updatedAt ? new Date(remoteData.updatedAt).getTime() : 0;
                const remoteDeviceId = remoteData.updatedBy; // Who made this change?

                // 1. Is Remote Newer than our last sync?
                const isRemoteNew = remoteUpdatedAt > syncState.current.lastSyncedAt;

                if (isRemoteNew) {
                    // Remote has changed since we last synced.

                    // 2. Did WE change anything since last sync?
                    // We check if our localUpdatedAt is ALSO newer than lastSyncedAt
                    const isLocalDirty = syncState.current.localUpdatedAt > syncState.current.lastSyncedAt;

                    // 3. Conflict Condition:
                    // Both changed + Different Updaters (avoid conflict if WE pushed comparison earlier and are just getting it back, though Push logic usually updates lastSyncedAt to avoid this)
                    const isConflict = isLocalDirty && remoteDeviceId !== deviceId;

                    if (isConflict) {
                        console.log('[Sync] CONFLICT DETECTED', {
                            remote: new Date(remoteUpdatedAt).toISOString(),
                            local: new Date(syncState.current.localUpdatedAt).toISOString(),
                            lastSync: new Date(syncState.current.lastSyncedAt).toISOString(),
                            remoteUser: remoteDeviceId,
                            me: deviceId
                        });

                        // We need the raw data for the modal to compare/restore
                        setConflict({ local: { preferences, theme, tasks }, remote: remoteData }); // Pass current local state vs remote state
                        setSyncStatus('idle');

                    } else {
                        // No conflict (Safe to Auto-Merge or Fast-Forward)
                        // Either local is clean (we didn't touch it), OR we updated it but it was US who updated remote (echo)
                        // If remoteDeviceId === deviceId, it's just our own echo coming back usually.

                        console.log('[Sync] Auto-accepting remote update');
                        isApplyingRemote.current = true; // LOCK

                        // Apply Data
                        if (remoteData.preferences) setPreferences(remoteData.preferences);
                        if (remoteData.theme) setTheme(remoteData.theme);
                        if (remoteData.tasks) setTasks(remoteData.tasks);

                        // Update Sync State
                        updateLastSynced(remoteUpdatedAt);

                        setSyncStatus('synced');

                        // Release Lock
                        setTimeout(() => { isApplyingRemote.current = false; }, 500);
                    }
                } else {
                    // Remote is old or equal. Nothing to pull.
                    setSyncStatus('synced');
                }
            } else {
                // No remote profile, initialize it
                await pushProfile(email, { preferences, theme, tasks });
            }
        } catch (err) {
            console.error(err);
            setSyncStatus('error');
        }
    };

    // PUSH (Upstream) - Debounced effect
    useEffect(() => {
        if (!user) return;
        if (conflict) return;

        // If we are currently applying a remote update, DO NOT flag local as dirty
        if (isApplyingRemote.current) return;

        // Mark local as dirty/updated NOW
        syncState.current.localUpdatedAt = Date.now();

        const timer = setTimeout(() => {
            pushProfile(user.email, { preferences, theme, tasks });
        }, 2000);

        return () => clearTimeout(timer);
    }, [preferences, theme, tasks, user, conflict]); // Dependencies trigger on any change

    const pushProfile = async (email, data) => {
        if (syncStatus === 'syncing') return;
        setSyncStatus('syncing');
        try {
            // Attach Metadata
            const payload = {
                ...data,
                updatedAt: new Date().toISOString(), // Server expects ISO typically, or number. Using ISO for clarity.
                updatedBy: deviceId
            };

            const saved = await syncService.updateProfile(email, payload);

            // On success, we are now "Synced" up to this point
            // We update lastSyncedAt to the time OF THIS PUSH (or the time returned by server)
            const pushTime = new Date(saved.updatedAt).getTime();
            updateLastSynced(pushTime);

            setSyncStatus('synced');
        } catch (err) {
            setSyncStatus('error');
        }
    };

    // -------------------------------------------------------------------------
    // CONFLICT RESOLUTION
    // -------------------------------------------------------------------------
    const resolveConflict = (choice) => {
        // choice: 'use_remote' | 'keep_local'
        if (!user || !conflict) return;

        if (choice === 'use_remote') {
            // Apply Remote to Local
            isApplyingRemote.current = true;
            setPreferences(conflict.remote.preferences);
            setTheme(conflict.remote.theme);
            if (conflict.remote.tasks) setTasks(conflict.remote.tasks);

            // We accept remote, so we are now synced to it
            updateLastSynced(new Date(conflict.remote.updatedAt).getTime());

            setSyncStatus('synced');
            setTimeout(() => { isApplyingRemote.current = false; }, 500);

        } else {
            // Force Push Local -> Remote
            // We just trigger a pushProfile call immediately, effectively winning.
            pushProfile(user.email, { preferences, theme, tasks });
        }
        setConflict(null);
    };

    return (
        <ProfileContext.Provider value={{
            user,
            login,
            logout,
            syncStatus,
            conflict,
            resolveConflict
        }}>
            {children}
        </ProfileContext.Provider>
    );
};
