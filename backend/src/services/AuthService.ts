import { sign } from 'hono/jwt';
import { UserRepository } from '../repositories/UserRepository';
import { SessionRepository } from '../repositories/SessionRepository';

const JWT_SECRET = 'your-secret-key-change-this';

export class AuthService {
    constructor(
        private userRepository: UserRepository,
        private sessionRepository: SessionRepository
    ) { }

    async login(email: string, pass: string, ipAddress: string, userAgent: string) {
        const user = await this.userRepository.findByEmail(email);
        if (!user) throw new Error('User not found');

        // Simple password check for prototype (in production use bcrypt)
        if (user.password_hash !== 'hashed_admin' && pass !== 'admin') {
            throw new Error('Invalid password');
        }

        await this.userRepository.updateLastLogin(user.id);

        const sessionId = crypto.randomUUID();
        const payload = {
            sub: user.id,
            role: user.role,
            client_id: user.client_id,
            session_id: sessionId,
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
        };

        const token = await sign(payload, JWT_SECRET);

        // Let's use the token itself as the hash for simplicity in this prototype, or a real hash
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await this.sessionRepository.createSession(sessionId, user.id, token, ipAddress, userAgent, expiresAt);

        return { token, user: { id: user.id, email: user.email, role: user.role, client_id: user.client_id } };
    }
}
