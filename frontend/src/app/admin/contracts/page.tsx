'use client';
import { useEffect, useState } from 'react';
import { ContractService } from '@/services/contract.service';
import { ClientService } from '@/services/client.service';
import { Client } from '@/types';

export default function ContractsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClient, setSelectedClient] = useState<string>('');
    const [contracts, setContracts] = useState<any[]>([]);
    const [slas, setSlas] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Forms
    const [showContractForm, setShowContractForm] = useState(false);
    const [showSLAForm, setShowSLAForm] = useState(false);

    useEffect(() => {
        loadClients();
    }, []);

    useEffect(() => {
        if (selectedClient) {
            loadClientDetails(selectedClient);
        }
    }, [selectedClient]);

    const loadClients = async () => {
        try {
            const data = await ClientService.getClients();
            setClients(data);
            if (data.length > 0) setSelectedClient(data[0].id);
        } catch (error) {
            console.error('Not admin or error fetching clients');
        }
    };

    const loadClientDetails = async (clientId: string) => {
        setLoading(true);
        try {
            const [cData, sData] = await Promise.all([
                ContractService.getContracts(clientId),
                ContractService.getSLAs(clientId)
            ]);
            setContracts(cData);
            setSlas(sData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-800 mb-8">Contratos y SLAs</h1>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
                <label className="block text-sm font-medium mb-2 text-slate-700">Seleccionar Cliente</label>
                <select
                    className="w-full md:w-1/3 border rounded-lg p-2 bg-slate-50"
                    value={selectedClient}
                    onChange={(e) => setSelectedClient(e.target.value)}
                >
                    {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            {selectedClient && (
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Contracts Section */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-slate-700">Contratos Vigentes</h2>
                            <button
                                onClick={() => setShowContractForm(true)}
                                className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200"
                            >
                                + Nuevo Contrato
                            </button>
                        </div>
                        <div className="space-y-4">
                            {contracts.map(contract => (
                                <div key={contract.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm relative overflow-hidden">
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${contract.is_active ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                    <div className="pl-2">
                                        <h3 className="font-bold text-slate-800">{contract.contract_type}</h3>
                                        <p className="text-sm text-slate-500">Desde: {new Date(contract.start_date).toLocaleDateString()}</p>
                                        <div className="mt-2 text-sm">
                                            {contract.monthly_fee > 0 && <div>Mensual: ${contract.monthly_fee}</div>}
                                            {contract.hourly_rate > 0 && <div>Por Hora: ${contract.hourly_rate}</div>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {contracts.length === 0 && <p className="text-slate-400 italic">Sin contratos activos.</p>}
                        </div>

                        {/* Simple Create Contract Form */}
                        {showContractForm && (
                            <div className="mt-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <h4 className="font-bold text-sm mb-2">Nuevo Contrato</h4>
                                <ContractForm
                                    clientId={selectedClient}
                                    onSuccess={() => { setShowContractForm(false); loadClientDetails(selectedClient); }}
                                    onCancel={() => setShowContractForm(false)}
                                />
                            </div>
                        )}
                    </div>

                    {/* SLAs Section */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-slate-700">Definición de SLAs</h2>
                            <button
                                onClick={() => setShowSLAForm(true)}
                                className="text-sm bg-indigo-100 text-indigo-700 px-3 py-1 rounded hover:bg-indigo-200"
                            >
                                + Nuevo SLA
                            </button>
                        </div>
                        <div className="space-y-4">
                            {slas.map(sla => (
                                <div key={sla.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center">
                                    <div>
                                        <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${sla.priority === 'ALTA' ? 'bg-red-100 text-red-700' :
                                            sla.priority === 'MEDIA' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                                            }`}>
                                            {sla.priority}
                                        </span>
                                        <div className="mt-2 text-sm text-slate-600">
                                            <p>Respuesta: <strong>{sla.max_response_minutes} min</strong></p>
                                            <p>Resolución: <strong>{sla.max_resolution_minutes} min</strong></p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-400">Penalización</p>
                                        <p className="font-bold text-red-600">${sla.penalty_per_breach}</p>
                                    </div>
                                </div>
                            ))}
                            {slas.length === 0 && <p className="text-slate-400 italic">Sin SLAs definidos.</p>}
                        </div>

                        {/* Simple Create SLA Form */}
                        {showSLAForm && (
                            <div className="mt-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <h4 className="font-bold text-sm mb-2">Nuevo SLA</h4>
                                <SLAForm
                                    clientId={selectedClient}
                                    onSuccess={() => { setShowSLAForm(false); loadClientDetails(selectedClient); }}
                                    onCancel={() => setShowSLAForm(false)}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function ContractForm({ clientId, onSuccess, onCancel }: { clientId: string, onSuccess: () => void, onCancel: () => void }) {
    const [data, setData] = useState({
        contract_type: 'MENSUAL_FIJO',
        monthly_fee: 0,
        hourly_rate: 0,
        start_date: new Date().toISOString().split('T')[0]
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await ContractService.createContract({ ...data, client_id: clientId });
        onSuccess();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <select
                className="w-full border rounded p-2 text-sm"
                value={data.contract_type}
                onChange={e => setData({ ...data, contract_type: e.target.value })}
            >
                <option value="MENSUAL_FIJO">Mensual Fijo</option>
                <option value="POR_HORA">Por Hora</option>
                <option value="POR_EVENTO">Por Evento</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
                <input
                    type="number" placeholder="Cuota Mensual" className="border rounded p-2 text-sm"
                    value={data.monthly_fee} onChange={e => setData({ ...data, monthly_fee: Number(e.target.value) })}
                />
                <input
                    type="number" placeholder="Tarifa Hora" className="border rounded p-2 text-sm"
                    value={data.hourly_rate} onChange={e => setData({ ...data, hourly_rate: Number(e.target.value) })}
                />
            </div>
            <input
                type="date" className="w-full border rounded p-2 text-sm"
                value={data.start_date} onChange={e => setData({ ...data, start_date: e.target.value })}
            />
            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="text-xs text-slate-500">Cancelar</button>
                <button type="submit" className="text-xs bg-blue-600 text-white px-3 py-1 rounded">Guardar</button>
            </div>
        </form>
    );
}

function SLAForm({ clientId, onSuccess, onCancel }: { clientId: string, onSuccess: () => void, onCancel: () => void }) {
    const [data, setData] = useState({
        priority: 'MEDIA',
        max_response_minutes: 60,
        max_resolution_minutes: 240,
        penalty_per_breach: 0
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await ContractService.createSLA({ ...data, client_id: clientId });
        onSuccess();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <select
                className="w-full border rounded p-2 text-sm"
                value={data.priority}
                onChange={e => setData({ ...data, priority: e.target.value })}
            >
                <option value="ALTA">Alta</option>
                <option value="MEDIA">Media</option>
                <option value="BAJA">Baja</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
                <input
                    type="number" placeholder="Max Resp (min)" className="border rounded p-2 text-sm"
                    value={data.max_response_minutes} onChange={e => setData({ ...data, max_response_minutes: Number(e.target.value) })}
                />
                <input
                    type="number" placeholder="Max Res (min)" className="border rounded p-2 text-sm"
                    value={data.max_resolution_minutes} onChange={e => setData({ ...data, max_resolution_minutes: Number(e.target.value) })}
                />
            </div>
            <input
                type="number" placeholder="Penalización ($)" className="w-full border rounded p-2 text-sm"
                value={data.penalty_per_breach} onChange={e => setData({ ...data, penalty_per_breach: Number(e.target.value) })}
            />
            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="text-xs text-slate-500">Cancelar</button>
                <button type="submit" className="text-xs bg-indigo-600 text-white px-3 py-1 rounded">Guardar</button>
            </div>
        </form>
    );
}
