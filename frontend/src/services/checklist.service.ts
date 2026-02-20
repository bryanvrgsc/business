import { ApiClient } from '../lib/apiClient';

export interface ChecklistQuestion {
    id?: string;
    text: string;
    type: 'YES_NO' | 'PHOTO' | 'TEXT' | 'NUMBER';
    severity: 'INFO' | 'WARNING' | 'CRITICAL_STOP';
    requires_evidence: boolean;
    order_index: number;
}

export interface ChecklistTemplate {
    id: string;
    name: string;
    description?: string;
    version: number;
    is_active: boolean;
    client_id?: string;
    questions?: ChecklistQuestion[];
}

export class ChecklistService {
    static async getTemplates(): Promise<ChecklistTemplate[]> {
        return ApiClient.get<ChecklistTemplate[]>('/api/checklists/templates');
    }

    static async getTemplateWithQuestions(templateId: string): Promise<ChecklistTemplate> {
        const templates = await this.getTemplates();
        const template = templates.find(t => t.id === templateId);
        if (!template) throw new Error('Template not found');

        const questions = await ApiClient.get<ChecklistQuestion[]>(`/api/checklists/templates/${templateId}/questions`);
        return { ...template, questions };
    }

    static async createTemplate(data: { name: string; description?: string }): Promise<{ id: string }> {
        return ApiClient.post('/api/checklists/templates', data);
    }

    static async addQuestion(templateId: string, data: Omit<ChecklistQuestion, 'id'>): Promise<void> {
        return ApiClient.post(`/api/checklists/templates/${templateId}/questions`, data);
    }
}
