'use client';

import Link from 'next/link';
import { Home, QrCode, Settings, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Navbar() {
    const router = useRouter();

    const handleLogout = () => {
        localStorage.removeItem('token');
        router.push('/login');
    };

    return (
        <nav className="fixed bottom-0 w-full glass z-50 md:relative md:h-screen md:w-64 md:flex-col md:border-r md:border-slate-200">
            <div className="flex justify-around items-center h-16 md:flex-col md:justify-start md:h-full md:items-start md:p-6 md:space-y-6">
                <div className="hidden md:block text-2xl font-black mb-8 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    CMMS
                </div>

                <Link href="/dashboard" className="flex flex-col items-center md:flex-row md:space-x-4 text-slate-500 hover:text-blue-600 transition-colors interactive">
                    <Home size={22} />
                    <span className="text-[10px] font-medium md:text-base">Inicio</span>
                </Link>

                <Link href="/scan" className="relative flex flex-col items-center md:flex-row md:space-x-4 text-slate-500 hover:text-blue-600 transition-colors interactive">
                    <div className="bg-primary text-white p-3 rounded-2xl -mt-10 shadow-lg shadow-blue-200 border-4 border-background md:mt-0 md:bg-transparent md:text-slate-500 md:p-0 md:border-0 md:shadow-none md:hover:text-blue-600">
                        <QrCode size={24} />
                    </div>
                    <span className="text-[10px] font-medium md:text-base md:hidden mt-1">Scanner</span>
                    <span className="hidden md:inline">Scanner QR</span>
                </Link>

                <Link href="/settings" className="flex flex-col items-center md:flex-row md:space-x-4 text-slate-500 hover:text-blue-600 transition-colors interactive">
                    <Settings size={22} />
                    <span className="text-[10px] font-medium md:text-base">Ajustes</span>
                </Link>

                <button onClick={handleLogout} className="flex flex-col items-center md:flex-row md:space-x-4 text-slate-400 hover:text-red-500 mt-auto transition-colors interactive">
                    <LogOut size={22} />
                    <span className="text-[10px] font-medium md:text-base">Salir</span>
                </button>
            </div>
        </nav>
    );
}
