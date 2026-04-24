import React from 'react';
import { useTasks } from '../context/TaskContext';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ActiveFilterBar() {
    const { filterState, updateFilter, clearFilters } = useTasks();

    // Check if any filter is active
    const hasFilters = filterState.timeFrame || filterState.priority.length > 0 || filterState.category.length > 0;

    if (!hasFilters) return null;

    const removeFilter = (type, value) => {
        if (type === 'timeFrame') {
            updateFilter({ timeFrame: null });
        } else if (type === 'priority' || type === 'category') {
            updateFilter({ [type]: filterState[type].filter(item => item !== value) });
        }
    };

    return (
        <AnimatePresence>
            {hasFilters && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center flex-wrap gap-2 mb-4 overflow-hidden"
                >
                    <span className="text-xs font-bold text-[var(--text-primary)] opacity-60 uppercase tracking-wider mr-1">Active:</span>

                    {filterState.timeFrame && (
                        <div className="flex items-center bg-blue-500/20 text-blue-600 text-xs font-medium px-2.5 py-1 rounded-lg border border-blue-500/30">
                            {filterState.timeFrame === 'week' ? 'This Week' : filterState.timeFrame}
                            <button onClick={() => removeFilter('timeFrame')} className="ml-1.5 hover:text-[var(--text-primary)]">
                                <X size={12} />
                            </button>
                        </div>
                    )}

                    {filterState.priority.map(p => (
                        <div key={p} className="flex items-center bg-indigo-500/20 text-indigo-600 text-xs font-medium px-2.5 py-1 rounded-lg border border-indigo-500/30">
                            {p}
                            <button onClick={() => removeFilter('priority', p)} className="ml-1.5 hover:text-[var(--text-primary)]">
                                <X size={12} />
                            </button>
                        </div>
                    ))}

                    {filterState.category.map(c => (
                        <div key={c} className="flex items-center bg-emerald-500/20 text-emerald-600 text-xs font-medium px-2.5 py-1 rounded-lg border border-emerald-500/30">
                            {c}
                            <button onClick={() => removeFilter('category', c)} className="ml-1.5 hover:text-[var(--text-primary)]">
                                <X size={12} />
                            </button>
                        </div>
                    ))}

                    <button
                        onClick={clearFilters}
                        className="text-xs text-[var(--text-primary)] opacity-60 hover:text-rose-500 font-medium px-2 py-1 ml-auto transition-colors"
                    >
                        Clear All
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
