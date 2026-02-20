import { Client } from 'pg';

export class SessionRepository {
    constructor(private db: Client) { }

    async createSession(id: string, userId: string, tokenHash: string, ipAddress: string, userAgent: string, expiresAt: Date) {
        await this.db.query(
            `INSERT INTO user_sessions (id, user_id, token_hash, ip_address, device_info, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [id, userId, tokenHash, ipAddress, userAgent, expiresAt.toISOString()]
        );
    }

    async findActiveSession(tokenHash: string) {
        const res = await this.db.query(
            `SELECT * FROM user_sessions WHERE token_hash = $1 AND expires_at > NOW()`,
            [tokenHash]
        );
        return res.rows[0];
    }
}
