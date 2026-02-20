import { Context } from 'hono';
import { getDb, Bindings } from '../db';
import { TicketRepository } from '../repositories/TicketRepository';
import { TicketService } from '../services/TicketService';
import { UserPayload } from '../middleware';

export class TicketController {
    static async list(c: Context<{ Bindings: Bindings, Variables: { user: UserPayload } }>) {
        const user = c.get('user');
        const client = getDb(c.env);
        try {
            await client.connect();
            const repo = new TicketRepository(client);
            const service = new TicketService(repo, client);
            const tickets = await service.getTicketsByClient(user.client_id);
            return c.json(tickets);
        } catch (e: any) {
            return c.json({ error: e.message }, 500);
        } finally {
            try { await client.end(); } catch { }
        }
    }

    static async create(c: Context<{ Bindings: Bindings, Variables: { user: UserPayload } }>) {
        const user = c.get('user');
        const client = getDb(c.env);
        const { forklift_id, priority, description } = await c.req.json();

        if (!forklift_id) {
            return c.json({ error: 'forklift_id is required' }, 400);
        }

        try {
            await client.connect();
            const repo = new TicketRepository(client);
            const service = new TicketService(repo, client);

            const result = await service.createTicket(user.client_id, user.sub, forklift_id, priority, description);
            return c.json({ message: 'Ticket created', ...result });
        } catch (e: any) {
            if (e.message.includes('invalid') || e.message.includes('not found')) {
                return c.json({ error: e.message }, 400);
            }
            return c.json({ error: e.message }, 500);
        } finally {
            try { await client.end(); } catch { }
        }
    }

    static async updateStatus(c: Context<{ Bindings: Bindings, Variables: { user: UserPayload } }>) {
        const user = c.get('user');
        const id = c.req.param('id');
        const { status, assigned_to } = await c.req.json();
        const client = getDb(c.env);

        try {
            await client.connect();
            const repo = new TicketRepository(client);
            const service = new TicketService(repo, client);

            await service.updateTicket(id, user.client_id, status, assigned_to);
            return c.json({ message: 'Ticket updated' });
        } catch (e: any) {
            if (e.message === 'Ticket not found') return c.json({ error: e.message }, 404);
            if (e.message.includes('invalid')) return c.json({ error: e.message }, 400);
            return c.json({ error: e.message }, 500);
        } finally {
            try { await client.end(); } catch { }
        }
    }

    static async resolve(c: Context<{ Bindings: Bindings, Variables: { user: UserPayload } }>) {
        const user = c.get('user');
        const id = c.req.param('id');
        const { resolution_notes } = await c.req.json();
        const client = getDb(c.env);

        if (!resolution_notes) {
            return c.json({ error: 'resolution_notes is required to close a ticket' }, 400);
        }

        try {
            await client.connect();
            const repo = new TicketRepository(client);
            const service = new TicketService(repo, client);

            await service.resolveTicket(id, user.client_id, resolution_notes);
            return c.json({ message: 'Ticket resolved' });
        } catch (e: any) {
            if (e.message === 'Ticket not found') return c.json({ error: e.message }, 404);
            return c.json({ error: e.message }, 500);
        } finally {
            try { await client.end(); } catch { }
        }
    }
}
