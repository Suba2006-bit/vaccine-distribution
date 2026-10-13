import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import Badge from '../../components/Badge';
import {
  Factory,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles
} from 'lucide-react';

export default function SupplyPlanning() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [vaccines, setVaccines] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const [formData, setFormData] = useState({
    vaccine_id: 1,
    planned_doses: 25000,
    target_completion_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    batch_code: `APX-BATCH-${new Date().toISOString().slice(5, 10).replace('-', '')}`,
    notes: 'Standard automated cleanroom vial filling run.'
  });

  const loadData = async () => {
    try {
      const [pList, vList] = await Promise.all([
        api.getProductionPlans(),
        api.getVaccines()
      ]);
      setPlans(pList);
      setVaccines(vList);
      if (vList.length > 0 && !formData.vaccine_id) {
        setFormData((prev) => ({ ...prev, vaccine_id: vList[0].id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createProductionPlan({
        manufacturer_id: user.id,
        ...formData,
        planned_doses: Number(formData.planned_doses),
        vaccine_id: Number(formData.vaccine_id)
      });
      setMessage(`Production batch '${formData.batch_code}' scheduled successfully!`);
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vaccine Production & Supply Scheduling</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Plan bulk manufacturing schedules, cleanroom filling allocations, and lot numbering.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center space-x-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Production Lot</span>
        </button>
      </div>

      {message && (
        <div className="p-3 bg-purple-50 border border-purple-200 text-purple-800 rounded-xl text-xs flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-purple-600 font-bold hover:underline">
            ✕
          </button>
        </div>
      )}

      {/* Production Batches Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Batch Lot Code</th>
                <th className="py-3 px-4">Vaccine</th>
                <th className="py-3 px-4">Planned Output Doses</th>
                <th className="py-3 px-4">Target Release Date</th>
                <th className="py-3 px-4">Production Stage</th>
                <th className="py-3 px-4">Notes & Quality Parameters</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {plans.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{p.batch_code}</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800">{p.vaccine_name}</div>
                    <div className="text-[11px] text-slate-400">{p.vaccine_type}</div>
                  </td>
                  <td className="py-3 px-4 font-bold text-purple-700 text-sm">{p.planned_doses.toLocaleString()} doses</td>
                  <td className="py-3 px-4 text-slate-600">{p.target_completion_date}</td>
                  <td className="py-3 px-4">
                    <Badge>{p.status}</Badge>
                  </td>
                  <td className="py-3 px-4 text-slate-500 max-w-sm truncate">
                    {p.notes || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Schedule Production Run</h3>
            <p className="text-xs text-slate-500 mb-4">
              Allocate manufacturing line capacity to meet upcoming forecast requirements.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Vaccine</label>
                <select
                  value={formData.vaccine_id}
                  onChange={(e) => setFormData({ ...formData, vaccine_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  required
                >
                  {vaccines.map((v) => (
                    <option key={v.id} value={v.id}>{v.name} ({v.type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Lot / Batch Code</label>
                <input
                  type="text"
                  value={formData.batch_code}
                  onChange={(e) => setFormData({ ...formData, batch_code: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Planned Doses</label>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    value={formData.planned_doses}
                    onChange={(e) => setFormData({ ...formData, planned_doses: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Completion</label>
                  <input
                    type="date"
                    value={formData.target_completion_date}
                    onChange={(e) => setFormData({ ...formData, target_completion_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Manufacturing Line Notes</label>
                <textarea
                  rows="3"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Launch Production Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
