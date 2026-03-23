import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: 'AIzaSyDaFuSQ9lz-3An-5GQ9q8ztzxy91NHAceY',
    authDomain: 'neem-app-e042d.firebaseapp.com',
    projectId: 'neem-app-e042d',
    storageBucket: 'neem-app-e042d.firebasestorage.app',
    messagingSenderId: '333411713540',
    appId: '1:333411713540:web:e165f70e1bbcfad1d52b51',
    measurementId: 'G-1N2R0K9XHM',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
