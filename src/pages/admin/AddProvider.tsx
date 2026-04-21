import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addProvider, getProvider, updateProvider, uploadProviderImage, createPhysicianAccount, type Provider } from '../../services/api';
import { ArrowLeft, Upload, Loader2, Save, KeyRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SPECIALTIES = ['Endocrinology', 'General Practitioner', 'Nutritionist', 'Nurse', 'P & O', 'Physiotherapist', 'Fitness Coach'];

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
        <div className="max-w-4xl mx-auto animate-fade-in space-y-6 pb-12">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => navigate('/admin/providers')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {isEditing ? 'Edit Provider' : 'Add New Provider'}
                    </h1>
                    <p className="text-muted-foreground mt-1">Fill in the healthcare provider details below.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Photo Upload */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Profile Photo</CardTitle>
                        <CardDescription>Upload a professional headshot</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-6">
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" className="w-24 h-24 rounded-full object-cover border" />
                            ) : (
                                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border">
                                    <Upload className="w-8 h-8 text-muted-foreground/50" />
                                </div>
                            )}
                            <div>
                                <Label htmlFor="photo-upload" className="cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
                                    <Upload className="w-4 h-4 mr-2" />
                                    Choose photo
                                </Label>
                                <input id="photo-upload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                                <p className="text-xs text-muted-foreground mt-2">JPG, PNG up to 5MB</p>
                            </div>
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
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name *</Label>
                                <Input id="name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Dr. Sarah Lin" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="title">Title *</Label>
                                <Input id="title" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Board-Certified Endocrinologist" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="specialty">Specialty *</Label>
                                <Select required value={form.specialty} onValueChange={val => val && setForm({ ...form, specialty: val })}>
                                    <SelectTrigger id="specialty">
                                        <SelectValue placeholder="Select specialty" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SPECIALTIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="experience">Experience</Label>
                                <Input id="experience" value={form.experience} onChange={e => setForm({ ...form, experience: e.target.value })} placeholder="10 Years" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email *</Label>
                                <Input id="email" required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="dr.sarah@clinic.com" />
                            </div>
                            {!isEditing && (
                                <div className="space-y-2">
                                    <Label htmlFor="password" className="flex items-center gap-1.5">
                                        <KeyRound className="w-4 h-4 text-muted-foreground" /> Login Password *
                                    </Label>
                                    <Input id="password" required type="password" value={password} onChange={e => setPassword(e.target.value || '')} minLength={6} placeholder="Min 6 characters" />
                                    <p className="text-[11px] text-muted-foreground">This creates the physician's login credentials</p>
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="price">Price per session</Label>
                                <Input id="price" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="$120" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="about">About / Session Description *</Label>
                            <Textarea id="about" required rows={4} value={form.about} onChange={e => setForm({ ...form, about: e.target.value })} placeholder="Describe the healthcare provider's expertise and session details..." />
                        </div>
                    </CardContent>
                </Card>

                {/* Availability */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Availability</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="space-y-3">
                            <Label>Available Days</Label>
                            <div className="flex flex-wrap gap-2">
                                {DAYS.map(day => (
                                    <Button
                                        key={day}
                                        type="button"
                                        variant={form.availableDays.includes(day) ? "default" : "outline"}
                                        onClick={() => toggleDay(day)}
                                        className="h-9"
                                    >
                                        {day.slice(0, 3)}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div className="space-y-2">
                                <Label htmlFor="startTime">Start Time</Label>
                                <Input
                                    id="startTime"
                                    type="time" 
                                    value={form.availableHours.start}
                                    onChange={e => setForm({ ...form, availableHours: { ...form.availableHours, start: e.target.value } })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="endTime">End Time</Label>
                                <Input
                                    id="endTime"
                                    type="time" 
                                    value={form.availableHours.end}
                                    onChange={e => setForm({ ...form, availableHours: { ...form.availableHours, end: e.target.value } })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="slotDuration">Slot Duration</Label>
                                <Select value={form.timeSlotDuration.toString()} onValueChange={val => setForm({ ...form, timeSlotDuration: Number(val) })}>
                                    <SelectTrigger id="slotDuration">
                                        <SelectValue placeholder="Select duration" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="15">15 minutes</SelectItem>
                                        <SelectItem value="30">30 minutes</SelectItem>
                                        <SelectItem value="45">45 minutes</SelectItem>
                                        <SelectItem value="60">60 minutes</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
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
                            <Label htmlFor="active" className="cursor-pointer">Provider is active and visible to patients</Label>
                        </div>
                        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            {loading ? 'Saving...' : isEditing ? 'Update Provider' : 'Add Provider'}
                        </Button>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}
