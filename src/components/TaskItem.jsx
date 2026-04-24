import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Trash2, CheckCircle2, ChevronDown, CornerDownRight, Sparkles } from 'lucide-react';
import { getTaskLabel } from '../utils/prioritizationAlgo';
import { getRelativeDate } from '../utils/dateUtils';
import { useTasks } from '../context/TaskContext';

export default function TaskItem({ task, isTopPick }) {
    const { updateTaskStatus, deleteTask, toggleTaskExpansion, setEditingTaskId, setIsAddTaskModalOpen, setBreakdownTask, tasks } = useTasks();
    const [isMobileExpanded, setIsMobileExpanded] = useState(false);

    // Resolve Subtasks
    const subtasks = task.childIds
        ? task.childIds.map(id => tasks.find(t => t.id === id)).filter(Boolean)
        : [];

    const progress = subtasks.length > 0
        ? Math.round((subtasks.filter(t => t.status === 'completed').length / subtasks.length) * 100)
        : 0;

    const relativeDate = getRelativeDate(task.deadline);
    const label = getTaskLabel(task);

    // Priority Signal (Mobile)
    const priorityConfig = {
        'High': { color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
        'Medium': { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
        'Low': { color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' }
    };
    const pConfig = priorityConfig[task.importance] || priorityConfig['Medium'];

    const handleEditClick = (e) => {
        e.stopPropagation();
        setEditingTaskId(task.id);
        setIsAddTaskModalOpen(true);
    };

    const handleDeleteClick = (e) => {
        e.stopPropagation();
        deleteTask(task.id);
    };

    const handleToggleStatus = (e) => {
        e.stopPropagation();
        updateTaskStatus(task.id, task.status === 'completed' ? 'pending' : 'completed');
    };

    const handleCardClick = () => {
        // Toggle details on tap
        setIsMobileExpanded(!isMobileExpanded);
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mb-4" // Vertical spacing between cards
        >
            <div
                onClick={handleCardClick}
                className={`
                    relative rounded-2xl transition-all duration-300 group cursor-pointer overflow-hidden
                    ${isTopPick
                        ? 'p-6 bg-gradient-to-br from-[var(--bg-surface)] to-[rgb(var(--color-accent))]/10 border border-[rgb(var(--color-accent))]/30 shadow-[0_0_20px_rgba(var(--color-accent),0.15)]'
                        : 'p-5 bg-[var(--bg-surface)] border border-transparent hover:border-[var(--border-base)] shadow-sm'
                    }
                    ${task.status === 'completed' ? 'opacity-50 grayscale-[0.5]' : ''}
                `}
            >
                {/* 1. TOP ROW: Title & Checkbox */}
                <div className="flex items-start justify-between gap-4">
                    <h3 className={`font-bold text-[var(--text-primary)] leading-snug break-words pr-2 transition-all ${isTopPick ? 'text-lg md:text-xl' : 'text-base md:text-lg'} ${task.status === 'completed' ? 'line-through opacity-70' : ''}`}>
                        {task.title}
                    </h3>
                    
                    <button
                        onClick={handleToggleStatus}
                        className={`flex-shrink-0 w-6 h-6 rounded-full border-[1.5px] flex items-center justify-center transition-all duration-300 ${task.status === 'completed'
                            ? 'bg-emerald-500 border-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                            : 'border-[var(--text-primary)]/30 hover:border-[rgb(var(--color-accent))]'
                            }`}
                    >
                        <CheckCircle2 size={12} className={`${task.status !== 'completed' && 'opacity-0'}`} />
                    </button>
                </div>

                {/* 2. SECOND ROW: Signals (Priority + Time) */}
                <div className="flex items-center gap-2 mt-3">
                    {/* Priority Badge */}
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${pConfig.color} ${pConfig.bg}`}>
                        {task.importance}
                    </span>

                    {/* Relative Time Badge */}
                    {relativeDate && (
                        <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full border border-[var(--border-base)] text-[var(--text-primary)] opacity-70 ${relativeDate === 'Overdue' ? 'text-rose-500 border-rose-500/30 bg-rose-500/5' : ''}`}>
                            {relativeDate}
                        </span>
                    )}

                     {/* Focus Badge (Only for Top Pick) */}
                     {isTopPick && (
                        <span className="hidden md:inline-block text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest bg-gradient-to-r from-violet-500/80 to-fuchsia-500/80 text-white shadow-lg shadow-purple-500/10">
                            Focus Now
                        </span>
                    )}
                </div>

                {/* 3. EXPANDABLE DETAILS (Hidden by default, shown on tap/click) */}
                <AnimatePresence>
                    {(isMobileExpanded || task.isExpanded) && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="mt-4 pt-4 border-t border-[var(--border-base)]/50 flex flex-col gap-3">
                                <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-primary)] opacity-60">
                                    {task.duration > 0 && (
                                        <div className="flex items-center">
                                            <span className="mr-1.5">⏱️</span>
                                            {task.duration}m
                                        </div>
                                    )}
                                    <div className="flex items-center">
                                        <span className="mr-1.5">📂</span>
                                        {task.category}
                                    </div>
                                    {label && label.type !== 'urgent' && label.type !== 'soon' && label.type !== 'high' && (
                                        <div className="flex items-center text-[rgb(var(--color-accent))]">
                                            <Sparkles size={12} className="mr-1" />
                                            {label.text}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    <button onClick={handleEditClick} className="px-3 py-1.5 bg-[var(--text-primary)]/5 rounded-lg text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--text-primary)]/10 transition-colors flex items-center gap-1.5">
                                        <Edit2 size={12} /> Edit
                                    </button>
                                    <button onClick={handleDeleteClick} className="px-3 py-1.5 bg-red-500/5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-1.5">
                                        <Trash2 size={12} /> Delete
                                    </button>
                                    
                                    {(task.duration >= 60 || task.importance === 'High') && task.status !== 'completed' && subtasks.length === 0 && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setBreakdownTask(task); }}
                                            className="ml-auto px-3 py-1.5 bg-[rgb(var(--color-accent))]/10 rounded-lg text-xs font-medium text-[rgb(var(--color-accent))] hover:bg-[rgb(var(--color-accent))]/20 transition-colors flex items-center gap-1.5"
                                        >
                                            <Sparkles size={12} /> AI Breakdown
                                        </button>
                                    )}
                                </div>
                                
                                {/* Subtasks List */}
                                {subtasks.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-primary)] opacity-40 mb-2">Subtasks</div>
                                        {subtasks.map(st => (
                                            <div key={st.id} className="flex items-center gap-3 py-1.5">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); updateTaskStatus(st.id, st.status === 'completed' ? 'pending' : 'completed'); }}
                                                    className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center transition-all ${st.status === 'completed' ? 'bg-[rgb(var(--color-accent))]/20 border-[rgb(var(--color-accent))]/50 text-[rgb(var(--color-accent))]' : 'border-[var(--text-primary)]/30'}`}
                                                >
                                                    <CheckCircle2 size={8} className={st.status !== 'completed' ? 'opacity-0' : ''} />
                                                </button>
                                                <span className={`text-xs ${st.status === 'completed' ? 'line-through opacity-50' : 'opacity-80'}`}>{st.title}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                
                 {/* Subtask Indicator (If collapsed but has subtasks) */}
                 {subtasks.length > 0 && !isMobileExpanded && !task.isExpanded && (
                    <div className="mt-3 flex items-center gap-2">
                        <div className="h-1 w-24 bg-[var(--text-primary)]/5 rounded-full overflow-hidden">
                            <div className="h-full bg-[rgb(var(--color-accent))]" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-[10px] text-[var(--text-primary)] opacity-50">{subtasks.filter(t => t.status === 'completed').length}/{subtasks.length}</span>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
