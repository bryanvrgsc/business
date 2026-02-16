import { Hono } from 'hono';
import { getDb, Bindings } from '../db';
import { UserPayload } from '../middleware';

const clients = new Hono<{
    Bindings: Bindings,
    Variables: { user: UserPayload }
}>();

// GET /api/clients - List all clients (Admin only)
clients.get('/', async (c) => {
    const user = c.get('user');
    if (user.role !== 'ADMIN') {
        return c.json({ error: 'Unauthorized: Admin access required' }, 403);
    }

    const client = getDb(c.env);
    try {
        await client.connect();
        const res = await client.query(`
            SELECT * FROM clients 
            ORDER BY created_at DESC
        `);
        return c.json(res.rows);
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    } finally {
        try { await client.end(); } catch { }
    }
});

// POST /api/clients - Create new client (Admin only)
clients.post('/', async (c) => {
    const user = c.get('user');
    if (user.role !== 'ADMIN') {
        return c.json({ error: 'Unauthorized: Admin access required' }, 403);
    }

    const body = await c.req.json();
    const { name, contact_email, phone, tax_id, billing_address, subscription_plan } = body;

    if (!name) return c.json({ error: 'Client name is required' }, 400);

    const client = getDb(c.env);
    const id = crypto.randomUUID();

    try {
        await client.connect();

        // TODO: Check if name already exists?

        await client.query(`
            INSERT INTO clients (id, name, contact_email, phone, tax_id, billing_address, subscription_plan)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [id, name, contact_email, phone, tax_id, billing_address, subscription_plan || 'BASIC']);

        return c.json({ message: 'Client created successfully', id });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    } finally {
        try { await client.end(); } catch { }
    }
});

// PUT /api/clients/:id - Update client (Admin only)
clients.put('/:id', async (c) => {
    const user = c.get('user');
    if (user.role !== 'ADMIN') {
        return c.json({ error: 'Unauthorized: Admin access required' }, 403);
    }

    const id = c.req.param('id');
    const body = await c.req.json();
    const { name, contact_email, phone, tax_id, billing_address, subscription_plan, is_active } = body;

    const client = getDb(c.env);
    try {
        await client.connect();

        const fields = [];
        const values = [];
        let idx = 1;

        if (name) { fields.push(`name = $${idx++}`); values.push(name); }
        if (contact_email !== undefined) { fields.push(`contact_email = $${idx++}`); values.push(contact_email); }
        if (phone !== undefined) { fields.push(`phone = $${idx++}`); values.push(phone); }
        if (tax_id !== undefined) { fields.push(`tax_id = $${idx++}`); values.push(tax_id); }
        if (billing_address !== undefined) { fields.push(`billing_address = $${idx++}`); values.push(billing_address); }
        if (subscription_plan) { fields.push(`subscription_plan = $${idx++}`); values.push(subscription_plan); }
        if (is_active !== undefined) { fields.push(`is_active = $${idx++}`); values.push(is_active); }

        if (fields.length === 0) return c.json({ message: 'No fields to update' });

        values.push(id);
        const query = `UPDATE clients SET ${fields.join(', ')} WHERE id = $${idx}`;

        await client.query(query, values);
        return c.json({ message: 'Client updated successfully' });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    } finally {
        try { await client.end(); } catch { }
    }
});

export default clients;
