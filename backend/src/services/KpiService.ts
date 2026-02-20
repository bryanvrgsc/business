import { KpiRepository } from '../repositories/KpiRepository';

export class KpiService {
    constructor(private kpiRepository: KpiRepository) { }

    async getDashboardKpis(clientId: string) {
        const [
            statusRows,
            mttrRow,
            costsRow,
            ticketsPerMonth,
            fleetStatusRows
        ] = await Promise.all([
            this.kpiRepository.getTicketCountsByStatus(clientId),
            this.kpiRepository.getMttr(clientId),
            this.kpiRepository.getCosts(clientId),
            this.kpiRepository.getTicketsPerMonth(clientId),
            this.kpiRepository.getFleetStatus(clientId)
        ]);

        const statusMap: Record<string, number> = {};
        statusRows.forEach((r: any) => { statusMap[r.status] = r.count; });

        return {
            tickets: {
                open: statusMap['OPEN'] || 0,
                in_progress: statusMap['IN_PROGRESS'] || 0,
                resolved: statusMap['RESOLVED'] || 0,
                closed: statusMap['CLOSED'] || 0,
                total: Object.values(statusMap).reduce((a: number, b: number) => a + b, 0)
            },
            mttr_hours: parseFloat(mttrRow?.mttr_hours || 0).toFixed(1),
            costs: {
                total: costsRow?.total_costs || 0,
                tickets_with_costs: costsRow?.tickets_with_costs || 0
            },
            tickets_per_month: ticketsPerMonth,
            fleet_status: fleetStatusRows.reduce((acc: any, r: any) => {
                acc[r.operational_status] = r.count;
                return acc;
            }, {})
        };
    }
}
