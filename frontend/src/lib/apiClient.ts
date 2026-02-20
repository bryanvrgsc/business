const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export class ApiClient {
    static getToken(): string | null {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('token');
        }
        return null;
    }

    private static getHeaders(isFormData = false): HeadersInit {
        const headers: HeadersInit = {};
        if (!isFormData) {
            headers['Content-Type'] = 'application/json';
        }

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    private static async handleResponse<T>(response: Response): Promise<T> {
        if (!response.ok) {
            let errorMessage = 'An error occurred';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorData.message || errorMessage;
            } catch (e) {
                // If it's not JSON, fallback to status text
                errorMessage = response.statusText;
            }

            if (response.status === 401) {
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    // Only redirect if not already on login page
                    if (window.location.pathname !== '/login') {
                        window.location.href = '/login';
                    }
                }
                // We throw the specific message so Login page can show it
                throw new Error(errorMessage || 'Not authenticated or session expired');
            }

            throw new Error(errorMessage);
        }

        const text = await response.text();
        if (!text) return null as any;
        return JSON.parse(text);
    }

    static async get<T>(endpoint: string): Promise<T> {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'GET',
            headers: this.getHeaders(),
        });
        return this.handleResponse<T>(response);
    }

    static async post<T>(endpoint: string, data: any, isFormData = false): Promise<T> {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: this.getHeaders(isFormData),
            body: isFormData ? data : JSON.stringify(data),
        });
        return this.handleResponse<T>(response);
    }

    static async put<T>(endpoint: string, data: any, isFormData = false): Promise<T> {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'PUT',
            headers: this.getHeaders(isFormData),
            body: isFormData ? data : JSON.stringify(data),
        });
        return this.handleResponse<T>(response);
    }

    static async patch<T>(endpoint: string, data: any): Promise<T> {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'PATCH',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        return this.handleResponse<T>(response);
    }

    static async delete<T>(endpoint: string): Promise<T> {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
        });
        return this.handleResponse<T>(response);
    }
}
