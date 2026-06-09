import {
    collection, doc, addDoc, updateDoc, deleteDoc, getDocs,
    query, orderBy, where, serverTimestamp, getDoc, writeBatch,
    limit, type Timestamp,
} from 'firebase/firestore';
import {
    ref, uploadBytes, getDownloadURL, uploadBytesResumable,
    deleteObject, listAll, type UploadTask, type StorageError,
} from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth, db, storage, videoStorage } from '../config/firebase';

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

export interface ShopTestimonial {
    id?: string;
    customerName: string;
    photoUrl?: string;
    rating: number;
    message: string;
    visible: boolean;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

export type OrderStatus = 'pending' | 'accepted' | 'rejected';

export interface ShopOrderItem {
    productId: string;
    name: string;
    quantity: number;
    image?: string;
    unitPrice: number;
    currency: 'RWF' | 'USD';
    unitPriceFormatted: string;
    unitPriceRwf: number;
    lineTotalRwf: number;
}

export interface ShopOrder {
    id?: string;
    customerId: string;
    customerName: string;
    customerUsername?: string;
    customerEmail: string;
    customerPhone?: string;
    delivery: {
        country: string;
        address: string;
        coordinates?: { latitude: number; longitude: number } | null;
    };
    items: ShopOrderItem[];
    totalAmount: number;
    totalCurrency: 'RWF' | 'USD';
    totalFormatted: string;
    usdToRwfRate?: number;
    payment?: {
        method: string;
        status: string;
        ussd?: string;
    };
    status: OrderStatus;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
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

export interface PatientProfileData {
    age?: number | null;
    height?: number | null;
    weight?: number | null;
    targetWeight?: number | null;
    diabetesType?: string | null;
    activityLevel?: string | null;
    goals?: string[];
    medicalConditions?: string[];
    hasMedicalCondition?: boolean | null;
    medicalConditionAnswer?: 'yes' | 'no' | null;
    heightUnit?: string | null;
    heightDisplayValue?: number | null;
    weightUnit?: string | null;
    weightDisplayValue?: number | null;
    targetWeightUnit?: string | null;
    targetWeightDisplayValue?: number | null;
    phoneNumber?: string | null;
}

export interface PatientRecord {
    id?: string;
    uid: string;
    email: string;
    username: string;
    role: string;
    photoURL?: string | null;
    phone?: string | null;
    tel?: string | null;
    onboardingComplete?: boolean;
    createdAt?: Timestamp;
    onboardingCompletedAt?: Timestamp;
    profile?: PatientProfileData;
}

export interface GlucoseReading {
    id?: string;
    value?: number;
    unit?: string;
    mealTiming?: string;
    notes?: string | null;
    timestamp?: Timestamp;
}

export interface BloodPressureReading {
    id?: string;
    systolic?: number;
    diastolic?: number;
    notes?: string | null;
    timestamp?: Timestamp;
}

export interface PatientVitalsRecord {
    patient: PatientRecord;
    bmi: number | null;
    latestGlucose: GlucoseReading | null;
    latestBloodPressure: BloodPressureReading | null;
}

// ── Provider CRUD ──────────────────────────────────────────────────
const usersRef = collection(db, 'users');
const providersRef = collection(db, 'providers');

export async function getPatients(): Promise<PatientRecord[]> {
    const q = query(usersRef, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs
        .map(d => ({ id: d.id, ...d.data() } as PatientRecord))
        .filter(user => !['admin', 'physician', 'doctor'].includes(user.role));
}

export async function getPatient(uid: string): Promise<PatientRecord | null> {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as PatientRecord;
}

async function getLatestPatientMetric<T>(uid: string, metric: 'glucose' | 'bloodPressure'): Promise<T | null> {
    const q = query(
        collection(db, 'users', uid, metric),
        orderBy('timestamp', 'desc'),
        limit(1),
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as T;
}

function calculatePatientBmi(patient: PatientRecord): number | null {
    const heightCm = patient.profile?.height;
    const weightKg = patient.profile?.weight;
    if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return null;

    const heightM = heightCm / 100;
    return weightKg / (heightM * heightM);
}

export async function getPatientVitals(): Promise<PatientVitalsRecord[]> {
    const patients = await getPatients();

    return Promise.all(patients.map(async (patient) => {
        const uid = patient.id || patient.uid;
        const [latestGlucose, latestBloodPressure] = await Promise.all([
            getLatestPatientMetric<GlucoseReading>(uid, 'glucose'),
            getLatestPatientMetric<BloodPressureReading>(uid, 'bloodPressure'),
        ]);

        return {
            patient,
            bmi: calculatePatientBmi(patient),
            latestGlucose,
            latestBloodPressure,
        };
    }));
}

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

// â”€â”€ Testimonial CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const testimonialsRef = collection(db, 'testimonials');

export async function getTestimonials(): Promise<ShopTestimonial[]> {
    const q = query(testimonialsRef, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as ShopTestimonial));
}

export async function addTestimonial(data: Omit<ShopTestimonial, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(testimonialsRef, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return docRef.id;
}

export async function updateTestimonial(id: string, data: Partial<ShopTestimonial>): Promise<void> {
    await updateDoc(doc(db, 'testimonials', id), {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

export async function deleteTestimonial(id: string): Promise<void> {
    await deleteDoc(doc(db, 'testimonials', id));
}

export async function uploadTestimonialPhoto(file: File, testimonialId: string): Promise<string> {
    const storageRef = ref(storage, `testimonials/${testimonialId}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
}

// â”€â”€ Orders CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ordersRef = collection(db, 'orders');

export async function getOrders(): Promise<ShopOrder[]> {
    const q = query(ordersRef, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as ShopOrder));
}

export async function updateOrderStatus(id: string, status: Exclude<OrderStatus, 'pending'>): Promise<void> {
    await updateDoc(doc(db, 'orders', id), {
        status,
        updatedAt: serverTimestamp(),
    });
}

// ── Video CRUD ─────────────────────────────────────────────────
export type VideoCategory = 'General' | 'Nutrition' | 'Sports' | 'Wellness';
export type VideoSource = 'cloudinary' | 'youtube' | 'firebase';
export type VideoProcessingStatus = 'uploading' | 'processing' | 'ready' | 'error';

export interface VideoRendition {
    quality: string;       // e.g. '480p', '720p'
    url: string;
    path: string;
    width?: number;
}

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
    // Firebase-hosted video fields (populated for videoSource === 'firebase')
    storagePath?: string;            // source object: videos/{id}/source/<file>
    playbackUrl?: string;            // optimized URL the app plays (rendition if ready, else source)
    renditions?: VideoRendition[];
    processingStatus?: VideoProcessingStatus;
    processingError?: string;
    fileSizeBytes?: number;
    thumbnailPath?: string;          // storage path of the thumbnail (for cleanup)
    originalFileName?: string;
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
    // Remove the Firestore doc first (the user-visible record), then best-effort
    // clean up any Storage objects under videos/{id}/ so we don't orphan files.
    await deleteDoc(doc(db, 'videos', id));
    try {
        const folderRef = ref(videoStorage, `videos/${id}`);
        const listing = await listAll(folderRef);
        // Delete files in this folder and one level of subfolders (source/,
        // renditions/, thumbnail/).
        const fileDeletes = listing.items.map(item => deleteObject(item).catch(() => {}));
        const subfolderDeletes = listing.prefixes.map(async prefix => {
            const sub = await listAll(prefix);
            await Promise.all(sub.items.map(item => deleteObject(item).catch(() => {})));
        });
        await Promise.all([...fileDeletes, ...subfolderDeletes]);
    } catch (err) {
        // Storage cleanup is best-effort; the doc is already gone.
        console.warn('Video storage cleanup failed for', id, err);
    }
}

export async function uploadVideoThumbnail(
    file: File,
    videoId: string,
): Promise<{ url: string; path: string }> {
    const path = `videos/${videoId}/thumbnail/${file.name}`;
    const storageRef = ref(videoStorage, path);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return { url, path };
}

// ── Resumable video upload (Firebase Storage) ──────────────────
export interface VideoUploadHandlers {
    onProgress?: (percent: number, bytesTransferred: number, totalBytes: number) => void;
    onStateChange?: (state: 'running' | 'paused' | 'success' | 'canceled' | 'error') => void;
    onError?: (error: StorageError) => void;
    onComplete?: (result: { downloadUrl: string; storagePath: string }) => void;
}

export interface VideoUploadController {
    task: UploadTask;
    storagePath: string;
    pause: () => boolean;
    resume: () => boolean;
    cancel: () => boolean;
}

/**
 * Upload a video file to the dedicated video bucket using a resumable upload.
 * The Firebase SDK automatically retries transient network failures while the
 * task stays alive, so progress is preserved across short connection drops.
 * Returns a controller exposing pause/resume/cancel.
 */
export function uploadVideoResumable(
    file: File,
    videoId: string,
    handlers: VideoUploadHandlers = {},
): VideoUploadController {
    const storagePath = `videos/${videoId}/source/${file.name}`;
    const storageRef = ref(videoStorage, storagePath);
    const task = uploadBytesResumable(storageRef, file, {
        contentType: file.type || 'video/mp4',
    });

    task.on(
        'state_changed',
        snapshot => {
            const percent = snapshot.totalBytes
                ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
                : 0;
            handlers.onProgress?.(percent, snapshot.bytesTransferred, snapshot.totalBytes);
            if (snapshot.state === 'running') handlers.onStateChange?.('running');
            else if (snapshot.state === 'paused') handlers.onStateChange?.('paused');
        },
        error => {
            // 'storage/canceled' is a deliberate cancel, not a failure.
            if (error.code === 'storage/canceled') {
                handlers.onStateChange?.('canceled');
            } else {
                handlers.onStateChange?.('error');
                handlers.onError?.(error);
            }
        },
        async () => {
            handlers.onStateChange?.('success');
            const downloadUrl = await getDownloadURL(task.snapshot.ref);
            handlers.onComplete?.({ downloadUrl, storagePath });
        },
    );

    return {
        task,
        storagePath,
        pause: () => task.pause(),
        resume: () => task.resume(),
        cancel: () => task.cancel(),
    };
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

// Learning Materials CRUD
export type LearningMaterialCategory =
    | 'Diabetes 101'
    | 'Nutrition'
    | 'Self Care'
    | 'Medication'
    | 'Exercise'
    | 'Mental Health';
export type LearningMaterialStatus = 'published' | 'draft';
export type LearningMaterialVideoSource = 'youtube' | 'cloudinary';
export type LearningMaterialMediaType = 'video' | 'image';

export interface LearningMaterial {
    id?: string;
    title: string;
    category: LearningMaterialCategory;
    thumbnailImage: string;
    mediaType?: LearningMaterialMediaType;
    videoSource: LearningMaterialVideoSource;
    videoUrl: string;
    imageUrl?: string;
    body: string;
    status: LearningMaterialStatus;
    publishDate: string;
    featured: boolean;
    displayOrder: number;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

const learningMaterialsRef = collection(db, 'learningMaterials');

export async function getLearningMaterials(): Promise<LearningMaterial[]> {
    const snap = await getDocs(learningMaterialsRef);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as LearningMaterial));
}

export async function getLearningMaterial(id: string): Promise<LearningMaterial | null> {
    const snap = await getDoc(doc(db, 'learningMaterials', id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as LearningMaterial;
}

export async function addLearningMaterial(data: Omit<LearningMaterial, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(learningMaterialsRef, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return docRef.id;
}

export async function updateLearningMaterial(id: string, data: Partial<LearningMaterial>): Promise<void> {
    await updateDoc(doc(db, 'learningMaterials', id), {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

export async function deleteLearningMaterial(id: string): Promise<void> {
    await deleteDoc(doc(db, 'learningMaterials', id));
}

export async function reorderLearningMaterials(items: { id: string; displayOrder: number }[]): Promise<void> {
    const batch = writeBatch(db);
    items.forEach(item => {
        batch.update(doc(db, 'learningMaterials', item.id), {
            displayOrder: item.displayOrder,
            updatedAt: serverTimestamp(),
        });
    });
    await batch.commit();
}

export async function uploadLearningThumbnail(file: File, materialId: string): Promise<string> {
    const storageRef = ref(storage, `learningMaterials/${materialId}/thumbnail_${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
}

export async function uploadLearningImage(file: File, materialId: string): Promise<string> {
    const storageRef = ref(storage, `learningMaterials/${materialId}/image_${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
}

export async function uploadLearningContentImage(file: File, materialId: string): Promise<string> {
    const storageRef = ref(storage, `learningMaterials/${materialId}/content_${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
}

// Active Exercise CRUD
export type ActiveExerciseCategory = 'Warm-up' | 'Strength' | 'Cardio' | 'Stretching' | 'Balance' | 'Cool-down';
export type ActiveExerciseStatus = 'published' | 'draft';
export type ActiveExerciseVideoSource = 'youtube' | 'cloudinary';

export interface ActiveExercise {
    id?: string;
    title: string;
    category: ActiveExerciseCategory;
    thumbnailImage: string;
    videoSource: ActiveExerciseVideoSource;
    videoUrl: string;
    instructions: string;
    duration: string;
    status: ActiveExerciseStatus;
    publishDate: string;
    featured: boolean;
    displayOrder: number;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

const activeExercisesRef = collection(db, 'activeExercises');

export async function getActiveExercises(): Promise<ActiveExercise[]> {
    const snap = await getDocs(activeExercisesRef);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as ActiveExercise));
}

export async function getActiveExercise(id: string): Promise<ActiveExercise | null> {
    const snap = await getDoc(doc(db, 'activeExercises', id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as ActiveExercise;
}

export async function addActiveExercise(data: Omit<ActiveExercise, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(activeExercisesRef, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return docRef.id;
}

export async function updateActiveExercise(id: string, data: Partial<ActiveExercise>): Promise<void> {
    await updateDoc(doc(db, 'activeExercises', id), {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

export async function deleteActiveExercise(id: string): Promise<void> {
    await deleteDoc(doc(db, 'activeExercises', id));
}

export async function reorderActiveExercises(items: { id: string; displayOrder: number }[]): Promise<void> {
    const batch = writeBatch(db);
    items.forEach(item => {
        batch.update(doc(db, 'activeExercises', item.id), {
            displayOrder: item.displayOrder,
            updatedAt: serverTimestamp(),
        });
    });
    await batch.commit();
}

export async function uploadActiveExerciseThumbnail(file: File, exerciseId: string): Promise<string> {
    const storageRef = ref(storage, `activeExercises/${exerciseId}/thumbnail_${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
}

export async function uploadActiveExerciseContentImage(file: File, exerciseId: string): Promise<string> {
    const storageRef = ref(storage, `activeExercises/${exerciseId}/content_${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
}

// ── Podcast CRUD ───────────────────────────────────────────────
export interface Podcast {
    id?: string;
    title: string;
    description: string;
    duration: string;
    audioUrl: string;
    thumbnail: string;
    active: boolean;
    createdAt?: Timestamp;
}

const podcastsRef = collection(db, 'podcasts');

export async function getPodcasts(): Promise<Podcast[]> {
    const q = query(podcastsRef, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Podcast));
}

export async function getPodcast(id: string): Promise<Podcast | null> {
    const snap = await getDoc(doc(db, 'podcasts', id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Podcast;
}

export async function addPodcast(data: Omit<Podcast, 'id' | 'createdAt'>): Promise<string> {
    const docRef = await addDoc(podcastsRef, { ...data, createdAt: serverTimestamp() });
    return docRef.id;
}

export async function updatePodcast(id: string, data: Partial<Podcast>): Promise<void> {
    await updateDoc(doc(db, 'podcasts', id), data);
}

export async function deletePodcast(id: string): Promise<void> {
    await deleteDoc(doc(db, 'podcasts', id));
}

export async function uploadPodcastThumbnail(file: File, podcastId: string): Promise<string> {
    const storageRef = ref(storage, `podcasts/${podcastId}/${file.name}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
}
