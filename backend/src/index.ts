import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Bindings, getDb } from './db';
import auth from './auth';
import { authMiddleware, UserPayload } from './middleware';
import clients from './routes/clients';
import locations from './routes/locations';
import contracts from './routes/contracts';
import checklists from './routes/checklists';
import { ensureOnboardingPrerequisites, getOnboardingStatus } from './onboarding';

const app = new Hono<{
    Bindings: Bindings,
    Variables: { user: UserPayload }
}>();

app.use('/*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
}));

app.route('/api/auth', auth);

app.get('/', (c) => {
    return c.text('CMMS Backend is running 🚀');
});

app.get('/api/test-db', async (c) => {
    const client = getDb(c.env);
    try {
        await client.connect();
        // Spanner/Postgres version check
        const res = await client.query('SELECT version()');
        await client.end();
        return c.json({
            status: 'ok',
            version: res.rows[0].version,
            connection: 'success'
        });
    } catch (e: any) {
        return c.json({
            status: 'error',
            message: e.message,
            stack: e.stack
        }, 500);
    }
});

// Protected Routes
app.use('/api/*', authMiddleware);

app.route('/api/clients', clients);
app.route('/api/client-locations', locations);
app.route('/api/contracts', contracts);
app.route('/api/checklists', checklists);

const FAILED_ANSWER_VALUES = new Set(['NO', 'FAIL', 'FAILED', 'FALSE', '0']);

const normalizeAnswerValue = (value: unknown): string => {
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (value === null || value === undefined) return '';
    return String(value).trim().toUpperCase();
};

const isFailedAnswer = (value: unknown): boolean => FAILED_ANSWER_VALUES.has(normalizeAnswerValue(value));

// -----------------------------------------------------------------
// Endpoint: GET /api/onboarding/status
// -----------------------------------------------------------------
app.get('/api/onboarding/status', async (c) => {
    const user = c.get('user');
    const requestedClientId = c.req.query('client_id');
    const targetClientId = user.role === 'ADMIN' && requestedClientId ? requestedClientId : user.client_id;

    if (!targetClientId) {
        return c.json({ error: 'client_id is required' }, 400);
    }

    const client = getDb(c.env);
    try {
        await client.connect();
        const status = await getOnboardingStatus(client, targetClientId);
        return c.json(status);
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    } finally {
        try { await client.end(); } catch { }
    }
});

// -----------------------------------------------------------------
// Endpoint: GET /api/forklifts/:id
// -----------------------------------------------------------------
app.get('/api/forklifts/:id', async (c) => {
    const user = c.get('user');
    const id = c.req.param('id');
    const client = getDb(c.env);

    try {
        await client.connect();
        // Try to find by ID or Internal ID (QR Code)
        const res = await client.query(
            `SELECT f.*, cl.name as location_name 
             FROM forklifts f
             LEFT JOIN client_locations cl ON f.location_id = cl.id
             WHERE (f.id = $1 OR f.internal_id = $1 OR f.qr_code_payload = $1)
               AND f.client_id = $2`,
            [id, user.client_id]
        );

        if (res.rows.length === 0) {
            return c.json({ error: 'Forklift not found' }, 404);
        }

        const f = res.rows[0];

        return c.json({
            id: f.id,
            internalId: f.internal_id,
            model: f.model,
            brand: f.brand,
            status: f.operational_status, // OPERATIONAL, MAINTENANCE, OUT_OF_SERVICE
            location: f.location_name || 'Sin ubicaciónasignada',
            nextMaintenance: '2024-03-01', // TODO: Calculate from schedules
            image: '/forklift-placeholder.png' // TODO: R2 Image
        });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    } finally {
        try { await client.end(); } catch { }
    }
});

