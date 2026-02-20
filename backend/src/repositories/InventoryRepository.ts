import { Client } from 'pg';

export class InventoryRepository {
    constructor(private db: Client) { }

    async findByClientId(clientId: string) {
        const res = await this.db.query(`
            SELECT * FROM parts_inventory 
            WHERE client_id = $1 OR client_id IS NULL 
            ORDER BY name ASC
        `, [clientId]);
        return res.rows;
    }

    async create(part: any) {
        await this.db.query(`
            INSERT INTO parts_inventory (id, part_number, name, current_stock, min_stock, unit_cost, supplier, client_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [part.id, part.part_number, part.name, part.current_stock || 0, part.min_stock || 1, part.unit_cost || null, part.supplier || null, part.client_id]);
    }

    async findByIdAndClient(id: string, clientId: string) {
        const res = await this.db.query(`
            SELECT id
            FROM parts_inventory
            WHERE id = $1 AND client_id = $2
            LIMIT 1
        `, [id, clientId]);
        return res.rows[0];
    }

    async update(id: string, clientId: string, updates: Record<string, any>) {
        const fields: string[] = [];
        const values: Array<string | number> = [];
        let idx = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined) {
                fields.push(`${key} = $${idx++}`);
                values.push(value);
            }
        }

        if (fields.length === 0) return 0;

        values.push(id, clientId);
        const query = `
            UPDATE parts_inventory 
            SET ${fields.join(', ')} 
            WHERE id = $${idx} AND client_id = $${idx + 1}
        `;

        const res = await this.db.query(query, values);
        return res.rowCount;
    }

    async usePart(ticketId: string, partId: string, quantity: number) {
        await this.db.query('BEGIN');

        await this.db.query(`
            INSERT INTO ticket_parts_used (id, ticket_id, part_id, quantity)
            VALUES ($1, $2, $3, $4)
        `, [crypto.randomUUID(), ticketId, partId, quantity]);

        await this.db.query(`
            UPDATE parts_inventory
            SET current_stock = current_stock - $1,
                updated_at = NOW()
            WHERE id = $2
        `, [quantity, partId]);

        await this.db.query('COMMIT');
    }
}
