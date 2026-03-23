import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getProviders, updateProvider, uploadProviderImage, type Provider } from '../../services/api';
import { Save, Upload, Loader2, CheckCircle2 } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function PhysicianProfile() {
    const { user } = useAuth();
    const [provider, setProvider] = useState<Provider | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState('');

    const [form, setForm] = useState({
        about: '', availableDays: [] as string[],
        availableHours: { start: '09:00', end: '17:00' },
        timeSlotDuration: 30, price: '',
    });

    useEffect(() => {
        if (!user) return;
        (async () => {
            try {
                const providers = await getProviders();
                const mine = providers.find(p => p.email === user.email || p.uid === user.uid);
                if (mine) {
                    setProvider(mine);
                    setForm({
                        about: mine.about || '',
                        availableDays: mine.availableDays || [],
                        availableHours: mine.availableHours || { start: '09:00', end: '17:00' },
                        timeSlotDuration: mine.timeSlotDuration || 30,
                        price: mine.price || '',
                    });
                    setImagePreview(mine.profileImage || '');
                }
            } catch (e) { console.error(e); }
            setLoading(false);
        })();
    }, [user]);

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
        if (!provider?.id) return;
        setSaving(true);
        try {
            let profileImage = provider.profileImage;
            if (imageFile) {
                profileImage = await uploadProviderImage(imageFile, provider.id);
            }
            await updateProvider(provider.id, { ...form, profileImage });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="w-8 h-8 border-[3px] border-blue-100 border-t-blue-600 rounded-full animate-spin" />
            </div>
        );
    }

    if (!provider) {
        return (
            <div className="flex items-center justify-center h-96 text-slate-400">
                <p>No provider profile found. Please contact your administrator.</p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
                <p className="text-slate-500 mt-1">Update your availability and profile information</p>
            </div>

            {saved && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-medium animate-fade-in">
                    <CheckCircle2 className="w-5 h-5" /> Profile updated successfully!
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Profile Card */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                    <div className="flex items-center gap-6">
                        {imagePreview ? (
                            <img src={imagePreview} alt="" className="w-20 h-20 rounded-xl object-cover" />
                        ) : (
                            <div className="w-20 h-20 rounded-xl bg-blue-50 flex items-center justify-center">
                                <span className="text-2xl font-bold text-blue-600">{provider.name[0]}</span>
                            </div>
                        )}
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-slate-900">{provider.name}</h2>
                            <p className="text-slate-500">{provider.title || provider.specialty}</p>
                            <p className="text-sm text-slate-400 mt-1">{provider.email}</p>
                        </div>
                        <label className="cursor-pointer inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-4 py-2.5 rounded-xl transition-colors text-sm">
                            <Upload className="w-4 h-4" /> Update Photo
                            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                        </label>
                    </div>
                </div>

                {/* About */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-900 mb-3">About / Session Description</h2>
                    <textarea rows={4} value={form.about} onChange={e => setForm({ ...form, about: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 resize-none"
                        placeholder="Describe your expertise and sessions..." />
                </div>

                {/* Availability */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-5">
                    <h2 className="text-sm font-semibold text-slate-900">Availability</h2>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-3">Available Days</label>
                        <div className="flex flex-wrap gap-2">
                            {DAYS.map(day => (
                                <button key={day} type="button" onClick={() => toggleDay(day)}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${form.availableDays.includes(day)
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}>
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

                {/* Price & Submit */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex items-center justify-between">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1.5">Price per session</label>
                        <input value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
                            className="border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 w-40" placeholder="$120" />
                    </div>
                    <button type="submit" disabled={saving}
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50">
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
}
