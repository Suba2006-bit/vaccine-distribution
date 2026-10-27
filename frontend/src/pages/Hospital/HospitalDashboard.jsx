import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import {
  Boxes,
  ThermometerSnowflake,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Clock,
  SendHorizontal,
  ChevronRight
} from 'lucide-react';

export default function HospitalDashboard({ setActiveTab }) {
  const { user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [thermalAnalysis, setThermalAnalysis] = useState(null);
  const [stockStatus, setStockStatus] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.getBatches(user.id),
      api.getThermalAnalysis(user.id),
      api.getStockStatus(user.id),
      api.getRequests(user.id, 'HOSPITAL'),
    ])
      .then(([b, t, s, r]) => {
        setBatches(b);
        setThermalAnalysis(t);
        setStockStatus(s);
        setRequests(r);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] space-y-4">
        <div className="w-12 h-12 rounded-2xl border-4 border-blue-200 border-t-blue-600 animate-spin"></div>
        <p className="text-xs font-bold text-slate-500 tracking-wider uppercase">Loading Hospital Dashboard...</p>
      </div>
    );
  }

  const safeBatches = Array.isArray(batches) ? batches : [];
  const safeStockStatus = Array.isArray(stockStatus) ? stockStatus : [];

  const totalDoses = safeBatches.reduce((acc, b) => (b.status === 'ACTIVE' ? acc + (b.current_doses || 0) : acc), 0);
  const expiringCount = safeBatches.filter((b) => b.status === 'ACTIVE' && b.is_expiring_soon).length;
  const quarantinedCount = safeBatches.filter((b) => b.status && b.status.includes('QUARANTINED')).length;
  const shortagesCount = safeStockStatus.filter((s) => s.status && s.status.includes('SHORTAGE')).length;

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-100 via-indigo-100 to-purple-100 rounded-3xl p-7 text-slate-900 shadow-lg shadow-indigo-100/70 border border-indigo-200">

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] uppercase tracking-wider font-extrabold text-blue-800 bg-white/70 px-2.5 py-0.5 rounded-full border border-blue-200">
                Clinical Cold-Chain Facility
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2 text-slate-900">
              {user.facility_name}
            </h1>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={() => setActiveTab('thermal')}
              className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold text-blue-800 transition-all duration-200 flex items-center space-x-2 shadow-xs cursor-pointer active:scale-95"
            >
              <ThermometerSnowflake className="w-4 h-4 text-blue-700" />
              <span>Thermal Tracking Hub</span>
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className="px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center space-x-2 shadow-sm cursor-pointer active:scale-95"
            >
              <SendHorizontal className="w-4 h-4 text-purple-700" />
              <span>Order Vaccines</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Vaccine Doses"
          value={totalDoses.toLocaleString()}
          icon={Boxes}
          color="blue"
        />
        <StatCard
          title="Cold Chain Health"
          value={thermalAnalysis ? `${thermalAnalysis.cold_chain_health_score}%` : '100%'}
          icon={ThermometerSnowflake}
          color={thermalAnalysis?.status === 'SAFE' ? 'emerald' : thermalAnalysis?.status === 'WARNING' ? 'amber' : 'rose'}
        />
        <StatCard
          title="Shortage Alerts"
          value={shortagesCount}
          icon={AlertTriangle}
          color={shortagesCount > 0 ? 'rose' : 'emerald'}
        />
        <StatCard
          title="Expiring Within 45 Days"
          value={expiringCount}
          icon={Clock}
          color={expiringCount > 0 ? 'amber' : 'emerald'}
        />
      </div>

      {/* Thermal Alert Banner if Compromised */}
      {thermalAnalysis && thermalAnalysis.status !== 'SAFE' && (
        <div className={`p-4 rounded-2xl border shadow-sm flex items-center justify-between transition-all ${
          thermalAnalysis.status === 'CRITICAL_QUARANTINE'
            ? 'bg-rose-50 border-rose-200 text-rose-900'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <div className="flex items-center space-x-3.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              thermalAnalysis.status === 'CRITICAL_QUARANTINE' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
            }`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-extrabold tracking-tight">
                {thermalAnalysis.status === 'CRITICAL_QUARANTINE'
                  ? 'CRITICAL COLD-CHAIN INTEGRITY WARNING'
                  : 'THERMAL EXCURSION WARNING'}
              </p>
              <p className="text-xs mt-0.5 font-medium opacity-90">{thermalAnalysis.recommended_action}</p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('thermal')}
            className="px-3.5 py-2 bg-white text-xs font-bold rounded-xl shadow-xs hover:bg-slate-50 transition-colors shrink-0 border border-slate-200/80 cursor-pointer"
          >
            Investigate in Thermal Hub →
          </button>
        </div>
      )}

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Inventory Quick View */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Vaccine Batches Status</h2>
            </div>
            <button
              onClick={() => setActiveTab('inventory')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1 transition-colors group cursor-pointer"
            >
              <span>View All Batches</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Batch Number</th>
                  <th className="py-3 px-4">Vaccine</th>
                  <th className="py-3 px-4">Doses</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Days Left</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {safeBatches.slice(0, 6).map((b) => (
                  <tr key={b.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{b.batch_number}</td>
                    <td className="py-3 px-4 text-slate-700 font-semibold">{b.vaccine_name}</td>
                    <td className="py-3 px-4 font-extrabold text-slate-900">{b.current_doses.toLocaleString()}</td>
                    <td className="py-3 px-4 text-slate-500">{b.expiry_date.slice(0, 10)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                        b.days_to_expiry <= 45 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-50 text-slate-700'
                      }`}>
                        {b.days_to_expiry}d
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge>{b.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Stock Criticality & Quick Actions */}
        <div className="space-y-6">
          {/* Stock Balances with Progress Meters */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition-shadow">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight mb-4">Stock Criticality</h2>

            <div className="space-y-3">
              {safeStockStatus.slice(0, 5).map((s) => {
                const supply = s.days_of_supply_remaining || 0;
                const percent = Math.min(Math.round((supply / 45) * 100), 100);
                return (
                  <div key={s.vaccine_id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-800">{s.vaccine_name}</span>
                      <Badge size="sm">{s.status}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mb-2">
                      <span>{s.current_stock?.toLocaleString()} doses</span>
                      <span className="font-bold text-slate-700">{supply}d supply</span>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          supply < 10 ? 'bg-rose-500' : supply < 20 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setActiveTab('stock')}
              className="mt-4 w-full py-2.5 text-xs font-bold text-center text-blue-600 hover:text-blue-700 hover:bg-blue-50/60 rounded-xl border border-blue-200 transition-all flex items-center justify-center space-x-1 cursor-pointer"
            >
              <span>Analyze Safety Stock & ROP</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Order Replenishment Card */}
          <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 rounded-3xl p-6 text-white border border-indigo-500/20 shadow-md">
            <h3 className="font-extrabold text-sm mb-1 text-white">Need Replenishment?</h3>
            <p className="text-xs text-indigo-100/80 mb-4 leading-relaxed font-medium">
              Submit an electronic supply order directly to Apex Biologics vaccine plant.
            </p>
            <button
              onClick={() => setActiveTab('requests')}
              className="w-full py-2.5 bg-white hover:bg-blue-50 text-blue-950 font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center justify-center space-x-1.5 cursor-pointer active:scale-95"
            >
              <SendHorizontal className="w-3.5 h-3.5 text-blue-700" />
              <span>Open Vaccine Order Desk</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
