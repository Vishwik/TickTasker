import React, { createContext, useContext, useState, useEffect } from 'react';
import { sortTasksBySmartPriority } from '../utils/prioritizationAlgo';
import { DEFAULT_MODEL, predictScore, trainModel, extractFeatures } from '../utils/AIEngine';

// Polyfill for insecure contexts (HTTP) where crypto.randomUUID is unavailable
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
    // Load from localStorage or use defaults
    // Load from localStorage or use defaults
    const [tasks, setTasks] = useState(() => {
        const saved = localStorage.getItem('ticktasker_tasks');
        return saved ? JSON.parse(saved) : [
            { id: generateUUID(), title: 'Machine Learning Project', importance: 'High', deadline: new Date(Date.now() + 86400000).toISOString().split('T')[0], status: 'pending', category: 'Academic' },
            { id: generateUUID(), title: 'Web Lab Record', importance: 'Medium', deadline: new Date(Date.now() + 172800000).toISOString().split('T')[0], status: 'pending', category: 'Lab' },
            { id: generateUUID(), title: 'Internship Application', importance: 'High', deadline: new Date(Date.now() + 432000000).toISOString().split('T')[0], status: 'pending', category: 'Career' },
            { id: generateUUID(), title: 'Weekly Gym Session', importance: 'Low', deadline: new Date(Date.now() + 604800000).toISOString().split('T')[0], status: 'completed', category: 'Personal' },
        ];
    });

    // FIX #2: Derive categoryStats (Result: No desync bugs)
    const categoryStats = React.useMemo(() => {
        return tasks.reduce((acc, t) => {
            if (t.status === 'completed') {
                acc[t.category] = (acc[t.category] || 0) + 1;
            }
            return acc;
        }, {});
    }, [tasks]);

    // AI Model State
    const [aiModel, setAiModel] = useState(() => {
        const saved = localStorage.getItem('ticktasker_ai_model');
        return saved ? JSON.parse(saved) : DEFAULT_MODEL;
    });

    const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Default open (desktop), handled by Layout effect
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

    const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
    const [breakdownTask, setBreakdownTask] = useState(null); // Global Breakdown Modal State
    const [editingTaskId, setEditingTaskId] = useState(null);
    const [newTaskInitialTitle, setNewTaskInitialTitle] = useState('');
    const [notifications, setNotifications] = useState([]);

    // Filter State
    const [filterState, setFilterState] = useState({
        status: 'all',
        timeFrame: null,      // 'today', 'week', 'overdue'
        priority: [],         // ['High', 'Medium']
        category: []          // ['Academic', 'Personal']
    });

    // Labs / Preferences State
    const [preferences, setPreferences] = useState(() => {
        const saved = localStorage.getItem('ticktasker_preferences');
        return saved ? JSON.parse(saved) : {
            labs_focusFlow: false,
            labs_weeklyGoals: false,
            labs_experimentalAI: false
        };
    });

    // Theme Preferences (New - R5 Personalization)
    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem('ticktasker_theme');
        return saved ? JSON.parse(saved) : {
            mode: 'dark',
            accent: 'indigo',
            density: 'comfortable',
            radius: 'soft',
            fontScale: 'normal'
        };
    });

    // Theme Application Effect
    useEffect(() => {
        const root = document.documentElement;

        // 1. Mode (Backgrounds & Text base)
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

        // 2. Accent Colors (RGB for opacity support)
        const accents = {
            indigo: '99, 102, 241',
            violet: '139, 92, 246',
            emerald: '16, 185, 129',
            rose: '244, 63, 94',
            amber: '245, 158, 11'
        };
        root.style.setProperty('--color-accent', accents[theme.accent]);

        // 3. Density & Radius & Scale
        root.dataset.radius = theme.radius; // 'soft' | 'sharp'
        root.dataset.fontScale = theme.fontScale; // 'normal' | 'large'

        // Legacy/Fallback variables
        root.style.setProperty('--radius-base', theme.radius === 'soft' ? '1rem' : '0.25rem');
        root.style.setProperty('--font-scale', theme.fontScale === 'normal' ? '1' : '1.1');

        // Density handled via class for Tailwind spacing overrides (if needed) or Var
        root.style.setProperty('--space-unit', theme.density === 'comfortable' ? '1rem' : '0.75rem');

        // Persist
        localStorage.setItem('ticktasker_theme', JSON.stringify(theme));

        // Helper class for specific overrides
        root.className = `theme-${theme.mode}`;

    }, [theme]);

    const updateTheme = (key, value) => {
        setTheme(prev => ({ ...prev, [key]: value }));
    };

    // Persistence
    useEffect(() => {
        localStorage.setItem('ticktasker_tasks', JSON.stringify(tasks));
        // Removed categoryStats persistence (now derived)
        localStorage.setItem('ticktasker_ai_model', JSON.stringify(aiModel));
    }, [tasks, aiModel]);

    // Computed: Hybrid Sorting (Rule-Based + AI Score)
    // Rule #5 Compliance: Derived data should not be stored in state
    const sortedTasks = React.useMemo(() => {
        // Filter out subtasks (parentId exists) AND deleted tasks
        const topLevelTasks = tasks.filter(t => !t.parentId && t.status !== 'deleted');

        const tasksWithScores = topLevelTasks.map(t => ({
            ...t,
            aiScore: predictScore(t, categoryStats, aiModel)
        }));
        return sortTasksBySmartPriority(tasksWithScores, categoryStats);
    }, [tasks, categoryStats, aiModel]);

    // Computed: Filtered Tasks
    const viewTasks = React.useMemo(() => {
        return sortedTasks.filter(task => { // Use sortedTasks for view to respect priority
            // 1. Status Filter
            if (filterState.status !== 'all' && task.status !== filterState.status) return false;

            // 2. Time Frame
            if (filterState.timeFrame) {
                if (!task.deadline) return false;

                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const taskDate = new Date(task.deadline);
                taskDate.setHours(0, 0, 0, 0); // normalize

                const diffTime = taskDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (filterState.timeFrame === 'today') {
                    if (diffDays !== 0) return false;
                }
                if (filterState.timeFrame === 'overdue') {
                    if (diffDays >= 0 && task.status !== 'completed') return false;
                    if (task.status === 'completed') return false;
                }
                if (filterState.timeFrame === 'week') {
                    if (diffDays < 0 || diffDays > 7) return false;
                }
            }

            // 3. Priority (Multi-select OR)
            if (filterState.priority.length > 0) {
                if (!filterState.priority.includes(task.importance)) return false;
            }

            // 4. Category (Multi-select OR)
            if (filterState.category.length > 0) {
                if (!filterState.category.includes(task.category)) return false;
            }

            return true;
        });
    }, [sortedTasks, filterState]);

    const updateFilter = (updates) => {
        setFilterState(prev => ({ ...prev, ...updates }));
    };

    const clearFilters = () => {
        setFilterState({
            status: 'all',
            timeFrame: null,
            priority: [],
            category: []
        });
    };

    // Rate Limiting Ref
    const backgroundEventTimestamps = React.useRef({});
    // Deduping Ref for Deadlines
    const notifiedDeadlineTaskIds = React.useRef(new Set());

    const addNotification = (titleOrPayload, message, type = 'info', context = null) => {
        let payload;

        // Overload Handling
        if (typeof titleOrPayload === 'object') {
            // New API
            payload = {
                kind: 'alert', // Default to generic alert
                priority: 'normal',
                ...titleOrPayload
            };
        } else {
            // Legacy API -> Map to new model
            // Only keeping critical system warnings if they come through legacy paths
            const title = titleOrPayload;

            if (type === 'error' || type === 'warning') {
                payload = {
                    title,
                    message,
                    kind: 'alert',
                    priority: 'high',
                    type
                };
            } else {
                // Restore Legacy Info/Success (User Request: "Back to previous state")
                payload = {
                    title,
                    message,
                    kind: 'info', // Default kind
                    priority: 'normal',
                    type: 'success' // or info
                };
            }
        }

        const { title, kind } = payload;

        // 1. Rate Limiting for Background Events (AI)
        if (kind === 'ai_priority') {
            const now = Date.now();
            const lastTime = backgroundEventTimestamps.current['ai_priority'] || 0;
            // 2 minutes cooldown to avoid spamming "Priority Adjusted"
            if (now - lastTime < 120000) {
                return;
            }
            backgroundEventTimestamps.current['ai_priority'] = now;
        }

        setNotifications(prev => {
            const now = new Date();

            // 2. Coalescing (Global Merge)
            const existingIndex = prev.findIndex(n =>
                n.title === payload.title &&
                n.kind === payload.kind &&
                (now - new Date(n.timestamp)) < 120000 // 2 min window
            );

            if (existingIndex !== -1) {
                const existing = prev[existingIndex];
                const others = [...prev];
                others.splice(existingIndex, 1);

                const updated = {
                    ...existing,
                    count: (existing.count || 1) + 1,
                    timestamp: now,
                    read: false
                };
                return [updated, ...others];
            }

            // 3. Add New
            const newNotification = {
                id: generateUUID(),
                ...payload,
                timestamp: now,
                read: false,
                count: 1
            };
            return [newNotification, ...prev];
        });
    };

    // PHASE 3: Smart Deadline Reminders & Alerts
    useEffect(() => {
        const checkDeadlines = () => {
            const now = new Date();
            tasks.forEach(task => {
                if (task.status === 'completed' || !task.deadline) return;

                if (notifiedDeadlineTaskIds.current.has(task.id)) return;

                const deadline = new Date(task.deadline);
                const diffMs = deadline - now;
                const diffHours = diffMs / (1000 * 60 * 60);

                // Logic: Alert if due within 24 hours (Smart Reminder)
                if (diffHours > 0 && diffHours <= 24) {
                    addNotification({
                        kind: 'deadline',
                        title: 'Approaching Deadline',
                        message: `"${task.title}" is due in ${Math.ceil(diffHours)} hours.`,
                        priority: 'high',
                        context: { parentTaskTitle: task.category } // Use category as context for now
                    });
                    notifiedDeadlineTaskIds.current.add(task.id);
                }
                // Logic: Alert if Overdue (Task Alert)
                else if (diffHours < 0) {
                    addNotification({
                        kind: 'alert',
                        title: 'Missed Deadline',
                        message: `"${task.title}" was due on ${deadline.toLocaleDateString()}.`,
                        priority: 'critical',
                        context: { parentTaskTitle: task.category }
                    });
                    notifiedDeadlineTaskIds.current.add(task.id);
                }
            });
        };

        // Run check immediately and then every minute
        checkDeadlines();
        const interval = setInterval(checkDeadlines, 60000);
        return () => clearInterval(interval);
    }, [tasks]); // Re-run when tasks change

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const clearNotifications = () => {
        setNotifications([]);
    };

    const addTask = (task) => {
        const newTask = {
            ...task,
            id: generateUUID(),
            status: 'pending',
            updatedAt: new Date().toISOString()
        };
        setTasks(prev => [...prev, newTask]);
        addNotification(`Task Added`, `"${task.title}" has been added to your list.`, 'success');
    };

    const updateTaskStatus = (id, status) => {
        setTasks(prevTasks => {
            const task = prevTasks.find(t => t.id === id);

            // Side Effects (Notifications/AI)
            if (status === 'completed') {
                setTimeout(() => {
                    addNotification(`Nicely Done!`, `You completed "${task.title}".`, 'success');

                    const log = { features: extractFeatures(task, categoryStats), target: 1.0 };

                    // Train Model & Simulate AI Prioritization Surface
                    setAiModel(prevModel => {
                        const newModel = trainModel(log, prevModel);

                        // Simulate "Surfacing High-Impact Task"
                        // Find a pending high-priority task to surface
                        const nextTopTask = prevTasks.find(t =>
                            t.id !== id &&
                            t.status === 'pending' &&
                            t.importance === 'High'
                        );

                        if (nextTopTask && Math.random() > 0.3) {
                            addNotification({
                                kind: 'ai_priority',
                                title: 'High-Impact Task Surfaced',
                                message: `"${nextTopTask.title}" has been moved to your Focus Queue.`,
                                priority: 'high',
                                context: { parentTaskTitle: 'AI Optimization' }
                            });
                        }
                        return newModel;
                    });
                }, 0);
            }
            // REMOVED: "Task Updated" (User Request: Alerts Only)

            return prevTasks.map(t => {
                if (t.id === id) {
                    return {
                        ...t,
                        status,
                        completedAt: status === 'completed' ? new Date().toISOString() : t.completedAt,
                        updatedAt: new Date().toISOString()
                    };
                }
                return t;
            });
        });
    };

    const editTask = (id, updatedFields) => {
        setTasks(prev => {
            const oldTask = prev.find(t => t.id === id);
            if (!oldTask) return prev;

            // Check for deadline push (Procrastination) -> Keep this as an "Alert" (AI Warning)
            if (updatedFields.deadline && oldTask.deadline && new Date(updatedFields.deadline) > new Date(oldTask.deadline)) {
                setTimeout(() => {
                    addNotification({
                        kind: 'ai_priority',
                        title: 'Smart Schedule Alert',
                        message: 'Frequent delays detected. Prioritizing this task.',
                        priority: 'normal',
                        context: { parentTaskTitle: 'AI Analysis' }
                    });
                    // AI Training
                    setAiModel(model => {
                        const log = { features: extractFeatures(oldTask, categoryStats), target: 0.0 };
                        return trainModel(log, model);
                    });
                }, 0);
            }
            addNotification(`Task Updated`, `"${oldTask.title}" has been updated.`, 'info');

            return prev.map(t => t.id === id ? { ...t, ...updatedFields, updatedAt: new Date().toISOString() } : t);
        });
    };

    const deleteTask = (id) => {
        setTasks(prev => {
            const task = prev.find(t => t.id === id);
            if (!task) return prev;

            addNotification(`Task Deleted`, `"${task.title}" has been removed.`, 'warning');

            const idsToDelete = [id, ...(task.childIds || [])];
            const now = new Date().toISOString();
            return prev.map(t => {
                if (idsToDelete.includes(t.id)) {
                    return { ...t, status: 'deleted', updatedAt: now };
                }
                return t;
            });
        });
    };

    const addSubtasks = (parentId, newSubtasks) => {
        setTasks(prev => {
            const parent = prev.find(t => t.id === parentId);
            if (!parent) return prev;

            const createdTasks = newSubtasks.map((st, index) => ({
                id: generateUUID(),
                title: st.title,
                duration: st.duration,
                status: 'pending',
                importance: parent.importance,
                category: parent.category,
                deadline: parent.deadline,
                parentId: parentId
            }));

            const newChildIds = createdTasks.map(t => t.id);

            // REMOVED: "Plan Created" (User Request: Alerts Only - unless "Task Alert"?)
            // Assuming creating subtasks is user action, not system alert.

            const withNewTasks = [...prev, ...createdTasks];
            return withNewTasks.map(t => t.id === parentId ? { ...t, childIds: [...(t.childIds || []), ...newChildIds], isExpanded: true } : t);
        });
    };

    const toggleTaskExpansion = (taskId) => {
        setTasks(prev => prev.map(t =>
            t.id === taskId ? { ...t, isExpanded: !t.isExpanded } : t
        ));
    };

    const togglePreference = (key) => {
        setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
        // REMOVED: "Settings Updated" (User Request: Alerts Only)
    };

    // Analytics Helper: Completion Rate
    const getCompletionRate = () => {
        // Only count top-level tasks to avoid skewing stats with tiny subtasks?
        // Or count everything? Let's count everything for "Progress" feel.
        const completed = tasks.filter(t => t.status === 'completed').length;
        if (tasks.length === 0) return 0;
        return Math.round((completed / tasks.length) * 100);
    };

    // Analytics Helper: Natural Language Insights (R5 - Updated for UX)
    const getInsights = () => {
        if (tasks.length === 0) return "Add tasks to see insights.";

        // 1. Analyze Model Weights to explain "Why"
        const { weights } = aiModel;
        const highestWeight = Object.entries(weights)
            .reduce((a, b) => a[1] > b[1] ? a : b); // ['w_urgency', 0.5]

        const [wKey, wVal] = highestWeight;

        // 2. Trend Analysis
        const completed = tasks.filter(t => t.status === 'completed').length;

        // Insight Logic
        if (completed > 5 && wKey === 'w_category') {
            // Find top category
            let maxCat = null;
            let maxCount = -1;
            Object.entries(categoryStats).forEach(([cat, count]) => {
                if (count > maxCount) { maxCount = count; maxCat = cat; }
            });
            return `You're laser-focused on ${maxCat} work lately.`;
        }

        if (wKey === 'w_urgency' && wVal > 0.6) {
            return "You tend to prioritize deadlines over everything else.";
        }

        if (wKey === 'w_overdue' && wVal > 2.5) {
            return "You're clearing your backlog nicely.";
        }

        if (completed > 2) {
            return "I'm learning your flow. Priorities are adapting.";
        }

        return "Complete more tasks to unlock personalized insights.";
    };

    // Weekly Snapshot Helper (R5)
    const getWeeklySnapshot = () => {
        // Simplified for demo: count total interactions
        return {
            completed: Object.values(categoryStats).reduce((a, b) => a + b, 0),
            pending: tasks.filter(t => t.status === 'pending').length
        };
    };

    return (
        <TaskContext.Provider value={{
            tasks, // Explicit FIX #1: Raw Source of Truth
            sortedTasks, // Explicit FIX #1: Derived
            viewTasks, // Exposed Filtered List
            categoryStats, // Exposed for insights
            filterState,
            updateFilter,
            clearFilters,
            addTask,
            updateTaskStatus,
            editTask,
            deleteTask,
            getCompletionRate,
            getInsights,       // New
            getWeeklySnapshot, // New
            isAddTaskModalOpen,
            setIsAddTaskModalOpen,
            notifications,
            markAllAsRead,
            clearNotifications,
            isCommandPaletteOpen,
            setIsCommandPaletteOpen,
            isSettingsModalOpen,
            setIsSettingsModalOpen,
            isPrivacyModalOpen,
            setIsPrivacyModalOpen,
            breakdownTask,
            setBreakdownTask,
            editingTaskId, // New
            setEditingTaskId, // New
            aiModel, // Expose model for debug/UI if needed
            addSubtasks,
            toggleTaskExpansion,

            preferences,
            togglePreference,
            setPreferences, // Exposed for Sync
            newTaskInitialTitle,
            setNewTaskInitialTitle,
            theme,
            updateTheme, // Supports key/value
            setTheme,    // Exposed for Sync (Bulk updates)

            setTasks,     // Exposed for Sync (Task Replacement)
            isSidebarOpen,
            setIsSidebarOpen
        }}>
            {children}
        </TaskContext.Provider>
    );
};
