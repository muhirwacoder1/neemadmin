import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addBlog, getBlog, updateBlog, uploadBlogImage, type BlogPost, type BlogCategory } from '../../services/api';
import { RichTextEditor } from '../../components/RichTextEditor';
import { ArrowLeft, Upload, Loader2, Save, X, Eye, EyeOff } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../config/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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
        <div className="max-w-4xl mx-auto animate-fade-in space-y-6 pb-12">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => navigate('/admin/blogs')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{isEditing ? 'Edit Blog Post' : 'Create New Blog Post'}</h1>
                    <p className="text-muted-foreground mt-1">Write and publish your blog article.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Cover Image */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Cover Image</CardTitle>
                        <CardDescription>This image appears as the blog card thumbnail and hero image.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {currentCover ? (
                            <div className="relative group w-full max-w-2xl aspect-[16/9] rounded-md overflow-hidden border">
                                <img src={currentCover} alt="" className="w-full h-full object-cover" />
                                <Button type="button" variant="destructive" size="icon" onClick={removeCover}
                                    className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        ) : (
                            <Label htmlFor="cover-upload" className="w-full max-w-2xl aspect-[16/9] rounded-md border-2 border-dashed border-muted-foreground/25 hover:border-primary flex flex-col items-center justify-center cursor-pointer transition-colors group">
                                <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary mb-2" />
                                <span className="text-sm font-medium text-muted-foreground group-hover:text-primary">Upload Cover Image</span>
                                <span className="text-xs text-muted-foreground/70 mt-1">Recommended: 1200×675px</span>
                                <input id="cover-upload" type="file" accept="image/*" onChange={handleCoverAdd} className="hidden" />
                            </Label>
                        )}
                        {currentCover && (
                            <div className="mt-3">
                                <Label htmlFor="cover-replace" className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium cursor-pointer">
                                    <Upload className="w-4 h-4" />
                                    <span>Replace cover image</span>
                                    <input id="cover-replace" type="file" accept="image/*" onChange={handleCoverAdd} className="hidden" />
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
                                <Label htmlFor="title">Blog Title *</Label>
                                <Input id="title" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Understanding Your Blood Sugar Levels" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">Category *</Label>
                                <Select value={form.category} onValueChange={val => setForm({ ...form, category: val as BlogCategory })}>
                                    <SelectTrigger id="category">
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="readTime">Read Time</Label>
                                <Input id="readTime" value={form.readTime} onChange={e => setForm({ ...form, readTime: e.target.value })} placeholder="e.g. 5 min read" />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="author">Author</Label>
                                <Input id="author" value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} placeholder="e.g. MyDiabetes Team" className="max-w-md" />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="description">Short Description</Label>
                                <Textarea id="description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Brief preview text shown on the blog card..." />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Content Editor */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Blog Content *</CardTitle>
                        <CardDescription>Use the toolbar to format text, add images, and embed YouTube videos.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-md overflow-hidden bg-background">
                            <RichTextEditor
                                value={form.content}
                                onChange={v => setForm({ ...form, content: v })}
                                placeholder="Start writing your blog article..."
                                onImageUpload={handleContentImageUpload}
                                minHeight="400px"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Status & Actions */}
                <Card>
                    <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6">
                        <div className="flex items-center gap-4">
                            <Button
                                type="button"
                                variant={form.status === 'published' ? "default" : "secondary"}
                                onClick={() => setForm({ ...form, status: form.status === 'published' ? 'draft' : 'published' })}
                                className={form.status === 'published' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                            >
                                {form.status === 'published' ? (
                                    <><Eye className="w-4 h-4 mr-2" /> Published</>
                                ) : (
                                    <><EyeOff className="w-4 h-4 mr-2" /> Draft</>
                                )}
                            </Button>
                            <span className="text-sm text-muted-foreground">
                                {form.status === 'published' ? 'Visible to all users' : 'Only visible to admins'}
                            </span>
                        </div>
                        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            {loading ? 'Saving...' : isEditing ? 'Update Blog' : 'Create Blog'}
                        </Button>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}
