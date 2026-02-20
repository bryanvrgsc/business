import { Client } from 'pg';

export class ForkliftRepository {
    constructor(private db: Client) { }

    async findByIdOrQrCode(clientId: string, identifier: string) {
        const res = await this.db.query(
            `SELECT f.*, cl.name as location_name 
             FROM forklifts f
             LEFT JOIN client_locations cl ON f.location_id = cl.id
             WHERE (f.id = $1 OR f.internal_id = $1 OR f.qr_code_payload = $1)
               AND f.client_id = $2`,
            [identifier, clientId]
        );
        return res.rows[0];
    }

    async findByIdAndClient(id: string, clientId: string) {
        const res = await this.db.query(`
            SELECT id
            FROM forklifts
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
                // Map status to operational_status
                const column = key === 'status' ? 'operational_status' :
                    key === 'image' ? 'image_url' : key;
                fields.push(`${column} = $${idx++}`);
                values.push(value);
            }
        }

        if (fields.length === 0) return 0;

        values.push(id, clientId);
        const query = `
            UPDATE forklifts 
            SET ${fields.join(', ')} 
            WHERE id = $${idx} AND client_id = $${idx + 1}
        `;

        const res = await this.db.query(query, values);
        return res.rowCount;
    }
}
