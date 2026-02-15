'use client';

import { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useRouter } from 'next/navigation';
import { fetchForkliftByQR } from '@/lib/api';
import { Loader2, AlertTriangle } from 'lucide-react';

export default function ScanPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleScan = async (detectedCodes: any[]) => {
        if (loading || detectedCodes.length === 0) return;

        const code = detectedCodes[0].rawValue;
        setLoading(true);
        setError('');

        try {
            const forklift = await fetchForkliftByQR(code);
            if (forklift) {
                // Redirect to details/checklist page
                router.push(`/forklift/${forklift.id}`);
            } else {
                setError(`Equipo no encontrado: ${code}`);
                setLoading(false);
            }
        } catch (err) {
            setError('Error al consultar el equipo');
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full max-w-md mx-auto">
            <h1 className="text-2xl font-bold mb-4 text-center">Escanear Equipo</h1>

            <div className="bg-white p-4 rounded-lg shadow-md mb-4 flex-1 flex flex-col justify-center">
                {!loading ? (
                    <div className="aspect-square overflow-hidden rounded-lg relative">
                        <Scanner
                            onScan={handleScan}
                            components={{
                                audio: false,
                                onOff: true,
                                torch: true,
                            }}
                        />
                        <div className="absolute inset-0 border-2 border-blue-500/50 pointer-events-none rounded-lg"></div>
                        <p className="text-center text-sm text-gray-500 mt-2">Apunta al código QR del montacargas</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-10 space-y-4">
                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                        <p className="text-gray-600 font-medium">Buscando equipo...</p>
                    </div>
                )}
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            {/* Debug helper for testing without camera */}
            <div className="mt-8 p-4 border-t border-gray-200">
                <p className="text-xs text-gray-400 mb-2 uppercase font-bold text-center">Modo Developer (Simular Scan)</p>
                <div className="flex gap-2 justify-center">
                    <button
                        onClick={() => handleScan([{ rawValue: 'M-1551' }])}
                        className="px-3 py-1 bg-gray-200 text-xs rounded hover:bg-gray-300 transition-colors"
                        disabled={loading}
                    >
                        M-1551 (Toyota)
                    </button>
                    <button
                        onClick={() => handleScan([{ rawValue: 'M-2020' }])}
                        className="px-3 py-1 bg-gray-200 text-xs rounded hover:bg-gray-300 transition-colors"
                        disabled={loading}
                    >
                        M-2020 (Raymond)
                    </button>
                </div>
            </div>
        </div>
    );
}
