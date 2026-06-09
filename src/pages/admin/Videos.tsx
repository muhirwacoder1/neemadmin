import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVideos, deleteVideo, type Video } from '../../services/api';
import { Plus, Search, Pencil, Trash2, Film, Loader2, Youtube, Cloud, HardDriveUpload, Eye, AlertCircle, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

function extractYouTubeId(url: string): string | null {
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})|^([a-zA-Z0-9_-]{11})$/);
    return m ? (m[1] || m[2]) : null;
}

const PER_PAGE = 10;

export function AdminVideos() {
    const [videos, setVideos] = useState<Video[]>([]);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [previewVideo, setPreviewVideo] = useState<Video | null>(null);
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
                <div className="w-8 h-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Videos</h1>
                    <p className="text-muted-foreground mt-1">Manage educational video content.</p>
                </div>
                <Button onClick={() => navigate('/admin/videos/add')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Video
                </Button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Videos</CardTitle>
                        <Film className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{videos.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
                        <Film className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Inactive</CardTitle>
                        <Film className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{videos.length - activeCount}</div>
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
                                placeholder="Search videos..."
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }}
                                className="pl-9 h-9"
                            />
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <Select value={categoryFilter} onValueChange={val => { if (val) setCategoryFilter(val); setPage(1); }}>
                                <SelectTrigger className="w-full sm:w-[150px] h-9">
                                    <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">All Categories</SelectItem>
                                    <SelectItem value="General">General</SelectItem>
                                    <SelectItem value="Nutrition">Nutrition</SelectItem>
                                    <SelectItem value="Sports">Sports</SelectItem>
                                    <SelectItem value="Wellness">Wellness</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={statusFilter} onValueChange={val => { if (val) setStatusFilter(val); setPage(1); }}>
                                <SelectTrigger className="w-full sm:w-[130px] h-9">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">All Status</SelectItem>
                                    <SelectItem value="Active">Active</SelectItem>
                                    <SelectItem value="Inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="pl-6 h-10 w-[300px]">Video</TableHead>
                                <TableHead className="h-10">Category</TableHead>
                                <TableHead className="h-10">Source</TableHead>
                                <TableHead className="h-10">Duration</TableHead>
                                <TableHead className="h-10">Status</TableHead>
                                <TableHead className="h-10 text-right pr-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginated.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center border-b-0">
                                        <div className="flex flex-col items-center justify-center">
                                            <Film className="h-8 w-8 text-muted-foreground mb-2" />
                                            <span className="text-muted-foreground font-medium">No videos found.</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginated.map(video => (
                                    <TableRow key={video.id}>
                                        <TableCell className="pl-6">
                                            <div className="flex items-center gap-3">
                                                {video.thumbnail ? (
                                                    <img src={video.thumbnail} alt="" className="w-16 h-10 rounded-md object-cover flex-shrink-0 border" />
                                                ) : (
                                                    <div className="w-16 h-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0 border">
                                                        <Film className="w-5 h-5 text-muted-foreground" />
                                                    </div>
                                                )}
                                                <span className="text-sm font-medium line-clamp-2">{video.title}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="font-medium">
                                                {video.category}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                                {video.videoSource === 'youtube' ? (
                                                    <><Youtube className="w-4 h-4 text-red-500" /><span className="text-xs">YouTube</span></>
                                                ) : video.videoSource === 'firebase' ? (
                                                    <><HardDriveUpload className="w-4 h-4 text-orange-500" /><span className="text-xs">Firebase</span></>
                                                ) : (
                                                    <><Cloud className="w-4 h-4 text-blue-500" /><span className="text-xs">Cloudinary</span></>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{video.duration}</TableCell>
                                        <TableCell>
                                            {video.videoSource === 'firebase' && video.processingStatus && video.processingStatus !== 'ready' ? (
                                                video.processingStatus === 'error' ? (
                                                    <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" /> Failed</Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="gap-1 text-blue-600"><Loader2 className="w-3 h-3 animate-spin" /> {video.processingStatus === 'uploading' ? 'Uploading' : 'Processing'}</Badge>
                                                )
                                            ) : (
                                                <Badge variant={video.active ? "default" : "secondary"}>
                                                    {video.active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-8 w-8 outline-none">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => setPreviewVideo(video)}>
                                                        <Eye className="h-4 w-4 mr-2" /> Preview
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => navigate(`/admin/videos/edit/${video.id}`)}>
                                                        <Pencil className="h-4 w-4 mr-2" /> Edit Video
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-destructive focus:bg-destructive/10 cursor-pointer" onClick={() => handleDelete(video.id!, video.title)}>
                                                        <Trash2 className="h-4 w-4 mr-2" /> Delete Video
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

            {/* Preview dialog */}
            <Dialog open={!!previewVideo} onOpenChange={(open) => { if (!open) setPreviewVideo(null); }}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="truncate pr-6">{previewVideo?.title || 'Preview'}</DialogTitle>
                    </DialogHeader>
                    {previewVideo && (
                        <div className="aspect-video w-full rounded-md overflow-hidden bg-black">
                            {previewVideo.videoSource === 'youtube' ? (
                                (() => {
                                    const ytId = extractYouTubeId(previewVideo.videoUrl);
                                    return ytId ? (
                                        <iframe
                                            className="w-full h-full"
                                            src={`https://www.youtube.com/embed/${ytId}`}
                                            title={previewVideo.title}
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-white text-sm">Invalid YouTube URL</div>
                                    );
                                })()
                            ) : (previewVideo.playbackUrl || previewVideo.videoUrl) ? (
                                <video className="w-full h-full" src={previewVideo.playbackUrl || previewVideo.videoUrl} controls autoPlay poster={previewVideo.thumbnail || undefined} />
                            ) : (
                                <div className="flex items-center justify-center h-full text-white text-sm">
                                    {previewVideo.processingStatus === 'processing' || previewVideo.processingStatus === 'uploading'
                                        ? 'Still processing…'
                                        : 'No video available'}
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
