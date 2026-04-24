import React, { useState, useEffect } from 'react';
import { Download, X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRegisterSW } from 'virtual:pwa-register/react'; // Import Vite PWA hook

export default function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstallVisible, setIsInstallVisible] = useState(false);

    // Check for updates
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered: ' + r);
        },
        onRegisterError(error) {
            console.log('SW registration error', error);
        },
    });

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsInstallVisible(true);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response: ${outcome}`);
        setDeferredPrompt(null);
        setIsInstallVisible(false);
    };

    const handleUpdateClick = () => {
        updateServiceWorker(true);
    };

    // Show if there is an update OR an install prompt
    const showPrompt = needRefresh || isInstallVisible;

    return (
        <AnimatePresence>
            {showPrompt && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 bg-[var(--bg-surface)] border border-[rgb(var(--color-accent))]/30 rounded-2xl shadow-2xl z-[70] p-4 flex items-center justify-between"
                >
                    <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-[rgb(var(--color-accent))] rounded-xl flex items-center justify-center text-white">
                            {needRefresh ? <RefreshCw size={20} className="animate-spin-slow" /> : <Download size={20} />}
                        </div>
                        <div>
                            <h4 className="text-[var(--text-primary)] font-bold text-sm">
                                {needRefresh ? 'Update Available' : 'Install App'}
                            </h4>
                            <p className="text-[var(--text-primary)] opacity-60 text-xs">
                                {needRefresh ? 'New features ready. Refresh to update.' : 'Add to Home Screen for offline use'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        {/* Only show dismiss for Install, generally Updates should be blocking or persistent until clicked */}
                        {!needRefresh && (
                            <button
                                onClick={() => setIsInstallVisible(false)}
                                className="p-2 text-[var(--text-primary)] opacity-50 hover:text-[var(--text-primary)] transition-colors"
                            >
                                <X size={18} />
                            </button>
                        )}
                        <button
                            onClick={needRefresh ? handleUpdateClick : handleInstallClick}
                            className="bg-[rgb(var(--color-accent))] hover:bg-[rgb(var(--color-accent))]/90 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all"
                        >
                            {needRefresh ? 'Update' : 'Install'}
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
