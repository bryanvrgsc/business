import { createMiddleware } from 'hono/factory';
import { verify } from 'hono/jwt';
import { getDb, Bindings } from './db';
import { SessionRepository } from './repositories/SessionRepository';

const JWT_SECRET = 'your-secret-key-change-this';

export type UserPayload = {
    sub: string;
    role: string;
    client_id: string;
    session_id?: string;
    exp: number;
};

export const authMiddleware = createMiddleware<{
    Bindings: Bindings;
    Variables: {
        user: UserPayload
    }
}>(async (c, next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.split(' ')[1];

    try {
        const payload = await verify(token, JWT_SECRET, 'HS256') as UserPayload;

        // Verify session in database (except for mock users generated without DB)
        if (payload.session_id) {
            const client = getDb(c.env);
            try {
                await client.connect();
                const sessionRepo = new SessionRepository(client);
                const session = await sessionRepo.findActiveSession(token);

                if (!session) {
                    return c.json({ error: 'Session expired or logged out' }, 401);
                }
            } finally {
                try { await client.end(); } catch { }
            }
        }

        c.set('user', payload);
        await next();
    } catch (e) {
        console.error('JWT Verification failed:', e);
        return c.json({ error: 'Invalid token' }, 401);
    }
});

export const requireRole = (allowedRoles: string[]) => {
    return createMiddleware<{ Variables: { user: UserPayload } }>(async (c, next) => {
        const user = c.get('user');
        if (!user || !allowedRoles.includes(user.role)) {
            return c.json({ error: 'Forbidden: Insufficient permissions' }, 403);
        }
        await next();
    });
};
