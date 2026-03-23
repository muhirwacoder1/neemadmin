import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getAppointments, getProviders, updateAppointmentStatus, type Appointment } from '../../services/api';
import { Search, CheckCircle2, XCircle, Clock, Filter, CalendarCheck, MessageSquare, Link as LinkIcon } from 'lucide-react';

export function PhysicianAppointments() {
    const { user } = useAuth();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [noteModal, setNoteModal] = useState<{ id: string; action: 'approved' | 'denied' } | null>(null);
    const [note, setNote] = useState('');
    const [meetingLink, setMeetingLink] = useState('');

    useEffect(() => {
        if (!user) return;
        (async () => {
            try {
                const providers = await getProviders();
                const myProvider = providers.find(p => p.email === user.email || p.uid === user.uid);
                if (myProvider?.id) {
                    const data = await getAppointments({ providerId: myProvider.id, status: filter });
                    setAppointments(data);
                }
            } catch (e) { console.error(e); }
            setLoading(false);
        })();
    }, [user, filter]);

    const handleAction = (id: string, action: 'approved' | 'denied') => {
        setNoteModal({ id, action });
        setNote('');
        setMeetingLink('');
    };

    const confirmAction = async () => {
        if (!noteModal) return;
        await updateAppointmentStatus(noteModal.id, noteModal.action, note, noteModal.action === 'approved' ? meetingLink : undefined);
        setAppointments(prev => prev.map(a => a.id === noteModal.id ? { ...a, status: noteModal.action, statusNote: note, meetingLink: noteModal.action === 'approved' ? meetingLink : undefined } : a));
        setNoteModal(null);
    };

    const filtered = appointments.filter(a =>
        a.patientName.toLowerCase().includes(search.toLowerCase()) ||
        a.description?.toLowerCase().includes(search.toLowerCase())
    );

    const statusBadge = (status: string) => {
        const styles: Record<string, string> = {
            pending: 'bg-amber-50 text-amber-600 border-amber-100',
            approved: 'bg-emerald-50 text-emerald-600 border-emerald-100',
            denied: 'bg-red-50 text-red-500 border-red-100',
        };
        const icons: Record<string, typeof Clock> = { pending: Clock, approved: CheckCircle2, denied: XCircle };
        const Icon = icons[status] || Clock;
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status] || ''}`}>
                <Icon className="w-3 h-3" />
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">My Appointments</h1>
                    <p className="text-slate-400 text-sm mt-0.5">Review and manage your appointment requests</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                    <CalendarCheck className="w-4 h-4" />
                    <span>{appointments.length} total</span>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input
                        type="text" placeholder="Search patients..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                    />
                </div>
                <div className="flex gap-2">
                    {['all', 'pending', 'approved', 'denied'].map(s => (
                        <button key={s} onClick={() => setFilter(s)}
                            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${filter === s
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                                    : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-700'
                                }`}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Appointment Cards */}
            {filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
                    <Filter className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">No appointments found</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(apt => (
                        <div key={apt.id} className="bg-white rounded-2xl border border-slate-100 p-5 hover:border-slate-200 transition-all">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-11 h-11 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">
                                        {apt.patientName[0]}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-800">{apt.patientName}</h3>
                                        <p className="text-sm text-slate-400">{apt.patientEmail}</p>
                                        <div className="flex gap-4 mt-2 text-sm text-slate-500">
                                            <span className="flex items-center gap-1.5"><CalendarCheck className="w-3.5 h-3.5 text-slate-300" />{apt.date}</span>
                                            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-300" />{apt.time}</span>
                                        </div>
                                        {apt.description && (
                                            <p className="text-sm text-slate-400 mt-2 max-w-lg">{apt.description}</p>
                                        )}
                                        {apt.statusNote && (
                                            <p className="text-sm text-slate-400 mt-1 italic flex items-center gap-1.5">
                                                <MessageSquare className="w-3.5 h-3.5" /> Note: {apt.statusNote}
                                            </p>
                                        )}
                                        {apt.meetingLink && (
                                            <a href={apt.meetingLink} target="_blank" rel="noopener noreferrer"
                                                className="text-sm text-blue-600 mt-1 flex items-center gap-1.5 hover:underline">
                                                <LinkIcon className="w-3.5 h-3.5" /> {apt.meetingLink}
                                            </a>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                    {statusBadge(apt.status)}
                                    {apt.status === 'pending' && (
                                        <div className="flex gap-2 ml-2">
                                            <button onClick={() => handleAction(apt.id!, 'approved')}
                                                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-xl transition-colors text-sm">
                                                <CheckCircle2 className="w-4 h-4" /> Approve
                                            </button>
                                            <button onClick={() => handleAction(apt.id!, 'denied')}
                                                className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium px-4 py-2 rounded-xl transition-colors text-sm">
                                                <XCircle className="w-4 h-4" /> Deny
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Note Modal */}
            {noteModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl mx-4">
                        <h3 className="text-lg font-semibold text-slate-900 mb-1">
                            {noteModal.action === 'approved' ? 'Approve' : 'Deny'} Appointment
                        </h3>
                        <p className="text-sm text-slate-400 mb-5">
                            {noteModal.action === 'approved'
                                ? 'Add a meeting link and optional note for the patient'
                                : 'Add an optional note for the patient'}
                        </p>
                        {noteModal.action === 'approved' && (
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
                            <button onClick={() => setNoteModal(null)}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium py-2.5 rounded-xl transition-colors text-sm">
                                Cancel
                            </button>
                            <button onClick={confirmAction}
                                className={`flex-1 font-medium py-2.5 rounded-xl transition-colors text-sm text-white ${noteModal.action === 'approved' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-500 hover:bg-red-600'
                                    }`}>
                                {noteModal.action === 'approved' ? 'Approve' : 'Deny'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
