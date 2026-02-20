import { ApiClient } from '../lib/apiClient';
import { User, AuthResponse } from '../types';

export class AuthService {
    static async login(email: string, password: string): Promise<User> {
        const data = await ApiClient.post<AuthResponse>('/api/auth/login', { email, password });
        if (typeof window !== 'undefined') {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
        }
        return data.user;
    }

    static logout(): void {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
    }

    static getCurrentUser(): User | null {
        if (typeof window !== 'undefined') {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    return JSON.parse(userStr);
                } catch (e) {
                    return null;
                }
            }
        }
        return null;
    }

    static isAuthenticated(): boolean {
        return !!ApiClient.getToken();
    }
}
