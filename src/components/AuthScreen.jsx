import React, { useState } from 'react';
import { useProfile } from '../context/ProfileContext';
import { CheckSquare, User, RefreshCw, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AuthScreen() {
    const { loginWithEmail, signupWithEmail, loginWithGoogle, authLoading } = useProfile();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [authError, setAuthError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setAuthError('');
        setIsLoading(true);
        try {
            if (isSignUp) {
                await signupWithEmail(email, password);
            } else {
                await loginWithEmail(email, password);
            }
        } catch (err) {
            setAuthError(err.message.replace('Firebase: ', ''));
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setAuthError('');
        try {
            await loginWithGoogle();
        } catch (err) {
            setAuthError(err.message.replace('Firebase: ', ''));
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
                <RefreshCw className="animate-spin text-[rgb(var(--color-accent))] w-8 h-8" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg-base)] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-96 bg-[rgb(var(--color-accent))]/5 blur-3xl -z-10 rounded-full mix-blend-screen opacity-50 transform -translate-y-1/2"></div>
            
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-center"
                >
                    <div className="w-16 h-16 bg-gradient-to-tr from-[rgb(var(--color-accent))] to-[rgb(var(--color-accent))]/70 rounded-2xl flex items-center justify-center shadow-lg shadow-[rgb(var(--color-accent))]/20">
                        <CheckSquare size={32} className="text-white" />
                    </div>
                </motion.div>
                <motion.h2 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="mt-6 text-center text-3xl font-extrabold text-[var(--text-primary)] tracking-tight"
                >
                    {isSignUp ? 'Create your account' : 'Sign in to TickTasker'}
                </motion.h2>
                <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mt-2 text-center text-sm text-[var(--text-primary)] opacity-60"
                >
                    Your tasks, synced everywhere.
                </motion.p>
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10"
            >
                <div className="bg-[var(--bg-surface)] py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-[var(--border-base)]">
                    {authError && (
                        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl flex items-start gap-3">
                            <AlertCircle size={18} className="shrink-0 mt-0.5" />
                            <span>{authError}</span>
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] opacity-80 ml-1">
                                Email address
                            </label>
                            <div className="mt-1">
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="appearance-none block w-full px-4 py-3 bg-[var(--text-primary)]/5 border border-[var(--border-base)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-accent))]/50 focus:border-[rgb(var(--color-accent))] transition-all sm:text-sm"
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] opacity-80 ml-1">
                                Password
                            </label>
                            <div className="mt-1">
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none block w-full px-4 py-3 bg-[var(--text-primary)]/5 border border-[var(--border-base)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-accent))]/50 focus:border-[rgb(var(--color-accent))] transition-all sm:text-sm"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isLoading || !email || !password}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-[rgb(var(--color-accent))] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[rgb(var(--color-accent))] transition-all disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <RefreshCw className="animate-spin w-5 h-5" />
                                ) : (
                                    isSignUp ? 'Sign up' : 'Sign in'
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-[var(--border-base)]" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-[var(--bg-surface)] text-[var(--text-primary)] opacity-50 uppercase text-xs tracking-wider font-semibold">
                                    Or continue with
                                </span>
                            </div>
                        </div>

                        <div className="mt-6">
                            <button
                                onClick={handleGoogleLogin}
                                className="w-full inline-flex justify-center py-3 px-4 border border-[var(--border-base)] rounded-xl shadow-sm bg-[var(--text-primary)]/5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--text-primary)]/10 transition-colors"
                            >
                                <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48">
                                    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                                    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
                                    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                                    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
                                </svg>
                                Google
                            </button>
                        </div>
                    </div>

                    <div className="mt-8 text-center">
                        <button
                            onClick={() => { setIsSignUp(!isSignUp); setAuthError(''); }}
                            className="text-sm font-medium text-[rgb(var(--color-accent))] hover:text-[rgb(var(--color-accent))]/80 transition-colors"
                        >
                            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
