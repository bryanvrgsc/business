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
            `SELECT * FROM forklifts WHERE id = $1 OR internal_id = $1 OR qr_code_payload = $1`,
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
            location: 'Planta Principal', // TODO: Join with locations table
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
    const { forkliftId, templateId, answers, hasCriticalFailure, capturedAt } = report;

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
            0.0, 0.0
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

// -----------------------------------------------------------------
// Endpoint: PATCH /api/tickets/:id/status
// -----------------------------------------------------------------
app.patch('/api/tickets/:id/status', async (c) => {
    const id = c.req.param('id');
    const { status } = await c.req.json(); // OPEN, IN_PROGRESS, RESOLVED, CLOSED
    const client = getDb(c.env);

    try {
        await client.connect();
        await client.query(`
            UPDATE maintenance_tickets 
            SET status = $1, updated_at = NOW()
            WHERE id = $2
        `, [status, id]);

        return c.json({ message: 'Ticket status updated' });
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
    // Calculate initial next_due_at based on frequency
    let next_due_at = new Date();
    if (frequency_type === 'DAYS') {
        next_due_at.setDate(next_due_at.getDate() + parseInt(frequency_value));
    }
    // Note: HOURS logic would require syncing current hours from forklifts

    await client.query(`
        INSERT INTO preventive_schedules (id, client_id, forklift_id, target_model, task_name, frequency_type, frequency_value, next_due_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [id, user.client_id, forklift_id, target_model, task_name, frequency_type, frequency_value, next_due_at.toISOString()]);

    return c.json({ message: 'Schedule created', id });
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
