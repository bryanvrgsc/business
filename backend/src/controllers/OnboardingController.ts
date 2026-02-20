import { Context } from 'hono';
import { getDb, Bindings } from '../db';
import { getOnboardingStatus } from '../onboarding';
import { UserPayload } from '../middleware';

export class OnboardingController {
    static async status(c: Context<{ Bindings: Bindings, Variables: { user: UserPayload } }>) {
        const user = c.get('user');
        const requestedClientId = c.req.query('client_id');
        const targetClientId = user.role === 'ADMIN' && requestedClientId ? requestedClientId : user.client_id;

        if (!targetClientId) {
            return c.json({ error: 'client_id is required' }, 400);
        }

        const client = getDb(c.env);
        try {
            await client.connect();
            const status = await getOnboardingStatus(client, targetClientId);
            return c.json(status);
        } catch (e: any) {
            return c.json({ error: e.message }, 500);
        } finally {
            try { await client.end(); } catch { }
        }
    }
}
