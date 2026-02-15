import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Bindings, getDb } from './db';
import auth from './auth';
import { authMiddleware, UserPayload } from './middleware';

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

// -----------------------------------------------------------------
// Endpoint: GET /api/forklifts/:id
// -----------------------------------------------------------------
app.get('/api/forklifts/:id', async (c) => {
    const id = c.req.param('id');
    const client = getDb(c.env);

    try {
        await client.connect();
        // Try to find by ID or Internal ID (QR Code)
        const res = await client.query(
            `SELECT f.*, cl.name as location_name 
             FROM forklifts f
             LEFT JOIN client_locations cl ON f.location_id = cl.id
             WHERE f.id = $1 OR f.internal_id = $1 OR f.qr_code_payload = $1`,
            [id]
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
    const report = await c.req.json();
    // @ts-ignore
    const { forkliftId, templateId, answers, hasCriticalFailure, capturedAt, gpsLatitude, gpsLongitude } = report;

    console.log(`Sync request from user ${user.sub} (Client: ${user.client_id})`);

    const client = getDb(c.env);

    try {
        await client.connect();

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
            hasCriticalFailure || false,
            gpsLatitude || 0.0,
            gpsLongitude || 0.0
        ]);

        // 2. Insert Answers
        if (answers) {
            for (const [questionId, value] of Object.entries(answers)) {
                await client.query(`
                    INSERT INTO report_answers (id, report_id, question_id, answer_value)
                    VALUES ($1, $2, $3, $4)
                `, [crypto.randomUUID(), reportId, questionId, String(value)]);
            }
        }

        // 3. Update Forklift Status if critical
        if (hasCriticalFailure) {
            await client.query(`
                UPDATE forklifts 
                SET operational_status = 'OUT_OF_SERVICE' 
                WHERE id = $1
            `, [forkliftId]);

            // 4. Auto-create Maintenance Ticket
            const ticketId = crypto.randomUUID();
            const ticketNumber = `TKT-${Date.now().toString().slice(-6)}`; // Simple TKT-123456 generation

            await client.query(`
                INSERT INTO maintenance_tickets (id, ticket_number, forklift_id, status, priority, description, created_by, created_at)
                VALUES ($1, $2, $3, 'OPEN', 'HIGH', 'Falla crítica detectada en inspección', $4, $5)
            `, [ticketId, ticketNumber, forkliftId, user.sub, new Date().toISOString()]);
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

// -----------------------------------------------------------------
// Endpoint: GET /api/tickets
// -----------------------------------------------------------------
app.get('/api/tickets', async (c) => {
    const client = getDb(c.env);
    try {
        await client.connect();
        const res = await client.query(`
            SELECT t.*, f.internal_id as forklift_internal_id, f.model as forklift_model 
            FROM maintenance_tickets t
            JOIN forklifts f ON t.forklift_id = f.id
            ORDER BY t.created_at DESC
        `);
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

    const id = crypto.randomUUID();
    const ticketNumber = `TKT-${Date.now().toString().slice(-6)}`;

    try {
        await client.connect();
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
    const id = c.req.param('id');
    const { status, assigned_to } = await c.req.json();
    const client = getDb(c.env);

    try {
        await client.connect();

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
                SET status = $1, updated_at = NOW()
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

/**
 * ==========================================
 * PREVENTIVE MAINTENANCE API
 * ==========================================
 */

// GET /api/schedules
app.get('/api/schedules', async (c) => {
    const user = c.get('user');
    const client = getDb(c.env);

    const result = await client.query(`
        SELECT ps.*, f.internal_id as forklift_name
        FROM preventive_schedules ps
        LEFT JOIN forklifts f ON ps.forklift_id = f.id
        WHERE ps.client_id = $1 AND ps.is_active = TRUE
        ORDER BY ps.next_due_at ASC
    `, [user.client_id]);

    return c.json(result.rows);
});

// POST /api/schedules
app.post('/api/schedules', async (c) => {
    const user = c.get('user');
    const client = getDb(c.env);
    const body = await c.req.json();

    const { forklift_id, task_name, frequency_type, frequency_value, target_model } = body;

    const id = crypto.randomUUID();
    let next_due_at = new Date();
    let next_due_hours = 0;

    try {
        await client.connect();

        if (frequency_type === 'DAYS') {
            next_due_at.setDate(next_due_at.getDate() + parseInt(frequency_value));
        } else if (frequency_type === 'HOURS' && forklift_id) {
            // Fetch current hours
            const fRes = await client.query('SELECT current_hours FROM forklifts WHERE id = $1', [forklift_id]);
            const currentHours = parseFloat(fRes.rows[0]?.current_hours || 0);
            next_due_hours = currentHours + parseFloat(frequency_value);
            // Set next_due_at to far future or null? Schema allows null? Checking schema...
            // Let's set it to today + 1 year just in case query requires it, or handle in query
            next_due_at.setFullYear(next_due_at.getFullYear() + 1);
        }

        await client.query(`
            INSERT INTO preventive_schedules (id, client_id, forklift_id, target_model, task_name, frequency_type, frequency_value, next_due_at, next_due_hours)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [id, user.client_id, forklift_id, target_model, task_name, frequency_type, frequency_value, next_due_at.toISOString(), next_due_hours]);

        return c.json({ message: 'Schedule created', id });
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
                COALESCE(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600), 0)::float as mttr_hours
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
            fleet: fleetStatus.rows
        });

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
            INSERT INTO parts_inventory (id, part_number, name, current_stock, min_stock, unit_cost, supplier, client_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [id, part_number, name, current_stock || 0, min_stock || 1, unit_cost || 0, supplier, user.client_id]);
        return c.json({ message: 'Part added', id });
    } finally {
        try { await client.end(); } catch { }
    }
});

// PATCH /api/inventory/:id (Update stock)
app.patch('/api/inventory/:id', async (c) => {
    const id = c.req.param('id');
    const user = c.get('user');
    const client = getDb(c.env);
    const body = await c.req.json();
    const { current_stock, unit_cost } = body;

    try {
        await client.connect();
        await client.query(`
            UPDATE parts_inventory 
            SET current_stock = COALESCE($1, current_stock), 
                unit_cost = COALESCE($2, unit_cost),
                updated_at = NOW()
            WHERE id = $3 AND client_id = $4
        `, [current_stock, unit_cost, id, user.client_id]);
        return c.json({ message: 'Part updated' });
    } finally {
        try { await client.end(); } catch { }
    }
});

// GET /api/tickets/:id/costs
app.get('/api/tickets/:id/costs', async (c) => {
    const ticketId = c.req.param('id');
    const client = getDb(c.env);
    try {
        await client.connect();
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
    const ticketId = c.req.param('id');
    const client = getDb(c.env);
    const body = await c.req.json();
    const { cost_type, description, quantity, unit_cost, is_billable } = body;
    const id = crypto.randomUUID();
    const total_cost = (quantity || 1) * unit_cost;

    try {
        await client.connect();
        await client.query(`
            INSERT INTO ticket_costs (id, ticket_id, cost_type, description, quantity, unit_cost, total_cost, is_billable)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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

    const id = crypto.randomUUID();
    // Simple QR payload: URL or just ID. Let's use internal_id for readability in this MVP
    const qr_code_payload = internal_id;

    try {
        await client.connect();
        await client.query(`
            INSERT INTO forklifts (id, internal_id, qr_code_payload, model, brand, serial_number, year, client_id, location_id, fuel_type, current_hours, image_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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

    const id = crypto.randomUUID();
    // Simple hash for now (in prod: bcrypt)
    // We are trusting the admin input here
    const password_hash = password;

    try {
        await client.connect();
        await client.query(`
            INSERT INTO users (id, full_name, email, phone, password_hash, role, client_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
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
        const key = `${crypto.randomUUID()}-${file.name}`;

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
                const ticketNumber = `PM-${Date.now().toString().slice(-6)}`;

                await client.query(`
                    INSERT INTO maintenance_tickets (id, ticket_number, forklift_id, schedule_id, status, priority, description, created_by, created_at)
                    VALUES ($1, $2, $3, $4, 'OPEN', 'MEDIA', $5, 'SYSTEM', NOW())
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
