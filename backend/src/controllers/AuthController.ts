import { Context } from 'hono';
import { getDb, Bindings } from '../db';
import { UserRepository } from '../repositories/UserRepository';
import { SessionRepository } from '../repositories/SessionRepository';
import { AuthService } from '../services/AuthService';

export class AuthController {
    static async login(c: Context<{ Bindings: Bindings }>) {
        const { email, password } = await c.req.json();
        if (!email || !password) return c.json({ error: 'Missing email or password' }, 400);

        const client = getDb(c.env);
        try {
            await client.connect();
            const userRepo = new UserRepository(client);
            const sessionRepo = new SessionRepository(client);
            const authService = new AuthService(userRepo, sessionRepo);

            // get ip and user agent
            const ipAddress = c.req.header('cf-connecting-ip') || '127.0.0.1';
            const userAgent = c.req.header('user-agent') || 'Unknown';

            const result = await authService.login(email, password, ipAddress, userAgent);
            return c.json(result);
        } catch (e: any) {
            console.error(e);
            if (e.message === 'User not found' || e.message === 'Invalid password') {
                return c.json({ error: e.message }, 401);
            }
            // Fallback for dev without DB connection
            if (email === 'admin@example.com' && password === 'admin') {
                const { sign } = await import('hono/jwt');
                const JWT_SECRET = 'your-secret-key-change-this';
                const payload = {
                    sub: 'mock-admin-id',
                    role: 'ADMIN',
                    client_id: 'mock-client-id',
                    session_id: crypto.randomUUID(),
                    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
                }
                const token = await sign(payload, JWT_SECRET)
                return c.json({ token, user: { email, role: 'ADMIN' } })
            }
            return c.json({ error: 'Internal Server Error: ' + e.message }, 500);
        } finally {
            try { await client.end(); } catch { }
        }
    }
}