// -----------------------------------------------------------------
// Endpoint: POST /api/sync
// -----------------------------------------------------------------
app.post('/api/sync', async (c) => {
    const user = c.get('user');
    const report = await c.req.json() as {
        forkliftId?: string;
        templateId?: string;
        answers?: Record<string, unknown>;
        hasCriticalFailure?: boolean;
        capturedAt?: string;
        gpsLatitude?: number;
        gpsLongitude?: number;
    };
    const { forkliftId, templateId, answers, hasCriticalFailure, capturedAt, gpsLatitude, gpsLongitude } = report;

    if (!forkliftId) {
        return c.json({ error: 'forkliftId is required' }, 400);
    }

    console.log(`Sync request from user ${user.sub} (Client: ${user.client_id})`);

    const client = getDb(c.env);

    try {
        await client.connect();

        const forkliftRes = await client.query(`
            SELECT id
            FROM forklifts
            WHERE id = $1 AND client_id = $2
            LIMIT 1
        `, [forkliftId, user.client_id]);

        if (forkliftRes.rows.length === 0) {
            return c.json({ error: 'Forklift not found' }, 404);
        }

        let hasWarningFailure = false;
        let hasCriticalFromAnswers = false;
        const answerEntries = answers ? Object.entries(answers) : [];

        if (answerEntries.length > 0) {
            const questionIds = answerEntries.map(([questionId]) => questionId);
            const severityRes = await client.query(`
                SELECT id, severity_level
                FROM checklist_questions
                WHERE id = ANY($1::varchar[])
            `, [questionIds]);

            const severityByQuestion = new Map<string, string>();
            for (const row of severityRes.rows) {
                severityByQuestion.set(String(row.id), String(row.severity_level || 'INFO').toUpperCase());
            }

            for (const [questionId, value] of answerEntries) {
                if (!isFailedAnswer(value)) continue;
                const severity = severityByQuestion.get(questionId);
                if (severity === 'CRITICAL_STOP') {
                    hasCriticalFromAnswers = true;
                } else if (severity === 'WARNING') {
                    hasWarningFailure = true;
                }
            }
        }

        // Backward compatibility: keep old flag support if front sends only hasCriticalFailure.
        const resolvedCritical = hasCriticalFromAnswers || Boolean(hasCriticalFailure);

        // Generate a new ID for the report
        const reportId = crypto.randomUUID();

        // 1. Insert Report Header
        await client.query(`
            INSERT INTO reports (id, forklift_id, user_id, template_id, captured_at, has_critical_failure, gps_latitude, gps_longitude)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
            reportId,
            forkliftId,
            user.sub,
            templateId,
            capturedAt || new Date().toISOString(),
            resolvedCritical,
            gpsLatitude || 0.0,
            gpsLongitude || 0.0
        ]);

        // 2. Insert Answers
        if (answerEntries.length > 0) {
            for (const [questionId, value] of answerEntries) {
                await client.query(`
                    INSERT INTO report_answers (id, report_id, question_id, answer_value)
                    VALUES ($1, $2, $3, $4)
                `, [crypto.randomUUID(), reportId, questionId, String(value)]);
            }
        }

        // 3. Create maintenance ticket for WARNING and CRITICAL_STOP.
        if (resolvedCritical || hasWarningFailure) {
            const ticketId = crypto.randomUUID();
            const ticketNumber = `TKT-${Date.now().toString().slice(-6)}`;
            const priority = resolvedCritical ? 'HIGH' : 'MEDIUM';
            const description = resolvedCritical
                ? 'Falla crítica detectada en inspección'
                : 'Falla de advertencia detectada en inspección';

            await client.query(`
                INSERT INTO maintenance_tickets (id, ticket_number, report_id, forklift_id, status, priority, description, created_by, created_at)
                VALUES ($1, $2, $3, $4, 'OPEN', $5, $6, $7, $8)
            `, [ticketId, ticketNumber, reportId, forkliftId, priority, description, user.sub, new Date().toISOString()]);
        }

        // 4. En paro crítico, bloquear equipo.
        if (resolvedCritical) {
            await client.query(`
                UPDATE forklifts 
                SET operational_status = 'OUT_OF_SERVICE' 
                WHERE id = $1
            `, [forkliftId]);
        }

        return c.json({
            message: 'Report synced successfully',
            synced_at: new Date().toISOString(),
            id: reportId
        });

    } catch (e: any) {
        console.error('Sync Error:', e);
        return c.json({ error: e.message }, 500);
    } finally {
        try { await client.end(); } catch { }
    }
});

// -----------------------------------------------------------------
// Endpoint: GET /api/client-locations
// -----------------------------------------------------------------
app.get('/api/client-locations', async (c) => {
    const user = c.get('user');
    const client = getDb(c.env);

    try {
        await client.connect();
        const res = await client.query(`
            SELECT id, name
            FROM client_locations
            WHERE client_id = $1
            ORDER BY name ASC
        `, [user.client_id]);

        return c.json(res.rows);
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    } finally {
        try { await client.end(); } catch { }
    }
});

// PATCH /api/forklifts/:id (Update Forklift)
app.patch('/api/forklifts/:id', async (c) => {
    const user = c.get('user');
    const id = c.req.param('id');
    const client = getDb(c.env);
    const body = await c.req.json();
    const {
        model, brand, serial_number, fuel_type,
        current_hours, year, location_id, image, status
    } = body;

    try {
        await client.connect();

        const forkliftRes = await client.query(`
            SELECT id
            FROM forklifts
            WHERE id = $1 AND client_id = $2
            LIMIT 1
        `, [id, user.client_id]);
        if (forkliftRes.rows.length === 0) {
            return c.json({ error: 'Forklift not found' }, 404);
        }

        if (location_id) {
            const locationRes = await client.query(`
                SELECT id
                FROM client_locations
                WHERE id = $1 AND client_id = $2
                LIMIT 1
            `, [location_id, user.client_id]);
            if (locationRes.rows.length === 0) {
                return c.json({ error: 'Location not found for this client' }, 400);
            }
        }

        // Dynamic update query
        const fields: string[] = [];
        const values: Array<string | number> = [];
        let idx = 1;

        if (model) { fields.push(`model = $${idx++}`); values.push(model); }
        if (brand) { fields.push(`brand = $${idx++}`); values.push(brand); }
        if (serial_number) { fields.push(`serial_number = $${idx++}`); values.push(serial_number); }
        if (fuel_type) { fields.push(`fuel_type = $${idx++}`); values.push(fuel_type); }
        if (current_hours !== undefined) { fields.push(`current_hours = $${idx++}`); values.push(current_hours); }
        if (year) { fields.push(`year = $${idx++}`); values.push(year); }
        if (location_id) { fields.push(`location_id = $${idx++}`); values.push(location_id); }
        if (image) { fields.push(`image_url = $${idx++}`); values.push(image); }
        if (status) { fields.push(`operational_status = $${idx++}`); values.push(status); } // Remapping status to operational_status

        if (fields.length === 0) return c.json({ message: 'No fields to update' });

        values.push(id, user.client_id);
        const query = `
            UPDATE forklifts 
            SET ${fields.join(', ')} 
            WHERE id = $${idx} AND client_id = $${idx + 1}
        `;

        await client.query(query, values);
        return c.json({ message: 'Forklift updated successfully' });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    } finally {
        try { await client.end(); } catch { }
    }
});

// -----------------------------------------------------------------
// Endpoint: GET /api/tickets
// -----------------------------------------------------------------
app.get('/api/tickets', async (c) => {
    const user = c.get('user');
    const client = getDb(c.env);
    try {
        await client.connect();
        const res = await client.query(`
            SELECT t.*, 
                   f.internal_id as forklift_internal_id, 
                   f.model as forklift_model,
                   u.full_name as assigned_to_name
            FROM maintenance_tickets t
            JOIN forklifts f ON t.forklift_id = f.id
            LEFT JOIN users u ON t.assigned_to = u.id
            WHERE f.client_id = $1
            ORDER BY t.created_at DESC
        `, [user.client_id]);
        return c.json(res.rows);
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    } finally {
        try { await client.end(); } catch { }
    }
});

// POST /api/tickets (Create Ticket Manually)
app.post('/api/tickets', async (c) => {
    const user = c.get('user');
    const client = getDb(c.env);
    const body = await c.req.json();
    const { forklift_id, priority, description } = body;

    if (!forklift_id) {
        return c.json({ error: 'forklift_id is required' }, 400);
    }

    const id = crypto.randomUUID();
    const ticketNumber = `TKT-${Date.now().toString().slice(-6)}`;

    try {
        await client.connect();

        const forkliftRes = await client.query(`
            SELECT id
            FROM forklifts
            WHERE id = $1 AND client_id = $2
            LIMIT 1
        `, [forklift_id, user.client_id]);

        if (forkliftRes.rows.length === 0) {
            return c.json({ error: 'No existe montacargas para este cliente' }, 400);
        }

        await client.query(`
            INSERT INTO maintenance_tickets (id, ticket_number, forklift_id, status, priority, description, created_by, created_at)
            VALUES ($1, $2, $3, 'OPEN', $4, $5, $6, NOW())
        `, [id, ticketNumber, forklift_id, priority || 'MEDIUM', description, user.sub]);

        return c.json({ message: 'Ticket created', id, ticketNumber });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    } finally {
        try { await client.end(); } catch { }
    }
});

// -----------------------------------------------------------------
// Endpoint: PATCH /api/tickets/:id/status
// -----------------------------------------------------------------
app.patch('/api/tickets/:id/status', async (c) => {
    const user = c.get('user');
    const id = c.req.param('id');
    const { status, assigned_to } = await c.req.json();
    const client = getDb(c.env);

    try {
        await client.connect();

        const ownershipRes = await client.query(`
            SELECT t.id
            FROM maintenance_tickets t
            JOIN forklifts f ON t.forklift_id = f.id
            WHERE t.id = $1 AND f.client_id = $2
            LIMIT 1
        `, [id, user.client_id]);
        if (ownershipRes.rows.length === 0) {
            return c.json({ error: 'Ticket not found' }, 404);
        }

        if (assigned_to) {
            const techRes = await client.query(`
                SELECT id
                FROM users
                WHERE id = $1 AND client_id = $2
                LIMIT 1
            `, [assigned_to, user.client_id]);
            if (techRes.rows.length === 0) {
                return c.json({ error: 'assigned_to user is invalid for this client' }, 400);
            }
        }

        if (assigned_to) {
            await client.query(`
                UPDATE maintenance_tickets 
                SET status = COALESCE($1, status), 
                    assigned_to = $2,
                    assigned_at = NOW(),
                    updated_at = NOW()
                WHERE id = $3
            `, [status, assigned_to, id]);
        } else {
            await client.query(`
                UPDATE maintenance_tickets 
                SET status = COALESCE($1, status),
                    updated_at = NOW()
                WHERE id = $2
            `, [status, id]);
        }
        return c.json({ message: 'Ticket updated' });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    } finally {
        try { await client.end(); } catch { }
    }
});

// PATCH /api/inventory/:id (Update Part)
app.patch('/api/inventory/:id', async (c) => {
    const user = c.get('user');
    const id = c.req.param('id');
    const client = getDb(c.env);
    const body = await c.req.json();
    const { part_number, name, current_stock, min_stock, unit_cost, supplier } = body;

    try {
        await client.connect();

        const partRes = await client.query(`
            SELECT id
            FROM parts_inventory
            WHERE id = $1 AND client_id = $2
            LIMIT 1
        `, [id, user.client_id]);
        if (partRes.rows.length === 0) {
            return c.json({ error: 'Part not found' }, 404);
        }

        const fields: string[] = [];
        const values: Array<string | number> = [];
        let idx = 1;

        if (part_number) { fields.push(`part_number = $${idx++}`); values.push(part_number); }
        if (name) { fields.push(`name = $${idx++}`); values.push(name); }
        if (current_stock !== undefined) { fields.push(`current_stock = $${idx++}`); values.push(current_stock); }
        if (min_stock !== undefined) { fields.push(`min_stock = $${idx++}`); values.push(min_stock); }
        if (unit_cost !== undefined) { fields.push(`unit_cost = $${idx++}`); values.push(unit_cost); }
        if (supplier) { fields.push(`supplier = $${idx++}`); values.push(supplier); }

        if (fields.length === 0) return c.json({ message: 'No fields to update' });

        values.push(id, user.client_id);
        const query = `
            UPDATE parts_inventory 
            SET ${fields.join(', ')} 
            WHERE id = $${idx} AND client_id = $${idx + 1}
        `;

        await client.query(query, values);
        return c.json({ message: 'Part updated successfully' });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    } finally {
        try { await client.end(); } catch { }
    }
});

/**
 * ==========================================
 * PREVENTIVE MAINTENANCE API
 * ==========================================
 */

// GET /api/schedules
app.get('/api/schedules', async (c) => {
    const user = c.get('user');
    const client = getDb(c.env);

    try {
        await client.connect();
        const result = await client.query(`
            SELECT ps.*, f.internal_id as forklift_name
            FROM preventive_schedules ps
            LEFT JOIN forklifts f ON ps.forklift_id = f.id
            WHERE ps.client_id = $1 AND ps.is_active = TRUE
            ORDER BY ps.next_due_at ASC
        `, [user.client_id]);

        return c.json(result.rows);
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    } finally {
        try { await client.end(); } catch { }
    }
});

// POST /api/schedules
app.post('/api/schedules', async (c) => {
    const user = c.get('user');
    const client = getDb(c.env);
    const body = await c.req.json();

    const { forklift_id, task_name, frequency_type, frequency_value, target_model } = body;

    if (!task_name || !frequency_type || !frequency_value) {
        return c.json({ error: 'task_name, frequency_type and frequency_value are required' }, 400);
    }

    const id = crypto.randomUUID();
    let next_due_at = new Date();
    let next_due_hours = 0;

    try {
        await client.connect();

        const onboardingGate = await ensureOnboardingPrerequisites(client, user.client_id, 'preventive_schedules');
        if (!onboardingGate.ok) {
            return c.json({
                error: onboardingGate.message,
                code: 'ONBOARDING_PREREQUISITE_MISSING',
                missing_steps: onboardingGate.missing_steps,
            }, 409);
        }

        if (frequency_type === 'DAYS') {
            next_due_at.setDate(next_due_at.getDate() + parseInt(frequency_value));
        } else if (frequency_type === 'HOURS' && forklift_id) {
            // Fetch current hours
            const fRes = await client.query(`
                SELECT current_hours
                FROM forklifts
                WHERE id = $1 AND client_id = $2
            `, [forklift_id, user.client_id]);
            if (fRes.rows.length === 0) {
                return c.json({ error: 'Forklift not found for this client' }, 400);
            }
            const currentHours = parseFloat(fRes.rows[0]?.current_hours || 0);
            next_due_hours = currentHours + parseFloat(frequency_value);
            // Set next_due_at to far future or null? Schema allows null? Checking schema...
            // Let's set it to today + 1 year just in case query requires it, or handle in query
            next_due_at.setFullYear(next_due_at.getFullYear() + 1);
        } else if (forklift_id) {
            const fRes = await client.query(`
                SELECT id
                FROM forklifts
                WHERE id = $1 AND client_id = $2
                LIMIT 1
            `, [forklift_id, user.client_id]);
            if (fRes.rows.length === 0) {
                return c.json({ error: 'Forklift not found for this client' }, 400);
            }
        }

        await client.query(`
            INSERT INTO preventive_schedules (id, client_id, forklift_id, target_model, task_name, frequency_type, frequency_value, next_due_at, next_due_hours)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [id, user.client_id, forklift_id, target_model, task_name, frequency_type, frequency_value, next_due_at.toISOString(), next_due_hours]);

        return c.json({ message: 'Schedule created', id });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    } finally {
        try { await client.end(); } catch { }
    }
});

