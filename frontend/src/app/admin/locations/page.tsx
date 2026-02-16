'use client';
import { useEffect, useState } from 'react';
import { ClientLocation, fetchLocations, createClientLocation, fetchClients, Client } from '@/lib/api';

export default function LocationsPage() {
    const [locations, setLocations] = useState<ClientLocation[]>([]);
    const [clients, setClients] = useState<Client[]>([]); // For admin selector
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newLocation, setNewLocation] = useState({
        name: '',
        address: '',
        client_id: '',
        gps_latitude: 0,
        gps_longitude: 0
    });

    // Check user role (simplified) - in real app use context
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const locs = await fetchLocations();
            setLocations(locs);

            // If we can fetch clients, we are admin-ish
            try {
                const cls = await fetchClients();
                setClients(cls);
                setIsAdmin(true);
                if (cls.length > 0) setNewLocation(prev => ({ ...prev, client_id: cls[0].id }));
            } catch (e) {
                // Not admin, ignore
                setIsAdmin(false);
            }

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createClientLocation(newLocation);
            setIsModalOpen(false);
            setNewLocation(prev => ({ ...prev, name: '', address: '' }));
            loadData();
        } catch (error) {
            alert('Error creating location');
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-slate-800">Ubicaciones (Plantas/Cedis)</h1>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                    + Nueva Ubicación
                </button>
            </div>

            {loading ? (
                <p>Cargando...</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {locations.map((loc) => (
                        <div key={loc.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800">{loc.name}</h3>
                                    {/* @ts-ignore */}
                                    <p className="text-slate-500 text-sm mt-1">{loc.address || 'Sin dirección registrada'}</p>
                                </div>
                                <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
                                    📍
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-sm">
                                <span className="text-slate-400">ID: {loc.id.slice(0, 8)}...</span>
                                <button className="text-blue-600 hover:underline">Editar</button>
                            </div>
                        </div>
                    ))}
                    {locations.length === 0 && (
                        <div className="col-span-full p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                            No hay ubicaciones registradas.
                        </div>
                    )}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4">Nueva Ubicación</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            {isAdmin && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Cliente</label>
                                    <select
                                        className="w-full border rounded p-2"
                                        value={newLocation.client_id}
                                        onChange={e => setNewLocation({ ...newLocation, client_id: e.target.value })}
                                    >
                                        {clients.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium mb-1">Nombre (Ej: Planta Norte)</label>
                                <input
                                    className="w-full border rounded p-2"
                                    value={newLocation.name}
                                    onChange={e => setNewLocation({ ...newLocation, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Dirección</label>
                                <textarea
                                    className="w-full border rounded p-2"
                                    value={newLocation.address}
                                    onChange={e => setNewLocation({ ...newLocation, address: e.target.value })}
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
