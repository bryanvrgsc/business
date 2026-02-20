import { Hono } from 'hono';
import { Bindings } from '../db';
import { UserPayload } from '../middleware';
import { SyncController } from '../controllers/SyncController';

const sync = new Hono<{
    Bindings: Bindings,
    Variables: { user: UserPayload }
}>();

sync.post('/', SyncController.sync);

export default sync;
