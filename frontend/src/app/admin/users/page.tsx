'use client';

import { Suspense, useEffect, useState } from 'react';
import { fetchUsers, createUser, User } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Save, X, User as UserIcon, Shield } from 'lucide-react';

function UsersListContent() {
    const router = useRouter();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        password: '',
        role: 'OPERATOR'
    });

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const data = await fetchUsers();
            setUsers(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createUser(formData);
            setShowModal(false);
            loadUsers();
            setFormData({
                full_name: '',
                email: '',
                password: '',
                role: 'OPERATOR'
            });
        } catch (err) {
            alert('Error creating user');
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="max-w-xl mx-auto pb-24 px-4 pt-6">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="p-2.5 bg-white shadow-sm border border-slate-100 rounded-2xl interactive text-slate-600">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Usuarios</h1>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Gestión de Personal</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-blue-200 interactive"
                >
                    <Plus size={24} />
                </button>
            </div>

            <div className="space-y-4">
                {users.map((user, idx) => (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={user.id}
                        className="premium-card p-5 flex items-center gap-4"
                    >
                        <div className={`p-3 rounded-full ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-600'}`}>
                            {user.role === 'ADMIN' ? <Shield size={20} /> : <UserIcon size={20} />}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">{user.full_name}</h3>
                            <p className="text-sm text-slate-500">{user.email}</p>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{user.role}</span>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl relative"
                    >
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <h2 className="text-xl font-black text-slate-900 mb-6">Nuevo Usuario</h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombre Completo</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    value={formData.full_name}
                                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Contraseña</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Rol</label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="OPERATOR">Operador</option>
                                    <option value="TECH">Técnico</option>
                                    <option value="ADMIN">Administrador</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-primary text-white py-4 rounded-xl font-black text-sm uppercase tracking-wider shadow-lg shadow-blue-200 hover:shadow-xl hover:translate-y-[-2px] transition-all flex items-center justify-center gap-2 mt-4"
                            >
                                <Save size={18} />
                                Crear Usuario
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}

export default function UsersPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <UsersListContent />
        </Suspense>
    );
}
