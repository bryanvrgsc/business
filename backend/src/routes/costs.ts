import { Hono } from 'hono';
import { getDb, Bindings } from '../db';
import { UserPayload } from '../middleware';

const costs = new Hono<{
    Bindings: Bindings,
    Variables: { user: UserPayload }
}>();

// GET /api/costs/ticket/:ticketId
costs.get('/ticket/:ticketId', async (c) => {
    const ticketId = c.req.param('ticketId');
    const user = c.get('user');
    const client = getDb(c.env);

    try {
        await client.connect();
        // Verify ticket belongs to client
        const tRes = await client.query(`
            SELECT t.id FROM maintenance_tickets t
            JOIN forklifts f ON t.forklift_id = f.id
            WHERE t.id = $1 AND f.client_id = $2
        `, [ticketId, user.client_id]);

        if (tRes.rows.length === 0) {
            return c.json({ error: 'Ticket not found or unauthorized' }, 404);
        }

        const res = await client.query(`
            SELECT * FROM ticket_costs WHERE ticket_id = $1 ORDER BY created_at ASC
        `, [ticketId]);
        return c.json(res.rows);
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    } finally {
        try { await client.end(); } catch { }
    }
});

// POST /api/costs
costs.post('/', async (c) => {
    const user = c.get('user');
    const client = getDb(c.env);
    const { ticket_id, cost_type, description, quantity, unit_cost, is_billable } = await c.req.json();

    if (!ticket_id || !cost_type || unit_cost === undefined || quantity === undefined) {
        return c.json({ error: 'Missing required cost fields' }, 400);
    }

    const id = crypto.randomUUID();
    const total_cost = Number(quantity) * Number(unit_cost);

    try {
        await client.connect();

        // Ensure ticket belongs to the user's client
        const tRes = await client.query(`
            SELECT t.id FROM maintenance_tickets t
            JOIN forklifts f ON t.forklift_id = f.id
            WHERE t.id = $1 AND f.client_id = $2
        `, [ticket_id, user.client_id]);

        if (tRes.rows.length === 0) {
            return c.json({ error: 'Ticket not found or unauthorized' }, 404);
        }

        await client.query(`
            INSERT INTO ticket_costs (id, ticket_id, cost_type, description, quantity, unit_cost, total_cost, is_billable)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [id, ticket_id, cost_type, description || null, quantity, unit_cost, total_cost, is_billable ?? true]);

        return c.json({ message: 'Cost added to ticket', id, total_cost });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    } finally {
        try { await client.end(); } catch { }
    }
});

export default costs;
