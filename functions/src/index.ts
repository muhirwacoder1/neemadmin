import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore();

type Category = 'announcement' | 'glucose' | 'water' | 'bloodpressure' | 'medication';
type DiabetesType = 'type1' | 'type2' | 'gestational' | 'prediabetes';

type Target =
    | { type: 'all' }
    | { type: 'users'; uids: string[] }
    | { type: 'diabetesType'; value: DiabetesType };

interface Input {
    title: string;
    body: string;
    category: Category;
    target: Target;
}

interface ExpoTicket {
    status: 'ok' | 'error';
    id?: string;
    message?: string;
    details?: { error?: string };
}

const EXPO_URL = 'https://exp.host/--/api/v2/push/send';
const VALID_CATEGORIES: Category[] = ['announcement', 'glucose', 'water', 'bloodpressure', 'medication'];
const VALID_DIABETES: DiabetesType[] = ['type1', 'type2', 'gestational', 'prediabetes'];

function channelFor(category: Category): string {
    return category === 'announcement' ? 'appointments' : `reminder-${category}`;
}

function chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

async function assertAdmin(uid: string | undefined): Promise<string> {
    if (!uid) throw new HttpsError('unauthenticated', 'Sign-in required.');
    const snap = await db.doc(`admins/${uid}`).get();
    if (!snap.exists) throw new HttpsError('permission-denied', 'Admin access required.');
    return uid;
}

function validateInput(data: unknown): Input {
    if (!data || typeof data !== 'object') throw new HttpsError('invalid-argument', 'Invalid payload.');
    const d = data as Partial<Input>;

    const title = (d.title ?? '').toString().trim();
    const body = (d.body ?? '').toString().trim();
    if (!title || title.length > 100) throw new HttpsError('invalid-argument', 'Title must be 1-100 chars.');
    if (!body || body.length > 240) throw new HttpsError('invalid-argument', 'Body must be 1-240 chars.');

    const category = d.category as Category;
    if (!VALID_CATEGORIES.includes(category)) throw new HttpsError('invalid-argument', 'Invalid category.');

    const target = d.target as Target | undefined;
    if (!target || typeof target !== 'object') throw new HttpsError('invalid-argument', 'Invalid target.');

    if (target.type === 'all') {
        // ok
    } else if (target.type === 'users') {
        if (!Array.isArray(target.uids) || target.uids.length === 0) {
            throw new HttpsError('invalid-argument', 'users target requires non-empty uids array.');
        }
        if (target.uids.length > 500) {
            throw new HttpsError('invalid-argument', 'Too many uids (max 500).');
        }
        if (!target.uids.every(u => typeof u === 'string' && u.length > 0)) {
            throw new HttpsError('invalid-argument', 'All uids must be non-empty strings.');
        }
    } else if (target.type === 'diabetesType') {
        if (!VALID_DIABETES.includes(target.value)) {
            throw new HttpsError('invalid-argument', 'Invalid diabetesType value.');
        }
    } else {
        throw new HttpsError('invalid-argument', 'Unknown target.type.');
    }

    return { title, body, category, target };
}

async function resolveRecipients(target: Target): Promise<Array<{ uid: string; pushToken: string | null }>> {
    if (target.type === 'all') {
        const snap = await db.collection('users').get();
        return snap.docs.map(d => ({ uid: d.id, pushToken: (d.data().pushToken ?? null) as string | null }));
    }
    if (target.type === 'users') {
        const results = await Promise.all(
            target.uids.map(async uid => {
                const d = await db.doc(`users/${uid}`).get();
                return { uid, pushToken: d.exists ? ((d.data()?.pushToken ?? null) as string | null) : null };
            }),
        );
        return results;
    }
    // diabetesType
    const snap = await db.collection('users').where('profile.diabetesType', '==', target.value).get();
    return snap.docs.map(d => ({ uid: d.id, pushToken: (d.data().pushToken ?? null) as string | null }));
}

