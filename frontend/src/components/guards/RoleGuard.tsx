'use client';

import { useAuth } from '../../contexts/AuthContext';

interface RoleGuardProps {
    allowedRoles: string[];
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export default function RoleGuard({ allowedRoles, children, fallback = null }: RoleGuardProps) {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return null; // Or a gentle skeleton
    }

    if (!user || !allowedRoles.includes(user.role)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
