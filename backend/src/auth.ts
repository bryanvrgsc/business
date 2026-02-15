import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { getDb, Bindings } from './db'

const auth = new Hono<{ Bindings: Bindings }>()

const JWT_SECRET = 'your-secret-key-change-this' // In production use c.env.JWT_SECRET

auth.post('/login', async (c) => {
    const { email, password } = await c.req.json()

    if (!email || !password) {
        return c.json({ error: 'Missing email or password' }, 400)
    }

    const client = getDb(c.env)

    try {
        await client.connect()

        // In a real app we would check password hash with bcrypt here
        // For now we will support a test user or Basic DB check
        const res = await client.query('SELECT * FROM users WHERE email = $1', [email])

        if (res.rows.length === 0) {
            return c.json({ error: 'User not found' }, 401)
        }

        const user = res.rows[0];

        // Simple password check for prototype (in production use bcrypt)
        if (user.password_hash !== 'hashed_admin') { // We seeded 'hashed_admin' for admin@example.com
            // For real app: await bcrypt.compare(password, user.password_hash)
            // But since we are sending 'admin' as password from frontend, let's just allow it if matches our seed logic 
            // actually, let's just check if password === 'admin' for now since we don't have bcrypt lib installed in worker yet
            if (password !== 'admin') {
                return c.json({ error: 'Invalid password' }, 401)
            }
        }

        // Update last_login_at
        await client.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id])

        const payload = {
            sub: user.id,
            role: user.role,
            client_id: user.client_id,
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
        }

        const token = await sign(payload, JWT_SECRET)

        return c.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                client_id: user.client_id
            }
        })

    } catch (e: any) {
        console.error(e)
        // Fallback for dev without DB connection
        if (email === 'admin@example.com' && password === 'admin') {
            const payload = {
                sub: 'mock-admin-id',
                role: 'ADMIN',
                client_id: 'mock-client-id',
                exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
            }
            const token = await sign(payload, JWT_SECRET)
            return c.json({ token, user: { email, role: 'ADMIN' } })
        }
        return c.json({ error: 'Internal Server Error: ' + e.message }, 500)
    } finally {
        // Note: In Cloudflare Workers with Hyperdrive, we might not need to explicitly close 
        // if we want to reuse connections, but pg client usually needs it.
        // Hyperdrive handles pooling.
        // safely close if connected
        try { await client.end() } catch { }
    }
})

export default auth
