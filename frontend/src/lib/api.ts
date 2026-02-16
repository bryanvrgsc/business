const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cmms-backend.bryanvrgsc.workers.dev';

// Forklifts
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

export interface ClientLocation {
    id: string;
    name: string;
}

export async function fetchLocations(clientId?: string): Promise<ClientLocation[]> {
    const token = ensureAuth();
    const query = clientId ? `?client_id=${clientId}` : '';
    const res = await fetch(`${API_URL}/api/client-locations${query}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!res.ok) throw new Error('Failed to fetch locations');
    return res.json();
}

export async function createClientLocation(data: any): Promise<void> {
    const token = ensureAuth();
    await fetch(`${API_URL}/api/client-locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data)
    });
}

export async function updateClientLocation(id: string, data: any): Promise<void> {
    const token = ensureAuth();
    await fetch(`${API_URL}/api/client-locations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data)
    });
}

export async function updateUser(id: string, data: any): Promise<void> {
    const token = ensureAuth();

    await fetch(`${API_URL}/api/users/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
}

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

// Helper to get token
function getToken() {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('token');
    }
    return null;
}

function ensureAuth() {
    const token = getToken();
    if (!token) {
        if (typeof window !== 'undefined') {
            window.location.href = '/login';
        }
        throw new Error('Not authenticated');
    }
    return token;
}

export async function login(email: string, password: string): Promise<User> {
    const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Login failed');
    }

    const data: AuthResponse = await res.json();
    if (typeof window !== 'undefined') {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data.user;
}

export async function fetchForkliftById(id: string): Promise<Forklift | null> {
    const token = ensureAuth();

    const res = await fetch(`${API_URL}/api/forklifts/${id}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Failed to fetch forklift');

    return res.json();
}

export async function fetchForklifts(): Promise<Forklift[]> {
    const token = ensureAuth();

    const res = await fetch(`${API_URL}/api/forklifts`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!res.ok) throw new Error('Failed to fetch forklifts');
    return res.json();
}

export async function uploadImage(file: File): Promise<string> {
    const token = ensureAuth();

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_URL}/api/upload`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
    }

    const data = await res.json();
    // Return full URL for simple display, or key if we want to construct it
    return `${API_URL}${data.url}`;
}

export async function fetchForkliftByQR(qrPayload: string): Promise<Forklift | null> {
    // Backend logic handles lookup by QR payload same as ID for now (internal_id)
    return fetchForkliftById(qrPayload);
}

// Reports
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

export async function fetchReports(): Promise<Report[]> {
    const token = ensureAuth();

    const res = await fetch(`${API_URL}/api/reports`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('Failed to fetch reports');
    return res.json();
}

// Tickets
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

export async function fetchTickets(): Promise<Ticket[]> {
    const token = ensureAuth();

    const res = await fetch(`${API_URL}/api/tickets`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('Failed to fetch tickets');
    return res.json();
}

export async function createTicket(data: any): Promise<void> {
    const token = ensureAuth();

    await fetch(`${API_URL}/api/tickets`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
}

export async function updateTicketStatus(id: string, status: string, assignedTo?: string): Promise<void> {
    const token = ensureAuth();

    await fetch(`${API_URL}/api/tickets/${id}/status`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status, assigned_to: assignedTo })
    });
}



// Preventive Maintenance
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

export async function fetchSchedules(): Promise<MaintenanceSchedule[]> {
    const token = ensureAuth();

    const res = await fetch(`${API_URL}/api/schedules`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!res.ok) throw new Error('Failed to fetch schedules');
    return res.json();
}

export async function createSchedule(data: any): Promise<void> {
    const token = ensureAuth();

    const res = await fetch(`${API_URL}/api/schedules`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });

    if (!res.ok) throw new Error('Error creating schedule');
}

