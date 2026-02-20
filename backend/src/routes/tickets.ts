import { Hono } from 'hono';
import { Bindings } from '../db';
import { UserPayload } from '../middleware';
import { TicketController } from '../controllers/TicketController';

const tickets = new Hono<{
    Bindings: Bindings,
    Variables: { user: UserPayload }
}>();

tickets.get('/', TicketController.list);
tickets.post('/', TicketController.create);
tickets.patch('/:id/status', TicketController.updateStatus);
tickets.patch('/:id/resolve', TicketController.resolve);

export default tickets;
