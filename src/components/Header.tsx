import { Search, Bell, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

export function Header() {
    const { user } = useAuth();

    return (
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-4 lg:px-8 shrink-0 flex items-center h-16 w-full gap-4">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
            </div>

            {/* Search */}
            <div className="relative w-full max-w-md hidden md:flex items-center">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search anything..."
                    className="w-full bg-muted/50 pl-9 pr-12 focus-visible:bg-background"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    <kbd className="inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                        <span className="text-xs">⌘</span>K
                    </kbd>
                </div>
            </div>

            <div className="flex-1" />

            {/* Right section */}
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-muted-foreground relative">
                    <MessageSquare className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground relative">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-2.5 right-2.5 h-2 w-2 bg-destructive rounded-full ring-2 ring-background" />
                </Button>

                <Separator orientation="vertical" className="mx-2 h-6" />

                {/* User */}
                <div className="flex items-center gap-3 pl-1">
                    <div className="hidden lg:flex flex-col items-end cursor-default">
                        <span className="text-sm font-medium leading-none">{user?.displayName || 'User'}</span>
                        <span className="text-xs text-muted-foreground mt-1 capitalize">{user?.role || 'admin'}</span>
                    </div>
                    <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                            {user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                    </Avatar>
                </div>
            </div>
        </header>
    );
}
