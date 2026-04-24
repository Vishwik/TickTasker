import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTasks } from '../context/TaskContext';
import { X, Calendar, AlertCircle, Tag, Check } from 'lucide-react';

export default function FilterSheet({ isOpen, onClose }) {
    const { filterState, updateFilter, clearFilters, viewTasks } = useTasks();

    const priorities = ['High', 'Medium', 'Low'];
    const categories = ['Academic', 'Personal', 'Career', 'Lab'];

    const toggleArrayFilter = (key, value) => {
        const current = filterState[key];
        const newArray = current.includes(value)
            ? current.filter(item => item !== value)
            : [...current, value];
        updateFilter({ [key]: newArray });
    };

    const handleClear = () => {
        clearFilters();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex justify-center items-end md:items-center"
            >
                <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    onClick={e => e.stopPropagation()}
                    className="w-full md:w-[500px] bg-[var(--bg-surface)] rounded-t-2xl md:rounded-2xl border border-[var(--border-base)] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-[var(--border-base)]">
                        <h3 className="font-bold text-lg text-[var(--text-primary)]">Refine Tasks</h3>
                        <div className="flex items-center space-x-2">
                            {(filterState.timeFrame || filterState.priority.length > 0 || filterState.category.length > 0) && (
                                <button
                                    onClick={clearFilters}
                                    className="text-xs text-rose-400 font-medium px-2 py-1 hover:bg-rose-500/10 rounded"
                                >
                                    Clear
                                </button>
                            )}
                            <button onClick={onClose} className="p-1 text-[var(--text-primary)] opacity-60 hover:opacity-100 rounded-lg hover:bg-[var(--text-primary)]/5">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-8 overflow-y-auto flex-1">

                        {/* Time Frame */}
                        <section>
                            <h4 className="flex items-center text-sm font-semibold text-[var(--text-primary)] opacity-50 mb-3 uppercase tracking-wider">
                                <Calendar size={14} className="mr-2" /> Time
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {['today', 'week', 'overdue'].map(tf => (
                                    <button
                                        key={tf}
                                        onClick={() => updateFilter({ timeFrame: filterState.timeFrame === tf ? null : tf })}
                                        className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all capitalize ${filterState.timeFrame === tf
                                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                                            : 'bg-[var(--bg-base)] border-[var(--border-base)] text-[var(--text-primary)] opacity-60 hover:bg-[var(--text-primary)]/5'
                                            }`}
                                    >
                                        {tf === 'week' ? 'This Week' : tf}
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* Priority */}
                        <section>
                            <h4 className="flex items-center text-sm font-semibold text-[var(--text-primary)] opacity-50 mb-3 uppercase tracking-wider">
                                <AlertCircle size={14} className="mr-2" /> Impact
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {priorities.map(p => (
                                    <button
                                        key={p}
                                        onClick={() => toggleArrayFilter('priority', p)}
                                        className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all flex items-center ${filterState.priority.includes(p)
                                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                            : 'bg-[var(--bg-base)] border-[var(--border-base)] text-[var(--text-primary)] opacity-60 hover:bg-[var(--text-primary)]/5'
                                            }`}
                                    >
                                        {filterState.priority.includes(p) && <Check size={14} className="mr-1.5" />}
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* Category */}
                        <section>
                            <h4 className="flex items-center text-sm font-semibold text-[var(--text-primary)] opacity-50 mb-3 uppercase tracking-wider">
                                <Tag size={14} className="mr-2" /> Context
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {categories.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => toggleArrayFilter('category', c)}
                                        className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all flex items-center ${filterState.category.includes(c)
                                            ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                            : 'bg-[var(--bg-base)] border-[var(--border-base)] text-[var(--text-primary)] opacity-60 hover:bg-[var(--text-primary)]/5'
                                            }`}
                                    >
                                        {filterState.category.includes(c) && <Check size={14} className="mr-1.5" />}
                                        {c}
                                    </button>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-[var(--border-base)] bg-[var(--bg-base)]">
                        <button
                            onClick={onClose}
                            className="w-full bg-[var(--text-primary)] text-[var(--bg-surface)] font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
                        >
                            Show {viewTasks.length} Tasks
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
