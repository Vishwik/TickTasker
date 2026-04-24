import React, { useState } from 'react';
import { useTasks } from '../context/TaskContext';
import { Eye, EyeOff, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FilterSheet from '../components/FilterSheet';
import ActiveFilterBar from '../components/ActiveFilterBar';
import TaskItem from '../components/TaskItem';

export default function Tasks() {
    const {
        viewTasks, // Consuming the computed filtered list
        tasks,     // Still needed for raw counts if implemented later
        updateTaskStatus,
        deleteTask,
        setIsAddTaskModalOpen,
        setEditingTaskId,
        filterState,
        updateFilter,
        toggleTaskExpansion
    } = useTasks();

    const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
    const [hideCompleted, setHideCompleted] = useState(false);


    const handleEditClick = (task) => {
        setEditingTaskId(task.id);
        setIsAddTaskModalOpen(true);
    };

    // Filter to top-level tasks only for the main list
    // (Subtasks are rendered inside their parents)
    const topLevelTasks = viewTasks.filter(task => !task.parentId);

    // Effectively, finalDisplayTasks is now just topLevelTasks
    const finalDisplayTasks = topLevelTasks.filter(task => {
        if (hideCompleted && task.status === 'completed') return false;
        return true;
    });

    return (
        <div className="max-w-7xl mx-auto pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
                <div>
                    <h1 className="text-4xl font-extrabold text-[var(--text-primary)] mb-2">My Tasks</h1>
                    <p className="text-[var(--text-primary)] opacity-60">Focus on what matters most.</p>
                </div>

                <button
                    onClick={() => setIsFilterSheetOpen(true)}
                    className="mt-4 md:mt-0 flex items-center bg-[var(--bg-surface)] hover:bg-[var(--text-primary)]/10 text-[var(--text-primary)] px-4 py-2 rounded-xl border border-[var(--border-base)] transition-all font-medium group"
                >
                    <SlidersHorizontal size={18} className="mr-2 text-[var(--text-primary)] opacity-60 group-hover:opacity-100" />
                    Refine
                </button>
            </div>

            {/* Filters (Status Tabs) */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between mb-6">
                <div className="grid grid-cols-3 gap-1 p-1 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-base)] w-full sm:w-auto">
                    {['all', 'pending', 'completed'].map(f => (
                        <button
                            key={f}
                            onClick={() => updateFilter({ status: f })}
                            className={`relative px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all duration-300 flex items-center justify-center ${filterState.status === f ? 'text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-primary)] opacity-50 hover:opacity-100 hover:bg-[var(--text-primary)]/5'
                                }`}
                        >
                            {filterState.status === f && (
                                <motion.div
                                    layoutId="activeFilter"
                                    className="absolute inset-0 bg-[var(--text-primary)]/10 rounded-xl"
                                />
                            )}
                            <span className="relative z-10 font-bold tracking-wide">{f}</span>
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => setHideCompleted(!hideCompleted)}
                    className={`flex items-center px-4 py-2.5 rounded-xl border transition-all text-sm font-medium ${hideCompleted
                        ? 'bg-[rgb(var(--color-accent))]/10 text-[rgb(var(--color-accent))] border-[rgb(var(--color-accent))]/30'
                        : 'bg-[var(--bg-surface)] text-[var(--text-primary)] opacity-60 border-[var(--border-base)] hover:bg-[var(--text-primary)]/5 hover:opacity-100'
                        }`}
                >
                    {hideCompleted ? <EyeOff size={16} className="mr-2" /> : <Eye size={16} className="mr-2" />}
                    {hideCompleted ? 'Hidden' : 'Hide Completed'}
                </button>
            </div>

            <ActiveFilterBar />

            {/* Task List */}
            <div className="space-y-6">
                <AnimatePresence mode='popLayout'>
                    {finalDisplayTasks.map((task, index) => {
                        const isTopPick = index === 0 && task.status === 'pending';
                        return (
                            <TaskItem
                                key={task.id}
                                task={task}
                                isTopPick={isTopPick}
                            />
                        );
                    })}
                </AnimatePresence>

                {finalDisplayTasks.length === 0 && (
                    <div className="text-center py-20 opacity-50">
                        <p className="text-xl font-medium">No tasks found.</p>
                        <p className="text-sm">Enjoy your free time!</p>
                    </div>
                )}
            </div>


            <FilterSheet isOpen={isFilterSheetOpen} onClose={() => setIsFilterSheetOpen(false)} />
        </div>
    );
}
