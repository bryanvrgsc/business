import { Client } from 'pg';
import { SyncRepository } from '../repositories/SyncRepository';
import { ForkliftRepository } from '../repositories/ForkliftRepository';

const FAILED_ANSWER_VALUES = new Set(['NO', 'FAIL', 'FAILED', 'FALSE', '0']);

const normalizeAnswerValue = (value: unknown): string => {
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (value === null || value === undefined) return '';
    return String(value).trim().toUpperCase();
};

const isFailedAnswer = (value: unknown): boolean => FAILED_ANSWER_VALUES.has(normalizeAnswerValue(value));

export class SyncService {
    constructor(
        private syncRepository: SyncRepository,
        private forkliftRepository: ForkliftRepository
    ) { }

    async processSync(user: any, report: any) {
        const { forkliftId, templateId, answers, hasCriticalFailure, capturedAt, gpsLatitude, gpsLongitude } = report;

        const check = await this.forkliftRepository.findByIdAndClient(forkliftId, user.client_id);
        if (!check) throw new Error('Forklift not found');

        let hasWarningFailure = false;
        let hasCriticalFromAnswers = false;
        const answerEntries = answers ? Object.entries(answers) : [];

        if (answerEntries.length > 0) {
            const questionIds = answerEntries.map(([questionId]) => questionId);
            const severityRows = await this.syncRepository.getChecklistQuestionSeverities(questionIds);

            const severityByQuestion = new Map<string, string>();
            for (const row of severityRows) {
                severityByQuestion.set(String(row.id), String(row.severity_level || 'INFO').toUpperCase());
            }

            for (const [questionId, value] of answerEntries) {
                if (!isFailedAnswer(value)) continue;
                const severity = severityByQuestion.get(questionId);
                if (severity === 'CRITICAL_STOP') {
                    hasCriticalFromAnswers = true;
                } else if (severity === 'WARNING') {
                    hasWarningFailure = true;
                }
            }
        }

        const resolvedCritical = hasCriticalFromAnswers || Boolean(hasCriticalFailure);
        const reportId = crypto.randomUUID();
        const finalCapturedAt = capturedAt || new Date().toISOString();

        await this.syncRepository.syncReportProcess(
            reportId,
            forkliftId,
            user.sub,
            templateId,
            finalCapturedAt,
            resolvedCritical,
            gpsLatitude || 0.0,
            gpsLongitude || 0.0,
            answerEntries.map(([k, v]) => [k, String(v)]),
            hasWarningFailure
        );

        return { reportId, synced_at: new Date().toISOString() };
    }
}
