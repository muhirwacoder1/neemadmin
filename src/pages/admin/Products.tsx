import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProducts, deleteProduct, type Product } from '../../services/api';
import { Plus, Search, Pencil, Trash2, Package, Loader2 } from 'lucide-react';

const PER_PAGE = 10;

export function AdminProducts() {
    const [products, setProducts] = useState<Product[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const navigate = useNavigate();

    useEffect(() => {
        getProducts().then(p => { setProducts(p); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete product "${name}"? This cannot be undone.`)) return;
        try {
            await deleteProduct(id);
            setProducts(prev => prev.filter(p => p.id !== id));
        } catch (e: any) {
            alert('Error: ' + e.message);
        }
    };

    const filtered = products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'All' || (statusFilter === 'Active' ? p.active : !p.active);
        return matchSearch && matchStatus;
    });

    const totalPages = Math.ceil(filtered.length / PER_PAGE);
    const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    const activeCount = products.filter(p => p.active).length;

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
                    <p className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-1">Store Management</p>
                    <h1 className="text-2xl font-bold text-slate-900">Products</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Manage your marketplace product catalog</p>
                </div>
                <button
                    onClick={() => navigate('/admin/products/add')}
                    className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-5 py-2.5 rounded-xl shadow-soft transition-all"
                >
                    <Plus className="w-5 h-5" /> Add Product
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Search products..."
                        className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                    />
                </div>
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
                                <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-6 py-3.5">Product</th>
                                <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3.5">Price</th>
                                <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3.5">Features</th>
                                <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3.5">Status</th>
                                <th className="text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-6 py-3.5">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center">
                                        <Package className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                                        <p className="text-slate-400">No products found</p>
                                    </td>
                                </tr>
                            ) : paginated.map(product => (
                                <tr key={product.id} className="border-b border-slate-50/50 last:border-0 hover:bg-slate-50/80 transition-colors group cursor-pointer">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {product.images?.[0] ? (
                                                <img src={product.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                                                    <Package className="w-5 h-5 text-slate-400" />
                                                </div>
                                            )}
                                            <span className="font-semibold text-slate-900">{product.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-slate-600 font-medium">{product.priceFormatted}</td>
                                    <td className="px-4 py-4">
                                        <div className="flex flex-wrap gap-1.5">
                                            {product.badges?.slice(0, 3).map(b => (
                                                <span key={b.id} className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-semibold tracking-wide uppercase">
                                                    {b.type === 'gf' ? 'GF' : b.type === 'vegan' ? 'Vegan' : b.type === 'organic' ? 'Organic' : b.type}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 ${product.active ? 'text-emerald-700' : 'text-slate-500'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${product.active ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                                            <span className="text-[11px] font-semibold tracking-wide">{product.active ? 'Active' : 'Inactive'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => navigate(`/admin/products/edit/${product.id}`)}
                                                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
                                                title="Edit"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(product.id!, product.name)}
                                                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
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
                    { label: 'Total Products', value: products.length, color: 'text-blue-600', icon: Package },
                    { label: 'Active', value: activeCount, color: 'text-emerald-600', icon: Package },
                    { label: 'Inactive', value: products.length - activeCount, color: 'text-slate-500', icon: Package },
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
