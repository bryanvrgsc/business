'use client';

import { Suspense, useEffect, useState } from 'react';
import { ScheduleService } from '@/services/schedule.service';
import { ForkliftService } from '@/services/forklift.service';
import { Schedule, Forklift } from '@/types';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Save, X, CalendarClock, Clock, AlertCircle, CheckCircle } from 'lucide-react';

function SchedulesListContent() {
    const router = useRouter();
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [forklifts, setForklifts] = useState<Forklift[]>([]);

    // Form State
    const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

    const [formData, setFormData] = useState<{
        forklift_id: string;
        task_name: string;
        frequency_type: 'DAYS' | 'HOURS';
        frequency_value: number;
        target_model: string;
    }>({
        forklift_id: '',
        task_name: '',
        frequency_type: 'DAYS',
        frequency_value: 30,
        target_model: ''
    });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [schedulesData, forkliftsData] = await Promise.all([
                ScheduleService.getAll(),
                ForkliftService.getAll()
            ]);
            setSchedules(schedulesData);
            setForklifts(forkliftsData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (schedule: Schedule) => {
        setEditingSchedule(schedule);
        setFormData({
            forklift_id: schedule.forklift_id,
            task_name: schedule.task_name,
            frequency_type: schedule.frequency_type,
            frequency_value: schedule.frequency_value,
            target_model: schedule.target_model || ''
        });
        setShowModal(true);
    };

    const handleToggleActive = async (schedule: Schedule, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(`¿${schedule.is_active ? 'Desactivar' : 'Activar'} este programa?`)) return;

        try {
            await ScheduleService.update(schedule.id, { is_active: !schedule.is_active });
            loadData();
        } catch (err) {
            alert('Error al actualizar estado');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingSchedule) {
                await ScheduleService.update(editingSchedule.id, formData);
                alert('Programa actualizado');
            } else {
                await ScheduleService.create(formData);
                alert('Programa creado exitosamente');
            }
            setShowModal(false);
            setEditingSchedule(null);
            loadData();
            setFormData({ forklift_id: '', task_name: '', frequency_type: 'DAYS', frequency_value: 30, target_model: '' });
        } catch (err) {
            alert('Error al guardar programa');
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
                    onClick={() => {
                        setEditingSchedule(null);
                        setFormData({ forklift_id: '', task_name: '', frequency_type: 'DAYS', frequency_value: 30, target_model: '' });
                        setShowModal(true);
                    }}
                    className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-blue-200 interactive"
                >
                    <Plus size={24} />
                </button>
            </div>

            <div className="space-y-4">
                {schedules.length === 0 ? (
                    <div className="text-center py-12 premium-card bg-slate-50/50 border-dashed border-2">
                        <CalendarClock className="mx-auto text-slate-300 mb-3" size={32} />
                        <p className="text-slate-400 font-bold text-sm">Sin programas activos</p>
                    </div>
                ) : (
                    schedules.map((schedule, idx) => (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            key={schedule.id}
                            className={`premium-card p-5 border-l-4 ${schedule.is_active ? 'border-l-primary' : 'border-l-slate-300 opacity-75'}`}
                            onClick={() => handleEdit(schedule)}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-slate-900">{schedule.task_name}</h3>
                                        {!schedule.is_active && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">INACTIVO</span>}
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                                        {schedule.forklift_name || schedule.target_model || 'General'}
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => handleToggleActive(schedule, e)}
                                    className={`p-2 rounded-full transition-colors ${schedule.is_active ? 'text-green-500 bg-green-50' : 'text-slate-400 bg-slate-100'}`}
                                >
                                    <CheckCircle size={18} />
                                </button>
                            </div>

                            <div className="flex items-center gap-4 text-xs text-slate-500 mt-3 pt-3 border-t border-slate-50">
                                <div className="flex items-center gap-1.5">
                                    <Clock size={14} className="text-primary" />
                                    <span className="font-bold">Cada {schedule.frequency_value} {schedule.frequency_type === 'DAYS' ? 'Días' : 'Horas'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-amber-600">
                                    <AlertCircle size={14} />
                                    <span className="font-bold">Prox: {new Date(schedule.next_due_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
                    >
                        <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 transition-colors">
                            <X size={20} />
                        </button>

                        <h2 className="text-xl font-black text-slate-900 mb-6">
                            {editingSchedule ? 'Editar Programa' : 'Nuevo Programa'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Montacargas</label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    value={formData.forklift_id}
                                    onChange={e => setFormData({ ...formData, forklift_id: e.target.value })}
                                >
                                    <option value="">Seleccionar equipo (Opcional)</option>
                                    {forklifts.map(f => (
                                        <option key={f.id} value={f.id}>{f.internalId} — {f.model}</option>
                                    ))}
                                </select>
                            </div>

                            {!formData.forklift_id && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Modelo Objetivo</label>
                                    <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        placeholder="Ej. TOYOTA-8"
                                        value={formData.target_model} onChange={e => setFormData({ ...formData, target_model: e.target.value })} />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tarea / Servicio</label>
                                <input type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    placeholder="Ej. Cambio de Aceite"
                                    value={formData.task_name} onChange={e => setFormData({ ...formData, task_name: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Frecuencia</label>
                                    <input type="number" required min="1" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        value={formData.frequency_value} onChange={e => setFormData({ ...formData, frequency_value: parseInt(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tipo</label>
                                    <select
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        value={formData.frequency_type}
                                        onChange={e => setFormData({ ...formData, frequency_type: e.target.value as 'DAYS' | 'HOURS' })}
                                    >
                                        <option value="DAYS">Días</option>
                                        <option value="HOURS">Horas de Uso</option>
                                    </select>
                                </div>
                            </div>

                            <button type="submit" className="w-full bg-primary text-white py-4 rounded-xl font-black text-sm uppercase tracking-wider shadow-lg shadow-blue-200 hover:shadow-xl hover:translate-y-[-2px] transition-all flex items-center justify-center gap-2 mt-4">
                                <Save size={18} /> {editingSchedule ? 'Actualizar' : 'Crear'} Programa
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
