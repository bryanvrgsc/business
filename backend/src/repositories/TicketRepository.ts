import { Client } from 'pg';

export class TicketRepository {
    constructor(private db: Client) { }

    async findByClientId(clientId: string) {
        const res = await this.db.query(`
            SELECT t.*, 
                   f.internal_id as forklift_internal_id, 
                   f.model as forklift_model,
                   u.full_name as assigned_to_name
            FROM maintenance_tickets t
            JOIN forklifts f ON t.forklift_id = f.id
            LEFT JOIN users u ON t.assigned_to = u.id
            WHERE f.client_id = $1
            ORDER BY t.created_at DESC
        `, [clientId]);
        return res.rows;
    }

    async create(ticket: any) {
        await this.db.query(`
            INSERT INTO maintenance_tickets (id, ticket_number, forklift_id, status, priority, description, created_by, created_at)
            VALUES ($1, $2, $3, 'OPEN', $4, $5, $6, NOW())
        `, [ticket.id, ticket.ticketNumber, ticket.forklift_id, ticket.priority, ticket.description, ticket.created_by]);
    }

    async findByIdAndClient(id: string, clientId: string) {
        const res = await this.db.query(`
            SELECT t.id
            FROM maintenance_tickets t
            JOIN forklifts f ON t.forklift_id = f.id
            WHERE t.id = $1 AND f.client_id = $2
            LIMIT 1
        `, [id, clientId]);
        return res.rows[0];
    }

    async update(id: string, status: string, assigned_to?: string) {
        if (assigned_to) {
            await this.db.query(`
                UPDATE maintenance_tickets 
                SET status = COALESCE($1, status), 
                    assigned_to = $2,
                    assigned_at = NOW(),
                    updated_at = NOW()
                WHERE id = $3
            `, [status, assigned_to, id]);
        } else {
            await this.db.query(`
                UPDATE maintenance_tickets 
                SET status = COALESCE($1, status),
                    updated_at = NOW()
                WHERE id = $2
            `, [status, id]);
        }
    }

    async resolve(id: string, notes: string) {
        await this.db.query(`
            UPDATE maintenance_tickets 
            SET status = 'CERRADO',
                resolution_notes = $1,
                resolved_at = NOW(),
                updated_at = NOW()
            WHERE id = $2
        `, [notes, id]);
    }
}
