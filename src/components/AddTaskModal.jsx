import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTasks } from '../context/TaskContext';
import { ChevronDown, Sparkles, RefreshCw } from 'lucide-react';
import { AIClient } from '../utils/aiClient';
import { useProfile } from '../context/ProfileContext';

export default function AddTaskModal() {
    const {
        isAddTaskModalOpen,
        setIsAddTaskModalOpen,
        addTask,
        editTask,
        tasks,
        editingTaskId,
        setEditingTaskId,
        newTaskInitialTitle,
        setNewTaskInitialTitle
    } = useTasks();

    const [newTask, setNewTask] = useState({
        title: '',
        deadline: '',
        importance: 'Medium',
        category: 'Academic',
        duration: 0 // Minutes
    });
    
    const { profile } = useProfile();
    const [isParsing, setIsParsing] = useState(false);
    const [parseError, setParseError] = useState('');

    const deadlineInputRef = React.useRef(null);

    // Populate form when editing or creating with context
    useEffect(() => {
        if (editingTaskId) {
            const taskToEdit = tasks.find(t => t.id === editingTaskId);
            if (taskToEdit) {
                setNewTask({
                    title: taskToEdit.title,
                    deadline: taskToEdit.deadline,
                    importance: taskToEdit.importance,
                    category: taskToEdit.category,
                    duration: taskToEdit.duration || 0
                });
            }
        } else if (isAddTaskModalOpen && newTaskInitialTitle) {
            // New Task with Pre-filled Title (from Command Palette)
            setNewTask(prev => ({ ...prev, title: newTaskInitialTitle }));
            // Focus deadline input since title is done
            setTimeout(() => deadlineInputRef.current?.showPicker ? deadlineInputRef.current?.showPicker() : deadlineInputRef.current?.focus(), 500);
        } else if (isAddTaskModalOpen && !editingTaskId && !newTaskInitialTitle) {
            // Reset if just opening normally
            setNewTask(prev => ({ ...prev, title: '', deadline: '', importance: 'Medium', category: 'Academic', duration: 0 }));
        }
    }, [editingTaskId, tasks, isAddTaskModalOpen, newTaskInitialTitle]);

    const handleCloseModal = () => {
        setIsAddTaskModalOpen(false);
        setEditingTaskId(null);
        setNewTaskInitialTitle('');
        setNewTask({ title: '', deadline: '', importance: 'Medium', category: 'Academic', duration: 0 });
    };

    const handleAddTask = (e) => {
        e.preventDefault();
        if (!newTask.title || !newTask.deadline) return;

        if (editingTaskId) {
            editTask(editingTaskId, newTask);
            setEditingTaskId(null);
        } else {
            addTask(newTask);
        }

        setIsAddTaskModalOpen(false);
        setNewTask({ title: '', deadline: '', importance: 'Medium', category: 'Academic', duration: 0 });
    };

    const handleAIParsing = async () => {
        if (!newTask.title) return;
        setIsParsing(true);
        setParseError('');
        try {
            const parsed = await AIClient.parseTask(newTask.title, { name: profile?.name, role: profile?.role });
            setNewTask(prev => ({
                ...prev,
                title: parsed.title || prev.title,
                deadline: parsed.deadline || prev.deadline,
                importance: parsed.importance || prev.importance,
                category: parsed.category || prev.category
            }));
        } catch (err) {
            setParseError(err.message);
        } finally {
            setIsParsing(false);
        }
    };

    const durationOptions = [
        { label: '15m', value: 15 },
        { label: '30m', value: 30 },
        { label: '45m', value: 45 },
        { label: '1h', value: 60 },
        { label: 'Deep Work', value: 120 }
    ];

    return (
        <AnimatePresence>
            {isAddTaskModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-[var(--bg-surface)] w-full max-w-lg rounded-2xl border border-[var(--border-base)] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
                    >
                        <div className="p-6 border-b border-[var(--border-base)] flex justify-between items-center bg-[var(--text-primary)]/5">
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">{editingTaskId ? 'Edit Task' : 'Create New Task'}</h2>
                            <button onClick={handleCloseModal} className="text-[var(--text-primary)] opacity-60 hover:opacity-100 transition-opacity">✕</button>
                        </div>

                        <form onSubmit={handleAddTask} className="p-8 space-y-6">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-medium text-[var(--text-primary)] opacity-60">What needs to be done?</label>
                                    <button 
                                        type="button" 
                                        onClick={handleAIParsing}
                                        disabled={!newTask.title || isParsing}
                                        className="text-xs font-bold text-[rgb(var(--color-accent))] bg-[rgb(var(--color-accent))]/10 hover:bg-[rgb(var(--color-accent))]/20 px-2 py-1 rounded flex items-center gap-1 disabled:opacity-50 transition-colors"
                                    >
                                        {isParsing ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                        {isParsing ? 'Parsing...' : 'Magic Auto-Fill'}
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={newTask.title}
                                    onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                                    className="w-full bg-[var(--text-primary)]/5 border border-[var(--border-base)] rounded-xl px-5 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[rgb(var(--color-accent))] focus:ring-1 focus:ring-[rgb(var(--color-accent))] transition-all placeholder-[var(--text-primary)]/30"
                                    placeholder="e.g. Finish Machine Learning Report by tomorrow 5pm"
                                    autoFocus={!newTaskInitialTitle} // Only autofocus if not pre-filled
                                    onInvalid={e => e.target.setCustomValidity('Please name your task to continue.')}
                                    onInput={e => e.target.setCustomValidity('')}
                                />
                                {parseError && <p className="text-red-500 text-xs mt-1">{parseError}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-primary)] opacity-60 mb-2">Due Date</label>
                                    <input
                                        ref={deadlineInputRef}
                                        type="date"
                                        required
                                        value={newTask.deadline}
                                        onChange={e => setNewTask({ ...newTask, deadline: e.target.value })}
                                        className="w-full bg-[var(--text-primary)]/5 border border-[var(--border-base)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[rgb(var(--color-accent))] transition-all appearance-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-primary)] opacity-60 mb-2">Category</label>
                                    <div className="relative">
                                        <select
                                            value={newTask.category}
                                            onChange={e => setNewTask({ ...newTask, category: e.target.value })}
                                            className="w-full bg-[var(--text-primary)]/5 border border-[var(--border-base)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[rgb(var(--color-accent))] appearance-none"
                                        >
                                            <option>Academic</option>
                                            <option>Personal</option>
                                            <option>Career</option>
                                            <option>Lab</option>
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-primary)] opacity-50 pointer-events-none" size={16} />
                                    </div>
                                </div>
                            </div>

                            {/* Duration Selector */}
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-primary)] opacity-60 mb-2">Estimated Time (Optional)</label>
                                <div className="flex flex-wrap gap-2">
                                    {durationOptions.map(opt => (
                                        <button
                                            key={opt.label}
                                            type="button"
                                            onClick={() => setNewTask(prev => ({ ...prev, duration: prev.duration === opt.value ? 0 : opt.value }))}
                                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${newTask.duration === opt.value
                                                ? 'bg-[rgb(var(--color-accent))]/10 border-[rgb(var(--color-accent))] text-[rgb(var(--color-accent))] shadow-lg shadow-[rgb(var(--color-accent))]/10'
                                                : 'border-transparent bg-[var(--bg-base)] text-[var(--text-primary)] opacity-60 hover:bg-[var(--text-primary)]/5'
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>


                            {/* Priority Level */}
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-primary)] opacity-60 mb-2">Priority Level</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['Low', 'Medium', 'High'].map(imp => (
                                        <button
                                            key={imp}
                                            type="button"
                                            onClick={() => setNewTask({ ...newTask, importance: imp })}
                                            className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${newTask.importance === imp
                                                ? imp === 'High' ? 'bg-rose-500/10 border-rose-500 text-rose-500'
                                                    : imp === 'Medium' ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                                                        : 'bg-emerald-500/10 border-emerald-500 text-emerald-500'
                                                : 'border-transparent bg-[var(--bg-base)] text-[var(--text-primary)] opacity-60 hover:bg-[var(--text-primary)]/5'
                                                }`}
                                        >
                                            {imp}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex space-x-4 pt-4 mt-2">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 py-3 text-[var(--text-primary)] opacity-60 hover:opacity-100 hover:bg-[var(--text-primary)]/5 rounded-xl transition-all font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-[rgb(var(--color-accent))] hover:bg-[rgb(var(--color-accent))]/90 text-white py-3 rounded-xl font-bold shadow-lg shadow-[rgb(var(--color-accent))]/25 transform active:scale-95 transition-all"
                                >
                                    {editingTaskId ? 'Save Changes' : 'Create Task'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
