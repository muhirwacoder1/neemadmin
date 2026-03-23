import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBlogs, deleteBlog, type BlogPost } from '../../services/api';
import { Plus, Edit3, Trash2, Search, FileText, Loader2 } from 'lucide-react';

export function AdminBlogs() {
    const navigate = useNavigate();
    const [blogs, setBlogs] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

    const fetchBlogs = async () => {
        setLoading(true);
        try {
            const data = await getBlogs();
            setBlogs(data);
        } catch (e) {
            console.error('Error fetching blogs:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchBlogs(); }, []);

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
        try {
            await deleteBlog(id);
            setBlogs(prev => prev.filter(b => b.id !== id));
        } catch (e: any) {
            alert('Delete failed: ' + e.message);
        }
    };

    const filtered = blogs.filter(b => {
        const matchSearch = search.trim() === '' ||
            b.title.toLowerCase().includes(search.toLowerCase()) ||
            b.category.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'all' || b.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const formatDate = (ts: any) => {
        if (!ts) return '—';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Blog Posts</h1>
                    <p className="text-slate-500 mt-0.5">Manage your blog articles and content</p>
                </div>
                <button
                    onClick={() => navigate('/admin/blogs/add')}
                    className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-5 py-2.5 rounded-xl shadow-soft transition-all"
                >
                    <Plus className="w-5 h-5" />
                    Add Blog
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-6 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search blogs..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                        />
                    </div>
                    <div className="flex gap-2">
                        {(['all', 'published', 'draft'] as const).map(s => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                                    statusFilter === s
                                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                }`}
                            >
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100/60 shadow-soft overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center py-20 text-slate-400">
                        <FileText className="w-12 h-12 mb-3 opacity-40" />
                        <p className="text-sm">No blog posts found</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                <th className="text-left px-6 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Title</th>
                                <th className="text-left px-6 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Category</th>
                                <th className="text-left px-6 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Status</th>
                                <th className="text-left px-6 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Date</th>
                                <th className="text-right px-6 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(blog => (
                                <tr key={blog.id} className="border-b border-slate-50/50 hover:bg-slate-50/80 transition-colors group cursor-pointer">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {blog.coverImage ? (
                                                <img src={blog.coverImage} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                                    <FileText className="w-5 h-5 text-slate-400" />
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="font-semibold text-slate-900 truncate">{blog.title}</p>
                                                <p className="text-xs text-slate-400 truncate max-w-xs">{blog.description}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-block px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase rounded-full bg-slate-100 border border-slate-200 text-slate-600">{blog.category}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 ${blog.status === 'published' ? 'text-emerald-700' : 'text-amber-700'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${blog.status === 'published' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                            <span className="text-[11px] font-semibold tracking-wide uppercase">{blog.status === 'published' ? 'Published' : 'Draft'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 font-medium">{formatDate(blog.createdAt)}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => navigate(`/admin/blogs/edit/${blog.id}`)}
                                                className="p-2 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                                title="Edit"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(blog.id!, blog.title)}
                                                className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
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
                )}
            </div>
        </div>
    );
}
