import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addProduct, getProduct, updateProduct, uploadProductImage, type Product, type ProductBadge } from '../../services/api';
import { RichTextEditor } from '../../components/RichTextEditor';
import { ArrowLeft, Upload, Loader2, Save, X, Plus, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const BADGE_OPTIONS: { type: string; label: string; displayLabel: string }[] = [
    { type: 'gf', label: 'Gluten\nfree', displayLabel: 'Gluten Free' },
    { type: 'vegan', label: 'Vegan', displayLabel: 'Vegan' },
    { type: 'organic', label: '100%\norganic', displayLabel: 'Organic' },
    { type: 'sugar-free', label: 'Sugar\nfree', displayLabel: 'Sugar Free' },
    { type: 'non-gmo', label: 'Non\nGMO', displayLabel: 'Non-GMO' },
    { type: 'dairy-free', label: 'Dairy\nfree', displayLabel: 'Dairy Free' },
];

function formatPrice(price: number, currency: 'RWF' | 'USD'): string {
    if (currency === 'USD') return `$${price.toFixed(2)} USD`;
    return `${price.toLocaleString('en-US')} RWF`;
}

export function AddProduct() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = !!id;

    const [loading, setLoading] = useState(false);
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [existingImages, setExistingImages] = useState<string[]>([]);
    const [newBenefit, setNewBenefit] = useState('');

    const [form, setForm] = useState({
        name: '',
        price: 0,
        currency: 'RWF' as 'RWF' | 'USD',
        description: '',
        benefits: [] as string[],
        ingredients: '',
        directions: '',
        warning: '',
        badges: [] as ProductBadge[],
        deliveryDays: 3,
        active: true,
        inStock: true,
    });

    useEffect(() => {
        if (isEditing && id) {
            getProduct(id).then(p => {
                if (p) {
                    setForm({
                        name: p.name,
                        price: p.price,
                        currency: p.currency || 'USD',
                        description: p.description || '',
                        benefits: p.benefits || [],
                        ingredients: p.ingredients || '',
                        directions: p.directions || '',
                        warning: p.warning || '',
                        badges: p.badges || [],
                        deliveryDays: p.deliveryDays || 3,
                        active: p.active ?? true,
                        inStock: p.inStock ?? true,
                    });
                    setExistingImages(p.images || []);
                }
            });
        }
    }, [id, isEditing]);

    const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const totalCount = existingImages.length + imageFiles.length + files.length;
        if (totalCount > 4) {
            alert('Maximum 4 images allowed.');
            return;
        }
        setImageFiles(prev => [...prev, ...files]);
        setImagePreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
        e.target.value = '';
    };

    const removeNewImage = (index: number) => {
        setImageFiles(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    const removeExistingImage = (index: number) => {
        setExistingImages(prev => prev.filter((_, i) => i !== index));
    };

    const toggleBadge = (type: string) => {
        setForm(prev => {
            const exists = prev.badges.find(b => b.type === type);
            if (exists) {
                return { ...prev, badges: prev.badges.filter(b => b.type !== type) };
            }
            const opt = BADGE_OPTIONS.find(o => o.type === type)!;
            return {
                ...prev,
                badges: [...prev.badges, { id: type, label: opt.label, type: opt.type }],
            };
        });
    };

    const addBenefit = () => {
        const val = newBenefit.trim();
        if (!val) return;
        setForm(prev => ({ ...prev, benefits: [...prev.benefits, val] }));
        setNewBenefit('');
    };

    const removeBenefit = (index: number) => {
        setForm(prev => ({ ...prev, benefits: prev.benefits.filter((_, i) => i !== index) }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) { alert('Product name is required.'); return; }

        const safePrice = isNaN(form.price) ? 0 : form.price;
        const safeDeliveryDays = isNaN(form.deliveryDays) ? 3 : form.deliveryDays;

        setLoading(true);
        try {
            const priceFormatted = formatPrice(safePrice, form.currency);
            const productData: Omit<Product, 'id' | 'createdAt'> = {
                ...form,
                price: safePrice,
                deliveryDays: safeDeliveryDays,
                priceFormatted,
                images: existingImages,
                rating: 0,
                reviewCount: 0,
            };

            let docId: string;
            if (isEditing && id) {
                docId = id;
                // Upload new images
                const uploadedUrls = await Promise.all(
                    imageFiles.map(f => uploadProductImage(f, id))
                );
                productData.images = [...existingImages, ...uploadedUrls];
                await updateProduct(id, productData);
            } else {
                productData.images = [];
                docId = await addProduct(productData);
                // Upload images using the new doc ID
                if (imageFiles.length > 0) {
                    const uploadedUrls = await Promise.all(
                        imageFiles.map(f => uploadProductImage(f, docId))
                    );
                    await updateProduct(docId, { images: uploadedUrls });
                }
            }
            navigate('/admin/products');
        } catch (e: any) {
            console.error('Product save error:', e);
            alert('Error saving product: ' + (e.message || e.code || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    const totalImages = existingImages.length + imageFiles.length;

    return (
        <div className="max-w-4xl mx-auto animate-fade-in space-y-6 pb-12">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => navigate('/admin/products')}>
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{isEditing ? 'Edit Product' : 'Add New Product'}</h1>
                    <p className="text-muted-foreground mt-1">Fill in the product details below.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Product Images */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Product Images</CardTitle>
                        <CardDescription>Upload up to 4 images. First image is the main thumbnail.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {/* Existing images */}
                            {existingImages.map((url, i) => (
                                <div key={`existing-${i}`} className="relative group aspect-square rounded-md overflow-hidden border">
                                    <img src={url} alt="" className="w-full h-full object-cover" />
                                    <Button type="button" variant="destructive" size="icon" onClick={() => removeExistingImage(i)}
                                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <X className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            ))}
                            {/* New image previews */}
                            {imagePreviews.map((url, i) => (
                                <div key={`new-${i}`} className="relative group aspect-square rounded-md overflow-hidden border-2 border-primary ring-2 ring-primary/20">
                                    <img src={url} alt="" className="w-full h-full object-cover" />
                                    <Button type="button" variant="destructive" size="icon" onClick={() => removeNewImage(i)}
                                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <X className="w-3.5 h-3.5" />
                                    </Button>
                                    <span className="absolute bottom-2 left-2 text-[10px] font-medium bg-primary text-primary-foreground px-1.5 py-0.5 rounded">NEW</span>
                                </div>
                            ))}
                            {/* Upload button */}
                            {totalImages < 4 && (
                                <Label htmlFor="image-upload" className="aspect-square rounded-md border-2 border-dashed border-muted-foreground/25 hover:border-primary flex flex-col items-center justify-center cursor-pointer transition-colors group">
                                    <Upload className="w-6 h-6 text-muted-foreground group-hover:text-primary mb-2" />
                                    <span className="text-xs font-medium text-muted-foreground group-hover:text-primary">Add Image</span>
                                    <input id="image-upload" type="file" accept="image/*" multiple onChange={handleImageAdd} className="hidden" />
                                </Label>
                            )}
                        </div>
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
                                <Label htmlFor="name">Product Name *</Label>
                                <Input id="name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ashwagandha Supplement" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="price">Price *</Label>
                                <Input id="price" required type="number" step="0.01" min="0" value={form.price || ''} onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} placeholder="0.00" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="currency">Currency *</Label>
                                <Select value={form.currency} onValueChange={val => setForm({ ...form, currency: val as 'RWF' | 'USD' })}>
                                    <SelectTrigger id="currency">
                                        <SelectValue placeholder="Select currency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="RWF">RWF (Rwandan Franc)</SelectItem>
                                        <SelectItem value="USD">USD ($)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="deliveryDays">Delivery Time (business days)</Label>
                                <Input id="deliveryDays" type="number" min="1" value={form.deliveryDays} onChange={e => setForm({ ...form, deliveryDays: parseInt(e.target.value) || 3 })} />
                                <p className="text-[11px] text-muted-foreground">Shown to customers as "Delivered within X business days"</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Description */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Product Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-md overflow-hidden bg-background">
                            <RichTextEditor
                                value={form.description}
                                onChange={v => setForm({ ...form, description: v })}
                                placeholder="Describe the product..."
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Benefits */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Benefits</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Input value={newBenefit} onChange={e => setNewBenefit(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addBenefit(); } }} placeholder="Add a benefit..." className="flex-1" />
                            <Button type="button" onClick={addBenefit}>
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                        {form.benefits.length > 0 && (
                            <div className="space-y-2">
                                {form.benefits.map((b, i) => (
                                    <div key={i} className="flex items-center gap-3 bg-muted/50 rounded-md px-4 py-2 text-sm border">
                                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                                            {i + 1}
                                        </span>
                                        <span className="flex-1 text-foreground leading-tight">{b}</span>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeBenefit(i)} className="h-6 w-6 text-muted-foreground hover:text-destructive">
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Ingredients */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Ingredients</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-md overflow-hidden bg-background">
                            <RichTextEditor
                                value={form.ingredients}
                                onChange={v => setForm({ ...form, ingredients: v })}
                                placeholder="List the ingredients..."
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Directions */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Directions for Use</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-md overflow-hidden bg-background">
                            <RichTextEditor
                                value={form.directions}
                                onChange={v => setForm({ ...form, directions: v })}
                                placeholder="How should the customer use this product..."
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Warnings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Warnings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Textarea rows={3} value={form.warning} onChange={e => setForm({ ...form, warning: e.target.value })} placeholder="Any health or usage warnings..." />
                    </CardContent>
                </Card>

                {/* Features / Badges */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Features & Tags</CardTitle>
                        <CardDescription>Select all that apply to this product</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-3">
                            {BADGE_OPTIONS.map(opt => {
                                const active = form.badges.some(b => b.type === opt.type);
                                return (
                                    <Button
                                        key={opt.type}
                                        type="button"
                                        variant={active ? "default" : "outline"}
                                        onClick={() => toggleBadge(opt.type)}
                                    >
                                        {opt.displayLabel}
                                    </Button>
                                );
                            })}
                        </div>
                        {/* Delivery Info Visual */}
                        <div className="mt-6 bg-primary/5 rounded-md border border-primary/20 px-4 py-3 flex items-center gap-3">
                            <Package className="w-5 h-5 text-primary shrink-0" />
                            <p className="text-sm text-primary/80">
                                Customers will see: <strong>"Orders are processed and delivered within {form.deliveryDays} business days."</strong>
                            </p>
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
                            <Label htmlFor="active" className="cursor-pointer">Product is active and visible in the store</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="inStock"
                                checked={form.inStock}
                                onCheckedChange={checked => setForm({ ...form, inStock: checked })}
                            />
                            <Label htmlFor="inStock" className="cursor-pointer">Product is in stock and can be bought from recipes</Label>
                        </div>
                        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            {loading ? 'Saving...' : isEditing ? 'Update Product' : 'Add Product'}
                        </Button>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}
