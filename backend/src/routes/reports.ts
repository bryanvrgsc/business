import { Hono } from 'hono';
import { getDb, Bindings } from '../db';
import { UserPayload } from '../middleware';

const reports = new Hono<{
    Bindings: Bindings,
    Variables: { user: UserPayload }
}>();

// POST /api/reports (Offline-first support)
reports.post('/', async (c) => {
    const user = c.get('user');
    const client = getDb(c.env);
    const body = await c.req.json();
    const { forklift_id, template_id, captured_at, gps_latitude, gps_longitude, answers } = body;

    if (!forklift_id || !captured_at || !answers || !Array.isArray(answers)) {
        return c.json({ error: 'Missing required fields' }, 400);
    }

    const reportId = crypto.randomUUID();
    const has_critical_failure = answers.some((a: any) => a.is_flagged === true);

    try {
        await client.connect();
        await client.query('BEGIN'); // Start transaction

        // Ensure forklift belongs to user's client
        const forkliftRes = await client.query(`
            SELECT id FROM forklifts WHERE id = $1 AND client_id = $2 LIMIT 1
        `, [forklift_id, user.client_id]);

        if (forkliftRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return c.json({ error: 'Forklift not found or access denied' }, 404);
        }

        // Insert report
        await client.query(`
            INSERT INTO reports (id, forklift_id, user_id, template_id, captured_at, synced_at, gps_latitude, gps_longitude, has_critical_failure)
            VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8)
        `, [reportId, forklift_id, user.sub, template_id || null, captured_at, gps_latitude || null, gps_longitude || null, has_critical_failure]);

        // Insert answers
        for (const ans of answers) {
            const answerId = crypto.randomUUID();
            await client.query(`
                INSERT INTO report_answers (id, report_id, question_id, answer_value, is_flagged)
                VALUES ($1, $2, $3, $4, $5)
            `, [answerId, reportId, ans.question_id, ans.answer_value || null, ans.is_flagged || false]);
        }

        // Check for critical failure to generate maintenance ticket
        if (has_critical_failure) {
            // Update forklift status
            await client.query(`
                UPDATE forklifts SET operational_status = 'OUT_OF_SERVICE', last_sync_at = NOW()
                WHERE id = $1
            `, [forklift_id]);

            // Create maintenance ticket automatically
            const ticketId = crypto.randomUUID();
            const ticketNumber = Date.now(); // BIGINT friendly instead of string if ticket_number is BIGINT type without text prefix

            await client.query(`
                INSERT INTO maintenance_tickets (id, ticket_number, report_id, forklift_id, status, priority, created_at)
                VALUES ($1, $2, $3, $4, 'ABIERTO', 'ALTA', NOW())
            `, [ticketId, ticketNumber, reportId, forklift_id]);
        }

        await client.query('COMMIT');
        return c.json({ message: 'Report submitted successfully', report_id: reportId, has_critical_failure });
    } catch (e: any) {
        await client.query('ROLLBACK');
        return c.json({ error: e.message }, 500);
    } finally {
        try { await client.end(); } catch { }
    }
});

// GET /api/reports
reports.get('/', async (c) => {
    const user = c.get('user');
    const client = getDb(c.env);

    // Filter by forklift_id
    const forkliftId = c.req.query('forklift_id');

    try {
        await client.connect();
        let query = `
            SELECT r.*, f.internal_id, u.full_name as operator_name 
            FROM reports r
            JOIN forklifts f ON r.forklift_id = f.id
            JOIN users u ON r.user_id = u.id
            WHERE f.client_id = $1
        `;
        const params: any[] = [user.client_id];

        if (forkliftId) {
            query += ` AND r.forklift_id = $2`;
            params.push(forkliftId);
        }

        query += ` ORDER BY r.synced_at DESC LIMIT 50`;

        const res = await client.query(query, params);
        return c.json(res.rows);
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    } finally {
        try { await client.end(); } catch { }
    }
});

export default reports;
