import { Context } from 'hono';
import { getDb, Bindings } from '../db';
import { SyncRepository } from '../repositories/SyncRepository';
import { ForkliftRepository } from '../repositories/ForkliftRepository';
import { SyncService } from '../services/SyncService';
import { UserPayload } from '../middleware';

export class SyncController {
    static async sync(c: Context<{ Bindings: Bindings, Variables: { user: UserPayload } }>) {
        const user = c.get('user');
        const report = await c.req.json() as any;

        if (!report.forkliftId) {
            return c.json({ error: 'forkliftId is required' }, 400);
        }

        console.log(`Sync request from user ${user.sub} (Client: ${user.client_id})`);

        const client = getDb(c.env);

        try {
            await client.connect();
            const syncRepo = new SyncRepository(client);
            const forkliftRepo = new ForkliftRepository(client);
            const service = new SyncService(syncRepo, forkliftRepo);

            const result = await service.processSync(user, report);
            return c.json({
                message: 'Report synced successfully',
                synced_at: result.synced_at,
                id: result.reportId
            });
        } catch (e: any) {
            console.error('Sync Error:', e);
            if (e.message === 'Forklift not found') return c.json({ error: e.message }, 404);
            return c.json({ error: e.message }, 500);
        } finally {
            try { await client.end(); } catch { }
        }
    }
}
