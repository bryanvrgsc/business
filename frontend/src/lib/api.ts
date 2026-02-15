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

export function logout() {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    }
}
