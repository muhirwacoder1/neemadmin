import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addProduct, getProduct, updateProduct, uploadProductImage, type Product, type ProductBadge } from '../../services/api';
import { RichTextEditor } from '../../components/RichTextEditor';
import { ArrowLeft, Upload, Loader2, Save, X, Plus, Package } from 'lucide-react';

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
        currency: 'USD' as 'RWF' | 'USD',
        description: '',
        benefits: [] as string[],
        ingredients: '',
        directions: '',
        warning: '',
        badges: [] as ProductBadge[],
        deliveryDays: 3,
        active: true,
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
        <div className="max-w-3xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button onClick={() => navigate('/admin/products')} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{isEditing ? 'Edit Product' : 'Add New Product'}</h1>
                    <p className="text-slate-500 mt-0.5">Fill in the product details below</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Product Images */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-900 mb-1">Product Images</h2>
                    <p className="text-xs text-slate-400 mb-4">Upload up to 4 images. First image is the main thumbnail.</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Existing images */}
                        {existingImages.map((url, i) => (
                            <div key={`existing-${i}`} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200">
                                <img src={url} alt="" className="w-full h-full object-cover" />
                                <button type="button" onClick={() => removeExistingImage(i)}
                                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                        {/* New image previews */}
                        {imagePreviews.map((url, i) => (
                            <div key={`new-${i}`} className="relative group aspect-square rounded-xl overflow-hidden border border-blue-200 ring-2 ring-blue-100">
                                <img src={url} alt="" className="w-full h-full object-cover" />
                                <button type="button" onClick={() => removeNewImage(i)}
                                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                                <span className="absolute bottom-2 left-2 text-[10px] font-medium bg-blue-600 text-white px-1.5 py-0.5 rounded">NEW</span>
                            </div>
                        ))}
                        {/* Upload button */}
                        {totalImages < 4 && (
                            <label className="aspect-square rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-400 flex flex-col items-center justify-center cursor-pointer transition-colors group">
                                <Upload className="w-6 h-6 text-slate-300 group-hover:text-blue-400 mb-1" />
                                <span className="text-[11px] text-slate-400 group-hover:text-blue-500">Add Image</span>
                                <input type="file" accept="image/*" multiple onChange={handleImageAdd} className="hidden" />
                            </label>
                        )}
                    </div>
                </div>

                {/* Basic Info */}
                <div className="bg-white rounded-2xl border border-slate-100/60 p-6 shadow-soft space-y-5">
                    <h2 className="text-sm font-semibold text-slate-900">Basic Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Product Name *</label>
                            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                                placeholder="e.g. Ashwagandha Supplement" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Price *</label>
                            <input required type="number" step="0.01" min="0" value={form.price || ''}
                                onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                                placeholder="0.00" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Currency *</label>
                            <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value as 'RWF' | 'USD' })}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 bg-white">
                                <option value="USD">USD ($)</option>
                                <option value="RWF">RWF (Rwandan Franc)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Delivery Time (business days)</label>
                            <input type="number" min="1" value={form.deliveryDays}
                                onChange={e => setForm({ ...form, deliveryDays: parseInt(e.target.value) || 3 })}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10" />
                            <p className="text-xs text-slate-400 mt-1.5">Shown to customers as "Delivered within X business days"</p>
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div className="bg-white rounded-2xl border border-slate-100/60 p-6 shadow-soft space-y-5">
                    <h2 className="text-sm font-semibold text-slate-900">Product Description</h2>
                    <RichTextEditor
                        value={form.description}
                        onChange={v => setForm({ ...form, description: v })}
                        placeholder="Describe the product..."
                    />
                </div>

                {/* Benefits */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
                    <h2 className="text-sm font-semibold text-slate-900">Benefits</h2>
                    <div className="flex gap-2">
                        <input value={newBenefit} onChange={e => setNewBenefit(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addBenefit(); } }}
                            placeholder="Add a benefit..."
                            className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10" />
                        <button type="button" onClick={addBenefit}
                            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors">
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                    {form.benefits.length > 0 && (
                        <div className="space-y-2">
                            {form.benefits.map((b, i) => (
                                <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-lg px-4 py-2.5">
                                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold shrink-0">
                                        {i + 1}
                                    </span>
                                    <span className="flex-1 text-sm text-slate-700">{b}</span>
                                    <button type="button" onClick={() => removeBenefit(i)}
                                        className="text-slate-300 hover:text-red-500 transition-colors">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Ingredients */}
                <div className="bg-white rounded-2xl border border-slate-100/60 p-6 shadow-soft space-y-5">
                    <h2 className="text-sm font-semibold text-slate-900">Ingredients</h2>
                    <RichTextEditor
                        value={form.ingredients}
                        onChange={v => setForm({ ...form, ingredients: v })}
                        placeholder="List the ingredients..."
                    />
                </div>

                {/* Directions */}
                <div className="bg-white rounded-2xl border border-slate-100/60 p-6 shadow-soft space-y-5">
                    <h2 className="text-sm font-semibold text-slate-900">Directions for Use</h2>
                    <RichTextEditor
                        value={form.directions}
                        onChange={v => setForm({ ...form, directions: v })}
                        placeholder="How should the customer use this product..."
                    />
                </div>

                {/* Warning */}
                <div className="bg-white rounded-2xl border border-slate-100/60 p-6 shadow-soft space-y-5">
                    <h2 className="text-sm font-semibold text-slate-900">Warnings</h2>
                    <textarea rows={3} value={form.warning} onChange={e => setForm({ ...form, warning: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 resize-none"
                        placeholder="Any health or usage warnings..." />
                </div>

                {/* Features / Badges */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
                    <h2 className="text-sm font-semibold text-slate-900">Features & Tags</h2>
                    <p className="text-xs text-slate-400">Select all that apply to this product</p>
                    <div className="flex flex-wrap gap-3">
                        {BADGE_OPTIONS.map(opt => {
                            const active = form.badges.some(b => b.type === opt.type);
                            return (
                                <button
                                    key={opt.type}
                                    type="button"
                                    onClick={() => toggleBadge(opt.type)}
                                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${active
                                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    {opt.displayLabel}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Delivery Info */}
                <div className="bg-blue-50 rounded-2xl border border-blue-100 px-6 py-4 flex items-center gap-3">
                    <Package className="w-5 h-5 text-blue-600 shrink-0" />
                    <p className="text-sm text-blue-700">
                        Customers will see: <strong>"Orders are processed and delivered within {form.deliveryDays} business days."</strong>
                    </p>
                </div>

                {/* Status & Actions */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex items-center justify-between">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })}
                            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm font-medium text-slate-700">Product is active and visible in the store</span>
                    </label>
                    <button type="submit" disabled={loading}
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        {loading ? 'Saving...' : isEditing ? 'Update Product' : 'Add Product'}
                    </button>
                </div>
            </form>
        </div>
    );
}
