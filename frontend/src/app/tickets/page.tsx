'use client';

import { Suspense, useEffect, useState } from 'react';
import { fetchTickets, updateTicketStatus, Ticket, fetchForklifts, createTicket, Forklift } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, AlertTriangle, CheckCircle, Clock, MoreVertical, Search, Filter, Plus, X, Save } from 'lucide-react';

function TicketsListContent() {
    const router = useRouter();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');

    const [showModal, setShowModal] = useState(false);
    const [forklifts, setForklifts] = useState<Forklift[]>([]);
    const [submitting, setSubmitting] = useState(false);

    // New Ticket Form State
    const [formData, setFormData] = useState({
        forklift_id: '',
        description: '',
        priority: 'MEDIUM'
    });

    useEffect(() => {
        loadTickets();
        loadForklifts();
    }, []);

    const loadForklifts = async () => {
        try {
            const data = await fetchForklifts();
            setForklifts(data);
        } catch (err) {
            console.error('Failed to load forklifts');
        }
    };

    const loadTickets = async () => {
        try {
            const data = await fetchTickets();
            setTickets(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            // Optimistic update
            setTickets(prev => prev.map(t => t.id === id ? { ...t, status: newStatus as any } : t));
            await updateTicketStatus(id, newStatus);
        } catch (err) {
            console.error('Failed to update status', err);
            loadTickets(); // Revert on error
        }
    };

    const handleCreateTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await createTicket(formData);
            alert('Ticket creado exitosamente');
            setShowModal(false);
            setFormData({
                forklift_id: '',
                description: '',
                priority: 'MEDIUM'
            });
            loadTickets();
        } catch (err) {
            alert('Error al crear ticket');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'OPEN': return 'bg-red-100 text-red-700 border-red-200';
            case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'RESOLVED': return 'bg-green-100 text-green-700 border-green-200';
            case 'CLOSED': return 'bg-slate-100 text-slate-600 border-slate-200';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'OPEN': return 'ABIERTO';
            case 'IN_PROGRESS': return 'EN PROCESO';
            case 'RESOLVED': return 'RESUELTO';
            case 'CLOSED': return 'CERRADO';
            default: return status;
        }
    };

    const filteredTickets = filter === 'ALL'
        ? tickets
        : tickets.filter(t => t.status === filter);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="max-w-xl mx-auto pb-24 px-4 pt-6">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="p-2.5 bg-white shadow-sm border border-slate-100 rounded-2xl interactive text-slate-600">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Tickets</h1>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Mantenimiento Correctivo</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="p-3 bg-red-500 text-white rounded-2xl shadow-lg shadow-red-200 interactive"
                >
                    <Plus size={24} />
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-xl text-xs font-black tracking-wider transition-all whitespace-nowrap ${filter === f
                            ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                            : 'bg-white text-slate-500 border border-slate-100'
                            }`}
                    >
                        {f === 'ALL' ? 'TODOS' : getStatusLabel(f)}
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                {filteredTickets.length === 0 ? (
                    <div className="text-center py-12 premium-card bg-slate-50/50 border-dashed border-2">
                        <p className="text-slate-400 font-bold text-sm">No hay tickets encontrados</p>
                    </div>
                ) : (
                    filteredTickets.map((ticket, idx) => (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            key={ticket.id}
                            className="premium-card p-5 relative overflow-hidden"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">#{ticket.ticket_number}</span>
                                <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getStatusColor(ticket.status)}`}>
                                    {getStatusLabel(ticket.status)}
                                </span>
                            </div>

                            <h3 className="font-bold text-slate-900 text-lg mb-1">{ticket.forklift_internal_id} <span className="font-normal text-slate-400 text-sm">• {ticket.forklift_model}</span></h3>
                            <p className="text-slate-600 text-sm font-medium mb-4">{ticket.description}</p>

                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50">
                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                    <Clock size={12} /> {new Date(ticket.created_at).toLocaleDateString()}
                                </span>

                                <div className="flex gap-2">
                                    {ticket.status === 'OPEN' && (
                                        <button
                                            onClick={() => handleStatusChange(ticket.id, 'IN_PROGRESS')}
                                            className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                                        >
                                            Atender
                                        </button>
                                    )}
                                    {ticket.status === 'IN_PROGRESS' && (
                                        <button
                                            onClick={() => handleStatusChange(ticket.id, 'RESOLVED')}
                                            className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors"
                                        >
                                            Resolver
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
}

export default function TicketsPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <TicketsListContent />
        </Suspense>
    );
}
