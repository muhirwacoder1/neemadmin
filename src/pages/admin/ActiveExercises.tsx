import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    deleteActiveExercise,
    getActiveExercises,
    updateActiveExercise,
    type ActiveExercise,
} from '../../services/api';
import { Activity, Edit3, MoreHorizontal, Pin, Plus, Search, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function formatDate(value: any) {
    if (!value) return '-';
    const date = value.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function sortExercises(items: ActiveExercise[]) {
    return [...items].sort((a, b) => {
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        return (a.displayOrder ?? 9999) - (b.displayOrder ?? 9999);
    });
}

export function AdminActiveExercises() {
    const navigate = useNavigate();
    const [exercises, setExercises] = useState<ActiveExercise[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

    const fetchExercises = async () => {
        setLoading(true);
        try {
            const data = await getActiveExercises();
            setExercises(sortExercises(data));
        } catch (error) {
            console.error('Error fetching active exercises:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchExercises(); }, []);

    const filtered = useMemo(() => {
        return sortExercises(exercises).filter(item => {
            const query = search.toLowerCase();
            const matchSearch =
                search.trim() === '' ||
                item.title.toLowerCase().includes(query) ||
                item.category.toLowerCase().includes(query);
            const matchStatus = statusFilter === 'all' || item.status === statusFilter;
            return matchSearch && matchStatus;
        });
    }, [exercises, search, statusFilter]);

    const publishedCount = exercises.filter(item => item.status === 'published').length;
    const featuredCount = exercises.filter(item => item.featured).length;

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
        try {
            await deleteActiveExercise(id);
            setExercises(prev => prev.filter(item => item.id !== id));
        } catch (error: any) {
            alert('Delete failed: ' + (error.message || 'Unknown error'));
        }
    };

    const handleToggleFeatured = async (item: ActiveExercise) => {
        if (!item.id) return;
        const featured = !item.featured;
        setExercises(prev => prev.map(row => row.id === item.id ? { ...row, featured } : row));
        try {
            await updateActiveExercise(item.id, { featured });
        } catch (error: any) {
            alert('Could not update featured state: ' + (error.message || 'Unknown error'));
            fetchExercises();
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="w-8 h-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Be Active</h1>
                    <p className="text-muted-foreground mt-1">Manage exercise videos and instructions for the mobile Be Active feed.</p>
                </div>
                <Button onClick={() => navigate('/admin/active/add')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Exercise
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Exercises</CardTitle>
                        <Activity className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{exercises.length}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Published</CardTitle>
                        <Activity className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{publishedCount}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Featured</CardTitle>
                        <Pin className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{featuredCount}</div></CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="pb-4 border-b border-border/50">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="relative flex-1 lg:max-w-md">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search exercises..."
                                value={search}
                                onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
                                className="pl-9 h-9"
                            />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            {(['all', 'published', 'draft'] as const).map(status => (
                                <Button
                                    key={status}
                                    variant={statusFilter === status ? 'default' : 'outline'}
                                    onClick={() => setStatusFilter(status)}
                                    className="capitalize h-9"
                                >
                                    {status}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="pl-6 h-10 w-[360px]">Exercise</TableHead>
                                <TableHead className="h-10">Category</TableHead>
                                <TableHead className="h-10">Duration</TableHead>
                                <TableHead className="h-10">Status</TableHead>
                                <TableHead className="h-10">Publish Date</TableHead>
                                <TableHead className="h-10">Featured</TableHead>
                                <TableHead className="h-10 text-right pr-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center border-b-0">
                                        <div className="flex flex-col items-center justify-center">
                                            <Activity className="h-8 w-8 text-muted-foreground mb-2" />
                                            <span className="text-muted-foreground font-medium">No exercises found.</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell className="pl-6">
                                            <div className="flex items-center gap-3">
                                                {item.thumbnailImage ? (
                                                    <img src={item.thumbnailImage} alt="" className="w-16 h-11 rounded-md object-cover border flex-shrink-0" />
                                                ) : (
                                                    <div className="w-16 h-11 rounded-md bg-muted border flex items-center justify-center flex-shrink-0">
                                                        <Activity className="w-5 h-5 text-muted-foreground" />
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium truncate">{item.title}</p>
                                                    <p className="text-xs text-muted-foreground truncate">{item.videoSource === 'youtube' ? 'YouTube' : 'Uploaded video'}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell><Badge variant="secondary">{item.category}</Badge></TableCell>
                                        <TableCell className="text-muted-foreground">{item.duration || '-'}</TableCell>
                                        <TableCell>
                                            <Badge variant={item.status === 'published' ? 'default' : 'secondary'}>
                                                {item.status === 'published' ? 'Published' : 'Draft'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{formatDate(item.publishDate || item.createdAt)}</TableCell>
                                        <TableCell>
                                            <Button variant={item.featured ? 'default' : 'outline'} size="sm" onClick={() => handleToggleFeatured(item)} className="h-8">
                                                <Pin className="h-3.5 w-3.5 mr-1.5" />
                                                {item.featured ? 'Pinned' : 'Pin'}
                                            </Button>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md hover:bg-accent h-8 w-8 outline-none">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => navigate(`/admin/active/edit/${item.id}`)}>
                                                        <Edit3 className="h-4 w-4 mr-2" /> Edit Exercise
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:bg-destructive/10 cursor-pointer"
                                                        onClick={() => handleDelete(item.id!, item.title)}
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" /> Delete Exercise
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
