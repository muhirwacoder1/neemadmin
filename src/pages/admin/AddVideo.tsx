/// <reference types="vite/client" />
import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    addVideo, getVideo, updateVideo, uploadVideoThumbnail, uploadVideoResumable,
    type Video, type VideoCategory, type VideoSource, type VideoUploadController,
} from '../../services/api';
import { RichTextEditor } from '../../components/RichTextEditor';
import { ArrowLeft, Upload, Loader2, Save, X, Youtube, Cloud, Film, CheckCircle, AlertCircle, HardDriveUpload, Pause, Play } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const CATEGORIES: VideoCategory[] = ['General', 'Nutrition', 'Sports', 'Wellness'];

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

// Upload state shared by the Firebase + Cloudinary upload flows.
type UploadState = 'idle' | 'uploading' | 'paused' | 'processing' | 'done' | 'error';

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

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const MAX_VIDEO_BYTES = 600 * 1024 * 1024; // mirrors the Storage rule limit

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

function storageErrorMessage(code: string): string {
    switch (code) {
        case 'storage/unauthorized':
            return 'Permission denied. Make sure you are signed in as an admin (you may need to log out and back in to refresh permissions).';
        case 'storage/retry-limit-exceeded':
            return 'The connection is too unstable to finish the upload. Check your internet and retry.';
        case 'storage/quota-exceeded':
            return 'Storage quota exceeded.';
        default:
            return 'Upload failed. Check your connection and try again.';
    }
}

