'use client';
import { useEffect, useState } from 'react';
import { ClientService } from '@/services/client.service';
import { Client } from '@/types';

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newClient, setNewClient] = useState({
        name: '',
        contact_email: '',
        phone: '',
        subscription_plan: 'BASIC',
        billing_address: '',
        tax_id: ''
    });

    useEffect(() => {
        loadClients();
    }, []);

    const loadClients = async () => {
        setLoading(true);
        try {
            const data = await ClientService.getClients();
            setClients(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await ClientService.createClient(newClient);
            setIsModalOpen(false);
            setNewClient({
                name: '',
                contact_email: '',
                phone: '',
                subscription_plan: 'BASIC',
                billing_address: '',
                tax_id: ''
            });
            loadClients();
        } catch (error) {
            alert('Error creating client');
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-slate-800">Empresas (Clientes)</h1>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                    + Nueva Empresa
                </button>
            </div>

            {loading ? (
                <p>Cargando...</p>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-800 font-semibold border-b">
                            <tr>
                                <th className="p-4">Nombre</th>
                                <th className="p-4">Plan</th>
                                <th className="p-4">Contacto</th>
                                <th className="p-4">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {clients.map((client) => (
                                <tr key={client.id} className="hover:bg-slate-50">
                                    <td className="p-4 font-medium text-slate-900">{client.name}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold
                                            ${client.subscription_plan === 'ENTERPRISE' ? 'bg-purple-100 text-purple-700' :
                                                client.subscription_plan === 'PRO' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}
                                        `}>
                                            {client.subscription_plan}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span>{client.contact_email}</span>
                                            <span className="text-xs text-slate-400">{client.phone}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`w-2 h-2 rounded-full inline-block mr-2 ${client.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                        {client.is_active ? 'Activo' : 'Inactivo'}
                                    </td>
                                </tr>
                            ))}
                            {clients.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-slate-400">
                                        No hay clientes registrados aún.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4">Registrar Empresa</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Razón Social</label>
                                <input
                                    className="w-full border rounded p-2"
                                    value={newClient.name}
                                    onChange={e => setNewClient({ ...newClient, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Email Contacto</label>
                                    <input
                                        className="w-full border rounded p-2"
                                        value={newClient.contact_email}
                                        onChange={e => setNewClient({ ...newClient, contact_email: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Teléfono</label>
                                    <input
                                        className="w-full border rounded p-2"
                                        value={newClient.phone}
                                        onChange={e => setNewClient({ ...newClient, phone: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Plan</label>
                                <select
                                    className="w-full border rounded p-2"
                                    value={newClient.subscription_plan}
                                    onChange={e => setNewClient({ ...newClient, subscription_plan: e.target.value })}
                                >
                                    <option value="BASIC">Básico</option>
                                    <option value="PRO">Pro</option>
                                    <option value="ENTERPRISE">Enterprise</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Dirección Fiscal</label>
                                <textarea
                                    className="w-full border rounded p-2"
                                    value={newClient.billing_address}
                                    onChange={e => setNewClient({ ...newClient, billing_address: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
