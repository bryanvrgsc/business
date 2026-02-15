'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchTemplate, ChecklistTemplate } from '@/lib/templates';
import { fetchForkliftById, Forklift } from '@/lib/api';
import { Camera, Save, AlertTriangle, ArrowLeft } from 'lucide-react';
import { db } from '@/lib/db'; // Dexie DB

import { uploadImage } from '@/lib/api';

function ChecklistFormContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const forkliftId = searchParams.get('forkliftId');

    const [template, setTemplate] = useState<ChecklistTemplate | null>(null);
    const [forklift, setForklift] = useState<Forklift | null>(null);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingState, setUploadingState] = useState<Record<string, boolean>>({});

    useEffect(() => {
        async function loadData() {
            if (!forkliftId) return;
            const [fData, tData] = await Promise.all([
                fetchForkliftById(forkliftId),
                fetchTemplate('basic-forklift')
            ]);
            setForklift(fData);
            setTemplate(tData);
            setLoading(false);
        }
        loadData();
    }, [forkliftId]);

    const handleAnswerChange = (questionId: string, value: any) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const handleImageUpload = async (questionId: string, file: File) => {
        if (!file) return;

        setUploadingState(prev => ({ ...prev, [questionId]: true }));
        try {
            // In offline mode, we might want to store the Blob in Dexie and sync later.
            // For now, let's try to upload immediately if online, or fail.
            // TODO: Handle offline image storage (store Blob in IndexedDB)

            const imageUrl = await uploadImage(file);
            handleAnswerChange(questionId, imageUrl);
        } catch (error) {
            console.error('Upload failed', error);
            alert('Error al subir imagen. Revisa tu conexión.');
        } finally {
            setUploadingState(prev => ({ ...prev, [questionId]: false }));
        }
    };

    const calculateCriticalFailure = () => {
        if (!template) return false;
        return template.questions.some(q =>
            q.severity === 'CRITICAL_STOP' &&
            answers[q.id] === 'NO' // Assuming YES = Good, NO = Bad/Fail
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!forklift || !template) return;

        setSaving(true);
        const hasCritical = calculateCriticalFailure();

        // Save to local DB (Dexie)
        try {
            await db.reports.add({
                forkliftId: forklift.id,
                templateId: template.id,
                answers,
                evidence: [], // TODO: Extract evidence from answers if needed separately
                capturedAt: new Date().toISOString(),
                hasCriticalFailure: hasCritical
            });

            // Trigger background sync (simulated for now)
            if ('serviceWorker' in navigator && 'SyncManager' in window) {
                // @ts-ignore
                const registration = await navigator.serviceWorker.ready;
                // @ts-ignore
                try { await registration.sync.register('sync-reports'); } catch { }
            }

            router.push(`/dashboard?success=true&critical=${hasCritical}`);
        } catch (err) {
            console.error('Error saving report', err);
            alert('Error al guardar el reporte localmente');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando checklist...</div>;
    if (!forklift || !template) return <div className="p-8 text-center text-red-500">Error al cargar datos.</div>;

    return (
        <div className="max-w-md mx-auto pb-20 p-4">
            <div className="flex items-center mb-6">
                <button onClick={() => router.back()} className="mr-3 p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft size={24} className="text-gray-600" />
                </button>
                <div>
                    <h1 className="text-xl font-bold">Nueva Inspección</h1>
                    <p className="text-sm text-gray-500">{forklift.internalId} — {forklift.model}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {template.questions.map((q) => (
                    <div key={q.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-start mb-2">
                            <label className="font-medium text-gray-800 text-sm md:text-base">{q.text}</label>
                            {q.severity === 'CRITICAL_STOP' && (
                                <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded font-bold">CRÍTICO</span>
                            )}
                        </div>

                        {/* Input Types */}
                        {q.type === 'YES_NO' && (
                            <div className="flex gap-2 mt-2">
                                <button
                                    type="button"
                                    onClick={() => handleAnswerChange(q.id, 'YES')}
                                    className={`flex-1 py-3 rounded-lg font-medium border ${answers[q.id] === 'YES'
                                        ? 'bg-green-100 border-green-500 text-green-800 ring-1 ring-green-500'
                                        : 'bg-gray-50 border-gray-200 text-gray-500'
                                        }`}
                                >
                                    BIEN
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleAnswerChange(q.id, 'NO')}
                                    className={`flex-1 py-3 rounded-lg font-medium border ${answers[q.id] === 'NO'
                                        ? 'bg-red-100 border-red-500 text-red-800 ring-1 ring-red-500'
                                        : 'bg-gray-50 border-gray-200 text-gray-500'
                                        }`}
                                >
                                    MAL
                                </button>
                            </div>
                        )}

                        {q.type === 'TEXT' && (
                            <textarea
                                className="w-full mt-2 p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                rows={2}
                                placeholder="Observaciones..."
                                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                            />
                        )}

                        {q.type === 'NUMBER' && (
                            <input
                                type="number"
                                className="w-full mt-2 p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="0"
                                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                            />
                        )}

                        {(q.requiresEvidence || q.type === 'PHOTO') && (
                            <div className="mt-3">
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    id={`file-${q.id}`}
                                    className="hidden"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            handleImageUpload(q.id, e.target.files[0]);
                                        }
                                    }}
                                />

                                {answers[q.id] && typeof answers[q.id] === 'string' && answers[q.id].startsWith('http') ? (
                                    <div className="relative mt-2">
                                        <img src={answers[q.id]} alt="Evidencia" className="w-full h-40 object-cover rounded-lg" />
                                        <button
                                            type="button"
                                            onClick={() => handleAnswerChange(q.id, null)}
                                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-md"
                                        >
                                            <AlertTriangle size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <label
                                        htmlFor={`file-${q.id}`}
                                        className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded transition-colors w-full justify-center border border-dashed cursor-pointer ${uploadingState[q.id]
                                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                                : 'text-blue-600 hover:bg-blue-50 border-blue-200'
                                            }`}
                                    >
                                        <Camera size={16} />
                                        {uploadingState[q.id] ? 'Subiendo...' : 'Agregar Foto / Evidencia'}
                                    </label>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        {saving ? 'Guardando...' : (
                            <>
                                <Save size={20} />
                                Guardar Inspección
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}


export default function ChecklistPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500">Cargando...</div>}>
            <ChecklistFormContent />
        </Suspense>
    )
}
