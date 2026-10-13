import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import Badge from '../../components/Badge';
import {
  RefreshCw,
  Building2,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  Info
} from 'lucide-react';

export default function RedistributionHub() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

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

  useEffect(() => {
    loadData();
  }, []);

  const handleAction = async (recId, action) => {
    try {
      const res = await api.actionRedistribution(recId, action);
      setMessage(res.message);
      loadData();
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const activeRecs = recommendations.filter((r) => r.status === 'SUGGESTED');
  const pastRecs = recommendations.filter((r) => r.status !== 'SUGGESTED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold text-slate-900">Inter-Facility Redistribution Hub</h1>
          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-purple-100 text-purple-700 border border-purple-200 flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-purple-600" />
            <span>Smart AI Optimization</span>
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Matches surplus and near-expiry vaccine stock with regional health centers experiencing critical stockouts.
        </p>
      </div>

      {message && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-blue-600 font-bold hover:underline">
            ✕
          </button>
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

      {/* Educational Note */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 flex items-start space-x-3">
        <Info className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-slate-800">Smart Optimization Logic:</p>
          <p className="mt-0.5">
            The redistribution algorithm scans all facilities continuously. When a hospital has doses expiring faster than its predicted consumption rate, it matches that inventory to nearby clinics with empty stock, preventing millions of dollars in vaccine spoilage.
          </p>
        </div>
      </div>
    </div>
  );
}
