import { Hono } from 'hono';
import { Bindings } from '../db';
import { UserPayload } from '../middleware';
import { OnboardingController } from '../controllers/OnboardingController';

const onboardingRoute = new Hono<{
    Bindings: Bindings,
    Variables: { user: UserPayload }
}>();

onboardingRoute.get('/status', OnboardingController.status);

export default onboardingRoute;
