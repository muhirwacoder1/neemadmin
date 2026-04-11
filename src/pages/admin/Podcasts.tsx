import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPodcasts, deletePodcast, type Podcast } from '../../services/api';
import { Plus, Search, Pencil, Trash2, Mic, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const PER_PAGE = 10;

export function AdminPodcasts() {
    const [podcasts, setPodcasts] = useState<Podcast[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const navigate = useNavigate();

    useEffect(() => {
        getPodcasts().then(p => { setPodcasts(p); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`Delete podcast "${title}"? This cannot be undone.`)) return;
        try {
            await deletePodcast(id);
            setPodcasts(prev => prev.filter(p => p.id !== id));
        } catch (e: any) {
            alert('Error: ' + e.message);
        }
    };

    const filtered = podcasts.filter(p => {
        const matchSearch = p.title.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'All' || (statusFilter === 'Active' ? p.active : !p.active);
        return matchSearch && matchStatus;
    });

    const totalPages = Math.ceil(filtered.length / PER_PAGE);
    const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    const activeCount = podcasts.filter(p => p.active).length;

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
                    <h1 className="text-3xl font-bold tracking-tight">Podcasts</h1>
                    <p className="text-muted-foreground mt-1">Manage your podcast episodes and audio content.</p>
                </div>
                <Button onClick={() => navigate('/admin/podcasts/add')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Podcast
                </Button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Podcasts</CardTitle>
                        <Mic className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{podcasts.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
                        <Mic className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Inactive</CardTitle>
                        <Mic className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{podcasts.length - activeCount}</div>
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
                                placeholder="Search podcasts..."
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }}
                                className="pl-9 h-9"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={val => { if (val) setStatusFilter(val); setPage(1); }}>
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
                                <TableHead className="pl-6 h-10 w-[350px]">Podcast</TableHead>
                                <TableHead className="h-10">Duration</TableHead>
                                <TableHead className="h-10">Status</TableHead>
                                <TableHead className="h-10 text-right pr-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginated.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-32 text-center border-b-0">
                                        <div className="flex flex-col items-center justify-center">
                                            <Mic className="h-8 w-8 text-muted-foreground mb-2" />
                                            <span className="text-muted-foreground font-medium">No podcasts found.</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginated.map(podcast => (
                                    <TableRow key={podcast.id}>
                                        <TableCell className="pl-6">
                                            <div className="flex items-center gap-3">
                                                {podcast.thumbnail ? (
                                                    <img src={podcast.thumbnail} alt="" className="w-12 h-12 rounded-md object-cover flex-shrink-0 border" />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center flex-shrink-0 border">
                                                        <Mic className="w-5 h-5 text-muted-foreground" />
                                                    </div>
                                                )}
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm font-medium leading-none truncate">{podcast.title}</span>
                                                    <span className="text-xs text-muted-foreground mt-1 truncate max-w-[250px]">{podcast.description}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{podcast.duration}</TableCell>
                                        <TableCell>
                                            <Badge variant={podcast.active ? "default" : "secondary"}>
                                                {podcast.active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-8 w-8 outline-none">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => navigate(`/admin/podcasts/edit/${podcast.id}`)}>
                                                        <Pencil className="h-4 w-4 mr-2" /> Edit Podcast
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-destructive focus:bg-destructive/10 cursor-pointer" onClick={() => handleDelete(podcast.id!, podcast.title)}>
                                                        <Trash2 className="h-4 w-4 mr-2" /> Delete Podcast
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
