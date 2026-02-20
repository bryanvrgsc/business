'use client';

import { Suspense, useEffect, useState } from 'react';
import { ChecklistService, ChecklistTemplate, ChecklistQuestion } from '@/services/checklist.service';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Save, X, ClipboardList, Settings2, Trash2 } from 'lucide-react';

function ChecklistsAdminContent() {
    const router = useRouter();
    const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
    const [loading, setLoading] = useState(false);

    // Modal state for Template details
    const [showModal, setShowModal] = useState(false);
    const [activeTemplate, setActiveTemplate] = useState<ChecklistTemplate | null>(null);

    // Form state for new Template
    const [formData, setFormData] = useState({
        name: '',
        description: ''
    });

    // Form state for new Question
    const [newQuestion, setNewQuestion] = useState<Omit<ChecklistQuestion, 'id'> | null>(null);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const data = await ChecklistService.getTemplates();
            setTemplates(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenTemplate = async (templateId: string) => {
        try {
            const data = await ChecklistService.getTemplateWithQuestions(templateId);
            setActiveTemplate(data);
            setShowModal(true);
        } catch (err) {
            alert('Error al cargar la plantilla');
        }
    };

    const handleCreateTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await ChecklistService.createTemplate(formData);
            alert('Plantilla creada exitosamente');
            setFormData({ name: '', description: '' });
            loadTemplates();
        } catch (err) {
            alert('Error al crear plantilla');
        }
    };

    const handleAddQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeTemplate || !newQuestion) return;

        try {
            await ChecklistService.addQuestion(activeTemplate.id, newQuestion);
            await handleOpenTemplate(activeTemplate.id); // Reload active template
            setNewQuestion(null); // Reset form
        } catch (err) {
            alert('Error al agregar la pregunta');
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto pb-24 px-4 pt-6">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="p-2.5 bg-white shadow-sm border border-slate-100 rounded-2xl interactive text-slate-600">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Checklists</h1>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Gestión de Plantillas</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Create Form */}
                <div className="md:col-span-1">
                    <div className="premium-card p-6 bg-white sticky top-6">
                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Plus size={16} className="text-primary" />
                            Nueva Plantilla
                        </h2>
                        <form onSubmit={handleCreateTemplate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombre</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    placeholder="Ej. Inspección Diaria"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Descripción</label>
                                <textarea
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    placeholder="Propósito de la plantilla"
                                    rows={3}
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-slate-900 text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg hover:bg-black transition-all flex items-center justify-center gap-2"
                            >
                                <Save size={16} />
                                Guardar Plantilla
                            </button>
                        </form>
                    </div>
                </div>

                {/* Right Column: Templates List */}
                <div className="md:col-span-2 space-y-4">
                    {templates.length === 0 ? (
                        <div className="text-center py-12 premium-card bg-slate-50/50 border-dashed border-2">
                            <ClipboardList className="mx-auto text-slate-300 mb-3" size={32} />
                            <p className="text-slate-400 font-bold text-sm">No hay plantillas creadas</p>
                        </div>
                    ) : (
                        templates.map((template, idx) => (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                key={template.id}
                                className="premium-card p-5 flex items-center justify-between cursor-pointer hover:border-primary/30 transition-colors"
                                onClick={() => handleOpenTemplate(template.id)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                                        <ClipboardList size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900">{template.name}</h3>
                                        <div className="flex gap-2 mt-1">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md">
                                                v{template.version}
                                            </span>
                                            {template.client_id === null && (
                                                <span className="text-[10px] font-black text-purple-600 uppercase tracking-wider bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-md">
                                                    GLOBAL
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-slate-400">
                                    <Settings2 size={20} />
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>

            {/* Template Editor Modal */}
            {showModal && activeTemplate && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl relative flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-xl font-black text-slate-900">{activeTemplate.name}</h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Editor de Preguntas (v{activeTemplate.version})</p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto bg-slate-50/50 flex-1">
                            {/* Existing Questions */}
                            <div className="space-y-3 mb-8">
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-4">Preguntas Actuales</h3>
                                {activeTemplate.questions?.length === 0 ? (
                                    <p className="text-sm text-slate-400 bg-white p-4 rounded-2xl border border-slate-100 text-center">Sin preguntas configuradas.</p>
                                ) : (
                                    activeTemplate.questions?.map((q, i) => (
                                        <div key={q.id || i} className="bg-white p-4 rounded-2xl border border-slate-200 flex justify-between items-start shadow-sm">
                                            <div>
                                                <p className="font-bold text-sm text-slate-800">{i + 1}. {q.text}</p>
                                                <div className="flex gap-2 mt-2">
                                                    <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-lg uppercase">{q.type}</span>
                                                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase border ${q.severity === 'CRITICAL_STOP' ? 'bg-red-50 text-red-600 border-red-100' :
                                                        q.severity === 'WARNING' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                                                            'bg-blue-50 text-blue-600 border-blue-100'
                                                        }`}>
                                                        {q.severity}
                                                    </span>
                                                    {q.requires_evidence && (
                                                        <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-2 py-1 border border-purple-100 rounded-lg uppercase">
                                                            📷 Requiere Evidencia
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <button className="text-slate-300 hover:text-red-500 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Add New Question Form */}
                            <div className="bg-white p-5 rounded-3xl border border-primary/20 shadow-sm">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Plus size={16} className="text-primary" />
                                    Agregar Pregunta
                                </h3>

                                <form onSubmit={handleAddQuestion} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pregunta</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                                            placeholder="Escribe la pregunta o verificación..."
                                            value={newQuestion?.text || ''}
                                            onChange={e => setNewQuestion({ ...newQuestion, text: e.target.value } as any)}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tipo de Respuesta</label>
                                            <select
                                                required
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                                                value={newQuestion?.type || 'YES_NO'}
                                                onChange={e => setNewQuestion({ ...newQuestion, type: e.target.value as any } as any)}
                                            >
                                                <option value="YES_NO">Bien / Mal (YES/NO)</option>
                                                <option value="TEXT">Texto Abierto</option>
                                                <option value="NUMBER">Valor Numérico</option>
                                                <option value="PHOTO">Solo Fotografía</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Severidad (Si falla)</label>
                                            <select
                                                required
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                                                value={newQuestion?.severity || 'INFO'}
                                                onChange={e => setNewQuestion({ ...newQuestion, severity: e.target.value as any } as any)}
                                            >
                                                <option value="INFO">Informativo (INFO)</option>
                                                <option value="WARNING">Advertencia (WARNING)</option>
                                                <option value="CRITICAL_STOP">Crítico (Auto-Ticket)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 py-2">
                                        <input
                                            type="checkbox"
                                            id="requires_evidence"
                                            className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                                            checked={newQuestion?.requires_evidence || false}
                                            onChange={e => setNewQuestion({ ...newQuestion, requires_evidence: e.target.checked } as any)}
                                        />
                                        <label htmlFor="requires_evidence" className="text-sm font-bold text-slate-700 select-none cursor-pointer">
                                            Forzar evidencia fotográfica obligatoria
                                        </label>
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full bg-primary text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-200 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 mt-2"
                                        disabled={!newQuestion?.text}
                                    >
                                        <Save size={16} />
                                        Agregar a la plantilla
                                    </button>
                                </form>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}

export default function ChecklistsAdminPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <ChecklistsAdminContent />
        </Suspense>
    );
}
