'use client';
export const runtime = 'edge';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchForkliftById, Forklift } from '@/lib/api';
import { CheckCircle, AlertOctagon, Wrench, ArrowLeft, ClipboardList } from 'lucide-react';
import Link from 'next/link';

export default function ForkliftDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [forklift, setForklift] = useState<Forklift | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            // @ts-ignore
            fetchForkliftById(id as string).then(data => {
                setForklift(data);
                setLoading(false);
            });
        }
    }, [id]);

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando información...</div>;
    if (!forklift) return <div className="p-8 text-center text-red-500">Equipo no encontrado.</div>;

    const isOperational = forklift.status === 'OPERATIONAL';
    const isMaintenance = forklift.status === 'MAINTENANCE';
    const isOutOfService = forklift.status === 'OUT_OF_SERVICE';

    return (
        <div className="max-w-md mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center mb-6">
                <button onClick={() => router.back()} className="mr-3 p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft size={24} className="text-gray-600" />
                </button>
                <h1 className="text-xl font-bold flex-1">Detalle de Equipo</h1>
            </div>

            {/* Card Principal */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 mb-6">
                <div className="h-40 bg-gray-200 relative">
                    {forklift.image && (
                        <img src={forklift.image} alt={forklift.internalId} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                        <h2 className="text-white text-2xl font-bold">{forklift.internalId}</h2>
                        <p className="text-white/90 text-sm">{forklift.brand} {forklift.model}</p>
                    </div>
                </div>

                <div className="p-4">
                    <div className="flex items-center justify-between mb-4 bg-gray-50 p-3 rounded-lg">
                        <span className="text-sm text-gray-500 font-medium">Estado Actual</span>
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold ${isOperational ? 'bg-green-100 text-green-700' :
                            isMaintenance ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                            }`}>
                            {isOperational && <CheckCircle size={16} />}
                            {isMaintenance && <Wrench size={16} />}
                            {isOutOfService && <AlertOctagon size={16} />}
                            <span>{forklift.status.replace(/_/g, ' ')}</span>
                        </div>
                    </div>

                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between border-b border-gray-100 pb-2">
                            <span className="text-gray-500">Ubicación</span>
                            <span className="font-medium text-gray-900">{forklift.location}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-100 pb-2">
                            <span className="text-gray-500">Próximo servicio</span>
                            <span className="font-medium text-gray-900">{forklift.nextMaintenance}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
                {isOutOfService ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm mb-4">
                        <strong>⚠️ EQUIPO BLOQUEADO:</strong> Este montacargas tiene una falla crítica reportada y no puede ser operado hasta que mantenimiento lo libere.
                    </div>
                ) : (
                    <Link
                        href={`/checklist/new?forkliftId=${forklift.id}`}
                        className="block w-full"
                    >
                        <div className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-4 shadow-lg shadow-blue-200 flex items-center justify-between transition-all active:scale-95">
                            <div className="flex flex-col">
                                <span className="font-bold text-lg">Iniciar Inspección</span>
                                <span className="text-blue-100 text-sm">Checklist diario obligatorio</span>
                            </div>
                            <ClipboardList size={28} />
                        </div>
                    </Link>
                )}

                <button className="w-full bg-white border border-gray-200 text-gray-700 font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors">
                    Ver Historial de Reportes
                </button>
            </div>
        </div>
    );
}