// PATCH /api/schedules/:id (Update Schedule)
app.patch('/api/schedules/:id', async (c) => {
    const user = c.get('user');
    const id = c.req.param('id');
    const client = getDb(c.env);
    const body = await c.req.json();
    const { forklift_id, task_name, frequency_type, frequency_value, target_model, is_active } = body;

    try {
        await client.connect();

        const ownerRes = await client.query(`
            SELECT id
            FROM preventive_schedules
            WHERE id = $1 AND client_id = $2
            LIMIT 1
        `, [id, user.client_id]);
        if (ownerRes.rows.length === 0) {
            return c.json({ error: 'Schedule not found' }, 404);
        }

        if (forklift_id) {
            const forkliftRes = await client.query(`
                SELECT id
                FROM forklifts
                WHERE id = $1 AND client_id = $2
                LIMIT 1
            `, [forklift_id, user.client_id]);
            if (forkliftRes.rows.length === 0) {
                return c.json({ error: 'Forklift not found for this client' }, 400);
            }
        }

        const fields: string[] = [];
        const values: Array<string | number | boolean | null> = [];
        let idx = 1;

        if (forklift_id !== undefined) { fields.push(`forklift_id = $${idx++}`); values.push(forklift_id || null); }
        if (task_name) { fields.push(`task_name = $${idx++}`); values.push(task_name); }
        if (frequency_type) { fields.push(`frequency_type = $${idx++}`); values.push(frequency_type); }
        if (frequency_value) { fields.push(`frequency_value = $${idx++}`); values.push(frequency_value); }
        if (target_model !== undefined) { fields.push(`target_model = $${idx++}`); values.push(target_model || null); }
        if (is_active !== undefined) { fields.push(`is_active = $${idx++}`); values.push(is_active); }

        if (fields.length === 0) return c.json({ message: 'No fields to update' });

        values.push(id, user.client_id);
        const query = `
            UPDATE preventive_schedules 
            SET ${fields.join(', ')} 
            WHERE id = $${idx} AND client_id = $${idx + 1}
        `;

        await client.query(query, values);
        return c.json({ message: 'Schedule updated successfully' });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    } finally {
        try { await client.end(); } catch { }
    }
});


