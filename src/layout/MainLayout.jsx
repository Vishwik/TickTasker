import React, { useState, useRef, useEffect } from 'react';
import { LayoutDashboard, CheckSquare, BarChart2, FolderKanban, Menu, X, Plus, Bell, Search, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

const SidebarItem = ({ icon: Icon, label, active, onClick, isOpen }) => {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden ${active
                ? 'text-white shadow-lg shadow-[rgb(var(--color-accent))]/20'
                : 'text-[var(--text-primary)] opacity-60 hover:opacity-100 hover:bg-[var(--text-primary)]/5'
                }`}
        >
            {active && (
                <div className="absolute inset-0 bg-gradient-to-r from-[rgb(var(--color-accent))] to-[rgb(var(--color-accent))]/80 opacity-90 z-0"></div>
            )}
            <div className="relative z-10 flex items-center space-x-3 w-full">
                <Icon size={20} className={`${active ? 'text-white' : 'text-inherit transition-colors'}`} />
                {isOpen && (
                    <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="font-medium text-sm tracking-wide"
                    >
                        {label}
                    </motion.span>
                )}
            </div>
            {active && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-l-full opacity-50"></div>}
        </button>
    );
};

import { useTasks } from '../context/TaskContext';
import { useProfile } from '../context/ProfileContext';
import PWAInstallPrompt from '../components/PWAInstallPrompt';
import CommandPalette from '../components/CommandPalette'; // Import Palette
import AddTaskModal from '../components/AddTaskModal'; // Import Global Modal
import SettingsModal from '../components/SettingsModal'; // Import Settings Modal
import PrivacyModal from '../components/PrivacyModal'; // Import Privacy Modal
import BreakdownModal from '../components/BreakdownModal'; // Import Breakdown Modal

export default function Layout({ children, activeTab, setActiveTab }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const { setIsAddTaskModalOpen, notifications, markAllAsRead, setIsCommandPaletteOpen, isSettingsModalOpen, setIsSettingsModalOpen, setSettingsActiveTab, isPrivacyModalOpen, setIsPrivacyModalOpen, breakdownTask, setBreakdownTask } = useTasks();
    const { profile } = useProfile();
    const [avatarError, setAvatarError] = useState(false);
    const bellRef = useRef(null);
    const [bellPos, setBellPos] = useState({ top: 0, right: 0 });

    React.useEffect(() => {
        setAvatarError(false);
    }, [profile?.avatar]);

    // Track bell button position for portal positioning
    useEffect(() => {
        if (showNotifications && bellRef.current) {
            const rect = bellRef.current.getBoundingClientRect();
            setBellPos({
                top: rect.bottom + window.scrollY + 8,
                right: window.innerWidth - rect.right,
            });
        }
    }, [showNotifications]);

    // Responsive Sidebar Handling
    React.useEffect(() => {
        const handleResize = (e) => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);

            // Auto-close when resizing to mobile
            if (mobile) {
                setIsSidebarOpen(false);
            } else {
                // Optional: Auto-open when resizing to desktop if desired, 
                // but keeping it as-is (collapsed or expanded) is often better.
                // We'll enforce open for now to ensure visibility on first load/resize to desktop
                setIsSidebarOpen(true);
            }
        };

        // Initial check
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Keyboard Shortcut
    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsCommandPaletteOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setIsCommandPaletteOpen]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const notificationTypePriority = {
        error: 0,
        warning: 1,
        success: 2,
        info: 3
    };

    const sortNotifications = (list) => {
        return [...list].sort((a, b) => {
            const priorityDiff = (notificationTypePriority[a.type] ?? 99) - (notificationTypePriority[b.type] ?? 99);
            if (priorityDiff !== 0) return priorityDiff;
            return new Date(b.timestamp) - new Date(a.timestamp);
        });
    };

    const unreadNotifications = React.useMemo(
        () => sortNotifications(notifications.filter(n => !n.read)),
        [notifications]
    );

    const readNotifications = React.useMemo(
        () => sortNotifications(notifications.filter(n => n.read)),
        [notifications]
    );

    return (
        <div className="flex h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-sans overflow-hidden transition-colors duration-300">
            {/* Mobile Sidebar (Drawer) */}
            <AnimatePresence>
                {isSidebarOpen && isMobile && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSidebarOpen(false)}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
                        />

                        {/* Drawer */}
                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-0 left-0 bottom-0 w-64 bg-[var(--bg-surface)] border-r border-[var(--border-base)] z-50 flex flex-col md:hidden"
                        >
                            {/* Logo Area */}
                            <div className="h-16 flex items-center px-6 border-b border-[var(--border-base)] justify-between">
                                <div className="flex items-center space-x-2">
                                    <div className="w-8 h-8 bg-gradient-to-tr from-[rgb(var(--color-accent))] to-[rgb(var(--color-accent))]/70 rounded-lg flex items-center justify-center shrink-0">
                                        <CheckSquare size={18} className="text-white" />
                                    </div>
                                    <span className="font-bold text-lg text-[var(--text-primary)]">
                                        TickTasker
                                    </span>
                                </div>
                                <button onClick={() => setIsSidebarOpen(false)} className="p-1 rounded-lg hover:bg-[var(--text-primary)]/5">
                                    <X size={20} className="text-[var(--text-primary)] opacity-60" />
                                </button>
                            </div>

                            {/* Navigation */}
                            <div className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
                                <SidebarItem
                                    icon={LayoutDashboard}
                                    label="Dashboard"
                                    isOpen={true}
                                    active={activeTab === 'dashboard'}
                                    onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
                                />
                                <SidebarItem
                                    icon={CheckSquare}
                                    label="My Tasks"
                                    isOpen={true}
                                    active={activeTab === 'tasks'}
                                    onClick={() => { setActiveTab('tasks'); setIsSidebarOpen(false); }}
                                />
                                <SidebarItem
                                    icon={BarChart2}
                                    label="Analytics"
                                    isOpen={true}
                                    active={activeTab === 'analytics'}
                                    onClick={() => { setActiveTab('analytics'); setIsSidebarOpen(false); }}
                                />

                                <div className="pt-4 border-t border-[var(--border-base)] mt-4">
                                    <SidebarItem
                                        icon={Settings}
                                        label="Settings"
                                        isOpen={true}
                                        active={isSettingsModalOpen}
                                        onClick={() => { setIsSettingsModalOpen(true); setIsSidebarOpen(false); }}
                                    />
                                </div>
                            </div>

                            {/* User Profile */}
                            <div className="p-4 border-t border-[var(--border-base)]">
                                <div className="flex items-center space-x-3">
                                    {profile?.avatar && !avatarError ? (
                                        <img src={profile.avatar} alt="Profile" className="w-8 h-8 rounded-full border border-white/10 shrink-0" onError={() => setAvatarError(true)} />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold ring-2 ring-white/10 text-white shrink-0">
                                            {profile ? profile.name.charAt(0).toUpperCase() : 'G'}
                                        </div>
                                    )}
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{profile ? profile.name : 'Guest'}</p>
                                        <p className="text-xs text-[var(--text-primary)] opacity-60 truncate">{profile ? profile.role : 'Productivity User'}</p>
                                    </div>
                                </div>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Sidebar - Desktop */}
            <aside
                className={`${isSidebarOpen ? 'w-64' : 'w-20'
                    } hidden md:flex flex-col bg-[var(--bg-surface)] border-r border-[var(--border-base)] transition-all duration-300 ease-in-out z-20`}
            >
                {/* Logo Area */}
                <div className="h-16 flex items-center px-6 border-b border-[var(--border-base)]">
                    <div className={`flex items-center space-x-2 ${!isSidebarOpen && 'justify-center w-full'}`}>
                        <div className="w-8 h-8 bg-gradient-to-tr from-[rgb(var(--color-accent))] to-[rgb(var(--color-accent))]/70 rounded-lg flex items-center justify-center shrink-0">
                            <CheckSquare size={18} className="text-white" />
                        </div>
                        {isSidebarOpen && (
                            <span className="font-bold text-lg text-[var(--text-primary)]">
                                TickTasker
                            </span>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex-1 py-6 px-3 space-y-2">
                    <SidebarItem
                        icon={LayoutDashboard}
                        label="Dashboard"
                        isOpen={isSidebarOpen}
                        active={activeTab === 'dashboard'}
                        onClick={() => setActiveTab('dashboard')}
                    />
                    <SidebarItem
                        icon={CheckSquare}
                        label="My Tasks"
                        isOpen={isSidebarOpen}
                        active={activeTab === 'tasks'}
                        onClick={() => setActiveTab('tasks')}
                    />
                    <SidebarItem
                        icon={BarChart2}
                        label="Analytics"
                        isOpen={isSidebarOpen}
                        active={activeTab === 'analytics'}
                        onClick={() => setActiveTab('analytics')}
                    />

                    <div className="pt-4 border-t border-[var(--border-base)] mt-4">
                        <SidebarItem
                            icon={Settings}
                            label="Settings"
                            isOpen={isSidebarOpen}
                            active={isSettingsModalOpen}
                            onClick={() => setIsSettingsModalOpen(true)}
                        />
                    </div>
                </div>

                {/* User Profile Snippet */}
                <div className="p-4 border-t border-[var(--border-base)]">
                    <button 
                        onClick={() => { setSettingsActiveTab('profile'); setIsSettingsModalOpen(true); }}
                        className={`w-full flex items-center p-2 rounded-xl hover:bg-[var(--text-primary)]/5 transition-colors ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}
                    >
                        {profile?.avatar && !avatarError ? (
                            <img src={profile.avatar} alt="Profile" className="w-8 h-8 rounded-full border border-white/10 shrink-0" onError={() => setAvatarError(true)} />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold ring-2 ring-white/10 text-white shrink-0">
                                {profile ? profile.name.charAt(0).toUpperCase() : 'G'}
                            </div>
                        )}
                        {isSidebarOpen && (
                            <div className="flex-1 ml-3 overflow-hidden">
                                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{profile ? profile.name : 'Guest'}</p>
                                <p className="text-xs text-[var(--text-primary)] opacity-60 truncate">{profile ? profile.role : 'Productivity User'}</p>
                            </div>
                        )}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top Header */}
                <header className="h-16 border-b border-[var(--border-base)] bg-[var(--bg-base)]/50 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-10 transition-colors duration-300">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 hover:bg-[var(--text-primary)]/5 rounded-lg text-[var(--text-primary)] opacity-60 hover:opacity-100 transition-colors"
                    >
                        <Menu size={20} />
                    </button>

                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => setIsCommandPaletteOpen(true)}
                            className="p-2 hover:bg-[var(--text-primary)]/5 rounded-lg text-[var(--text-primary)] opacity-60 hover:opacity-100 transition-colors flex items-center gap-2 group"
                            aria-label="Open Command Palette"
                        >
                            <Search size={20} />
                            <span className="hidden md:inline text-xs bg-[var(--text-primary)]/10 px-1.5 py-0.5 rounded text-[var(--text-primary)]/60 group-hover:text-[var(--text-primary)]">Ctrl K</span>
                        </button>

                        <div className="relative">
                            <button
                                ref={bellRef}
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="p-2 relative hover:bg-[var(--text-primary)]/5 rounded-lg text-[var(--text-primary)] opacity-60 hover:opacity-100 transition-colors"
                            >
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[var(--bg-base)]"></span>
                                )}
                            </button>

                            {/* Notifications Dropdown — rendered as a Portal to escape SVG stacking contexts */}
                            {showNotifications && createPortal(
                                <AnimatePresence>
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        style={{ position: 'fixed', top: bellPos.top, right: bellPos.right, zIndex: 99999 }}
                                        className="w-80 md:w-96 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-2xl shadow-2xl overflow-hidden ring-1 ring-[var(--border-base)]"
                                    >
                                        <div className="p-4 border-b border-[var(--border-base)] flex justify-between items-center bg-[var(--text-primary)]/[0.02]">
                                            <h3 className="font-bold text-sm text-[var(--text-primary)] tracking-wide">Notifications</h3>
                                            {unreadCount > 0 && (
                                                <button
                                                    onClick={markAllAsRead}
                                                    className="text-[10px] font-medium text-[rgb(var(--color-accent))] hover:text-[rgb(var(--color-accent))]/80 transition-colors uppercase tracking-wider"
                                                >
                                                    Mark read
                                                </button>
                                            )}
                                        </div>
                                        <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--text-primary)]/10">
                                            {notifications.length === 0 ? (
                                                <div className="py-12 px-8 text-center">
                                                    <div className="w-12 h-12 bg-[var(--text-primary)]/5 rounded-full flex items-center justify-center mx-auto mb-3">
                                                        <Bell size={20} className="text-[var(--text-primary)] opacity-40" />
                                                    </div>
                                                    <p className="text-[var(--text-primary)] opacity-50 text-xs">No active alerts</p>
                                                </div>
                                            ) : (
                                                <>
                                                    {/* Section 1: Critical Alerts (Deadlines) */}
                                                    {notifications.some(n => n.kind === 'alert' || n.kind === 'deadline') && (
                                                        <div className="mb-2">
                                                            <div className="px-5 py-2 bg-[var(--text-primary)]/[0.02] border-b border-[var(--border-base)] flex items-center gap-2">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                                                                <h4 className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Critical Alerts</h4>
                                                            </div>
                                                            {notifications
                                                                .filter(n => n.kind === 'alert' || n.kind === 'deadline')
                                                                .map((notif) => (
                                                                    <div
                                                                        key={notif.id}
                                                                        className={`py-4 px-5 border-b border-[var(--border-base)] bg-red-500/[0.05] flex items-start space-x-4 group`}
                                                                    >
                                                                        <div className="w-1.5 h-1.5 mt-2 rounded-full shrink-0 bg-red-500"></div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex items-start justify-between">
                                                                                <div>
                                                                                    <p className={`text-sm leading-snug font-medium text-[var(--text-primary)]`}>
                                                                                        {notif.title}
                                                                                    </p>
                                                                                    <p className="text-xs text-red-500 mt-0.5">
                                                                                        {notif.message}
                                                                                    </p>
                                                                                </div>
                                                                                {notif.count > 1 && (
                                                                                    <span className="ml-2 shrink-0 px-1.5 py-0.5 bg-red-500/10 border border-red-500/20 rounded-full text-[9px] text-red-500 font-mono">
                                                                                        ×{notif.count}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            {notif.context && notif.context.parentTaskTitle && (
                                                                                <p className="text-[10px] text-red-500/60 mt-1.5 font-medium tracking-wide uppercase">
                                                                                    {notif.context.parentTaskTitle}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    )}

                                                    {/* Section 2: Focus Queue (AI Priorities) */}
                                                    {notifications.some(n => n.kind === 'ai_priority') && (
                                                        <div className="mb-2">
                                                            <div className="px-5 py-2 bg-[var(--text-primary)]/[0.02] border-b border-[var(--border-base)] flex items-center gap-2">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--color-accent))] shadow-[0_0_8px_rgba(var(--color-accent),0.5)]"></div>
                                                                <h4 className="text-[10px] font-bold text-[rgb(var(--color-accent))] uppercase tracking-wider">Focus Queue</h4>
                                                            </div>
                                                            {notifications
                                                                .filter(n => n.kind === 'ai_priority')
                                                                .map((notif) => (
                                                                    <div
                                                                        key={notif.id}
                                                                        className={`py-4 px-5 border-b border-[var(--border-base)] hover:bg-[var(--text-primary)]/[0.03] transition-colors flex items-start space-x-4 group`}
                                                                    >
                                                                        <div className="w-1.5 h-1.5 mt-2 rounded-full shrink-0 bg-[rgb(var(--color-accent))]"></div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className={`text-sm leading-snug font-medium ${notif.read ? 'text-[var(--text-primary)] opacity-50' : 'text-[var(--text-primary)]'}`}>
                                                                                {notif.title}
                                                                            </p>
                                                                            <p className="text-xs text-[var(--text-primary)] opacity-60 mt-0.5 leading-relaxed">
                                                                                {notif.message}
                                                                            </p>
                                                                            <p className="text-[10px] text-[rgb(var(--color-accent))]/60 mt-1.5 font-medium tracking-wide">
                                                                                AI OPTIMIZED
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    )}

                                                    {/* Section 3: Activity (System + Info + Success) */}
                                                    {notifications.some(n => ['system', 'warning', 'info'].includes(n.kind) || n.type === 'success') && (
                                                        <div className="mb-2">
                                                            <div className="px-5 py-2 bg-[var(--text-primary)]/[0.02] border-b border-[var(--border-base)] flex items-center gap-2">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                                                <h4 className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Activity</h4>
                                                            </div>
                                                            {notifications
                                                                .filter(n => ['system', 'warning', 'info'].includes(n.kind) || n.type === 'success')
                                                                .map((notif) => (
                                                                    <div
                                                                        key={notif.id}
                                                                        className={`py-4 px-5 border-b border-[var(--border-base)] hover:bg-[var(--text-primary)]/[0.02] transition-colors flex items-start space-x-4 group`}
                                                                    >
                                                                        <div className={`w-1.5 h-1.5 mt-2 rounded-full shrink-0 ${notif.type === 'success' ? 'bg-emerald-500' :
                                                                            notif.kind === 'warning' ? 'bg-orange-500' : 'bg-blue-500'
                                                                            }`}></div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-sm leading-snug text-[var(--text-primary)] font-medium">
                                                                                {notif.title}
                                                                            </p>
                                                                            <p className="text-xs text-[var(--text-primary)] opacity-60 mt-0.5">
                                                                                {notif.message}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </motion.div>
                                </AnimatePresence>,
                                document.body
                            )}
                        </div>

                        <button
                            onClick={() => setIsAddTaskModalOpen(true)}
                            className="bg-[rgb(var(--color-accent))] hover:bg-[rgb(var(--color-accent))]/90 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center shadow-lg shadow-[rgb(var(--color-accent))]/20 transition-all hover:scale-105 active:scale-95"
                        >
                            <Plus size={16} className="mr-2" />
                            New Task
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-auto p-6 scrollbar-thin scrollbar-thumb-[var(--text-primary)]/10 scrollbar-track-transparent">
                    {children}
                </main>
                <PWAInstallPrompt />
                <CommandPalette setActiveTab={setActiveTab} /> {/* Render Palette */}
                <AddTaskModal /> {/* Render Global Modal */}
                <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} />
                <PrivacyModal isOpen={isPrivacyModalOpen} onClose={() => setIsPrivacyModalOpen(false)} />
                <BreakdownModal task={breakdownTask} isOpen={!!breakdownTask} onClose={() => setBreakdownTask(null)} />
            </div>
        </div>
    );
}
