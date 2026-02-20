import { Client } from 'pg';
import { TicketRepository } from '../repositories/TicketRepository';

export class TicketService {
    constructor(
        private ticketRepository: TicketRepository,
        private db: Client // For cross-repository queries if we haven't extracted them all yet
    ) { }

    async getTicketsByClient(clientId: string) {
        return await this.ticketRepository.findByClientId(clientId);
    }

    async createTicket(clientId: string, userId: string, forkliftId: string, priority: string, description: string) {
        const forkliftRes = await this.db.query(`
            SELECT id FROM forklifts WHERE id = $1 AND client_id = $2 LIMIT 1
        `, [forkliftId, clientId]);

        if (forkliftRes.rows.length === 0) {
            throw new Error('Forklift config invalid for this client');
        }

        const id = crypto.randomUUID();
        const ticketNumber = `TKT-${Date.now().toString().slice(-6)}`;

        await this.ticketRepository.create({
            id,
            ticketNumber,
            forklift_id: forkliftId,
            priority: priority || 'MEDIUM',
            description,
            created_by: userId
        });

        return { id, ticketNumber };
    }

    async updateTicket(id: string, clientId: string, status: string, assigned_to?: string) {
        const ownership = await this.ticketRepository.findByIdAndClient(id, clientId);
        if (!ownership) {
            throw new Error('Ticket not found');
        }

        if (assigned_to) {
            const techRes = await this.db.query(`
                SELECT id FROM users WHERE id = $1 AND client_id = $2 LIMIT 1
            `, [assigned_to, clientId]);
            if (techRes.rows.length === 0) {
                throw new Error('Assigned user is invalid for this client');
            }
        }

        await this.ticketRepository.update(id, status, assigned_to);
    }

    async resolveTicket(id: string, clientId: string, notes: string) {
        const ownership = await this.ticketRepository.findByIdAndClient(id, clientId);
        if (!ownership) {
            throw new Error('Ticket not found');
        }

        await this.ticketRepository.resolve(id, notes);
    }
}