export async function updateSchedule(id: string, data: any): Promise<void> {
    const token = ensureAuth();
    const res = await fetch(`${API_URL}/api/schedules/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });

    if (!res.ok) throw new Error('Error updating schedule');
}

// Admin - Forklifts
export async function createForklift(data: any): Promise<void> {
    const token = ensureAuth();

    await fetch(`${API_URL}/api/forklifts`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
}

export async function updateForklift(id: string, data: any): Promise<void> {
    const token = ensureAuth();

    await fetch(`${API_URL}/api/forklifts/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
}

// Admin - Users
export async function fetchUsers(): Promise<User[]> {
    const token = ensureAuth();

    const res = await fetch(`${API_URL}/api/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
}

export async function createUser(data: any): Promise<void> {
    const token = ensureAuth();

    await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
}


// Inventory
export interface Part {
    id: string;
    part_number: string;
    name: string;
    current_stock: number;
    min_stock: number;
    unit_cost: number;
    supplier: string;
}

export async function fetchInventory(): Promise<Part[]> {
    const token = ensureAuth();
    const res = await fetch(`${API_URL}/api/inventory`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch inventory');
    return res.json();
}

export async function createPart(data: any): Promise<void> {
    const token = ensureAuth();
    await fetch(`${API_URL}/api/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data)
    });
}

export async function updatePart(id: string, data: any): Promise<void> {
    const token = ensureAuth();
    await fetch(`${API_URL}/api/inventory/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
}

// Ticket Costs
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

export async function fetchTicketCosts(ticketId: string): Promise<TicketCost[]> {
    const token = ensureAuth();
    const res = await fetch(`${API_URL}/api/tickets/${ticketId}/costs`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch costs');
    return res.json();
}

export async function addTicketCost(ticketId: string, data: any): Promise<void> {
    const token = ensureAuth();
    await fetch(`${API_URL}/api/tickets/${ticketId}/costs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data)
    });
}

// KPIs
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

export async function fetchKPIs(): Promise<KPIData> {
    const token = ensureAuth();
    const res = await fetch(`${API_URL}/api/kpis`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch KPIs');
    return res.json();
}

export function logout() {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    }
}

// Clients
export interface Client {
    id: string;
    name: string;
    contact_email?: string;
    phone?: string;
    subscription_plan: string;
    is_active: boolean;
    created_at: string;
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

export async function fetchClients(): Promise<Client[]> {
    const token = ensureAuth();
    const res = await fetch(`${API_URL}/api/clients`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch clients');
    return res.json();
}

export async function createClient(data: any): Promise<void> {
    const token = ensureAuth();
    await fetch(`${API_URL}/api/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data)
    });
}

export async function updateClient(id: string, data: any): Promise<void> {
    const token = ensureAuth();
    await fetch(`${API_URL}/api/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data)
    });
}

export async function fetchOnboardingStatus(clientId?: string): Promise<OnboardingStatus> {
    const token = ensureAuth();
    const query = clientId ? `?client_id=${clientId}` : '';
    const res = await fetch(`${API_URL}/api/onboarding/status${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch onboarding status');
    return res.json();
}

// Contracts & SLAs
export async function fetchContracts(clientId?: string): Promise<any[]> {
    const token = ensureAuth();
    const query = clientId ? `?client_id=${clientId}` : '';
    const res = await fetch(`${API_URL}/api/contracts${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch contracts');
    return res.json();
}

export async function createContract(data: any): Promise<void> {
    const token = ensureAuth();
    await fetch(`${API_URL}/api/contracts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data)
    });
}

export async function fetchSLAs(clientId?: string): Promise<any[]> {
    const token = ensureAuth();
    const query = clientId ? `?client_id=${clientId}` : '';
    const res = await fetch(`${API_URL}/api/contracts/slas${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch SLAs');
    return res.json();
}

export async function createSLA(data: any): Promise<void> {
    const token = ensureAuth();
    await fetch(`${API_URL}/api/contracts/slas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data)
    });
}

// Checklists
export async function fetchChecklistTemplates(): Promise<any[]> {
    const token = ensureAuth();
    const res = await fetch(`${API_URL}/api/checklists/templates`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch templates');
    return res.json();
}

export async function createChecklistTemplate(data: any): Promise<void> {
    const token = ensureAuth();
    await fetch(`${API_URL}/api/checklists/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data)
    });
}

export async function fetchChecklistQuestions(templateId: string): Promise<any[]> {
    const token = ensureAuth();
    const res = await fetch(`${API_URL}/api/checklists/templates/${templateId}/questions`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch questions');
    return res.json();
}

export async function addChecklistQuestion(data: any): Promise<void> {
    const token = ensureAuth();
    await fetch(`${API_URL}/api/checklists/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data)
    });
}
