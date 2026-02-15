import Dexie, { Table } from 'dexie';

export interface LocalReport {
    id?: number;
    forkliftId: string;
    templateId: string;
    answers: Record<string, any>;
    evidence: string[]; // blob URLs or base64
    capturedAt: string;
    syncedAt?: string;
    hasCriticalFailure: boolean;
}

export class CMMSDatabase extends Dexie {
    reports!: Table<LocalReport>;

    constructor() {
        super('CMMSDatabase');
        this.version(1).stores({
            reports: '++id, capturedAt, syncedAt'
        });
    }
}

export const db = new CMMSDatabase();
