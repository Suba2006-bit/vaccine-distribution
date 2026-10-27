import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import Badge from '../../components/Badge';
import {
  PackageCheck,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  ThermometerSnowflake,
  Send,
  Building2
} from 'lucide-react';

export default function RequestFulfillment() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState('DISPATCH'); // DISPATCH or REJECT
  const [dispatchNotes, setDispatchNotes] = useState('Insulated cold-box with Phase Change Material packs.');
  const [transitTemp, setTransitTemp] = useState(4.2);
  const [message, setMessage] = useState('');

  const loadRequests = async () => {
    try {
      const list = await api.getRequests(user.id, 'MANUFACTURER');
      setRequests(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleUpdateStatus = async (reqId, newStatus) => {
    try {
      const res = await api.updateRequestStatus(reqId, {
        status: newStatus,
        dispatch_notes: dispatchNotes,
        transit_temperature: transitTemp
      });
      setMessage(res.message);
      setSelectedRequest(null);
      loadRequests();
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
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Hospital Order Fulfillment & Distribution</h1>
      </div>

      {message && (
        <div className="p-3 bg-purple-50 border border-purple-200 text-purple-800 rounded-xl text-xs flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-purple-600 font-bold hover:underline">
            ✕
          </button>
        </div>
      )}

      {/* Orders List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Requesting Hospital</th>
                <th className="py-3 px-4">Vaccine</th>
                <th className="py-3 px-4">Doses</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Current Status</th>
                <th className="py-3 px-4 text-right">Fulfillment Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">#ORD-{r.id.toString().padStart(4, '0')}</td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{r.requesting_facility_name}</div>
                    <div className="text-[11px] text-slate-500">{r.requesting_district}</div>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{r.vaccine_name}</td>
                  <td className="py-3 px-4 font-bold text-purple-700">{r.requested_doses.toLocaleString()} doses</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      r.priority === 'URGENT' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {r.priority}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500">{r.created_at?.slice(0, 10)}</td>
                  <td className="py-3 px-4">
                    <Badge>{r.status}</Badge>
                    {r.status === 'DISPATCHED' && (
                      <span className="block text-[10px] text-emerald-600 font-medium mt-0.5">
                        In Transit ({r.transit_temperature}°C)
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right space-x-1.5">
                    {r.status === 'PENDING' && (
                      <button
                        onClick={() => handleUpdateStatus(r.id, 'APPROVED')}
                        className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-bold text-[11px] transition-colors"
                      >
                        Approve
                      </button>
                    )}

                    {(r.status === 'PENDING' || r.status === 'APPROVED') && (
                      <button
                        onClick={() => {
                          setSelectedRequest(r);
                          setActionType('DISPATCH');
                        }}
                        className="px-2.5 py-1 bg-purple-600 text-white hover:bg-purple-700 rounded-lg font-bold text-[11px] shadow-xs transition-colors"
                      >
                        Dispatch Freight
                      </button>
                    )}

                    {r.status === 'DISPATCHED' && (
                      <button
                        onClick={() => handleUpdateStatus(r.id, 'DELIVERED')}
                        className="px-2.5 py-1 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-bold text-[11px] shadow-xs transition-colors"
                        title="Mark order received by hospital (adds doses to hospital inventory)"
                      >
                        Confirm Delivery
                      </button>
                    )}

                    {r.status === 'PENDING' && (
                      <button
                        onClick={() => handleUpdateStatus(r.id, 'REJECTED')}
                        className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded-lg font-medium text-[11px] transition-colors"
                      >
                        Reject
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dispatch Modal */}
      {selectedRequest && actionType === 'DISPATCH' && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Dispatch Cold-Chain Freight #ORD-{selectedRequest.id.toString().padStart(4, '0')}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Allocate cold boxes and initialize transit temperature tracking for {selectedRequest.requesting_facility_name}.
            </p>

            <div className="space-y-3.5">
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-xs">
                <div>Vaccine: <strong>{selectedRequest.vaccine_name}</strong></div>
                <div>Quantity: <strong>{selectedRequest.requested_doses} doses</strong></div>
                <div>Destination: <strong>{selectedRequest.requesting_facility_name} ({selectedRequest.requesting_district})</strong></div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Simulated In-Transit Temperature (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={transitTemp}
                  onChange={(e) => setTransitTemp(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  required
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Safe cold freight range: 2.0°C to 8.0°C
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cold-Packaging & Dispatch Notes
                </label>
                <textarea
                  rows="3"
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedRequest.id, 'DISPATCHED')}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5"
                >
                  <Truck className="w-4 h-4" />
                  <span>Confirm Dispatch</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
