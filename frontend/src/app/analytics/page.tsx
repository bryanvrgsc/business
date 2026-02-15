'use client';

import { Suspense, useEffect, useState } from 'react';
import { fetchKPIs, KPIData } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, AlertTriangle, CheckCircle, DollarSign, TrendingUp, Truck } from 'lucide-react';

function AnalyticsContent() {
    const router = useRouter();
    const [kpis, setKpis] = useState<KPIData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchKPIs()
            .then(setKpis)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
        </div>
    );

    if (!kpis) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <p className="text-slate-400 font-bold">Error al cargar métricas</p>
        </div>
    );

    const maxCount = Math.max(...(kpis.tickets_per_month.map(m => m.count)), 1);

    return (
        <div className="max-w-xl mx-auto pb-24 px-4 pt-6">
            <div className="flex items-center gap-3 mb-8">
                <button onClick={() => router.back()} className="p-2.5 bg-white shadow-sm border border-slate-100 rounded-2xl interactive text-slate-600">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Analytics</h1>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">KPIs & Métricas</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
                    className="premium-card p-5 bg-gradient-to-br from-blue-500 to-blue-700 text-white border-0 shadow-lg shadow-blue-200">
                    <div className="flex items-center gap-2 mb-3">
                        <Clock size={16} className="opacity-80" />
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-80">MTTR</span>
                    </div>
                    <h2 className="text-3xl font-black">{kpis.mttr_hours}h</h2>
                    <p className="text-xs opacity-70 mt-1">Tiempo medio de reparación</p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                    className="premium-card p-5 bg-gradient-to-br from-orange-500 to-red-600 text-white border-0 shadow-lg shadow-orange-200">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle size={16} className="opacity-80" />
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Abiertos</span>
                    </div>
                    <h2 className="text-3xl font-black">{kpis.tickets.open}</h2>
                    <p className="text-xs opacity-70 mt-1">Tickets pendientes</p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="premium-card p-5 bg-gradient-to-br from-green-500 to-emerald-700 text-white border-0 shadow-lg shadow-green-200">
                    <div className="flex items-center gap-2 mb-3">
                        <CheckCircle size={16} className="opacity-80" />
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Resueltos</span>
                    </div>
                    <h2 className="text-3xl font-black">{kpis.tickets.resolved + kpis.tickets.closed}</h2>
                    <p className="text-xs opacity-70 mt-1">Tickets cerrados</p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                    className="premium-card p-5 bg-gradient-to-br from-violet-500 to-purple-700 text-white border-0 shadow-lg shadow-purple-200">
                    <div className="flex items-center gap-2 mb-3">
                        <DollarSign size={16} className="opacity-80" />
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Costos</span>
                    </div>
                    <h2 className="text-3xl font-black">${Number(kpis.costs.total).toLocaleString()}</h2>
                    <p className="text-xs opacity-70 mt-1">Gasto total MX</p>
                </motion.div>
            </div>

            {/* Tickets per Month Chart */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="premium-card p-6 mb-8">
                <div className="flex items-center gap-2 mb-6">
                    <TrendingUp size={18} className="text-primary" />
                    <h3 className="font-black text-slate-900">Tickets por Mes</h3>
                </div>

                {kpis.tickets_per_month.length === 0 ? (
                    <p className="text-center text-slate-400 text-sm py-8">Sin datos de los últimos 6 meses</p>
                ) : (
                    <div className="flex items-end gap-3 h-40">
                        {kpis.tickets_per_month.map((m, idx) => (
                            <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                                <span className="text-xs font-black text-slate-900">{m.count}</span>
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${(m.count / maxCount) * 100}%` }}
                                    transition={{ delay: 0.3 + idx * 0.1, duration: 0.5, ease: 'easeOut' }}
                                    className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg min-h-[8px]"
                                />
                                <span className="text-[9px] font-bold text-slate-400 uppercase">
                                    {m.month.split('-')[1]}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </motion.div>

            {/* Fleet Status */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="premium-card p-6">
                <div className="flex items-center gap-2 mb-6">
                    <Truck size={18} className="text-primary" />
                    <h3 className="font-black text-slate-900">Estado de Flota</h3>
                </div>

                {kpis.fleet.length === 0 ? (
                    <p className="text-center text-slate-400 text-sm py-4">Sin datos de flota</p>
                ) : (
                    <div className="space-y-3">
                        {kpis.fleet.map((f) => {
                            const total = kpis.fleet.reduce((a, b) => a + b.count, 0);
                            const pct = total > 0 ? (f.count / total) * 100 : 0;
                            const color = f.operational_status === 'OPERATIONAL' ? 'bg-green-500' :
                                f.operational_status === 'MAINTENANCE' ? 'bg-amber-500' : 'bg-red-500';
                            const label = f.operational_status === 'OPERATIONAL' ? 'Operativo' :
                                f.operational_status === 'MAINTENANCE' ? 'En Mantenimiento' : 'Fuera de Servicio';
                            return (
                                <div key={f.operational_status}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-bold text-slate-700">{label}</span>
                                        <span className="font-black text-slate-900">{f.count}</span>
                                    </div>
                                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${pct}%` }}
                                            transition={{ delay: 0.4, duration: 0.6 }}
                                            className={`h-full rounded-full ${color}`}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </motion.div>
        </div>
    );
}

export default function AnalyticsPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <AnalyticsContent />
        </Suspense>
    );
}
