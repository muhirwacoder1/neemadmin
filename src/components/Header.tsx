import { Search, Bell, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Header() {
    const { user } = useAuth();

    return (
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 lg:px-8 shrink-0">
            <div className="flex items-center justify-between h-16">
                {/* Search */}
                <div className="relative w-72 lg:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search anything..."
                        className="w-full bg-slate-100/50 border border-slate-200/60 rounded-xl pl-9 pr-12 py-2 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all placeholder-slate-400"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex justify-center items-center">
                        <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-white border border-slate-200 rounded">⌘K</kbd>
                    </div>
                </div>

                {/* Right section */}
                <div className="flex items-center gap-1">
                    <button className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                        <MessageSquare className="w-[18px] h-[18px]" />
                    </button>
                    <button className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                        <Bell className="w-[18px] h-[18px]" />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
                    </button>

                    <div className="w-px h-8 bg-slate-200 mx-3" />

                    {/* User */}
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold">
                            {user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="hidden lg:block cursor-default">
                            <p className="text-[13px] font-semibold text-slate-900 leading-tight">{user?.displayName || 'User'}</p>
                            <p className="text-[11px] text-slate-500 capitalize">{user?.role || 'admin'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
