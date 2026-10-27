import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import Badge from '../../components/Badge';
import {
  RefreshCw,
  Building2,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  PackagePlus,
  SendHorizontal
} from 'lucide-react';

export default function RedistributionHub() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [availableStock, setAvailableStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [requestedDoses, setRequestedDoses] = useState(100);
  const [requestReason, setRequestReason] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const loadData = async () => {
    try {
      const recs = await api.getRedistributions();
      setRecommendations(recs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableStock = async () => {
    try {
      const stock = await api.getRedistributionAvailableStock(user.id);
      setAvailableStock(stock);
      setSelectedBatchId((current) => current || (stock[0] ? String(stock[0].batch_id) : ''));
      if (stock[0]) {
        setRequestedDoses((current) => Math.min(current, stock[0].available_doses));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
    loadAvailableStock();
  }, []);

  const handleAction = async (recId, action) => {
    try {
      const res = await api.actionRedistribution(recId, action, user.id);
      setMessage(res.message);
      await Promise.all([loadData(), loadAvailableStock()]);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleCreateRequest = async (event) => {
    event.preventDefault();
    setSubmittingRequest(true);
    setMessage('');
    try {
      const res = await api.createRedistributionRequest({
        facility_id: user.id,
        batch_id: Number(selectedBatchId),
        requested_doses: Number(requestedDoses),
        reason: requestReason,
      });
      setMessage(res.message);
      setShowRequestForm(false);
      setRequestReason('');
      await loadData();
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSubmittingRequest(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const involvesCurrentFacility = (recommendation) =>
    recommendation.source_facility_id === user.id || recommendation.target_facility_id === user.id;
  const activeRecs = recommendations.filter((r) => r.status === 'SUGGESTED' && involvesCurrentFacility(r));
  const incomingRequests = recommendations.filter(
    (r) => r.status === 'REQUESTED' && r.source_facility_id === user.id
  );
  const outgoingRequests = recommendations.filter(
    (r) => r.status === 'REQUESTED' && r.target_facility_id === user.id
  );
  const pastRecs = recommendations.filter(
    (r) => r.status !== 'SUGGESTED' && r.status !== 'REQUESTED' && involvesCurrentFacility(r)
  );
  const selectedStock = availableStock.find((stock) => String(stock.batch_id) === selectedBatchId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Inter-Facility Redistribution Hub</h1>
        <button
          type="button"
          onClick={() => setShowRequestForm((visible) => !visible)}
          disabled={availableStock.length === 0}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center space-x-1.5 shrink-0"
        >
          <PackagePlus className="w-4 h-4" />
          <span>Request Vaccine</span>
        </button>
      </div>

      {showRequestForm && (
        <form onSubmit={handleCreateRequest} className="bg-white border border-blue-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="text-xs font-semibold text-slate-700 space-y-1">
              <span>Available hospital stock</span>
              <select
                required
                value={selectedBatchId}
                onChange={(event) => {
                  const batchId = event.target.value;
                  const stock = availableStock.find((item) => String(item.batch_id) === batchId);
                  setSelectedBatchId(batchId);
                  if (stock) setRequestedDoses(Math.min(requestedDoses, stock.available_doses));
                }}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 font-normal"
              >
                {availableStock.map((stock) => (
                  <option key={stock.batch_id} value={stock.batch_id}>
                    {stock.vaccine_name} from {stock.source_facility_name} ({stock.available_doses} doses)
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-700 space-y-1">
              <span>Doses requested</span>
              <input
                required
                type="number"
                min="1"
                max={selectedStock?.available_doses}
                value={requestedDoses}
                onChange={(event) => setRequestedDoses(event.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 font-normal"
              />
            </label>
            <label className="text-xs font-semibold text-slate-700 space-y-1">
              <span>Reason (optional)</span>
              <input
                value={requestReason}
                onChange={(event) => setRequestReason(event.target.value)}
                placeholder="e.g. low stock before clinic day"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 font-normal"
              />
            </label>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submittingRequest || !selectedStock}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center space-x-1.5"
            >
              <SendHorizontal className="w-3.5 h-3.5" />
              <span>{submittingRequest ? 'Sending...' : 'Send Request'}</span>
            </button>
          </div>
        </form>
      )}

      {message && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-blue-600 font-bold hover:underline">
            ✕
          </button>
        </div>
      )}

      {incomingRequests.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-900">Requests from Other Hospitals ({incomingRequests.length})</h2>
          {incomingRequests.map((request) => (
            <div key={request.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-purple-50/70 border border-purple-200 rounded-2xl p-4">
              <div className="flex items-start space-x-3">
                <Building2 className="w-4 h-4 text-purple-700 mt-0.5 shrink-0" />
                <div className="text-xs text-slate-700">
                  <div className="font-bold text-slate-900">
                    {request.target_facility_name} requests {request.recommended_doses} doses of {request.vaccine_name}
                  </div>
                  <div className="text-slate-500">Batch {request.batch_number} · {request.target_district}</div>
                  {request.reason && <div className="mt-1">{request.reason}</div>}
                </div>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleAction(request.id, 'REJECT')}
                  className="px-3 py-2 text-xs font-bold text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 rounded-lg"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => handleAction(request.id, 'ACCEPT')}
                  className="px-3 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                >
                  Accept &amp; Transfer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {outgoingRequests.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-900">Requests Sent ({outgoingRequests.length})</h2>
          {outgoingRequests.map((request) => (
            <div key={request.id} className="flex items-center justify-between gap-3 bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-xs">
              <span className="font-semibold text-slate-800">
                {request.recommended_doses} doses of {request.vaccine_name} from {request.source_facility_name}
              </span>
              <Badge>{request.status}</Badge>
            </div>
          ))}
        </div>
      )}

      {/* Active AI Recommendations Cards */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
          <span>Active Transfer Recommendations ({activeRecs.length})</span>
        </h2>

        {activeRecs.length === 0 ? (
          <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center text-xs text-slate-500">
            ✓ No urgent redistribution transfers required. Regional cold storage stock is currently balanced.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeRecs.map((rec) => {
              const isSource = rec.source_facility_id === user.id;
              const isTarget = rec.target_facility_id === user.id;

              return (
                <div
                  key={rec.id}
                  className="bg-white rounded-2xl border-2 border-indigo-100 p-5 shadow-xs hover:border-indigo-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
                        {rec.vaccine_name}
                      </span>
                      <Badge>{rec.status}</Badge>
                    </div>

                    {/* Source -> Target Visual */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex-1">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Source (Surplus / Expiry)</div>
                        <div className="font-bold text-slate-800 truncate">{rec.source_facility_name}</div>
                        <div className="text-[11px] text-slate-500">{rec.source_district}</div>
                      </div>

                      <div className="px-3 text-center shrink-0">
                        <ArrowRight className="w-5 h-5 text-indigo-600 mx-auto" />
                        <span className="text-[10px] font-bold text-indigo-700 block mt-0.5">
                          {rec.recommended_doses} doses
                        </span>
                      </div>

                      <div className="flex-1 text-right">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Target (Shortage)</div>
                        <div className="font-bold text-slate-800 truncate">{rec.target_facility_name}</div>
                        <div className="text-[11px] text-slate-500">{rec.target_district}</div>
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">Clinical Rationale:</span>
                      <p className="text-xs text-slate-700 leading-relaxed bg-amber-50/60 p-2.5 rounded-xl border border-amber-100/80">
                        {rec.reason}
                      </p>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center space-x-2">
                      <Boxes className="w-3.5 h-3.5 text-slate-400" />
                      <span>Batch: <strong>{rec.batch_number}</strong></span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleAction(rec.id, 'DISMISS')}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={() => handleAction(rec.id, 'ACCEPT')}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Execute Redistribution Transfer</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Completed Transfers History */}
      {pastRecs.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-3">Redistribution History</h2>
          <div className="space-y-2">
            {pastRecs.map((r) => (
              <div key={r.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800">{r.recommended_doses} doses of {r.vaccine_name}</span>
                  <span className="text-slate-500"> ({r.source_facility_name} → {r.target_facility_name})</span>
                </div>
                <Badge>{r.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
