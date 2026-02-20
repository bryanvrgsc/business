import { Client } from 'pg';
import { InventoryRepository } from '../repositories/InventoryRepository';

export class InventoryService {
    constructor(private inventoryRepository: InventoryRepository, private db?: Client) { }

    async getPartsByClient(clientId: string) {
        return await this.inventoryRepository.findByClientId(clientId);
    }

    async createPart(clientId: string, data: any) {
        const id = crypto.randomUUID();
        await this.inventoryRepository.create({
            id,
            client_id: clientId,
            ...data
        });
        return id;
    }

    async updateInventoryPart(id: string, clientId: string, updates: any) {
        const check = await this.inventoryRepository.findByIdAndClient(id, clientId);
        if (!check) throw new Error('Part not found');

        const changes = {
            part_number: updates.part_number,
            name: updates.name,
            current_stock: updates.current_stock,
            min_stock: updates.min_stock,
            unit_cost: updates.unit_cost,
            supplier: updates.supplier
        };

        const count = await this.inventoryRepository.update(id, clientId, changes);
        return (count ?? 0) > 0;
    }

    async usePart(ticketId: string, partId: string, quantity: number, clientId: string) {
        if (!this.db) throw new Error('DB client required for transactions');

        // Ensure ticket belongs to client
        const tRes = await this.db.query(`
            SELECT t.id FROM maintenance_tickets t
            JOIN forklifts f ON t.forklift_id = f.id
            WHERE t.id = $1 AND f.client_id = $2
        `, [ticketId, clientId]);

        if (tRes.rows.length === 0) throw new Error('Ticket not found or unauthorized');

        // Ensure part belongs to client or agency
        const pRes = await this.inventoryRepository.findByIdAndClient(partId, clientId);
        if (!pRes) throw new Error('Part not found');

        await this.inventoryRepository.usePart(ticketId, partId, quantity);
    }
}
