/// <reference types="vite/client" />
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    addLearningMaterial,
    getLearningMaterial,
    getProducts,
    updateLearningMaterial,
    uploadLearningContentImage,
    uploadLearningImage,
    uploadLearningThumbnail,
    type LearningMaterial,
    type LearningMaterialCategory,
    type LearningMaterialContentType,
    type LearningMaterialIngredient,
    type LearningMaterialMediaType,
    type LearningMaterialVideoSource,
    type Product,
} from '../../services/api';
import { RichTextEditor } from '../../components/RichTextEditor';
import {
    AlertCircle,
    ArrowLeft,
    BookOpen,
    CheckCircle,
    Cloud,
    Eye,
    EyeOff,
    Film,
    Image as ImageIcon,
    Loader2,
    Package,
    Pin,
    Plus,
    Save,
    Upload,
    Video as VideoIcon,
    X,
    Youtube,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const CATEGORIES: LearningMaterialCategory[] = [
    'Diabetes 101',
    'Nutrition',
    'Recipes',
    'Self Care',
    'Medication',
    'Exercise',
    'Mental Health',
];

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

const REQUIRED_IMAGE_WIDTH = 1920;
const REQUIRED_IMAGE_HEIGHT = 1080;

function todayInputValue() {
    return new Date().toISOString().slice(0, 10);
}

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Could not read image dimensions.'));
        };
        img.src = url;
    });
}

function extractYouTubeId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/,
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

