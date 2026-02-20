'use client';

import Link from 'next/link';
import { Home, QrCode, Settings, LogOut, FileText, BarChart3 } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import RoleGuard from './guards/RoleGuard';

export default function Navbar() {
    const { isAuthenticated, logout, isLoading } = useAuth();
    const pathname = usePathname();

    // Do not show navbar on login page or while loading auth state
    if (pathname === '/login' || isLoading || !isAuthenticated) return null;

    const handleLogout = () => {
        logout();
    };

    const navItems = [
        { href: '/dashboard', icon: Home, label: 'Inicio', active: pathname === '/dashboard', roles: ['ADMIN', 'CLIENTE', 'TECNICO', 'OPERADOR'] },
        { href: '/reports', icon: FileText, label: 'Historial', active: pathname === '/reports', roles: ['ADMIN', 'CLIENTE', 'TECNICO', 'OPERADOR'] },
        { href: '/scan', icon: QrCode, label: 'Scanner', active: pathname === '/scan', floating: true, roles: ['ADMIN', 'TECNICO', 'OPERADOR'] },
        { href: '/analytics', icon: BarChart3, label: 'Kpis', active: pathname === '/analytics', hideOnMobile: true, roles: ['ADMIN', 'CLIENTE'] },
    ];

    const adminItem = { href: '/admin/users', icon: Settings, label: 'Admin', active: pathname.startsWith('/admin') };

    return (
        <nav className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-md border-t border-slate-200 z-50 pb-safe md:fixed md:top-0 md:left-0 md:h-screen md:w-64 md:border-r md:border-t-0 md:flex md:flex-col">
            <div className="flex justify-around items-center h-16 w-full px-2 md:flex-col md:justify-start md:items-start md:h-full md:p-6 md:space-y-6">
                <div className="hidden md:block text-2xl font-black mb-8 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    CMMS
                </div>

                <div className="flex w-full justify-around items-center md:flex-col md:justify-start md:items-start md:space-y-4 md:w-auto">
                    {navItems.map((item) => (
                        <RoleGuard key={item.href} allowedRoles={item.roles}>
                            <Link
                                href={item.href}
                                className={`flex flex-col items-center justify-center w-full md:w-auto md:flex-row md:justify-start md:space-x-3 p-1 rounded-xl transition-all interactive ${item.hideOnMobile ? 'hidden md:flex' : 'flex'} ${item.active ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                            >
                                {item.floating ? (
                                    <div className="bg-blue-600 text-white p-3.5 rounded-full -mt-12 shadow-lg shadow-blue-200 border-4 border-white md:mt-0 md:p-0 md:bg-transparent md:text-inherit md:shadow-none md:border-0">
                                        <item.icon size={24} />
                                    </div>
                                ) : (
                                    <item.icon size={24} className={item.active ? 'scale-110 transition-transform' : ''} />
                                )}
                                <span className={`text-[10px] font-bold mt-1 md:mt-0 md:text-sm ${item.active ? 'opacity-100' : 'opacity-70'} ${item.floating ? 'md:inline' : ''}`}>
                                    {item.label}
                                </span>
                            </Link>
                        </RoleGuard>
                    ))}

                    <RoleGuard allowedRoles={['ADMIN', 'TECNICO']}>
                        <Link
                            href={adminItem.href}
                            className={`flex flex-col items-center justify-center w-full md:w-auto md:flex-row md:justify-start md:space-x-3 p-1 rounded-xl transition-all interactive ${adminItem.active ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                        >
                            <adminItem.icon size={24} className={adminItem.active ? 'scale-110 transition-transform' : ''} />
                            <span className={`text-[10px] font-bold mt-1 md:mt-0 md:text-sm ${adminItem.active ? 'opacity-100' : 'opacity-70'}`}>
                                {adminItem.label}
                            </span>
                        </Link>
                    </RoleGuard>

                    <button onClick={handleLogout} className="flex flex-col items-center justify-center w-full md:w-auto md:flex-row md:justify-start md:space-x-3 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all interactive md:mt-auto">
                        <LogOut size={24} />
                        <span className="text-[10px] font-bold mt-1 md:mt-0 md:text-sm">Salir</span>
                    </button>
                </div>
            </div>
        </nav>
    );
}
