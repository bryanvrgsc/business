import { ApiClient } from '../lib/apiClient';
import { Part } from '../types';

export class InventoryService {
    static async getAll(): Promise<Part[]> {
        return ApiClient.get<Part[]>('/api/inventory');
    }

    static async create(data: Partial<Part>): Promise<void> {
        return ApiClient.post('/api/inventory', data);
    }

    static async update(id: string, data: Partial<Part>): Promise<void> {
        return ApiClient.patch(`/api/inventory/${id}`, data);
    }
}
