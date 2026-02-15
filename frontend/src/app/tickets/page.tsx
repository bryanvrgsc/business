import { Suspense, useEffect, useState } from 'react';
import { fetchTickets, updateTicketStatus, Ticket, fetchForklifts, createTicket, Forklift, fetchUsers, User, fetchTicketCosts, addTicketCost, TicketCost } from '@/lib/api';
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

    const [assignModal, setAssignModal] = useState<{ ticketId: string, currentStatus: string } | null>(null);
    const [costModal, setCostModal] = useState<Ticket | null>(null);
    const [ticketCosts, setTicketCosts] = useState<TicketCost[]>([]);
    const [selectedTech, setSelectedTech] = useState('');
    const [users, setUsers] = useState<User[]>([]);

    // New Ticket Form State
    const [formData, setFormData] = useState({
        forklift_id: '',
        description: '',
        priority: 'MEDIUM'
    });

    // Cost Form State
    const [costData, setCostData] = useState({
        cost_type: 'PART',
        description: '',
        quantity: 1,
        unit_cost: 0,
        is_billable: true
    });

    useEffect(() => {
        loadTickets();
        loadForklifts();
        loadUsers();
    }, []);

    const loadForklifts = async () => {
        try {
            const data = await fetchForklifts();
            setForklifts(data);
        } catch (err) {
            console.error('Failed to load forklifts');
        }
    };

    const loadUsers = async () => {
        try {
            const data = await fetchUsers();
            // Filter only technicians or admins
            setUsers(data.filter(u => u.role === 'TECH' || u.role === 'ADMIN'));
        } catch (err) {
            console.error('Failed to load users');
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

    const openCostModal = async (ticket: Ticket) => {
        setCostModal(ticket);
        try {
            const costs = await fetchTicketCosts(ticket.id);
            setTicketCosts(costs);
        } catch (err) {
            console.error('Error fetching costs');
        }
    };

    const handleAddCost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!costModal) return;

        try {
            await addTicketCost(costModal.id, costData);
            const costs = await fetchTicketCosts(costModal.id);
            setTicketCosts(costs);
            setCostData({
                cost_type: 'PART',
                description: '',
                quantity: 1,
                unit_cost: 0,
                is_billable: true
            });
            alert('Costo agregado');
        } catch (err) {
            alert('Error al agregar costo');
        }
    };

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!assignModal || !selectedTech) return;

        try {
            await updateTicketStatus(assignModal.ticketId, 'IN_PROGRESS', selectedTech);
            alert('Ticket asignado exitosamente');
            setAssignModal(null);
            setSelectedTech('');
            loadTickets();
        } catch (err) {
            alert('Error al asignar ticket');
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
                            <p className="text-slate-600 text-sm font-medium mb-2">{ticket.description}</p>

                            {ticket.assigned_to_name && (
                                <p className="text-xs text-slate-500 mb-4 flex items-center gap-1">
                                    <span className="font-bold text-slate-400">Técnico:</span> {ticket.assigned_to_name}
                                </p>
                            )}

                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50">
                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                    <Clock size={12} /> {new Date(ticket.created_at).toLocaleDateString()}
                                </span>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => openCostModal(ticket)}
                                        className="px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors"
                                    >
                                        Costos
                                    </button>
                                    {ticket.status === 'OPEN' && (
                                        <button
                                            onClick={() => setAssignModal({ ticketId: ticket.id, currentStatus: ticket.status })}
                                            className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                                        >
                                            Asignar
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

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl relative"
                    >
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <h2 className="text-xl font-black text-slate-900 mb-6">Nuevo Ticket</h2>

                        <form onSubmit={handleCreateTicket} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Montacargas</label>
                                <select
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    value={formData.forklift_id}
                                    onChange={e => setFormData({ ...formData, forklift_id: e.target.value })}
                                >
                                    <option value="">Seleccionar equipo</option>
                                    {forklifts.map(f => (
                                        <option key={f.id} value={f.id}>{f.internalId} — {f.model}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Prioridad</label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    value={formData.priority}
                                    onChange={e => setFormData({ ...formData, priority: e.target.value })}
                                >
                                    <option value="LOW">Baja</option>
                                    <option value="MEDIUM">Media</option>
                                    <option value="HIGH">Alta</option>
                                    <option value="CRITICAL">Crítica</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Descripción del Problema</label>
                                <textarea
                                    required
                                    rows={3}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Describa la falla..."
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-primary text-white py-4 rounded-xl font-black text-sm uppercase tracking-wider shadow-lg shadow-blue-200 hover:shadow-xl hover:translate-y-[-2px] transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
                            >
                                <Save size={18} />
                                {submitting ? 'Guardando...' : 'Crear Ticket'}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* Assign Modal */}
            {assignModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative"
                    >
                        <button
                            onClick={() => { setAssignModal(null); setSelectedTech(''); }}
                            className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <h2 className="text-xl font-black text-slate-900 mb-6">Asignar Técnico</h2>

                        <form onSubmit={handleAssign} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Seleccionar Técnico</label>
                                <select
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    value={selectedTech}
                                    onChange={e => setSelectedTech(e.target.value)}
                                >
                                    <option value="">Seleccionar...</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-sm uppercase tracking-wider shadow-lg shadow-blue-200 hover:shadow-xl hover:translate-y-[-2px] transition-all flex items-center justify-center gap-2 mt-4"
                            >
                                Asignar y Comenzar
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* Cost Modal */}
            {costModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
                    >
                        <button
                            onClick={() => { setCostModal(null); setTicketCosts([]); }}
                            className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <h2 className="text-xl font-black text-slate-900 mb-2">Costos y Refacciones</h2>
                        <p className="text-sm text-slate-500 mb-6">Ticket #{costModal.ticket_number}</p>

                        <div className="mb-6 space-y-2">
                            {ticketCosts.map(cost => (
                                <div key={cost.id} className="bg-slate-50 p-3 rounded-xl flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-slate-800">{cost.description}</p>
                                        <p className="text-xs text-slate-500">{cost.quantity} x ${cost.unit_cost.toLocaleString()} ({cost.cost_type})</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-slate-900">${cost.total_cost.toLocaleString()}</p>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${cost.is_billable ? 'text-green-600' : 'text-slate-400'}`}>
                                            {cost.is_billable ? 'Facturable' : 'No Facturable'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {ticketCosts.length === 0 && (
                                <p className="text-center text-slate-400 text-sm py-4">No hay costos registrados</p>
                            )}
                            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                                <span className="font-bold text-slate-500">Total</span>
                                <span className="font-black text-lg text-slate-900">
                                    ${ticketCosts.reduce((sum, c) => sum + Number(c.total_cost), 0).toLocaleString()}
                                </span>
                            </div>
                        </div>

                        <form onSubmit={handleAddCost} className="space-y-4 border-t border-slate-100 pt-6">
                            <h3 className="font-bold text-slate-900 mb-2">Agregar Costo</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tipo</label>
                                    <select
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        value={costData.cost_type}
                                        onChange={e => setCostData({ ...costData, cost_type: e.target.value })}
                                    >
                                        <option value="PART">Refacción</option>
                                        <option value="LABOR">Mano de Obra</option>
                                        <option value="MISC">Otros</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cantidad</label>
                                    <input
                                        type="number"
                                        min="0.1"
                                        step="0.1"
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        value={costData.quantity}
                                        onChange={e => setCostData({ ...costData, quantity: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Descripción</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    placeholder="Ej. Batería 12V"
                                    value={costData.description}
                                    onChange={e => setCostData({ ...costData, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Costo Unitario</label>
                                    <input
                                        type="number"
                                        min="0"
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        value={costData.unit_cost}
                                        onChange={e => setCostData({ ...costData, unit_cost: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div className="flex items-center">
                                    <label className="flex items-center gap-2 cursor-pointer mt-6">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 rounded-md border-slate-300 text-primary focus:ring-primary"
                                            checked={costData.is_billable}
                                            onChange={e => setCostData({ ...costData, is_billable: e.target.checked })}
                                        />
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Facturable</span>
                                    </label>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-slate-900 text-white py-4 rounded-xl font-black text-sm uppercase tracking-wider shadow-lg shadow-slate-200 hover:shadow-xl hover:translate-y-[-2px] transition-all flex items-center justify-center gap-2 mt-4"
                            >
                                <Plus size={18} />
                                Agregar Costo
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
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
