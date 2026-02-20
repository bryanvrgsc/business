import { Hono } from 'hono';
import { Bindings } from '../db';
import { UserPayload } from '../middleware';
import { KpiController } from '../controllers/KpiController';

const kpis = new Hono<{
    Bindings: Bindings,
    Variables: { user: UserPayload }
}>();

kpis.get('/', KpiController.get);

export default kpis;
