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
        <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 md:relative md:border-t-0 md:h-screen md:w-64 md:flex-col md:border-r">
            <div className="flex justify-around items-center h-16 md:flex-col md:justify-start md:h-full md:items-start md:p-4 md:space-y-4">
                <div className="hidden md:block text-xl font-bold mb-4 text-blue-600">CMMS App</div>

                <Link href="/dashboard" className="flex flex-col items-center md:flex-row md:space-x-3 text-gray-600 hover:text-blue-600">
                    <Home size={24} />
                    <span className="text-xs md:text-base">Home</span>
                </Link>

                <Link href="/scan" className="flex flex-col items-center md:flex-row md:space-x-3 text-gray-600 hover:text-blue-600">
                    <div className="bg-blue-600 text-white p-2 rounded-full -mt-8 border-4 border-white md:mt-0 md:bg-transparent md:text-gray-600 md:p-0 md:border-0 md:hover:text-blue-600">
                        <QrCode size={24} />
                    </div>
                    <span className="text-xs md:text-base md:hidden">Scan</span>
                    <span className="hidden md:inline">Scan QR</span>
                </Link>

                <Link href="/settings" className="flex flex-col items-center md:flex-row md:space-x-3 text-gray-600 hover:text-blue-600">
                    <Settings size={24} />
                    <span className="text-xs md:text-base">Settings</span>
                </Link>

                <button onClick={handleLogout} className="flex flex-col items-center md:flex-row md:space-x-3 text-gray-600 hover:text-red-600 mt-auto">
                    <LogOut size={24} />
                    <span className="text-xs md:text-base">Logout</span>
                </button>
            </div>
        </nav>
    );
}
