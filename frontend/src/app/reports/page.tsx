'use client';

import { useEffect, useState } from 'react';
import { fetchReports, Report } from '@/lib/api';
import { Calendar, User, Truck, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ReportsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const data = await fetchReports();
                setReports(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading) return (
        <div className="flex justify-center items-center h-screen bg-slate-50">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 pb-24 md:pb-8">
            <div className="bg-white px-6 pt-12 pb-6 shadow-sm border-b border-slate-100">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Historial</h1>
                    <p className="text-slate-500 font-medium">Reportes de inspección recientes</p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 mt-6 space-y-4">
                {reports.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                            <FileText size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Sin reportes</h3>
                        <p className="text-slate-500">Aún no hay inspecciones registradas.</p>
                    </div>
                ) : (
                    reports.map((report, idx) => (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            key={report.id}
                            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4"
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className={`p-3 rounded-xl ${report.has_critical_failure ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                                        <Truck size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900">{report.forklift_name || 'Montacargas'}</h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                                            {report.template_name || 'Checklist'}
                                        </p>
                                    </div>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${report.has_critical_failure ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                    {report.has_critical_failure ? (
                                        <><AlertTriangle size={12} /> Falla Crítica</>
                                    ) : (
                                        <><CheckCircle2 size={12} /> Aprobado</>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                                <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                                    <User size={16} className="text-slate-400" />
                                    {report.user_name || 'Usuario'}
                                </div>
                                <div className="flex items-center gap-2 text-slate-500 text-sm font-medium justify-end">
                                    <Calendar size={16} className="text-slate-400" />
                                    {new Date(report.captured_at).toLocaleDateString()}
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
}
