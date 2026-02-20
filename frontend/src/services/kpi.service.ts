import { ApiClient } from '../lib/apiClient';
import { KPIData } from '../types';

export class KpiService {
    static async getDashboardData(): Promise<KPIData> {
        return ApiClient.get<KPIData>('/api/kpis');
    }
}
