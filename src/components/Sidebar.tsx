import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard, Users, CalendarCheck, UserCircle, LogOut, Stethoscope, Settings, ChevronsLeft, ChevronsRight, ShoppingBag, Video, FileText,
} from 'lucide-react';

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const isAdmin = user?.role === 'admin';

    const adminLinks = [
        { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/admin/providers', icon: Users, label: 'Providers' },
        { to: '/admin/products', icon: ShoppingBag, label: 'Products' },
        { to: '/admin/videos', icon: Video, label: 'Videos' },
        { to: '/admin/blogs', icon: FileText, label: 'Blogs' },
        { to: '/admin/appointments', icon: CalendarCheck, label: 'Appointments' },
        { to: '/admin/settings', icon: Settings, label: 'Settings' },
    ];

    const physicianLinks = [
        { to: '/physician', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/physician/appointments', icon: CalendarCheck, label: 'Appointments' },
        { to: '/physician/profile', icon: UserCircle, label: 'My Profile' },
    ];

    const links = isAdmin ? adminLinks : physicianLinks;

    return (
        <aside className={`fixed left-0 top-0 bottom-0 bg-slate-900 flex flex-col z-50 transition-all duration-300 ${collapsed ? 'w-[68px]' : 'w-64'}`}>
            {/* Logo */}
            <div className={`h-16 flex items-center border-b border-white/10 shrink-0 ${collapsed ? 'px-4 justify-center' : 'px-6 gap-3'}`}>
                <div className="w-8 h-8 rounded-lg bg-blue-600 shadow-lg shadow-blue-600/20 flex items-center justify-center shrink-0">
                    <Stethoscope className="w-4 h-4 text-white" />
                </div>
                {!collapsed && (
                    <div className="min-w-0">
                        <h1 className="text-white font-bold text-base leading-none tracking-tight">Neem</h1>
                        <p className="text-slate-400 text-[10px] font-medium mt-0.5 tracking-wide uppercase">{isAdmin ? 'Admin' : 'Physician'}</p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className={`flex-1 py-6 overflow-y-auto ${collapsed ? 'px-2' : 'px-4'}`}>
                {!collapsed && (
                    <p className="px-3 mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Menu</p>
                )}
                <div className="space-y-1">
                    {links.map(link => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            end={link.to === '/admin' || link.to === '/physician'}
                            title={collapsed ? link.label : undefined}
                            className={({ isActive }) =>
                                `relative flex items-center rounded-lg text-[13px] font-medium transition-all duration-200 ${
                                    collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'
                                } ${isActive
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                }`
                            }
                        >
                            <link.icon className={`w-[18px] h-[18px] shrink-0 ${collapsed ? '' : 'transition-transform duration-200 group-hover:scale-110'}`} />
                            {!collapsed && <span>{link.label}</span>}
                        </NavLink>
                    ))}
                </div>
            </nav>

            {/* Collapse toggle */}
            <div className={`px-3 py-2 shrink-0 ${collapsed ? 'flex justify-center' : ''}`}>
                <button
                    onClick={onToggle}
                    className={`flex items-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-all duration-150 ${
                        collapsed ? 'p-2.5 justify-center' : 'gap-3 px-3 py-2 w-full'
                    }`}
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
                    {!collapsed && <span className="text-sm">Collapse</span>}
                </button>
            </div>

            {/* User Profile & Logout */}
            <div className={`py-3 border-t border-white/10 shrink-0 ${collapsed ? 'px-2' : 'px-4'}`}>
                {collapsed ? (
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 text-xs font-bold" title={user?.displayName || user?.email || ''}>
                            {user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || '?'}
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                            title="Sign out"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-3 px-2 py-2 mb-1 rounded-lg hover:bg-white/5 transition-colors cursor-default">
                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 text-xs font-bold shrink-0">
                                {user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white text-[13px] font-semibold truncate leading-tight">{user?.displayName || 'User'}</p>
                                <p className="text-slate-400 text-[11px] truncate">{user?.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-[13px] font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        >
                            <LogOut className="w-[18px] h-[18px]" />
                            <span>Sign out</span>
                        </button>
                    </>
                )}
            </div>
        </aside>
    );
}