async function uploadToCloudinary(file: File, onProgress: (pct: number) => void): Promise<string> {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('resource_type', 'video');

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`);

        xhr.upload.onprogress = event => {
            if (event.lengthComputable) {
                onProgress(Math.round((event.loaded / event.total) * 100));
            }
        };
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                const data = JSON.parse(xhr.responseText);
                resolve(data.secure_url);
            } else {
                reject(new Error('Upload failed with status ' + xhr.status));
            }
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(formData);
    });
}

export function AddLearningMaterial() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = !!id;

    const [loading, setLoading] = useState(false);
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState('');
    const [existingThumbnail, setExistingThumbnail] = useState('');
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
    const [cloudinaryMode, setCloudinaryMode] = useState<'url' | 'upload'>('url');

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState('');
    const [existingImage, setExistingImage] = useState('');
    const [imageError, setImageError] = useState('');
    const [products, setProducts] = useState<Product[]>([]);
    const [productSearch, setProductSearch] = useState('');

    const [form, setForm] = useState({
        title: '',
        category: 'Self Care' as LearningMaterialCategory,
        contentType: 'tip' as LearningMaterialContentType,
        mediaType: 'video' as LearningMaterialMediaType,
        videoSource: 'youtube' as LearningMaterialVideoSource,
        videoUrl: '',
        imageUrl: '',
        body: '',
        recipeIngredients: [] as LearningMaterialIngredient[],
        status: 'draft' as 'published' | 'draft',
        publishDate: todayInputValue(),
        featured: false,
        displayOrder: Date.now(),
    });

    useEffect(() => {
        if (!isEditing || !id) return;
        getLearningMaterial(id).then(material => {
            if (!material) return;
            setForm({
                title: material.title || '',
                category: material.category || 'Self Care',
                contentType: material.contentType || (material.recipeIngredients?.length ? 'recipe' : 'tip'),
                mediaType: material.mediaType || 'video',
                videoSource: material.videoSource || 'youtube',
                videoUrl: material.videoUrl || '',
                imageUrl: material.imageUrl || '',
                body: material.body || '',
                recipeIngredients: material.recipeIngredients || [],
                status: material.status || 'draft',
                publishDate: material.publishDate || todayInputValue(),
                featured: !!material.featured,
                displayOrder: material.displayOrder ?? Date.now(),
            });
            setExistingThumbnail(material.thumbnailImage || '');
            setExistingImage(material.imageUrl || '');
            if (material.videoSource === 'cloudinary') setCloudinaryMode('url');
        });
    }, [id, isEditing]);

    useEffect(() => {
        let cancelled = false;
        getProducts()
            .then(items => {
                if (!cancelled) {
                    setProducts([...items].sort((a, b) => a.name.localeCompare(b.name)));
                }
            })
            .catch(error => {
                console.error('Could not load products for recipe ingredients:', error);
            });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (form.videoSource !== 'youtube' || !form.videoUrl || thumbnailFile || existingThumbnail) return;
        const ytId = extractYouTubeId(form.videoUrl);
        if (ytId) setThumbnailPreview(`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`);
    }, [form.videoUrl, form.videoSource, thumbnailFile, existingThumbnail]);

    const currentThumbnail = existingThumbnail || thumbnailPreview;
    const cloudinaryConfigured = !!CLOUDINARY_CLOUD_NAME && !!CLOUDINARY_UPLOAD_PRESET;

    const handleThumbnailAdd = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setThumbnailFile(file);
        setThumbnailPreview(URL.createObjectURL(file));
        setExistingThumbnail('');
        event.target.value = '';
    };

    const removeThumbnail = () => {
        setThumbnailFile(null);
        setThumbnailPreview('');
        setExistingThumbnail('');
    };

    const handleVideoFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setVideoFile(file);
        setUploadStatus('idle');
        setUploadProgress(0);
        setForm(prev => ({ ...prev, videoUrl: '' }));
        event.target.value = '';
    };

    const removeVideoFile = () => {
        setVideoFile(null);
        setUploadStatus('idle');
        setUploadProgress(0);
        setForm(prev => ({ ...prev, videoUrl: '' }));
    };

    const handleVideoUpload = async () => {
        if (!videoFile) return;
        if (!cloudinaryConfigured) {
            alert('Cloudinary is not configured. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in webapp/.env.');
            return;
        }

        setUploadStatus('uploading');
        setUploadProgress(0);
        try {
            const url = await uploadToCloudinary(videoFile, setUploadProgress);
            setForm(prev => ({ ...prev, videoUrl: url }));
            setUploadStatus('done');
        } catch (error: any) {
            setUploadStatus('error');
            alert('Video upload failed: ' + (error.message || 'Unknown error'));
        }
    };

    const handleContentImageUpload = async (file: File): Promise<string> => {
        const materialId = id || `temp_${Date.now()}`;
        return uploadLearningContentImage(file, materialId);
    };

    const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        setImageError('');
        try {
            const { width, height } = await readImageDimensions(file);
            const targetRatio = REQUIRED_IMAGE_WIDTH / REQUIRED_IMAGE_HEIGHT;
            const actualRatio = width / height;
            const is16by9 = Math.abs(actualRatio - targetRatio) < 0.01;
            if (!is16by9) {
                setImageError(`Image must have a 16:9 aspect ratio (e.g. 1920 × 1080, 1280 × 720). Selected file is ${width} × ${height}.`);
                return;
            }
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
            setExistingImage('');
        } catch (err: any) {
            setImageError(err?.message || 'Could not read image.');
        }
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview('');
        setExistingImage('');
        setImageError('');
        setForm(prev => ({ ...prev, imageUrl: '' }));
    };

    const currentImage = existingImage || imagePreview;
    const selectedProductIds = new Set(form.recipeIngredients.map(item => item.productId));
    const ingredientSearch = productSearch.trim().toLowerCase();
    const ingredientOptions = products.filter(product => {
        if (!ingredientSearch) return true;
        return product.name.toLowerCase().includes(ingredientSearch);
    });

    const setContentType = (contentType: LearningMaterialContentType) => {
        setForm(prev => ({
            ...prev,
            contentType,
            category: contentType === 'recipe' && prev.category !== 'Recipes' ? 'Recipes' : prev.category,
        }));
    };

    const addIngredient = (product: Product) => {
        if (!product.id || selectedProductIds.has(product.id)) return;
        setForm(prev => ({
            ...prev,
            recipeIngredients: [
                ...prev.recipeIngredients,
                { productId: product.id!, productName: product.name, quantity: 1 },
            ],
        }));
    };

    const removeIngredient = (productId: string) => {
        setForm(prev => ({
            ...prev,
            recipeIngredients: prev.recipeIngredients.filter(item => item.productId !== productId),
        }));
    };

    const updateIngredientQuantity = (productId: string, quantity: number) => {
        const safeQuantity = Number.isFinite(quantity) ? Math.max(1, Math.floor(quantity)) : 1;
        setForm(prev => ({
            ...prev,
            recipeIngredients: prev.recipeIngredients.map(item =>
                item.productId === productId ? { ...item, quantity: safeQuantity } : item,
            ),
        }));
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();

        if (!form.title.trim()) { alert('Tip title is required.'); return; }
        if (!form.body.trim()) { alert('Written content is required.'); return; }
        if (form.mediaType === 'video' && !form.videoUrl.trim()) { alert('Video URL is required.'); return; }
        if (form.mediaType === 'image' && !imageFile && !existingImage) {
            alert(`Please upload a ${REQUIRED_IMAGE_WIDTH} × ${REQUIRED_IMAGE_HEIGHT} image.`);
            return;
        }

        setLoading(true);
        try {
            let thumbnailImage = existingThumbnail;
            if (!thumbnailImage && !thumbnailFile && form.mediaType === 'video' && form.videoSource === 'youtube') {
                const ytId = extractYouTubeId(form.videoUrl);
                if (ytId) thumbnailImage = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
            }

            const data: Omit<LearningMaterial, 'id' | 'createdAt' | 'updatedAt'> = {
                ...form,
                thumbnailImage,
                videoUrl: form.mediaType === 'video' ? form.videoUrl : '',
                imageUrl: form.mediaType === 'image' ? (existingImage || form.imageUrl) : '',
                recipeIngredients: form.contentType === 'recipe' ? form.recipeIngredients : [],
            };

            let materialId: string;
            if (isEditing && id) {
                materialId = id;
                if (thumbnailFile) {
                    thumbnailImage = await uploadLearningThumbnail(thumbnailFile, id);
                    data.thumbnailImage = thumbnailImage;
                }
                if (form.mediaType === 'image' && imageFile) {
                    const imageUrl = await uploadLearningImage(imageFile, id);
                    data.imageUrl = imageUrl;
                    if (!thumbnailImage) data.thumbnailImage = imageUrl;
                }
                await updateLearningMaterial(id, data);
            } else {
                materialId = await addLearningMaterial(data);
                const followup: Partial<LearningMaterial> = {};
                if (thumbnailFile) {
                    followup.thumbnailImage = await uploadLearningThumbnail(thumbnailFile, materialId);
                }
                if (form.mediaType === 'image' && imageFile) {
                    const imageUrl = await uploadLearningImage(imageFile, materialId);
                    followup.imageUrl = imageUrl;
                    if (!thumbnailImage && !thumbnailFile) followup.thumbnailImage = imageUrl;
                }
                if (Object.keys(followup).length > 0) {
                    await updateLearningMaterial(materialId, followup);
                }
            }

            navigate('/admin/learning');
        } catch (error: any) {
            console.error('Learning material save error:', error);
            alert('Error saving tip: ' + (error.message || error.code || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in space-y-6 pb-12">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => navigate('/admin/learning')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{isEditing ? 'Edit Learning Tip' : 'Add Learning Tip'}</h1>
                    <p className="text-muted-foreground mt-1">Create Learn Hub materials with video and rich text content.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Thumbnail Image</CardTitle>
                        <CardDescription>Shown on Learn Hub tip cards. YouTube thumbnails can be generated automatically.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {currentThumbnail ? (
                            <div className="relative group w-full max-w-xl aspect-video rounded-md overflow-hidden border">
                                <img src={currentThumbnail} alt="" className="w-full h-full object-cover" />
                                <Button type="button" variant="destructive" size="icon" onClick={removeThumbnail}
                                    className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        ) : (
                            <Label htmlFor="thumb-upload" className="w-full max-w-xl aspect-video rounded-md border-2 border-dashed border-muted-foreground/25 hover:border-primary flex flex-col items-center justify-center cursor-pointer transition-colors group">
                                <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary mb-2" />
                                <span className="text-sm font-medium text-muted-foreground group-hover:text-primary">Upload thumbnail image</span>
                                <span className="text-xs text-muted-foreground/70 mt-1">Recommended: 1200 x 675px</span>
                                <input id="thumb-upload" type="file" accept="image/*" onChange={handleThumbnailAdd} className="hidden" />
                            </Label>
                        )}
                        {currentThumbnail && (
                            <div className="mt-3">
                                <Label htmlFor="thumb-replace" className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium cursor-pointer">
                                    <Upload className="w-4 h-4" />
                                    <span>Replace thumbnail</span>
                                    <input id="thumb-replace" type="file" accept="image/*" onChange={handleThumbnailAdd} className="hidden" />
                                </Label>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle className="text-lg">Basic Information</CardTitle></CardHeader>
                    <CardContent className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="title">Title *</Label>
                                <Input id="title" required value={form.title} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Diabetes and foot care basics" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">Category *</Label>
                                <Select value={form.category} onValueChange={(value: string | null) => value && setForm({ ...form, category: value as LearningMaterialCategory })}>
                                    <SelectTrigger id="category"><SelectValue placeholder="Select category" /></SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map(category => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="publishDate">Publish Date *</Label>
                                <Input id="publishDate" type="date" required value={form.publishDate} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, publishDate: event.target.value })} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Content Type</CardTitle>
                        <CardDescription>Recipes can include marketplace ingredients that users buy in one step.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                type="button"
                                variant={form.contentType === 'tip' ? 'default' : 'outline'}
                                onClick={() => setContentType('tip')}
                            >
                                <BookOpen className="w-4 h-4 mr-2" /> Learning Tip
                            </Button>
                            <Button
                                type="button"
                                variant={form.contentType === 'recipe' ? 'default' : 'outline'}
                                onClick={() => setContentType('recipe')}
                            >
                                <Package className="w-4 h-4 mr-2" /> Recipe
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {form.contentType === 'recipe' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Recipe Ingredients</CardTitle>
                            <CardDescription>
                                Select products from the marketplace. On mobile, inactive or out-of-stock products are skipped automatically.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            {form.recipeIngredients.length > 0 ? (
                                <div className="space-y-2">
                                    {form.recipeIngredients.map(ingredient => {
                                        const product = products.find(item => item.id === ingredient.productId);
                                        const unavailable = product ? product.active === false || product.inStock === false : false;
                                        return (
                                            <div key={ingredient.productId} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border p-3">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{ingredient.productName}</p>
                                                    <p className={`text-xs ${unavailable ? 'text-amber-600' : 'text-muted-foreground'}`}>
                                                        {unavailable ? 'Will be skipped until active and in stock' : 'Available ingredient'}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Label htmlFor={`qty-${ingredient.productId}`} className="text-xs text-muted-foreground">Qty</Label>
                                                    <Input
                                                        id={`qty-${ingredient.productId}`}
                                                        type="number"
                                                        min="1"
                                                        value={ingredient.quantity}
                                                        onChange={(event: ChangeEvent<HTMLInputElement>) => updateIngredientQuantity(ingredient.productId, Number(event.target.value))}
                                                        className="h-8 w-20"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => removeIngredient(ingredient.productId)}
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
                                    No ingredients selected yet. Add products below to power the mobile “Buy ingredients” button.
                                </div>
                            )}

                            <div className="space-y-3">
                                <Input
                                    value={productSearch}
                                    onChange={(event: ChangeEvent<HTMLInputElement>) => setProductSearch(event.target.value)}
                                    placeholder="Search marketplace products..."
                                />
                                <div className="max-h-72 overflow-y-auto rounded-lg border divide-y">
                                    {ingredientOptions.length === 0 ? (
                                        <div className="p-4 text-sm text-muted-foreground">No marketplace products found.</div>
                                    ) : (
                                        ingredientOptions.map(product => {
                                            const selected = !!product.id && selectedProductIds.has(product.id);
                                            const unavailable = product.active === false || product.inStock === false;
                                            return (
                                                <div key={product.id} className="flex items-center gap-3 p-3">
                                                    {product.images?.[0] ? (
                                                        <img src={product.images[0]} alt="" className="h-10 w-10 rounded-md object-cover border" />
                                                    ) : (
                                                        <div className="h-10 w-10 rounded-md bg-muted border flex items-center justify-center">
                                                            <Package className="h-4 w-4 text-muted-foreground" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">{product.name}</p>
                                                        <p className={`text-xs ${unavailable ? 'text-amber-600' : 'text-muted-foreground'}`}>
                                                            {product.priceFormatted} · {unavailable ? 'Unavailable now' : 'Active and in stock'}
                                                        </p>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant={selected ? 'secondary' : 'outline'}
                                                        disabled={selected || !product.id}
                                                        onClick={() => addIngredient(product)}
                                                    >
                                                        {selected ? 'Added' : <><Plus className="w-3.5 h-3.5 mr-1.5" /> Add</>}
                                                    </Button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Media Type</CardTitle>
                        <CardDescription>Choose whether this tip uses a video or a single image.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                type="button"
                                variant={form.mediaType === 'video' ? 'default' : 'outline'}
                                onClick={() => setForm({ ...form, mediaType: 'video' })}
                            >
                                <VideoIcon className="w-4 h-4 mr-2" /> Video
                            </Button>
                            <Button
                                type="button"
                                variant={form.mediaType === 'image' ? 'default' : 'outline'}
                                onClick={() => setForm({ ...form, mediaType: 'image' })}
                            >
                                <ImageIcon className="w-4 h-4 mr-2" /> Image only
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {form.mediaType === 'image' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Image *</CardTitle>
                            <CardDescription>Upload any 16:9 image (e.g. {REQUIRED_IMAGE_WIDTH} × {REQUIRED_IMAGE_HEIGHT}, 1280 × 720). Any resolution works.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {currentImage ? (
                                <div className="relative group w-full max-w-sm rounded-md overflow-hidden border" style={{ aspectRatio: `${REQUIRED_IMAGE_WIDTH} / ${REQUIRED_IMAGE_HEIGHT}` }}>
                                    <img src={currentImage} alt="" className="w-full h-full object-cover" />
                                    <Button type="button" variant="destructive" size="icon" onClick={removeImage}
                                        className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ) : (
                                <Label htmlFor="image-upload" className="w-full max-w-sm rounded-md border-2 border-dashed border-muted-foreground/25 hover:border-primary flex flex-col items-center justify-center cursor-pointer transition-colors group p-8" style={{ aspectRatio: `${REQUIRED_IMAGE_WIDTH} / ${REQUIRED_IMAGE_HEIGHT}` }}>
                                    <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary mb-2" />
                                    <span className="text-sm font-medium text-muted-foreground group-hover:text-primary">Upload image</span>
                                    <span className="text-xs text-muted-foreground/70 mt-1">16:9 aspect ratio, any resolution</span>
                                    <input id="image-upload" type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                                </Label>
                            )}
                            {currentImage && (
                                <div>
                                    <Label htmlFor="image-replace" className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium cursor-pointer">
                                        <Upload className="w-4 h-4" />
                                        <span>Replace image</span>
                                        <input id="image-replace" type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                                    </Label>
                                </div>
                            )}
                            {imageError && (
                                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                                    <p className="text-sm text-destructive">{imageError}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {form.mediaType === 'video' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Video</CardTitle>
                        <CardDescription>Add a YouTube URL or upload a file through Cloudinary.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="flex gap-3">
                            <Button
                                type="button"
                                variant={form.videoSource === 'youtube' ? 'default' : 'outline'}
                                className={`flex-1 ${form.videoSource === 'youtube' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}`}
                                onClick={() => {
                                    setForm({ ...form, videoSource: 'youtube', videoUrl: '' });
                                    removeVideoFile();
                                }}
                            >
                                <Youtube className="w-5 h-5 mr-2" /> YouTube
                            </Button>
                            <Button
                                type="button"
                                variant={form.videoSource === 'cloudinary' ? 'default' : 'outline'}
                                className={`flex-1 ${form.videoSource === 'cloudinary' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
                                onClick={() => {
                                    setForm({ ...form, videoSource: 'cloudinary', videoUrl: '' });
                                    setCloudinaryMode('url');
                                }}
                            >
                                <Cloud className="w-5 h-5 mr-2" /> Uploaded File
                            </Button>
                        </div>

                        {form.videoSource === 'youtube' && (
                            <div className="space-y-2">
                                <Label htmlFor="videoUrl">YouTube URL *</Label>
                                <Input id="videoUrl" required value={form.videoUrl} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, videoUrl: event.target.value })} placeholder="https://www.youtube.com/watch?v=..." />
                                <p className="text-xs text-muted-foreground">The mobile app will play this as an embedded YouTube video.</p>
                            </div>
                        )}

                        {form.videoSource === 'cloudinary' && (
                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <Button type="button" size="sm" variant={cloudinaryMode === 'url' ? 'default' : 'secondary'} onClick={() => { setCloudinaryMode('url'); removeVideoFile(); }}>
                                        Paste URL
                                    </Button>
                                    <Button type="button" size="sm" variant={cloudinaryMode === 'upload' ? 'default' : 'secondary'} onClick={() => { setCloudinaryMode('upload'); setForm({ ...form, videoUrl: '' }); }}>
                                        Upload File
                                    </Button>
                                </div>

                                {cloudinaryMode === 'url' && (
                                    <div className="space-y-2">
                                        <Label htmlFor="cloudUrl">Uploaded Video URL *</Label>
                                        <Input id="cloudUrl" required value={form.videoUrl} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, videoUrl: event.target.value })} placeholder="https://res.cloudinary.com/..." />
                                    </div>
                                )}

                                {cloudinaryMode === 'upload' && (
                                    <div className="space-y-3">
                                        {!cloudinaryConfigured && (
                                            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 flex items-start gap-3">
                                                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                                                <p className="text-sm text-destructive">
                                                    Cloudinary upload is not configured. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in webapp/.env.
                                                </p>
                                            </div>
                                        )}

                                        {!videoFile && (
                                            <Label htmlFor="video-file" className={`w-full rounded-md border-2 border-dashed py-8 flex flex-col items-center justify-center cursor-pointer transition-colors group ${cloudinaryConfigured ? 'border-muted-foreground/25 hover:border-primary' : 'opacity-50 pointer-events-none'}`}>
                                                <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary mb-2" />
                                                <span className="text-sm font-medium text-muted-foreground group-hover:text-primary">Select video file</span>
                                                <input id="video-file" type="file" accept="video/*" onChange={handleVideoFileSelect} className="hidden" />
                                            </Label>
                                        )}

                                        {videoFile && (
                                            <div className="bg-muted/50 rounded-md p-4 space-y-3 border">
                                                <div className="flex items-center gap-3">
                                                    <Film className="w-5 h-5 text-primary shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">{videoFile.name}</p>
                                                        <p className="text-xs text-muted-foreground">{(videoFile.size / (1024 * 1024)).toFixed(1)} MB</p>
                                                    </div>
                                                    {uploadStatus !== 'uploading' && (
                                                        <Button type="button" variant="ghost" size="icon" onClick={removeVideoFile} className="h-8 w-8">
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                                {uploadStatus === 'uploading' && (
                                                    <div>
                                                        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                                                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-1">Uploading... {uploadProgress}%</p>
                                                    </div>
                                                )}
                                                {uploadStatus === 'done' && <p className="text-xs font-medium text-emerald-600 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Upload complete</p>}
                                                {uploadStatus === 'error' && <p className="text-xs font-medium text-destructive flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Upload failed</p>}
                                                {(uploadStatus === 'idle' || uploadStatus === 'error') && (
                                                    <Button type="button" onClick={handleVideoUpload}>
                                                        <Cloud className="w-4 h-4 mr-2" /> Upload to Cloudinary
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Written Content *</CardTitle>
                        <CardDescription>Use headings, paragraphs, bold text, bullets, images, and embedded videos.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RichTextEditor
                            value={form.body}
                            onChange={value => setForm({ ...form, body: value })}
                            placeholder="Write the full learning tip..."
                            onImageUpload={handleContentImageUpload}
                            minHeight="420px"
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex flex-col gap-5 p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div>
                                    <p className="font-medium">Published status</p>
                                    <p className="text-sm text-muted-foreground">
                                        {form.status === 'published' ? 'Visible in the mobile Learn Hub' : 'Saved as admin-only draft'}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant={form.status === 'published' ? 'default' : 'secondary'}
                                    onClick={() => setForm({ ...form, status: form.status === 'published' ? 'draft' : 'published' })}
                                    className={form.status === 'published' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                                >
                                    {form.status === 'published' ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                                    {form.status === 'published' ? 'Published' : 'Draft'}
                                </Button>
                            </div>

                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div>
                                    <p className="font-medium">Pin as featured</p>
                                    <p className="text-sm text-muted-foreground">Featured tips appear first in the feed.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Pin className="w-4 h-4 text-muted-foreground" />
                                    <Switch
                                        checked={form.featured}
                                        onCheckedChange={(checked: boolean) => setForm({ ...form, featured: checked })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                {loading ? 'Saving...' : isEditing ? 'Update Tip' : 'Create Tip'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}
