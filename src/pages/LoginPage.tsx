import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, Stethoscope, Loader2 } from 'lucide-react';

export function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [keepLoggedIn, setKeepLoggedIn] = useState(false);
    const [resetMsg, setResetMsg] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setResetMsg('');
        setLoading(true);
        try {
            await login(email, password);
            navigate('/');
        } catch (err: any) {
            setError(err.message || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        setError('');
        setResetMsg('');
        if (!email.trim()) {
            setError('Please enter your email address first, then click "Forgot password?"');
            return;
        }
        try {
            await sendPasswordResetEmail(auth, email);
            setResetMsg('Password reset email sent! Check your inbox.');
        } catch (err: any) {
            setError(err.message || 'Failed to send reset email');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-blue-600/10 blur-3xl" />
            </div>

            <div className="relative w-full max-w-md animate-fade-in">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4 shadow-2xl shadow-blue-600/30">
                        <Stethoscope className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-1">Neem Admin Portal</h1>
                    <p className="text-slate-400">Precision in Healthcare Management</p>
                </div>

                {/* Card */}
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                                {error}
                            </div>
                        )}
                        {resetMsg && (
                            <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 text-green-400 text-sm">
                                {resetMsg}
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                    placeholder="admin@neem.health"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Password</label>
                                <button type="button" onClick={handleForgotPassword} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                                    Forgot password?
                                </button>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        {/* Keep me logged in */}
                        <div className="flex items-center gap-2.5">
                            <input
                                type="checkbox"
                                id="keep-logged-in"
                                checked={keepLoggedIn}
                                onChange={e => setKeepLoggedIn(e.target.checked)}
                                className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-600 focus:ring-blue-500/20 focus:ring-offset-0"
                            />
                            <label htmlFor="keep-logged-in" className="text-sm text-slate-400 cursor-pointer select-none">
                                Keep me logged in
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                            {loading ? 'Signing in...' : 'Access Dashboard'}
                        </button>
                    </form>
                </div>

                {/* Physician login note */}
                <div className="mt-5 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 px-5 py-4 text-center">
                    <p className="text-slate-400 text-sm">
                        Are you a physician?{' '}
                        <span className="text-blue-400">Sign in with your credentials</span>{' '}
                        to manage appointments and view your schedule.
                    </p>
                </div>

                {/* Footer */}
                <div className="text-center mt-6 space-y-1">
                    <p className="text-slate-600 text-sm">&copy; 2026 Neem Healthcare. All rights reserved.</p>
                    <button type="button" className="text-slate-500 text-xs hover:text-blue-400 transition-colors">
                        Contact IT Support
                    </button>
                </div>
            </div>
        </div>
    );
}
