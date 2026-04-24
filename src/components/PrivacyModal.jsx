import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, Lock, Database, Server } from 'lucide-react';

export default function PrivacyModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-[var(--bg-surface)] w-full max-w-2xl max-h-[80vh] rounded-2xl border border-[var(--border-base)] shadow-2xl flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-[var(--border-base)] flex justify-between items-center bg-[var(--text-primary)]/5 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/10 rounded-lg">
                                <ShieldCheck size={20} className="text-emerald-400" />
                            </div>
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">Privacy Policy</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-[var(--text-primary)] opacity-60 hover:opacity-100 transition-opacity"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="p-8 overflow-y-auto space-y-8 text-[var(--text-primary)] opacity-80 leading-relaxed">

                        <section>
                            <h3 className="text-[var(--text-primary)] font-bold text-lg mb-2 flex items-center gap-2">
                                <Lock size={18} className="text-[rgb(var(--color-accent))]" /> 1. Overview
                            </h3>
                            <p>
                                TickTasker ("we", "our", or "us") is dedicated to protecting your privacy.
                                This policy explains how we handle your data. In short:
                                <strong className="text-[var(--text-primary)] ml-1">We don't collect it.</strong>
                            </p>
                        </section>

                        <section>
                            <h3 className="text-[var(--text-primary)] font-bold text-lg mb-2 flex items-center gap-2">
                                <Database size={18} className="text-[rgb(var(--color-accent))]" /> 2. Data Collection & Storage
                            </h3>
                            <p className="mb-4">
                                TickTasker is a <strong>local-first application</strong>. All of your data includes:
                            </p>
                            <ul className="list-disc pl-5 space-y-2 mb-4 marker:text-[rgb(var(--color-accent))]">
                                <li>Task lists and details</li>
                                <li>Productivity statistics</li>
                                <li>AI preferences and training weights</li>
                                <li>User settings</li>
                            </ul>
                            <p>
                                This data is stored exclusively on your device using local storage technologies (LocalStorage/IndexedDB).
                            </p>
                        </section>

                        <section>
                            <h3 className="text-[var(--text-primary)] font-bold text-lg mb-2 flex items-center gap-2">
                                <Server size={18} className="text-[rgb(var(--color-accent))]" /> 3. Data Transmission
                            </h3>
                            <p>
                                <strong>We do not transmit your data to any external servers.</strong>
                                TickTasker does not have a backend cloud database. Your tasks never leave your device unless you explicitly choose to export them via the "Data Export" feature.
                            </p>
                        </section>

                        <section>
                            <h3 className="text-[var(--text-primary)] font-bold text-lg mb-2">4. AI & Machine Learning</h3>
                            <p>
                                The "Smart Prioritization" features run entirely locally in your browser/device.
                                No task data is sent to OpenAI, Google, or any other third-party AI service for processing.
                            </p>
                        </section>

                        <section>
                            <h3 className="text-[var(--text-primary)] font-bold text-lg mb-2">5. Contact Us</h3>
                            <p>
                                If you have questions about this policy, please contact us at support@ticktasker.com.
                            </p>
                        </section>

                        <div className="pt-8 text-xs text-[var(--text-primary)] opacity-40 border-t border-[var(--border-base)] text-center">
                            Last Updated: February 6, 2026
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
