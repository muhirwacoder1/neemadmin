import { useEffect, useMemo, useState, type ChangeEvent, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    deleteLearningMaterial,
    getLearningMaterials,
    reorderLearningMaterials,
    updateLearningMaterial,
    type LearningMaterial,
} from '../../services/api';
import {
    BookOpen,
    Edit3,
    GripVertical,
    MoreHorizontal,
    Package,
    Pin,
    Plus,
    Search,
    Trash2,
} from 'lucide-react';
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

function sortMaterials(items: LearningMaterial[]) {
    return [...items].sort((a, b) => {
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        return (a.displayOrder ?? 9999) - (b.displayOrder ?? 9999);
    });
}

export function AdminLearningMaterials() {
    const navigate = useNavigate();
    const [materials, setMaterials] = useState<LearningMaterial[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
    const [draggedId, setDraggedId] = useState<string | null>(null);

    const fetchMaterials = async () => {
        setLoading(true);
        try {
            const data = await getLearningMaterials();
            setMaterials(sortMaterials(data));
        } catch (error) {
            console.error('Error fetching learning materials:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMaterials(); }, []);

    const canReorder = search.trim() === '' && statusFilter === 'all';

    const filtered = useMemo(() => {
        return sortMaterials(materials).filter(item => {
            const query = search.toLowerCase();
            const matchSearch =
                search.trim() === '' ||
                item.title.toLowerCase().includes(query) ||
                item.category.toLowerCase().includes(query);
            const matchStatus = statusFilter === 'all' || item.status === statusFilter;
            return matchSearch && matchStatus;
        });
    }, [materials, search, statusFilter]);

    const publishedCount = materials.filter(item => item.status === 'published').length;
    const featuredCount = materials.filter(item => item.featured).length;
    const recipeCount = materials.filter(item => item.contentType === 'recipe' || item.category === 'Recipes').length;

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
        try {
            await deleteLearningMaterial(id);
            setMaterials(prev => prev.filter(item => item.id !== id));
        } catch (error: any) {
            alert('Delete failed: ' + (error.message || 'Unknown error'));
        }
    };

    const handleToggleFeatured = async (item: LearningMaterial) => {
        if (!item.id) return;
        const nextFeatured = !item.featured;
        setMaterials(prev => prev.map(row => row.id === item.id ? { ...row, featured: nextFeatured } : row));
        try {
            await updateLearningMaterial(item.id, { featured: nextFeatured });
        } catch (error: any) {
            alert('Could not update featured state: ' + (error.message || 'Unknown error'));
            fetchMaterials();
        }
    };

    const handleDrop = async (targetId: string) => {
        if (!canReorder || !draggedId || draggedId === targetId) {
            setDraggedId(null);
            return;
        }

        const ordered = sortMaterials(materials);
        const from = ordered.findIndex(item => item.id === draggedId);
        const to = ordered.findIndex(item => item.id === targetId);
        if (from < 0 || to < 0) return;

        const next = [...ordered];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        const reindexed = next.map((item, index) => ({ ...item, displayOrder: index }));
        setMaterials(reindexed);
        setDraggedId(null);

        try {
            await reorderLearningMaterials(
                reindexed
                    .filter(item => item.id)
                    .map(item => ({ id: item.id!, displayOrder: item.displayOrder })),
            );
        } catch (error: any) {
            alert('Reorder failed: ' + (error.message || 'Unknown error'));
            fetchMaterials();
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
                    <h1 className="text-3xl font-bold tracking-tight">Learning Materials</h1>
                    <p className="text-muted-foreground mt-1">Manage Learn Hub tips, recipes, videos, and article content.</p>
                </div>
                <Button onClick={() => navigate('/admin/learning/add')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Content
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Tips</CardTitle>
                        <BookOpen className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{materials.length}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Published</CardTitle>
                        <BookOpen className="h-4 w-4 text-emerald-500" />
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
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Recipes</CardTitle>
                        <Package className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{recipeCount}</div></CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="pb-4 border-b border-border/50">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="relative flex-1 lg:max-w-md">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search learning tips..."
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
                    {!canReorder && (
                        <p className="text-xs text-muted-foreground pt-3">
                            Clear search and filters to drag rows and save display order.
                        </p>
                    )}
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="pl-4 h-10 w-10">Order</TableHead>
                                <TableHead className="h-10 w-[360px]">Tip</TableHead>
                                <TableHead className="h-10">Category</TableHead>
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
                                            <BookOpen className="h-8 w-8 text-muted-foreground mb-2" />
                                            <span className="text-muted-foreground font-medium">No learning materials found.</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map(item => (
                                    <TableRow
                                        key={item.id}
                                        draggable={canReorder}
                                        onDragStart={() => canReorder && setDraggedId(item.id || null)}
                                        onDragOver={(event: DragEvent<HTMLTableRowElement>) => canReorder && event.preventDefault()}
                                        onDrop={() => item.id && handleDrop(item.id)}
                                        className={draggedId === item.id ? 'opacity-50' : ''}
                                    >
                                        <TableCell className="pl-4">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <GripVertical className={`h-4 w-4 ${canReorder ? 'cursor-grab' : 'opacity-30'}`} />
                                                <span className="text-xs">{item.displayOrder ?? '-'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                {item.thumbnailImage ? (
                                                    <img src={item.thumbnailImage} alt="" className="w-16 h-11 rounded-md object-cover border flex-shrink-0" />
                                                ) : (
                                                    <div className="w-16 h-11 rounded-md bg-muted border flex items-center justify-center flex-shrink-0">
                                                        <BookOpen className="w-5 h-5 text-muted-foreground" />
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium truncate">{item.title}</p>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {item.contentType === 'recipe' ? 'Recipe' : 'Learning tip'} · {item.videoSource === 'youtube' ? 'YouTube' : 'Uploaded video'}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell><Badge variant="secondary">{item.category}</Badge></TableCell>
                                        <TableCell>
                                            <Badge variant={item.status === 'published' ? 'default' : 'secondary'}>
                                                {item.status === 'published' ? 'Published' : 'Draft'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{formatDate(item.publishDate || item.createdAt)}</TableCell>
                                        <TableCell>
                                            <Button
                                                variant={item.featured ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => handleToggleFeatured(item)}
                                                className="h-8"
                                            >
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
                                                    <DropdownMenuItem onClick={() => navigate(`/admin/learning/edit/${item.id}`)}>
                                                        <Edit3 className="h-4 w-4 mr-2" /> Edit Tip
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:bg-destructive/10 cursor-pointer"
                                                        onClick={() => handleDelete(item.id!, item.title)}
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" /> Delete Tip
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
