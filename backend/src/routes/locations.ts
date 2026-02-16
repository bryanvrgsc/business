import { Hono } from 'hono';
import { getDb, Bindings } from '../db';
import { UserPayload } from '../middleware';
import { ensureOnboardingPrerequisites } from '../onboarding';

const locations = new Hono<{
    Bindings: Bindings,
    Variables: { user: UserPayload }
}>();

// GET /api/client-locations - List locations
// If ADMIN, can list for specific client via query param ?client_id=...
// If normal user, lists their own client's locations
locations.get('/', async (c) => {
    const user = c.get('user');
    const client = getDb(c.env);
    const targetClientId = c.req.query('client_id') || user.client_id;

    // Verify access
    if (user.role !== 'ADMIN' && targetClientId !== user.client_id) {
        return c.json({ error: 'Unauthorized access to another client data' }, 403);
    }

    try {
        await client.connect();
        const res = await client.query(`
            SELECT * FROM client_locations 
            WHERE client_id = $1 
            ORDER BY name ASC
        `, [targetClientId]);
        return c.json(res.rows);
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    } finally {
        try { await client.end(); } catch { }
    }
});

// POST /api/client-locations - Create new location
locations.post('/', async (c) => {
    const user = c.get('user');
    const body = await c.req.json();
    // Default to user's client, but ADMIN can specify another client_id in body
    const clientId = (user.role === 'ADMIN' && body.client_id) ? body.client_id : user.client_id;

    if (!clientId) return c.json({ error: 'Client ID is required' }, 400);

    const { name, address, gps_latitude, gps_longitude } = body;
    if (!name) return c.json({ error: 'Location name is required' }, 400);

    const client = getDb(c.env);
    const id = crypto.randomUUID();

    try {
        await client.connect();

        const onboardingGate = await ensureOnboardingPrerequisites(client, clientId, 'client_locations');
        if (!onboardingGate.ok) {
            return c.json({
                error: onboardingGate.message,
                code: 'ONBOARDING_PREREQUISITE_MISSING',
                missing_steps: onboardingGate.missing_steps,
            }, 409);
        }

        await client.query(`
            INSERT INTO client_locations (id, client_id, name, address, gps_latitude, gps_longitude)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [id, clientId, name, address, gps_latitude || 0, gps_longitude || 0]);

        return c.json({ message: 'Location created', id });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    } finally {
        try { await client.end(); } catch { }
    }
});

// PUT /api/client-locations/:id
locations.put('/:id', async (c) => {
    const user = c.get('user');
    const id = c.req.param('id');
    const body = await c.req.json();
    const { name, address, gps_latitude, gps_longitude } = body;

    const client = getDb(c.env);
    try {
        await client.connect();

        // Check ownership first
        const check = await client.query('SELECT client_id FROM client_locations WHERE id = $1', [id]);
        if (check.rows.length === 0) return c.json({ error: 'Location not found' }, 404);

        if (user.role !== 'ADMIN' && check.rows[0].client_id !== user.client_id) {
            return c.json({ error: 'Unauthorized' }, 403);
        }

        const fields = [];
        const values = [];
        let idx = 1;

        if (name) { fields.push(`name = $${idx++}`); values.push(name); }
        if (address !== undefined) { fields.push(`address = $${idx++}`); values.push(address); }
        if (gps_latitude !== undefined) { fields.push(`gps_latitude = $${idx++}`); values.push(gps_latitude); }
        if (gps_longitude !== undefined) { fields.push(`gps_longitude = $${idx++}`); values.push(gps_longitude); }

        if (fields.length === 0) return c.json({ message: 'No fields to update' });

        values.push(id);
        const query = `UPDATE client_locations SET ${fields.join(', ')} WHERE id = $${idx}`;

        await client.query(query, values);
        return c.json({ message: 'Location updated' });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    } finally {
        try { await client.end(); } catch { }
    }
});

export default locations;
