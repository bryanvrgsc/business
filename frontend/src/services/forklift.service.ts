import { ApiClient } from '../lib/apiClient';
import { Forklift } from '../types';

export class ForkliftService {
    static async getById(id: string): Promise<Forklift | null> {
        return ApiClient.get<Forklift>(`/api/forklifts/${id}`);
    }

    static async getAll(): Promise<Forklift[]> {
        return ApiClient.get<Forklift[]>('/api/forklifts');
    }

    static async create(data: Partial<Forklift>): Promise<void> {
        return ApiClient.post('/api/forklifts', data);
    }

    static async update(id: string, data: Partial<Forklift>): Promise<void> {
        return ApiClient.patch(`/api/forklifts/${id}`, data);
    }

    static async getByQR(qrPayload: string): Promise<Forklift | null> {
        return this.getById(qrPayload);
    }

    static async uploadImage(file: File): Promise<string> {
        const formData = new FormData();
        formData.append('file', file);
        const data = await ApiClient.put<{ url: string }>('/api/upload', formData, true);
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
        return `${API_URL}${data.url}`;
    }
}
