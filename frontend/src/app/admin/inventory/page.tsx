'use client';

import { Suspense, useEffect, useState } from 'react';
import { fetchInventory, createPart, Part } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Save, X, Package, AlertTriangle } from 'lucide-react';

function InventoryContent() {
    const router = useRouter();
    const [parts, setParts] = useState<Part[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const [formData, setFormData] = useState({
        part_number: '',
        name: '',
        current_stock: 0,
        min_stock: 1,
        unit_cost: 0,
        supplier: ''
    });

    useEffect(() => { loadParts(); }, []);

    const loadParts = async () => {
        try {
            const data = await fetchInventory();
            setParts(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createPart(formData);
            setShowModal(false);
            loadParts();
            setFormData({ part_number: '', name: '', current_stock: 0, min_stock: 1, unit_cost: 0, supplier: '' });
        } catch (err) {
            alert('Error al agregar refacción');
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
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Inventario</h1>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Refacciones</p>
                    </div>
                </div>
                <button onClick={() => setShowModal(true)} className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-blue-200 interactive">
                    <Plus size={24} />
                </button>
            </div>

            <div className="space-y-4">
                {parts.length === 0 ? (
                    <div className="text-center py-12 premium-card bg-slate-50/50 border-dashed border-2">
                        <Package className="mx-auto text-slate-300 mb-3" size={32} />
                        <p className="text-slate-400 font-bold text-sm">Sin refacciones registradas</p>
                    </div>
                ) : (
                    parts.map((part, idx) => (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            key={part.id}
                            className="premium-card p-5"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-bold text-slate-900">{part.name}</h3>
                                    <p className="text-xs text-slate-400 font-bold">{part.part_number}</p>
                                </div>
                                <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${part.current_stock <= part.min_stock
                                        ? 'bg-red-50 text-red-600 border-red-100'
                                        : 'bg-green-50 text-green-600 border-green-100'
                                    }`}>
                                    {part.current_stock} uds
                                </span>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-slate-50 text-xs text-slate-500">
                                <span className="font-bold">${Number(part.unit_cost).toFixed(2)} c/u</span>
                                <span>{part.supplier || 'Sin proveedor'}</span>
                            </div>

                            {part.current_stock <= part.min_stock && (
                                <div className="flex items-center gap-2 mt-3 bg-amber-50 text-amber-700 px-3 py-2 rounded-xl text-xs font-bold">
                                    <AlertTriangle size={14} />
                                    Stock bajo — Mínimo: {part.min_stock}
                                </div>
                            )}
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

                        <h2 className="text-xl font-black text-slate-900 mb-6">Nueva Refacción</h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">No. Parte</label>
                                <input type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    value={formData.part_number} onChange={e => setFormData({ ...formData, part_number: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombre</label>
                                <input type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Stock</label>
                                    <input type="number" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        value={formData.current_stock} onChange={e => setFormData({ ...formData, current_stock: parseInt(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mínimo</label>
                                    <input type="number" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        value={formData.min_stock} onChange={e => setFormData({ ...formData, min_stock: parseInt(e.target.value) })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Costo Unit.</label>
                                    <input type="number" step="0.01" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        value={formData.unit_cost} onChange={e => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Proveedor</label>
                                    <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        value={formData.supplier} onChange={e => setFormData({ ...formData, supplier: e.target.value })} />
                                </div>
                            </div>

                            <button type="submit" className="w-full bg-primary text-white py-4 rounded-xl font-black text-sm uppercase tracking-wider shadow-lg shadow-blue-200 hover:shadow-xl hover:translate-y-[-2px] transition-all flex items-center justify-center gap-2 mt-4">
                                <Save size={18} /> Guardar Refacción
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}

export default function InventoryPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <InventoryContent />
        </Suspense>
    );
}
