import { Client } from 'pg';

export class AuditService {
    static async log(
        db: Client,
        userId: string | null,
        clientId: string | null,
        action: string,
        entityType: string,
        entityId: string,
        oldValue: any = null,
        newValue: any = null,
        ipAddress: string | null = null
    ) {
        try {
            const id = crypto.randomUUID();
            await db.query(`
                INSERT INTO audit_log (id, user_id, client_id, action, entity_type, entity_id, old_value, new_value, ip_address, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            `, [
                id,
                userId,
                clientId,
                action,
                entityType,
                entityId,
                oldValue ? JSON.stringify(oldValue) : null,
                newValue ? JSON.stringify(newValue) : null,
                ipAddress
            ]);
        } catch (e) {
            console.error('[AUDIT ERROR] Failed to write audit log:', e);
            // We usually don't throw from an audit service to avoid failing the main transaction
            // But it can be attached to the current db transaction if there is one.
        }
    }
}
