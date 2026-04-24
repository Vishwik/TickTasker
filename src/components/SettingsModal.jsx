import React, { useState, useEffect } from 'react';
import { useTasks } from '../context/TaskContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Zap, Target, Download, ShieldCheck, Palette, Moon, Sun, Monitor, Type, Layout, User, Cloud, LogOut, RefreshCw, Save } from 'lucide-react';
import { useProfile } from '../context/ProfileContext';

export default function SettingsModal({ isOpen, onClose }) {
    const { preferences, togglePreference, tasks, categoryStats, setIsPrivacyModalOpen, theme, updateTheme, syncStatus, settingsActiveTab, setSettingsActiveTab } = useTasks();
    const { user, profile, updateProfileData, logout } = useProfile();

    // Editable Profile State
    const [editName, setEditName] = useState('');
    const [editRole, setEditRole] = useState('');
    const [editAvatar, setEditAvatar] = useState('');
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [avatarError, setAvatarError] = useState(false);

    useEffect(() => {
        if (profile) {
            setEditName(profile.name || '');
            setEditRole(profile.role || '');
            setEditAvatar(profile.avatar || '');
            setAvatarError(false);
        }
    }, [profile]);

    const handleDownloadData = () => {
        const data = {
            tasks,
            categoryStats,
            exportedAt: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ticktasker-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-[var(--bg-surface)] w-full max-w-2xl rounded-2xl border border-[var(--border-base)] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-[var(--border-base)] flex justify-between items-center bg-[var(--text-primary)]/[0.02]">
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">Settings</h2>
                            <button onClick={onClose} className="text-[var(--text-primary)] opacity-50 hover:opacity-100 transition-opacity">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Mobile Tabs */}
                        <div className="md:hidden flex border-b border-[var(--border-base)] overflow-x-auto no-scrollbar">
                            {[
                                { id: 'appearance', label: 'Appearance', icon: Palette },
                                { id: 'labs', label: 'Labs', icon: Sparkles },
                                { id: 'profile', label: 'Profile', icon: User }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setSettingsActiveTab(tab.id)}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${settingsActiveTab === tab.id
                                            ? 'border-[rgb(var(--color-accent))] text-[rgb(var(--color-accent))] bg-[rgb(var(--color-accent))]/5'
                                            : 'border-transparent text-[var(--text-primary)] opacity-60'
                                        }`}
                                >
                                    <tab.icon size={16} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-1 overflow-hidden">
                            {/* Sidebar */}
                            <div className="w-48 bg-[var(--bg-base)]/50 border-r border-[var(--border-base)] p-4 space-y-2 hidden md:block">
                                <button
                                    onClick={() => setSettingsActiveTab('appearance')}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${settingsActiveTab === 'appearance' ? 'bg-[var(--text-primary)]/10 text-[var(--text-primary)]' : 'text-[var(--text-primary)] opacity-60 hover:opacity-100 hover:bg-[var(--text-primary)]/5'}`}
                                >
                                    <Palette size={18} /> Appearance
                                </button>
                                <button
                                    onClick={() => setSettingsActiveTab('labs')}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${settingsActiveTab === 'labs' ? 'bg-[var(--text-primary)]/10 text-[var(--text-primary)]' : 'text-[var(--text-primary)] opacity-60 hover:opacity-100 hover:bg-[var(--text-primary)]/5'}`}
                                >
                                    <Sparkles size={18} /> Labs
                                </button>
                                <button
                                    onClick={() => setSettingsActiveTab('profile')}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${settingsActiveTab === 'profile' ? 'bg-[var(--text-primary)]/10 text-[var(--text-primary)]' : 'text-[var(--text-primary)] opacity-60 hover:opacity-100 hover:bg-[var(--text-primary)]/5'}`}
                                >
                                    <User size={18} /> Profile & Sync
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-8">

                                {settingsActiveTab === 'appearance' && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                        {/* 1. Theme Mode */}
                                        <section>
                                            <label className="text-xs font-bold text-[var(--text-primary)] opacity-50 uppercase tracking-wider mb-4 block">Theme Mode</label>
                                            <div className="grid grid-cols-3 gap-4">
                                                {[
                                                    { id: 'dark', label: 'Dark', icon: Moon },
                                                    { id: 'dim', label: 'Dim', icon: Monitor },
                                                    { id: 'light', label: 'Light', icon: Sun }
                                                ].map(mode => (
                                                    <button
                                                        key={mode.id}
                                                        onClick={() => updateTheme('mode', mode.id)}
                                                        className={`relative p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${theme.mode === mode.id
                                                            ? 'border-[rgb(var(--color-accent))] bg-[rgb(var(--color-accent))]/10'
                                                            : 'border-[var(--border-base)] bg-[var(--text-primary)]/5 hover:bg-[var(--text-primary)]/10'
                                                            }`}
                                                    >
                                                        <mode.icon size={20} className={theme.mode === mode.id ? 'text-[rgb(var(--color-accent))]' : 'text-[var(--text-primary)] opacity-60'} />
                                                        <span className={`text-sm font-medium ${theme.mode === mode.id ? 'text-[var(--text-primary)]' : 'text-[var(--text-primary)] opacity-60'}`}>{mode.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </section>

                                        {/* 2. Accent Color */}
                                        <section>
                                            <label className="text-xs font-bold text-[var(--text-primary)] opacity-50 uppercase tracking-wider mb-4 block">Accent Color</label>
                                            <div className="flex gap-4">
                                                {[
                                                    { id: 'indigo', color: 'bg-indigo-500' },
                                                    { id: 'violet', color: 'bg-violet-500' },
                                                    { id: 'emerald', color: 'bg-emerald-500' },
                                                    { id: 'rose', color: 'bg-rose-500' },
                                                    { id: 'amber', color: 'bg-amber-500' }
                                                ].map(accent => (
                                                    <button
                                                        key={accent.id}
                                                        onClick={() => updateTheme('accent', accent.id)}
                                                        className={`w-10 h-10 rounded-full ${accent.color} transition-transform hover:scale-110 flex items-center justify-center ring-offset-2 ring-offset-[var(--bg-surface)] ${theme.accent === accent.id ? 'ring-2 ring-[var(--text-primary)] scale-110' : ''}`}
                                                    />
                                                ))}
                                            </div>
                                        </section>

                                        <div className="grid grid-cols-2 gap-8">
                                            {/* 3. Corner Radius */}
                                            <section>
                                                <label className="text-xs font-bold text-[var(--text-primary)] opacity-50 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                    <Layout size={14} /> Corner Radius
                                                </label>
                                                <div className="flex bg-[var(--text-primary)]/5 p-1 rounded-lg border border-[var(--border-base)]">
                                                    {['soft', 'sharp'].map(r => (
                                                        <button
                                                            key={r}
                                                            onClick={() => updateTheme('radius', r)}
                                                            className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${theme.radius === r ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow border border-[var(--border-base)]' : 'text-[var(--text-primary)] opacity-50 hover:opacity-80'}`}
                                                        >
                                                            {r.charAt(0).toUpperCase() + r.slice(1)}
                                                        </button>
                                                    ))}
                                                </div>
                                            </section>

                                            {/* 4. Font Scale */}
                                            <section>
                                                <label className="text-xs font-bold text-[var(--text-primary)] opacity-50 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                    <Type size={14} /> Typography
                                                </label>
                                                <div className="flex bg-[var(--text-primary)]/5 p-1 rounded-lg border border-[var(--border-base)]">
                                                    {['normal', 'large'].map(s => (
                                                        <button
                                                            key={s}
                                                            onClick={() => updateTheme('fontScale', s)}
                                                            className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${theme.fontScale === s ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow border border-[var(--border-base)]' : 'text-[var(--text-primary)] opacity-50 hover:opacity-80'}`}
                                                        >
                                                            {s.charAt(0).toUpperCase() + s.slice(1)}
                                                        </button>
                                                    ))}
                                                </div>
                                            </section>
                                        </div>
                                    </div>
                                )}

                                {settingsActiveTab === 'labs' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div className="p-4 bg-[rgb(var(--color-accent))]/10 border border-[rgb(var(--color-accent))]/20 rounded-xl mb-6">
                                            <h3 className="text-[rgb(var(--color-accent))] font-bold flex items-center gap-2 mb-1"><Sparkles size={16} /> Experimental Features</h3>
                                            <p className="text-xs text-[var(--text-primary)] opacity-70">These features are in early testing. Use at your own risk.</p>
                                        </div>

                                        {/* Existing Labs Content */}
                                        <div className="space-y-4">
                                            {/* Experiment 1: Focus Flow */}
                                            <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--text-primary)]/5 border border-[var(--border-base)]">
                                                <div>
                                                    <h3 className="font-bold text-[var(--text-primary)]">Focus Flow</h3>
                                                    <p className="text-sm text-[var(--text-primary)] opacity-60">Momentum visualization</p>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={preferences.labs_focusFlow}
                                                    onChange={() => togglePreference('labs_focusFlow')}
                                                    className="w-5 h-5 accent-[rgb(var(--color-accent))]"
                                                />
                                            </div>
                                            {/* Experiment 2: Weekly Intentions */}
                                            <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--text-primary)]/5 border border-[var(--border-base)]">
                                                <div>
                                                    <h3 className="font-bold text-[var(--text-primary)]">Weekly Intentions</h3>
                                                    <p className="text-sm text-[var(--text-primary)] opacity-60">Goal ring tracking</p>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={preferences.labs_weeklyGoals}
                                                    onChange={() => togglePreference('labs_weeklyGoals')}
                                                    className="w-5 h-5 accent-[rgb(var(--color-accent))]"
                                                />
                                            </div>

                                            {/* Data Export */}
                                            <div className="pt-4 border-t border-[var(--border-base)]">
                                                <button onClick={handleDownloadData} className="flex items-center gap-2 text-sm text-[var(--text-primary)] opacity-60 hover:opacity-100 transition-colors">
                                                    <Download size={16} /> Export Data
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {settingsActiveTab === 'profile' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--text-primary)]/5 border border-[var(--border-base)]">
                                                {profile?.avatar && !avatarError ? (
                                                    <img src={profile.avatar} alt="Profile" className="w-12 h-12 rounded-full border border-[var(--border-base)]" onError={() => setAvatarError(true)} />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                                                        {profile?.name ? profile.name.charAt(0).toUpperCase() : 'U'}
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-[var(--text-primary)]">{profile?.name || 'TickTasker User'}</h4>
                                                    <p className="text-xs text-[var(--text-primary)] opacity-60 mb-1">{profile?.email || user?.email}</p>
                                                    <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider">
                                                        <span className="opacity-50">Sync:</span>
                                                        {syncStatus === 'synced' && <span className="text-emerald-500 flex items-center gap-1"><Cloud size={10} /> Active</span>}
                                                        {syncStatus === 'syncing' && <span className="text-blue-500 flex items-center gap-1"><RefreshCw size={10} className="animate-spin" /> Saving</span>}
                                                        {syncStatus === 'offline' && <span className="text-amber-500">Offline Cache</span>}
                                                        {syncStatus === 'error' && <span className="text-red-500">Error</span>}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4 p-4 border border-[var(--border-base)] rounded-xl bg-[var(--bg-base)]/50">
                                                <h4 className="font-bold text-sm text-[var(--text-primary)] mb-4">Edit Profile</h4>
                                                
                                                <div>
                                                    <label className="text-xs font-medium text-[var(--text-primary)] opacity-70 ml-1">Display Name</label>
                                                    <input
                                                        type="text"
                                                        value={editName}
                                                        onChange={(e) => setEditName(e.target.value)}
                                                        className="w-full mt-1 px-4 py-2 bg-[var(--text-primary)]/5 border border-[var(--border-base)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[rgb(var(--color-accent))] transition-colors text-sm"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="text-xs font-medium text-[var(--text-primary)] opacity-70 ml-1">Role / Title</label>
                                                    <input
                                                        type="text"
                                                        value={editRole}
                                                        onChange={(e) => setEditRole(e.target.value)}
                                                        placeholder="e.g. Productivity User, Student"
                                                        className="w-full mt-1 px-4 py-2 bg-[var(--text-primary)]/5 border border-[var(--border-base)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[rgb(var(--color-accent))] transition-colors text-sm"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="text-xs font-medium text-[var(--text-primary)] opacity-70 ml-1">Avatar Image URL (Optional)</label>
                                                    <input
                                                        type="text"
                                                        value={editAvatar}
                                                        onChange={(e) => setEditAvatar(e.target.value)}
                                                        placeholder="https://..."
                                                        className="w-full mt-1 px-4 py-2 bg-[var(--text-primary)]/5 border border-[var(--border-base)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[rgb(var(--color-accent))] transition-colors text-sm"
                                                    />
                                                </div>

                                                <button
                                                    onClick={async () => {
                                                        setIsSavingProfile(true);
                                                        await updateProfileData({ name: editName, role: editRole, avatar: editAvatar });
                                                        setIsSavingProfile(false);
                                                    }}
                                                    disabled={isSavingProfile}
                                                    className="w-full py-2 bg-[var(--text-primary)]/10 hover:bg-[var(--text-primary)]/20 text-[var(--text-primary)] font-medium rounded-lg transition-colors flex items-center justify-center gap-2 mt-4 text-sm disabled:opacity-50"
                                                >
                                                    {isSavingProfile ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                                                    {isSavingProfile ? 'Saving...' : 'Save Profile'}
                                                </button>
                                            </div>

                                            <button
                                                onClick={logout}
                                                className="w-full py-3 border border-[var(--border-base)] text-red-500 font-medium rounded-xl hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                Sign Out
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* Footer / Privacy */}
                        <div className="p-4 border-t border-[var(--border-base)] bg-[var(--text-primary)]/[0.02] flex justify-between items-center px-6">
                            <span className="text-xs text-[var(--text-primary)] opacity-50">v1.1.0 • TickTasker</span>
                            <button
                                onClick={() => setIsPrivacyModalOpen(true)}
                                className="text-xs text-[var(--text-primary)] opacity-50 hover:text-[rgb(var(--color-accent))] transition-colors flex items-center gap-1"
                            >
                                <ShieldCheck size={12} />
                                Privacy
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
