import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateSubtasks } from '../utils/AIEngine';
import { Sparkles, Check, X, Plus, Trash2 } from 'lucide-react';
import { useTasks } from '../context/TaskContext';

export default function BreakdownModal({ task, isOpen, onClose }) {
    const { addSubtasks } = useTasks();
    const [steps, setSteps] = useState([]);
    const [customStep, setCustomStep] = useState('');

    useEffect(() => {
        if (isOpen && task) {
            const generated = generateSubtasks(task.title, task.duration, task.category);
            setSteps(generated);
        }
    }, [isOpen, task]);

    const handleSave = () => {
        if (steps.length > 0) {
            addSubtasks(task.id, steps);
            onClose();
        }
    };

    const removeStep = (index) => {
        setSteps(prev => prev.filter((_, i) => i !== index));
    };

    const addCustomStep = (e) => {
        e.preventDefault();
        if (!customStep.trim()) return;
        setSteps(prev => [...prev, { title: customStep, duration: 15 }]);
        setCustomStep('');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="bg-[var(--bg-surface)] w-full max-w-md rounded-2xl border border-[var(--border-base)] shadow-2xl overflow-hidden"
                    >
                        <div className="p-6 bg-gradient-to-br from-[rgb(var(--color-accent))]/20 to-purple-900/10 border-b border-[var(--border-base)]">
                            <div className="flex items-center space-x-2 text-[rgb(var(--color-accent))] mb-1">
                                <Sparkles size={16} />
                                <span className="text-xs font-bold uppercase tracking-wider">AI Suggested Plan</span>
                            </div>
                            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Break down "{task.title}"?</h3>
                        </div>

                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                            {steps.length === 0 ? (
                                <p className="text-[var(--text-primary)] opacity-50 text-center italic">Generating steps...</p>
                            ) : (
                                <div className="space-y-3">
                                    {steps.map((step, idx) => (
                                        <div key={idx} className="flex items-center gap-3 group">
                                            <div className="flex-1 bg-[var(--text-primary)]/5 border border-[var(--border-base)] rounded-xl px-4 py-3 flex items-center justify-between">
                                                <input
                                                    value={step.title}
                                                    onChange={(e) => {
                                                        const newSteps = [...steps];
                                                        newSteps[idx].title = e.target.value;
                                                        setSteps(newSteps);
                                                    }}
                                                    className="bg-transparent text-sm text-[var(--text-primary)] focus:outline-none w-full mr-2"
                                                />
                                                <span className="text-xs text-[var(--text-primary)] opacity-50 font-mono whitespace-nowrap">{step.duration}m</span>
                                            </div>
                                            <button
                                                onClick={() => removeStep(idx)}
                                                className="text-[var(--text-primary)] opacity-50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add Step Input */}
                            <form onSubmit={addCustomStep} className="flex items-center gap-2 mt-2">
                                <div className="flex-1 bg-[var(--bg-base)] rounded-xl px-4 py-3 border border-dashed border-[var(--border-base)] focus-within:border-[rgb(var(--color-accent))]/50 transition-colors">
                                    <input
                                        value={customStep}
                                        onChange={e => setCustomStep(e.target.value)}
                                        placeholder="Add another step..."
                                        className="bg-transparent text-sm text-[var(--text-primary)] opacity-60 focus:outline-none w-full placeholder-[var(--text-primary)]/30"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={!customStep.trim()}
                                    className="p-3 rounded-xl bg-[var(--text-primary)]/5 hover:bg-[var(--text-primary)]/10 text-[var(--text-primary)] opacity-60 hover:text-[var(--text-primary)] disabled:opacity-30 transition-all"
                                >
                                    <Plus size={18} />
                                </button>
                            </form>
                        </div>

                        <div className="p-4 bg-[var(--text-primary)]/5 border-t border-[var(--border-base)] flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 text-sm font-medium text-[var(--text-primary)] opacity-60 hover:text-[var(--text-primary)] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex-[2] bg-[rgb(var(--color-accent))] hover:bg-[rgb(var(--color-accent))]/90 text-white text-sm font-bold py-3 rounded-xl shadow-lg shadow-[rgb(var(--color-accent))]/20 transition-all flex items-center justify-center gap-2"
                            >
                                <Check size={16} />
                                Apply Plan
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
