const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cmms-backend.bryanvrgsc.workers.dev';

export interface Forklift {
    id: string;
    internalId: string;
    model: string;
    brand: string;
    status: 'OPERATIONAL' | 'MAINTENANCE' | 'OUT_OF_SERVICE';
    location: string;
    nextMaintenance: string;
    image?: string;
}

export interface User {
    id: string;
    email: string;
    role: string;
    client_id: string;
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
    const token = getToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`${API_URL}/api/forklifts/${id}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Failed to fetch forklift');

    return res.json();
}

export async function uploadImage(file: File): Promise<string> {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');

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
}

export async function fetchTickets(): Promise<Ticket[]> {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`${API_URL}/api/tickets`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('Failed to fetch tickets');
    return res.json();
}

export async function updateTicketStatus(id: string, status: string): Promise<void> {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');

    await fetch(`${API_URL}/api/tickets/${id}/status`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
    });
}



// Preventive Maintenance
export interface MaintenanceSchedule {
    id: string;
    forklift_id: string;
    description: string;
    due_date?: string;
    interval_days?: number;
    recurrence?: string;
    created_at: string;
}

export async function fetchSchedules(): Promise<MaintenanceSchedule[]> {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`${API_URL}/api/maintenance/schedules`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!res.ok) throw new Error('Failed to fetch schedules');
    return res.json();
}

export async function createSchedule(data: any): Promise<void> {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');

    await fetch(`${API_URL}/api/maintenance/schedules`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
}

// Admin - Forklifts
export async function createForklift(data: any): Promise<void> {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');

    await fetch(`${API_URL}/api/forklifts`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
}

// Admin - Users
export async function fetchUsers(): Promise<User[]> {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`${API_URL}/api/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
}

export async function createUser(data: any): Promise<void> {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');

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
    const token = getToken();
    if (!token) throw new Error('Not authenticated');
    const res = await fetch(`${API_URL}/api/inventory`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch inventory');
    return res.json();
}

export async function createPart(data: any): Promise<void> {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');
    await fetch(`${API_URL}/api/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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
    const token = getToken();
    if (!token) throw new Error('Not authenticated');
    const res = await fetch(`${API_URL}/api/tickets/${ticketId}/costs`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch costs');
    return res.json();
}

export async function addTicketCost(ticketId: string, data: any): Promise<void> {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');
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
    const token = getToken();
    if (!token) throw new Error('Not authenticated');
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
