import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBlogs, deleteBlog, type BlogPost } from '../../services/api';
import { Plus, Edit3, Trash2, Search, FileText, Loader2, MoreHorizontal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

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

    const publishedCount = blogs.filter(b => b.status === 'published').length;

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
                    <h1 className="text-3xl font-bold tracking-tight">Blog Posts</h1>
                    <p className="text-muted-foreground mt-1">Manage your blog articles and content.</p>
                </div>
                <Button onClick={() => navigate('/admin/blogs/add')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Blog
                </Button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Posts</CardTitle>
                        <FileText className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{blogs.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Published</CardTitle>
                        <FileText className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{publishedCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Drafts</CardTitle>
                        <FileText className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{blogs.length - publishedCount}</div>
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
                                placeholder="Search blogs..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-9 h-9"
                            />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            {(['all', 'published', 'draft'] as const).map(s => (
                                <Button
                                    key={s}
                                    variant={statusFilter === s ? "default" : "outline"}
                                    onClick={() => setStatusFilter(s)}
                                    className="capitalize h-9"
                                >
                                    {s}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="pl-6 h-10 w-[400px]">Title</TableHead>
                                <TableHead className="h-10">Category</TableHead>
                                <TableHead className="h-10">Status</TableHead>
                                <TableHead className="h-10">Date</TableHead>
                                <TableHead className="h-10 text-right pr-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center border-b-0">
                                        <div className="flex flex-col items-center justify-center">
                                            <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                                            <span className="text-muted-foreground font-medium">No blog posts found.</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map(blog => (
                                    <TableRow key={blog.id}>
                                        <TableCell className="pl-6">
                                            <div className="flex items-center gap-3">
                                                {blog.coverImage ? (
                                                    <img src={blog.coverImage} alt="" className="w-12 h-12 rounded-md object-cover flex-shrink-0 border" />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center flex-shrink-0 border">
                                                        <FileText className="w-5 h-5 text-muted-foreground" />
                                                    </div>
                                                )}
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm font-medium leading-none truncate">{blog.title}</span>
                                                    <span className="text-xs text-muted-foreground mt-1 truncate max-w-[250px]">{blog.description}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="font-medium">
                                                {blog.category}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={blog.status === 'published' ? "default" : "secondary"}>
                                                {blog.status === 'published' ? 'Published' : 'Draft'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {formatDate(blog.createdAt)}
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-8 w-8 outline-none">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => navigate(`/admin/blogs/edit/${blog.id}`)}>
                                                        <Edit3 className="h-4 w-4 mr-2" /> Edit Blog
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-destructive focus:bg-destructive/10 cursor-pointer" onClick={() => handleDelete(blog.id!, blog.title)}>
                                                        <Trash2 className="h-4 w-4 mr-2" /> Delete Blog
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
            </Card>
        </div>
    );
}
