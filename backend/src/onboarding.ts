import { Client } from 'pg';

export type OnboardingStepKey =
    | 'clients'
    | 'users'
    | 'client_locations'
    | 'forklifts'
    | 'service_contracts'
    | 'sla_definitions'
    | 'checklist_configuration'
    | 'preventive_schedules';

export type OnboardingStepStatus = {
    key: OnboardingStepKey;
    label: string;
    completed: boolean;
    can_create: boolean;
    blocked_by: OnboardingStepKey[];
    detail: string;
};

export type OnboardingStatus = {
    client_id: string;
    phase1_ready: boolean;
    steps: OnboardingStepStatus[];
};

type RoleGroup = 'ADMIN' | 'CLIENTE' | 'TECNICO' | 'OPERADOR';

const STEP_LABELS: Record<OnboardingStepKey, string> = {
    clients: 'Cliente',
    users: 'Usuarios clave',
    client_locations: 'Ubicaciones',
    forklifts: 'Activos (montacargas)',
    service_contracts: 'Contratos',
    sla_definitions: 'SLAs',
    checklist_configuration: 'Checklists',
    preventive_schedules: 'Preventivos',
};

const STEP_ORDER: OnboardingStepKey[] = [
    'clients',
    'users',
    'client_locations',
    'forklifts',
    'service_contracts',
    'sla_definitions',
    'checklist_configuration',
    'preventive_schedules',
];

const STEP_PREREQUISITES: Record<OnboardingStepKey, OnboardingStepKey[]> = {
    clients: [],
    users: ['clients'],
    client_locations: ['clients', 'users'],
    forklifts: ['clients', 'users', 'client_locations'],
    service_contracts: ['clients', 'users', 'client_locations', 'forklifts'],
    sla_definitions: ['clients', 'users', 'client_locations', 'forklifts', 'service_contracts'],
    checklist_configuration: ['clients', 'users', 'client_locations', 'forklifts', 'service_contracts', 'sla_definitions'],
    preventive_schedules: ['clients', 'users', 'client_locations', 'forklifts', 'service_contracts', 'sla_definitions', 'checklist_configuration'],
};

const ROLE_EQUIVALENTS: Record<RoleGroup, string[]> = {
    ADMIN: ['ADMIN'],
    CLIENTE: ['CLIENTE', 'CLIENT'],
    TECNICO: ['TECNICO', 'TECH'],
    OPERADOR: ['OPERADOR', 'OPERATOR'],
};

type StepCounters = {
    clientExists: boolean;
    usersCount: number;
    locationsCount: number;
    forkliftsCount: number;
    contractsCount: number;
    slaCount: number;
    templatesCount: number;
    questionsCount: number;
    schedulesCount: number;
    roleCoverage: Record<RoleGroup, number>;
};

const parseCount = (value: unknown): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
};

const buildStepStatus = (key: OnboardingStepKey, counters: StepCounters): Omit<OnboardingStepStatus, 'can_create' | 'blocked_by'> => {
    switch (key) {
        case 'clients':
            return {
                key,
                label: STEP_LABELS[key],
                completed: counters.clientExists,
                detail: counters.clientExists ? 'Cliente registrado.' : 'No existe registro en clients.',
            };
        case 'users': {
            const missingRoles = (Object.keys(ROLE_EQUIVALENTS) as RoleGroup[]).filter((group) => counters.roleCoverage[group] === 0);
            return {
                key,
                label: STEP_LABELS[key],
                completed: missingRoles.length === 0,
                detail: missingRoles.length === 0
                    ? `Usuarios configurados (${counters.usersCount}).`
                    : `Faltan roles: ${missingRoles.join(', ')}.`,
            };
        }
        case 'client_locations':
            return {
                key,
                label: STEP_LABELS[key],
                completed: counters.locationsCount > 0,
                detail: `${counters.locationsCount} ubicaciones registradas.`,
            };
        case 'forklifts':
            return {
                key,
                label: STEP_LABELS[key],
                completed: counters.forkliftsCount > 0,
                detail: `${counters.forkliftsCount} activos registrados.`,
            };
        case 'service_contracts':
            return {
                key,
                label: STEP_LABELS[key],
                completed: counters.contractsCount > 0,
                detail: `${counters.contractsCount} contratos registrados.`,
            };
        case 'sla_definitions':
            return {
                key,
                label: STEP_LABELS[key],
                completed: counters.slaCount > 0,
                detail: `${counters.slaCount} definiciones SLA registradas.`,
            };
        case 'checklist_configuration': {
            const done = counters.templatesCount > 0 && counters.questionsCount > 0;
            return {
                key,
                label: STEP_LABELS[key],
                completed: done,
                detail: `Templates: ${counters.templatesCount}, preguntas: ${counters.questionsCount}.`,
            };
        }
        case 'preventive_schedules':
            return {
                key,
                label: STEP_LABELS[key],
                completed: counters.schedulesCount > 0,
                detail: `${counters.schedulesCount} preventivos activos.`,
            };
    }
};

