import React, { useMemo } from 'react';
import { useTasks } from '../context/TaskContext';
import { motion } from 'framer-motion';
import { Target } from 'lucide-react';

export default function WeeklyProgress() {
    const { tasks, preferences } = useTasks();

    const stats = useMemo(() => {
        if (!tasks) return { completed: 0, target: 12 };

        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
        startOfWeek.setHours(0, 0, 0, 0);

        const completedThisWeek = tasks.filter(t => {
            if (t.status !== 'completed' || !t.completedAt) return false;
            const completedDate = new Date(t.completedAt);
            return completedDate >= startOfWeek;
        }).length;

        return { completed: completedThisWeek, target: 12 }; // Soft target: 12 tasks/week
    }, [tasks]);

    if (!preferences.labs_weeklyGoals) return null;

    const percentage = Math.min(100, Math.round((stats.completed / stats.target) * 100));
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-2xl p-6 relative overflow-hidden group hover:border-[rgb(var(--color-accent))]/30 transition-all"
        >
            <div className="flex items-center justify-between z-10 relative">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Target size={18} className="text-emerald-600" />
                        <h3 className="text-[var(--text-primary)] opacity-60 text-sm font-bold uppercase tracking-wider">Weekly Goal</h3>
                    </div>
                    <div className="text-3xl font-extrabold text-[var(--text-primary)]">
                        {stats.completed} <span className="text-lg text-[var(--text-primary)] opacity-40 font-medium">/ {stats.target}</span>
                    </div>
                    <p className="text-xs text-[var(--text-primary)] opacity-60 mt-2">
                        {percentage >= 100 ? "Goal crushed! 🚀" : `${stats.target - stats.completed} to go. Keep pushing.`}
                    </p>
                </div>

                {/* Ring Chart */}
                <div className="relative w-24 h-24 flex-shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
                        {/* Track */}
                        <circle
                            cx="48"
                            cy="48"
                            r={radius}
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            className="text-[var(--text-primary)] opacity-5"
                        />
                        {/* Progress */}
                        <circle
                            cx="48"
                            cy="48"
                            r={radius}
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            className="text-emerald-600 transition-all duration-1000 ease-out"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-bold text-emerald-600">{percentage}%</span>
                    </div>
                </div>
            </div>

            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        </motion.div>
    );
}
