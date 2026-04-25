import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    LayoutDashboard,
    ListTodo,
    PieChart,
    Plus,
    Sparkles,
    X,
    ArrowRight,
    CheckCircle,
    AlertCircle,
    BrainCircuit
} from 'lucide-react';
import { useTasks } from '../context/TaskContext';
import { getTaskDeadlineDateString } from '../utils/dateUtils';

const CommandPalette = ({ setActiveTab }) => {
    const {
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        setIsAddTaskModalOpen,
        setIsSettingsModalOpen,
        tasks,
        sortedTasks,
        updateFilter,
        setNewTaskInitialTitle
    } = useTasks();

    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isCommandPaletteOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
            setQuery('');
            setSelectedIndex(0);
        }
    }, [isCommandPaletteOpen]);

    const handleAction = (action) => {
        action();
        setIsCommandPaletteOpen(false);
    };

    const matchedTasks = useMemo(() => {
        if (!query.trim()) return [];
        return tasks.filter(task =>
            task.title.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5);
    }, [query, tasks]);

    const aiSuggestions = useMemo(() => {
        if (query.trim()) return [];

        const suggestions = [];
        const topTask = sortedTasks.find(t => t.status === 'pending');

        if (topTask) {
            suggestions.push({
                id: `ai-focus-${topTask.id}`,
                label: `Focus on: ${topTask.title}`,
                group: 'AI Suggestions',
                icon: <Sparkles size={18} className="text-purple-400" />,
                action: () => handleAction(() => {
                    setActiveTab('tasks');
                })
            });
        }

        const overdueCount = tasks.filter(t => {
            const deadlineDate = getTaskDeadlineDateString(t);
            if (t.status === 'completed' || !deadlineDate) return false;

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return new Date(deadlineDate) < today;
        }).length;

        if (overdueCount > 0) {
            suggestions.push({
                id: 'ai-overdue',
                label: `Review ${overdueCount} overdue tasks`,
                group: 'AI Suggestions',
                icon: <AlertCircle size={18} className="text-rose-400" />,
                action: () => handleAction(() => {
                    setActiveTab('tasks');
                    updateFilter({ timeFrame: 'overdue' });
                })
            });
        }

        return suggestions;
    }, [query, sortedTasks, tasks, updateFilter, setActiveTab]);

    const canCreateTask = query.trim().length > 2 && matchedTasks.length === 0;

    const staticCommands = [
        {
            id: 'nav-dash',
            label: 'Go to Dashboard',
            group: 'Navigation',
            icon: <LayoutDashboard size={18} />,
            action: () => handleAction(() => setActiveTab('dashboard'))
        },
        {
            id: 'nav-tasks',
            label: 'My Tasks',
            group: 'Navigation',
            icon: <ListTodo size={18} />,
            action: () => handleAction(() => setActiveTab('tasks'))
        },
        {
            id: 'nav-analytics',
            label: 'Analytics',
            group: 'Navigation',
            icon: <PieChart size={18} />,
            action: () => handleAction(() => setActiveTab('analytics'))
        },
        {
            id: 'settings-labs',
            label: 'Productivity Labs',
            group: 'Settings',
            icon: <Sparkles size={18} className="text-[rgb(var(--color-accent))]" />,
            action: () => handleAction(() => setIsSettingsModalOpen(true))
        },
        {
            id: 'act-add',
            label: 'Create New Task',
            group: 'Actions',
            icon: <Plus size={18} />,
            action: () => handleAction(() => setIsAddTaskModalOpen(true))
        }
    ];

    const filteredStaticCommands = useMemo(() => {
        if (!query) return staticCommands;
        return staticCommands.filter(cmd =>
            cmd.label.toLowerCase().includes(query.toLowerCase()) ||
            cmd.group.toLowerCase().includes(query.toLowerCase())
        );
    }, [query]);

    const flattenedResults = [
        ...aiSuggestions,
        ...matchedTasks.map(t => ({
            id: t.id,
            label: t.title,
            group: 'Tasks',
            icon: <CheckCircle size={18} className="text-emerald-600" />,
            isTask: true,
            action: () => handleAction(() => {
                setActiveTab('tasks');
            })
        })),
        ...filteredStaticCommands,
        ...(canCreateTask ? [{
            id: 'create-dynamic',
            label: query.length > 15 ? `Plan: "${query}"` : `Add task: "${query}"`,
            group: 'Actions',
            icon: query.length > 15 ? <BrainCircuit size={18} className="text-purple-600" /> : <Plus size={18} className="text-[rgb(var(--color-accent))]" />,
            isCreate: true,
            action: () => handleAction(() => {
                setNewTaskInitialTitle(query);
                setIsAddTaskModalOpen(true);
            })
        }] : [])
    ];

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isCommandPaletteOpen) return;

            if (e.key === 'Escape') {
                setIsCommandPaletteOpen(false);
            }

            if (e.key === 'ArrowDown') {
                if (!flattenedResults.length) return;
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % flattenedResults.length);
            }

            if (e.key === 'ArrowUp') {
                if (!flattenedResults.length) return;
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + flattenedResults.length) % flattenedResults.length);
            }

            if (e.key === 'Enter') {
                e.preventDefault();
                if (flattenedResults[selectedIndex]) {
                    flattenedResults[selectedIndex].action();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isCommandPaletteOpen, selectedIndex, flattenedResults, setIsCommandPaletteOpen]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    return (
        <AnimatePresence>
            {isCommandPaletteOpen && (
                <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsCommandPaletteOpen(false)}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ y: '100%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative w-full md:w-[600px] bg-[var(--bg-surface)] md:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden border border-[var(--border-base)] flex flex-col max-h-[80vh]"
                    >
                        <div className="flex items-center px-4 py-4 border-b border-[var(--border-base)]">
                            <Search className="text-[var(--text-primary)] opacity-50 mr-3" size={20} />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Type a command or search..."
                                className="flex-1 bg-transparent border-none focus:ring-0 text-[var(--text-primary)] text-lg placeholder-[var(--text-primary)]/30 outline-none"
                            />
                            <div className="hidden md:flex items-center space-x-1">
                                <span className="text-xs bg-[var(--text-primary)]/10 text-[var(--text-primary)] opacity-60 px-2 py-1 rounded">Esc</span>
                            </div>
                            <button
                                onClick={() => setIsCommandPaletteOpen(false)}
                                className="md:hidden p-2 text-[var(--text-primary)] opacity-60"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="overflow-y-auto p-2 min-h-[100px] max-h-[500px]">
                            {flattenedResults.length > 0 ? (
                                <div className="space-y-1">
                                    {flattenedResults.map((cmd, index) => (
                                        <button
                                            key={cmd.id}
                                            onClick={cmd.action}
                                            onMouseEnter={() => setSelectedIndex(index)}
                                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors text-left ${selectedIndex === index
                                                ? 'bg-[rgb(var(--color-accent))]/10 text-[var(--text-primary)]'
                                                : 'text-[var(--text-primary)] opacity-60 hover:bg-[var(--text-primary)]/5'
                                                }`}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <div className={`${selectedIndex === index ? (cmd.isCreate ? 'text-[rgb(var(--color-accent))]' : 'text-emerald-600') : 'text-[var(--text-primary)] opacity-50'}`}>
                                                    {cmd.icon}
                                                </div>
                                                <div>
                                                    <span className={`block font-medium ${selectedIndex === index ? 'text-[var(--text-primary)]' : 'text-[var(--text-primary)] opacity-80'}`}>
                                                        {cmd.label}
                                                    </span>
                                                    {query && <span className="text-xs text-[var(--text-primary)] opacity-40">{cmd.group}</span>}
                                                </div>
                                            </div>
                                            {selectedIndex === index && (
                                                <ArrowRight size={16} className="text-[rgb(var(--color-accent))] opacity-50" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-12 text-center text-[var(--text-primary)] opacity-50">
                                    <p>No results found for "{query}"</p>
                                </div>
                            )}
                        </div>

                        <div className="hidden md:flex items-center justify-between px-4 py-2 bg-[var(--text-primary)]/5 text-xs text-[var(--text-primary)] opacity-60 border-t border-[var(--border-base)]">
                            <div className="flex items-center space-x-4">
                                <span><kbd className="bg-[var(--text-primary)]/10 px-1.5 py-0.5 rounded text-[var(--text-primary)] font-sans">Up/Down</kbd> to navigate</span>
                                <span><kbd className="bg-[var(--text-primary)]/10 px-1.5 py-0.5 rounded text-[var(--text-primary)] font-sans">Enter</kbd> to select</span>
                            </div>
                            <span>TickTasker Command</span>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default CommandPalette;