/**
 * ==========================================
 * KPIs & ANALYTICS API
 * ==========================================
 */

// GET /api/kpis
app.get('/api/kpis', async (c) => {
    const user = c.get('user');
    const client = getDb(c.env);

    try {
        await client.connect();

        // 1. Ticket counts by status
        const ticketsByStatus = await client.query(`
            SELECT status, COUNT(*)::int as count
            FROM maintenance_tickets mt
            JOIN forklifts f ON mt.forklift_id = f.id
            WHERE f.client_id = $1
            GROUP BY status
        `, [user.client_id]);

        // 2. MTTR (Mean Time To Repair) - avg hours between created_at and resolved_at
        const mttrResult = await client.query(`
            SELECT 
                COALESCE(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600), 0)::float as mttr_hours
            FROM maintenance_tickets mt
            JOIN forklifts f ON mt.forklift_id = f.id
            WHERE f.client_id = $1 AND mt.resolved_at IS NOT NULL
        `, [user.client_id]);

        // 3. Total costs
        const costsResult = await client.query(`
            SELECT 
                COALESCE(SUM(tc.total_cost), 0)::float as total_costs,
                COUNT(DISTINCT tc.ticket_id)::int as tickets_with_costs
            FROM ticket_costs tc
            JOIN maintenance_tickets mt ON tc.ticket_id = mt.id
            JOIN forklifts f ON mt.forklift_id = f.id
            WHERE f.client_id = $1
        `, [user.client_id]);

        // 4. Tickets per month (last 6 months)
        const ticketsPerMonth = await client.query(`
            SELECT 
                TO_CHAR(mt.created_at, 'YYYY-MM') as month,
                COUNT(*)::int as count
            FROM maintenance_tickets mt
            JOIN forklifts f ON mt.forklift_id = f.id
            WHERE f.client_id = $1 AND mt.created_at >= NOW() - INTERVAL '6 months'
            GROUP BY TO_CHAR(mt.created_at, 'YYYY-MM')
            ORDER BY month ASC
        `, [user.client_id]);

        // 5. Forklift fleet status
        const fleetStatus = await client.query(`
            SELECT operational_status, COUNT(*)::int as count
            FROM forklifts
            WHERE client_id = $1
            GROUP BY operational_status
        `, [user.client_id]);

        const statusMap: Record<string, number> = {};
        ticketsByStatus.rows.forEach((r: any) => { statusMap[r.status] = r.count; });

        return c.json({
            tickets: {
                open: statusMap['OPEN'] || 0,
                in_progress: statusMap['IN_PROGRESS'] || 0,
                resolved: statusMap['RESOLVED'] || 0,
                closed: statusMap['CLOSED'] || 0,
                total: Object.values(statusMap).reduce((a: number, b: number) => a + b, 0)
            },
            mttr_hours: parseFloat(mttrResult.rows[0]?.mttr_hours || 0).toFixed(1),
            costs: {
                total: costsResult.rows[0]?.total_costs || 0,
                tickets_with_costs: costsResult.rows[0]?.tickets_with_costs || 0
            },
            tickets_per_month: ticketsPerMonth.rows,
            fleet_status: fleetStatus.rows.reduce((acc: any, r: any) => {
                acc[r.operational_status] = r.count;
                return acc;
            }, {})
        });

    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    } finally {
        try { await client.end(); } catch { }
    }
});

