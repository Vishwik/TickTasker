import React from 'react';
import { useTasks } from '../context/TaskContext';
import Card from '../components/Card';
import FocusFlow from '../components/FocusFlow';
import WeeklyProgress from '../components/WeeklyProgress';
import { ArrowUpRight, CheckCircle2, AlertCircle, Clock, Zap, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { getRelativeDate } from '../utils/dateUtils';

const StatCard = ({ label, value, icon: Icon, color, delay }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
    >
        <Card className="flex items-center space-x-4 border-t-4 border-t-transparent hover:border-t-[rgb(var(--color-accent))] transition-all duration-300 bg-[var(--bg-surface)]">
            <div className={`p-4 rounded-xl ${color.bg} shadow-lg ${color.shadow}`}>
                <Icon size={24} className={color.text} />
            </div>
            <div>
                <p className="text-[var(--text-primary)] opacity-60 text-sm font-medium tracking-wide uppercase">{label}</p>
                <h3 className="text-3xl font-bold text-[var(--text-primary)] mt-1">{value}</h3>
            </div>
        </Card>
    </motion.div>
);

export default function Dashboard() {
    const { tasks, sortedTasks, getCompletionRate, updateTaskStatus, setIsAddTaskModalOpen, preferences, setIsSettingsModalOpen } = useTasks();

    const highPriorityTasks = sortedTasks.filter(t => t.status === 'pending').slice(0, 4);
    const completedRate = getCompletionRate();
    const pendingCount = tasks.filter(t => t.status === 'pending' && !t.parentId).length;
    const highImpactCount = tasks.filter(t => t.importance === 'High' && t.status === 'pending' && !t.parentId).length;

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col md:flex-row md:items-end justify-between pb-6 border-b border-[var(--border-base)]"
            >
                <div>
                    <h1 className="text-4xl font-extrabold text-[var(--text-primary)] mb-2">Welcome back 👋</h1>
                    <p className="text-[var(--text-primary)] opacity-60 text-lg">You have <span className="text-[rgb(var(--color-accent))] font-bold">{pendingCount} pending tasks</span>. Here is your smart priority list.</p>
                </div>
                <button
                    onClick={() => setIsSettingsModalOpen(true)}
                    className="mt-4 md:mt-0 px-4 py-2 bg-[rgb(var(--color-accent))]/10 hover:bg-[rgb(var(--color-accent))]/20 border border-[rgb(var(--color-accent))]/20 rounded-full flex items-center text-[rgb(var(--color-accent))] text-sm font-medium transition-all"
                >
                    <Zap size={16} className="mr-2 fill-[rgb(var(--color-accent))]" />
                    Productivity Labs
                </button>
            </motion.div>

            {/* Lab: Focus Flow */}
            <FocusFlow />

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    delay={0.1}
                    label="Completion Rate"
                    value={`${completedRate}%`}
                    icon={CheckCircle2}
                    color={{ bg: 'bg-emerald-500/20', text: 'text-emerald-500', shadow: 'shadow-emerald-500/20' }}
                />
                <StatCard
                    delay={0.2}
                    label="Pending Tasks"
                    value={pendingCount}
                    icon={Clock}
                    color={{ bg: 'bg-amber-500/20', text: 'text-amber-500', shadow: 'shadow-amber-500/20' }}
                />
                <StatCard
                    delay={0.3}
                    label="High Priority"
                    value={highImpactCount}
                    icon={AlertCircle}
                    color={{ bg: 'bg-rose-500/20', text: 'text-rose-500', shadow: 'shadow-rose-500/20' }}
                />
            </div>

            {/* Lab: Weekly Goals */}
            {preferences.labs_weeklyGoals && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <WeeklyProgress />
                </div>
            )}

            {/* Smart Priority List */}
            <div>
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center">
                        <ArrowUpRight size={24} className="mr-3 text-[rgb(var(--color-accent))] bg-[rgb(var(--color-accent))]/10 p-1 rounded-lg" />
                        Your Smart Queue
                    </h2>
                    <span className={`text-[10px] font-bold font-mono px-3 py-1 rounded-full border uppercase tracking-widest ${preferences.labs_experimentalAI
                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                        : 'bg-[rgb(var(--color-accent))]/5 text-[rgb(var(--color-accent))]/80 border-[rgb(var(--color-accent))]/10'
                        }`}>
                        {preferences.labs_experimentalAI ? 'AI LABS MODE' : 'AI ACTIVE'}
                    </span>
                </div>

                <div className="grid gap-5">
                    {highPriorityTasks.map((task, index) => {
                        const relativeDate = getRelativeDate(task.deadline);
                        return (
                            <motion.div
                                key={task.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 + (index * 0.1) }}
                            >
                                <Card className="flex items-center justify-between group hover:border-[rgb(var(--color-accent))]/20 hover:bg-[var(--text-primary)]/[0.02] transition-all duration-300 transform hover:-translate-y-1 bg-[var(--bg-surface)]">
                                    <div className="flex items-center space-x-6">
                                        <div className={`
                    w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-lg relative transition-transform group-hover:scale-105
                    ${index === 0 ? 'bg-gradient-to-br from-rose-500 to-orange-600 text-white shadow-rose-500/30' :
                                                index === 1 ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-black font-extrabold shadow-amber-500/30' :
                                                    'bg-[var(--bg-base)] text-[var(--text-primary)] opacity-70 border border-[var(--border-base)]'}
                  `}>
                                            #{index + 1}
                                            {index === 0 && (
                                                <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-[9px] uppercase font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg tracking-wide">
                                                    Focus Now
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg text-[var(--text-primary)] group-hover:text-[rgb(var(--color-accent))] transition-colors">{task.title}</h3>
                                            <div className="flex items-center space-x-4 text-xs text-[var(--text-primary)] opacity-60 mt-1.5">
                                                <span className={`px-2 py-0.5 rounded-full border ${task.importance === 'High' ? 'bg-rose-500/[0.05] text-rose-300/80 border-rose-500/[0.1]' :
                                                    task.importance === 'Medium' ? 'bg-amber-500/[0.05] text-amber-300/80 border-amber-500/[0.1]' :
                                                        'bg-emerald-500/[0.05] text-emerald-300/80 border-emerald-500/[0.1]'
                                                    }`}>
                                                    {task.importance} Impact
                                                </span>
                                                <span className="flex items-center hover:text-[var(--text-primary)] transition-colors">
                                                    <Clock size={12} className="mr-1.5 opacity-70" />
                                                    Due {task.deadline}
                                                    {relativeDate && (
                                                        <span className={`ml-1 font-medium ${relativeDate === 'Overdue' ? 'text-rose-500' : 'opacity-60'}`}>
                                                            ({relativeDate})
                                                        </span>
                                                    )}
                                                </span>
                                                {task.duration > 0 && (
                                                    <span className="flex items-center bg-[var(--text-primary)]/5 px-2 py-0.5 rounded text-[var(--text-primary)] border border-[var(--border-base)]">
                                                        {task.duration >= 60
                                                            ? `${Math.floor(task.duration / 60)}h${task.duration % 60 > 0 ? ` ${task.duration % 60}m` : ''}`
                                                            : `${task.duration}m`}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => updateTaskStatus(task.id, 'completed')}
                                        className="p-3 rounded-xl bg-[var(--text-primary)]/5 hover:bg-emerald-500 hover:text-white text-[var(--text-primary)] opacity-50 group-hover:opacity-100 transition-all transform hover:scale-110 active:scale-95"
                                        title="Mark Complete"
                                    >
                                        <CheckCircle2 size={24} />
                                    </button>
                                </Card>
                            </motion.div>
                        );
                    })}

                    {highPriorityTasks.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="text-center py-16 text-[var(--text-primary)] opacity-50 bg-[var(--text-primary)]/5 rounded-3xl border border-dashed border-[var(--border-base)]"
                        >
                            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 size={32} className="text-emerald-500" />
                            </div>
                            <h3 className="text-xl font-medium text-[var(--text-primary)]">Your queue is clear</h3>
                            <p className="mt-2 text-sm text-[var(--text-primary)] opacity-60">Enjoy the calm, or capture a new goal.</p>
                            <button
                                onClick={() => setIsAddTaskModalOpen(true)}
                                className="mt-6 px-6 py-2 bg-[rgb(var(--color-accent))] hover:bg-[rgb(var(--color-accent))]/90 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-[rgb(var(--color-accent))]/25"
                            >
                                Create First Task
                            </button>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
}
