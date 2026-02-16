import { Hono } from 'hono';
import { getDb, Bindings } from '../db';
import { UserPayload } from '../middleware';
import { ensureOnboardingPrerequisites } from '../onboarding';

const checklists = new Hono<{
    Bindings: Bindings,
    Variables: { user: UserPayload }
}>();

// GET /api/checklist-templates
checklists.get('/templates', async (c) => {
    const user = c.get('user');
    const client = getDb(c.env);

    try {
        await client.connect();
        // Fetch global templates (client_id NULL) AND client specific templates
        const res = await client.query(`
            SELECT * FROM checklist_templates 
            WHERE (client_id = $1 OR client_id IS NULL) AND is_active = TRUE
            ORDER BY version DESC
        `, [user.client_id]);
        return c.json(res.rows);
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    } finally {
        try { await client.end(); } catch { }
    }
});

// POST /api/checklist-templates
checklists.post('/templates', async (c) => {
    const user = c.get('user');
    // Only Admin can create global templates, Clients can create their own? 
    // For now, let's say ADMIN creates everything or Client admin.

    const body = await c.req.json();
    const { name, version, client_id } = body;

    // Default to user's client to avoid creating detached templates by mistake
    const targetClientId = user.role === 'ADMIN'
        ? (client_id || user.client_id)
        : user.client_id;

    if (!targetClientId) {
        return c.json({ error: 'client_id is required for checklist templates' }, 400);
    }

    if (user.role !== 'ADMIN' && targetClientId !== user.client_id) {
        return c.json({ error: 'Unauthorized' }, 403);
    }

    if (!name) {
        return c.json({ error: 'Template name is required' }, 400);
    }

    const client = getDb(c.env);
    const id = crypto.randomUUID();

    try {
        await client.connect();

        const onboardingGate = await ensureOnboardingPrerequisites(client, targetClientId, 'checklist_configuration');
        if (!onboardingGate.ok) {
            return c.json({
                error: onboardingGate.message,
                code: 'ONBOARDING_PREREQUISITE_MISSING',
                missing_steps: onboardingGate.missing_steps,
            }, 409);
        }

        await client.query(`
            INSERT INTO checklist_templates (id, name, version, client_id)
            VALUES ($1, $2, $3, $4)
        `, [id, name, version || 1, targetClientId]);

        return c.json({ message: 'Template created', id });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    } finally {
        try { await client.end(); } catch { }
    }
});

// GET /api/checklist-templates/:id/questions
checklists.get('/templates/:id/questions', async (c) => {
    const templateId = c.req.param('id');
    const client = getDb(c.env);

    try {
        await client.connect();
        const res = await client.query(`
            SELECT * FROM checklist_questions 
            WHERE template_id = $1 
            ORDER BY order_index ASC
        `, [templateId]);
        return c.json(res.rows);
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    } finally {
        try { await client.end(); } catch { }
    }
});

// POST /api/checklist-questions
checklists.post('/questions', async (c) => {
    const user = c.get('user');
    const body = await c.req.json();
    const { template_id, question_text, question_type, severity_level, order_index } = body;
    if (!template_id || !question_text || !question_type) {
        return c.json({ error: 'template_id, question_text and question_type are required' }, 400);
    }

    const client = getDb(c.env);
    const id = crypto.randomUUID();

    try {
        await client.connect();

        const templateRes = await client.query(`
            SELECT id, client_id
            FROM checklist_templates
            WHERE id = $1
        `, [template_id]);

        if (templateRes.rows.length === 0) {
            return c.json({ error: 'Template not found' }, 404);
        }

        const template = templateRes.rows[0];
        if (template.client_id && user.role !== 'ADMIN' && template.client_id !== user.client_id) {
            return c.json({ error: 'Unauthorized' }, 403);
        }

        await client.query(`
            INSERT INTO checklist_questions (id, template_id, question_text, question_type, severity_level, order_index)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [id, template_id, question_text, question_type, severity_level || 'INFO', order_index || 0]);

        return c.json({ message: 'Question added', id });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    } finally {
        try { await client.end(); } catch { }
    }
});

export default checklists;