/**
 * ==========================================
 * INVENTORY & COSTS API
 * ==========================================
 */

// GET /api/inventory
app.get('/api/inventory', async (c) => {
    const user = c.get('user');
    const client = getDb(c.env);
    try {
        await client.connect();
        const res = await client.query(`
            SELECT * FROM parts_inventory
            WHERE client_id = $1
            ORDER BY name ASC
                `, [user.client_id]);
        return c.json(res.rows);
    } finally {
        try { await client.end(); } catch { }
    }
});

// POST /api/inventory
app.post('/api/inventory', async (c) => {
    const user = c.get('user');
    const client = getDb(c.env);
    const body = await c.req.json();
    const { part_number, name, current_stock, min_stock, unit_cost, supplier } = body;
    const id = crypto.randomUUID();

    try {
        await client.connect();
        await client.query(`
            INSERT INTO parts_inventory(id, part_number, name, current_stock, min_stock, unit_cost, supplier, client_id)
            VALUES($1, $2, $3, $4, $5, $6, $7, $8)
                    `, [id, part_number, name, current_stock || 0, min_stock || 1, unit_cost || 0, supplier, user.client_id]);
        return c.json({ message: 'Part added', id });
    } finally {
        try { await client.end(); } catch { }
    }
});

// GET /api/tickets/:id/costs
app.get('/api/tickets/:id/costs', async (c) => {
    const user = c.get('user');
    const ticketId = c.req.param('id');
    const client = getDb(c.env);
    try {
        await client.connect();

        const ownerRes = await client.query(`
            SELECT t.id
            FROM maintenance_tickets t
            JOIN forklifts f ON t.forklift_id = f.id
            WHERE t.id = $1 AND f.client_id = $2
            LIMIT 1
        `, [ticketId, user.client_id]);
        if (ownerRes.rows.length === 0) {
            return c.json({ error: 'Ticket not found' }, 404);
        }

        const res = await client.query(`
            SELECT * FROM ticket_costs
            WHERE ticket_id = $1
            ORDER BY created_at DESC
                `, [ticketId]);
        return c.json(res.rows);
    } finally {
        try { await client.end(); } catch { }
    }
});

