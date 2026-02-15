'use client';

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { syncReports } from '@/lib/sync';
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import Link from 'next/link';

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

    useEffect(() => {
        setIsOnline(navigator.onLine);

        const handleOnline = () => {
            setIsOnline(true);
            // Auto-sync when coming online
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

    const handleSync = async () => {
        if (isSyncing || !navigator.onLine) return;
        setIsSyncing(true);
        await syncReports();
        setIsSyncing(false);
    };

    return (
        <div className="max-w-md mx-auto pb-20">
            <header className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
                    <p className="text-sm text-gray-500">Bienvenido, Operador</p>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                    {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
                    {isOnline ? 'ONLINE' : 'OFFLINE'}
                </div>
            </header>

            {/* Sync Status Card */}
            <div className="bg-blue-600 rounded-xl p-5 text-white shadow-lg shadow-blue-200 mb-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-blue-100 text-sm font-medium">Reportes Pendientes</p>
                        <h2 className="text-4xl font-bold">{pendingReports?.length || 0}</h2>
                    </div>
                    <div className="bg-blue-500/50 p-2 rounded-lg">
                        <CloudUploadIcon size={24} />
                    </div>
                </div>

                {pendingReports && pendingReports.length > 0 ? (
                    <button
                        onClick={handleSync}
                        disabled={isSyncing || !isOnline}
                        className="w-full bg-white text-blue-600 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-70 active:scale-95 transition-all"
                    >
                        {isSyncing ? (
                            <>
                                <RefreshCw size={16} className="animate-spin" />
                                Sincronizando...
                            </>
                        ) : (
                            <>
                                <RefreshCw size={16} />
                                Sincronizar Ahora
                            </>
                        )}
                    </button>
                ) : (
                    <div className="flex items-center gap-2 text-blue-100 text-sm">
                        <CheckCircle size={16} />
                        <span>Todo sincronizado</span>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <Link href="/scan" className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
                    <div className="bg-purple-100 text-purple-600 p-3 rounded-full">
                        <QrCodeIcon size={24} />
                    </div>
                    <span className="font-medium text-sm">Escanear</span>
                </Link>
                <Link href="/reports" className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
                    <div className="bg-orange-100 text-orange-600 p-3 rounded-full">
                        <FileTextIcon size={24} />
                    </div>
                    <span className="font-medium text-sm">Mis Reportes</span>
                </Link>
            </div>

            {/* Recent Activity */}
            <h3 className="font-bold text-gray-800 mb-3 ml-1">Actividad Reciente</h3>
            <div className="space-y-3">
                {completedReports?.map(report => (
                    <div key={report.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
                        <div className={`p-2 rounded-full ${report.hasCriticalFailure ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                            {report.hasCriticalFailure ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-sm text-gray-800">Inspección Montacargas</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Clock size={12} />
                                <span>{new Date(report.capturedAt).toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="text-xs text-green-600 font-medium px-2 py-1 bg-green-50 rounded">
                            Sincronizado
                        </div>
                    </div>
                ))}
                {(!completedReports || completedReports.length === 0) && (
                    <p className="text-center text-gray-400 text-sm py-4">No hay actividad reciente</p>
                )}
            </div>

        </div>
    );
}

// Icons helper
function CloudUploadIcon({ size }: { size: number }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-cloud-upload"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" /><path d="M12 12v9" /><path d="m16 16-4-4-4 4" /></svg>
    )
}

function QrCodeIcon({ size }: { size: number }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-qr-code"><rect width="5" height="5" x="3" y="3" rx="1" /><rect width="5" height="5" x="16" y="3" rx="1" /><rect width="5" height="5" x="3" y="16" rx="1" /><path d="M21 16h-3a2 2 0 0 0-2 2v3" /><path d="M21 21v.01" /><path d="M12 7v3a2 2 0 0 1-2 2H7" /><path d="M3 12h.01" /><path d="M12 3h.01" /><path d="M12 16v.01" /><path d="M16 12h1" /><path d="M21 12v.01" /><path d="M12 21v-1" /></svg>
    )
}

function FileTextIcon({ size }: { size: number }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" /></svg>
    )
}
