export interface User {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
    role: 'ADMIN' | 'TECH' | 'OPERATOR' | 'CLIENT';
    client_id: string;
    is_active: boolean;
    last_login_at?: string;
}

export interface AuthResponse {
    token: string;
    user: User;
}

export interface Client {
    id: string;
    name: string;
    contact_email?: string;
    phone?: string;
    subscription_plan: string;
    is_active: boolean;
    created_at: string;
}

export interface ClientLocation {
    id: string;
    name: string;
}

export interface Forklift {
    id: string;
    internalId: string;
    brand: string;
    model: string;
    location: string;
    status: 'OPERATIONAL' | 'MAINTENANCE' | 'OUT_OF_SERVICE';
    serialNumber?: string;
    fuelType?: 'GAS_LP' | 'ELECTRIC' | 'DIESEL';
    currentHours?: number;
    year?: number;
    image?: string;
    nextServiceHours?: number;
    nextMaintenance?: string;
}

export interface Report {
    id: string;
    forklift_id: string;
    user_id: string;
    template_id: string;
    captured_at: string;
    has_critical_failure: boolean;
    gps_latitude?: number;
    gps_longitude?: number;
    forklift_name?: string;
    user_name?: string;
    template_name?: string;
}

export interface Ticket {
    id: string;
    ticket_number: string;
    forklift_internal_id: string;
    forklift_model: string;
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
    created_at: string;
    assigned_to?: string;
    assigned_to_name?: string;
}

export interface TicketCost {
    id: string;
    ticket_id: string;
    cost_type: string;
    description: string;
    quantity: number;
    unit_cost: number;
    total_cost: number;
    is_billable: boolean;
}

export interface MaintenanceSchedule {
    id: string;
    forklift_id: string;
    forklift_name?: string;
    task_name: string;
    description?: string;
    frequency_type: 'DAYS' | 'HOURS';
    frequency_value: number;
    next_due_at: string;
    next_due_hours?: number;
    is_active: boolean;
    created_at: string;
    target_model?: string;
}

export type Schedule = MaintenanceSchedule;

export interface Part {
    id: string;
    part_number: string;
    name: string;
    current_stock: number;
    min_stock: number;
    unit_cost: number;
    supplier: string;
}

export interface KPIData {
    tickets: {
        open: number;
        in_progress: number;
        resolved: number;
        closed: number;
        total: number;
    };
    mttr_hours: string;
    costs: {
        total: number;
        tickets_with_costs: number;
    };
    tickets_per_month: { month: string; count: number }[];
    fleet: { operational_status: string; count: number }[];
}

export interface OnboardingStepStatus {
    key: string;
    label: string;
    completed: boolean;
    can_create: boolean;
    blocked_by: string[];
    detail: string;
}

export interface OnboardingStatus {
    client_id: string;
    phase1_ready: boolean;
    steps: OnboardingStepStatus[];
}
