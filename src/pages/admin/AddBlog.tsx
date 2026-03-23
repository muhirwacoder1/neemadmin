import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addBlog, getBlog, updateBlog, uploadBlogImage, type BlogPost, type BlogCategory } from '../../services/api';
import { RichTextEditor } from '../../components/RichTextEditor';
import { ArrowLeft, Upload, Loader2, Save, X, Eye, EyeOff } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../config/firebase';

const CATEGORIES: BlogCategory[] = ['Diabetes 101', 'Nutrition', 'Lifestyle', 'Mental Health'];

export function AddBlog() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = !!id;

    const [loading, setLoading] = useState(false);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string>('');
    const [existingCover, setExistingCover] = useState<string>('');

    const [form, setForm] = useState({
        title: '',
        description: '',
        category: 'Diabetes 101' as BlogCategory,
        author: 'MyDiabetes Team',
        content: '',
        status: 'draft' as 'published' | 'draft',
        readTime: '',
    });

    useEffect(() => {
        if (isEditing && id) {
            getBlog(id).then(b => {
                if (b) {
                    setForm({
                        title: b.title,
                        description: b.description || '',
                        category: b.category,
                        author: b.author || 'MyDiabetes Team',
                        content: b.content || '',
                        status: b.status || 'draft',
                        readTime: b.readTime || '',
                    });
                    setExistingCover(b.coverImage || '');
                }
            });
        }
    }, [id, isEditing]);

    const handleCoverAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCoverFile(file);
        setCoverPreview(URL.createObjectURL(file));
        setExistingCover('');
        e.target.value = '';
    };

    const removeCover = () => {
        setCoverFile(null);
        setCoverPreview('');
        setExistingCover('');
    };

    // Upload image for inline content (used by RichTextEditor)
    const handleContentImageUpload = async (file: File): Promise<string> => {
        const tempId = id || `temp_${Date.now()}`;
        const storageRef = ref(storage, `blogs/${tempId}/content_${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        return getDownloadURL(storageRef);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!form.title.trim()) { alert('Blog title is required.'); return; }
        if (!form.content.trim()) { alert('Blog content is required.'); return; }

        setLoading(true);
        try {
            let coverImage = existingCover;

            const blogData: Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt'> = {
                ...form,
                coverImage,
            };

            let docId: string;
            if (isEditing && id) {
                docId = id;
                if (coverFile) {
                    coverImage = await uploadBlogImage(coverFile, id);
                    blogData.coverImage = coverImage;
                }
                await updateBlog(id, blogData);
            } else {
                blogData.coverImage = coverImage;
                docId = await addBlog(blogData);
                if (coverFile) {
                    coverImage = await uploadBlogImage(coverFile, docId);
                    await updateBlog(docId, { coverImage });
                }
            }
            navigate('/admin/blogs');
        } catch (e: any) {
            console.error('Blog save error:', e);
            alert('Error saving blog: ' + (e.message || e.code || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    const currentCover = existingCover || coverPreview;

    return (
        <div className="max-w-4xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button onClick={() => navigate('/admin/blogs')} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{isEditing ? 'Edit Blog Post' : 'Create New Blog Post'}</h1>
                    <p className="text-slate-500 mt-0.5">Write and publish your blog article</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Cover Image */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-900 mb-1">Cover Image</h2>
                    <p className="text-xs text-slate-400 mb-4">This image appears as the blog card thumbnail and hero image.</p>
                    {currentCover ? (
                        <div className="relative group w-full max-w-2xl aspect-[16/9] rounded-xl overflow-hidden border border-slate-200">
                            <img src={currentCover} alt="" className="w-full h-full object-cover" />
                            <button type="button" onClick={removeCover}
                                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <label className="w-full max-w-2xl aspect-[16/9] rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-400 flex flex-col items-center justify-center cursor-pointer transition-colors group">
                            <Upload className="w-8 h-8 text-slate-300 group-hover:text-blue-400 mb-2" />
                            <span className="text-sm text-slate-400 group-hover:text-blue-500">Upload Cover Image</span>
                            <span className="text-xs text-slate-300 mt-1">Recommended: 1200×675px</span>
                            <input type="file" accept="image/*" onChange={handleCoverAdd} className="hidden" />
                        </label>
                    )}
                    {currentCover && (
                        <label className="inline-flex items-center gap-2 mt-3 text-sm text-blue-600 hover:text-blue-700 cursor-pointer">
                            <Upload className="w-4 h-4" />
                            <span>Replace cover image</span>
                            <input type="file" accept="image/*" onChange={handleCoverAdd} className="hidden" />
                        </label>
                    )}
                </div>

                {/* Basic Info */}
                <div className="bg-white rounded-2xl border border-slate-100/60 p-6 shadow-soft space-y-5">
                    <h2 className="text-sm font-semibold text-slate-900">Basic Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Blog Title *</label>
                            <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                                placeholder="e.g. Understanding Your Blood Sugar Levels" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Category *</label>
                            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as BlogCategory })}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 bg-white">
                                {CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Read Time</label>
                            <input value={form.readTime} onChange={e => setForm({ ...form, readTime: e.target.value })}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                                placeholder="e.g. 5 min read" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Author</label>
                            <input value={form.author} onChange={e => setForm({ ...form, author: e.target.value })}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                                placeholder="e.g. MyDiabetes Team" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Short Description</label>
                            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                                rows={3}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 resize-none"
                                placeholder="Brief preview text shown on the blog card..." />
                        </div>
                    </div>
                </div>

                {/* Content Editor */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-900">Blog Content *</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Use the toolbar to format text, add images, and embed YouTube videos.</p>
                    </div>
                    <RichTextEditor
                        value={form.content}
                        onChange={v => setForm({ ...form, content: v })}
                        placeholder="Start writing your blog article..."
                        onImageUpload={handleContentImageUpload}
                        minHeight="400px"
                    />
                </div>

                {/* Status & Actions */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={() => setForm({ ...form, status: form.status === 'published' ? 'draft' : 'published' })}
                                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                                    form.status === 'published'
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                        : 'bg-amber-50 border-amber-200 text-amber-700'
                                }`}
                            >
                                {form.status === 'published' ? (
                                    <><Eye className="w-4 h-4" /> Published</>
                                ) : (
                                    <><EyeOff className="w-4 h-4" /> Draft</>
                                )}
                            </button>
                            <span className="text-xs text-slate-400">
                                {form.status === 'published' ? 'Visible to all users' : 'Only visible to admins'}
                            </span>
                        </div>
                        <button type="submit" disabled={loading}
                            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            {loading ? 'Saving...' : isEditing ? 'Update Blog' : 'Create Blog'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
