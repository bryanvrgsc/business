'use client';

import { Suspense, useEffect, useState } from 'react';
import { createForklift } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Save, X, Truck } from 'lucide-react';

function ForkliftsListContent() {
    const router = useRouter();
    // Ideally fetch forklifts list here, but we focused on create for now
    // const [forklifts, setForklifts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        internal_id: '',
        model: '',
        brand: '',
        serial_number: '',
        year: new Date().getFullYear(),
        location_id: 'default' // Mocking location for now
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createForklift(formData);
            alert('Montacargas creado exitosamente');
            setShowModal(false);
            setFormData({
                internal_id: '',
                model: '',
                brand: '',
                serial_number: '',
                year: new Date().getFullYear(),
                location_id: 'default'
            });
        } catch (err) {
            alert('Error creando montacargas');
        }
    };

    return (
        <div className="max-w-xl mx-auto pb-24 px-4 pt-6">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="p-2.5 bg-white shadow-sm border border-slate-100 rounded-2xl interactive text-slate-600">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Montacargas</h1>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Gestión de Flota</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-blue-200 interactive"
                >
                    <Plus size={24} />
                </button>
            </div>

            <div className="text-center py-12 premium-card bg-slate-50/50 border-dashed border-2">
                <Truck className="mx-auto text-slate-300 mb-3" size={32} />
                <p className="text-slate-400 font-bold text-sm">Lista de montacargas (Próximamente)</p>
                <p className="text-xs text-slate-300 mt-1">Usa el botón + para agregar nuevos</p>
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
                    >
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <h2 className="text-xl font-black text-slate-900 mb-6">Nuevo Montacargas</h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">ID Interno (Ej. M-10)</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    value={formData.internal_id}
                                    onChange={e => setFormData({ ...formData, internal_id: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Marca</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        value={formData.brand}
                                        onChange={e => setFormData({ ...formData, brand: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Modelo</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        value={formData.model}
                                        onChange={e => setFormData({ ...formData, model: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Número de Serie</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    value={formData.serial_number}
                                    onChange={e => setFormData({ ...formData, serial_number: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Año</label>
                                <input
                                    type="number"
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    value={formData.year}
                                    onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) })}
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-primary text-white py-4 rounded-xl font-black text-sm uppercase tracking-wider shadow-lg shadow-blue-200 hover:shadow-xl hover:translate-y-[-2px] transition-all flex items-center justify-center gap-2 mt-4"
                            >
                                <Save size={18} />
                                Guardar y Generar QR
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}

export default function ForkliftsPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <ForkliftsListContent />
        </Suspense>
    );
}
