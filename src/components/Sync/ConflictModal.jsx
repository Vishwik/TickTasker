import React from 'react';
import { useProfile } from '../../context/ProfileContext';
import { AlertTriangle, Cloud, Monitor, ArrowRight } from 'lucide-react';

const ConflictModal = () => {
    const { conflict, resolveConflict } = useProfile();

    if (!conflict) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#1a1b1e] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-white/5 bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
                    <div className="flex items-center gap-3 text-amber-400 mb-2">
                        <AlertTriangle className="w-6 h-6" />
                        <h2 className="text-xl font-bold tracking-tight">Sync Conflict Detected</h2>
                    </div>
                    <p className="text-white/60 text-sm leading-relaxed">
                        We found saved preferences from another device. Which settings would you like to keep?
                    </p>
                </div>

                {/* Comparison Visualizer (Simple) */}
                <div className="p-6 grid grid-cols-2 gap-4">
                    {/* Remote Card */}
                    <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-center relative group hover:border-indigo-500/40 transition-colors">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1a1b1e] text-indigo-400 text-xs px-2 py-0.5 rounded-full border border-indigo-500/30 flex items-center gap-1">
                            <Cloud className="w-3 h-3" /> Cloud
                        </div>
                        <div className="mt-2 text-sm text-indigo-200">
                            Saved Profile
                        </div>
                        <div className="text-xs text-white/40 mt-1">
                            Last synced recently
                        </div>
                    </div>

                    {/* Local Card */}
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center relative group hover:border-emerald-500/40 transition-colors">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1a1b1e] text-emerald-400 text-xs px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                            <Monitor className="w-3 h-3" /> This Device
                        </div>
                        <div className="mt-2 text-sm text-emerald-200">
                            Current Settings
                        </div>
                        <div className="text-xs text-white/40 mt-1">
                            Active now
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-6 pt-0 flex flex-col gap-3">
                    <button
                        onClick={() => resolveConflict('use_remote')}
                        className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
                    >
                        <Cloud className="w-4 h-4" />
                        Use Cloud Settings
                    </button>

                    <button
                        onClick={() => resolveConflict('keep_local')}
                        className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white/80 hover:text-white font-medium flex items-center justify-center gap-2 transition-all"
                    >
                        <Monitor className="w-4 h-4" />
                        Keep Current Settings
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConflictModal;
