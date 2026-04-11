import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Dumbbell, Mail, Phone, Ruler, Scale, ShieldAlert, Target, UserRound } from 'lucide-react';
import { getPatient, type PatientRecord } from '../../services/api';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function formatDate(value: unknown) {
    const date = (value as { toDate?: () => Date } | undefined)?.toDate?.();
    return date ? date.toLocaleString() : 'Unknown';
}

function formatHeight(patient: PatientRecord) {
    const profile = patient.profile;
    if (!profile?.height) return 'Not provided';
    if (profile.heightUnit === 'feet' && profile.heightDisplayValue) {
        const feet = Math.floor(profile.heightDisplayValue / 12);
        const inches = profile.heightDisplayValue % 12;
        return `${feet}'${inches}" (${profile.height} cm)`;
    }
    return `${profile.height} cm`;
}

function formatWeight(valueKg?: number | null, displayValue?: number | null, unit?: string | null) {
    if (valueKg == null) return 'Not provided';
    if (unit && displayValue != null && unit !== 'kg') {
        return `${displayValue} ${unit} (${valueKg} kg)`;
    }
    return `${displayValue ?? valueKg} ${unit || 'kg'}`;
}

export function AdminPatientInfo() {
    const { id } = useParams<{ id: string }>();
    const [patient, setPatient] = useState<PatientRecord | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            if (!id) {
                setLoading(false);
                return;
            }

            try {
                setPatient(await getPatient(id));
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    const medicalConditionLabel = useMemo(() => {
        const answer = patient?.profile?.medicalConditionAnswer;
        if (answer === 'yes') return 'Yes';
        if (answer === 'no') return 'No';
        if (patient?.profile?.hasMedicalCondition === true) return 'Yes';
        if (patient?.profile?.hasMedicalCondition === false) return 'No';
        return 'Not provided';
    }, [patient]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="w-8 h-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            </div>
        );
    }

    if (!patient) {
        return (
            <Card>
                <CardContent className="py-16 text-center space-y-4">
                    <p className="text-lg font-semibold">Patient not found</p>
                    <Link
                        to="/admin/patients"
                        className={buttonVariants({ variant: 'outline' })}
                    >
                        Back to Patients
                    </Link>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                    <Link
                        to="/admin/patients"
                        className={buttonVariants({ variant: 'outline', size: 'sm' })}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Patients
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Patient Info</h1>
                        <p className="text-muted-foreground mt-1">Full onboarding and profile information for this user.</p>
                    </div>
                </div>
                <Badge variant={patient.onboardingComplete ? 'default' : 'secondary'}>
                    {patient.onboardingComplete ? 'Onboarding Complete' : 'Onboarding Incomplete'}
                </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Profile Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                <UserRound className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-semibold">{patient.username || 'Patient'}</p>
                                <p className="text-sm text-muted-foreground">{patient.role}</p>
                            </div>
                        </div>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Mail className="w-4 h-4" />
                                <span>{patient.email || 'No email'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Phone className="w-4 h-4" />
                                <span>{patient.phone || patient.tel || patient.profile?.phoneNumber || 'No phone number'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Completed: {formatDate(patient.onboardingCompletedAt || patient.createdAt)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Patient Info</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-xl border p-4 space-y-1">
                            <p className="text-xs uppercase font-semibold text-muted-foreground">Diabetes Type</p>
                            <p className="font-medium">{patient.profile?.diabetesType || 'Not provided'}</p>
                        </div>
                        <div className="rounded-xl border p-4 space-y-1">
                            <p className="text-xs uppercase font-semibold text-muted-foreground">Activity Level</p>
                            <p className="font-medium flex items-center gap-2">
                                <Dumbbell className="w-4 h-4 text-primary" />
                                {patient.profile?.activityLevel || 'Not provided'}
                            </p>
                        </div>
                        <div className="rounded-xl border p-4 space-y-1">
                            <p className="text-xs uppercase font-semibold text-muted-foreground">Age</p>
                            <p className="font-medium">{patient.profile?.age ?? 'Not provided'}</p>
                        </div>
                        <div className="rounded-xl border p-4 space-y-1">
                            <p className="text-xs uppercase font-semibold text-muted-foreground">Height</p>
                            <p className="font-medium flex items-center gap-2">
                                <Ruler className="w-4 h-4 text-primary" />
                                {formatHeight(patient)}
                            </p>
                        </div>
                        <div className="rounded-xl border p-4 space-y-1">
                            <p className="text-xs uppercase font-semibold text-muted-foreground">Current Weight</p>
                            <p className="font-medium flex items-center gap-2">
                                <Scale className="w-4 h-4 text-primary" />
                                {formatWeight(
                                    patient.profile?.weight,
                                    patient.profile?.weightDisplayValue,
                                    patient.profile?.weightUnit,
                                )}
                            </p>
                        </div>
                        <div className="rounded-xl border p-4 space-y-1">
                            <p className="text-xs uppercase font-semibold text-muted-foreground">Target Weight</p>
                            <p className="font-medium flex items-center gap-2">
                                <Target className="w-4 h-4 text-primary" />
                                {formatWeight(
                                    patient.profile?.targetWeight,
                                    patient.profile?.targetWeightDisplayValue,
                                    patient.profile?.targetWeightUnit,
                                )}
                            </p>
                        </div>
                        <div className="rounded-xl border p-4 space-y-1">
                            <p className="text-xs uppercase font-semibold text-muted-foreground">Medical Condition</p>
                            <p className="font-medium flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4 text-primary" />
                                {medicalConditionLabel}
                            </p>
                        </div>
                        <div className="rounded-xl border p-4 space-y-1">
                            <p className="text-xs uppercase font-semibold text-muted-foreground">Phone Number</p>
                            <p className="font-medium">{patient.profile?.phoneNumber || patient.phone || patient.tel || 'Not provided'}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Goals</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {(patient.profile?.goals || []).length === 0 ? (
                                <span className="text-sm text-muted-foreground">No goals saved.</span>
                            ) : (
                                (patient.profile?.goals || []).map(goal => (
                                    <Badge key={goal} variant="secondary">{goal}</Badge>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Medical Conditions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {(patient.profile?.medicalConditions || []).length === 0 ? (
                                <span className="text-sm text-muted-foreground">No medical conditions saved.</span>
                            ) : (
                                (patient.profile?.medicalConditions || []).map(condition => (
                                    <Badge key={condition} variant="secondary">{condition}</Badge>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
