import {
    collection, doc, addDoc, updateDoc, deleteDoc, getDocs,
    query, orderBy, where, serverTimestamp, getDoc,
    type Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth, db, storage } from '../config/firebase';

// ── Types ──────────────────────────────────────────────────────────
export interface Provider {
    id?: string;
    uid?: string;
    name: string;
    title: string;
    specialty: string;
    email: string;
    phone: string;
    about: string;
    profileImage: string;
    availableDays: string[];
    availableHours: { start: string; end: string };
    timeSlotDuration: number;
    rating: number;
    experience: string;
    price: string;
    active: boolean;
    createdAt?: Timestamp;
}

export interface ProductBadge {
    id: string;
    label: string;
    type: string;
}

export interface Product {
    id?: string;
    name: string;
    price: number;
    currency: 'RWF' | 'USD';
    priceFormatted: string;
    images: string[];
    description: string;
    benefits: string[];
    ingredients: string;
    directions: string;
    warning: string;
    badges: ProductBadge[];
    rating: number;
    reviewCount: number;
    deliveryDays: number;
    active: boolean;
    createdAt?: Timestamp;
}

export interface Appointment {
    id?: string;
    patientId: string;
    patientName: string;
    patientEmail: string;
    providerId: string;
    providerName: string;
    providerEmail: string;
    date: string;
    time: string;
    description: string;
    status: 'pending' | 'approved' | 'denied';
    statusNote?: string;
    meetingLink?: string;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

// ── Provider CRUD ──────────────────────────────────────────────────
const providersRef = collection(db, 'providers');

export async function getProviders(): Promise<Provider[]> {
    const q = query(providersRef, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Provider));
}

