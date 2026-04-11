/// <reference types="vite/client" />
import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addPodcast, getPodcast, updatePodcast, uploadPodcastThumbnail, type Podcast } from '../../services/api';
import { ArrowLeft, Upload, Loader2, Save, X, Cloud, Mic, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

async function uploadAudioToCloudinary(
    file: File,
    onProgress: (pct: number) => void
): Promise<string> {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('resource_type', 'video'); // Cloudinary uses 'video' for audio too

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

export function AddPodcast() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = !!id;

    const [loading, setLoading] = useState(false);
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string>('');
    const [existingThumbnail, setExistingThumbnail] = useState<string>('');

    // Audio upload state
    const [audioMode, setAudioMode] = useState<'url' | 'upload'>('upload');
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');

    const [form, setForm] = useState({
        title: '',
        description: '',
        duration: '',
        audioUrl: '',
        active: true,
    });

    useEffect(() => {
        if (isEditing && id) {
            getPodcast(id).then(p => {
                if (p) {
                    setForm({
                        title: p.title,
                        description: p.description || '',
                        duration: p.duration,
                        audioUrl: p.audioUrl,
                        active: p.active ?? true,
                    });
                    setExistingThumbnail(p.thumbnail || '');
                    if (p.audioUrl) setAudioMode('url');
                }
            });
        }
    }, [id, isEditing]);

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

    const handleAudioFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAudioFile(file);
        setUploadStatus('idle');
        setUploadProgress(0);
        setForm({ ...form, audioUrl: '' });
        e.target.value = '';
    };

    const handleCloudinaryUpload = async () => {
        if (!audioFile) return;
        if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
            alert('Cloudinary is not configured. Please set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in your .env file.');
            return;
        }
        setUploadStatus('uploading');
        setUploadProgress(0);
        try {
            const url = await uploadAudioToCloudinary(audioFile, setUploadProgress);
            setForm(prev => ({ ...prev, audioUrl: url }));
            setUploadStatus('done');
        } catch (err: any) {
            setUploadStatus('error');
            alert('Upload failed: ' + err.message);
        }
    };

    const removeAudioFile = () => {
        setAudioFile(null);
        setUploadStatus('idle');
        setUploadProgress(0);
        setForm({ ...form, audioUrl: '' });
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!form.title.trim()) { alert('Podcast title is required.'); return; }
        if (!form.audioUrl.trim()) {
            if (audioMode === 'upload' && audioFile && uploadStatus !== 'done') {
                alert('Please upload the audio file to Cloudinary first.');
            } else {
                alert('Audio URL is required.');
            }
            return;
        }

        setLoading(true);
        try {
            let thumbnail = existingThumbnail;

            const podcastData: Omit<Podcast, 'id' | 'createdAt'> = {
                ...form,
                thumbnail,
            };

            let docId: string;
            if (isEditing && id) {
                docId = id;
                if (thumbnailFile) {
                    thumbnail = await uploadPodcastThumbnail(thumbnailFile, id);
                    podcastData.thumbnail = thumbnail;
                }
                await updatePodcast(id, podcastData);
            } else {
                podcastData.thumbnail = thumbnail;
                docId = await addPodcast(podcastData);
                if (thumbnailFile) {
                    thumbnail = await uploadPodcastThumbnail(thumbnailFile, docId);
                    await updatePodcast(docId, { thumbnail });
                }
            }
            navigate('/admin/podcasts');
        } catch (e: any) {
            console.error('Podcast save error:', e);
            alert('Error saving podcast: ' + (e.message || e.code || 'Unknown error'));
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
                <Button variant="outline" size="icon" onClick={() => navigate('/admin/podcasts')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{isEditing ? 'Edit Podcast' : 'Add New Podcast'}</h1>
                    <p className="text-muted-foreground mt-1">Fill in the podcast details below.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Thumbnail */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Thumbnail</CardTitle>
                        <CardDescription>Upload artwork for this podcast episode.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {currentThumbnail ? (
                            <div className="relative group w-full max-w-md aspect-video rounded-md overflow-hidden border">
                                <img src={currentThumbnail} alt="" className="w-full h-full object-cover" />
                                <Button type="button" variant="destructive" size="icon" onClick={removeThumbnail}
                                    className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <X className="w-4 h-4" />
                                </Button>
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
                        <div className="space-y-2">
                            <Label htmlFor="title">Podcast Title *</Label>
                            <Input id="title" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Understanding Blood Sugar Spikes" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="duration">Duration</Label>
                            <Input id="duration" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} placeholder="e.g. 25 min" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe what this podcast episode covers..." />
                        </div>
                    </CardContent>
                </Card>

                {/* Audio Source */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Audio Source</CardTitle>
                        <CardDescription>Upload audio to Cloudinary or paste an existing URL.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {/* Mode Toggle */}
                        <div className="flex gap-2">
                            <Button type="button" size="sm" variant={audioMode === 'upload' ? "default" : "secondary"}
                                onClick={() => { setAudioMode('upload'); setForm({ ...form, audioUrl: '' }); }}>
                                <Upload className="w-4 h-4 mr-2" /> Upload File
                            </Button>
                            <Button type="button" size="sm" variant={audioMode === 'url' ? "default" : "secondary"}
                                onClick={() => { setAudioMode('url'); removeAudioFile(); }}>
                                <Cloud className="w-4 h-4 mr-2" /> Paste URL
                            </Button>
                        </div>

                        {/* Paste URL Mode */}
                        {audioMode === 'url' && (
                            <div className="space-y-2">
                                <Label htmlFor="audio-url">Audio URL *</Label>
                                <Input id="audio-url" required={audioMode === 'url'} value={form.audioUrl} onChange={e => setForm({ ...form, audioUrl: e.target.value })} placeholder="https://res.cloudinary.com/..." />
                                <p className="text-[11px] text-muted-foreground">Paste a direct link to the audio file.</p>
                            </div>
                        )}

                        {/* Upload Mode */}
                        {audioMode === 'upload' && (
                            <div className="space-y-3">
                                {!cloudinaryConfigured && (
                                    <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-destructive">Cloudinary not configured</p>
                                            <p className="text-xs text-destructive/80 mt-1">
                                                Set <code className="bg-background/80 px-1 rounded">VITE_CLOUDINARY_CLOUD_NAME</code> and <code className="bg-background/80 px-1 rounded">VITE_CLOUDINARY_UPLOAD_PRESET</code> in your <code className="bg-background/80 px-1 rounded">.env</code>.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* File picker */}
                                {!audioFile && (
                                    <Label htmlFor="audio-upload" className={`w-full rounded-md border-2 border-dashed py-8 flex flex-col items-center justify-center cursor-pointer transition-colors group ${
                                        cloudinaryConfigured ? 'border-muted-foreground/25 hover:border-primary' : 'border-muted-foreground/25 opacity-50 pointer-events-none'
                                    }`}>
                                        <Mic className="w-8 h-8 text-muted-foreground group-hover:text-primary mb-2" />
                                        <span className="text-sm font-medium text-muted-foreground group-hover:text-primary">Select audio file</span>
                                        <span className="text-xs text-muted-foreground/70 mt-1">MP3, WAV, M4A, OGG, AAC</span>
                                        <input id="audio-upload" type="file" accept="audio/*" onChange={handleAudioFileSelect} className="hidden" />
                                    </Label>
                                )}

                                {/* Selected file info */}
                                {audioFile && (
                                    <div className="bg-muted/50 rounded-md p-4 space-y-3 border">
                                        <div className="flex items-center gap-3">
                                            <Mic className="w-5 h-5 text-primary shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-foreground truncate">{audioFile.name}</p>
                                                <p className="text-xs text-muted-foreground">{(audioFile.size / (1024 * 1024)).toFixed(1)} MB</p>
                                            </div>
                                            {uploadStatus !== 'uploading' && (
                                                <Button type="button" variant="ghost" size="icon" onClick={removeAudioFile} className="h-8 w-8 text-muted-foreground">
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>

                                        {/* Progress */}
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

                                        {(uploadStatus === 'idle' || uploadStatus === 'error') && (
                                            <Button type="button" onClick={handleCloudinaryUpload}>
                                                <Cloud className="w-4 h-4 mr-2" /> Upload to Cloudinary
                                            </Button>
                                        )}
                                    </div>
                                )}

                                {/* Show URL after upload */}
                                {uploadStatus === 'done' && form.audioUrl && (
                                    <div className="bg-primary/5 border border-primary/20 rounded-md p-3">
                                        <p className="text-xs text-primary font-medium mb-1">Audio URL (auto-filled):</p>
                                        <p className="text-xs text-primary/80 break-all">{form.audioUrl}</p>
                                    </div>
                                )}
                            </div>
                        )}
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
                            <Label htmlFor="active" className="cursor-pointer">Podcast is active and visible to users</Label>
                        </div>
                        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            {loading ? 'Saving...' : isEditing ? 'Update Podcast' : 'Add Podcast'}
                        </Button>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}
