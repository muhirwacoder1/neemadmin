import {
    collection, doc, getDoc, getDocs, query, orderBy, limit, startAfter,
    type DocumentSnapshot, type QueryDocumentSnapshot, type Timestamp,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../config/firebase';

export type BroadcastCategory = 'announcement' | 'glucose' | 'water' | 'bloodpressure' | 'medication';
export type DiabetesType = 'type1' | 'type2' | 'gestational' | 'prediabetes';

export type BroadcastTarget =
    | { type: 'all' }
    | { type: 'users'; uids: string[] }
    | { type: 'diabetesType'; value: DiabetesType };

export interface SendAdminNotificationInput {
    title: string;
    body: string;
    category: BroadcastCategory;
    target: BroadcastTarget;
}

export interface SendAdminNotificationResult {
    broadcastId: string;
    sentCount: number;
    failedCount: number;
    recipientCount: number;
}

export interface BroadcastRecord {
    id: string;
    title: string;
    body: string;
    category: BroadcastCategory;
    target: BroadcastTarget;
    sentBy: string;
    sentAt?: Timestamp;
    sentCount: number;
    failedCount: number;
    recipientCount?: number;
}

const functions = getFunctions(undefined, 'us-central1');

export async function sendAdminNotification(
    input: SendAdminNotificationInput,
): Promise<SendAdminNotificationResult> {
    const callable = httpsCallable<SendAdminNotificationInput, SendAdminNotificationResult>(
        functions,
        'sendAdminNotification',
    );
    const res = await callable(input);
    return res.data;
}

const broadcastsRef = collection(db, 'broadcasts');

export async function listBroadcasts(
    pageSize: number,
    cursor?: QueryDocumentSnapshot,
): Promise<{ rows: BroadcastRecord[]; next?: QueryDocumentSnapshot }> {
    const base = cursor
        ? query(broadcastsRef, orderBy('sentAt', 'desc'), startAfter(cursor), limit(pageSize))
        : query(broadcastsRef, orderBy('sentAt', 'desc'), limit(pageSize));
    const snap = await getDocs(base);
    const rows = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<BroadcastRecord, 'id'>) }));
    const next = snap.docs.length === pageSize ? snap.docs[snap.docs.length - 1] : undefined;
    return { rows, next };
}

export async function getUserEmail(uid: string): Promise<string | null> {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return (snap.data().email as string) ?? null;
}

export type UserSummary = { uid: string; email: string; username: string };

export async function searchUsers(term: string, max = 25): Promise<UserSummary[]> {
    const t = term.trim().toLowerCase();
    if (!t) return [];
    // Simple client-side filter: fetch a bounded page and filter locally by email/username.
    // For scale, replace with a backend search (Algolia / Typesense) or denormalized lowercase fields.
    const snap = await getDocs(query(collection(db, 'users'), limit(200)));
    const rows: UserSummary[] = [];
    for (const d of snap.docs) {
        const data = d.data() as { email?: string; username?: string; role?: string };
        if (['admin', 'physician', 'doctor'].includes(data.role ?? '')) continue;
        const email = (data.email ?? '').toLowerCase();
        const username = (data.username ?? '').toLowerCase();
        if (email.includes(t) || username.includes(t)) {
            rows.push({ uid: d.id, email: data.email ?? '', username: data.username ?? '' });
            if (rows.length >= max) break;
        }
    }
    return rows;
}

export type BroadcastCursor = QueryDocumentSnapshot | DocumentSnapshot;
