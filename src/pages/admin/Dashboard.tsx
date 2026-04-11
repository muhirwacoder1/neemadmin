import { useEffect, useState } from 'react';
import { getDashboardStats, getAppointments, type Appointment } from '../../services/api';
import { CalendarCheck, Clock, CheckCircle2, TrendingUp, TrendingDown, MoreHorizontal } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const TREND_DATA = [
    { name: 'Mon', appointments: 12 },
    { name: 'Tue', appointments: 19 },
    { name: 'Wed', appointments: 15 },
    { name: 'Thu', appointments: 22 },
    { name: 'Fri', appointments: 18 },
    { name: 'Sat', appointments: 8 },
    { name: 'Sun', appointments: 5 },
];

const DEMOGRAPHICS = [
    { name: 'Male', value: 58, color: '#2563EB' },
    { name: 'Female', value: 42, color: '#60A5FA' },
];

export function AdminDashboard() {
    const [stats, setStats] = useState({
        totalProviders: 0, totalAppointments: 0,
        pendingAppointments: 0, approvedAppointments: 0, deniedAppointments: 0,
    });
    const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const [s, a] = await Promise.all([getDashboardStats(), getAppointments()]);
                setStats(s);
                setRecentAppointments(a.slice(0, 8));
            } catch (e) { console.error(e); }
            setLoading(false);
        })();
    }, []);

    const statCards = [
        {
            title: 'Total Appointments', value: stats.totalAppointments,
            icon: CalendarCheck, 
            change: '+12.5%', positive: true,
        },
        {
            title: 'Pending Requests', value: stats.pendingAppointments,
            icon: Clock, 
            change: '+3.2%', positive: true,
        },
        {
            title: 'Approved Cases', value: stats.approvedAppointments,
            icon: CheckCircle2,
            change: '+8.1%', positive: true,
        },
    ];

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
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground mt-1">Welcome back. Here's your healthcare overview.</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {statCards.map((card, i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                            <card.icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{card.value}</div>
                            <p className={`text-xs flex items-center gap-1 mt-1 ${card.positive ? 'text-emerald-500' : 'text-destructive'}`}>
                                {card.positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                {card.change} from last month
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0">
                {/* Appointment Trends */}
                <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle>Appointment Trends</CardTitle>
                            <CardDescription>Weekly appointment activity</CardDescription>
                        </div>
                        <Select defaultValue="7d">
                            <SelectTrigger className="w-[140px] h-8 text-xs">
                                <SelectValue placeholder="Select range" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7d">Last 7 Days</SelectItem>
                                <SelectItem value="30d">Last 30 Days</SelectItem>
                                <SelectItem value="90d">Last 90 Days</SelectItem>
                            </SelectContent>
                        </Select>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={TREND_DATA} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} dy={10} />
                                    <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} dx={-10} />
                                    <RechartsTooltip
                                        contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))', fontSize: '12px' }}
                                        cursor={{ stroke: 'hsl(var(--muted))', strokeWidth: 2 }}
                                    />
                                    <Line type="monotone" dataKey="appointments" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: 'hsl(var(--background))', stroke: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Patient Demographics */}
                <Card>
                    <CardHeader>
                        <CardTitle>Patient Demographics</CardTitle>
                        <CardDescription>Gender distribution</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[210px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={DEMOGRAPHICS}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={85}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {DEMOGRAPHICS.map((entry, index) => (
                                            <Cell key={index} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))', fontSize: '12px' }}
                                        formatter={(value) => `${value}%`}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex justify-center gap-6 mt-6">
                            {DEMOGRAPHICS.map(d => (
                                <div key={d.name} className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                                    <span className="text-sm text-muted-foreground">{d.name} <span className="font-semibold text-foreground">{d.value}%</span></span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <div>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>Latest appointment updates</CardDescription>
                    </div>
                    <Badge variant="outline">{recentAppointments.length} shown</Badge>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="pl-6 h-10">Patient</TableHead>
                                <TableHead className="h-10">Provider</TableHead>
                                <TableHead className="h-10">Status</TableHead>
                                <TableHead className="h-10">Date</TableHead>
                                <TableHead className="text-right pr-6 h-10">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recentAppointments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                        No recent activity
                                    </TableCell>
                                </TableRow>
                            ) : (
                                recentAppointments.map(apt => (
                                    <TableRow key={apt.id} className="cursor-pointer group">
                                        <TableCell className="pl-6">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                                        {apt.patientName?.[0] || '?'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm font-medium">{apt.patientName}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{apt.providerName}</TableCell>
                                        <TableCell>{getStatusBadge(apt.status)}</TableCell>
                                        <TableCell className="text-muted-foreground">{apt.date}</TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
