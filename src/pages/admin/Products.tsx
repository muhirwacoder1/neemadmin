import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProducts, deleteProduct, type Product } from '../../services/api';
import { Plus, Search, Pencil, Trash2, Package, Loader2, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

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
                <div className="w-8 h-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Products</h1>
                    <p className="text-muted-foreground mt-1">Manage your marketplace product catalog.</p>
                </div>
                <Button onClick={() => navigate('/admin/products/add')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Product
                </Button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Products</CardTitle>
                        <Package className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{products.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
                        <Package className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Inactive</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{products.length - activeCount}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Table Card */}
            <Card>
                <CardHeader className="pb-4 border-b border-border/50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="relative flex-1 sm:max-w-md">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search products..."
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }}
                                className="pl-9 h-9"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={val => { val && setStatusFilter(val); setPage(1); }}>
                            <SelectTrigger className="w-full sm:w-[140px] h-9">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Status</SelectItem>
                                <SelectItem value="Active">Active</SelectItem>
                                <SelectItem value="Inactive">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="pl-6 h-10 w-[350px]">Product</TableHead>
                                <TableHead className="h-10 text-right pr-4">Price</TableHead>
                                <TableHead className="h-10">Features</TableHead>
                                <TableHead className="h-10">Status</TableHead>
                                <TableHead className="h-10">Stock</TableHead>
                                <TableHead className="h-10 text-right pr-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginated.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center border-b-0">
                                        <div className="flex flex-col items-center justify-center">
                                            <Package className="h-8 w-8 text-muted-foreground mb-2" />
                                            <span className="text-muted-foreground font-medium">No products found.</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginated.map((product) => (
                                    <TableRow key={product.id}>
                                        <TableCell className="pl-6">
                                            <div className="flex items-center gap-3">
                                                {product.images?.[0] ? (
                                                    <img src={product.images[0]} alt="" className="w-10 h-10 rounded-md object-cover flex-shrink-0 border" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0 border">
                                                        <Package className="w-5 h-5 text-muted-foreground" />
                                                    </div>
                                                )}
                                                <span className="text-sm font-medium line-clamp-2">{product.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-4 font-medium text-muted-foreground">
                                            {product.priceFormatted}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {product.badges?.slice(0, 3).map(b => (
                                                    <Badge key={b.id} variant="secondary" className="text-[10px] uppercase font-semibold">
                                                        {b.type === 'gf' ? 'GF' : b.type === 'vegan' ? 'Vegan' : b.type === 'organic' ? 'Organic' : b.type}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={product.active ? "default" : "secondary"}>
                                                {product.active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={product.inStock === false ? "secondary" : "default"}>
                                                {product.inStock === false ? 'Out of stock' : 'In stock'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-8 w-8 outline-none">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => navigate(`/admin/products/edit/${product.id}`)}>
                                                        <Pencil className="h-4 w-4 mr-2" /> Edit Product
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-destructive focus:bg-destructive/10 cursor-pointer" onClick={() => handleDelete(product.id!, product.name)}>
                                                        <Trash2 className="h-4 w-4 mr-2" /> Delete Product
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
                {filtered.length > PER_PAGE && (
                    <div className="flex items-center justify-end gap-2 p-4 border-t border-border/50 bg-muted/20">
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                        </Button>
                        <div className="text-sm font-medium text-muted-foreground px-2">
                            Page {page} of {totalPages}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                            Next <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    );
}
