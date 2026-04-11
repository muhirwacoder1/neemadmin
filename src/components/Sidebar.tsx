import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard, Users, CalendarCheck, UserCircle, LogOut, Stethoscope, ShoppingBag, Video, FileText, Mic, BookOpen, Activity, PackageCheck, Star,
} from 'lucide-react';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function AppSidebar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { state } = useSidebar();
    const collapsed = state === "collapsed";

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const isAdmin = user?.role === 'admin';

    const adminLinks = [
        { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/admin/providers', icon: Users, label: 'Providers' },
        { to: '/admin/patients', icon: UserCircle, label: 'Patients' },
        { to: '/admin/products', icon: ShoppingBag, label: 'Products' },
        { to: '/admin/orders', icon: PackageCheck, label: 'Orders' },
        { to: '/admin/testimonials', icon: Star, label: 'Testimonials' },
        { to: '/admin/videos', icon: Video, label: 'Videos' },
        { to: '/admin/podcasts', icon: Mic, label: 'Podcasts' },
        { to: '/admin/blogs', icon: FileText, label: 'Blogs' },
        { to: '/admin/learning', icon: BookOpen, label: 'Learn Hub' },
        { to: '/admin/active', icon: Activity, label: 'Be Active' },
        { to: '/admin/appointments', icon: CalendarCheck, label: 'Appointments' },
    ];

    const physicianLinks = [
        { to: '/physician', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/physician/appointments', icon: CalendarCheck, label: 'Appointments' },
        { to: '/physician/profile', icon: UserCircle, label: 'My Profile' },
    ];

    const links = isAdmin ? adminLinks : physicianLinks;

    return (
        <Sidebar variant="sidebar" collapsible="icon">
            <SidebarHeader className="p-4 border-b border-border/50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary flex flex-shrink-0 items-center justify-center text-primary-foreground shadow-sm">
                        <Stethoscope className="w-4 h-4" />
                    </div>
                    {!collapsed && (
                        <div className="flex flex-col min-w-0 transition-opacity">
                            <span className="font-semibold text-foreground leading-tight tracking-tight">Neem</span>
                            <span className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">{isAdmin ? 'Admin' : 'Physician'}</span>
                        </div>
                    )}
                </div>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Menu</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {links.map((link) => (
                                <SidebarMenuItem key={link.to}>
                                    <SidebarMenuButton tooltip={link.label}>
                                        <NavLink
                                            to={link.to}
                                            end={link.to === '/admin' || link.to === '/physician'}
                                            className={({ isActive }) =>
                                                `flex items-center gap-2 w-full ${isActive ? "text-accent-foreground font-medium" : "text-muted-foreground"}`
                                            }
                                        >
                                            <link.icon className="h-4 w-4" />
                                            <span>{link.label}</span>
                                        </NavLink>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="border-t border-border/50 p-2">
                <DropdownMenu>
                    <DropdownMenuTrigger className="flex w-full items-center p-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground outline-none">
                            <Avatar className="h-8 w-8 rounded-md">
                                <AvatarFallback className="rounded-md bg-primary/10 text-primary font-semibold">
                                    {user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || '?'}
                                </AvatarFallback>
                            </Avatar>
                            {!collapsed && (
                                <div className="grid flex-1 text-left text-sm leading-tight ml-2">
                                    <span className="truncate font-semibold">{user?.displayName || 'User'}</span>
                                    <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
                                </div>
                            )}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="start" side="right" sideOffset={4}>
                        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10 cursor-pointer">
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
