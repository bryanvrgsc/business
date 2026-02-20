import { ApiClient } from '../lib/apiClient';
import { Client, ClientLocation, OnboardingStatus, User } from '../types';

export class ClientService {
    static async getClients(): Promise<Client[]> {
        return ApiClient.get<Client[]>('/api/clients');
    }

    static async createClient(data: Partial<Client>): Promise<void> {
        return ApiClient.post('/api/clients', data);
    }

    static async updateClient(id: string, data: Partial<Client>): Promise<void> {
        return ApiClient.put(`/api/clients/${id}`, data);
    }

    static async getLocations(clientId?: string): Promise<ClientLocation[]> {
        const query = clientId ? `?client_id=${clientId}` : '';
        return ApiClient.get<ClientLocation[]>(`/api/client-locations${query}`);
    }

    static async createLocation(data: Partial<ClientLocation>): Promise<void> {
        return ApiClient.post('/api/client-locations', data);
    }

    static async updateLocation(id: string, data: Partial<ClientLocation>): Promise<void> {
        return ApiClient.put(`/api/client-locations/${id}`, data);
    }

    static async getOnboardingStatus(clientId?: string): Promise<OnboardingStatus> {
        const query = clientId ? `?client_id=${clientId}` : '';
        return ApiClient.get<OnboardingStatus>(`/api/onboarding/status${query}`);
    }

    static async getUsers(): Promise<User[]> {
        return ApiClient.get<User[]>('/api/users');
    }

    static async createUser(data: Partial<User>): Promise<void> {
        return ApiClient.post('/api/users', data);
    }

    static async updateUser(id: string, data: Partial<User>): Promise<void> {
        return ApiClient.patch(`/api/users/${id}`, data);
    }
}
