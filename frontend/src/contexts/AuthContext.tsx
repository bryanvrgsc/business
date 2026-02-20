'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { AuthService } from '../services/auth.service';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (user: User, token: string) => void;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isAuthenticated: false,
    login: () => { },
    logout: () => { },
    isLoading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const loadUser = () => {
            const currentUser = AuthService.getCurrentUser();
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

            if (currentUser && token) {
                setUser(currentUser);
            } else {
                setUser(null);
            }
            setIsLoading(false);
        };

        loadUser();
    }, [pathname]); // Re-check on route changes as a strict safeguard

    const login = (userData: User, token: string) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userData));
        }
        setUser(userData);
    };

    const logout = () => {
        AuthService.logout();
        setUser(null);
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
