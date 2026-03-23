import { useEffect, useState } from 'react';
import { getDashboardStats, getAppointments, type Appointment } from '../../services/api';
import { CalendarCheck, Clock, CheckCircle2, TrendingUp, TrendingDown, MoreHorizontal } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const TREND_DATA = [
    { name: 'Mon', appointments: 12 },
    { name: 'Tue', appointments: 19 },
    { name: 'Wed', appointments: 15 },
    { name: 'Thu', appointments: 22 },
    { name: 'Fri', appointments: 18 },
    { name: 'Sat', appointments: 8 },
    { name: 'Sun', appointments: 5 },
];

const DEMOGRAPHICS = [
    { name: 'Male', value: 58, color: '#2563EB' },
    { name: 'Female', value: 42, color: '#60A5FA' },
];

export function AdminDashboard() {
    const [stats, setStats] = useState({
        totalProviders: 0, totalAppointments: 0,
        pendingAppointments: 0, approvedAppointments: 0, deniedAppointments: 0,
    });
    const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const [s, a] = await Promise.all([getDashboardStats(), getAppointments()]);
                setStats(s);
                setRecentAppointments(a.slice(0, 8));
            } catch (e) { console.error(e); }
            setLoading(false);
        })();
    }, []);

    const statCards = [
        {
            label: 'Total Appointments', value: stats.totalAppointments,
            icon: CalendarCheck, iconBg: 'bg-blue-100', text: 'text-blue-600',
            change: '+12.5%', positive: true,
        },
        {
            label: 'Pending Requests', value: stats.pendingAppointments,
            icon: Clock, iconBg: 'bg-amber-100', text: 'text-amber-600',
            change: '+3.2%', positive: true,
        },
        {
            label: 'Approved Cases', value: stats.approvedAppointments,
            icon: CheckCircle2, iconBg: 'bg-emerald-100', text: 'text-emerald-600',
            change: '+8.1%', positive: true,
        },
    ];

    const statusBadge = (status: string) => {
        const map: Record<string, { dot: string; text: string; label: string }> = {
            pending: { dot: 'bg-amber-400', text: 'text-amber-700', label: 'Pending' },
            approved: { dot: 'bg-emerald-400', text: 'text-emerald-700', label: 'Confirmed' },
            denied: { dot: 'bg-red-400', text: 'text-red-700', label: 'Cancelled' },
        };
        const s = map[status] || map.pending;
        return (
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 ${s.text}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                <span className="text-[11px] font-semibold tracking-wide">{s.label}</span>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="w-8 h-8 border-[3px] border-blue-100 border-t-blue-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                <p className="text-slate-400 text-sm mt-0.5">Welcome back. Here's your healthcare overview.</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {statCards.map((card, i) => (
                    <div key={i} className="bg-white rounded-2xl p-6 shadow-soft border border-slate-100/60 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-100 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex items-center justify-between mb-4">
                            <div className={`w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center`}>
                                <card.icon className={`w-5 h-5 ${card.text}`} />
                            </div>
                            <div className={`flex items-center gap-1 text-[11px] font-semibold bg-slate-50 px-2 py-1 rounded-md ${card.positive ? 'text-emerald-600' : 'text-red-500'}`}>
                                {card.positive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                {card.change}
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-slate-900 tracking-tight">{card.value}</p>
                        <p className="text-sm text-slate-400 mt-1">{card.label}</p>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0">
                {/* Appointment Trends */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-soft border border-slate-100/60 p-6 min-w-0">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-base font-semibold text-slate-900">Appointment Trends</h2>
                            <p className="text-xs text-slate-400 mt-0.5">Weekly appointment activity</p>
                        </div>
                        <select className="text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-1.5 outline-none transition-colors shadow-sm">
                            <option>Last 7 Days</option>
                            <option>Last 30 Days</option>
                            <option>Last 90 Days</option>
                        </select>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={TREND_DATA}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#F8FAFC" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} dy={10} />
                                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} dx={-10} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '12px', fontWeight: 500 }}
                                    cursor={{ stroke: '#F1F5F9', strokeWidth: 2 }}
                                />
                                <Line type="monotone" dataKey="appointments" stroke="#2563EB" strokeWidth={3} dot={{ fill: '#FFFFFF', stroke: '#2563EB', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Patient Demographics */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6">
                    <div className="mb-4">
                        <h2 className="text-base font-semibold text-slate-900">Patient Demographics</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Gender distribution</p>
                    </div>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={DEMOGRAPHICS}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={80}
                                    paddingAngle={4}
                                    dataKey="value"
                                >
                                    {DEMOGRAPHICS.map((entry, index) => (
                                        <Cell key={index} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '12px', fontWeight: 500 }}
                                    formatter={(value) => `${value}%`}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-6 mt-2">
                        {DEMOGRAPHICS.map(d => (
                            <div key={d.name} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                                <span className="text-xs text-slate-500">{d.name} <span className="font-semibold text-slate-700">{d.value}%</span></span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl shadow-soft border border-slate-100/60 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
                    <div>
                        <h2 className="text-base font-semibold text-slate-900">Recent Activity</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Latest appointment updates</p>
                    </div>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-full">
                        {recentAppointments.length} shown
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-6 py-3.5">Patient</th>
                                <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-6 py-3.5">Provider</th>
                                <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-6 py-3.5">Status</th>
                                <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-6 py-3.5">Date</th>
                                <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-6 py-3.5">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50/80">
                            {recentAppointments.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center">
                                        <CalendarCheck className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                                        <p className="text-slate-500 text-sm font-medium">No recent activity</p>
                                    </td>
                                </tr>
                            ) : (
                                recentAppointments.map(apt => (
                                    <tr key={apt.id} className="hover:bg-slate-50/80 transition-colors group cursor-pointer">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold shrink-0">
                                                    {apt.patientName?.[0] || '?'}
                                                </div>
                                                <span className="text-[13px] font-semibold text-slate-900">{apt.patientName}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-[13px] text-slate-500">{apt.providerName}</td>
                                        <td className="px-6 py-4">{statusBadge(apt.status)}</td>
                                        <td className="px-6 py-4 text-[13px] text-slate-500">{apt.date}</td>
                                        <td className="px-6 py-4">
                                            <button className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors opacity-0 group-hover:opacity-100">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
