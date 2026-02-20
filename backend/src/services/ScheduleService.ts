import { Client } from 'pg';
import { ScheduleRepository } from '../repositories/ScheduleRepository';
import { ensureOnboardingPrerequisites } from '../onboarding';

export class ScheduleService {
    constructor(
        private scheduleRepository: ScheduleRepository,
        private db: Client
    ) { }

    async getSchedulesByClient(clientId: string) {
        return await this.scheduleRepository.findActiveByClient(clientId);
    }

    async createSchedule(clientId: string, params: any) {
        const { forklift_id, task_name, frequency_type, frequency_value, target_model } = params;

        const onboardingGate = await ensureOnboardingPrerequisites(this.db, clientId, 'preventive_schedules');
        if (!onboardingGate.ok) {
            const err = new Error(onboardingGate.message) as any;
            err.code = 'ONBOARDING_PREREQUISITE_MISSING';
            err.missing_steps = onboardingGate.missing_steps;
            throw err;
        }

        let next_due_at = new Date();
        let next_due_hours = 0;

        if (frequency_type === 'DAYS') {
            next_due_at.setDate(next_due_at.getDate() + parseInt(frequency_value));
        } else if (frequency_type === 'HOURS' && forklift_id) {
            const fRes = await this.db.query(`
                SELECT current_hours FROM forklifts WHERE id = $1 AND client_id = $2
            `, [forklift_id, clientId]);
            if (fRes.rows.length === 0) throw new Error('Forklift not found for this client');

            const currentHours = parseFloat(fRes.rows[0]?.current_hours || 0);
            next_due_hours = currentHours + parseFloat(frequency_value);
            next_due_at.setFullYear(next_due_at.getFullYear() + 1);
        } else if (forklift_id) {
            const fRes = await this.db.query(`
                SELECT id FROM forklifts WHERE id = $1 AND client_id = $2 LIMIT 1
            `, [forklift_id, clientId]);
            if (fRes.rows.length === 0) throw new Error('Forklift not found for this client');
        }

        const id = crypto.randomUUID();
        await this.scheduleRepository.create({
            id,
            client_id: clientId,
            forklift_id: forklift_id || null,
            target_model: target_model || null,
            task_name,
            frequency_type,
            frequency_value,
            next_due_at: next_due_at.toISOString(),
            next_due_hours
        });

        return id;
    }

    async updateSchedule(id: string, clientId: string, updates: any) {
        const check = await this.scheduleRepository.findByIdAndClient(id, clientId);
        if (!check) throw new Error('Schedule not found');

        if (updates.forklift_id) {
            const fRes = await this.db.query(`
                SELECT id FROM forklifts WHERE id = $1 AND client_id = $2 LIMIT 1
            `, [updates.forklift_id, clientId]);
            if (fRes.rows.length === 0) throw new Error('Forklift not found for this client');
        }

        const changes = {
            forklift_id: updates.forklift_id !== undefined ? (updates.forklift_id || null) : undefined,
            task_name: updates.task_name,
            frequency_type: updates.frequency_type,
            frequency_value: updates.frequency_value,
            target_model: updates.target_model !== undefined ? (updates.target_model || null) : undefined,
            is_active: updates.is_active
        };

        const count = await this.scheduleRepository.update(id, clientId, changes);
        return (count ?? 0) > 0;
    }
}
