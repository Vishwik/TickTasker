// src/services/syncService.js

// REAL Remote Storage (Express Backend)
// Dynamically determine the backend URL based on the current hostname
// This works for localhost (localhost:3001) AND network IP (192.168.x.x:3001)
const API_BASE = `http://${window.location.hostname}:3001`;

// Polyfill for insecure contexts
const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

export const syncService = {
    // 1. Get Profile (Pull)
    async getProfile(email) {
        try {
            // Using email as profileId for simplicity in this demo
            const response = await fetch(`${API_BASE}/tasks/${email}`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            // Backend returns empty array [] if not found, or the object. 
            // Our backend code: res.json(tasksByProfile[id] || [])
            if (Array.isArray(data) && data.length === 0) return null;
            return data;
        } catch (error) {
            console.error("Sync Error:", error);
            throw error;
        }
    },

    // 2. Update Profile (Push)
    async updateProfile(email, profileData) {
        try {
            const payload = {
                ...profileData,
                updatedAt: new Date().toISOString()
            };

            const response = await fetch(`${API_BASE}/tasks/${email}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error('Network response was not ok');
            const res = await response.json();
            console.log('[Sync] Remote Updated:', payload);
            return payload;
        } catch (error) {
            console.error("Sync Error:", error);
            throw error;
        }
    },

    // 3. Login (Mock - still client-side for now as backend has no auth)
    async login(email) {
        // In a real app, this would hit an auth endpoint.
        // For Step 6, we just accept the email.
        return {
            id: generateUUID(),
            email: email,
            handle: email.split('@')[0]
        };
    }
};
