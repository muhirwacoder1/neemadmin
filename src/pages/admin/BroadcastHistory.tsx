import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import { Plus, Loader2, Inbox, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { listBroadcasts, getUserEmail, type BroadcastRecord } from '../../services/broadcasts';

const PER_PAGE = 20;

function targetLabel(t: BroadcastRecord['target']): string {
    if (t.type === 'all') return 'All users';
    if (t.type === 'users') return `${t.uids.length} user${t.uids.length === 1 ? '' : 's'}`;
    return `Diabetes: ${t.value}`;
}

function formatDate(ts?: BroadcastRecord['sentAt']): string {
    if (!ts) return '—';
    const d = ts.toDate();
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function BroadcastHistory() {
    const navigate = useNavigate();
    const [rows, setRows] = useState<BroadcastRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [pageStack, setPageStack] = useState<Array<QueryDocumentSnapshot | undefined>>([undefined]);
    const [next, setNext] = useState<QueryDocumentSnapshot | undefined>(undefined);
    const [senderEmails, setSenderEmails] = useState<Record<string, string>>({});

    const pageIndex = pageStack.length - 1;

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const cursor = pageStack[pageIndex];
                const { rows, next } = await listBroadcasts(PER_PAGE, cursor);
                if (cancelled) return;
                setRows(rows);
                setNext(next);

                const uids = Array.from(new Set(rows.map(r => r.sentBy))).filter(u => !(u in senderEmails));
                if (uids.length > 0) {
                    const results = await Promise.all(uids.map(async u => [u, await getUserEmail(u)] as const));
                    if (cancelled) return;
                    setSenderEmails(prev => {
                        const merged = { ...prev };
                        for (const [uid, email] of results) if (email) merged[uid] = email;
                        return merged;
                    });
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageIndex]);

    const goNext = () => {
        if (!next) return;
        setPageStack(prev => [...prev, next]);
    };
    const goPrev = () => {
        if (pageStack.length <= 1) return;
        setPageStack(prev => prev.slice(0, -1));
    };

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Broadcast history</h1>
                    <p className="text-sm text-muted-foreground">Every push notification sent from this dashboard.</p>
                </div>
                <Button onClick={() => navigate('/admin/broadcast/new')}>
                    <Plus className="w-4 h-4 mr-2" />New broadcast
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Sent broadcasts</CardTitle>
                    <CardDescription>Most recent first.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                        </div>
                    ) : rows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm">
                            <Inbox className="w-8 h-8 mb-2" />
                            No broadcasts yet.
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Sent</TableHead>
                                            <TableHead>Title</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Target</TableHead>
                                            <TableHead className="text-right">Delivered</TableHead>
                                            <TableHead className="text-right">Failed</TableHead>
                                            <TableHead>By</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {rows.map(r => (
                                            <TableRow key={r.id}>
                                                <TableCell className="whitespace-nowrap text-sm">{formatDate(r.sentAt)}</TableCell>
                                                <TableCell className="max-w-xs">
                                                    <div className="font-medium truncate">{r.title}</div>
                                                    <div className="text-xs text-muted-foreground truncate">{r.body}</div>
                                                </TableCell>
                                                <TableCell><Badge variant="secondary">{r.category}</Badge></TableCell>
                                                <TableCell className="text-sm">{targetLabel(r.target)}</TableCell>
                                                <TableCell className="text-right tabular-nums">{r.sentCount}</TableCell>
                                                <TableCell className="text-right tabular-nums">{r.failedCount}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground truncate max-w-[14rem]">
                                                    {senderEmails[r.sentBy] || r.sentBy}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="flex items-center justify-between pt-4">
                                <div className="text-xs text-muted-foreground">Page {pageIndex + 1}</div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={goPrev} disabled={pageIndex === 0}>
                                        <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={goNext} disabled={!next}>
                                        Next <ChevronRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
