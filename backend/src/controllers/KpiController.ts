import { Context } from 'hono';
import { getDb, Bindings } from '../db';
import { KpiRepository } from '../repositories/KpiRepository';
import { KpiService } from '../services/KpiService';
import { UserPayload } from '../middleware';

export class KpiController {
    static async get(c: Context<{ Bindings: Bindings, Variables: { user: UserPayload } }>) {
        const user = c.get('user');
        const client = getDb(c.env);

        try {
            await client.connect();
            const repo = new KpiRepository(client);
            const service = new KpiService(repo);

            const kpis = await service.getDashboardKpis(user.client_id);
            return c.json(kpis);
        } catch (e: any) {
            return c.json({ error: e.message }, 500);
        } finally {
            try { await client.end(); } catch { }
        }
    }
}
