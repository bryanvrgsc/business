import { Hono } from 'hono';
import { Bindings } from './db';
import { AuthController } from './controllers/AuthController';

const auth = new Hono<{ Bindings: Bindings }>();

auth.post('/login', AuthController.login);

export default auth;

