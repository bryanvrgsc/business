'use client';

import { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useRouter } from 'next/navigation';
import { ForkliftService } from '@/services/forklift.service';
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ScanPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleScan = async (detectedCodes: { rawValue: string }[]) => {
        if (loading || detectedCodes.length === 0) return;

        const code = detectedCodes[0].rawValue;
        setLoading(true);
        setError('');

        try {
            const forklift = await ForkliftService.getByQR(code);
            if (forklift) {
                router.push(`/forklift/${forklift.id}`);
            } else {
                setError(`Equipo no encontrado: ${code}`);
                setLoading(false);
            }
        } catch {
            setError('Error al consultar el equipo');
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col h-full max-w-xl mx-auto px-4 pt-6 pb-24"
        >
            <div className="flex items-center mb-10">
                <button onClick={() => router.back()} className="mr-4 p-2.5 bg-white shadow-sm border border-slate-100 rounded-2xl interactive text-slate-600">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Scanner QR</h1>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Busca el código en el equipo</p>
                </div>
            </div>

            <div className="premium-card p-4 flex-1 flex flex-col justify-center min-h-[400px] relative overflow-hidden">
                {!loading ? (
                    <div className="flex flex-col h-full bg-slate-50 rounded-3xl overflow-hidden relative">
                        <Scanner
                            onScan={handleScan}
                            components={{
                                onOff: true,
                                torch: true,
                            }}
                            styles={{
                                container: {
                                    width: '100%',
                                    aspectRatio: '1/1',
                                }
                            }}
                        />
                        {/* Overlay scan effect */}
                        <div className="absolute inset-0 border-[30px] border-slate-900/10 pointer-events-none"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-primary rounded-3xl z-10 box-content shadow-[0_0_0_9999px_rgba(15,23,42,0.4)]">
                            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-xl"></div>
                            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-xl"></div>
                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-xl"></div>
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-xl"></div>
                            {/* Scanning line animation */}
                            <motion.div
                                animate={{ top: ['10%', '90%'] }}
                                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                className="absolute left-4 right-4 h-0.5 bg-primary/80 blur-sm shadow-[0_0_10px_#2563eb]"
                            ></motion.div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-12 space-y-4">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        </div>
                        <p className="text-slate-900 font-black tracking-tight text-lg">Identificando equipo</p>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest text-center">Cruzando datos con el servidor central...</p>
                    </div>
                )}
            </div>

            {error && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center gap-4 shadow-lg shadow-red-50"
                >
                    <div className="p-2 bg-white rounded-xl shadow-sm">
                        <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                    </div>
                    <div>
                        <p className="font-black text-sm uppercase tracking-tighter">Fallo de identificación</p>
                        <p className="text-sm font-medium opacity-80">{error}</p>
                    </div>
                </motion.div>
            )}

            {/* Dev helper area */}
            <div className="mt-auto pt-10 px-2 opacity-50 hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-2 mb-4">
                    <div className="h-[1px] flex-1 bg-slate-200"></div>
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Dev Simulator</span>
                    <div className="h-[1px] flex-1 bg-slate-200"></div>
                </div>
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={() => handleScan([{ rawValue: 'M-1551' }])}
                        className="px-4 py-2.5 bg-white border border-slate-100 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                        disabled={loading}
                    >
                        Toyota M-1551
                    </button>
                    <button
                        onClick={() => handleScan([{ rawValue: 'M-2020' }])}
                        className="px-4 py-2.5 bg-white border border-slate-100 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                        disabled={loading}
                    >
                        Raymond M-2020
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
