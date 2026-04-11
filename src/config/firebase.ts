import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const readRequiredEnv = (key: keyof ImportMetaEnv): string => {
    const value = import.meta.env[key];
    if (!value) {
        throw new Error(`Missing required webapp env: ${key}`);
    }
    return value;
};

const firebaseConfig = {
    apiKey: readRequiredEnv('VITE_FIREBASE_API_KEY'),
    authDomain: readRequiredEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: readRequiredEnv('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: readRequiredEnv('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: readRequiredEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: readRequiredEnv('VITE_FIREBASE_APP_ID'),
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || undefined,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
