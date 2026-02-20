import { Context } from 'hono';
import { getDb, Bindings } from '../db';
import { InventoryRepository } from '../repositories/InventoryRepository';
import { InventoryService } from '../services/InventoryService';
import { UserPayload } from '../middleware';

export class InventoryController {
    static async list(c: Context<{ Bindings: Bindings, Variables: { user: UserPayload } }>) {
        const user = c.get('user');
        const client = getDb(c.env);

        try {
            await client.connect();
            const repo = new InventoryRepository(client);
            const service = new InventoryService(repo, client);
            const parts = await service.getPartsByClient(user.client_id);
            return c.json(parts);
        } catch (e: any) {
            return c.json({ error: e.message }, 500);
        } finally {
            try { await client.end(); } catch { }
        }
    }

    static async create(c: Context<{ Bindings: Bindings, Variables: { user: UserPayload } }>) {
        const user = c.get('user');
        const body = await c.req.json();
        const client = getDb(c.env);

        if (!body.part_number || !body.name) {
            return c.json({ error: 'part_number and name are required' }, 400);
        }

        try {
            await client.connect();
            const repo = new InventoryRepository(client);
            const service = new InventoryService(repo, client);

            const id = await service.createPart(user.client_id, body);
            return c.json({ message: 'Part created', id });
        } catch (e: any) {
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
            const repo = new InventoryRepository(client);
            const service = new InventoryService(repo);

            const req = await service.updateInventoryPart(id, user.client_id, body);
            if (!req) return c.json({ message: 'No fields to update' });
            return c.json({ message: 'Part updated successfully' });
        } catch (e: any) {
            if (e.message === 'Part not found') return c.json({ error: e.message }, 404);
            return c.json({ error: e.message }, 500);
        } finally {
            try { await client.end(); } catch { }
        }
    }

    static async usePart(c: Context<{ Bindings: Bindings, Variables: { user: UserPayload } }>) {
        const user = c.get('user');
        const { ticket_id, part_id, quantity } = await c.req.json();
        const client = getDb(c.env);

        if (!ticket_id || !part_id || !quantity) {
            return c.json({ error: 'ticket_id, part_id and quantity are required' }, 400);
        }

        try {
            await client.connect();
            const repo = new InventoryRepository(client);
            // Notice we pass the db client so it can do transactions/cross checks
            const service = new InventoryService(repo, client);

            await service.usePart(ticket_id, part_id, quantity, user.client_id);
            return c.json({ message: 'Part added to ticket' });
        } catch (e: any) {
            if (e.message.includes('not found')) return c.json({ error: e.message }, 404);
            return c.json({ error: e.message }, 500);
        } finally {
            try { await client.end(); } catch { }
        }
    }
}
