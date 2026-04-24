import React from 'react';
import { useTasks } from '../context/TaskContext';
import Card from '../components/Card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';

export default function Analytics() {
    const { tasks, getCompletionRate, getInsights } = useTasks();

    const completionValues = [
        { name: 'Completed', value: tasks.filter(t => t.status === 'completed').length, color: '#10b981' }, // Emerald-500
        { name: 'Pending', value: tasks.filter(t => t.status === 'pending').length, color: '#6366f1' },    // Indigo-500
    ];

    const categories = ['Academic', 'Lab', 'Career', 'Personal'];
    const categoryData = categories.map(cat => ({
        name: cat,
        tasks: tasks.filter(t => t.category === cat).length
    }));

    const productivityScore = getCompletionRate();

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-10">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="text-4xl font-extrabold text-[var(--text-primary)] mb-2">Analytics</h1>
                <p className="text-[var(--text-primary)] opacity-60 text-lg">Visual insights into your academic productivity.</p>

                {/* Insights Panel (R5) */}
                <div className="mt-6 p-4 bg-[rgb(var(--color-accent))]/10 border border-[rgb(var(--color-accent))]/20 rounded-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[rgb(var(--color-accent))]"></div>
                    <h3 className="text-[rgb(var(--color-accent))] font-bold text-sm uppercase mb-1 flex items-center">
                        AI Insight <span className="ml-2 text-xs bg-[rgb(var(--color-accent))] text-[var(--bg-surface)] px-1.5 rounded">NEW</span>
                    </h3>
                    <p className="text-[var(--text-primary)] text-lg font-medium">
                        "{getInsights()}"
                    </p>
                </div>
            </motion.div>

            {tasks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Productivity Score */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Card className="flex flex-col items-center justify-center p-10 h-full relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-32 bg-[rgb(var(--color-accent))]/10 blur-[100px] rounded-full pointer-events-none"></div>

                            <h3 className="text-lg font-bold text-[var(--text-primary)] opacity-40 uppercase tracking-widest mb-8">Efficiency Score</h3>

                            <div className="relative w-64 h-64 flex items-center justify-center">
                                {/* Background Circle */}
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="128" cy="128" r="100" stroke="var(--border-base)" strokeWidth="16" fill="transparent" strokeLinecap="round" />
                                    <circle
                                        cx="128" cy="128" r="100" stroke="url(#gradient)" strokeWidth="16" fill="transparent"
                                        strokeDasharray={628}
                                        strokeDashoffset={628 - (628 * productivityScore) / 100}
                                        className="transition-all duration-1000 ease-out drop-shadow-md"
                                        strokeLinecap="round"
                                    />
                                    <defs>
                                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="rgb(var(--color-accent))" />
                                            <stop offset="100%" stopColor="rgb(var(--color-accent))" stopOpacity={0.6} />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div className="absolute flex flex-col items-center">
                                    <span className="text-6xl font-black text-[var(--text-primary)] tracking-tighter">{productivityScore}%</span>
                                </div>
                            </div>

                            <p className="mt-8 text-center text-[var(--text-primary)] opacity-60 bg-[var(--text-primary)]/5 py-2 px-6 rounded-full border border-[var(--border-base)]">
                                Rating: <span className={`${productivityScore >= 80 ? 'text-emerald-400' : productivityScore >= 50 ? 'text-amber-400' : 'text-rose-400'} font-bold`}>
                                    {productivityScore >= 80 ? 'Excellent 🚀' : productivityScore >= 50 ? 'Good 👍' : 'Needs Focus ⚠️'}
                                </span>
                            </p>
                        </Card>
                    </motion.div>

                    {/* Task Distribution */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Card className="h-full flex flex-col justify-center p-8">
                            <h3 className="text-lg font-bold text-[var(--text-primary)] opacity-40 uppercase tracking-widest mb-6 text-center">Status Breakdown</h3>
                            <div className="h-64 relative z-10">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={completionValues}
                                            innerRadius={80}
                                            outerRadius={110}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {completionValues.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-base)', borderRadius: '12px', color: 'var(--text-primary)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                                            itemStyle={{ color: 'var(--text-primary)', fontWeight: 'bold' }}
                                            cursor={false}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                {/* Center Text overlay for Pie */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span className="text-[var(--text-primary)] opacity-50 font-medium">vs</span>
                                </div>
                            </div>
                            <div className="flex justify-center space-x-8 mt-6">
                                {completionValues.map((entry, index) => (
                                    <div key={index} className="flex items-center space-x-3 bg-[var(--text-primary)]/5 px-4 py-2 rounded-lg">
                                        <div className="w-3 h-3 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: entry.color, color: entry.color }}></div>
                                        <span className="text-sm text-[var(--text-primary)] opacity-80 font-medium">{entry.name}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-center text-xs text-[var(--text-primary)] opacity-40 mt-6 pt-4 border-t border-[var(--border-base)]">
                                Completion Rate reflects task efficiency
                            </p>
                        </Card>
                    </motion.div>

                    {/* Category Breakdown */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="md:col-span-2"
                    >
                        <Card className="p-8">
                            <h3 className="text-lg font-bold text-[var(--text-primary)] opacity-40 uppercase tracking-widest mb-8">Tasks by Category</h3>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="rgb(var(--color-accent))" stopOpacity={1} />
                                                <stop offset="100%" stopColor="rgb(var(--color-accent))" stopOpacity={0.6} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-base)" vertical={false} />
                                        <XAxis
                                            dataKey="name"
                                            stroke="var(--text-primary)"
                                            tick={{ fill: 'var(--text-primary)', opacity: 0.6, fontSize: 12 }}
                                            tickLine={false}
                                            axisLine={false}
                                            dy={10}
                                        />
                                        <YAxis
                                            stroke="var(--text-primary)"
                                            tick={{ fill: 'var(--text-primary)', opacity: 0.6, fontSize: 12 }}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'var(--text-primary)', opacity: 0.05 }}
                                            contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-base)', borderRadius: '8px', color: 'var(--text-primary)' }}
                                        />
                                        <Bar
                                            dataKey="tasks"
                                            fill="url(#barGradient)"
                                            radius={[6, 6, 0, 0]}
                                            barSize={60}
                                            animationDuration={1000}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <p className="text-center text-xs text-[var(--text-primary)] opacity-50 mt-4">
                                Category distribution helps balance workload
                            </p>
                        </Card>
                    </motion.div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 bg-[rgb(var(--color-accent))]/10 rounded-full flex items-center justify-center mb-6">
                        <span className="text-4xl">📈</span>
                    </div>
                    <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Unlock Productivity Insights</h3>
                    <p className="text-[var(--text-primary)] opacity-60 max-w-md">
                        Complete some tasks to unlock detailed analytics and productivity insights.
                    </p>
                </div>
            )}
        </div>
    );
}
