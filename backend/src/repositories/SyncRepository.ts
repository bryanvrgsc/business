import { Client } from 'pg';

export class SyncRepository {
    constructor(private db: Client) { }

    async getChecklistQuestionSeverities(questionIds: string[]) {
        const res = await this.db.query(`
            SELECT id, severity_level
            FROM checklist_questions
            WHERE id = ANY($1::varchar[])
        `, [questionIds]);
        return res.rows;
    }

    async saveReport(reportData: any) {
        await this.db.query(`
            INSERT INTO reports (id, forklift_id, user_id, template_id, captured_at, has_critical_failure, gps_latitude, gps_longitude)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
            reportData.reportId,
            reportData.forkliftId,
            reportData.userId,
            reportData.templateId,
            reportData.capturedAt,
            reportData.resolvedCritical,
            reportData.gpsLatitude,
            reportData.gpsLongitude
        ]);
    }

    async saveAnswers(answersData: Array<[string, string]>, reportId: string) {
        for (const [questionId, value] of answersData) {
            await this.db.query(`
                INSERT INTO report_answers (id, report_id, question_id, answer_value)
                VALUES ($1, $2, $3, $4)
            `, [crypto.randomUUID(), reportId, questionId, value]);
        }
    }

    async syncReportProcess(
        reportId: string,
        forkliftId: string,
        userId: string,
        templateId: string,
        capturedAt: string,
        resolvedCritical: boolean,
        gpsLatitude: number,
        gpsLongitude: number,
        answersData: Array<[string, string]>,
        hasWarningFailure: boolean
    ) {
        // Run as a transaction since multiple inserts/updates are happening
        try {
            await this.db.query('BEGIN');

            await this.saveReport({
                reportId, forkliftId, userId, templateId, capturedAt, resolvedCritical, gpsLatitude, gpsLongitude
            });

            if (answersData.length > 0) {
                await this.saveAnswers(answersData, reportId);
            }

            if (resolvedCritical || hasWarningFailure) {
                const ticketId = crypto.randomUUID();
                const ticketNumber = `TKT-${Date.now().toString().slice(-6)}`;
                const priority = resolvedCritical ? 'HIGH' : 'MEDIUM';
                const description = resolvedCritical
                    ? 'Falla crítica detectada en inspección'
                    : 'Falla de advertencia detectada en inspección';

                await this.db.query(`
                    INSERT INTO maintenance_tickets (id, ticket_number, report_id, forklift_id, status, priority, description, created_by, created_at)
                    VALUES ($1, $2, $3, $4, 'OPEN', $5, $6, $7, $8)
                `, [ticketId, ticketNumber, reportId, forkliftId, priority, description, userId, new Date().toISOString()]);
            }

            if (resolvedCritical) {
                await this.db.query(`
                    UPDATE forklifts 
                    SET operational_status = 'OUT_OF_SERVICE' 
                    WHERE id = $1
                `, [forkliftId]);
            }

            await this.db.query('COMMIT');
        } catch (error) {
            await this.db.query('ROLLBACK');
            throw error;
        }
    }
}
