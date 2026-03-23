import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProviders, deleteProvider, resetPhysicianPassword, type Provider } from '../../services/api';
import { Plus, Search, Trash2, Edit, KeyRound, UserX, Users, UserCheck, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

const SPECIALTIES = ['All', 'Cardiology', 'Dermatology', 'Endocrinology', 'Psychiatry', 'Nutrition', 'General Practice', 'Pediatrics', 'Neurology'];
const INITIAL_COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500', 'bg-cyan-500'];
const PER_PAGE = 10;

export function AdminProviders() {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [specialtyFilter, setSpecialtyFilter] = useState('All');
    const [loading, setLoading] = useState(true);
    const [resetMsg, setResetMsg] = useState('');
    const [page, setPage] = useState(1);
    const [resetModal, setResetModal] = useState<{ email: string; name: string } | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [resetting, setResetting] = useState(false);
    const navigate = useNavigate();

    const fetchProviders = async () => {
        try {
            const data = await getProviders();
            setProviders(data);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetchProviders(); }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this provider?')) return;
        await deleteProvider(id);
        setProviders(prev => prev.filter(p => p.id !== id));
    };

    const openResetModal = (email: string, name: string) => {
        setResetModal({ email, name });
        setNewPassword('');
    };

    const handleResetSubmit = async () => {
        if (!resetModal) return;
        if (newPassword.length < 6) {
            alert('Password must be at least 6 characters.');
            return;
        }
        setResetting(true);
        try {
            await resetPhysicianPassword(resetModal.email, newPassword);
            setResetMsg(`Password updated for ${resetModal.name}`);
            setTimeout(() => setResetMsg(''), 4000);
            setResetModal(null);
            setNewPassword('');
        } catch (e: any) {
            alert('Error: ' + e.message);
        } finally {
            setResetting(false);
        }
    };

    const filtered = providers.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.email.toLowerCase().includes(search.toLowerCase()) ||
            p.specialty.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'All' || (statusFilter === 'Active' ? p.active : !p.active);
        const matchSpecialty = specialtyFilter === 'All' || p.specialty === specialtyFilter;
        return matchSearch && matchStatus && matchSpecialty;
    });

    const totalPages = Math.ceil(filtered.length / PER_PAGE);
    const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    const activeCount = providers.filter(p => p.active).length;

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
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Providers Management</p>
                    <h1 className="text-2xl font-bold text-slate-900">Providers</h1>
                    <p className="text-slate-400 text-sm mt-0.5">Manage your registered healthcare providers and their accounts</p>
                </div>
                <button
                    onClick={() => navigate('/admin/providers/add')}
                    className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-5 py-2.5 rounded-xl shadow-soft transition-all"
                >
                    <Plus className="w-5 h-5" />
                    Add Provider
                </button>
            </div>

            {resetMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm font-medium animate-fade-in">
                    {resetMsg}
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[240px] max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search providers..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition-all"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-600 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                >
                    <option value="All">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                </select>
                <select
                    value={specialtyFilter}
                    onChange={e => { setSpecialtyFilter(e.target.value); setPage(1); }}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-600 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                >
                    {SPECIALTIES.map(s => (
                        <option key={s} value={s}>{s === 'All' ? 'All Specialties' : s}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100/60 shadow-soft overflow-hidden">
                {filtered.length === 0 ? (
                    <div className="p-16 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                            <UserX className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-slate-500 text-lg font-medium">No providers found</p>
                        <p className="text-slate-400 text-sm mt-1">Try adjusting your search or filters</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/50">
                                        <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-6 py-3.5">Provider</th>
                                        <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-6 py-3.5">Email</th>
                                        <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-6 py-3.5">Specialty</th>
                                        <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-6 py-3.5">Status</th>
                                        <th className="text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-6 py-3.5">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50/80">
                                    {paginated.map((provider, i) => (
                                        <tr key={provider.id} className="hover:bg-slate-50/80 transition-colors group cursor-pointer">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {provider.profileImage ? (
                                                        <img src={provider.profileImage} alt="" className="w-9 h-9 rounded-full object-cover" />
                                                    ) : (
                                                        <div className={`w-9 h-9 rounded-full ${INITIAL_COLORS[i % INITIAL_COLORS.length]} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                                                            {provider.name[0]}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <span className="text-sm font-medium text-slate-800 block">{provider.name}</span>
                                                        {provider.title && <span className="text-xs text-slate-400">{provider.title}</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500 font-medium">{provider.email}</td>
                                            <td className="px-6 py-4 text-sm text-slate-500 font-medium">{provider.specialty}</td>
                                            <td className="px-6 py-4">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 ${provider.active ? 'text-emerald-700' : 'text-slate-500'}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${provider.active ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                                                    <span className="text-[11px] font-semibold tracking-wide">{provider.active ? 'Active' : 'Inactive'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => navigate(`/admin/providers/edit/${provider.id}`)}
                                                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => openResetModal(provider.email, provider.name)}
                                                        className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors"
                                                        title="Reset password"
                                                    >
                                                        <KeyRound className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(provider.id!)}
                                                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between text-sm">
                            <p className="text-slate-400">
                                Showing {((page - 1) * PER_PAGE) + 1} to {Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} providers
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
                    </>
                )}
            </div>

            {/* Bottom Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-slate-100/60 shadow-soft p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-xl font-bold text-slate-900 leading-tight">{providers.length}</p>
                        <p className="text-[11px] font-semibold text-slate-400 tracking-wide uppercase">Total Providers</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100/60 shadow-soft p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                        <UserCheck className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-xl font-bold text-slate-900 leading-tight">{activeCount}</p>
                        <p className="text-[11px] font-semibold text-slate-400 tracking-wide uppercase">Active Now</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100/60 shadow-soft p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-xl font-bold text-slate-900 leading-tight">{providers.length - activeCount}</p>
                        <p className="text-[11px] font-semibold text-slate-400 tracking-wide uppercase">Inactive</p>
                    </div>
                </div>
            </div>

            {/* Reset Password Modal */}
            {resetModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-1">Reset Password</h3>
                        <p className="text-sm text-slate-400 mb-5">
                            Set a new password for <span className="font-medium text-slate-600">{resetModal.name}</span> ({resetModal.email})
                        </p>
                        <div className="mb-5">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">New Password</label>
                            <input
                                type="text"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                placeholder="Enter new password (min 6 characters)"
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition-all"
                                autoFocus
                            />
                        </div>
                        <div className="flex items-center gap-3 justify-end">
                            <button
                                onClick={() => setResetModal(null)}
                                className="px-5 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleResetSubmit}
                                disabled={resetting || newPassword.length < 6}
                                className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50"
                            >
                                {resetting ? 'Updating...' : 'Update Password'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
