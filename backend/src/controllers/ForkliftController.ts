import { Context } from 'hono';
import { getDb, Bindings } from '../db';
import { ForkliftRepository } from '../repositories/ForkliftRepository';
import { ForkliftService } from '../services/ForkliftService';
import { UserPayload } from '../middleware';

export class ForkliftController {
    static async get(c: Context<{ Bindings: Bindings, Variables: { user: UserPayload } }>) {
        const user = c.get('user');
        const id = c.req.param('id');
        const client = getDb(c.env);

        try {
            await client.connect();
            const repo = new ForkliftRepository(client);
            const service = new ForkliftService(repo, client);

            const forklift = await service.getForkliftDetails(user.client_id, id);
            return c.json(forklift);
        } catch (e: any) {
            if (e.message === 'Forklift not found') return c.json({ error: e.message }, 404);
            return c.json({ error: e.message }, 500);
        } finally {
            try { await client.end(); } catch { }
        }
    }

    static async update(c: Context<{ Bindings: Bindings, Variables: { user: UserPayload } }>) {
        const user = c.get('user');
        const id = c.req.param('id');
        const body = await c.req.json();
        const client = getDb(c.env);

        try {
            await client.connect();
            const repo = new ForkliftRepository(client);
            const service = new ForkliftService(repo, client);

            const success = await service.updateForklift(id, user.client_id, body);
            if (!success) {
                return c.json({ message: 'No fields to update' });
            }
            return c.json({ message: 'Forklift updated successfully' });
        } catch (e: any) {
            if (e.message === 'Forklift not found') return c.json({ error: e.message }, 404);
            if (e.message.includes('not found')) return c.json({ error: e.message }, 400);
            return c.json({ error: e.message }, 500);
        } finally {
            try { await client.end(); } catch { }
        }
    }
}
