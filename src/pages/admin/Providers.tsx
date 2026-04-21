import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProviders, deleteProvider, resetPhysicianPassword, type Provider } from '../../services/api';
import { Plus, Search, Trash2, Edit, KeyRound, UserX, Users, UserCheck, Clock, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const SPECIALTIES = ['All', 'Endocrinology', 'General Practitioner', 'Nutritionist', 'Nurse', 'P & O', 'Physiotherapist', 'Fitness Coach'];
const PER_PAGE = 10;

export function AdminProviders() {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [specialtyFilter, setSpecialtyFilter] = useState('All');
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    
    // Reset Password State
    const [resetModalOpen, setResetModalOpen] = useState(false);
    const [resetProvider, setResetProvider] = useState<{ email: string; name: string } | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [resetting, setResetting] = useState(false);
    
    const navigate = useNavigate();

    const fetchProviders = async () => {
        try {
            const data = await getProviders();
            setProviders(data);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetchProviders(); }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this provider?')) return;
        await deleteProvider(id);
        setProviders(prev => prev.filter(p => p.id !== id));
    };

    const openResetModal = (email: string, name: string) => {
        setResetProvider({ email, name });
        setNewPassword('');
        setResetModalOpen(true);
    };

    const handleResetSubmit = async () => {
        if (!resetProvider) return;
        if (newPassword.length < 6) return;
        
        setResetting(true);
        try {
            await resetPhysicianPassword(resetProvider.email, newPassword);
            setResetModalOpen(false);
        } catch (e: any) {
            alert('Error: ' + e.message);
        } finally {
            setResetting(false);
        }
    };

    const filtered = providers.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.email.toLowerCase().includes(search.toLowerCase()) ||
            p.specialty.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'All' || (statusFilter === 'Active' ? p.active : !p.active);
        const matchSpecialty = specialtyFilter === 'All' || p.specialty === specialtyFilter;
        return matchSearch && matchStatus && matchSpecialty;
    });

    const totalPages = Math.ceil(filtered.length / PER_PAGE);
    const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    const activeCount = providers.filter(p => p.active).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="w-8 h-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Providers</h1>
                    <p className="text-muted-foreground mt-1">Manage your registered healthcare providers and their accounts.</p>
                </div>
                <Button onClick={() => navigate('/admin/providers/add')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Provider
                </Button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Providers</CardTitle>
                        <Users className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{providers.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Active Now</CardTitle>
                        <UserCheck className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Inactive</CardTitle>
                        <Clock className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{providers.length - activeCount}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Table Card */}
            <Card>
                <CardHeader className="pb-4 border-b border-border/50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="relative flex-1 sm:max-w-md">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search providers..."
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }}
                                className="pl-9 h-9"
                            />
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <Select value={statusFilter} onValueChange={val => { val && setStatusFilter(val as any); setPage(1); }}>
                                <SelectTrigger className="w-[140px] h-9">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">All Status</SelectItem>
                                    <SelectItem value="Active">Active</SelectItem>
                                    <SelectItem value="Inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={specialtyFilter} onValueChange={val => { val && setSpecialtyFilter(val); setPage(1); }}>
                                <SelectTrigger className="w-[160px] h-9">
                                    <SelectValue placeholder="Specialty" />
                                </SelectTrigger>
                                <SelectContent>
                                    {SPECIALTIES.map(s => (
                                        <SelectItem key={s} value={s}>{s === 'All' ? 'All Specialties' : s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="pl-6 h-10">Provider</TableHead>
                                <TableHead className="h-10">Email</TableHead>
                                <TableHead className="h-10">Specialty</TableHead>
                                <TableHead className="h-10">Status</TableHead>
                                <TableHead className="h-10 text-right pr-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center border-b-0">
                                        <div className="flex flex-col items-center justify-center">
                                            <UserX className="h-8 w-8 text-muted-foreground mb-2" />
                                            <span className="text-muted-foreground font-medium">No providers found.</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginated.map((provider) => (
                                    <TableRow key={provider.id}>
                                        <TableCell className="pl-6">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9">
                                                    {provider.profileImage ? (
                                                        <AvatarImage src={provider.profileImage} alt={provider.name} />
                                                    ) : null}
                                                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                                        {provider.name[0]}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium leading-none">{provider.name}</span>
                                                    {provider.title && <span className="text-xs text-muted-foreground mt-1">{provider.title}</span>}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{provider.email}</TableCell>
                                        <TableCell>{provider.specialty}</TableCell>
                                        <TableCell>
                                            <Badge variant={provider.active ? "default" : "secondary"}>
                                                {provider.active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-8 w-8 outline-none">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => navigate(`/admin/providers/edit/${provider.id}`)}>
                                                        <Edit className="h-4 w-4 mr-2" /> Edit Details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => openResetModal(provider.email, provider.name)}>
                                                        <KeyRound className="h-4 w-4 mr-2" /> Reset Password
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-destructive focus:bg-destructive/10 cursor-pointer" onClick={() => handleDelete(provider.id!)}>
                                                        <Trash2 className="h-4 w-4 mr-2" /> Delete Provider
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
                {filtered.length > PER_PAGE && (
                    <div className="flex items-center justify-end gap-2 p-4 border-t border-border/50 bg-muted/20">
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                        </Button>
                        <div className="text-sm font-medium text-muted-foreground px-2">
                            Page {page} of {totalPages}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                            Next <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                )}
            </Card>

            {/* Reset Password Dialog */}
            <Dialog open={resetModalOpen} onOpenChange={setResetModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Reset Password</DialogTitle>
                        <DialogDescription>
                            Set a new password for {resetProvider?.name} ({resetProvider?.email})
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <span className="text-sm font-medium uppercase text-muted-foreground">New Password</span>
                            <Input
                                type="password"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                placeholder="Enter new password (min 6 chars)"
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setResetModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleResetSubmit} disabled={resetting || newPassword.length < 6}>
                            {resetting ? 'Updating...' : 'Update Password'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