export function AddVideo() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = !!id;

    const [loading, setLoading] = useState(false);
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string>('');
    const [existingThumbnail, setExistingThumbnail] = useState<string>('');

    // Cloudinary URL/upload sub-mode
    const [cloudinaryMode, setCloudinaryMode] = useState<'url' | 'upload'>('url');

    // Shared video-file upload state (Firebase + Cloudinary upload flows)
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState<UploadState>('idle');
    const [uploadError, setUploadError] = useState('');

    // The Firestore doc id backing a Firebase upload. For a brand-new video we
    // create the doc up front (to get an id for the storage path); when editing
    // we reuse the existing id.
    const [firebaseDocId, setFirebaseDocId] = useState<string | null>(null);
    const uploadCtrl = useRef<VideoUploadController | null>(null);

    const [form, setForm] = useState({
        title: '',
        description: '',
        category: 'General' as VideoCategory,
        // New videos default to Firebase Storage. Legacy youtube/cloudinary docs
        // load their own source when editing.
        videoSource: 'firebase' as VideoSource,
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
                    if (v.videoSource === 'firebase') {
                        setFirebaseDocId(id);
                        if (v.videoUrl) setUploadStatus(v.processingStatus === 'ready' ? 'done' : 'processing');
                    }
                }
            });
        }
    }, [id, isEditing]);

    // Auto-generate YouTube thumbnail when URL changes (legacy edit only)
    useEffect(() => {
        if (form.videoSource === 'youtube' && form.videoUrl && !thumbnailFile && !existingThumbnail) {
            const ytId = extractYouTubeId(form.videoUrl);
            if (ytId) {
                setThumbnailPreview(`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`);
            }
        }
    }, [form.videoUrl, form.videoSource, thumbnailFile, existingThumbnail]);

    // Cancel any in-flight upload if the component unmounts.
    useEffect(() => {
        return () => {
            if (uploadCtrl.current && (uploadStatus === 'uploading' || uploadStatus === 'paused')) {
                uploadCtrl.current.cancel();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

    const resetUploadState = () => {
        setVideoFile(null);
        setUploadStatus('idle');
        setUploadProgress(0);
        setUploadError('');
        uploadCtrl.current = null;
    };

    const handleVideoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > MAX_VIDEO_BYTES) {
            alert(`Video is too large (${formatBytes(file.size)}). Maximum is 600 MB.`);
            e.target.value = '';
            return;
        }
        setVideoFile(file);
        setUploadStatus('idle');
        setUploadProgress(0);
        setUploadError('');
        setForm(prev => ({ ...prev, videoUrl: '' }));
        e.target.value = '';
    };

    const switchSource = (source: VideoSource) => {
        if (uploadCtrl.current && (uploadStatus === 'uploading' || uploadStatus === 'paused')) {
            uploadCtrl.current.cancel();
        }
        resetUploadState();
        setForm(prev => ({ ...prev, videoSource: source, videoUrl: '' }));
        if (source === 'cloudinary') setCloudinaryMode('url');
    };

    // ── Firebase resumable upload ──────────────────────────────
    const ensureFirebaseDocId = async (): Promise<string> => {
        if (firebaseDocId) return firebaseDocId;
        if (isEditing && id) {
            setFirebaseDocId(id);
            return id;
        }
        // Create a placeholder doc (inactive until the form is submitted) so we
        // have an id for the storage path videos/{id}/source/...
        const newId = await addVideo({
            title: form.title || 'Untitled video',
            description: form.description,
            category: form.category,
            thumbnail: existingThumbnail || '',
            videoSource: 'firebase',
            videoUrl: '',
            duration: form.duration,
            active: false,
            processingStatus: 'uploading',
        });
        setFirebaseDocId(newId);
        return newId;
    };

    const handleFirebaseUpload = async () => {
        if (!videoFile) return;
        setUploadStatus('uploading');
        setUploadProgress(0);
        setUploadError('');
        try {
            const vid = await ensureFirebaseDocId();
            uploadCtrl.current = uploadVideoResumable(videoFile, vid, {
                onProgress: (percent) => setUploadProgress(percent),
                onStateChange: (state) => {
                    if (state === 'paused') setUploadStatus('paused');
                    else if (state === 'running') setUploadStatus('uploading');
                },
                onError: (error) => {
                    setUploadStatus('error');
                    setUploadError(storageErrorMessage(error.code));
                },
                onComplete: async ({ downloadUrl, storagePath }) => {
                    try {
                        await updateVideo(vid, {
                            videoSource: 'firebase',
                            storagePath,
                            videoUrl: downloadUrl,
                            playbackUrl: downloadUrl,
                            processingStatus: 'processing',
                            fileSizeBytes: videoFile.size,
                            originalFileName: videoFile.name,
                        });
                        setForm(prev => ({ ...prev, videoUrl: downloadUrl, videoSource: 'firebase' }));
                        setUploadStatus('processing');
                    } catch (e) {
                        setUploadStatus('error');
                        setUploadError('Uploaded, but failed to save the video record. Try saving again.');
                    }
                },
            });
        } catch (e: any) {
            setUploadStatus('error');
            setUploadError(e?.message || 'Failed to start upload.');
        }
    };

    const pauseUpload = () => { uploadCtrl.current?.pause(); };
    const resumeUpload = () => { uploadCtrl.current?.resume(); };
    const cancelUpload = () => {
        uploadCtrl.current?.cancel();
        resetUploadState();
        setForm(prev => ({ ...prev, videoUrl: '' }));
    };

    // ── Cloudinary upload ──────────────────────────────────────
    const handleCloudinaryUpload = async () => {
        if (!videoFile) return;
        if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
            alert('Cloudinary is not configured. Please set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in your .env file.');
            return;
        }
        setUploadStatus('uploading');
        setUploadProgress(0);
        setUploadError('');
        try {
            const url = await uploadToCloudinary(videoFile, setUploadProgress);
            setForm(prev => ({ ...prev, videoUrl: url }));
            setUploadStatus('done');
        } catch (err: any) {
            setUploadStatus('error');
            setUploadError(err.message || 'Cloudinary upload failed');
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!form.title.trim()) { alert('Video title is required.'); return; }

        const uploadIncomplete = uploadStatus === 'uploading' || uploadStatus === 'paused';
        if (uploadIncomplete) {
            alert('Please wait for the upload to finish (or cancel it) before saving.');
            return;
        }

        if (!form.videoUrl.trim()) {
            if (form.videoSource === 'firebase') {
                alert('Please upload a video file first.');
            } else if (form.videoSource === 'cloudinary' && cloudinaryMode === 'upload' && videoFile && uploadStatus !== 'done') {
                alert('Please upload the video to Cloudinary first.');
            } else {
                alert('Video URL is required.');
            }
            return;
        }

        setLoading(true);
        try {
            let thumbnail = existingThumbnail;
            let thumbnailPath: string | undefined;

            // Legacy YouTube: fall back to the auto-generated thumbnail.
            if (!thumbnail && !thumbnailFile && form.videoSource === 'youtube') {
                const ytId = extractYouTubeId(form.videoUrl);
                if (ytId) thumbnail = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
            }

            // For Firebase uploads we created/own a doc id; otherwise fall back
            // to the editing id, or create a fresh doc (cloudinary/url path).
            const effectiveId = firebaseDocId || (isEditing ? id! : null);

            const videoData: Partial<Video> = {
                title: form.title,
                description: form.description,
                category: form.category,
                videoSource: form.videoSource,
                videoUrl: form.videoUrl,
                duration: form.duration,
                active: form.active,
                thumbnail,
            };

            let docId: string;
            if (effectiveId) {
                docId = effectiveId;
                if (thumbnailFile) {
                    const uploaded = await uploadVideoThumbnail(thumbnailFile, docId);
                    thumbnail = uploaded.url;
                    thumbnailPath = uploaded.path;
                }
                await updateVideo(docId, { ...videoData, thumbnail, ...(thumbnailPath ? { thumbnailPath } : {}) });
            } else {
                docId = await addVideo(videoData as Omit<Video, 'id' | 'createdAt'>);
                if (thumbnailFile) {
                    const uploaded = await uploadVideoThumbnail(thumbnailFile, docId);
                    await updateVideo(docId, { thumbnail: uploaded.url, thumbnailPath: uploaded.path });
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
                        <CardDescription>Upload a custom thumbnail. For Firebase videos one is auto-generated from the video if you skip this.</CardDescription>
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
                                <Input id="duration" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} placeholder="e.g. 12 min (auto-detected for Firebase uploads)" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Video Source */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Video Source</CardTitle>
                        <CardDescription>Upload to Firebase Storage (recommended) or use a Cloudinary video.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {/* Source Toggle: Firebase | Cloudinary | YouTube */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                                type="button"
                                variant={form.videoSource === 'firebase' ? 'default' : 'outline'}
                                className={`flex-1 ${form.videoSource === 'firebase' ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}`}
                                onClick={() => switchSource('firebase')}
                            >
                                <HardDriveUpload className="w-5 h-5 mr-2" /> Firebase Upload
                            </Button>
                            <Button
                                type="button"
                                variant={form.videoSource === 'cloudinary' ? 'default' : 'outline'}
                                className={`flex-1 ${form.videoSource === 'cloudinary' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
                                onClick={() => switchSource('cloudinary')}
                            >
                                <Cloud className="w-5 h-5 mr-2" /> Cloudinary
                            </Button>
                            <Button
                                type="button"
                                variant={form.videoSource === 'youtube' ? 'default' : 'outline'}
                                className={`flex-1 ${form.videoSource === 'youtube' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}`}
                                onClick={() => switchSource('youtube')}
                            >
                                <Youtube className="w-5 h-5 mr-2" /> YouTube
                            </Button>
                        </div>

                        {/* YouTube: URL input + detection */}
                        {form.videoSource === 'youtube' && (
                            <div className="space-y-2">
                                <Label htmlFor="yt-url">YouTube URL *</Label>
                                <Input
                                    id="yt-url"
                                    value={form.videoUrl}
                                    onChange={e => setForm({ ...form, videoUrl: e.target.value })}
                                    placeholder="https://www.youtube.com/watch?v=..."
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    Paste the full YouTube video URL. The thumbnail is auto-generated unless you upload a custom one above.
                                </p>
                                {form.videoUrl && (
                                    extractYouTubeId(form.videoUrl) ? (
                                        <div className="bg-muted/50 rounded-md p-3 flex items-center gap-3 border">
                                            <Youtube className="w-5 h-5 text-red-500 shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-foreground truncate">YouTube video detected</p>
                                                <p className="text-xs text-muted-foreground truncate">ID: {extractYouTubeId(form.videoUrl)}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                                            <p className="text-xs text-destructive">Could not detect a valid YouTube video ID from this URL.</p>
                                        </div>
                                    )
                                )}
                            </div>
                        )}

                        {/* Firebase: resumable file upload */}
                        {form.videoSource === 'firebase' && (
                            <div className="space-y-3">
                                {/* File picker */}
                                {!videoFile && uploadStatus !== 'processing' && uploadStatus !== 'done' && (
                                    <Label htmlFor="video-upload" className="w-full rounded-md border-2 border-dashed py-8 flex flex-col items-center justify-center cursor-pointer transition-colors group border-muted-foreground/25 hover:border-primary">
                                        <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary mb-2" />
                                        <span className="text-sm font-medium text-muted-foreground group-hover:text-primary">Select video file</span>
                                        <span className="text-xs text-muted-foreground/70 mt-1">MP4, MOV, AVI, WebM · up to 600 MB</span>
                                        <input id="video-upload" type="file" accept="video/*" onChange={handleVideoFileSelect} className="hidden" />
                                    </Label>
                                )}

                                {videoFile && (
                                    <div className="bg-muted/50 rounded-md p-4 space-y-3 border">
                                        <div className="flex items-center gap-3">
                                            <Film className="w-5 h-5 text-primary shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-foreground truncate">{videoFile.name}</p>
                                                <p className="text-xs text-muted-foreground">{formatBytes(videoFile.size)}</p>
                                            </div>
                                            {(uploadStatus === 'idle' || uploadStatus === 'error') && (
                                                <Button type="button" variant="ghost" size="icon" onClick={cancelUpload} className="h-8 w-8 text-muted-foreground">
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>

                                        {/* Progress bar */}
                                        {(uploadStatus === 'uploading' || uploadStatus === 'paused') && (
                                            <div>
                                                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                                                    <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                                                </div>
                                                <div className="flex items-center justify-between mt-1.5">
                                                    <p className="text-xs text-muted-foreground">
                                                        {uploadStatus === 'paused' ? 'Paused' : 'Uploading…'} {uploadProgress}%
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        {uploadStatus === 'uploading' ? (
                                                            <Button type="button" size="sm" variant="secondary" onClick={pauseUpload}>
                                                                <Pause className="w-3.5 h-3.5 mr-1" /> Pause
                                                            </Button>
                                                        ) : (
                                                            <Button type="button" size="sm" variant="secondary" onClick={resumeUpload}>
                                                                <Play className="w-3.5 h-3.5 mr-1" /> Resume
                                                            </Button>
                                                        )}
                                                        <Button type="button" size="sm" variant="ghost" onClick={cancelUpload}>Cancel</Button>
                                                    </div>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground mt-1">If your connection drops, the upload pauses and resumes automatically when it returns.</p>
                                            </div>
                                        )}

                                        {uploadStatus === 'processing' && (
                                            <div className="flex items-center gap-2 text-blue-600">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span className="text-xs font-medium">Uploaded. Optimizing for streaming… you can save now.</span>
                                            </div>
                                        )}

                                        {uploadStatus === 'done' && (
                                            <div className="flex items-center gap-2 text-emerald-600">
                                                <CheckCircle className="w-4 h-4" />
                                                <span className="text-xs font-medium">Upload complete</span>
                                            </div>
                                        )}

                                        {uploadStatus === 'error' && (
                                            <div className="flex items-start gap-2 text-destructive">
                                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                                <span className="text-xs font-medium">{uploadError || 'Upload failed — try again.'}</span>
                                            </div>
                                        )}

                                        {/* Upload / Retry button */}
                                        {(uploadStatus === 'idle' || uploadStatus === 'error') && (
                                            <Button type="button" onClick={handleFirebaseUpload}>
                                                <HardDriveUpload className="w-4 h-4 mr-2" />
                                                {uploadStatus === 'error' ? 'Retry upload' : 'Upload to Firebase'}
                                            </Button>
                                        )}
                                    </div>
                                )}

                                {/* Already-uploaded notice when editing a firebase video with no new file */}
                                {!videoFile && (uploadStatus === 'processing' || uploadStatus === 'done') && (
                                    <div className="bg-primary/5 border border-primary/20 rounded-md p-3 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <Film className="w-4 h-4 text-primary shrink-0" />
                                            <p className="text-xs text-primary/90 truncate">A video is already attached. Select a file to replace it.</p>
                                        </div>
                                        <Label htmlFor="video-replace" className="text-xs text-primary font-medium cursor-pointer whitespace-nowrap">
                                            Replace
                                            <input id="video-replace" type="file" accept="video/*" onChange={handleVideoFileSelect} className="hidden" />
                                        </Label>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Cloudinary: mode toggle + input */}
                        {form.videoSource === 'cloudinary' && (
                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <Button type="button" size="sm" variant={cloudinaryMode === 'url' ? 'default' : 'secondary'} onClick={() => { setCloudinaryMode('url'); resetUploadState(); }}>
                                        Paste URL
                                    </Button>
                                    <Button type="button" size="sm" variant={cloudinaryMode === 'upload' ? 'default' : 'secondary'} onClick={() => { setCloudinaryMode('upload'); setForm({ ...form, videoUrl: '' }); }}>
                                        Upload File
                                    </Button>
                                </div>

                                {cloudinaryMode === 'url' && (
                                    <div className="space-y-2">
                                        <Label htmlFor="cloud-url">Cloudinary Video URL *</Label>
                                        <Input id="cloud-url" value={form.videoUrl} onChange={e => setForm({ ...form, videoUrl: e.target.value })} placeholder="https://res.cloudinary.com/..." />
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
                                                        Set <code className="bg-background/80 px-1 rounded text-[11px]">VITE_CLOUDINARY_CLOUD_NAME</code> and <code className="bg-background/80 px-1 rounded text-[11px]">VITE_CLOUDINARY_UPLOAD_PRESET</code> in <code className="bg-background/80 px-1 rounded">.env</code>.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {!videoFile && (
                                            <Label htmlFor="cloud-video-upload" className={`w-full rounded-md border-2 border-dashed py-8 flex flex-col items-center justify-center cursor-pointer transition-colors group ${
                                                cloudinaryConfigured ? 'border-muted-foreground/25 hover:border-primary' : 'border-muted-foreground/25 opacity-50 pointer-events-none'
                                            }`}>
                                                <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary mb-2" />
                                                <span className="text-sm font-medium text-muted-foreground group-hover:text-primary">Select video file</span>
                                                <span className="text-xs text-muted-foreground/70 mt-1">MP4, MOV, AVI, WebM</span>
                                                <input id="cloud-video-upload" type="file" accept="video/*" onChange={handleVideoFileSelect} className="hidden" />
                                            </Label>
                                        )}

                                        {videoFile && (
                                            <div className="bg-muted/50 rounded-md p-4 space-y-3 border">
                                                <div className="flex items-center gap-3">
                                                    <Film className="w-5 h-5 text-primary shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-foreground truncate">{videoFile.name}</p>
                                                        <p className="text-xs text-muted-foreground">{formatBytes(videoFile.size)}</p>
                                                    </div>
                                                    {uploadStatus !== 'uploading' && (
                                                        <Button type="button" variant="ghost" size="icon" onClick={cancelUpload} className="h-8 w-8 text-muted-foreground">
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>

                                                {uploadStatus === 'uploading' && (
                                                    <div>
                                                        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                                                            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-1.5">Uploading… {uploadProgress}%</p>
                                                    </div>
                                                )}

                                                {uploadStatus === 'done' && (
                                                    <div className="flex items-center gap-2 text-emerald-600">
                                                        <CheckCircle className="w-4 h-4" />
                                                        <span className="text-xs font-medium">Upload complete</span>
                                                    </div>
                                                )}

                                                {uploadStatus === 'error' && (
                                                    <div className="flex items-start gap-2 text-destructive">
                                                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                                        <span className="text-xs font-medium">{uploadError || 'Upload failed — try again'}</span>
                                                    </div>
                                                )}

                                                {(uploadStatus === 'idle' || uploadStatus === 'error') && (
                                                    <Button type="button" onClick={handleCloudinaryUpload}>
                                                        <Cloud className="w-4 h-4 mr-2" /> Upload to Cloudinary
                                                    </Button>
                                                )}
                                            </div>
                                        )}

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