// POST /api/tickets/:id/costs
app.post('/api/tickets/:id/costs', async (c) => {
    const user = c.get('user');
    const ticketId = c.req.param('id');
    const client = getDb(c.env);
    const body = await c.req.json();
    const { cost_type, description, quantity, unit_cost, is_billable } = body;
    const id = crypto.randomUUID();
    const total_cost = (quantity || 1) * unit_cost;

    try {
        await client.connect();

        const ownerRes = await client.query(`
            SELECT t.id
            FROM maintenance_tickets t
            JOIN forklifts f ON t.forklift_id = f.id
            WHERE t.id = $1 AND f.client_id = $2
            LIMIT 1
        `, [ticketId, user.client_id]);
        if (ownerRes.rows.length === 0) {
            return c.json({ error: 'Ticket not found' }, 404);
        }

        await client.query(`
            INSERT INTO ticket_costs(id, ticket_id, cost_type, description, quantity, unit_cost, total_cost, is_billable)
            VALUES($1, $2, $3, $4, $5, $6, $7, $8)
                    `, [id, ticketId, cost_type, description, quantity || 1, unit_cost, total_cost, is_billable !== false]);
        return c.json({ message: 'Cost added', id, total_cost });
    } finally {
        try { await client.end(); } catch { }
    }
});


