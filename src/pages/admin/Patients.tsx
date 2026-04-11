import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Phone, Search, UserRound, Users } from 'lucide-react';
import { getPatients, type PatientRecord } from '../../services/api';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function AdminPatients() {
    const [patients, setPatients] = useState<PatientRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        (async () => {
            try {
                setPatients(await getPatients());
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const filtered = useMemo(() => patients.filter(patient => {
        const haystack = [
            patient.username,
            patient.email,
            patient.phone,
            patient.tel,
            patient.profile?.phoneNumber,
            ...(patient.profile?.goals || []),
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

        return haystack.includes(search.toLowerCase());
    }), [patients, search]);

    const completedCount = patients.filter(patient => patient.onboardingComplete).length;
    const withPhoneCount = patients.filter(patient => patient.phone || patient.tel || patient.profile?.phoneNumber).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="w-8 h-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Patients</h1>
                <p className="text-muted-foreground mt-1">Review onboarding answers and patient profile details.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Patients</CardTitle>
                        <Users className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{patients.length}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Completed Onboarding</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{completedCount}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">With Phone Number</CardTitle>
                        <Phone className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{withPhoneCount}</div></CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="pb-4 border-b border-border/50">
                    <div className="relative w-full sm:max-w-md">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
                            placeholder="Search patients, phone, or goals..."
                            className="pl-9 h-9"
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="pl-6 h-10">Patient</TableHead>
                                <TableHead className="h-10">Phone</TableHead>
                                <TableHead className="h-10">Goals</TableHead>
                                <TableHead className="h-10">Onboarding</TableHead>
                                <TableHead className="h-10 text-right pr-6">Patient Info</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                        No patients found.
                                    </TableCell>
                                </TableRow>
                            ) : filtered.map(patient => (
                                <TableRow key={patient.id}>
                                    <TableCell className="pl-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                                <UserRound className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="font-medium">{patient.username || 'Patient'}</p>
                                                <p className="text-sm text-muted-foreground">{patient.email || 'No email'}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {patient.phone || patient.tel || patient.profile?.phoneNumber || 'No phone'}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {(patient.profile?.goals || []).slice(0, 2).map(goal => (
                                                <Badge key={goal} variant="secondary">{goal}</Badge>
                                            ))}
                                            {(patient.profile?.goals || []).length === 0 ? (
                                                <span className="text-sm text-muted-foreground">No goals saved</span>
                                            ) : null}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={patient.onboardingComplete ? 'default' : 'secondary'}>
                                            {patient.onboardingComplete ? 'Complete' : 'Incomplete'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <Link
                                            to={`/admin/patients/${patient.id}`}
                                            className={buttonVariants({ variant: 'outline', size: 'sm' })}
                                        >
                                            View
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
