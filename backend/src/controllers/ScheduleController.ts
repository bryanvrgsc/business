import { Context } from 'hono';
import { getDb, Bindings } from '../db';
import { ScheduleRepository } from '../repositories/ScheduleRepository';
import { ScheduleService } from '../services/ScheduleService';
import { UserPayload } from '../middleware';

export class ScheduleController {
    static async list(c: Context<{ Bindings: Bindings, Variables: { user: UserPayload } }>) {
        const user = c.get('user');
        const client = getDb(c.env);

        try {
            await client.connect();
            const repo = new ScheduleRepository(client);
            const service = new ScheduleService(repo, client);
            const schedules = await service.getSchedulesByClient(user.client_id);
            return c.json(schedules);
        } catch (e: any) {
            return c.json({ error: e.message }, 500);
        } finally {
            try { await client.end(); } catch { }
        }
    }

    static async create(c: Context<{ Bindings: Bindings, Variables: { user: UserPayload } }>) {
        const user = c.get('user');
        const client = getDb(c.env);
        const body = await c.req.json();
        const { task_name, frequency_type, frequency_value } = body;

        if (!task_name || !frequency_type || !frequency_value) {
            return c.json({ error: 'task_name, frequency_type and frequency_value are required' }, 400);
        }

        try {
            await client.connect();
            const repo = new ScheduleRepository(client);
            const service = new ScheduleService(repo, client);

            const id = await service.createSchedule(user.client_id, body);
            return c.json({ message: 'Schedule created', id });
        } catch (e: any) {
            if (e.code === 'ONBOARDING_PREREQUISITE_MISSING') {
                return c.json({ error: e.message, code: e.code, missing_steps: e.missing_steps }, 409);
            }
            if (e.message.includes('not found')) return c.json({ error: e.message }, 400);
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
            const repo = new ScheduleRepository(client);
            const service = new ScheduleService(repo, client);

            const req = await service.updateSchedule(id, user.client_id, body);
            if (!req) return c.json({ message: 'No fields to update' });
            return c.json({ message: 'Schedule updated successfully' });
        } catch (e: any) {
            if (e.message === 'Schedule not found') return c.json({ error: e.message }, 404);
            if (e.message.includes('not found')) return c.json({ error: e.message }, 400);
            return c.json({ error: e.message }, 500);
        } finally {
            try { await client.end(); } catch { }
        }
    }
}
