'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchTemplate, ChecklistTemplate } from '@/lib/templates';
import { fetchForkliftById, Forklift } from '@/lib/api';
import { Camera, Save, AlertTriangle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { db } from '@/lib/db';
import { uploadImage } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

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
            try {
                const [fData, tData] = await Promise.all([
                    fetchForkliftById(forkliftId),
                    fetchTemplate('basic-forklift')
                ]);
                setForklift(fData);
                setTemplate(tData);
            } catch (err) {
                console.error('Error loading data', err);
            } finally {
                setLoading(false);
            }
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
            answers[q.id] === 'NO'
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!forklift || !template) return;

        // Check if all YES_NO questions are answered
        const allAnswered = template.questions.every(q => q.type !== 'YES_NO' || answers[q.id]);
        if (!allAnswered) {
            alert('Por favor responde todas las preguntas del checklist.');
            return;
        }

        setSaving(true);
        const hasCritical = calculateCriticalFailure();

        try {
            await db.reports.add({
                forkliftId: forklift.id,
                templateId: template.id,
                answers,
                evidence: [],
                capturedAt: new Date().toISOString(),
                hasCriticalFailure: hasCritical
            });

            if ('serviceWorker' in navigator && 'SyncManager' in window) {
                const registration = await navigator.serviceWorker.ready;
                try {
                    // @ts-ignore
                    await registration.sync.register('sync-reports');
                } catch { }
            }

            router.push(`/dashboard?success=true&critical=${hasCritical}`);
        } catch (err) {
            console.error('Error saving report', err);
            alert('Error al guardar el reporte localmente');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-500 font-bold">Cargando inspección...</p>
            </div>
        </div>
    );

    if (!forklift || !template) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
            <div className="premium-card p-8">
                <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-black text-slate-900 mb-2">Error de conexión</h2>
                <p className="text-slate-500 mb-6 font-medium">No pudimos cargar la información del montacargas.</p>
                <button onClick={() => router.back()} className="w-full py-3 bg-slate-100 text-slate-600 font-bold rounded-xl">Volver</button>
            </div>
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-xl mx-auto pb-24 px-4 pt-6"
        >
            <div className="flex items-center mb-8">
                <button onClick={() => router.back()} className="mr-4 p-2.5 bg-white shadow-sm border border-slate-100 rounded-2xl interactive text-slate-600">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Inspección</h1>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{forklift.internalId} • {forklift.model}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {template.questions.map((q, idx) => (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={q.id}
                        className="premium-card p-6"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <label className="font-bold text-slate-800 text-base leading-tight pr-4">{q.text}</label>
                            {q.severity === 'CRITICAL_STOP' && (
                                <span className="bg-red-50 text-red-600 text-[10px] px-2 py-1 rounded-lg font-black tracking-widest uppercase border border-red-100 shrink-0">CRÍTICO</span>
                            )}
                        </div>

                        {q.type === 'YES_NO' && (
                            <div className="flex gap-3 mt-4">
                                <button
                                    type="button"
                                    onClick={() => handleAnswerChange(q.id, 'YES')}
                                    className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all interactive flex items-center justify-center gap-2 border-2 ${answers[q.id] === 'YES'
                                        ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-100'
                                        : 'bg-slate-50 border-slate-50 text-slate-400'
                                        }`}
                                >
                                    {answers[q.id] === 'YES' && <CheckCircle2 size={18} />}
                                    BIEN
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleAnswerChange(q.id, 'NO')}
                                    className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all interactive flex items-center justify-center gap-2 border-2 ${answers[q.id] === 'NO'
                                        ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-100'
                                        : 'bg-slate-50 border-slate-50 text-slate-400'
                                        }`}
                                >
                                    {answers[q.id] === 'NO' && <AlertTriangle size={18} />}
                                    MAL
                                </button>
                            </div>
                        )}

                        {q.type === 'TEXT' && (
                            <textarea
                                className="w-full mt-4 p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl text-sm font-medium focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/5 outline-none transition-all placeholder:text-slate-300"
                                rows={3}
                                placeholder="Escribe aquí tus observaciones..."
                                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                            />
                        )}

                        {q.type === 'NUMBER' && (
                            <input
                                type="number"
                                className="w-full mt-4 p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl text-sm font-black focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/5 outline-none transition-all"
                                placeholder="0"
                                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                            />
                        )}

                        {(q.requiresEvidence || q.type === 'PHOTO') && (
                            <div className="mt-4">
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

                                <AnimatePresence mode="wait">
                                    {answers[q.id] && typeof answers[q.id] === 'string' && answers[q.id].startsWith('http') ? (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className="relative mt-2 group"
                                        >
                                            <img src={answers[q.id]} alt="Evidencia" className="w-full h-48 object-cover rounded-2xl shadow-inner border border-slate-100" />
                                            <button
                                                type="button"
                                                onClick={() => handleAnswerChange(q.id, null)}
                                                className="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-xl shadow-lg interactive"
                                            >
                                                <AlertTriangle size={18} />
                                            </button>
                                        </motion.div>
                                    ) : (
                                        <label
                                            htmlFor={`file-${q.id}`}
                                            className={`flex items-center gap-3 text-sm font-black px-4 py-4 rounded-2xl transition-all w-full justify-center border-2 border-dashed interactive cursor-pointer ${uploadingState[q.id]
                                                ? 'bg-slate-50 text-slate-300 border-slate-100'
                                                : 'bg-blue-50/50 text-primary border-blue-100 hover:bg-blue-50'
                                                }`}
                                        >
                                            <Camera size={20} />
                                            {uploadingState[q.id] ? 'Subiendo...' : 'Agregar Evidencia'}
                                        </label>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </motion.div>
                ))}

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="pt-6"
                >
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full bg-slate-900 text-white font-black py-5 rounded-3xl shadow-xl shadow-slate-200 hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {saving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Save size={22} />
                                Finalizar Inspección
                            </>
                        )}
                    </button>
                    <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">
                        Los datos se guardarán localmente si no hay conexión
                    </p>
                </motion.div>
            </form>
        </motion.div>
    );
}

export default function ChecklistPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
            </div>
        }>
            <ChecklistFormContent />
        </Suspense>
    )
}
