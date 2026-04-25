import React, { useState } from 'react';
import { useTasks } from '../context/TaskContext';
import Card from '../components/Card';
import FocusFlow from '../components/FocusFlow';
import WeeklyProgress from '../components/WeeklyProgress';
import { ArrowUpRight, Check, CheckCircle2, AlertCircle, Clock, Copy, Zap, Sparkles, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatTaskDeadline, getRelativeDate, getTaskDeadlineDateString } from '../utils/dateUtils';
import { AIClient } from '../utils/aiClient';
import { useProfile } from '../context/ProfileContext';

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
    const { profile } = useProfile();

    const [aiPlan, setAiPlan] = useState('');
    const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
    const [aiError, setAiError] = useState('');
    const [aiPlanMeta, setAiPlanMeta] = useState({ generatedAt: null, taskCount: 0 });
    const [copiedPlan, setCopiedPlan] = useState(false);

    const generateAIPlan = async () => {
        setIsGeneratingPlan(true);
        setAiError('');

        try {
            const pendingTasks = tasks.filter(t => t.status === 'pending' && !t.parentId);

            if (!pendingTasks.length) {
                setAiPlan('Your list is clear right now. Use this time to recharge, capture a new idea, or review what is coming up next.');
                setAiPlanMeta({ generatedAt: new Date().toISOString(), taskCount: 0 });
                setCopiedPlan(false);
                return;
            }

            const plan = await AIClient.generateDailyPlan(pendingTasks, { name: profile?.name, role: profile?.role });
            setAiPlan(plan);
            setAiPlanMeta({ generatedAt: new Date().toISOString(), taskCount: pendingTasks.length });
            setCopiedPlan(false);
        } catch (err) {
            setAiError(err.message);
        } finally {
            setIsGeneratingPlan(false);
        }
    };

    const handleCopyPlan = async () => {
        if (!aiPlan || !navigator?.clipboard?.writeText) return;

        try {
            await navigator.clipboard.writeText(aiPlan);
            setAiError('');
            setCopiedPlan(true);
            setTimeout(() => setCopiedPlan(false), 1800);
        } catch {
            setAiError('Could not copy the plan to your clipboard.');
        }
    };

    const planGeneratedLabel = aiPlanMeta.generatedAt
        ? new Date(aiPlanMeta.generatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        : null;

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
                    <h1 className="text-4xl font-extrabold text-[var(--text-primary)] mb-2">Welcome back</h1>
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

            {/* Premium AI Planner Panel */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-indigo-500/[0.05] to-purple-500/[0.1] border border-indigo-500/20 rounded-2xl p-6 relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <Sparkles size={120} />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2 mb-2">
                            <Sparkles className="text-indigo-400" size={20} />
                            AI Daily Planner
                        </h2>
                        <p className="text-sm text-[var(--text-primary)] opacity-70 mb-4">
                            Let TickTasker Intelligence analyze your tasks, deadlines, and priorities to generate an optimized action plan for today.
                        </p>

                        {aiError && (
                            <div className="text-red-400 text-xs bg-red-500/10 p-2 rounded border border-red-500/20 mb-4 inline-block">
                                Error: {aiError}
                            </div>
                        )}

                        {aiPlan ? (
                            <div className="space-y-4">
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <div className="text-xs text-[var(--text-primary)] opacity-60">
                                        Based on {aiPlanMeta.taskCount} pending task{aiPlanMeta.taskCount === 1 ? '' : 's'}
                                        {planGeneratedLabel ? ` | Updated ${planGeneratedLabel}` : ''}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleCopyPlan}
                                            className="px-3 py-2 bg-[var(--bg-base)]/70 hover:bg-[var(--text-primary)]/10 border border-[var(--border-base)] rounded-xl text-xs font-medium text-[var(--text-primary)] transition-all flex items-center gap-2"
                                        >
                                            {copiedPlan ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                            {copiedPlan ? 'Copied' : 'Copy Plan'}
                                        </button>
                                        <button
                                            onClick={generateAIPlan}
                                            disabled={isGeneratingPlan}
                                            className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-medium transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2 disabled:opacity-50"
                                        >
                                            <RefreshCw className={isGeneratingPlan ? 'animate-spin' : ''} size={14} />
                                            {isGeneratingPlan ? 'Refreshing...' : 'Regenerate'}
                                        </button>
                                    </div>
                                </div>
                                <div className="bg-[var(--bg-base)]/50 backdrop-blur-sm border border-[var(--border-base)] rounded-xl p-5 text-sm text-[var(--text-primary)] leading-relaxed prose prose-invert">
                                    {aiPlan.split(/\n+/).filter(Boolean).map((line, i) => (
                                        <p key={i} className="mb-2 last:mb-0">{line}</p>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={generateAIPlan}
                                disabled={isGeneratingPlan}
                                className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isGeneratingPlan ? <RefreshCw className="animate-spin" size={16} /> : <Zap size={16} />}
                                {isGeneratingPlan ? 'Analyzing Tasks...' : 'Generate Plan'}
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>

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
                        const deadlineDate = getTaskDeadlineDateString(task);
                        const relativeDate = getRelativeDate(deadlineDate, task.deadlineTime, task.allDay !== false);
                        const deadlineLabel = formatTaskDeadline(deadlineDate, task.deadlineTime, task.allDay !== false);

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
                                                    Due {deadlineLabel}
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
