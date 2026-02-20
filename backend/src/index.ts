import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Bindings, getDb } from './db';
import auth from './auth';
import { authMiddleware, UserPayload } from './middleware';
import { scheduledTicketsJob } from './cron/scheduledTickets';

// Routes
import clients from './routes/clients';
import locations from './routes/locations';
import contracts from './routes/contracts';
import costs from './routes/costs';
import checklists from './routes/checklists';
import reports from './routes/reports';
import slas from './routes/slas';
import tickets from './routes/tickets';
import notifications from './routes/notifications';
import forklifts from './routes/forklifts';
import schedules from './routes/schedules';
import inventory from './routes/inventory';
import kpis from './routes/kpis';
import sync from './routes/sync';
import onboardingRoute from './routes/onboarding';

const app = new Hono<{
    Bindings: Bindings,
    Variables: { user: UserPayload }
}>();

app.use('/*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'cf-connecting-ip', 'user-agent'],
}));

// Public Routes
app.route('/api/auth', auth);

app.get('/', (c) => c.text('CMMS Backend is running 🚀'));

app.get('/api/test-db', async (c) => {
    const client = getDb(c.env);
    try {
        await client.connect();
        const res = await client.query('SELECT version()');
        await client.end();
        return c.json({ status: 'ok', version: res.rows[0].version, connection: 'success' });
    } catch (e: any) {
        return c.json({ status: 'error', message: e.message, stack: e.stack }, 500);
    }
});

// Protected Routes
app.use('/api/*', authMiddleware);

app.route('/api/clients', clients);
app.route('/api/client-locations', locations);
app.route('/api/contracts', contracts);
app.route('/api/costs', costs);
app.route('/api/checklists', checklists);
app.route('/api/reports', reports);
app.route('/api/slas', slas);
app.route('/api/notifications', notifications);
app.route('/api/inventory', inventory);

// Recently Refactored Routes
app.route('/api/onboarding', onboardingRoute);
app.route('/api/forklifts', forklifts);
app.route('/api/tickets', tickets);
app.route('/api/schedules', schedules);
app.route('/api/kpis', kpis);
app.route('/api/sync', sync);

export default {
    fetch: app.fetch,
    scheduled: scheduledTicketsJob
};
