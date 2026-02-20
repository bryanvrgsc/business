import { Client } from 'pg';
import { ForkliftRepository } from '../repositories/ForkliftRepository';

export class ForkliftService {
    constructor(
        private forkliftRepository: ForkliftRepository,
        private db: Client
    ) { }

    async getForkliftDetails(clientId: string, identifier: string) {
        const f = await this.forkliftRepository.findByIdOrQrCode(clientId, identifier);
        if (!f) throw new Error('Forklift not found');

        return {
            id: f.id,
            internalId: f.internal_id,
            model: f.model,
            brand: f.brand,
            status: f.operational_status, // OPERATIONAL, MAINTENANCE, OUT_OF_SERVICE
            location: f.location_name || 'Sin ubicación asignada',
            nextMaintenance: '2024-03-01', // TODO: Calculate from schedules
            image: '/forklift-placeholder.png' // TODO: R2 Image
        };
    }

    async updateForklift(id: string, clientId: string, updates: any) {
        const check = await this.forkliftRepository.findByIdAndClient(id, clientId);
        if (!check) throw new Error('Forklift not found');

        if (updates.location_id) {
            const locationRes = await this.db.query(`
                SELECT id
                FROM client_locations
                WHERE id = $1 AND client_id = $2
                LIMIT 1
            `, [updates.location_id, clientId]);
            if (locationRes.rows.length === 0) {
                throw new Error('Location not found for this client');
            }
        }

        const changes = {
            model: updates.model,
            brand: updates.brand,
            serial_number: updates.serial_number,
            fuel_type: updates.fuel_type,
            current_hours: updates.current_hours,
            year: updates.year,
            location_id: updates.location_id,
            image: updates.image,
            status: updates.status
        };

        const count = await this.forkliftRepository.update(id, clientId, changes);
        return (count ?? 0) > 0;
    }
}