async function sendExpoBatch(messages: object[]): Promise<ExpoTicket[]> {
    const res = await fetch(EXPO_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(messages),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new HttpsError('internal', `Expo push failed: ${res.status} ${text}`);
    }
    const json = (await res.json()) as { data?: ExpoTicket[] };
    return json.data ?? [];
}

async function writeInboxBatch(
    recipients: Array<{ uid: string }>,
    payload: { title: string; body: string; category: Category; broadcastId: string; sentBy: string },
): Promise<void> {
    // Firestore writeBatch max 500 ops
    const chunks = chunk(recipients, 450);
    for (const group of chunks) {
        const batch = db.batch();
        for (const r of group) {
            const ref = db.collection('users').doc(r.uid).collection('notifications').doc();
            batch.set(ref, {
                title: payload.title,
                body: payload.body,
                category: payload.category,
                sentAt: FieldValue.serverTimestamp(),
                readAt: null,
                sentBy: payload.sentBy,
                broadcastId: payload.broadcastId,
            });
        }
        await batch.commit();
    }
}

export const sendAdminNotification = onCall(
    { region: 'us-central1', timeoutSeconds: 300, memory: '512MiB' },
    async (request: CallableRequest<unknown>) => {
        const adminUid = await assertAdmin(request.auth?.uid);
        const input = validateInput(request.data);

        const recipients = await resolveRecipients(input.target);
        const withTokens = recipients.filter(r => !!r.pushToken) as Array<{ uid: string; pushToken: string }>;

        const broadcastRef = db.collection('broadcasts').doc();
        const broadcastId = broadcastRef.id;

        // 1) Write inbox docs for every targeted user (even those without tokens — so they see it in-app).
        await writeInboxBatch(recipients, {
            title: input.title,
            body: input.body,
            category: input.category,
            broadcastId,
            sentBy: adminUid,
        });

        // 2) Send Expo push in chunks of 100.
        let sentCount = 0;
        let failedCount = 0;
        const invalidTokenUids: string[] = [];

        const batches = chunk(withTokens, 100);
        for (const group of batches) {
            const messages = group.map(r => ({
                to: r.pushToken,
                title: input.title,
                body: input.body,
                sound: 'default',
                channelId: channelFor(input.category),
                data: { type: 'admin', category: input.category, broadcastId },
            }));
            try {
                const tickets = await sendExpoBatch(messages);
                tickets.forEach((ticket, i) => {
                    if (ticket.status === 'ok') {
                        sentCount++;
                    } else {
                        failedCount++;
                        if (ticket.details?.error === 'DeviceNotRegistered') {
                            invalidTokenUids.push(group[i].uid);
                        }
                    }
                });
            } catch (err) {
                failedCount += group.length;
                console.error('Expo batch failure', err);
            }
        }

        // 3) Clear invalid tokens.
        if (invalidTokenUids.length > 0) {
            const clearChunks = chunk(invalidTokenUids, 450);
            for (const group of clearChunks) {
                const batch = db.batch();
                for (const uid of group) {
                    batch.update(db.collection('users').doc(uid), { pushToken: FieldValue.delete() });
                }
                await batch.commit();
            }
        }

        // 4) Write broadcast audit record.
        const targetSummary =
            input.target.type === 'all'
                ? { type: 'all' as const }
                : input.target.type === 'users'
                    ? { type: 'users' as const, uids: input.target.uids }
                    : { type: 'diabetesType' as const, value: input.target.value };

        await broadcastRef.set({
            title: input.title,
            body: input.body,
            category: input.category,
            target: targetSummary,
            sentBy: adminUid,
            sentAt: FieldValue.serverTimestamp(),
            sentCount,
            failedCount,
            recipientCount: recipients.length,
        });

        return { broadcastId, sentCount, failedCount, recipientCount: recipients.length };
    },
);
