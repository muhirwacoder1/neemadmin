import { useAuth } from '../context/AuthContext';

export function useIsAdmin() {
    const { user, loading } = useAuth();
    const isAdmin = !loading && user?.role === 'admin';
    return { isAdmin, loading };
}
