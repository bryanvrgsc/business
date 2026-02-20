import { Hono } from 'hono';
import { getDb, Bindings } from '../db';
import { UserPayload } from '../middleware';

const notifications = new Hono<{
    Bindings: Bindings,
    Variables: { user: UserPayload }
}>();

// GET /api/notifications
notifications.get('/', async (c) => {
    const user = c.get('user');
    const client = getDb(c.env);

    try {
        await client.connect();
        const res = await client.query(`
            SELECT * FROM notifications 
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 50
        `, [user.sub]);
        return c.json(res.rows);
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    } finally {
        try { await client.end(); } catch { }
    }
});

// GET /api/notifications/unread-count
notifications.get('/unread-count', async (c) => {
    const user = c.get('user');
    const client = getDb(c.env);

    try {
        await client.connect();
        const res = await client.query(`
            SELECT COUNT(*) FROM notifications 
            WHERE user_id = $1 AND is_read = FALSE
        `, [user.sub]);
        return c.json({ unread_count: parseInt(res.rows[0].count) });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    } finally {
        try { await client.end(); } catch { }
    }
});

// PATCH /api/notifications/:id/read
notifications.patch('/:id/read', async (c) => {
    const user = c.get('user');
    const id = c.req.param('id');
    const client = getDb(c.env);

    try {
        await client.connect();
        await client.query(`
            UPDATE notifications 
            SET is_read = TRUE 
            WHERE id = $1 AND user_id = $2
        `, [id, user.sub]);
        return c.json({ message: 'Marked as read' });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    } finally {
        try { await client.end(); } catch { }
    }
});

// PATCH /api/notifications/read-all
notifications.patch('/read-all', async (c) => {
    const user = c.get('user');
    const client = getDb(c.env);

    try {
        await client.connect();
        await client.query(`
            UPDATE notifications 
            SET is_read = TRUE 
            WHERE user_id = $1 AND is_read = FALSE
        `, [user.sub]);
        return c.json({ message: 'All marked as read' });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    } finally {
        try { await client.end(); } catch { }
    }
});

export default notifications;
