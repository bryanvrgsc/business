// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { db } from './db';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export async function syncReports() {
    const unsynced = await db.reports.filter(r => !r.syncedAt).toArray();

    if (unsynced.length === 0) return { synced: 0, errors: 0 };

    let syncedCount = 0;
    let errorCount = 0;

    for (const report of unsynced) {
        try {
            const response = await fetch(`${API_URL}/api/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(report)
            });

            if (response.ok) {
                // Update local DB
                await db.reports.update(report.id!, { syncedAt: new Date().toISOString() });
                syncedCount++;
            } else {
                console.error('Sync failed for report', report.id, response.statusText);
                errorCount++;
            }
        } catch (error) {
            console.error('Network error syncing report', report.id, error);
            errorCount++;
        }
    }

    return { synced: syncedCount, errors: errorCount };
}

export function usePendingCount() {
    // A simple hook could be implemented with useLiveQuery from dexie-react-hooks
    // For now we will just return a manual check function or use this in components
}
