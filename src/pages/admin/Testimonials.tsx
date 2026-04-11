import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import {
    addTestimonial,
    deleteTestimonial,
    getTestimonials,
    updateTestimonial,
    uploadTestimonialPhoto,
    type ShopTestimonial,
} from '../../services/api';
import { Edit, Eye, EyeOff, Loader2, Plus, Star, Trash2, Upload, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const emptyForm = {
    customerName: '',
    photoUrl: '',
    rating: 5,
    message: '',
    visible: true,
};

export function AdminTestimonials() {
    const [testimonials, setTestimonials] = useState<ShopTestimonial[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<ShopTestimonial | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState('');
    const [saving, setSaving] = useState(false);

    const visibleCount = useMemo(() => testimonials.filter(item => item.visible).length, [testimonials]);

    const load = async () => {
        setLoading(true);
        try {
            setTestimonials(await getTestimonials());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const openAdd = () => {
        setEditing(null);
        setForm(emptyForm);
        setPhotoFile(null);
        setPhotoPreview('');
        setDialogOpen(true);
    };

    const openEdit = (item: ShopTestimonial) => {
        setEditing(item);
        setForm({
            customerName: item.customerName || '',
            photoUrl: item.photoUrl || '',
            rating: item.rating || 5,
            message: item.message || '',
            visible: item.visible !== false,
        });
        setPhotoFile(null);
        setPhotoPreview(item.photoUrl || '');
        setDialogOpen(true);
    };

    const handlePhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
        event.target.value = '';
    };

    const save = async (event: FormEvent) => {
        event.preventDefault();
        if (!form.customerName.trim()) {
            alert('Customer name is required.');
            return;
        }
        if (!form.message.trim()) {
            alert('Message is required.');
            return;
        }

        setSaving(true);
        try {
            if (editing?.id) {
                let photoUrl = form.photoUrl;
                if (photoFile) photoUrl = await uploadTestimonialPhoto(photoFile, editing.id);
                await updateTestimonial(editing.id, { ...form, photoUrl });
            } else {
                const id = await addTestimonial({ ...form, photoUrl: '' });
                if (photoFile) {
                    const photoUrl = await uploadTestimonialPhoto(photoFile, id);
                    await updateTestimonial(id, { photoUrl });
                }
            }
            setDialogOpen(false);
            await load();
        } catch (error: any) {
            alert(error?.message || 'Failed to save testimonial.');
        } finally {
            setSaving(false);
        }
    };

    const remove = async (item: ShopTestimonial) => {
        if (!item.id || !confirm(`Delete testimonial from ${item.customerName}?`)) return;
        await deleteTestimonial(item.id);
        setTestimonials(prev => prev.filter(testimonial => testimonial.id !== item.id));
    };

    const toggleVisibility = async (item: ShopTestimonial) => {
        if (!item.id) return;
        const visible = !item.visible;
        await updateTestimonial(item.id, { visible });
        setTestimonials(prev => prev.map(testimonial => testimonial.id === item.id ? { ...testimonial, visible } : testimonial));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Testimonials</h1>
                    <p className="text-muted-foreground mt-1">Manage customer stories displayed on the shop page.</p>
                </div>
                <Button onClick={openAdd}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Testimonial
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
                        <Star className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{testimonials.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Visible</CardTitle>
                        <Eye className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{visibleCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Hidden</CardTitle>
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{testimonials.length - visibleCount}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="pl-6">Customer</TableHead>
                                <TableHead>Rating</TableHead>
                                <TableHead>Message</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right pr-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {testimonials.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                        No testimonials yet.
                                    </TableCell>
                                </TableRow>
                            ) : testimonials.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell className="pl-6">
                                        <div className="flex items-center gap-3">
                                            {item.photoUrl ? (
                                                <img src={item.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover border" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                                                    {item.customerName.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <span className="font-medium">{item.customerName}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{item.rating}/5</TableCell>
                                    <TableCell className="max-w-md">
                                        <p className="line-clamp-2 text-sm text-muted-foreground">{item.message}</p>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={item.visible ? 'default' : 'secondary'}>
                                            {item.visible ? 'Visible' : 'Hidden'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="inline-flex items-center gap-2">
                                            <Button variant="outline" size="sm" onClick={() => toggleVisibility(item)}>
                                                {item.visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button variant="destructive" size="sm" onClick={() => remove(item)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Testimonial' : 'Add Testimonial'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={save} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Customer name</Label>
                                <Input value={form.customerName} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, customerName: event.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Rating</Label>
                                <Select value={String(form.rating)} onValueChange={(value: string | null) => value && setForm({ ...form, rating: Number(value) })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[1, 2, 3, 4, 5].map(value => (
                                            <SelectItem key={value} value={String(value)}>{value} stars</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Photo (optional)</Label>
                            <div className="flex items-center gap-4">
                                {photoPreview ? (
                                    <div className="relative">
                                        <img src={photoPreview} alt="" className="w-16 h-16 rounded-full object-cover border" />
                                        <Button type="button" size="icon" variant="destructive" className="absolute -right-2 -top-2 h-6 w-6" onClick={() => { setPhotoPreview(''); setPhotoFile(null); setForm({ ...form, photoUrl: '' }); }}>
                                            <X className="w-3 h-3" />
                                        </Button>
                                    </div>
                                ) : null}
                                <Label htmlFor="testimonial-photo" className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer hover:bg-muted">
                                    <Upload className="w-4 h-4" />
                                    Upload photo
                                    <input id="testimonial-photo" type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                                </Label>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Message</Label>
                            <Textarea rows={5} value={form.message} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, message: event.target.value })} />
                        </div>

                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div>
                                <Label>Visible on shop</Label>
                                <p className="text-sm text-muted-foreground">Turn off to hide this testimonial without deleting it.</p>
                            </div>
                            <Switch checked={form.visible} onCheckedChange={(visible: boolean) => setForm({ ...form, visible })} />
                        </div>

                        <Button type="submit" disabled={saving} className="w-full">
                            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Save Testimonial
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
