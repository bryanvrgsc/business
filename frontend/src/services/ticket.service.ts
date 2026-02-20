import { ApiClient } from '../lib/apiClient';
import { Ticket, TicketCost } from '../types';

export class TicketService {
    static async getAll(): Promise<Ticket[]> {
        return ApiClient.get<Ticket[]>('/api/tickets');
    }

    static async create(data: Partial<Ticket>): Promise<void> {
        return ApiClient.post('/api/tickets', data);
    }

    static async updateStatus(id: string, status: string, assignedTo?: string): Promise<void> {
        return ApiClient.patch(`/api/tickets/${id}/status`, { status, assigned_to: assignedTo });
    }

    static async getCosts(ticketId: string): Promise<TicketCost[]> {
        return ApiClient.get<TicketCost[]>(`/api/tickets/${ticketId}/costs`);
    }

    static async addCost(ticketId: string, data: Partial<TicketCost>): Promise<void> {
        return ApiClient.post(`/api/tickets/${ticketId}/costs`, data);
    }
}
