import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { Bindings, getDb } from './db'
import auth from './auth'
import { authMiddleware, UserPayload } from './middleware'

const app = new Hono<{
    Bindings: Bindings,
    Variables: { user: UserPayload }
}>()

app.use('/*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
}))

app.route('/api/auth', auth)

app.get('/', (c) => {
    return c.text('CMMS Backend is running 🚀')
})

app.get('/api/test-db', async (c) => {
    const client = getDb(c.env)
    try {
        await client.connect()
        // Spanner/Postgres version check
        const res = await client.query('SELECT version()')
        await client.end()
        return c.json({
            status: 'ok',
            version: res.rows[0].version,
            connection: 'success'
        })
    } catch (e: any) {
        return c.json({
            status: 'error',
            message: e.message,
            stack: e.stack
        }, 500)
    }
})

// Public Seed Route (Development only)
app.get('/seed', async (c) => {
    const client = getDb(c.env)
    try {
        await client.connect()

        // 1. Create Client
        await client.query(`
            INSERT INTO clients (id, name, contact_email, is_active)
            VALUES ('c1', 'Empresa Demo S.A.', 'contacto@demo.com', TRUE)
            ON CONFLICT (id) DO NOTHING;
        `)

        // 2. Create User (admin / admin) - Password hash is mock 'hashed_admin'
        await client.query(`
            INSERT INTO users (id, full_name, role, client_id, email, password_hash)
            VALUES ('u1', 'Admin Usuario', 'ADMIN', 'c1', 'admin@example.com', 'hashed_admin')
            ON CONFLICT (id) DO NOTHING;
        `)

        // 3. Create Forklifts
        await client.query(`
            INSERT INTO forklifts (id, internal_id, qr_code_payload, model, brand, client_id, operational_status)
            VALUES 
            ('f1', 'M-1551', 'M-1551', '8FGU25', 'Toyota', 'c1', 'OPERATIONAL'),
            ('f2', 'M-2020', 'M-2020', '7000 Series', 'Raymond', 'c1', 'MAINTENANCE'),
            ('f3', 'M-9999', 'M-9999', 'H-50', 'Linde', 'c1', 'OUT_OF_SERVICE')
            ON CONFLICT (id) DO NOTHING;
        `)

        await client.end()
        return c.json({ message: 'Database seeded successfully! 🌱' })
    } catch (e: any) {
        return c.json({ error: e.message, stack: e.stack }, 500)
    }
})

// Protected Routes
app.use('/api/*', authMiddleware)

// -----------------------------------------------------------------
// Endpoint: GET /api/forklifts/:id
// -----------------------------------------------------------------
app.get('/api/forklifts/:id', async (c) => {
    const id = c.req.param('id')
    const client = getDb(c.env)

    try {
        await client.connect()
        // Try to find by ID or Internal ID (QR Code)
        const res = await client.query(
            `SELECT * FROM forklifts WHERE id = $1 OR internal_id = $1 OR qr_code_payload = $1`,
            [id]
        )

        if (res.rows.length === 0) {
            return c.json({ error: 'Forklift not found' }, 404)
        }

        const f = res.rows[0]

        // Map DB snake_case to frontend camelCase if needed, or update frontend types
        // For now, let's return what frontend expects
        return c.json({
            id: f.id,
            internalId: f.internal_id,
            model: f.model,
            brand: f.brand,
            status: f.operational_status, // OPERATIONAL, MAINTENANCE, OUT_OF_SERVICE
            location: 'Planta Principal', // TODO: Join with locations table
            nextMaintenance: '2024-03-01', // TODO: Calculate from schedules
            image: '/forklift-placeholder.png' // TODO: R2 Image
        })
    } catch (e: any) {
        return c.json({ error: e.message }, 500)
    } finally {
        try { await client.end() } catch { }
    }
})

// -----------------------------------------------------------------
// Endpoint: POST /api/sync
// -----------------------------------------------------------------
app.post('/api/sync', async (c) => {
    const user = c.get('user')
    const report = await c.req.json()
    // @ts-ignore
    const { forkliftId, templateId, answers, hasCriticalFailure, capturedAt } = report;

    console.log(`Sync request from user ${user.sub} (Client: ${user.client_id})`)

    const client = getDb(c.env)

    try {
        await client.connect()

        // Generate a new ID for the report
        const reportId = crypto.randomUUID();

        // 1. Insert Report Header
        await client.query(`
            INSERT INTO reports (id, forklift_id, user_id, template_id, captured_at, has_critical_failure, gps_latitude, gps_longitude)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
            reportId,
            forkliftId,
            user.sub,
            templateId,
            capturedAt || new Date().toISOString(),
            hasCriticalFailure || false,
            0.0, 0.0
        ])

        // 2. Insert Answers
        if (answers) {
            for (const [questionId, value] of Object.entries(answers)) {
                await client.query(`
                    INSERT INTO report_answers (id, report_id, question_id, answer_value)
                    VALUES ($1, $2, $3, $4)
                `, [crypto.randomUUID(), reportId, questionId, String(value)])
            }
        }

        // 3. Update Forklift Status if critical
        if (hasCriticalFailure) {
            await client.query(`
                UPDATE forklifts 
                SET operational_status = 'OUT_OF_SERVICE' 
                WHERE id = $1
            `, [forkliftId])
        }

        return c.json({
            message: 'Report synced successfully',
            synced_at: new Date().toISOString(),
            id: reportId
        })

    } catch (e: any) {
        console.error('Sync Error:', e)
        return c.json({ error: e.message }, 500)
    } finally {
        try { await client.end() } catch { }
    }
})

// -----------------------------------------------------------------
// Endpoint: PUT /api/upload
// -----------------------------------------------------------------
app.put('/api/upload', async (c) => {
    // 1. Check Auth (simple check for now, can use middleware if preferred)
    // const user = c.get('user') // if we use authMiddleware on this route
    // But for file uploads sometimes we want to keep it simple or use a presigned URL approach.
    // Let's use the authMiddleware for /api/* so this is protected.

    try {
        const formData = await c.req.parseBody()
        const file = formData['file']

        if (!file || !(file instanceof File)) {
            return c.json({ error: 'No file uploaded' }, 400)
        }

        const fileName = `${crypto.randomUUID()}-${file.name}`

        // 2. Upload to R2
        await c.env.R2.put(fileName, file.stream(), {
            httpMetadata: {
                contentType: file.type,
            },
        })

        // 3. Return Public URL (Assuming public access is enabled or via worker)
        // For private buckets, we would need a GET endpoint to proxy or presign.
        // Let's assume we serve it via GET /api/images/:key for now

        return c.json({
            message: 'Upload successful',
            url: `/api/images/${fileName}`,
            key: fileName
        })

    } catch (e: any) {
        console.error('Upload error:', e)
        return c.json({ error: e.message }, 500)
    }
})

// -----------------------------------------------------------------
// Endpoint: GET /api/images/:key
// -----------------------------------------------------------------
app.get('/api/images/:key', async (c) => {
    const key = c.req.param('key')

    const object = await c.env.R2.get(key)

    if (!object) {
        return c.json({ error: 'Image not found' }, 404)
    }

    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('etag', object.httpEtag)

    return new Response(object.body, {
        headers,
    })
})

export default app
