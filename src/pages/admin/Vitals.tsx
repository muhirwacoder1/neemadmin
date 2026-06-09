import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Droplet, Phone, Search, Scale, UserRound } from 'lucide-react';
import { getPatientVitals, type PatientVitalsRecord } from '../../services/api';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const OBESE_BMI_THRESHOLD = 30;
const HIGH_SYSTOLIC_THRESHOLD = 140;
const HIGH_DIASTOLIC_THRESHOLD = 90;
const HIGH_GLUCOSE_MGDL_THRESHOLD = 180;
const HIGH_GLUCOSE_MMOLL_THRESHOLD = 10;

function getPatientName(record: PatientVitalsRecord) {
    return record.patient.username || record.patient.email || 'Patient';
}

function getPatientPhone(record: PatientVitalsRecord) {
    return record.patient.phone || record.patient.tel || record.patient.profile?.phoneNumber || 'No phone';
}

function formatDate(value: unknown) {
    const date = (value as { toDate?: () => Date } | undefined)?.toDate?.();
    return date ? date.toLocaleString() : 'No reading date';
}

function isHighBloodPressure(record: PatientVitalsRecord) {
    const bp = record.latestBloodPressure;
    return (bp?.systolic ?? 0) >= HIGH_SYSTOLIC_THRESHOLD || (bp?.diastolic ?? 0) >= HIGH_DIASTOLIC_THRESHOLD;
}

function isHighGlucose(record: PatientVitalsRecord) {
    const reading = record.latestGlucose;
    if (reading?.value == null) return false;
    const unit = reading.unit?.toLowerCase() || 'mg/dl';
    const threshold = unit.includes('mmol') ? HIGH_GLUCOSE_MMOLL_THRESHOLD : HIGH_GLUCOSE_MGDL_THRESHOLD;
    return reading.value >= threshold;
}

function matchesSearch(record: PatientVitalsRecord, search: string) {
    const haystack = [
        getPatientName(record),
        record.patient.email,
        getPatientPhone(record),
    ].filter(Boolean).join(' ').toLowerCase();

    return haystack.includes(search.toLowerCase());
}

function PatientCell({ record }: { record: PatientVitalsRecord }) {
    return (
        <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <UserRound className="w-4 h-4" />
            </div>
            <div>
                <p className="font-medium">{getPatientName(record)}</p>
                <p className="text-sm text-muted-foreground">{record.patient.email || 'No email'}</p>
            </div>
        </div>
    );
}

function EmptyRow({ label }: { label: string }) {
    return (
        <TableRow>
            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                {label}
            </TableCell>
        </TableRow>
    );
}

export function AdminVitals() {
    const [records, setRecords] = useState<PatientVitalsRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        (async () => {
            try {
                setRecords(await getPatientVitals());
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const searchedRecords = useMemo(
        () => records.filter(record => matchesSearch(record, search)),
        [records, search],
    );

    const obesePatients = useMemo(
        () => searchedRecords
            .filter(record => (record.bmi ?? 0) >= OBESE_BMI_THRESHOLD)
            .sort((a, b) => (b.bmi ?? 0) - (a.bmi ?? 0)),
        [searchedRecords],
    );

    const highBpPatients = useMemo(
        () => searchedRecords
            .filter(isHighBloodPressure)
            .sort((a, b) => (b.latestBloodPressure?.systolic ?? 0) - (a.latestBloodPressure?.systolic ?? 0)),
        [searchedRecords],
    );

    const highGlucosePatients = useMemo(
        () => searchedRecords
            .filter(isHighGlucose)
            .sort((a, b) => (b.latestGlucose?.value ?? 0) - (a.latestGlucose?.value ?? 0)),
        [searchedRecords],
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="w-8 h-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Vitals</h1>
                    <p className="text-muted-foreground mt-1">Review patients flagged by BMI, blood pressure, and blood glucose readings.</p>
                </div>
                <div className="relative w-full md:max-w-sm">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search name, phone, or email..."
                        className="pl-9 h-9"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Obese Patients</CardTitle>
                        <Scale className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{obesePatients.length}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">High BP</CardTitle>
                        <Activity className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{highBpPatients.length}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">High Blood Glucose</CardTitle>
                        <Droplet className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{highGlucosePatients.length}</div></CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Scale className="h-5 w-5 text-primary" />
                        Obese Patients
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="pl-6">Patient</TableHead>
                                <TableHead>Mobile Number</TableHead>
                                <TableHead>BMI</TableHead>
                                <TableHead>Weight</TableHead>
                                <TableHead className="text-right pr-6">Patient Info</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {obesePatients.length === 0 ? <EmptyRow label="No obese patients found." /> : obesePatients.map(record => (
                                <TableRow key={record.patient.id}>
                                    <TableCell className="pl-6"><PatientCell record={record} /></TableCell>
                                    <TableCell className="text-muted-foreground">
                                        <span className="inline-flex items-center gap-2">
                                            <Phone className="w-4 h-4" />
                                            {getPatientPhone(record)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{record.bmi?.toFixed(1)}</Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {record.patient.profile?.weight ? `${record.patient.profile.weight} kg` : 'Not provided'}
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <Link to={`/admin/patients/${record.patient.id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>View</Link>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-red-500" />
                        Patients With High BP
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="pl-6">Patient</TableHead>
                                <TableHead>Mobile Number</TableHead>
                                <TableHead>Latest BP</TableHead>
                                <TableHead>Reading Date</TableHead>
                                <TableHead className="text-right pr-6">Patient Info</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {highBpPatients.length === 0 ? <EmptyRow label="No patients with high BP found." /> : highBpPatients.map(record => (
                                <TableRow key={record.patient.id}>
                                    <TableCell className="pl-6"><PatientCell record={record} /></TableCell>
                                    <TableCell className="text-muted-foreground">
                                        <span className="inline-flex items-center gap-2">
                                            <Phone className="w-4 h-4" />
                                            {getPatientPhone(record)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="destructive">
                                            {record.latestBloodPressure?.systolic}/{record.latestBloodPressure?.diastolic} mmHg
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {formatDate(record.latestBloodPressure?.timestamp)}
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <Link to={`/admin/patients/${record.patient.id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>View</Link>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Droplet className="h-5 w-5 text-blue-500" />
                        Patients With High Blood Glucose
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="pl-6">Patient</TableHead>
                                <TableHead>Mobile Number</TableHead>
                                <TableHead>Latest Glucose</TableHead>
                                <TableHead>Reading Date</TableHead>
                                <TableHead className="text-right pr-6">Patient Info</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {highGlucosePatients.length === 0 ? <EmptyRow label="No patients with high blood glucose found." /> : highGlucosePatients.map(record => (
                                <TableRow key={record.patient.id}>
                                    <TableCell className="pl-6"><PatientCell record={record} /></TableCell>
                                    <TableCell className="text-muted-foreground">
                                        <span className="inline-flex items-center gap-2">
                                            <Phone className="w-4 h-4" />
                                            {getPatientPhone(record)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">
                                            {record.latestGlucose?.value} {record.latestGlucose?.unit || 'mg/dL'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {formatDate(record.latestGlucose?.timestamp)}
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <Link to={`/admin/patients/${record.patient.id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>View</Link>
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
