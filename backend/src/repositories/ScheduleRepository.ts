import { Client } from 'pg';

export class ScheduleRepository {
    constructor(private db: Client) { }

    async findActiveByClient(clientId: string) {
        const result = await this.db.query(`
            SELECT ps.*, f.internal_id as forklift_name
            FROM preventive_schedules ps
            LEFT JOIN forklifts f ON ps.forklift_id = f.id
            WHERE ps.client_id = $1 AND ps.is_active = TRUE
            ORDER BY ps.next_due_at ASC
        `, [clientId]);
        return result.rows;
    }

    async create(schedule: any) {
        await this.db.query(`
            INSERT INTO preventive_schedules (id, client_id, forklift_id, target_model, task_name, frequency_type, frequency_value, next_due_at, next_due_hours)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
            schedule.id, schedule.client_id, schedule.forklift_id, schedule.target_model,
            schedule.task_name, schedule.frequency_type, schedule.frequency_value,
            schedule.next_due_at, schedule.next_due_hours
        ]);
    }

    async findByIdAndClient(id: string, clientId: string) {
        const res = await this.db.query(`
            SELECT id
            FROM preventive_schedules
            WHERE id = $1 AND client_id = $2
            LIMIT 1
        `, [id, clientId]);
        return res.rows[0];
    }

    async update(id: string, clientId: string, updates: Record<string, any>) {
        const fields: string[] = [];
        const values: Array<string | number | boolean | null> = [];
        let idx = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined) {
                fields.push(`${key} = $${idx++}`);
                values.push(value === null ? null : value);
            }
        }

        if (fields.length === 0) return 0;

        values.push(id, clientId);
        const query = `
            UPDATE preventive_schedules 
            SET ${fields.join(', ')} 
            WHERE id = $${idx} AND client_id = $${idx + 1}
        `;

        const res = await this.db.query(query, values);
        return res.rowCount;
    }
}
