'use client';

import Link from 'next/link';
import { Home, QrCode, Settings, LogOut, FileText } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

export default function Navbar() {
    const router = useRouter();
    const pathname = usePathname();

    // Do not show navbar on login page
    if (pathname === '/login') return null;

    const handleLogout = () => {
        localStorage.removeItem('token');
        router.push('/login');
    };

    const navItems = [
        { href: '/dashboard', icon: Home, label: 'Inicio', active: pathname === '/dashboard' },
        { href: '/reports', icon: FileText, label: 'Historial', active: pathname === '/reports' },
        { href: '/scan', icon: QrCode, label: 'Scanner', active: pathname === '/scan', floating: true },
        { href: '/admin/users', icon: Settings, label: 'Admin', active: pathname.startsWith('/admin') },
        { href: '/analytics', icon: Settings, label: 'Kpis', active: pathname === '/analytics', hideOnMobile: true },
    ];

    return (
        <nav className="fixed bottom-0 w-full glass z-50 pb-safe md:relative md:h-screen md:w-64 md:flex-col md:border-r md:border-slate-200">
            <div className="flex justify-around items-end h-16 px-4 md:flex-col md:justify-start md:h-full md:items-start md:p-6 md:space-y-6">
                <div className="hidden md:block text-2xl font-black mb-8 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    CMMS
                </div>

                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex flex-col items-center md:flex-row md:space-x-4 transition-all interactive ${item.hideOnMobile ? 'hidden md:flex' : 'flex'} ${item.active ? 'text-primary' : 'text-slate-500 hover:text-blue-600'}`}
                    >
                        {item.floating ? (
                            <div className="bg-primary text-white p-4 rounded-full -mb-8 shadow-xl shadow-blue-200 border-4 border-background md:mb-0 md:bg-transparent md:text-inherit md:p-0 md:border-0 md:shadow-none translate-y-[-20%] md:translate-y-0">
                                <item.icon size={26} />
                            </div>
                        ) : (
                            <item.icon size={22} className={item.active ? 'scale-110' : ''} />
                        )}
                        <span className={`text-[10px] font-black uppercase tracking-tighter mt-1 md:mt-0 md:text-base md:normal-case md:tracking-normal ${item.floating ? 'md:inline' : ''} ${item.active ? 'opacity-100' : 'opacity-60'}`}>
                            {item.label}
                        </span>
                    </Link>
                ))}

                <button onClick={handleLogout} className="flex flex-col items-center md:flex-row md:space-x-4 text-slate-400 hover:text-red-500 mt-auto transition-colors interactive mb-2 md:mb-0">
                    <LogOut size={22} />
                    <span className="text-[10px] font-black uppercase tracking-tighter mt-1 md:mt-0 md:text-base md:normal-case md:tracking-normal opacity-60">Salir</span>
                </button>
            </div>
        </nav>
    );
}