const loadCounters = async (db: Client, clientId: string): Promise<StepCounters> => {
    const [
        clientRes,
        usersRes,
        rolesRes,
        locationsRes,
        forkliftsRes,
        contractsRes,
        slaRes,
        templatesRes,
        questionsRes,
        schedulesRes,
    ] = await Promise.all([
        db.query('SELECT 1 FROM clients WHERE id = $1 LIMIT 1', [clientId]),
        db.query('SELECT COUNT(*)::int AS count FROM users WHERE client_id = $1 AND is_active = TRUE', [clientId]),
        db.query(
            `SELECT role, COUNT(*)::int AS count
             FROM users
             WHERE client_id = $1 AND is_active = TRUE
             GROUP BY role`,
            [clientId]
        ),
        db.query('SELECT COUNT(*)::int AS count FROM client_locations WHERE client_id = $1', [clientId]),
        db.query('SELECT COUNT(*)::int AS count FROM forklifts WHERE client_id = $1', [clientId]),
        db.query('SELECT COUNT(*)::int AS count FROM service_contracts WHERE client_id = $1', [clientId]),
        db.query('SELECT COUNT(*)::int AS count FROM sla_definitions WHERE client_id = $1', [clientId]),
        db.query('SELECT COUNT(*)::int AS count FROM checklist_templates WHERE client_id = $1 AND is_active = TRUE', [clientId]),
        db.query(
            `SELECT COUNT(*)::int AS count
             FROM checklist_questions q
             JOIN checklist_templates t ON t.id = q.template_id
             WHERE t.client_id = $1`,
            [clientId]
        ),
        db.query('SELECT COUNT(*)::int AS count FROM preventive_schedules WHERE client_id = $1 AND is_active = TRUE', [clientId]),
    ]);

    const roleCoverage: Record<RoleGroup, number> = {
        ADMIN: 0,
        CLIENTE: 0,
        TECNICO: 0,
        OPERADOR: 0,
    };

    for (const row of rolesRes.rows) {
        const role = String(row.role || '').toUpperCase();
        const count = parseCount(row.count);
        for (const group of Object.keys(ROLE_EQUIVALENTS) as RoleGroup[]) {
            if (ROLE_EQUIVALENTS[group].includes(role)) {
                roleCoverage[group] += count;
            }
        }
    }

    return {
        clientExists: clientRes.rows.length > 0,
        usersCount: parseCount(usersRes.rows[0]?.count),
        locationsCount: parseCount(locationsRes.rows[0]?.count),
        forkliftsCount: parseCount(forkliftsRes.rows[0]?.count),
        contractsCount: parseCount(contractsRes.rows[0]?.count),
        slaCount: parseCount(slaRes.rows[0]?.count),
        templatesCount: parseCount(templatesRes.rows[0]?.count),
        questionsCount: parseCount(questionsRes.rows[0]?.count),
        schedulesCount: parseCount(schedulesRes.rows[0]?.count),
        roleCoverage,
    };
};

export const getOnboardingStatus = async (db: Client, clientId: string): Promise<OnboardingStatus> => {
    const counters = await loadCounters(db, clientId);
    const completedByStep: Partial<Record<OnboardingStepKey, boolean>> = {};

    const steps: OnboardingStepStatus[] = STEP_ORDER.map((key) => {
        const raw = buildStepStatus(key, counters);
        completedByStep[key] = raw.completed;
        return {
            ...raw,
            can_create: true,
            blocked_by: [],
        };
    });

    for (const step of steps) {
        const blockedBy = STEP_PREREQUISITES[step.key].filter((p) => !completedByStep[p]);
        step.blocked_by = blockedBy;
        step.can_create = blockedBy.length === 0;
    }

    const phase1Ready = steps.every((step) => step.completed);

    return {
        client_id: clientId,
        phase1_ready: phase1Ready,
        steps,
    };
};

export const ensureOnboardingPrerequisites = async (
    db: Client,
    clientId: string,
    targetStep: OnboardingStepKey
): Promise<{ ok: true } | { ok: false; message: string; missing_steps: OnboardingStepKey[] }> => {
    const status = await getOnboardingStatus(db, clientId);
    const step = status.steps.find((entry) => entry.key === targetStep);

    if (!step) {
        return {
            ok: false,
            message: 'Paso de onboarding desconocido.',
            missing_steps: [],
        };
    }

    if (step.blocked_by.length === 0) {
        return { ok: true };
    }

    const missingLabels = step.blocked_by.map((key) => STEP_LABELS[key]);
    return {
        ok: false,
        message: `Debes completar primero: ${missingLabels.join(', ')}.`,
        missing_steps: step.blocked_by,
    };
};
