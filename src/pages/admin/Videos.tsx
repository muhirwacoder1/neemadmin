import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVideos, deleteVideo, type Video } from '../../services/api';
import { Plus, Search, Pencil, Trash2, Film, Loader2, Youtube, Cloud } from 'lucide-react';

const PER_PAGE = 10;

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
    General: { bg: 'bg-blue-50', text: 'text-blue-700' },
    Nutrition: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
    Sports: { bg: 'bg-purple-50', text: 'text-purple-700' },
    Wellness: { bg: 'bg-pink-50', text: 'text-pink-700' },
};

export function AdminVideos() {
    const [videos, setVideos] = useState<Video[]>([]);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const navigate = useNavigate();

    useEffect(() => {
        getVideos().then(v => { setVideos(v); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`Delete video "${title}"? This cannot be undone.`)) return;
        try {
            await deleteVideo(id);
            setVideos(prev => prev.filter(v => v.id !== id));
        } catch (e: any) {
            alert('Error: ' + e.message);
        }
    };

    const filtered = videos.filter(v => {
        const matchSearch = v.title.toLowerCase().includes(search.toLowerCase());
        const matchCategory = categoryFilter === 'All' || v.category === categoryFilter;
        const matchStatus = statusFilter === 'All' || (statusFilter === 'Active' ? v.active : !v.active);
        return matchSearch && matchCategory && matchStatus;
    });

    const totalPages = Math.ceil(filtered.length / PER_PAGE);
    const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    const activeCount = videos.filter(v => v.active).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-1">Content Management</p>
                    <h1 className="text-2xl font-bold text-slate-900">Videos</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Manage educational video content</p>
                </div>
                <button
                    onClick={() => navigate('/admin/videos/add')}
                    className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-5 py-2.5 rounded-xl shadow-soft transition-all"
                >
                    <Plus className="w-5 h-5" /> Add Video
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Search videos..."
                        className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                    />
                </div>
                <select
                    value={categoryFilter}
                    onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
                    className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-400"
                >
                    <option value="All">All Categories</option>
                    <option value="General">General</option>
                    <option value="Nutrition">Nutrition</option>
                    <option value="Sports">Sports</option>
                    <option value="Wellness">Wellness</option>
                </select>
                <select
                    value={statusFilter}
                    onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                    className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-400"
                >
                    <option>All</option>
                    <option>Active</option>
                    <option>Inactive</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100/60 shadow-soft overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-6 py-3.5">Video</th>
                                <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3.5">Category</th>
                                <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3.5">Source</th>
                                <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3.5">Duration</th>
                                <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3.5">Status</th>
                                <th className="text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-6 py-3.5">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center">
                                        <Film className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                                        <p className="text-slate-400">No videos found</p>
                                    </td>
                                </tr>
                                ) : paginated.map(video => {
                                    const catColor = CATEGORY_COLORS[video.category] || CATEGORY_COLORS.General;
                                    return (
                                        <tr key={video.id} className="border-b border-slate-50/50 last:border-0 hover:bg-slate-50/80 transition-colors group cursor-pointer">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {video.thumbnail ? (
                                                        <img src={video.thumbnail} alt="" className="w-16 h-10 rounded-lg object-cover" />
                                                    ) : (
                                                        <div className="w-16 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                                                            <Film className="w-5 h-5 text-slate-400" />
                                                        </div>
                                                    )}
                                                    <span className="font-semibold text-slate-900 line-clamp-1">{video.title}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase ${catColor.bg} ${catColor.text}`}>
                                                    {video.category}
                                                </span>
                                            </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-1.5 text-slate-500">
                                                {video.videoSource === 'youtube' ? (
                                                    <><Youtube className="w-4 h-4 text-red-500" /><span className="text-xs">YouTube</span></>
                                                ) : (
                                                    <><Cloud className="w-4 h-4 text-blue-500" /><span className="text-xs">Cloudinary</span></>
                                                )}
                                            </div>
                                        </td>
                                            <td className="px-4 py-4 text-slate-600 font-medium">{video.duration}</td>
                                            <td className="px-4 py-4">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 ${video.active ? 'text-emerald-700' : 'text-slate-500'}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${video.active ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                                                    <span className="text-[11px] font-semibold tracking-wide">{video.active ? 'Active' : 'Inactive'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => navigate(`/admin/videos/edit/${video.id}`)}
                                                        className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(video.id!, video.title)}
                                                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 text-sm">
                        <p className="text-slate-400">
                            Showing {(page - 1) * PER_PAGE + 1} to {Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
                        </p>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setPage(i + 1)}
                                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${page === i + 1 ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Videos', value: videos.length, color: 'text-blue-600', icon: Film },
                    { label: 'Active', value: activeCount, color: 'text-emerald-600', icon: Film },
                    { label: 'Inactive', value: videos.length - activeCount, color: 'text-slate-500', icon: Film },
                ].map(stat => (
                    <div key={stat.label} className="bg-white rounded-2xl border border-slate-100/60 shadow-soft p-5 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                            <stat.icon className={`w-5 h-5 ${stat.color}`} />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-slate-900 leading-tight">{stat.value}</p>
                            <p className="text-[11px] font-semibold text-slate-400 tracking-wide uppercase">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
