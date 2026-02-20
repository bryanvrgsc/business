import { Hono } from 'hono';
import { Bindings } from '../db';
import { UserPayload } from '../middleware';
import { InventoryController } from '../controllers/InventoryController';

const inventory = new Hono<{
    Bindings: Bindings,
    Variables: { user: UserPayload }
}>();

inventory.get('/', InventoryController.list);
inventory.post('/', InventoryController.create);
inventory.patch('/:id', InventoryController.update);
inventory.post('/use', InventoryController.usePart);

export default inventory;