export async function getProvider(id: string): Promise<Provider | null> {
    const snap = await getDoc(doc(db, 'providers', id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Provider;
}

export async function addProvider(data: Omit<Provider, 'id' | 'createdAt'>): Promise<string> {
    const docRef = await addDoc(providersRef, { ...data, createdAt: serverTimestamp() });
    return docRef.id;
}

export async function updateProvider(id: string, data: Partial<Provider>): Promise<void> {
    await updateDoc(doc(db, 'providers', id), data);
}

export async function deleteProvider(id: string): Promise<void> {
    await deleteDoc(doc(db, 'providers', id));
}

export async function uploadProviderImage(file: File, providerId: string): Promise<string> {
    const storageRef = ref(storage, `providers/${providerId}/${file.name}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
}

// ── Appointment CRUD ───────────────────────────────────────────────
const appointmentsRef = collection(db, 'appointments');

export async function getAppointments(filters?: {
    providerId?: string;
    status?: string;
}): Promise<Appointment[]> {
    let q = query(appointmentsRef, orderBy('createdAt', 'desc'));
    if (filters?.providerId) {
        q = query(appointmentsRef, where('providerId', '==', filters.providerId), orderBy('createdAt', 'desc'));
    }
    const snap = await getDocs(q);
    let results = snap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment));
    if (filters?.status && filters.status !== 'all') {
        results = results.filter(a => a.status === filters.status);
    }
    return results;
}

export async function updateAppointmentStatus(
    id: string,
    status: 'approved' | 'denied',
    note?: string,
    meetingLink?: string,
): Promise<void> {
    const updateData: Record<string, any> = {
        status,
        statusNote: note || null,
        updatedAt: serverTimestamp(),
    };
    if (status === 'approved' && meetingLink) {
        updateData.meetingLink = meetingLink;
    }
    await updateDoc(doc(db, 'appointments', id), updateData);
}

// ── Stats ──────────────────────────────────────────────────────────
export async function getDashboardStats() {
    const [providers, appointments] = await Promise.all([
        getDocs(providersRef),
        getDocs(appointmentsRef),
    ]);
    const apptList = appointments.docs.map(d => d.data() as Appointment);
    return {
        totalProviders: providers.size,
        totalAppointments: appointments.size,
        pendingAppointments: apptList.filter(a => a.status === 'pending').length,
        approvedAppointments: apptList.filter(a => a.status === 'approved').length,
        deniedAppointments: apptList.filter(a => a.status === 'denied').length,
    };
}

// ── Physician Account Management ──────────────────────────────────

const functions = getFunctions();

export async function createPhysicianAccount(data: {
    email: string;
    password: string;
    name: string;
    providerId: string;
}): Promise<{ uid: string }> {
    const callable = httpsCallable<typeof data, { uid: string }>(functions, 'createPhysicianAccount');
    const result = await callable(data);
    return result.data;
}

export async function resetPhysicianPassword(email: string, newPassword: string): Promise<void> {
    const callable = httpsCallable(functions, 'resetPhysicianPassword');
    await callable({ email, newPassword });
}

// ── Product CRUD ────────────────────────────────────────────────
const productsRef = collection(db, 'products');

export async function getProducts(): Promise<Product[]> {
    const q = query(productsRef, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
}

export async function getProduct(id: string): Promise<Product | null> {
    const snap = await getDoc(doc(db, 'products', id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Product;
}

export async function addProduct(data: Omit<Product, 'id' | 'createdAt'>): Promise<string> {
    const docRef = await addDoc(productsRef, { ...data, createdAt: serverTimestamp() });
    return docRef.id;
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<void> {
    await updateDoc(doc(db, 'products', id), data);
}

export async function deleteProduct(id: string): Promise<void> {
    await deleteDoc(doc(db, 'products', id));
}

export async function uploadProductImage(file: File, productId: string): Promise<string> {
    const storageRef = ref(storage, `products/${productId}/${file.name}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
}

// ── Video CRUD ─────────────────────────────────────────────────
export type VideoCategory = 'General' | 'Nutrition' | 'Sports' | 'Wellness';
export type VideoSource = 'cloudinary' | 'youtube';

export interface Video {
    id?: string;
    title: string;
    description: string;
    category: VideoCategory;
    thumbnail: string;
    videoSource: VideoSource;
    videoUrl: string;
    duration: string;
    active: boolean;
    createdAt?: Timestamp;
}

const videosRef = collection(db, 'videos');

export async function getVideos(): Promise<Video[]> {
    const q = query(videosRef, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Video));
}

export async function getVideo(id: string): Promise<Video | null> {
    const snap = await getDoc(doc(db, 'videos', id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Video;
}

export async function addVideo(data: Omit<Video, 'id' | 'createdAt'>): Promise<string> {
    const docRef = await addDoc(videosRef, { ...data, createdAt: serverTimestamp() });
    return docRef.id;
}

export async function updateVideo(id: string, data: Partial<Video>): Promise<void> {
    await updateDoc(doc(db, 'videos', id), data);
}

export async function deleteVideo(id: string): Promise<void> {
    await deleteDoc(doc(db, 'videos', id));
}

export async function uploadVideoThumbnail(file: File, videoId: string): Promise<string> {
    const storageRef = ref(storage, `videos/${videoId}/${file.name}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
}

// ── Blog CRUD ──────────────────────────────────────────────────
export type BlogCategory = 'Diabetes 101' | 'Nutrition' | 'Lifestyle' | 'Mental Health';

export interface BlogPost {
    id?: string;
    title: string;
    description: string;
    category: BlogCategory;
    coverImage: string;
    author: string;
    content: string;            // HTML from RichTextEditor
    status: 'published' | 'draft';
    readTime: string;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

const blogsRef = collection(db, 'blogs');

export async function getBlogs(): Promise<BlogPost[]> {
    const q = query(blogsRef, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as BlogPost));
}

export async function getBlog(id: string): Promise<BlogPost | null> {
    const snap = await getDoc(doc(db, 'blogs', id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as BlogPost;
}

export async function addBlog(data: Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(blogsRef, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return docRef.id;
}

export async function updateBlog(id: string, data: Partial<BlogPost>): Promise<void> {
    await updateDoc(doc(db, 'blogs', id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteBlog(id: string): Promise<void> {
    await deleteDoc(doc(db, 'blogs', id));
}

export async function uploadBlogImage(file: File, blogId: string): Promise<string> {
    const storageRef = ref(storage, `blogs/${blogId}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
}
