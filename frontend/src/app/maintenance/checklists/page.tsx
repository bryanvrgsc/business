'use client';
import { useEffect, useState } from 'react';
import { fetchChecklistTemplates, createChecklistTemplate, fetchChecklistQuestions, addChecklistQuestion } from '@/lib/api';

export default function ChecklistsPage() {
    const [templates, setTemplates] = useState<any[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // UI State
    const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');

    useEffect(() => {
        loadTemplates();
    }, []);

    useEffect(() => {
        if (selectedTemplate) {
            loadQuestions(selectedTemplate.id);
        } else {
            setQuestions([]);
        }
    }, [selectedTemplate]);

    const loadTemplates = async () => {
        setLoading(true); // Only initial load
        try {
            const data = await fetchChecklistTemplates();
            setTemplates(data);
            if (data.length > 0 && !selectedTemplate) {
                setSelectedTemplate(data[0]);
            }
        } finally {
            setLoading(false);
        }
    };

    const loadQuestions = async (id: string) => {
        const data = await fetchChecklistQuestions(id);
        setQuestions(data);
    };

    const handleCreateTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createChecklistTemplate({ name: newTemplateName });
            setNewTemplateName('');
            setIsCreatingTemplate(false);
            loadTemplates();
        } catch (error) {
            alert('Error creating template');
        }
    };

    return (
        <div className="p-8 h-[calc(100vh-64px)] flex flex-col">
            <h1 className="text-3xl font-bold text-slate-800 mb-6">Configuración de Checklists</h1>

            <div className="flex flex-1 gap-6 overflow-hidden">
                {/* Left Sidebar: Templates List */}
                <div className="w-1/3 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                        <h2 className="font-semibold text-slate-700">Plantillas</h2>
                        <button onClick={() => setIsCreatingTemplate(true)} className="text-blue-600 text-sm hover:underline">+ Nueva</button>
                    </div>

                    {isCreatingTemplate && (
                        <form onSubmit={handleCreateTemplate} className="p-4 border-b border-slate-100 bg-blue-50">
                            <input
                                autoFocus
                                className="w-full border rounded p-2 text-sm mb-2"
                                placeholder="Nombre (Ej: Montacargas Gas LP)"
                                value={newTemplateName}
                                onChange={e => setNewTemplateName(e.target.value)}
                            />
                            <div className="flex gap-2 justify-end">
                                <button type="button" onClick={() => setIsCreatingTemplate(false)} className="text-xs text-slate-500">Cancelar</button>
                                <button type="submit" className="text-xs bg-blue-600 text-white px-3 py-1 rounded">Crear</button>
                            </div>
                        </form>
                    )}

                    <div className="overflow-y-auto flex-1 p-2 space-y-1">
                        {templates.map(t => (
                            <div
                                key={t.id}
                                onClick={() => setSelectedTemplate(t)}
                                className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedTemplate?.id === t.id ? 'bg-blue-50 border-blue-200 border' : 'hover:bg-slate-50 border border-transparent'}`}
                            >
                                <div className="font-medium text-slate-800">{t.name}</div>
                                <div className="text-xs text-slate-400">v{t.version} • {t.client_id ? 'Personalizado' : 'Global'}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Content: Questions Editor */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
                    {selectedTemplate ? (
                        <>
                            <div className="p-6 border-b border-slate-100">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-800">{selectedTemplate.name}</h2>
                                        <p className="text-slate-500 text-sm">Preguntas de inspección para este equipo.</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">ACTIVO</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 flex-1 overflow-y-auto">
                                <QuestionsList questions={questions} templateId={selectedTemplate.id} onUpdate={() => loadQuestions(selectedTemplate.id)} />
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400">
                            Selecciona una plantilla para editar
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function QuestionsList({ questions, templateId, onUpdate }: { questions: any[], templateId: string, onUpdate: () => void }) {
    const [isAdding, setIsAdding] = useState(false);
    const [newQuestion, setNewQuestion] = useState({
        question_text: '',
        question_type: 'BOOLEAN', // YES_NO
        severity_level: 'INFO',
        order_index: questions.length + 1
    });

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        await addChecklistQuestion({ ...newQuestion, template_id: templateId });
        setIsAdding(false);
        setNewQuestion({ ...newQuestion, question_text: '' }); // Reset text but keep others defaults potentially
        onUpdate();
    };

    return (
        <div className="space-y-4">
            {questions.map((q, idx) => (
                <div key={q.id} className="flex items-center gap-4 p-4 border border-slate-100 rounded-lg bg-slate-50 group hover:border-slate-300 transition-colors">
                    <span className="text-slate-400 font-mono w-6 text-center">{idx + 1}</span>
                    <div className="flex-1">
                        <p className="font-medium text-slate-800">{q.question_text}</p>
                        <div className="flex gap-2 mt-1">
                            <span className="text-xs bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-500">{q.question_type}</span>
                            {q.severity_level !== 'INFO' && (
                                <span className={`text-xs px-2 py-0.5 rounded font-bold ${q.severity_level === 'CRITICAL_STOP' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                                    }`}>
                                    {q.severity_level}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            ))}

            {isAdding ? (
                <form onSubmit={handleAdd} className="p-4 border-2 border-dashed border-blue-300 bg-blue-50 rounded-lg">
                    <div className="flex gap-4 mb-2">
                        <input
                            placeholder="¿El nivel de aceite es correcto?"
                            className="flex-1 border rounded p-2"
                            value={newQuestion.question_text}
                            onChange={e => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
                            autoFocus
                            required
                        />
                        <select
                            className="border rounded p-2"
                            value={newQuestion.question_type}
                            onChange={e => setNewQuestion({ ...newQuestion, question_type: e.target.value })}
                        >
                            <option value="BOOLEAN">Pasó / No Pasó</option>
                            <option value="TEXT">Texto</option>
                            <option value="NUMBER">Número</option>
                        </select>
                        <select
                            className="border rounded p-2"
                            value={newQuestion.severity_level}
                            onChange={e => setNewQuestion({ ...newQuestion, severity_level: e.target.value })}
                        >
                            <option value="INFO">Info</option>
                            <option value="WARNING">Advertencia</option>
                            <option value="CRITICAL_STOP">Paro Crítico</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setIsAdding(false)} className="px-3 py-1 text-slate-500 text-sm">Cancelar</button>
                        <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Guardar Pregunta</button>
                    </div>
                </form>
            ) : (
                <button
                    onClick={() => setIsAdding(true)}
                    className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                >
                    <span>+ Agregar Pregunta</span>
                </button>
            )}
        </div>
    );
}
