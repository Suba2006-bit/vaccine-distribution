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
  ClipboardList,
  ChevronRight
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
      <div className="flex flex-col items-center justify-center min-h-[450px] space-y-4">
        <div className="w-12 h-12 rounded-2xl border-4 border-purple-200 border-t-purple-600 animate-spin"></div>
        <p className="text-xs font-bold text-slate-500 tracking-wider uppercase">Loading Manufacturer Control...</p>
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
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-100 via-indigo-100 to-purple-100 rounded-3xl p-7 text-slate-900 shadow-lg shadow-indigo-100/70 border border-indigo-200">

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] uppercase tracking-wider font-extrabold text-purple-800 bg-white/70 px-2.5 py-0.5 rounded-full border border-purple-200">
                Pharmaceutical Logistics &amp; Cleanroom Filling
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2 text-slate-900">
              {user.facility_name}
            </h1>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={() => setActiveTab('mfg-requests')}
              className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold text-blue-800 transition-all duration-200 flex items-center space-x-2 shadow-xs cursor-pointer active:scale-95"
            >
              <PackageCheck className="w-4 h-4 text-blue-700" />
              <span>Hospital Orders ({pendingRequests.length} Pending)</span>
            </button>
            <button
              onClick={() => setActiveTab('mfg-supply')}
              className="px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center space-x-2 shadow-sm cursor-pointer active:scale-95"
            >
              <span>+ Schedule Production</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="30-Day National Demand"
          value={totalForecastedNeed.toLocaleString()}
          icon={TrendingUp}
          color="purple"
        />
        <StatCard
          title="Pending Hospital Orders"
          value={pendingRequests.length}
          icon={PackageCheck}
          color={pendingRequests.length > 0 ? 'amber' : 'emerald'}
        />
        <StatCard
          title="Active Production Lots"
          value={totalInProduction.toLocaleString()}
          icon={Factory}
          color="blue"
        />
        <StatCard
          title="Shipments In Transit"
          value={dispatchedRequests.length}
          icon={Truck}
          color="emerald"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Pending Hospital Orders */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Incoming Hospital Order Requests</h2>
            </div>
            <button
              onClick={() => setActiveTab('mfg-requests')}
              className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center space-x-1 transition-colors group cursor-pointer"
            >
              <span>Manage All Orders</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Hospital Facility</th>
                  <th className="py-3 px-4">Vaccine</th>
                  <th className="py-3 px-4">Requested Doses</th>
                  <th className="py-3 px-4">Clinical Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {safeRequests.slice(0, 5).map((r) => (
                  <tr key={r.id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{r.requesting_facility_name}</td>
                    <td className="py-3 px-4 text-slate-700 font-semibold">{r.vaccine_name}</td>
                    <td className="py-3 px-4 font-extrabold text-purple-700">{r.requested_doses.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        r.priority === 'URGENT' ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {r.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge>{r.status}</Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setActiveTab('mfg-requests')}
                        className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-bold text-[11px] transition-colors border border-purple-200/60 cursor-pointer"
                      >
                        Review Order
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
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition-shadow">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight mb-4">Regional Demand Pulse</h2>

            <div className="space-y-3">
              {safeDemandSummary.map((d) => (
                <div key={d.vaccine_id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-800">{d.vaccine_name}</span>
                    <Badge size="sm">{d.production_urgency === 'HIGH' ? 'High Urgency' : 'Normal'}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span>Forecast 30d: <strong className="text-slate-800">{d.projected_demand_30d.toLocaleString()}</strong></span>
                    <span>Pending: <strong className="text-purple-700">{d.pending_hospital_orders}</strong></span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setActiveTab('mfg-demand')}
              className="mt-4 w-full py-2.5 text-xs font-bold text-center text-purple-600 hover:text-purple-700 hover:bg-purple-50/60 rounded-xl border border-purple-200 transition-all flex items-center justify-center space-x-1 cursor-pointer"
            >
              <span>Detailed Production Planning</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="relative overflow-hidden bg-gradient-to-br from-purple-950 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white border border-purple-500/20 shadow-md">
            <h3 className="font-extrabold text-sm mb-1 text-white">Raw Materials Readiness</h3>
            <p className="text-xs text-purple-100/80 mb-4 leading-relaxed font-medium">
              Check sterile glass vials, elastomer stoppers, and isothermal cold freight boxes.
            </p>
            <button
              onClick={() => setActiveTab('mfg-requirements')}
              className="w-full py-2.5 bg-white hover:bg-purple-50 text-purple-950 font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center justify-center space-x-1.5 cursor-pointer active:scale-95"
            >
              <ClipboardList className="w-3.5 h-3.5 text-purple-700" />
              <span>Inspect Material Requirements</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
