import { useState } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AppSidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginPage } from './pages/LoginPage';
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminProviders } from './pages/admin/Providers';
import { AddProvider } from './pages/admin/AddProvider';
import { AdminAppointments } from './pages/admin/Appointments';
import { AdminProducts } from './pages/admin/Products';
import { AddProduct } from './pages/admin/AddProduct';
import { AdminOrders } from './pages/admin/Orders';
import { AdminTestimonials } from './pages/admin/Testimonials';
import { AdminVideos } from './pages/admin/Videos';
import { AddVideo } from './pages/admin/AddVideo';
import { AdminBlogs } from './pages/admin/Blogs';
import { AddBlog } from './pages/admin/AddBlog';
import { AdminPodcasts } from './pages/admin/Podcasts';
import { AddPodcast } from './pages/admin/AddPodcast';
import { AdminLearningMaterials } from './pages/admin/LearningMaterials';
import { AddLearningMaterial } from './pages/admin/AddLearningMaterial';
import { AdminActiveExercises } from './pages/admin/ActiveExercises';
import { AddActiveExercise } from './pages/admin/AddActiveExercise';
import { AdminPatients } from './pages/admin/Patients';
import { AdminPatientInfo } from './pages/admin/PatientInfo';
import { AdminVitals } from './pages/admin/Vitals';
import { PhysicianDashboard } from './pages/physician/Dashboard';
import { PhysicianAppointments } from './pages/physician/Appointments';
import { PhysicianProfile } from './pages/physician/Profile';
import { BroadcastNew } from './pages/admin/BroadcastNew';
import { BroadcastHistory } from './pages/admin/BroadcastHistory';
import { AccessDenied } from './pages/AccessDenied';
import { useIsAdmin } from './hooks/useIsAdmin';

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

function DashboardLayout() {
    return (
        <SidebarProvider>
            <div className="flex min-h-screen bg-background w-full">
                <AppSidebar />
                <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
                    <Header />
                    <main className="flex-1 overflow-auto bg-muted/30">
                        <div className="max-w-[1400px] mx-auto w-full p-4 md:p-6 lg:p-8">
                            <Outlet />
                        </div>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}

function ProtectedRoute({ allowedRoles }: { allowedRoles: string[] }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface-alt)]">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400 text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) return <Navigate to="/login" replace />;
    if (!allowedRoles.includes(user.role)) return <Navigate to="/login" replace />;
    return <Outlet />;
}

function AdminGate() {
    const { isAdmin, loading } = useIsAdmin();
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
            </div>
        );
    }
    if (!isAdmin) return <AccessDenied />;
    return <Outlet />;
}

function RootRedirect() {
    const { user, loading } = useAuth();
    if (loading) return null;
    if (!user) return <Navigate to="/login" replace />;
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'physician') return <Navigate to="/physician" replace />;
    return <Navigate to="/login" replace />;
}

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<RootRedirect />} />

            {/* Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route element={<AdminGate />}>
                <Route element={<DashboardLayout />}>
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/admin/broadcast/new" element={<BroadcastNew />} />
                    <Route path="/admin/broadcast/history" element={<BroadcastHistory />} />
                    <Route path="/admin/providers" element={<AdminProviders />} />
                    <Route path="/admin/providers/add" element={<AddProvider />} />
                    <Route path="/admin/providers/edit/:id" element={<AddProvider />} />
                    <Route path="/admin/patients" element={<AdminPatients />} />
                    <Route path="/admin/patients/:id" element={<AdminPatientInfo />} />
                    <Route path="/admin/vitals" element={<AdminVitals />} />
                    <Route path="/admin/appointments" element={<AdminAppointments />} />
                    <Route path="/admin/products" element={<AdminProducts />} />
                    <Route path="/admin/products/add" element={<AddProduct />} />
                    <Route path="/admin/products/edit/:id" element={<AddProduct />} />
                    <Route path="/admin/orders" element={<AdminOrders />} />
                    <Route path="/admin/testimonials" element={<AdminTestimonials />} />
                    <Route path="/admin/videos" element={<AdminVideos />} />
                    <Route path="/admin/videos/add" element={<AddVideo />} />
                    <Route path="/admin/videos/edit/:id" element={<AddVideo />} />
                    <Route path="/admin/blogs" element={<AdminBlogs />} />
                    <Route path="/admin/blogs/add" element={<AddBlog />} />
                    <Route path="/admin/blogs/edit/:id" element={<AddBlog />} />
                    <Route path="/admin/learning" element={<AdminLearningMaterials />} />
                    <Route path="/admin/learning/add" element={<AddLearningMaterial />} />
                    <Route path="/admin/learning/edit/:id" element={<AddLearningMaterial />} />
                    <Route path="/admin/active" element={<AdminActiveExercises />} />
                    <Route path="/admin/active/add" element={<AddActiveExercise />} />
                    <Route path="/admin/active/edit/:id" element={<AddActiveExercise />} />
                    <Route path="/admin/podcasts" element={<AdminPodcasts />} />
                    <Route path="/admin/podcasts/add" element={<AddPodcast />} />
                    <Route path="/admin/podcasts/edit/:id" element={<AddPodcast />} />
                </Route>
              </Route>
            </Route>

            {/* Physician Routes */}
            <Route element={<ProtectedRoute allowedRoles={['physician']} />}>
                <Route element={<DashboardLayout />}>
                    <Route path="/physician" element={<PhysicianDashboard />} />
                    <Route path="/physician/appointments" element={<PhysicianAppointments />} />
                    <Route path="/physician/profile" element={<PhysicianProfile />} />
                </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
