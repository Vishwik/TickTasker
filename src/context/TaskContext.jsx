import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { sortTasksBySmartPriority } from '../utils/prioritizationAlgo';
import { DEFAULT_MODEL, predictScore, trainModel, extractFeatures } from '../utils/AIEngine';
import { useProfile } from './ProfileContext';
import { db } from '../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, updateDoc, writeBatch, getDoc } from 'firebase/firestore';

const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const TaskContext = createContext();
export const useTasks = () => useContext(TaskContext);

export const TaskProvider = ({ children }) => {
    const { user } = useProfile();
    const [syncStatus, setSyncStatus] = useState('offline'); // 'offline', 'syncing', 'synced', 'error'

    // Tasks State
    const [tasks, setTasks] = useState([]);

    const categoryStats = React.useMemo(() => {
        return tasks.reduce((acc, t) => {
            if (t.status === 'completed') {
                acc[t.category] = (acc[t.category] || 0) + 1;
            }
            return acc;
        }, {});
    }, [tasks]);

    const [aiModel, setAiModel] = useState(DEFAULT_MODEL);

    const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [settingsActiveTab, setSettingsActiveTab] = useState('appearance');
    const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
    const [breakdownTask, setBreakdownTask] = useState(null);
    const [editingTaskId, setEditingTaskId] = useState(null);
    const [newTaskInitialTitle, setNewTaskInitialTitle] = useState('');
    const [notifications, setNotifications] = useState([]);

    const [filterState, setFilterState] = useState({
        status: 'all', timeFrame: null, priority: [], category: []
    });

    const [preferences, setPreferences] = useState({ labs_focusFlow: false, labs_weeklyGoals: false, labs_experimentalAI: false });
    const [theme, setTheme] = useState({ mode: 'dark', accent: 'indigo', density: 'comfortable', radius: 'soft', fontScale: 'normal' });

    // Theme Effect
    useEffect(() => {
        const root = document.documentElement;
        const modes = {
            dark: { base: '#0f1115', surface: '#16181d', text: '#ffffff', border: 'rgba(255,255,255,0.1)' },
            dim: { base: '#1a1b1e', surface: '#25262b', text: '#e0e0e0', border: 'rgba(255,255,255,0.08)' },
            light: { base: '#f8fafc', surface: '#ffffff', text: '#0f172a', border: 'rgba(0,0,0,0.1)' }
        };
        const currentMode = modes[theme.mode];
        root.style.setProperty('--bg-base', currentMode.base);
        root.style.setProperty('--bg-surface', currentMode.surface);
        root.style.setProperty('--text-primary', currentMode.text);
        root.style.setProperty('--border-base', currentMode.border);

        const accents = { indigo: '99, 102, 241', violet: '139, 92, 246', emerald: '16, 185, 129', rose: '244, 63, 94', amber: '245, 158, 11' };
        root.style.setProperty('--color-accent', accents[theme.accent]);
        root.dataset.radius = theme.radius;
        root.dataset.fontScale = theme.fontScale;
        root.style.setProperty('--radius-base', theme.radius === 'soft' ? '1rem' : '0.25rem');
        root.style.setProperty('--font-scale', theme.fontScale === 'normal' ? '1' : '1.1');
        root.style.setProperty('--space-unit', theme.density === 'comfortable' ? '1rem' : '0.75rem');

        root.className = `theme-${theme.mode}`;
    }, [theme, user]);

    const updateTheme = (key, value) => {
        const newTheme = { ...theme, [key]: value };
        setTheme(newTheme);
        if (user) {
            setDoc(doc(db, `users/${user.uid}/profile`, 'theme'), newTheme).catch(console.error);
        }
    };

    const togglePreference = (key) => {
        const newPrefs = { ...preferences, [key]: !preferences[key] };
        setPreferences(newPrefs);
        if (user) {
            setDoc(doc(db, `users/${user.uid}/profile`, 'preferences'), newPrefs).catch(console.error);
        }
    };

    // Firebase Sync Effect
    useEffect(() => {
        if (!user) return;

        setSyncStatus('syncing');

        // Load Preferences & Theme initially
        getDoc(doc(db, `users/${user.uid}/profile`, 'preferences')).then(docSnap => {
            if (docSnap.exists()) setPreferences(docSnap.data());
        });
        getDoc(doc(db, `users/${user.uid}/profile`, 'theme')).then(docSnap => {
            if (docSnap.exists()) setTheme(docSnap.data());
        });

        // Real-time listener for tasks
        const unsubscribe = onSnapshot(collection(db, `users/${user.uid}/tasks`), (snapshot) => {
            const cloudTasks = snapshot.docs.map(doc => doc.data());
            setTasks(cloudTasks);
            setSyncStatus('synced');
        }, (error) => {
            console.error("Firestore sync error:", error);
            setSyncStatus('error');
        });

        return () => unsubscribe();
    }, [user]);

    const sortedTasks = React.useMemo(() => {
        const topLevelTasks = tasks.filter(t => !t.parentId && t.status !== 'deleted');
        const tasksWithScores = topLevelTasks.map(t => ({
            ...t, aiScore: predictScore(t, categoryStats, aiModel)
        }));
        return sortTasksBySmartPriority(tasksWithScores, categoryStats);
    }, [tasks, categoryStats, aiModel]);

    const viewTasks = React.useMemo(() => {
        return sortedTasks.filter(task => {
            if (filterState.status !== 'all' && task.status !== filterState.status) return false;
            if (filterState.timeFrame) {
                if (!task.deadline) return false;
                const today = new Date(); today.setHours(0, 0, 0, 0);
                const taskDate = new Date(task.deadline); taskDate.setHours(0, 0, 0, 0);
                const diffDays = Math.ceil((taskDate - today) / (1000 * 60 * 60 * 24));

                if (filterState.timeFrame === 'today' && diffDays !== 0) return false;
                if (filterState.timeFrame === 'overdue' && (diffDays >= 0 || task.status === 'completed')) return false;
                if (filterState.timeFrame === 'week' && (diffDays < 0 || diffDays > 7)) return false;
            }
            if (filterState.priority.length > 0 && !filterState.priority.includes(task.importance)) return false;
            if (filterState.category.length > 0 && !filterState.category.includes(task.category)) return false;
            return true;
        });
    }, [sortedTasks, filterState]);

    const updateFilter = (updates) => setFilterState(prev => ({ ...prev, ...updates }));
    const clearFilters = () => setFilterState({ status: 'all', timeFrame: null, priority: [], category: [] });

    // Notifications
    const backgroundEventTimestamps = React.useRef({});
    const notifiedDeadlineTaskIds = React.useRef(new Set());

    const addNotification = (titleOrPayload, message, type = 'info', context = null) => {
        let payload;
        if (typeof titleOrPayload === 'object') {
            payload = { kind: 'alert', priority: 'normal', ...titleOrPayload };
        } else {
            const title = titleOrPayload;
            if (type === 'error' || type === 'warning') {
                payload = { title, message, kind: 'alert', priority: 'high', type };
            } else {
                payload = { title, message, kind: 'info', priority: 'normal', type: 'success' };
            }
        }

        const { title, kind } = payload;
        if (kind === 'ai_priority') {
            const now = Date.now();
            const lastTime = backgroundEventTimestamps.current['ai_priority'] || 0;
            if (now - lastTime < 120000) return;
            backgroundEventTimestamps.current['ai_priority'] = now;
        }

        setNotifications(prev => {
            const now = new Date();
            const existingIndex = prev.findIndex(n => n.title === payload.title && n.kind === payload.kind && (now - new Date(n.timestamp)) < 120000);
            if (existingIndex !== -1) {
                const existing = prev[existingIndex];
                const others = [...prev];
                others.splice(existingIndex, 1);
                return [{ ...existing, count: (existing.count || 1) + 1, timestamp: now, read: false }, ...others];
            }
            return [{ id: generateUUID(), ...payload, timestamp: now, read: false, count: 1 }, ...prev];
        });
    };

    useEffect(() => {
        const checkDeadlines = () => {
            const now = new Date();
            tasks.forEach(task => {
                if (task.status === 'completed' || !task.deadline) return;
                if (notifiedDeadlineTaskIds.current.has(task.id)) return;

                const diffHours = (new Date(task.deadline) - now) / (1000 * 60 * 60);
                if (diffHours > 0 && diffHours <= 24) {
                    addNotification({ kind: 'deadline', title: 'Approaching Deadline', message: `"${task.title}" is due in ${Math.ceil(diffHours)} hours.`, priority: 'high', context: { parentTaskTitle: task.category } });
                    notifiedDeadlineTaskIds.current.add(task.id);
                } else if (diffHours < 0) {
                    addNotification({ kind: 'alert', title: 'Missed Deadline', message: `"${task.title}" was due on ${new Date(task.deadline).toLocaleDateString()}.`, priority: 'critical', context: { parentTaskTitle: task.category } });
                    notifiedDeadlineTaskIds.current.add(task.id);
                }
            });
        };
        checkDeadlines();
        const interval = setInterval(checkDeadlines, 60000);
        return () => clearInterval(interval);
    }, [tasks]);

    const markAllAsRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    const clearNotifications = () => setNotifications([]);

    // CRUD Operations
    const addTask = async (task) => {
        const newTask = { ...task, id: generateUUID(), status: 'pending', updatedAt: new Date().toISOString() };
        addNotification(`Task Added`, `"${task.title}" has been added to your list.`, 'success');
        
        if (user) {
            await setDoc(doc(db, `users/${user.uid}/tasks`, newTask.id), newTask);
        }
    };

    const updateTaskStatus = async (id, status) => {
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        if (status === 'completed') {
            addNotification(`Nicely Done!`, `You completed "${task.title}".`, 'success');
            const log = { features: extractFeatures(task, categoryStats), target: 1.0 };
            setAiModel(prevModel => {
                const newModel = trainModel(log, prevModel);
                const nextTopTask = tasks.find(t => t.id !== id && t.status === 'pending' && t.importance === 'High');
                if (nextTopTask && Math.random() > 0.3) {
                    addNotification({ kind: 'ai_priority', title: 'High-Impact Task Surfaced', message: `"${nextTopTask.title}" has been moved to your Focus Queue.`, priority: 'high', context: { parentTaskTitle: 'AI Optimization' } });
                }
                return newModel;
            });
        }

        const updatedFields = {
            status,
            completedAt: status === 'completed' ? new Date().toISOString() : task.completedAt,
            updatedAt: new Date().toISOString()
        };

        if (user) {
            await updateDoc(doc(db, `users/${user.uid}/tasks`, id), updatedFields);
        }
    };

    const editTask = async (id, updatedFields) => {
        const oldTask = tasks.find(t => t.id === id);
        if (!oldTask) return;

        if (updatedFields.deadline && oldTask.deadline && new Date(updatedFields.deadline) > new Date(oldTask.deadline)) {
            addNotification({ kind: 'ai_priority', title: 'Smart Schedule Alert', message: 'Frequent delays detected. Prioritizing this task.', priority: 'normal', context: { parentTaskTitle: 'AI Analysis' } });
            setAiModel(model => trainModel({ features: extractFeatures(oldTask, categoryStats), target: 0.0 }, model));
        }
        addNotification(`Task Updated`, `"${oldTask.title}" has been updated.`, 'info');

        const finalUpdate = { ...updatedFields, updatedAt: new Date().toISOString() };
        if (user) {
            await updateDoc(doc(db, `users/${user.uid}/tasks`, id), finalUpdate);
        }
    };

    const deleteTask = async (id) => {
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        addNotification(`Task Deleted`, `"${task.title}" has been removed.`, 'warning');
        const idsToDelete = [id, ...(task.childIds || [])];
        const now = new Date().toISOString();

        if (user) {
            const batch = writeBatch(db);
            idsToDelete.forEach(taskId => {
                batch.update(doc(db, `users/${user.uid}/tasks`, taskId), { status: 'deleted', updatedAt: now });
            });
            await batch.commit();
        }
    };

    const addSubtasks = async (parentId, newSubtasks) => {
        const parent = tasks.find(t => t.id === parentId);
        if (!parent) return;

        const createdTasks = newSubtasks.map(st => ({
            id: generateUUID(), title: st.title, duration: st.duration, status: 'pending',
            importance: parent.importance, category: parent.category, deadline: parent.deadline, parentId: parentId
        }));
        const newChildIds = createdTasks.map(t => t.id);
        const combinedChildIds = [...(parent.childIds || []), ...newChildIds];

        if (user) {
            const batch = writeBatch(db);
            createdTasks.forEach(task => batch.set(doc(db, `users/${user.uid}/tasks`, task.id), task));
            batch.update(doc(db, `users/${user.uid}/tasks`, parentId), { childIds: combinedChildIds, isExpanded: true });
            await batch.commit();
        }
    };

    const toggleTaskExpansion = async (id) => {
        const task = tasks.find(t => t.id === id);
        if (!task) return;
        
        if (user) {
            await updateDoc(doc(db, `users/${user.uid}/tasks`, id), { isExpanded: !task.isExpanded });
        }
    };

    const getCompletionRate = () => {
        const completed = tasks.filter(t => t.status === 'completed').length;
        if (tasks.length === 0) return 0;
        return Math.round((completed / tasks.length) * 100);
    };

    const getInsights = () => {
        if (tasks.length === 0) return "Add tasks to see insights.";
        const { weights } = aiModel;
        const highestWeight = Object.entries(weights).reduce((a, b) => a[1] > b[1] ? a : b);
        const [wKey, wVal] = highestWeight;
        const completed = tasks.filter(t => t.status === 'completed').length;

        if (completed > 5 && wKey === 'w_category') {
            let maxCat = null, maxCount = -1;
            Object.entries(categoryStats).forEach(([cat, count]) => { if (count > maxCount) { maxCount = count; maxCat = cat; } });
            return `You're laser-focused on ${maxCat} work lately.`;
        }
        if (wKey === 'w_urgency' && wVal > 0.6) return "You tend to prioritize deadlines over everything else.";
        if (wKey === 'w_overdue' && wVal > 2.5) return "You're clearing your backlog nicely.";
        if (completed > 2) return "I'm learning your flow. Priorities are adapting.";
        return "Complete more tasks to unlock personalized insights.";
    };

    const getWeeklySnapshot = () => ({
        completed: Object.values(categoryStats).reduce((a, b) => a + b, 0),
        pending: tasks.filter(t => t.status === 'pending').length
    });

    return (
        <TaskContext.Provider value={{
            tasks, sortedTasks, viewTasks, categoryStats, filterState, updateFilter, clearFilters,
            addTask, updateTaskStatus, editTask, deleteTask, getCompletionRate, getInsights, getWeeklySnapshot,
            isAddTaskModalOpen, setIsAddTaskModalOpen, notifications, markAllAsRead, clearNotifications,
            isCommandPaletteOpen, setIsCommandPaletteOpen, isSettingsModalOpen, setIsSettingsModalOpen,
            settingsActiveTab, setSettingsActiveTab,
            isPrivacyModalOpen, setIsPrivacyModalOpen, breakdownTask, setBreakdownTask, editingTaskId, setEditingTaskId,
            aiModel, addSubtasks, toggleTaskExpansion, preferences, togglePreference, setPreferences,
            newTaskInitialTitle, setNewTaskInitialTitle, theme, updateTheme, setTheme, setTasks,
            isSidebarOpen, setIsSidebarOpen, syncStatus
        }}>
            {children}
        </TaskContext.Provider>
    );
};
