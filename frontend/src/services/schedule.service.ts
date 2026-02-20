import { ApiClient } from '../lib/apiClient';
import { Schedule } from '../types';

export class ScheduleService {
    static async getAll(): Promise<Schedule[]> {
        return ApiClient.get<Schedule[]>('/api/schedules');
    }

    static async create(data: Partial<Schedule>): Promise<void> {
        return ApiClient.post('/api/schedules', data);
    }

    static async update(id: string, data: Partial<Schedule>): Promise<void> {
        return ApiClient.patch(`/api/schedules/${id}`, data);
    }
}
