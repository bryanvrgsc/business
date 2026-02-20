import { Hono } from 'hono';
import { Bindings } from '../db';
import { UserPayload } from '../middleware';
import { ScheduleController } from '../controllers/ScheduleController';

const schedules = new Hono<{
    Bindings: Bindings,
    Variables: { user: UserPayload }
}>();

schedules.get('/', ScheduleController.list);
schedules.post('/', ScheduleController.create);
schedules.patch('/:id', ScheduleController.update);

export default schedules;
