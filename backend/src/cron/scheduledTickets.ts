import { Bindings, getDb } from '../db';

export const scheduledTicketsJob = async (event: any, env: Bindings, ctx: any) => {
    const client = getDb(env);
    console.log(`[CRON] Starting scheduledTicketsJob at ${new Date().toISOString()}`);

    try {
        await client.connect();

        // Find schedules that are active and either:
        // 1. frequency_type = DAYS|CALENDAR and next_due_at <= NOW()
        // 2. frequency_type = HOURS and forklift's current_hours >= next_due_hours

        await client.query('BEGIN');

        // Check time-based schedules
        const timeRes = await client.query(`
            SELECT * FROM preventive_schedules 
            WHERE is_active = TRUE 
            AND frequency_type IN ('DAYS', 'CALENDAR')
            AND next_due_at <= NOW()
        `);

        // Check hour-based schedules
        const hoursRes = await client.query(`
            SELECT s.* FROM preventive_schedules s
            JOIN forklifts f ON s.forklift_id = f.id
            WHERE s.is_active = TRUE 
            AND s.frequency_type = 'HOURS'
            AND f.current_hours >= s.next_due_hours
        `);

        const dueSchedules = [...timeRes.rows, ...hoursRes.rows];

        console.log(`[CRON] Found ${dueSchedules.length} schedules due.`);

        for (const schedule of dueSchedules) {
            const ticketId = crypto.randomUUID();
            const ticketNumber = Date.now();

            // Create ticket
            await client.query(`
                INSERT INTO maintenance_tickets (id, ticket_number, forklift_id, schedule_id, status, priority, description, created_at)
                VALUES ($1, $2, $3, $4, 'ABIERTO', 'MEDIA', $5, NOW())
            `, [ticketId, ticketNumber, schedule.forklift_id, schedule.id, `Mantenimiento Preventivo: ${schedule.task_name}`]);

            // Update schedule to next due date/hours to avoid duplicate tickets
            if (schedule.frequency_type === 'DAYS' || schedule.frequency_type === 'CALENDAR') {
                await client.query(`
                    UPDATE preventive_schedules 
                    SET next_due_at = next_due_at + interval '1 day' * frequency_value
                    WHERE id = $1
                `, [schedule.id]);
            } else if (schedule.frequency_type === 'HOURS') {
                await client.query(`
                    UPDATE preventive_schedules 
                    SET next_due_hours = next_due_hours + frequency_value
                    WHERE id = $1
                `, [schedule.id]);
            }
            console.log(`[CRON] Created ticket ${ticketNumber} for schedule ${schedule.id}`);
        }

        await client.query('COMMIT');
    } catch (e: any) {
        console.error(`[CRON] Error during scheduledTicketsJob:`, e);
        try { await client.query('ROLLBACK'); } catch { }
    } finally {
        try { await client.end(); } catch { }
    }
};
