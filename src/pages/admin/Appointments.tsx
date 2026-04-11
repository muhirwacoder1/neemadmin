import { useEffect, useState } from 'react';
import { getAppointments, updateAppointmentStatus, type Appointment } from '../../services/api';
import { Search, CheckCircle2, XCircle, Clock, CalendarCheck, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const PER_PAGE = 10;

export function AdminAppointments() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [sortOrder, setSortOrder] = useState('newest');
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);

    const fetchData = async () => {
        try {
            const data = await getAppointments({ status: filter });
            setAppointments(data);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, [filter]);

    const handleStatusChange = async (id: string, status: 'approved' | 'denied') => {
        await updateAppointmentStatus(id, status);
        setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    };

    const filtered = appointments
        .filter(a =>
            a.patientName.toLowerCase().includes(search.toLowerCase()) ||
            a.providerName.toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => {
            if (sortOrder === 'newest') return (b.date || '').localeCompare(a.date || '');
            return (a.date || '').localeCompare(b.date || '');
        });

    const totalPages = Math.ceil(filtered.length / PER_PAGE);
    const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    const counts = {
        total: appointments.length,
        approved: appointments.filter(a => a.status === 'approved').length,
        pending: appointments.filter(a => a.status === 'pending').length,
        denied: appointments.filter(a => a.status === 'denied').length,
    };

    const getStatusBadge = (status: string) => {
        const variance: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
            pending: "secondary",
            approved: "default",
            denied: "destructive",
        };
        const labelMap: Record<string, string> = {
            pending: "Pending",
            approved: "Confirmed",
            denied: "Cancelled",
        }
        return (
            <Badge variant={variance[status] || "secondary"}>
                {labelMap[status] || "Pending"}
            </Badge>
        );
    };

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
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
                <p className="text-muted-foreground mt-1">Manage all appointment bookings and requests.</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
                        <CalendarCheck className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{counts.total}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Confirmed</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{counts.approved}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
                        <Clock className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{counts.pending}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Cancelled</CardTitle>
                        <XCircle className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{counts.denied}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="pb-4 border-b border-border/50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-2 flex-wrap">
                            {['all', 'pending', 'approved', 'denied'].map(s => (
                                <Button
                                    key={s}
                                    variant={filter === s ? "default" : "outline"}
                                    onClick={() => { setFilter(s); setPage(1); }}
                                    className="capitalize h-9"
                                >
                                    {s}
                                </Button>
                            ))}
                        </div>
                        <div className="flex items-center gap-4 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-[250px]">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search patients..."
                                    value={search}
                                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                                    className="pl-9 h-9"
                                />
                            </div>
                            <Select value={sortOrder} onValueChange={val => val && setSortOrder(val)}>
                                <SelectTrigger className="w-[140px] h-9">
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="newest">Newest First</SelectItem>
                                    <SelectItem value="oldest">Oldest First</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="pl-6 h-10">Patient</TableHead>
                                <TableHead className="h-10">Provider</TableHead>
                                <TableHead className="h-10">Date & Time</TableHead>
                                <TableHead className="h-10">Status</TableHead>
                                <TableHead className="text-right pr-6 h-10">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginated.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground border-b-0">
                                        No appointments found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginated.map(apt => (
                                    <TableRow key={apt.id} className="cursor-pointer group">
                                        <TableCell className="pl-6">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                                        {apt.patientName?.[0] || '?'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium leading-none">{apt.patientName}</span>
                                                    <span className="text-xs text-muted-foreground mt-1">{apt.patientEmail}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{apt.providerName}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-sm leading-none">{apt.date}</span>
                                                <span className="text-xs text-muted-foreground mt-1">{apt.time}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(apt.status)}</TableCell>
                                        <TableCell className="text-right pr-6">
                                            {apt.status === 'pending' ? (
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button 
                                                        variant="outline" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-600 border-emerald-200"
                                                        onClick={(e) => { e.stopPropagation(); handleStatusChange(apt.id!, 'approved'); }}
                                                    >
                                                        <CheckCircle2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button 
                                                        variant="outline" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
                                                        onClick={(e) => { e.stopPropagation(); handleStatusChange(apt.id!, 'denied'); }}
                                                    >
                                                        <XCircle className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-8 w-8 outline-none">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem>View Details</DropdownMenuItem>
                                                        <DropdownMenuItem className="text-destructive">Delete Record</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
                {filtered.length > PER_PAGE && (
                    <div className="flex items-center justify-end gap-2 p-4 border-t border-border/50 bg-muted/20">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </Button>
                        <div className="text-sm font-medium text-muted-foreground px-2">
                            Page {page} of {totalPages}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    );
}
