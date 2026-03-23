import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addVideo, getVideo, updateVideo, uploadVideoThumbnail, type Video, type VideoCategory, type VideoSource } from '../../services/api';
import { RichTextEditor } from '../../components/RichTextEditor';
import { ArrowLeft, Upload, Loader2, Save, X, Youtube, Cloud, Film, CheckCircle, AlertCircle } from 'lucide-react';

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
        <div className="max-w-3xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button onClick={() => navigate('/admin/videos')} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{isEditing ? 'Edit Video' : 'Add New Video'}</h1>
                    <p className="text-slate-500 mt-0.5">Fill in the video details below</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Thumbnail */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-900 mb-1">Thumbnail</h2>
                    <p className="text-xs text-slate-400 mb-4">Upload a custom thumbnail or use the auto-generated one from YouTube.</p>
                    {currentThumbnail ? (
                        <div className="relative group w-full max-w-md aspect-video rounded-xl overflow-hidden border border-slate-200">
                            <img src={currentThumbnail} alt="" className="w-full h-full object-cover" />
                            <button type="button" onClick={removeThumbnail}
                                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <X className="w-4 h-4" />
                            </button>
                            {thumbnailFile && (
                                <span className="absolute bottom-2 left-2 text-[10px] font-medium bg-blue-600 text-white px-1.5 py-0.5 rounded">CUSTOM</span>
                            )}
                            {!thumbnailFile && !existingThumbnail && form.videoSource === 'youtube' && (
                                <span className="absolute bottom-2 left-2 text-[10px] font-medium bg-red-500 text-white px-1.5 py-0.5 rounded">AUTO</span>
                            )}
                        </div>
                    ) : (
                        <label className="w-full max-w-md aspect-video rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-400 flex flex-col items-center justify-center cursor-pointer transition-colors group">
                            <Upload className="w-8 h-8 text-slate-300 group-hover:text-blue-400 mb-2" />
                            <span className="text-sm text-slate-400 group-hover:text-blue-500">Upload Thumbnail</span>
                            <input type="file" accept="image/*" onChange={handleThumbnailAdd} className="hidden" />
                        </label>
                    )}
                    {currentThumbnail && (
                        <label className="inline-flex items-center gap-2 mt-3 text-sm text-blue-600 hover:text-blue-700 cursor-pointer">
                            <Upload className="w-4 h-4" />
                            <span>Replace thumbnail</span>
                            <input type="file" accept="image/*" onChange={handleThumbnailAdd} className="hidden" />
                        </label>
                    )}
                </div>

                {/* Basic Info */}
                <div className="bg-white rounded-2xl border border-slate-100/60 p-6 shadow-soft space-y-5">
                    <h2 className="text-sm font-semibold text-slate-900">Basic Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Video Title *</label>
                            <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                                placeholder="e.g. Managing Blood Sugar During Cardio" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Category *</label>
                            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as VideoCategory })}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 bg-white">
                                {CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Duration</label>
                            <input value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                                placeholder="e.g. 12 min" />
                        </div>
                    </div>
                </div>

                {/* Video Source */}
                <div className="bg-white rounded-2xl border border-slate-100/60 p-6 shadow-soft space-y-5">
                    <h2 className="text-sm font-semibold text-slate-900">Video Source</h2>
                    {/* Source Toggle */}
                    <div className="flex gap-3">
                        <button type="button"
                            onClick={() => {
                                setForm({ ...form, videoSource: 'youtube', videoUrl: '' });
                                setVideoFile(null);
                                setUploadStatus('idle');
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all border ${
                                form.videoSource === 'youtube'
                                    ? 'bg-red-50 border-red-200 text-red-700'
                                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                            }`}>
                            <Youtube className="w-5 h-5" /> YouTube
                        </button>
                        <button type="button"
                            onClick={() => {
                                setForm({ ...form, videoSource: 'cloudinary', videoUrl: '' });
                                setCloudinaryMode('url');
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all border ${
                                form.videoSource === 'cloudinary'
                                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                            }`}>
                            <Cloud className="w-5 h-5" /> Cloudinary
                        </button>
                    </div>

                    {/* YouTube: URL input */}
                    {form.videoSource === 'youtube' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">YouTube URL *</label>
                            <input required value={form.videoUrl} onChange={e => setForm({ ...form, videoUrl: e.target.value })}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                                placeholder="https://www.youtube.com/watch?v=..." />
                            <p className="text-xs text-slate-400 mt-1.5">Paste the full YouTube video URL. Thumbnail will be auto-generated.</p>
                        </div>
                    )}

                    {/* Cloudinary: mode toggle + input */}
                    {form.videoSource === 'cloudinary' && (
                        <>
                            {/* Sub-toggle: Paste URL or Upload File */}
                            <div className="flex gap-2">
                                <button type="button"
                                    onClick={() => { setCloudinaryMode('url'); removeVideoFile(); }}
                                    className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                                        cloudinaryMode === 'url'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                    }`}>
                                    Paste URL
                                </button>
                                <button type="button"
                                    onClick={() => { setCloudinaryMode('upload'); setForm({ ...form, videoUrl: '' }); }}
                                    className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                                        cloudinaryMode === 'upload'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                    }`}>
                                    Upload File
                                </button>
                            </div>

                            {cloudinaryMode === 'url' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Cloudinary Video URL *</label>
                                    <input required={cloudinaryMode === 'url'} value={form.videoUrl} onChange={e => setForm({ ...form, videoUrl: e.target.value })}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                                        placeholder="https://res.cloudinary.com/..." />
                                    <p className="text-xs text-slate-400 mt-1.5">Paste the video URL from your Cloudinary dashboard.</p>
                                </div>
                            )}

                            {cloudinaryMode === 'upload' && (
                                <div className="space-y-3">
                                    {!cloudinaryConfigured && (
                                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                                            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-medium text-amber-800">Cloudinary not configured</p>
                                                <p className="text-xs text-amber-600 mt-1">
                                                    Create a <code className="bg-amber-100 px-1 rounded">.env</code> file in <code className="bg-amber-100 px-1 rounded">webapp/</code> with:<br />
                                                    <code className="bg-amber-100 px-1 rounded text-[11px]">VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name</code><br />
                                                    <code className="bg-amber-100 px-1 rounded text-[11px]">VITE_CLOUDINARY_UPLOAD_PRESET=your_preset</code>
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* File picker */}
                                    {!videoFile && (
                                        <label className={`w-full rounded-xl border-2 border-dashed py-8 flex flex-col items-center justify-center cursor-pointer transition-colors group ${
                                            cloudinaryConfigured ? 'border-slate-200 hover:border-blue-400' : 'border-slate-200 opacity-50 pointer-events-none'
                                        }`}>
                                            <Upload className="w-8 h-8 text-slate-300 group-hover:text-blue-400 mb-2" />
                                            <span className="text-sm text-slate-400 group-hover:text-blue-500">Select video file</span>
                                            <span className="text-xs text-slate-300 mt-1">MP4, MOV, AVI, WebM</span>
                                            <input type="file" accept="video/*" onChange={handleVideoFileSelect} className="hidden" />
                                        </label>
                                    )}

                                    {/* Selected file info */}
                                    {videoFile && (
                                        <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                                            <div className="flex items-center gap-3">
                                                <Film className="w-5 h-5 text-blue-500 shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-700 truncate">{videoFile.name}</p>
                                                    <p className="text-xs text-slate-400">{(videoFile.size / (1024 * 1024)).toFixed(1)} MB</p>
                                                </div>
                                                {uploadStatus !== 'uploading' && (
                                                    <button type="button" onClick={removeVideoFile}
                                                        className="p-1 rounded-full hover:bg-slate-200 text-slate-400">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Progress bar */}
                                            {uploadStatus === 'uploading' && (
                                                <div>
                                                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                                        <div className="h-full bg-blue-600 rounded-full transition-all duration-300"
                                                            style={{ width: `${uploadProgress}%` }} />
                                                    </div>
                                                    <p className="text-xs text-slate-400 mt-1.5">Uploading... {uploadProgress}%</p>
                                                </div>
                                            )}

                                            {uploadStatus === 'done' && (
                                                <div className="flex items-center gap-2 text-emerald-600">
                                                    <CheckCircle className="w-4 h-4" />
                                                    <span className="text-xs font-medium">Upload complete</span>
                                                </div>
                                            )}

                                            {uploadStatus === 'error' && (
                                                <div className="flex items-center gap-2 text-red-500">
                                                    <AlertCircle className="w-4 h-4" />
                                                    <span className="text-xs font-medium">Upload failed — try again</span>
                                                </div>
                                            )}

                                            {/* Upload button */}
                                            {(uploadStatus === 'idle' || uploadStatus === 'error') && (
                                                <button type="button" onClick={handleCloudinaryUpload}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                                                    <Cloud className="w-4 h-4" /> Upload to Cloudinary
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Show final URL if uploaded */}
                                    {uploadStatus === 'done' && form.videoUrl && (
                                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                                            <p className="text-xs text-emerald-700 font-medium mb-1">Video URL (auto-filled):</p>
                                            <p className="text-xs text-emerald-600 break-all">{form.videoUrl}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {/* YouTube preview */}
                    {form.videoUrl && form.videoSource === 'youtube' && extractYouTubeId(form.videoUrl) && (
                        <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-3">
                            <Film className="w-5 h-5 text-red-500 shrink-0" />
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-700 truncate">YouTube Video Detected</p>
                                <p className="text-xs text-slate-400 truncate">ID: {extractYouTubeId(form.videoUrl)}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Description */}
                <div className="bg-white rounded-2xl border border-slate-100/60 p-6 shadow-soft space-y-5">
                    <h2 className="text-sm font-semibold text-slate-900">Description</h2>
                    <RichTextEditor
                        value={form.description}
                        onChange={v => setForm({ ...form, description: v })}
                        placeholder="Describe what this video covers..."
                    />
                </div>

                {/* Status & Actions */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex items-center justify-between">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })}
                            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm font-medium text-slate-700">Video is active and visible to users</span>
                    </label>
                    <button type="submit" disabled={loading}
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        {loading ? 'Saving...' : isEditing ? 'Update Video' : 'Add Video'}
                    </button>
                </div>
            </form>
        </div>
    );
}
