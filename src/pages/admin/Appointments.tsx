import { useEffect, useState } from 'react';
import { getAppointments, updateAppointmentStatus, type Appointment } from '../../services/api';
import { Search, CheckCircle2, XCircle, Clock, Filter, CalendarCheck, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';

const PER_PAGE = 10;

export function AdminAppointments() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [sortOrder, setSortOrder] = useState('newest');
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);

    const fetchData = async () => {
        try {
            const data = await getAppointments({ status: filter });
            setAppointments(data);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, [filter]);

    const handleStatusChange = async (id: string, status: 'approved' | 'denied') => {
        await updateAppointmentStatus(id, status);
        setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    };

    const filtered = appointments
        .filter(a =>
            a.patientName.toLowerCase().includes(search.toLowerCase()) ||
            a.providerName.toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => {
            if (sortOrder === 'newest') return (b.date || '').localeCompare(a.date || '');
            return (a.date || '').localeCompare(b.date || '');
        });

    const totalPages = Math.ceil(filtered.length / PER_PAGE);
    const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    const counts = {
        total: appointments.length,
        approved: appointments.filter(a => a.status === 'approved').length,
        pending: appointments.filter(a => a.status === 'pending').length,
        denied: appointments.filter(a => a.status === 'denied').length,
    };

    const statusBadge = (status: string) => {
        const map: Record<string, { dot: string; text: string; label: string }> = {
            pending: { dot: 'bg-amber-400', text: 'text-amber-700', label: 'Pending' },
            approved: { dot: 'bg-emerald-400', text: 'text-emerald-700', label: 'Approved' },
            denied: { dot: 'bg-red-400', text: 'text-red-700', label: 'Denied' },
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
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Appointment Management</p>
                <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
                <p className="text-slate-400 text-sm mt-0.5">Manage all appointment bookings and requests</p>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input
                        type="text"
                        placeholder="Search by patient or provider..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                    />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {['all', 'pending', 'approved', 'denied'].map(s => (
                        <button
                            key={s}
                            onClick={() => { setFilter(s); setPage(1); }}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === s
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                                : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-700'
                            }`}
                        >
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>
                <select
                    value={sortOrder}
                    onChange={e => setSortOrder(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-600 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 ml-auto"
                >
                    <option value="newest">Sort by: Date (Newest)</option>
                    <option value="oldest">Sort by: Date (Oldest)</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100/60 shadow-soft overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-6 py-3.5">Patient</th>
                                <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-6 py-3.5">Provider</th>
                                <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-6 py-3.5">Date & Time</th>
                                <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-6 py-3.5">Description</th>
                                <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-6 py-3.5">Status</th>
                                <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-6 py-3.5">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50/80">
                            {paginated.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center">
                                        <Filter className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                                        <p className="text-slate-500 text-sm font-medium">No appointments found</p>
                                    </td>
                                </tr>
                            ) : (
                                paginated.map(apt => (
                                    <tr key={apt.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 text-sm font-bold shrink-0">
                                                    {apt.patientName?.[0] || '?'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-800">{apt.patientName}</p>
                                                    <p className="text-xs text-slate-400">{apt.patientEmail}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3.5 text-sm text-slate-500">{apt.providerName}</td>
                                        <td className="px-6 py-3.5">
                                            <p className="text-sm text-slate-800">{apt.date}</p>
                                            <p className="text-xs text-slate-400">{apt.time}</p>
                                        </td>
                                        <td className="px-6 py-3.5 text-sm text-slate-500 max-w-xs truncate">{apt.description}</td>
                                        <td className="px-6 py-3.5">{statusBadge(apt.status)}</td>
                                        <td className="px-6 py-3.5">
                                            {apt.status === 'pending' && (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleStatusChange(apt.id!, 'approved')}
                                                        className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                                        title="Approve"
                                                    >
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusChange(apt.id!, 'denied')}
                                                        className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                                                        title="Deny"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {filtered.length > PER_PAGE && (
                    <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between text-sm">
                        <p className="text-slate-400">
                            Showing {((page - 1) * PER_PAGE) + 1} to {Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} appointments
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 disabled:opacity-30 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                                <button
                                    key={n}
                                    onClick={() => setPage(n)}
                                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                                        n === page ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                                    }`}
                                >
                                    {n}
                                </button>
                            ))}
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 disabled:opacity-30 transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-slate-100/60 shadow-soft p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                        <CalendarCheck className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-xl font-bold text-slate-900 leading-tight">{counts.total}</p>
                        <p className="text-[11px] font-semibold text-slate-400 tracking-wide uppercase">All</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100/60 shadow-soft p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-xl font-bold text-slate-900 leading-tight">{counts.approved}</p>
                        <p className="text-[11px] font-semibold text-slate-400 tracking-wide uppercase">Confirmed</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100/60 shadow-soft p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-xl font-bold text-slate-900 leading-tight">{counts.pending}</p>
                        <p className="text-[11px] font-semibold text-slate-400 tracking-wide uppercase">Pending</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100/60 shadow-soft p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                        <XCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                        <p className="text-xl font-bold text-slate-900 leading-tight">{counts.denied}</p>
                        <p className="text-[11px] font-semibold text-slate-400 tracking-wide uppercase">Cancelled</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
