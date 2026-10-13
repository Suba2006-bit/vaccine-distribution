import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import Badge from '../../components/Badge';
import {
  SendHorizontal,
  Plus,
  Clock,
  CheckCircle2,
  Truck,
  PackageCheck,
  AlertCircle
} from 'lucide-react';

export default function VaccineRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [vaccines, setVaccines] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    vaccine_id: 1,
    requested_doses: 250,
    priority: 'ROUTINE',
    notes: ''
  });

  const loadRequests = async () => {
    try {
      const [rList, vList] = await Promise.all([
        api.getRequests(user.id, 'HOSPITAL'),
        api.getVaccines()
      ]);
      setRequests(rList);
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
    if (user) loadRequests();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createRequest({
        facility_id: user.id,
        vaccine_id: Number(formData.vaccine_id),
        requested_doses: Number(formData.requested_doses),
        priority: formData.priority,
        notes: formData.notes
      });
      setMessage('Vaccine order request submitted to manufacturer successfully!');
      setIsModalOpen(false);
      setFormData({
        vaccine_id: vaccines[0]?.id || 1,
        requested_doses: 250,
        priority: 'ROUTINE',
        notes: ''
      });
      loadRequests();
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const getStepStatus = (status) => {
    const steps = ['PENDING', 'APPROVED', 'DISPATCHED', 'DELIVERED'];
    return steps.indexOf(status);
  };

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
          <h1 className="text-2xl font-bold text-slate-900">Vaccine Order Requests</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Submit replenishment orders to vaccine manufacturers and track cold-chain freight delivery.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center space-x-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Supply Request</span>
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

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Vaccine</th>
                <th className="py-3 px-4">Requested Doses</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Manufacturer</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Status & Cold Transit</th>
                <th className="py-3 px-4">Fulfillment Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((r) => {
                const stepIdx = getStepStatus(r.status);
                return (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">#ORD-{r.id.toString().padStart(4, '0')}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{r.vaccine_name}</td>
                    <td className="py-3 px-4 font-bold text-blue-700">{r.requested_doses.toLocaleString()} doses</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        r.priority === 'URGENT' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {r.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{r.manufacturer_name || 'Apex Biologics'}</td>
                    <td className="py-3 px-4 text-slate-500">{r.created_at?.slice(0, 10)}</td>
                    <td className="py-3 px-4">
                      <Badge>{r.status}</Badge>
                      {r.status === 'DISPATCHED' && (
                        <span className="block text-[10px] text-emerald-600 font-medium mt-0.5">
                          In Transit ({r.transit_temperature}°C)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                      {r.dispatch_notes || r.notes || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Create Vaccine Supply Order</h3>
            <p className="text-xs text-slate-500 mb-4">
              Transmit order demand to central manufacturing logistics.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Vaccine</label>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Required Doses</label>
                <input
                  type="number"
                  min="50"
                  step="10"
                  value={formData.requested_doses}
                  onChange={(e) => setFormData({ ...formData, requested_doses: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Order Priority</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, priority: 'ROUTINE' })}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                      formData.priority === 'ROUTINE'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Routine (Standard 5-7 days)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, priority: 'URGENT' })}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                      formData.priority === 'URGENT'
                        ? 'border-rose-500 bg-rose-50 text-rose-700'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Urgent (Emergency 24-48h)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Rationale / Notes</label>
                <textarea
                  rows="3"
                  placeholder="e.g. Replenishment for upcoming district pediatric immunization camp..."
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Send Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
