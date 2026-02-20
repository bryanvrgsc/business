import { Client } from 'pg';

export class KpiRepository {
    constructor(private db: Client) { }

    async getTicketCountsByStatus(clientId: string) {
        const res = await this.db.query(`
            SELECT status, COUNT(*)::int as count
            FROM maintenance_tickets mt
            JOIN forklifts f ON mt.forklift_id = f.id
            WHERE f.client_id = $1
            GROUP BY status
        `, [clientId]);
        return res.rows;
    }

    async getMttr(clientId: string) {
        const res = await this.db.query(`
            SELECT 
                COALESCE(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600), 0)::float as mttr_hours
            FROM maintenance_tickets mt
            JOIN forklifts f ON mt.forklift_id = f.id
            WHERE f.client_id = $1 AND mt.resolved_at IS NOT NULL
        `, [clientId]);
        return res.rows[0];
    }

    async getCosts(clientId: string) {
        const res = await this.db.query(`
            SELECT 
                COALESCE(SUM(tc.total_cost), 0)::float as total_costs,
                COUNT(DISTINCT tc.ticket_id)::int as tickets_with_costs
            FROM ticket_costs tc
            JOIN maintenance_tickets mt ON tc.ticket_id = mt.id
            JOIN forklifts f ON mt.forklift_id = f.id
            WHERE f.client_id = $1
        `, [clientId]);
        return res.rows[0];
    }

    async getTicketsPerMonth(clientId: string) {
        const res = await this.db.query(`
            SELECT 
                TO_CHAR(mt.created_at, 'YYYY-MM') as month,
                COUNT(*)::int as count
            FROM maintenance_tickets mt
            JOIN forklifts f ON mt.forklift_id = f.id
            WHERE f.client_id = $1 AND mt.created_at >= NOW() - INTERVAL '6 months'
            GROUP BY TO_CHAR(mt.created_at, 'YYYY-MM')
            ORDER BY month ASC
        `, [clientId]);
        return res.rows;
    }

    async getFleetStatus(clientId: string) {
        const res = await this.db.query(`
            SELECT operational_status, COUNT(*)::int as count
            FROM forklifts
            WHERE client_id = $1
            GROUP BY operational_status
        `, [clientId]);
        return res.rows;
    }
}
