import { Hono } from 'hono';
import { getDb, Bindings } from '../db';
import { UserPayload } from '../middleware';
import { ensureOnboardingPrerequisites } from '../onboarding';

const contracts = new Hono<{
    Bindings: Bindings,
    Variables: { user: UserPayload }
}>();

// --- CONTRACTS ---

// GET /api/contracts - List contracts
contracts.get('/', async (c) => {
    const user = c.get('user');
    const client = getDb(c.env);
    const targetClientId = c.req.query('client_id') || user.client_id;

    if (user.role !== 'ADMIN' && targetClientId !== user.client_id) {
        return c.json({ error: 'Unauthorized' }, 403);
    }

    try {
        await client.connect();
        const res = await client.query(`
            SELECT sc.*, c.name as client_name 
            FROM service_contracts sc
            JOIN clients c ON sc.client_id = c.id
            WHERE sc.client_id = $1
            ORDER BY sc.start_date DESC
        `, [targetClientId]);
        return c.json(res.rows);
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    } finally {
        try { await client.end(); } catch { }
    }
});

// POST /api/contracts - Create Contract
contracts.post('/', async (c) => {
    const user = c.get('user');
    if (user.role !== 'ADMIN') return c.json({ error: 'Admin only' }, 403);

    const body = await c.req.json();
    const { client_id, contract_type, monthly_fee, hourly_rate, start_date, end_date } = body;

    if (!client_id || !contract_type || !start_date) {
        return c.json({ error: 'Missing required fields' }, 400);
    }

    const client = getDb(c.env);
    const id = crypto.randomUUID();

    try {
        await client.connect();

        const onboardingGate = await ensureOnboardingPrerequisites(client, client_id, 'service_contracts');
        if (!onboardingGate.ok) {
            return c.json({
                error: onboardingGate.message,
                code: 'ONBOARDING_PREREQUISITE_MISSING',
                missing_steps: onboardingGate.missing_steps,
            }, 409);
        }

        await client.query(`
            INSERT INTO service_contracts (id, client_id, contract_type, monthly_fee, hourly_rate, start_date, end_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [id, client_id, contract_type, monthly_fee || 0, hourly_rate || 0, start_date, end_date || null]);

        return c.json({ message: 'Contract created', id });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    } finally {
        try { await client.end(); } catch { }
    }
});

// --- SLAs ---

// GET /api/slas - List SLAs
contracts.get('/slas', async (c) => {
    const user = c.get('user');
    const client = getDb(c.env);
    const targetClientId = c.req.query('client_id') || user.client_id;

    if (user.role !== 'ADMIN' && targetClientId !== user.client_id) {
        return c.json({ error: 'Unauthorized' }, 403);
    }

    try {
        await client.connect();
        const res = await client.query(`
            SELECT * FROM sla_definitions WHERE client_id = $1 ORDER BY priority ASC
        `, [targetClientId]);
        return c.json(res.rows);
    } finally {
        try { await client.end(); } catch { }
    }
});

// POST /api/slas - Create SLA
contracts.post('/slas', async (c) => {
    const user = c.get('user');
    if (user.role !== 'ADMIN') return c.json({ error: 'Admin only' }, 403);

    const body = await c.req.json();
    const { client_id, priority, max_response_minutes, max_resolution_minutes, penalty_per_breach } = body;
    if (!client_id) return c.json({ error: 'client_id is required' }, 400);

    const client = getDb(c.env);
    const id = crypto.randomUUID();

    try {
        await client.connect();

        const onboardingGate = await ensureOnboardingPrerequisites(client, client_id, 'sla_definitions');
        if (!onboardingGate.ok) {
            return c.json({
                error: onboardingGate.message,
                code: 'ONBOARDING_PREREQUISITE_MISSING',
                missing_steps: onboardingGate.missing_steps,
            }, 409);
        }

        await client.query(`
            INSERT INTO sla_definitions (id, client_id, priority, max_response_minutes, max_resolution_minutes, penalty_per_breach)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [id, client_id, priority, max_response_minutes, max_resolution_minutes, penalty_per_breach || 0]);

        return c.json({ message: 'SLA created', id });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    } finally {
        try { await client.end(); } catch { }
    }
});

export default contracts;
