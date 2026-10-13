import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import {
  Factory,
  PackageCheck,
  TrendingUp,
  Truck,
  ArrowRight,
  Boxes,
  ClipboardList
} from 'lucide-react';

export default function ManufacturerDashboard({ setActiveTab }) {
  const { user } = useAuth();
  const [demandSummary, setDemandSummary] = useState([]);
  const [requests, setRequests] = useState([]);
  const [productionPlans, setProductionPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getAggregateDemand(),
      api.getRequests(user.id, 'MANUFACTURER'),
      api.getProductionPlans(),
    ])
      .then(([d, r, p]) => {
        setDemandSummary(d);
        setRequests(r);
        setProductionPlans(p);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const safeRequests = Array.isArray(requests) ? requests : [];
  const safeDemandSummary = Array.isArray(demandSummary) ? demandSummary : [];
  const safeProductionPlans = Array.isArray(productionPlans) ? productionPlans : [];

  const pendingRequests = safeRequests.filter((r) => r.status === 'PENDING');
  const dispatchedRequests = safeRequests.filter((r) => r.status === 'DISPATCHED');
  const totalForecastedNeed = safeDemandSummary.reduce((acc, d) => acc + (d.projected_demand_30d || 0), 0);
  const totalInProduction = safeProductionPlans.reduce((acc, p) => p.status !== 'COMPLETED' ? acc + (p.planned_doses || 0) : acc, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-800 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-purple-200">Central Logistics Control</span>
          <h1 className="text-2xl font-bold mt-1">{user.facility_name}</h1>
          <p className="text-xs text-purple-100 mt-1">
            Manufacturing Facility • {user.district}, {user.state}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setActiveTab('mfg-requests')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-semibold backdrop-blur-xs transition-all flex items-center space-x-1.5"
          >
            <PackageCheck className="w-4 h-4 text-purple-300" />
            <span>Hospital Orders ({pendingRequests.length} Pending)</span>
          </button>
          <button
            onClick={() => setActiveTab('mfg-supply')}
            className="px-4 py-2 bg-white text-purple-900 hover:bg-purple-50 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            + Schedule Production
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="30-Day National Demand"
          value={totalForecastedNeed.toLocaleString()}
          subtitle="Aggregated hospital forecast"
          icon={TrendingUp}
          color="purple"
        />
        <StatCard
          title="Pending Hospital Orders"
          value={pendingRequests.length}
          subtitle="Awaiting dispatch review"
          icon={PackageCheck}
          color={pendingRequests.length > 0 ? 'amber' : 'emerald'}
        />
        <StatCard
          title="Active Production Lots"
          value={totalInProduction.toLocaleString()}
          subtitle="Doses in current filling batches"
          icon={Factory}
          color="blue"
        />
        <StatCard
          title="Shipments In Transit"
          value={dispatchedRequests.length}
          subtitle="Cold-chain freight in transit"
          icon={Truck}
          color="emerald"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Pending Hospital Orders */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Incoming Hospital Order Requests</h2>
              <p className="text-xs text-slate-500">Replenishment orders filed by healthcare facilities</p>
            </div>
            <button
              onClick={() => setActiveTab('mfg-requests')}
              className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center space-x-1"
            >
              <span>Manage All Orders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-y border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Hospital</th>
                  <th className="py-2.5 px-3">Vaccine</th>
                  <th className="py-2.5 px-3">Requested Doses</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {safeRequests.slice(0, 5).map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{r.requesting_facility_name}</td>
                    <td className="py-2.5 px-3 text-slate-700">{r.vaccine_name}</td>
                    <td className="py-2.5 px-3 font-bold text-purple-700">{r.requested_doses.toLocaleString()}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        r.priority === 'URGENT' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {r.priority}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge>{r.status}</Badge>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => setActiveTab('mfg-requests')}
                        className="px-2.5 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg font-bold text-[11px] transition-colors"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: National Demand Snapshot */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-1">Regional Demand Pulse</h2>
            <p className="text-xs text-slate-500 mb-3">Projected monthly requirements by vaccine</p>

            <div className="space-y-3">
              {safeDemandSummary.map((d) => (
                <div key={d.vaccine_id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-800">{d.vaccine_name}</span>
                    <Badge size="sm">{d.production_urgency === 'HIGH' ? 'High Urgency' : 'Normal'}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Forecast 30d: <strong>{d.projected_demand_30d.toLocaleString()}</strong></span>
                    <span>Pending: <strong>{d.pending_hospital_orders}</strong></span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setActiveTab('mfg-demand')}
              className="mt-4 w-full py-2 text-xs font-semibold text-center text-purple-600 hover:bg-purple-50 rounded-xl border border-purple-200 transition-colors"
            >
              Detailed Production Planning →
            </button>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-4 border border-purple-100 text-xs">
            <h3 className="font-bold text-purple-950 mb-1">Raw Materials Readiness</h3>
            <p className="text-purple-800 mb-3">
              Check glass vials, elastomer stoppers, and cold freight box supply.
            </p>
            <button
              onClick={() => setActiveTab('mfg-requirements')}
              className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors shadow-xs"
            >
              Inspect Material Requirements
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
