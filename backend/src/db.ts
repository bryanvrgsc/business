import { Client } from 'pg'

export type Bindings = {
    HYPERDRIVE: Hyperdrive
    R2: R2Bucket
    DATABASE_URL: string // Local fallback
}

export const getDb = (env: Bindings) => {
    // If we have Hyperdrive, use it. If not, fallback to direct DATABASE_URL.
    // Also disable SSL for the direct connection fallback (since we are hitting IP directly)
    const connectionString = env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL

    if (!connectionString) {
        throw new Error('No database connection string found (HYPERDRIVE or DATABASE_URL)')
    }

    const client = new Client({
        connectionString,
        // Disable SSL verification for local dev against IP
        ssl: env.DATABASE_URL ? false : undefined
    })
    return client
}
