import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Loader2, History, X, Search, CheckCircle2, AlertCircle, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
    sendAdminNotification, searchUsers,
    type BroadcastCategory, type DiabetesType, type BroadcastTarget, type UserSummary,
} from '../../services/broadcasts';

const CATEGORIES: { value: BroadcastCategory; label: string }[] = [
    { value: 'announcement', label: 'Announcement' },
    { value: 'glucose', label: 'Glucose' },
    { value: 'water', label: 'Water' },
    { value: 'bloodpressure', label: 'Blood Pressure' },
    { value: 'medication', label: 'Medication' },
];

const DIABETES: { value: DiabetesType; label: string }[] = [
    { value: 'type1', label: 'Type 1' },
    { value: 'type2', label: 'Type 2' },
    { value: 'gestational', label: 'Gestational' },
    { value: 'prediabetes', label: 'Prediabetes' },
];

type TargetKind = 'all' | 'users' | 'diabetesType';

export function BroadcastNew() {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [category, setCategory] = useState<BroadcastCategory>('announcement');
    const [targetKind, setTargetKind] = useState<TargetKind>('all');
    const [diabetesValue, setDiabetesValue] = useState<DiabetesType>('type2');

    const [userQuery, setUserQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState<UserSummary[]>([]);
    const [selected, setSelected] = useState<UserSummary[]>([]);

    const [submitting, setSubmitting] = useState(false);
    const [status, setStatus] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

    useEffect(() => {
        if (targetKind !== 'users' || !userQuery.trim()) { setResults([]); return; }
        let cancelled = false;
        setSearching(true);
        const t = setTimeout(async () => {
            try {
                const rows = await searchUsers(userQuery);
                if (!cancelled) setResults(rows);
            } finally {
                if (!cancelled) setSearching(false);
            }
        }, 250);
        return () => { cancelled = true; clearTimeout(t); };
    }, [userQuery, targetKind]);

    const selectedUids = useMemo(() => new Set(selected.map(s => s.uid)), [selected]);

    const toggleUser = (u: UserSummary) => {
        setSelected(prev =>
            prev.some(p => p.uid === u.uid) ? prev.filter(p => p.uid !== u.uid) : [...prev, u],
        );
    };

    const canSubmit =
        !submitting
        && title.trim().length > 0 && title.length <= 100
        && body.trim().length > 0 && body.length <= 240
        && (targetKind === 'all'
            || (targetKind === 'users' && selected.length > 0)
            || targetKind === 'diabetesType');

    const buildTarget = (): BroadcastTarget => {
        if (targetKind === 'all') return { type: 'all' };
        if (targetKind === 'users') return { type: 'users', uids: selected.map(s => s.uid) };
        return { type: 'diabetesType', value: diabetesValue };
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        setSubmitting(true);
        setStatus(null);
        try {
            const result = await sendAdminNotification({
                title: title.trim(),
                body: body.trim(),
                category,
                target: buildTarget(),
            });
            setStatus({
                kind: 'ok',
                text: `Delivered to ${result.sentCount} of ${result.recipientCount} users (${result.failedCount} failed).`,
            });
            setTitle('');
            setBody('');
            setSelected([]);
            setUserQuery('');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to send notification.';
            setStatus({ kind: 'err', text: msg });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Send broadcast</h1>
                    <p className="text-sm text-muted-foreground">Deliver a push notification to mobile app users.</p>
                </div>
                <Button variant="outline" onClick={() => navigate('/admin/broadcast/history')}>
                    <History className="w-4 h-4 mr-2" />History
                </Button>
            </div>

            <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Message</CardTitle>
                            <CardDescription>Kept short so it fits in the notification tray.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Title *</Label>
                                <Input
                                    id="title"
                                    maxLength={100}
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="e.g. App maintenance tonight"
                                    required
                                />
                                <div className="text-xs text-muted-foreground text-right">{title.length}/100</div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="body">Body *</Label>
                                <Textarea
                                    id="body"
                                    maxLength={240}
                                    value={body}
                                    onChange={e => setBody(e.target.value)}
                                    placeholder="What do you want users to know?"
                                    rows={4}
                                    required
                                />
                                <div className="text-xs text-muted-foreground text-right">{body.length}/240</div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">Category *</Label>
                                <Select value={category} onValueChange={v => v && setCategory(v as BroadcastCategory)}>
                                    <SelectTrigger id="category"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Audience</CardTitle>
                            <CardDescription>Choose who receives this broadcast.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {([
                                    { k: 'all', label: 'All users' },
                                    { k: 'users', label: 'Specific users' },
                                    { k: 'diabetesType', label: 'By diabetes type' },
                                ] as { k: TargetKind; label: string }[]).map(o => (
                                    <button
                                        type="button"
                                        key={o.k}
                                        onClick={() => setTargetKind(o.k)}
                                        className={`px-3 py-2 rounded-md border text-sm transition ${targetKind === o.k ? 'border-primary bg-primary/5 text-foreground' : 'border-border text-muted-foreground hover:border-primary/40'}`}
                                        aria-pressed={targetKind === o.k}
                                    >
                                        {o.label}
                                    </button>
                                ))}
                            </div>

                            {targetKind === 'diabetesType' && (
                                <div className="space-y-2">
                                    <Label>Diabetes type</Label>
                                    <Select value={diabetesValue} onValueChange={v => v && setDiabetesValue(v as DiabetesType)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {DIABETES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {targetKind === 'users' && (
                                <div className="space-y-3">
                                    <div className="relative">
                                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            className="pl-9"
                                            placeholder="Search by email or username…"
                                            value={userQuery}
                                            onChange={e => setUserQuery(e.target.value)}
                                        />
                                    </div>
                                    {selected.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {selected.map(u => (
                                                <Badge key={u.uid} variant="secondary" className="gap-1 pr-1">
                                                    {u.email || u.username || u.uid}
                                                    <button type="button" onClick={() => toggleUser(u)} className="ml-1 hover:text-destructive">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                    <div className="border rounded-md max-h-56 overflow-auto divide-y">
                                        {searching && <div className="p-3 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Searching…</div>}
                                        {!searching && userQuery && results.length === 0 && (
                                            <div className="p-3 text-sm text-muted-foreground">No matches.</div>
                                        )}
                                        {!userQuery && results.length === 0 && (
                                            <div className="p-3 text-sm text-muted-foreground">Type to search users.</div>
                                        )}
                                        {results.map(u => {
                                            const isSel = selectedUids.has(u.uid);
                                            return (
                                                <button
                                                    type="button"
                                                    key={u.uid}
                                                    onClick={() => toggleUser(u)}
                                                    className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-muted/50 ${isSel ? 'bg-primary/5' : ''}`}
                                                >
                                                    <span>
                                                        <span className="font-medium">{u.username || '—'}</span>
                                                        <span className="text-muted-foreground ml-2">{u.email}</span>
                                                    </span>
                                                    {isSel && <CheckCircle2 className="w-4 h-4 text-primary" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {status && (
                        <div className={`flex items-start gap-2 rounded-md border p-3 text-sm ${status.kind === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-destructive/30 bg-destructive/5 text-destructive'}`}>
                            {status.kind === 'ok' ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
                            <span>{status.text}</span>
                        </div>
                    )}

                    <div className="flex justify-end">
                        <Button type="submit" disabled={!canSubmit}>
                            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                            {submitting ? 'Sending…' : 'Send broadcast'}
                        </Button>
                    </div>
                </div>

                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Preview</CardTitle>
                            <CardDescription>Approximate tray appearance.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-xl border bg-background p-4 shadow-sm space-y-2">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Bell className="w-3.5 h-3.5" />
                                    <span>Neem • {CATEGORIES.find(c => c.value === category)?.label}</span>
                                </div>
                                <div className="font-semibold text-sm leading-snug">{title.trim() || 'Notification title'}</div>
                                <div className="text-sm text-muted-foreground leading-snug whitespace-pre-wrap">
                                    {body.trim() || 'Notification body will appear here.'}
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-3">
                                {targetKind === 'all' && 'Target: all mobile users with a push token.'}
                                {targetKind === 'users' && `Target: ${selected.length} selected user${selected.length === 1 ? '' : 's'}.`}
                                {targetKind === 'diabetesType' && `Target: users with ${DIABETES.find(d => d.value === diabetesValue)?.label}.`}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </form>
        </div>
    );
}
