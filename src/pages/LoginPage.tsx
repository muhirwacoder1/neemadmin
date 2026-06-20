import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { Activity, CalendarDays, Eye, EyeOff, Lock, Loader2, Mail, ShieldCheck, Stethoscope, UsersRound } from 'lucide-react';
import loginArtwork from '../../login.webp';

export function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [keepLoggedIn, setKeepLoggedIn] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
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
        <div className="min-h-screen overflow-hidden bg-[#f3eedc] p-3 text-[#171717] md:p-5 lg:p-8">
            <div className="relative mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-[1600px] overflow-hidden rounded-[2.25rem] border border-black/5 bg-[#f7f6f0] shadow-[0_30px_100px_rgba(34,31,20,0.16)] md:min-h-[calc(100vh-2.5rem)] lg:min-h-[calc(100vh-4rem)]">
                <div className="absolute left-8 top-8 z-20 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/40 px-5 py-3 text-sm font-medium text-neutral-700 backdrop-blur-xl md:left-10 md:top-10">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#171717] text-white">
                        <Stethoscope className="h-4 w-4" />
                    </span>
                    Neem Admin
                </div>

                <section className="relative z-10 flex w-full flex-col justify-center px-6 pb-8 pt-28 sm:px-10 md:px-14 lg:w-[44%] lg:px-20 xl:px-24">
                    <div className="mx-auto w-full max-w-[520px]">
                        <div className="mb-10">
                            <p className="mb-4 inline-flex rounded-full border border-black/10 bg-white/50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
                                Secure dashboard
                            </p>
                            <h1 className="text-4xl font-semibold tracking-[-0.04em] text-neutral-950 sm:text-5xl">
                                Welcome back
                            </h1>
                            <p className="mt-3 max-w-sm text-base leading-7 text-neutral-500">
                                Sign in to manage patients, content, appointments, and marketplace operations.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 shadow-sm">
                                    {error}
                                </div>
                            )}
                            {resetMsg && (
                                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700 shadow-sm">
                                    {resetMsg}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="ml-8 block text-sm font-medium text-neutral-500">Email address</label>
                                <div className="relative">
                                    <Mail className="absolute left-7 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="h-[68px] w-full rounded-full border border-black/5 bg-white px-7 pl-16 text-base text-neutral-950 shadow-[0_16px_40px_rgba(28,25,18,0.06)] outline-none transition-all placeholder:text-neutral-400 focus:border-[#f1c84b] focus:ring-4 focus:ring-[#f1c84b]/20"
                                        placeholder="admin@neem.health"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="ml-8 mr-4 flex items-center justify-between">
                                    <label className="block text-sm font-medium text-neutral-500">Password</label>
                                    <button type="button" onClick={handleForgotPassword} className="text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-950">
                                        Forgot password?
                                    </button>
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-7 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="h-[68px] w-full rounded-full border border-black/5 bg-white px-7 pl-16 pr-16 text-base text-neutral-950 shadow-[0_16px_40px_rgba(28,25,18,0.06)] outline-none transition-all placeholder:text-neutral-400 focus:border-[#f1c84b] focus:ring-4 focus:ring-[#f1c84b]/20"
                                        placeholder="Enter password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        onClick={() => setShowPassword(value => !value)}
                                        className="absolute right-5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-950 focus:outline-none focus:ring-4 focus:ring-[#f1c84b]/20"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-4 px-2">
                                <label htmlFor="keep-logged-in" className="flex cursor-pointer select-none items-center gap-3 text-sm text-neutral-500">
                                    <input
                                        type="checkbox"
                                        id="keep-logged-in"
                                        checked={keepLoggedIn}
                                        onChange={e => setKeepLoggedIn(e.target.checked)}
                                        className="h-4 w-4 rounded border-neutral-300 bg-white text-neutral-950 focus:ring-[#f1c84b]"
                                    />
                                    Keep me logged in
                                </label>
                                <span className="hidden items-center gap-2 rounded-full bg-white/70 px-3 py-2 text-xs font-medium text-neutral-500 shadow-sm sm:inline-flex">
                                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                    Protected access
                                </span>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="flex h-[68px] w-full items-center justify-center gap-2 rounded-full bg-[#fedc58] text-base font-semibold text-neutral-950 shadow-[0_20px_45px_rgba(245,191,38,0.32)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#ffd33e] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
                            >
                                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                                {loading ? 'Signing in...' : 'Access Dashboard'}
                            </button>
                        </form>

                        <div className="mt-6 rounded-[1.75rem] border border-black/5 bg-white/45 px-5 py-4 text-center text-sm leading-6 text-neutral-500 backdrop-blur-xl">
                            Are you a physician?{' '}
                            <span className="font-medium text-neutral-950">Sign in with your credentials</span>{' '}
                            to manage appointments and view your schedule.
                        </div>

                        <div className="mt-10 flex flex-col gap-3 text-xs text-neutral-400 sm:flex-row sm:items-center sm:justify-between">
                            <p>&copy; 2026 Neem Healthcare. All rights reserved.</p>
                            <button type="button" className="text-left underline underline-offset-4 transition-colors hover:text-neutral-950 sm:text-right">
                                Contact IT Support
                            </button>
                        </div>
                    </div>
                </section>

                <section className="relative hidden flex-1 p-4 pl-0 lg:block">
                    <div className="relative h-full min-h-[720px] overflow-hidden rounded-[2rem] bg-neutral-900">
                        <img
                            src={loginArtwork}
                            alt="Neem admin workspace"
                            className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/0 to-black/35" />

                        <div className="absolute left-12 top-10 rounded-[1.5rem] bg-[#fedc58] px-7 py-5 text-neutral-950 shadow-[0_25px_70px_rgba(0,0,0,0.18)]">
                            <div className="flex items-center gap-8">
                                <div>
                                    <p className="text-sm font-semibold">Daily operations</p>
                                    <p className="mt-1 text-xs text-neutral-700">Appointments, products, content</p>
                                </div>
                                <span className="h-3 w-3 rounded-full bg-neutral-900" />
                            </div>
                        </div>

                        <div className="absolute right-12 top-[35%] flex items-end">
                            <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-[#f7f6f0] text-lg font-semibold text-neutral-900 shadow-2xl">
                                MD
                            </div>
                            <div className="-ml-5 flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-[#fedc58] text-sm font-semibold text-neutral-900 shadow-2xl">
                                RN
                            </div>
                            <div className="-ml-4 flex h-12 w-12 items-center justify-center rounded-full border-4 border-white bg-neutral-950 text-xs font-semibold text-white shadow-2xl">
                                AD
                            </div>
                        </div>

                        <div className="absolute bottom-10 left-12 w-[360px] rounded-[1.5rem] bg-white/92 p-6 text-neutral-950 shadow-[0_25px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <p className="text-base font-semibold">Admin pulse</p>
                                    <p className="mt-1 text-sm text-neutral-500">Live care management</p>
                                </div>
                                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f3eedc]">
                                    <Activity className="h-5 w-5 text-neutral-950" />
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="rounded-2xl bg-neutral-100 p-3">
                                    <UsersRound className="mb-3 h-4 w-4 text-neutral-500" />
                                    <p className="text-lg font-semibold">124</p>
                                    <p className="text-xs text-neutral-500">Patients</p>
                                </div>
                                <div className="rounded-2xl bg-neutral-100 p-3">
                                    <CalendarDays className="mb-3 h-4 w-4 text-neutral-500" />
                                    <p className="text-lg font-semibold">18</p>
                                    <p className="text-xs text-neutral-500">Visits</p>
                                </div>
                                <div className="rounded-2xl bg-neutral-950 p-3 text-white">
                                    <ShieldCheck className="mb-3 h-4 w-4 text-[#fedc58]" />
                                    <p className="text-lg font-semibold">99%</p>
                                    <p className="text-xs text-white/60">Secure</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
