'use client';

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { syncReports } from '@/lib/sync';
import { RefreshCw, CheckCircle, AlertTriangle, Clock, QrCode, FileText, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function DashboardPage() {
    const [isOnline, setIsOnline] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);

    // Real-time query to Dexie
    const pendingReports = useLiveQuery(
        () => db.reports.filter(r => !r.syncedAt).toArray()
    );

    const completedReports = useLiveQuery(
        () => db.reports.filter(r => !!r.syncedAt).reverse().limit(5).toArray()
    );

    const handleSync = async () => {
        if (isSyncing || !navigator.onLine) return;
        setIsSyncing(true);
        await syncReports();
        setIsSyncing(false);
    };

    useEffect(() => {
        setIsOnline(navigator.onLine);

        const handleOnline = () => {
            setIsOnline(true);
            handleSync();
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="max-w-2xl mx-auto pb-24"
        >
            <header className="flex justify-between items-center mb-10 px-2">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight transition-all">Panel Control</h1>
                    <p className="text-slate-500 font-medium text-sm">Gestiona tus inspecciones diarias</p>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest transition-all glass ${isOnline ? 'text-green-600 border-green-100 shadow-sm' : 'text-slate-400 border-slate-100'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
                    {isOnline ? 'SISTEMA ONLINE' : 'MODO OFFLINE'}
                </div>
            </header>

            {/* Sync Hub Section */}
            <motion.div variants={itemVariants} className="premium-card p-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-0 shadow-xl shadow-blue-200 mb-8 overflow-hidden relative">
                <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                <div className="absolute bottom-[-10%] left-[-5%] w-24 h-24 bg-blue-400/20 rounded-full blur-xl"></div>

                <div className="relative z-10">
                    <div className="flex justify-between items-center mb-6">
                        <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                            <CloudUploadIcon size={28} />
                        </div>
                        <div className="text-right">
                            <span className="text-blue-100 text-xs font-bold uppercase tracking-wider">Pendientes</span>
                            <h2 className="text-4xl font-black tracking-tight">{pendingReports?.length || 0}</h2>
                        </div>
                    </div>

                    {pendingReports && pendingReports.length > 0 ? (
                        <button
                            onClick={handleSync}
                            disabled={isSyncing || !isOnline}
                            className="w-full bg-white text-blue-700 py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-3 interactive disabled:opacity-50"
                        >
                            {isSyncing ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                    Sincronizando...
                                </>
                            ) : (
                                <>
                                    <RefreshCw size={18} />
                                    Subir Reportes Ahora
                                </>
                            )}
                        </button>
                    ) : (
                        <div className="flex items-center justify-center gap-3 bg-white/10 py-3 rounded-xl border border-white/10 backdrop-blur-sm">
                            <CheckCircle size={18} />
                            <span className="font-bold text-sm">Base de datos sincronizada</span>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Main Navigation Grid */}
            <div className="grid grid-cols-2 gap-4 mb-10">
                <motion.div variants={itemVariants}>
                    <Link href="/scan" className="premium-card p-6 flex flex-col items-center justify-center gap-4 group interactive text-center h-full">
                        <div className="bg-blue-50 text-blue-600 p-4 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                            <QrCode size={28} />
                        </div>
                        <div>
                            <span className="block font-black text-slate-900">Escanear QR</span>
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Nueva Inspección</span>
                        </div>
                    </Link>
                </motion.div>
                <motion.div variants={itemVariants}>
                    <Link href="/reports" className="premium-card p-6 flex flex-col items-center justify-center gap-4 group interactive text-center h-full">
                        <div className="bg-indigo-50 text-indigo-600 p-4 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                            <FileText size={28} />
                        </div>
                        <div>
                            <span className="block font-black text-slate-900">Historial</span>
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ver Reportes</span>
                        </div>
                    </Link>
                </motion.div>
                <motion.div variants={itemVariants} className="col-span-2">
                    <Link href="/tickets" className="premium-card p-4 flex items-center justify-between gap-4 group interactive">
                        <div className="flex items-center gap-4">
                            <div className="bg-orange-50 text-orange-600 p-3 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                                <AlertTriangle size={24} />
                            </div>
                            <div className="text-left">
                                <span className="block font-black text-slate-900">Tickets de Mantenimiento</span>
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Gestión de incidencias</span>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl text-slate-400 group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors">
                            <ChevronRight size={20} />
                        </div>
                    </Link>
                </motion.div>
            </div>

            {/* Activity Feed */}
            <div className="px-2">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Actividad Reciente</h3>
                    <Link href="/reports" className="text-primary text-xs font-bold hover:underline flex items-center gap-1">
                        Ver todo <ChevronRight size={14} />
                    </Link>
                </div>

                <div className="space-y-4">
                    {completedReports?.map((report, idx) => (
                        <motion.div
                            key={report.id}
                            variants={itemVariants}
                            custom={idx}
                            className="premium-card p-4 flex items-center gap-4 group cursor-pointer active:scale-[0.99] transition-all"
                        >
                            <div className={`p-3 rounded-2xl transition-colors ${report.hasCriticalFailure ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                                {report.hasCriticalFailure ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-slate-900 group-hover:text-primary transition-colors line-clamp-1">Inspección {report.forkliftId}</p>
                                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">
                                    <span className="flex items-center gap-1"><Clock size={12} /> {new Date(report.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    <span className="text-slate-200">|</span>
                                    <span>{new Date(report.capturedAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <div className="text-[10px] font-black text-green-600 bg-green-50 px-2.5 py-1.5 rounded-lg border border-green-100/50 uppercase tracking-widest">
                                Ok
                            </div>
                        </motion.div>
                    ))}
                    {(!completedReports || completedReports.length === 0) && (
                        <div className="text-center py-12 premium-card bg-slate-50/50 border-dashed border-2 border-slate-200">
                            <div className="inline-flex p-4 bg-slate-200/50 rounded-full text-slate-400 mb-3">
                                <FileText size={24} />
                            </div>
                            <p className="text-slate-400 font-bold text-sm tracking-tight">No hay actividad reciente aún</p>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

// Icons helper
function CloudUploadIcon({ size }: { size: number }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-cloud-upload"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" /><path d="M12 12v9" /><path d="m16 16-4-4-4 4" /></svg>
    )
}
