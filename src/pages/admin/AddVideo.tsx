/// <reference types="vite/client" />
import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addVideo, getVideo, updateVideo, uploadVideoThumbnail, type Video, type VideoCategory, type VideoSource } from '../../services/api';
import { RichTextEditor } from '../../components/RichTextEditor';
import { ArrowLeft, Upload, Loader2, Save, X, Youtube, Cloud, Film, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const CATEGORIES: VideoCategory[] = ['General', 'Nutrition', 'Sports', 'Wellness'];

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

function extractYouTubeId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/,
    ];
    for (const p of patterns) {
        const match = url.match(p);
        if (match) return match[1];
    }
    return null;
}

async function uploadToCloudinary(
    file: File,
    onProgress: (pct: number) => void
): Promise<string> {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('resource_type', 'video');

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`);

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                onProgress(Math.round((e.loaded / e.total) * 100));
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                const data = JSON.parse(xhr.responseText);
                resolve(data.secure_url);
            } else {
                try {
                    const err = JSON.parse(xhr.responseText);
                    reject(new Error(err.error?.message || 'Upload failed'));
                } catch {
                    reject(new Error('Upload failed with status ' + xhr.status));
                }
            }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(formData);
    });
}

export function AddVideo() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = !!id;

    const [loading, setLoading] = useState(false);
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string>('');
    const [existingThumbnail, setExistingThumbnail] = useState<string>('');

    // Cloudinary upload state
    const [cloudinaryMode, setCloudinaryMode] = useState<'url' | 'upload'>('url');
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');

    const [form, setForm] = useState({
        title: '',
        description: '',
        category: 'General' as VideoCategory,
        videoSource: 'youtube' as VideoSource,
        videoUrl: '',
        duration: '',
        active: true,
    });

    useEffect(() => {
        if (isEditing && id) {
            getVideo(id).then(v => {
                if (v) {
                    setForm({
                        title: v.title,
                        description: v.description || '',
                        category: v.category,
                        videoSource: v.videoSource,
                        videoUrl: v.videoUrl,
                        duration: v.duration,
                        active: v.active ?? true,
                    });
                    setExistingThumbnail(v.thumbnail || '');
                    if (v.videoSource === 'cloudinary' && v.videoUrl) {
                        setCloudinaryMode('url');
                    }
                }
            });
        }
    }, [id, isEditing]);

    // Auto-generate YouTube thumbnail when URL changes
    useEffect(() => {
        if (form.videoSource === 'youtube' && form.videoUrl && !thumbnailFile && !existingThumbnail) {
            const ytId = extractYouTubeId(form.videoUrl);
            if (ytId) {
                setThumbnailPreview(`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`);
            }
        }
    }, [form.videoUrl, form.videoSource, thumbnailFile, existingThumbnail]);

    const handleThumbnailAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setThumbnailFile(file);
        setThumbnailPreview(URL.createObjectURL(file));
        setExistingThumbnail('');
        e.target.value = '';
    };

    const removeThumbnail = () => {
        setThumbnailFile(null);
        setThumbnailPreview('');
        setExistingThumbnail('');
    };

    const handleVideoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setVideoFile(file);
        setUploadStatus('idle');
        setUploadProgress(0);
        setForm({ ...form, videoUrl: '' });
        e.target.value = '';
    };

    const handleCloudinaryUpload = async () => {
        if (!videoFile) return;
        if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
            alert('Cloudinary is not configured. Please set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in your .env file.');
            return;
        }
        setUploadStatus('uploading');
        setUploadProgress(0);
        try {
            const url = await uploadToCloudinary(videoFile, setUploadProgress);
            setForm(prev => ({ ...prev, videoUrl: url }));
            setUploadStatus('done');
        } catch (err: any) {
            setUploadStatus('error');
            alert('Cloudinary upload failed: ' + err.message);
        }
    };

    const removeVideoFile = () => {
        setVideoFile(null);
        setUploadStatus('idle');
        setUploadProgress(0);
        setForm({ ...form, videoUrl: '' });
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!form.title.trim()) { alert('Video title is required.'); return; }
        if (!form.videoUrl.trim()) {
            if (form.videoSource === 'cloudinary' && cloudinaryMode === 'upload' && videoFile && uploadStatus !== 'done') {
                alert('Please upload the video to Cloudinary first.');
            } else {
                alert('Video URL is required.');
            }
            return;
        }

        setLoading(true);
        try {
            let thumbnail = existingThumbnail;

            // If YouTube and no custom thumbnail, use auto-generated
            if (!thumbnail && !thumbnailFile && form.videoSource === 'youtube') {
                const ytId = extractYouTubeId(form.videoUrl);
                if (ytId) thumbnail = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
            }

            const videoData: Omit<Video, 'id' | 'createdAt'> = {
                ...form,
                thumbnail,
            };

            let docId: string;
            if (isEditing && id) {
                docId = id;
                if (thumbnailFile) {
                    thumbnail = await uploadVideoThumbnail(thumbnailFile, id);
                    videoData.thumbnail = thumbnail;
                }
                await updateVideo(id, videoData);
            } else {
                videoData.thumbnail = thumbnail;
                docId = await addVideo(videoData);
                if (thumbnailFile) {
                    thumbnail = await uploadVideoThumbnail(thumbnailFile, docId);
                    await updateVideo(docId, { thumbnail });
                }
            }
            navigate('/admin/videos');
        } catch (e: any) {
            console.error('Video save error:', e);
            alert('Error saving video: ' + (e.message || e.code || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    const currentThumbnail = existingThumbnail || thumbnailPreview;
    const cloudinaryConfigured = !!CLOUDINARY_CLOUD_NAME && !!CLOUDINARY_UPLOAD_PRESET;

    return (
        <div className="max-w-4xl mx-auto animate-fade-in space-y-6 pb-12">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => navigate('/admin/videos')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{isEditing ? 'Edit Video' : 'Add New Video'}</h1>
                    <p className="text-muted-foreground mt-1">Fill in the video details below.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Thumbnail */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Thumbnail</CardTitle>
                        <CardDescription>Upload a custom thumbnail or use the auto-generated one from YouTube.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {currentThumbnail ? (
                            <div className="relative group w-full max-w-md aspect-video rounded-md overflow-hidden border">
                                <img src={currentThumbnail} alt="" className="w-full h-full object-cover" />
                                <Button type="button" variant="destructive" size="icon" onClick={removeThumbnail}
                                    className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <X className="w-4 h-4" />
                                </Button>
                                {thumbnailFile && (
                                    <span className="absolute bottom-2 left-2 text-[10px] font-medium bg-primary text-primary-foreground px-1.5 py-0.5 rounded">CUSTOM</span>
                                )}
                                {!thumbnailFile && !existingThumbnail && form.videoSource === 'youtube' && (
                                    <span className="absolute bottom-2 left-2 text-[10px] font-medium bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded">AUTO</span>
                                )}
                            </div>
                        ) : (
                            <Label htmlFor="thumbnail-upload" className="w-full max-w-md aspect-video rounded-md border-2 border-dashed border-muted-foreground/25 hover:border-primary flex flex-col items-center justify-center cursor-pointer transition-colors group">
                                <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary mb-2" />
                                <span className="text-sm font-medium text-muted-foreground group-hover:text-primary">Upload Thumbnail</span>
                                <input id="thumbnail-upload" type="file" accept="image/*" onChange={handleThumbnailAdd} className="hidden" />
                            </Label>
                        )}
                        {currentThumbnail && (
                            <div className="mt-3">
                                <Label htmlFor="thumbnail-replace" className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 cursor-pointer font-medium">
                                    <Upload className="w-4 h-4" />
                                    <span>Replace thumbnail</span>
                                    <input id="thumbnail-replace" type="file" accept="image/*" onChange={handleThumbnailAdd} className="hidden" />
                                </Label>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Basic Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="title">Video Title *</Label>
                                <Input id="title" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Managing Blood Sugar During Cardio" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">Category *</Label>
                                <Select value={form.category} onValueChange={val => setForm({ ...form, category: val as VideoCategory })}>
                                    <SelectTrigger id="category">
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="duration">Duration</Label>
                                <Input id="duration" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} placeholder="e.g. 12 min" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Video Source */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Video Source</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {/* Source Toggle */}
                        <div className="flex gap-3">
                            <Button
                                type="button"
                                variant={form.videoSource === 'youtube' ? "default" : "outline"}
                                className={`flex-1 ${form.videoSource === 'youtube' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}`}
                                onClick={() => {
                                    setForm({ ...form, videoSource: 'youtube', videoUrl: '' });
                                    setVideoFile(null);
                                    setUploadStatus('idle');
                                }}
                            >
                                <Youtube className="w-5 h-5 mr-2" /> YouTube
                            </Button>
                            <Button
                                type="button"
                                variant={form.videoSource === 'cloudinary' ? "default" : "outline"}
                                className={`flex-1 ${form.videoSource === 'cloudinary' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
                                onClick={() => {
                                    setForm({ ...form, videoSource: 'cloudinary', videoUrl: '' });
                                    setCloudinaryMode('url');
                                }}
                            >
                                <Cloud className="w-5 h-5 mr-2" /> Cloudinary
                            </Button>
                        </div>

                        {/* YouTube: URL input */}
                        {form.videoSource === 'youtube' && (
                            <div className="space-y-2">
                                <Label htmlFor="yt-url">YouTube URL *</Label>
                                <Input id="yt-url" required value={form.videoUrl} onChange={e => setForm({ ...form, videoUrl: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." />
                                <p className="text-[11px] text-muted-foreground">Paste the full YouTube video URL. Thumbnail will be auto-generated.</p>
                            </div>
                        )}

                        {/* Cloudinary: mode toggle + input */}
                        {form.videoSource === 'cloudinary' && (
                            <div className="space-y-4">
                                {/* Sub-toggle: Paste URL or Upload File */}
                                <div className="flex gap-2">
                                    <Button type="button" size="sm" variant={cloudinaryMode === 'url' ? "default" : "secondary"} onClick={() => { setCloudinaryMode('url'); removeVideoFile(); }}>
                                        Paste URL
                                    </Button>
                                    <Button type="button" size="sm" variant={cloudinaryMode === 'upload' ? "default" : "secondary"} onClick={() => { setCloudinaryMode('upload'); setForm({ ...form, videoUrl: '' }); }}>
                                        Upload File
                                    </Button>
                                </div>

                                {cloudinaryMode === 'url' && (
                                    <div className="space-y-2">
                                        <Label htmlFor="cloud-url">Cloudinary Video URL *</Label>
                                        <Input id="cloud-url" required={cloudinaryMode === 'url'} value={form.videoUrl} onChange={e => setForm({ ...form, videoUrl: e.target.value })} placeholder="https://res.cloudinary.com/..." />
                                        <p className="text-[11px] text-muted-foreground">Paste the video URL from your Cloudinary dashboard.</p>
                                    </div>
                                )}

                                {cloudinaryMode === 'upload' && (
                                    <div className="space-y-3">
                                        {!cloudinaryConfigured && (
                                            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 flex items-start gap-3">
                                                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-sm font-medium text-destructive">Cloudinary not configured</p>
                                                    <p className="text-xs text-destructive/80 mt-1">
                                                        Create a <code className="bg-background/80 px-1 rounded">.env</code> file in <code className="bg-background/80 px-1 rounded">webapp/</code> with:<br />
                                                        <code className="bg-background/80 px-1 rounded text-[11px]">VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name</code><br />
                                                        <code className="bg-background/80 px-1 rounded text-[11px]">VITE_CLOUDINARY_UPLOAD_PRESET=your_preset</code>
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* File picker */}
                                        {!videoFile && (
                                            <Label htmlFor="video-upload" className={`w-full rounded-md border-2 border-dashed py-8 flex flex-col items-center justify-center cursor-pointer transition-colors group ${
                                                cloudinaryConfigured ? 'border-muted-foreground/25 hover:border-primary' : 'border-muted-foreground/25 opacity-50 pointer-events-none'
                                            }`}>
                                                <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary mb-2" />
                                                <span className="text-sm font-medium text-muted-foreground group-hover:text-primary">Select video file</span>
                                                <span className="text-xs text-muted-foreground/70 mt-1">MP4, MOV, AVI, WebM</span>
                                                <input id="video-upload" type="file" accept="video/*" onChange={handleVideoFileSelect} className="hidden" />
                                            </Label>
                                        )}

                                        {/* Selected file info */}
                                        {videoFile && (
                                            <div className="bg-muted/50 rounded-md p-4 space-y-3 border">
                                                <div className="flex items-center gap-3">
                                                    <Film className="w-5 h-5 text-primary shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-foreground truncate">{videoFile.name}</p>
                                                        <p className="text-xs text-muted-foreground">{(videoFile.size / (1024 * 1024)).toFixed(1)} MB</p>
                                                    </div>
                                                    {uploadStatus !== 'uploading' && (
                                                        <Button type="button" variant="ghost" size="icon" onClick={removeVideoFile} className="h-8 w-8 text-muted-foreground">
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>

                                                {/* Progress bar */}
                                                {uploadStatus === 'uploading' && (
                                                    <div>
                                                        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                                                            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-1.5">Uploading... {uploadProgress}%</p>
                                                    </div>
                                                )}

                                                {uploadStatus === 'done' && (
                                                    <div className="flex items-center gap-2 text-emerald-600">
                                                        <CheckCircle className="w-4 h-4" />
                                                        <span className="text-xs font-medium">Upload complete</span>
                                                    </div>
                                                )}

                                                {uploadStatus === 'error' && (
                                                    <div className="flex items-center gap-2 text-destructive">
                                                        <AlertCircle className="w-4 h-4" />
                                                        <span className="text-xs font-medium">Upload failed — try again</span>
                                                    </div>
                                                )}

                                                {/* Upload button */}
                                                {(uploadStatus === 'idle' || uploadStatus === 'error') && (
                                                    <Button type="button" onClick={handleCloudinaryUpload}>
                                                        <Cloud className="w-4 h-4 mr-2" /> Upload to Cloudinary
                                                    </Button>
                                                )}
                                            </div>
                                        )}

                                        {/* Show final URL if uploaded */}
                                        {uploadStatus === 'done' && form.videoUrl && (
                                            <div className="bg-primary/5 border border-primary/20 rounded-md p-3">
                                                <p className="text-xs text-primary font-medium mb-1">Video URL (auto-filled):</p>
                                                <p className="text-xs text-primary/80 break-all">{form.videoUrl}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* YouTube preview */}
                        {form.videoUrl && form.videoSource === 'youtube' && extractYouTubeId(form.videoUrl) && (
                            <div className="bg-muted/50 rounded-md p-4 flex items-center gap-3 border">
                                <Film className="w-5 h-5 text-red-500 shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">YouTube Video Detected</p>
                                    <p className="text-xs text-muted-foreground truncate">ID: {extractYouTubeId(form.videoUrl)}</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Description */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-md overflow-hidden bg-background">
                            <RichTextEditor
                                value={form.description}
                                onChange={v => setForm({ ...form, description: v })}
                                placeholder="Describe what this video covers..."
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Status & Actions */}
                <Card>
                    <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6">
                        <div className="flex items-center space-x-2">
                            <Switch 
                                id="active" 
                                checked={form.active} 
                                onCheckedChange={checked => setForm({ ...form, active: checked })} 
                            />
                            <Label htmlFor="active" className="cursor-pointer">Video is active and visible to users</Label>
                        </div>
                        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            {loading ? 'Saving...' : isEditing ? 'Update Video' : 'Add Video'}
                        </Button>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}
