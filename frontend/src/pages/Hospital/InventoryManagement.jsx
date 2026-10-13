import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import Badge from '../../components/Badge';
import {
  Boxes,
  Plus,
  MinusCircle,
  Search,
  Filter,
  AlertTriangle,
  Lock,
  Unlock,
  CheckCircle2,
  Calendar,
  Layers
} from 'lucide-react';

export default function InventoryManagement() {
  const { user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [vaccines, setVaccines] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isConsumeModalOpen, setIsConsumeModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [dosesToConsume, setDosesToConsume] = useState(10);
  const [message, setMessage] = useState('');

  // Add Batch Form
  const [newBatchData, setNewBatchData] = useState({
    batch_number: '',
    vaccine_id: 1,
    initial_doses: 500,
    current_doses: 500,
    manufacture_date: new Date().toISOString().slice(0, 10),
    expiry_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    cold_storage_unit: 'Main Cold Room A'
  });

  const loadData = async () => {
    try {
      const [bList, vList] = await Promise.all([
        api.getBatches(user.id),
        api.getVaccines()
      ]);
      setBatches(bList);
      setVaccines(vList);
      if (vList.length > 0 && !newBatchData.vaccine_id) {
        setNewBatchData((prev) => ({ ...prev, vaccine_id: vList[0].id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const handleConsumeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBatch) return;
    try {
      await api.consumeDoses(selectedBatch.id, dosesToConsume);
      setMessage(`Successfully administered ${dosesToConsume} doses from ${selectedBatch.batch_number}`);
      setIsConsumeModalOpen(false);
      loadData();
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleCreateBatchSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createBatch({
        ...newBatchData,
        facility_id: user.id,
        current_doses: Number(newBatchData.initial_doses),
        initial_doses: Number(newBatchData.initial_doses),
        vaccine_id: Number(newBatchData.vaccine_id)
      });
      setMessage(`Batch ${newBatchData.batch_number} added to cold storage inventory.`);
      setIsAddModalOpen(false);
      setNewBatchData({
        batch_number: '',
        vaccine_id: vaccines[0]?.id || 1,
        initial_doses: 500,
        current_doses: 500,
        manufacture_date: new Date().toISOString().slice(0, 10),
        expiry_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        cold_storage_unit: 'Main Cold Room A'
      });
      loadData();
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleToggleQuarantine = async (batch) => {
    const isQuarantined = batch.status.includes('QUARANTINED');
    const newStatus = isQuarantined ? 'ACTIVE' : 'QUARANTINED_HEAT';
    const reason = isQuarantined ? 'Manual Release after QA inspection' : 'Manual quarantine hold';
    try {
      await api.quarantineBatch(batch.id, newStatus, reason);
      setMessage(`Batch ${batch.batch_number} status set to ${newStatus}`);
      loadData();
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const filteredBatches = batches.filter((b) => {
    const matchesSearch =
      b.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.vaccine_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.cold_storage_unit.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'ACTIVE'
        ? b.status === 'ACTIVE'
        : statusFilter === 'QUARANTINED'
        ? b.status.includes('QUARANTINED')
        : statusFilter === 'EXPIRING'
        ? b.is_expiring_soon
        : true;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vaccine Inventory & Batch Control</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor refrigeration lots, FEFO expiry tracking, and dose administration.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center space-x-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Batch</span>
        </button>
      </div>

      {message && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-blue-600 font-bold hover:underline">
            ✕
          </button>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search batch #, vaccine, unit..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-600 shrink-0">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none"
          >
            <option value="ALL">All Batches</option>
            <option value="ACTIVE">Active Stock Only</option>
            <option value="QUARANTINED">Quarantined Lots</option>
            <option value="EXPIRING">Expiring Soon (≤ 45 days)</option>
          </select>
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Batch Number</th>
                <th className="py-3 px-4">Vaccine Name</th>
                <th className="py-3 px-4">Current / Initial Doses</th>
                <th className="py-3 px-4">Storage Location</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4">Days Left</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBatches.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900">{b.batch_number}</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800">{b.vaccine_name}</div>
                    <div className="text-[11px] text-slate-400">{b.vaccine_type}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{b.current_doses} <span className="text-slate-400 font-normal">/ {b.initial_doses}</span></div>
                    <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                      <div
                        className="bg-blue-600 h-full rounded-full"
                        style={{ width: `${Math.min((b.current_doses / b.initial_doses) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{b.cold_storage_unit}</td>
                  <td className="py-3 px-4 text-slate-500">{b.expiry_date.slice(0, 10)}</td>
                  <td className="py-3 px-4">
                    <span className={`font-bold ${b.days_to_expiry <= 45 ? 'text-amber-600' : 'text-slate-700'}`}>
                      {b.days_to_expiry} days
                    </span>
                    {b.is_expiring_soon && (
                      <span className="block text-[10px] text-amber-700 font-medium">FEFO Priority</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <Badge>{b.status}</Badge>
                    {b.quarantine_reason && (
                      <span className="block text-[10px] text-rose-600 mt-0.5 max-w-[140px] truncate" title={b.quarantine_reason}>
                        {b.quarantine_reason}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right space-x-1.5">
                    {b.status === 'ACTIVE' && (
                      <button
                        onClick={() => {
                          setSelectedBatch(b);
                          setIsConsumeModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-semibold transition-colors"
                        title="Simulate daily vaccination administration"
                      >
                        Administer Doses
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleQuarantine(b)}
                      className={`p-1 rounded-lg border transition-colors ${
                        b.status.includes('QUARANTINED')
                          ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          : 'border-rose-200 text-rose-700 hover:bg-rose-50'
                      }`}
                      title={b.status.includes('QUARANTINED') ? 'Release Batch' : 'Quarantine Batch'}
                    >
                      {b.status.includes('QUARANTINED') ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Administer / Consume Doses Modal */}
      {isConsumeModalOpen && selectedBatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Administer Vaccine Doses</h3>
            <p className="text-xs text-slate-500 mb-4">
              Simulate patient vaccinations from Batch <strong>{selectedBatch.batch_number}</strong> ({selectedBatch.vaccine_name}).
            </p>

            <form onSubmit={handleConsumeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Number of Doses Administered
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedBatch.current_doses}
                  value={dosesToConsume}
                  onChange={(e) => setDosesToConsume(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Available in batch: {selectedBatch.current_doses} doses
                </span>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConsumeModalOpen(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Confirm Administration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Batch Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Register New Vaccine Batch</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter delivery batch parameters for cold-storage cataloging.
            </p>

            <form onSubmit={handleCreateBatchSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Vaccine</label>
                <select
                  value={newBatchData.vaccine_id}
                  onChange={(e) => setNewBatchData({ ...newBatchData, vaccine_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  required
                >
                  {vaccines.map((v) => (
                    <option key={v.id} value={v.id}>{v.name} ({v.type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Batch Code</label>
                <input
                  type="text"
                  placeholder="e.g. COV-2026-X99"
                  value={newBatchData.batch_number}
                  onChange={(e) => setNewBatchData({ ...newBatchData, batch_number: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Total Doses</label>
                  <input
                    type="number"
                    min="10"
                    value={newBatchData.initial_doses}
                    onChange={(e) => setNewBatchData({ ...newBatchData, initial_doses: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Storage Unit</label>
                  <select
                    value={newBatchData.cold_storage_unit}
                    onChange={(e) => setNewBatchData({ ...newBatchData, cold_storage_unit: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  >
                    <option value="Main Cold Room A">Main Cold Room A</option>
                    <option value="Secondary Cold Unit">Secondary Cold Unit</option>
                    <option value="Pediatric Fridge B">Pediatric Fridge B</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Manufacture Date</label>
                  <input
                    type="date"
                    value={newBatchData.manufacture_date}
                    onChange={(e) => setNewBatchData({ ...newBatchData, manufacture_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={newBatchData.expiry_date}
                    onChange={(e) => setNewBatchData({ ...newBatchData, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Save Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
