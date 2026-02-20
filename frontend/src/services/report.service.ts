import { ApiClient } from '../lib/apiClient';
import { Report } from '../types';

export class ReportService {
    static async getAll(): Promise<Report[]> {
        return ApiClient.get<Report[]>('/api/reports');
    }
}