/**
 * ==========================================
 * ADMIN API (Users & Forklifts)
 * ==========================================
 */

// POST /api/forklifts (Register Forklift)
app.post('/api/forklifts', async (c) => {
    const user = c.get('user');
    // In a real app, check if user.role === 'ADMIN'

    const client = getDb(c.env);
    const body = await c.req.json();
    const { internal_id, model, brand, serial_number, year, location_id, fuel_type, current_hours, image } = body;

    if (!internal_id) {
        return c.json({ error: 'internal_id is required' }, 400);
    }

    const id = crypto.randomUUID();
    // Simple QR payload: URL or just ID. Let's use internal_id for readability in this MVP
    const qr_code_payload = internal_id;

    try {
        await client.connect();

        const onboardingGate = await ensureOnboardingPrerequisites(client, user.client_id, 'forklifts');
        if (!onboardingGate.ok) {
            return c.json({
                error: onboardingGate.message,
                code: 'ONBOARDING_PREREQUISITE_MISSING',
                missing_steps: onboardingGate.missing_steps,
            }, 409);
        }

        if (location_id) {
            const locationRes = await client.query(`
                SELECT id
                FROM client_locations
                WHERE id = $1 AND client_id = $2
                LIMIT 1
            `, [location_id, user.client_id]);
            if (locationRes.rows.length === 0) {
                return c.json({ error: 'Location not found for this client' }, 400);
            }
        }

        await client.query(`
            INSERT INTO forklifts(id, internal_id, qr_code_payload, model, brand, serial_number, year, client_id, location_id, fuel_type, current_hours, image_url)
            VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    `, [id, internal_id, qr_code_payload, model, brand, serial_number, year, user.client_id, location_id, fuel_type, current_hours, image]);

        return c.json({ message: 'Forklift created', id, qr_code_payload });
    } finally {
        try { await client.end(); } catch { }
    }
});

// GET /api/forklifts (List Forklifts)
app.get('/api/forklifts', async (c) => {
    const user = c.get('user');
    const client = getDb(c.env);

    try {
        await client.connect();
        const res = await client.query(`
            SELECT id, internal_id, model, brand, operational_status, image_url
            FROM forklifts 
            WHERE client_id = $1
            ORDER BY internal_id ASC
                `, [user.client_id]);
        return c.json(res.rows);
    } finally {
        try { await client.end(); } catch { }
    }
});

// GET /api/users (List Users)
app.get('/api/users', async (c) => {
    const user = c.get('user');
    const client = getDb(c.env);

    // Check Admin Role?

    try {
        await client.connect();
        const res = await client.query(`
            SELECT id, full_name, email, phone, role, is_active, last_login_at 
            FROM users 
            WHERE client_id = $1
            ORDER BY created_at DESC
                `, [user.client_id]);
        return c.json(res.rows);
    } finally {
        try { await client.end(); } catch { }
    }
});

