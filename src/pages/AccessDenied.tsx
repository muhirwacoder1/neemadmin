import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '../context/AuthContext';

export function AccessDenied() {
    const navigate = useNavigate();
    const { logout } = useAuth();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
            <div className="max-w-md w-full text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
                    <ShieldAlert className="w-7 h-7" />
                </div>
                <h1 className="text-xl font-semibold">Access denied</h1>
                <p className="text-sm text-muted-foreground">
                    Your account doesn't have admin privileges for this dashboard.
                    Contact an administrator if you believe this is a mistake.
                </p>
                <div className="flex gap-2 justify-center">
                    <Button variant="outline" onClick={() => navigate(-1)}>Go back</Button>
                    <Button onClick={handleLogout}>Log out</Button>
                </div>
            </div>
        </div>
    );
}
