export interface ChecklistQuestion {
    id: string;
    text: string;
    type: 'YES_NO' | 'PHOTO' | 'TEXT' | 'NUMBER';
    severity: 'INFO' | 'WARNING' | 'CRITICAL_STOP';
    requiresEvidence?: boolean;
}

export interface ChecklistTemplate {
    id: string;
    name: string;
    version: number;
    questions: ChecklistQuestion[];
}

export const MOCK_TEMPLATES: Record<string, ChecklistTemplate> = {
    'basic-forklift': {
        id: 't1',
        name: 'Inspección Diaria Montacargas',
        version: 1,
        questions: [
            {
                id: 'q1',
                text: '¿Las horquillas presentan grietas o deformaciones?',
                type: 'YES_NO',
                severity: 'CRITICAL_STOP'
            },
            {
                id: 'q2',
                text: '¿Nivel de aceite hidráulico correcto?',
                type: 'YES_NO',
                severity: 'WARNING'
            },
            {
                id: 'q3',
                text: '¿Funcionan los frenos correctamente?',
                type: 'YES_NO',
                severity: 'CRITICAL_STOP'
            },
            {
                id: 'q4',
                text: 'Estado de las llantas',
                type: 'TEXT',
                severity: 'INFO'
            },
            {
                id: 'q5',
                text: 'Horómetro Actual',
                type: 'NUMBER',
                severity: 'INFO'
            },
            {
                id: 'q6',
                text: 'Foto General del Equipo',
                type: 'PHOTO',
                severity: 'INFO',
                requiresEvidence: true
            }
        ]
    }
};

export async function fetchTemplate(id: string): Promise<ChecklistTemplate | null> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_TEMPLATES[id] || MOCK_TEMPLATES['basic-forklift'];
}