// POST /api/users (Create User)
app.post('/api/users', async (c) => {
    const user = c.get('user');
    // Check Admin Role?

    const client = getDb(c.env);
    const body = await c.req.json();
    const { full_name, email, phone, password, role } = body;

    if (!full_name || !email || !password || !role) {
        return c.json({ error: 'full_name, email, password and role are required' }, 400);
    }

    const id = crypto.randomUUID();
    // Simple hash for now (in prod: bcrypt)
    // We are trusting the admin input here
    const password_hash = password;

    try {
        await client.connect();

        const onboardingGate = await ensureOnboardingPrerequisites(client, user.client_id, 'users');
        if (!onboardingGate.ok) {
            return c.json({
                error: onboardingGate.message,
                code: 'ONBOARDING_PREREQUISITE_MISSING',
                missing_steps: onboardingGate.missing_steps,
            }, 409);
        }

        await client.query(`
            INSERT INTO users(id, full_name, email, phone, password_hash, role, client_id)
            VALUES($1, $2, $3, $4, $5, $6, $7)
                    `, [id, full_name, email, phone || null, password_hash, role, user.client_id]);

        return c.json({ message: 'User created', id });
    } finally {
        try { await client.end(); } catch { }
    }
});

// -----------------------------------------------------------------
// Endpoint: PUT /api/upload (R2 ENABLED)
// -----------------------------------------------------------------
app.put('/api/upload', async (c) => {
    try {
        const body = await c.req.parseBody();
        const file = body['file'];

        if (!file || !(file instanceof File)) {
            return c.json({ error: 'No file uploaded' }, 400);
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return c.json({ error: 'Invalid file type. Only JPEG, PNG, WEBP allowed.' }, 400);
        }

        // Generate unique key
        const key = `${crypto.randomUUID()} - ${file.name}`;

        // Upload to R2
        await c.env.R2.put(key, await file.arrayBuffer(), {
            httpMetadata: {
                contentType: file.type,
            },
        });

        return c.json({
            message: 'Upload successful',
            url: `/api/images/${key}`,
            key: key
        });

    } catch (e: any) {
        console.error('Upload Error:', e);
        return c.json({ error: e.message }, 500);
    }
});

// -----------------------------------------------------------------
// Endpoint: GET /api/images/:key (R2 PROXY)
// -----------------------------------------------------------------
app.get('/api/images/:key', async (c) => {
    const key = c.req.param('key');

    try {
        const object = await c.env.R2.get(key);

        if (!object) {
            return c.json({ error: 'Image not found' }, 404);
        }

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);

        return new Response(object.body, {
            headers,
        });

    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

export default {
    fetch: app.fetch,
    async scheduled(event: any, env: Bindings, ctx: ExecutionContext) {
        const client = getDb(env);
        console.log('Cron Triggered: Checking preventive maintenance...');

        try {
            // Find due schedules
            const dueSchedules = await client.query(`
                SELECT * FROM preventive_schedules 
                WHERE is_active = TRUE AND next_due_at <= NOW()
                `);

            for (const schedule of dueSchedules.rows) {
                console.log(`Processing schedule: ${schedule.id} - ${schedule.task_name}`);

                // Create Ticket
                const ticketId = crypto.randomUUID();
                const ticketNumber = `PM - ${Date.now().toString().slice(-6)}`;

                await client.query(`
                    INSERT INTO maintenance_tickets(id, ticket_number, forklift_id, schedule_id, status, priority, description, created_by, created_at)
                    VALUES($1, $2, $3, $4, 'OPEN', 'MEDIA', $5, 'SYSTEM', NOW())
                    `, [ticketId, ticketNumber, schedule.forklift_id, schedule.id, `Mantenimiento Preventivo: ${schedule.task_name}`]);

                // Update Schedule (Next Due Date)
                let nextDate = new Date();
                if (schedule.frequency_type === 'DAYS') {
                    nextDate.setDate(nextDate.getDate() + schedule.frequency_value);
                }

                await client.query(`
                    UPDATE preventive_schedules 
                    SET last_executed_at = NOW(), next_due_at = $1 
                    WHERE id = $2
                `, [nextDate.toISOString(), schedule.id]);
            }

            console.log(`Processed ${dueSchedules.rows.length} preventive schedules.`);

        } catch (e) {
            console.error('Error in Cron Handler:', e);
        }
    }
};
