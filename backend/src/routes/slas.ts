import { Hono } from 'hono';
import { getDb, Bindings } from '../db';
import { UserPayload } from '../middleware';

const slas = new Hono<{
    Bindings: Bindings,
    Variables: { user: UserPayload }
}>();

// GET /api/slas
slas.get('/', async (c) => {
    const user = c.get('user');
    const client = getDb(c.env);

    try {
        await client.connect();
        const res = await client.query(`
            SELECT * FROM sla_definitions 
            WHERE client_id = $1
            ORDER BY priority DESC
        `, [user.client_id]);
        return c.json(res.rows);
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    } finally {
        try { await client.end(); } catch { }
    }
});

// POST /api/slas
slas.post('/', async (c) => {
    const user = c.get('user');
    const client = getDb(c.env);

    if (user.role !== 'ADMIN') {
        return c.json({ error: 'Unauthorized to set SLAs' }, 403);
    }

    const { priority, max_response_minutes, max_resolution_minutes, penalty_per_breach } = await c.req.json();

    if (!priority || !max_response_minutes || !max_resolution_minutes) {
        return c.json({ error: 'Missing required configuration fields' }, 400);
    }

    const id = crypto.randomUUID();

    try {
        await client.connect();

        // Prevent duplicate priorities per client
        const existing = await client.query(`
            SELECT id FROM sla_definitions WHERE client_id = $1 AND priority = $2 LIMIT 1
        `, [user.client_id, priority]);

        if (existing.rows.length > 0) {
            // Update existing
            await client.query(`
                UPDATE sla_definitions 
                SET max_response_minutes = $1, max_resolution_minutes = $2, penalty_per_breach = $3
                WHERE id = $4
            `, [max_response_minutes, max_resolution_minutes, penalty_per_breach || null, existing.rows[0].id]);
            return c.json({ message: 'SLA priority updated', id: existing.rows[0].id });
        } else {
            // Insert new
            await client.query(`
                INSERT INTO sla_definitions (id, client_id, priority, max_response_minutes, max_resolution_minutes, penalty_per_breach)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [id, user.client_id, priority, max_response_minutes, max_resolution_minutes, penalty_per_breach || null]);
            return c.json({ message: 'SLA definition created', id });
        }
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    } finally {
        try { await client.end(); } catch { }
    }
});

export default slas;
