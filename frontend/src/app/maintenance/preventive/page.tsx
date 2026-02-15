'use client';

import { Suspense, useEffect, useState } from 'react';
import { fetchSchedules, createSchedule, fetchForkliftById, Schedule, Forklift } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Plus, Clock, Save, X, Truck } from 'lucide-react';

function SchedulesListContent() {
    const router = useRouter();
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        task_name: '',
        frequency_type: 'DAYS',
        frequency_value: 30,
        forklift_id: '',
        target_model: ''
    });

    useEffect(() => {
        loadSchedules();
    }, []);

    const loadSchedules = async () => {
        try {
            const data = await fetchSchedules();
            setSchedules(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createSchedule({
                ...formData,
                frequency_type: formData.frequency_type as 'DAYS' | 'HOURS',
                forklift_id: formData.forklift_id || 'ALL' // Simple hack for now
            });
            setShowModal(false);
            loadSchedules();
            setFormData({
                task_name: '',
                frequency_type: 'DAYS',
                frequency_value: 30,
                forklift_id: '',
                target_model: ''
            });
        } catch (err) {
            alert('Error creating schedule');
        }
    };

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
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Mantenimiento</h1>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Preventivo</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-blue-200 interactive"
                >
                    <Plus size={24} />
                </button>
            </div>

            <div className="space-y-4">
                {schedules.length === 0 ? (
                    <div className="text-center py-12 premium-card bg-slate-50/50 border-dashed border-2">
                        <Calendar className="mx-auto text-slate-300 mb-3" size={32} />
                        <p className="text-slate-400 font-bold text-sm">No hay planes activos</p>
                    </div>
                ) : (
                    schedules.map((schedule, idx) => (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            key={schedule.id}
                            className="premium-card p-5 relative overflow-hidden group"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-slate-900 text-lg">{schedule.task_name}</h3>
                                <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-100">
                                    {schedule.frequency_value} {schedule.frequency_type === 'DAYS' ? 'Días' : 'Horas'}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-4">
                                <Truck size={14} />
                                {schedule.forklift_name || 'Todos los modelos'}
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                    <Clock size={12} /> Prox: {new Date(schedule.next_due_at).toLocaleDateString()}
                                </span>
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
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

                        <h2 className="text-xl font-black text-slate-900 mb-6">Nuevo Plan</h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombre de la Tarea</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    placeholder="Ej. Cambio de Aceite"
                                    value={formData.task_name}
                                    onChange={e => setFormData({ ...formData, task_name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Frecuencia</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        value={formData.frequency_value}
                                        onChange={e => setFormData({ ...formData, frequency_value: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Unidad</label>
                                    <select
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        value={formData.frequency_type}
                                        onChange={e => setFormData({ ...formData, frequency_type: e.target.value })}
                                    >
                                        <option value="DAYS">Días</option>
                                        <option value="HOURS">Horas</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Montacargas ID (Opcional)</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    placeholder="Dejar vacío para todos"
                                    value={formData.forklift_id}
                                    onChange={e => setFormData({ ...formData, forklift_id: e.target.value })}
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-primary text-white py-4 rounded-xl font-black text-sm uppercase tracking-wider shadow-lg shadow-blue-200 hover:shadow-xl hover:translate-y-[-2px] transition-all flex items-center justify-center gap-2 mt-4"
                            >
                                <Save size={18} />
                                Guardar Plan
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}

export default function PreventivePage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <SchedulesListContent />
        </Suspense>
    );
}
