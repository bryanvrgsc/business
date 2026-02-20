import { Hono } from 'hono';
import { Bindings } from '../db';
import { UserPayload } from '../middleware';
import { ForkliftController } from '../controllers/ForkliftController';

const forklifts = new Hono<{
    Bindings: Bindings,
    Variables: { user: UserPayload }
}>();

forklifts.get('/:id', ForkliftController.get);
forklifts.patch('/:id', ForkliftController.update);

export default forklifts;
