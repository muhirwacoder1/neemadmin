import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getAppointments, getProviders, updateAppointmentStatus, type Appointment, type Provider } from '../../services/api';
import { CalendarCheck, Clock, CheckCircle2, XCircle, Stethoscope, Users, Link as LinkIcon } from 'lucide-react';

export function PhysicianDashboard() {
    const { user } = useAuth();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [provider, setProvider] = useState<Provider | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionModal, setActionModal] = useState<{ id: string; action: 'approved' | 'denied' } | null>(null);
    const [note, setNote] = useState('');
    const [meetingLink, setMeetingLink] = useState('');

    useEffect(() => {
        if (!user) return;
        (async () => {
            try {
                const providers = await getProviders();
                console.log('Logged in user:', { email: user.email, uid: user.uid });
                console.log('All providers:', providers.map(p => ({ id: p.id, email: p.email, uid: p.uid })));
                const myProvider = providers.find(p => p.email === user.email || p.uid === user.uid);
                console.log('Matched provider:', myProvider ? { id: myProvider.id, email: myProvider.email, uid: myProvider.uid } : 'NONE');
                setProvider(myProvider || null);
                if (myProvider?.id) {
                    const apts = await getAppointments({ providerId: myProvider.id });
                    console.log('Appointments found:', apts.length);
                    setAppointments(apts);
                }
            } catch (e) { console.error('Physician dashboard error:', e); }
            setLoading(false);
        })();
    }, [user]);

    const pending = appointments.filter(a => a.status === 'pending');
    const approved = appointments.filter(a => a.status === 'approved');
    const today = new Date().toISOString().split('T')[0];
    const todayAppts = approved.filter(a => a.date === today);

    const handleAction = (id: string, action: 'approved' | 'denied') => {
        setActionModal({ id, action });
        setNote('');
        setMeetingLink('');
    };

    const confirmAction = async () => {
        if (!actionModal) return;
        await updateAppointmentStatus(actionModal.id, actionModal.action, note, actionModal.action === 'approved' ? meetingLink : undefined);
        setAppointments(prev => prev.map(a => a.id === actionModal.id ? { ...a, status: actionModal.action, statusNote: note, meetingLink: actionModal.action === 'approved' ? meetingLink : undefined } : a));
        setActionModal(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="w-8 h-8 border-[3px] border-blue-100 border-t-blue-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Welcome Banner */}
            <div className="bg-blue-600 rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
                <div className="absolute bottom-0 left-1/4 w-40 h-40 bg-white/5 rounded-full translate-y-1/2" />
                <div className="relative">
                    <p className="text-blue-200 text-sm font-medium mb-1">Welcome back</p>
                    <h1 className="text-2xl font-bold mb-1">{provider?.name || user?.displayName || 'Doctor'}</h1>
                    <p className="text-blue-200 text-sm">{provider?.specialty || 'Healthcare Provider'}</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Today's Appts", value: todayAppts.length, icon: CalendarCheck, light: 'bg-blue-50', text: 'text-blue-600' },
                    { label: 'Pending', value: pending.length, icon: Clock, light: 'bg-amber-50', text: 'text-amber-600' },
                    { label: 'Approved', value: approved.length, icon: CheckCircle2, light: 'bg-emerald-50', text: 'text-emerald-600' },
                    { label: 'Total Patients', value: appointments.length, icon: Users, light: 'bg-sky-50', text: 'text-sky-600' },
                ].map((card, i) => (
                    <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 hover:border-slate-200 transition-all">
                        <div className={`w-10 h-10 rounded-xl ${card.light} flex items-center justify-center mb-3`}>
                            <card.icon className={`w-5 h-5 ${card.text}`} />
                        </div>
                        <p className="text-2xl font-bold text-slate-900 tracking-tight">{card.value}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{card.label}</p>
                    </div>
                ))}
            </div>

            {/* Pending Requests */}
            {pending.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold text-slate-900">Pending Requests</h2>
                        <span className="text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-full">{pending.length} pending</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pending.slice(0, 6).map(apt => (
                            <div key={apt.id} className="bg-white rounded-2xl border border-slate-100 p-5 hover:border-slate-200 transition-all">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm">
                                            {apt.patientName[0]}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-800 text-sm">{apt.patientName}</h3>
                                            <p className="text-xs text-slate-400">{apt.patientEmail}</p>
                                        </div>
                                    </div>
                                    <span className="bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-full text-[11px] font-medium">
                                        Pending
                                    </span>
                                </div>
                                <div className="flex gap-4 text-xs text-slate-500 mb-3">
                                    <span className="flex items-center gap-1.5"><CalendarCheck className="w-3.5 h-3.5 text-slate-300" />{apt.date}</span>
                                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-300" />{apt.time}</span>
                                </div>
                                {apt.description && (
                                    <p className="text-xs text-slate-400 mb-4 line-clamp-2">{apt.description}</p>
                                )}
                                <div className="flex gap-3">
                                    <button onClick={() => handleAction(apt.id!, 'approved')} className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-xl transition-colors text-sm">
                                        <CheckCircle2 className="w-4 h-4" /> Approve
                                    </button>
                                    <button onClick={() => handleAction(apt.id!, 'denied')} className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium py-2 rounded-xl transition-colors text-sm">
                                        <XCircle className="w-4 h-4" /> Deny
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Today's Schedule */}
            <div className="bg-white rounded-2xl border border-slate-100">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-semibold text-slate-900">Today's Schedule</h2>
                        <p className="text-xs text-slate-400 mt-0.5">{todayAppts.length} appointments today</p>
                    </div>
                </div>
                {todayAppts.length === 0 ? (
                    <div className="p-12 text-center">
                        <Stethoscope className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm">No appointments scheduled for today</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {todayAppts.map(apt => (
                            <div key={apt.id} className="px-6 py-3.5 flex items-center justify-between hover:bg-blue-50/30 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs">
                                        {apt.patientName[0]}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-800">{apt.patientName}</p>
                                        <p className="text-xs text-slate-400">{apt.description?.slice(0, 50) || 'General consultation'}</p>
                                    </div>
                                </div>
                                <span className="text-sm font-semibold text-blue-600">{apt.time}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Action Modal */}
            {actionModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl mx-4">
                        <h3 className="text-lg font-semibold text-slate-900 mb-1">
                            {actionModal.action === 'approved' ? 'Approve' : 'Deny'} Appointment
                        </h3>
                        <p className="text-sm text-slate-400 mb-5">
                            {actionModal.action === 'approved'
                                ? 'Add a meeting link and optional note for the patient'
                                : 'Add an optional note for the patient'}
                        </p>
                        {actionModal.action === 'approved' && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                                    <LinkIcon className="w-3.5 h-3.5 inline mr-1" />
                                    Meeting Link
                                </label>
                                <input
                                    type="url" value={meetingLink} onChange={e => setMeetingLink(e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                                    placeholder="https://meet.google.com/... or https://zoom.us/..."
                                />
                            </div>
                        )}
                        <textarea
                            rows={3} value={note} onChange={e => setNote(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 resize-none mb-5"
                            placeholder="Add a note (optional)..."
                        />
                        <div className="flex gap-3">
                            <button onClick={() => setActionModal(null)}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium py-2.5 rounded-xl transition-colors text-sm">
                                Cancel
                            </button>
                            <button onClick={confirmAction}
                                className={`flex-1 font-medium py-2.5 rounded-xl transition-colors text-sm text-white ${actionModal.action === 'approved' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-500 hover:bg-red-600'}`}>
                                {actionModal.action === 'approved' ? 'Approve' : 'Deny'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
