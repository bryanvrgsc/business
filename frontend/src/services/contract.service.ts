import { ApiClient } from '../lib/apiClient';

export class ContractService {
    static async getContracts(clientId?: string): Promise<any[]> {
        const query = clientId ? `?client_id=${clientId}` : '';
        return ApiClient.get<any[]>(`/api/contracts${query}`);
    }

    static async createContract(data: any): Promise<void> {
        return ApiClient.post('/api/contracts', data);
    }

    static async getSLAs(clientId?: string): Promise<any[]> {
        const query = clientId ? `?client_id=${clientId}` : '';
        return ApiClient.get<any[]>(`/api/contracts/slas${query}`);
    }

    static async createSLA(data: any): Promise<void> {
        return ApiClient.post('/api/contracts/slas', data);
    }
}
