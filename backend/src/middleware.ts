import { createMiddleware } from 'hono/factory'
import { verify } from 'hono/jwt'

const JWT_SECRET = 'your-secret-key-change-this'

export type UserPayload = {
    sub: string
    role: string
    client_id: string
    exp: number
}

export const authMiddleware = createMiddleware<{
    Variables: {
        user: UserPayload
    }
}>(async (c, next) => {
    const authHeader = c.req.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized' }, 401)
    }

    const token = authHeader.split(' ')[1]

    try {
        const payload = await verify(token, JWT_SECRET, 'HS256') as UserPayload
        c.set('user', payload)
        await next()
    } catch (e) {
        console.error('JWT Verification failed:', e)
        return c.json({ error: 'Invalid token' }, 401)
    }
})
