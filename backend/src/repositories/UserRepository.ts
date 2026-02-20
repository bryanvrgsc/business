import { Client } from 'pg';

export class UserRepository {
    constructor(private db: Client) { }

    async findByEmail(email: string) {
        const res = await this.db.query('SELECT * FROM users WHERE email = $1', [email]);
        return res.rows[0];
    }

    async updateLastLogin(userId: string) {
        await this.db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [userId]);
    }
}
