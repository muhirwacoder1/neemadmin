import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { getOrders, updateOrderStatus, type OrderStatus, type ShopOrder } from '../../services/api';
import { CheckCircle2, Loader2, MapPin, Package, Phone, Search, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const statusStyles: Record<OrderStatus, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
};

function formatDate(order: ShopOrder) {
    const value = order.createdAt as any;
    const date = value?.toDate ? value.toDate() : null;
    return date ? date.toLocaleString() : 'Unknown date';
}

export function AdminOrders() {
    const [orders, setOrders] = useState<ShopOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
    const [updatingId, setUpdatingId] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            setOrders(await getOrders());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const filtered = useMemo(() => orders.filter(order => {
        const searchText = `${order.customerName} ${order.customerEmail} ${order.customerPhone || ''} ${order.delivery?.address || ''}`.toLowerCase();
        const matchesSearch = searchText.includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
        return matchesSearch && matchesStatus;
    }), [orders, search, statusFilter]);

    const updateStatus = async (order: ShopOrder, status: Exclude<OrderStatus, 'pending'>) => {
        if (!order.id) return;
        setUpdatingId(order.id);
        try {
            await updateOrderStatus(order.id, status);
            setOrders(prev => prev.map(item => item.id === order.id ? { ...item, status } : item));
        } catch (error: any) {
            alert(error?.message || `Failed to ${status} order.`);
        } finally {
            setUpdatingId('');
        }
    };

    const pendingCount = orders.filter(order => order.status === 'pending').length;
    const acceptedCount = orders.filter(order => order.status === 'accepted').length;
    const rejectedCount = orders.filter(order => order.status === 'rejected').length;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
                <p className="text-muted-foreground mt-1">Review incoming shop orders and update fulfillment status.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
                        <Package className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{orders.length}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
                        <Package className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{pendingCount}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Accepted</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{acceptedCount}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
                        <XCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{rejectedCount}</div></CardContent>
                </Card>
            </div>

            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input value={search} onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)} placeholder="Search customer, email, phone, location..." className="pl-9" />
                        </div>
                        <Select value={statusFilter} onValueChange={(value: string | null) => value && setStatusFilter(value as 'all' | OrderStatus)}>
                            <SelectTrigger className="w-full md:w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All statuses</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="accepted">Accepted</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                {filtered.length === 0 ? (
                    <Card>
                        <CardContent className="py-16 text-center text-muted-foreground">
                            No orders found.
                        </CardContent>
                    </Card>
                ) : filtered.map(order => (
                    <Card key={order.id} className="overflow-hidden">
                        <CardHeader className="border-b bg-muted/30">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                <div>
                                    <CardTitle className="text-lg">{order.customerName || 'Customer'}</CardTitle>
                                    <p className="text-sm text-muted-foreground">{formatDate(order)}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline" className={statusStyles[order.status || 'pending']}>
                                        {(order.status || 'pending').toUpperCase()}
                                    </Badge>
                                    <Badge variant="secondary">{order.totalFormatted}</Badge>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-5">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                <div className="rounded-xl border p-4 space-y-2">
                                    <p className="text-xs font-semibold uppercase text-muted-foreground">Customer</p>
                                    <p className="font-medium">{order.customerName}</p>
                                    <p className="text-sm text-muted-foreground">{order.customerEmail || 'No email'}</p>
                                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                                        <Phone className="w-4 h-4" />
                                        {order.customerPhone || 'No account phone'}
                                    </p>
                                </div>
                                <div className="rounded-xl border p-4 space-y-2 lg:col-span-2">
                                    <p className="text-xs font-semibold uppercase text-muted-foreground">Delivery Location</p>
                                    <p className="font-medium flex items-start gap-2">
                                        <MapPin className="w-4 h-4 mt-1 text-primary" />
                                        <span>{order.delivery?.address || 'No address'}</span>
                                    </p>
                                    <p className="text-sm text-muted-foreground">{order.delivery?.country || 'No country'}</p>
                                    {order.delivery?.coordinates ? (
                                        <p className="text-xs text-muted-foreground">
                                            GPS: {order.delivery.coordinates.latitude}, {order.delivery.coordinates.longitude}
                                        </p>
                                    ) : null}
                                </div>
                            </div>

                            <div className="rounded-xl border overflow-hidden">
                                <div className="bg-muted/50 px-4 py-3 text-sm font-semibold">Products Ordered</div>
                                <div className="divide-y">
                                    {(order.items || []).map((item, index) => (
                                        <div key={`${item.productId}-${index}`} className="flex items-center justify-between gap-4 px-4 py-3">
                                            <div>
                                                <p className="font-medium">{item.name}</p>
                                                <p className="text-sm text-muted-foreground">{item.unitPriceFormatted} x {item.quantity}</p>
                                            </div>
                                            <p className="font-semibold">{(item.lineTotalRwf || 0).toLocaleString('en-US')} RWF</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {order.status === 'pending' ? (
                                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                                    <Button
                                        variant="outline"
                                        className="border-red-200 text-red-600 hover:bg-red-50"
                                        disabled={updatingId === order.id}
                                        onClick={() => updateStatus(order, 'rejected')}
                                    >
                                        {updatingId === order.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                                        Reject
                                    </Button>
                                    <Button
                                        disabled={updatingId === order.id}
                                        onClick={() => updateStatus(order, 'accepted')}
                                    >
                                        {updatingId === order.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                        Accept
                                    </Button>
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
