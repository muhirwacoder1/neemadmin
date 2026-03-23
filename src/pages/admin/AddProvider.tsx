import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addProvider, getProvider, updateProvider, uploadProviderImage, createPhysicianAccount, type Provider } from '../../services/api';
import { ArrowLeft, Upload, Loader2, Save, KeyRound } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SPECIALTIES = ['Cardiology', 'Dermatology', 'Endocrinology', 'Psychiatry', 'Nutrition', 'General Practice', 'Pediatrics', 'Neurology'];

export function AddProvider() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = !!id;

    const [loading, setLoading] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState('');
    const [password, setPassword] = useState('');
    const [form, setForm] = useState({
        name: '', title: '', specialty: 'Endocrinology', email: '', phone: '',
        about: '', profileImage: '', availableDays: [] as string[],
        availableHours: { start: '09:00', end: '17:00' },
        timeSlotDuration: 30, rating: 4.5, experience: '', price: '', active: true,
    });

    useEffect(() => {
        if (isEditing && id) {
            getProvider(id).then(p => {
                if (p) {
                    setForm({
                        name: p.name, title: p.title, specialty: p.specialty, email: p.email,
                        phone: p.phone, about: p.about, profileImage: p.profileImage,
                        availableDays: p.availableDays || [],
                        availableHours: p.availableHours || { start: '09:00', end: '17:00' },
                        timeSlotDuration: p.timeSlotDuration || 30,
                        rating: p.rating || 4.5, experience: p.experience, price: p.price,
                        active: p.active ?? true,
                    });
                    setImagePreview(p.profileImage || '');
                }
            });
        }
    }, [id, isEditing]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const toggleDay = (day: string) => {
        setForm(prev => ({
            ...prev,
            availableDays: prev.availableDays.includes(day)
                ? prev.availableDays.filter(d => d !== day)
                : [...prev.availableDays, day],
        }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            let profileImage = form.profileImage;

            if (isEditing && id) {
                if (imageFile) {
                    profileImage = await uploadProviderImage(imageFile, id);
                }
                await updateProvider(id, { ...form, profileImage });
            } else {
                const docId = await addProvider({ ...form, profileImage: '' });
                if (imageFile) {
                    profileImage = await uploadProviderImage(imageFile, docId);
                    await updateProvider(docId, { profileImage });
                }
                // Create Firebase Auth account for the physician
                if (password) {
                    await createPhysicianAccount({
                        email: form.email,
                        password,
                        name: form.name,
                        providerId: docId,
                    });
                }
            }
            navigate('/admin/providers');
        } catch (e: any) {
            alert('Error: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => navigate('/admin/providers')}
                    className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        {isEditing ? 'Edit Provider' : 'Add New Provider'}
                    </h1>
                    <p className="text-slate-500 mt-0.5">Fill in the healthcare provider details</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Photo Upload */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-900 mb-4">Profile Photo</h2>
                    <div className="flex items-center gap-6">
                        {imagePreview ? (
                            <img src={imagePreview} alt="" className="w-20 h-20 rounded-xl object-cover" />
                        ) : (
                            <div className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center">
                                <Upload className="w-8 h-8 text-slate-400" />
                            </div>
                        )}
                        <div>
                            <label className="cursor-pointer inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-4 py-2.5 rounded-xl transition-colors text-sm">
                                <Upload className="w-4 h-4" />
                                Choose photo
                                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                            </label>
                            <p className="text-xs text-slate-400 mt-2">JPG, PNG up to 5MB</p>
                        </div>
                    </div>
                </div>

                {/* Basic Info */}
                <div className="bg-white rounded-2xl border border-slate-100/60 p-6 shadow-soft space-y-5">
                    <h2 className="text-sm font-semibold text-slate-900">Basic Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Full Name *</label>
                            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10" placeholder="Dr. Sarah Lin" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Title *</label>
                            <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10" placeholder="Board-Certified Endocrinologist" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Specialty *</label>
                            <select required value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 bg-white">
                                {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Experience</label>
                            <input value={form.experience} onChange={e => setForm({ ...form, experience: e.target.value })}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10" placeholder="10 Years" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Email *</label>
                            <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10" placeholder="dr.sarah@clinic.com" />
                        </div>
                        {!isEditing && (
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                                    <span className="inline-flex items-center gap-1.5">
                                        <KeyRound className="w-3.5 h-3.5" /> Login Password *
                                    </span>
                                </label>
                                <input required type="password" value={password} onChange={e => setPassword(e.target.value)}
                                    minLength={6}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10" placeholder="Min 6 characters" />
                                <p className="text-xs text-slate-400 mt-1.5">This creates the physician's login credentials</p>
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Price per session</label>
                            <input value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10" placeholder="$120" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1.5">About / Session Description *</label>
                        <textarea required rows={4} value={form.about} onChange={e => setForm({ ...form, about: e.target.value })}
                            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 resize-none" placeholder="Describe the healthcare provider's expertise and session details..." />
                    </div>
                </div>

                {/* Availability */}
                <div className="bg-white rounded-2xl border border-slate-100/60 p-6 shadow-soft space-y-5">
                    <h2 className="text-sm font-semibold text-slate-900">Availability</h2>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-3">Available Days</label>
                        <div className="flex flex-wrap gap-2">
                            {DAYS.map(day => (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => toggleDay(day)}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${form.availableDays.includes(day)
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    {day.slice(0, 3)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Start Time</label>
                            <input type="time" value={form.availableHours.start}
                                onChange={e => setForm({ ...form, availableHours: { ...form.availableHours, start: e.target.value } })}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">End Time</label>
                            <input type="time" value={form.availableHours.end}
                                onChange={e => setForm({ ...form, availableHours: { ...form.availableHours, end: e.target.value } })}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Slot Duration</label>
                            <select value={form.timeSlotDuration} onChange={e => setForm({ ...form, timeSlotDuration: Number(e.target.value) })}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 bg-white">
                                <option value={15}>15 minutes</option>
                                <option value={30}>30 minutes</option>
                                <option value={45}>45 minutes</option>
                                <option value={60}>60 minutes</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Status & Actions */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex items-center justify-between">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })}
                            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm font-medium text-slate-700">Provider is active and visible to patients</span>
                    </label>
                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        {loading ? 'Saving...' : isEditing ? 'Update Provider' : 'Add Provider'}
                    </button>
                </div>
            </form>
        </div>
    );
}
