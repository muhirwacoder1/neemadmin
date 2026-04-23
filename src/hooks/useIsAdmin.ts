import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';

export function useIsAdmin() {
    const { user, loading: authLoading } = useAuth();
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            setIsAdmin(false);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const snap = await getDoc(doc(db, 'admins', user.uid));
                if (!cancelled) setIsAdmin(snap.exists());
            } catch {
                if (!cancelled) setIsAdmin(false);
            }
        })();
        return () => { cancelled = true; };
    }, [user, authLoading]);

    return { isAdmin, loading: authLoading || isAdmin === null };
}
