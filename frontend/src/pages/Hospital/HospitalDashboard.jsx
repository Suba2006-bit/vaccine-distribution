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
  SendHorizontal
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-blue-200">Facility Overview</span>
          <h1 className="text-2xl font-bold mt-1">{user.facility_name}</h1>
          <p className="text-xs text-blue-100 mt-1">
            {user.facility_type} • {user.district}, {user.state}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setActiveTab('thermal')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-semibold backdrop-blur-xs transition-all flex items-center space-x-2"
          >
            <ThermometerSnowflake className="w-4 h-4 text-cyan-300" />
            <span>Virtual Fridge Hub</span>
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className="px-4 py-2 bg-white text-blue-900 hover:bg-blue-50 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm"
          >
            <SendHorizontal className="w-4 h-4 text-blue-700" />
            <span>Order Vaccines</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Vaccine Doses"
          value={totalDoses.toLocaleString()}
          subtitle="Across active batches"
          icon={Boxes}
          color="blue"
        />
        <StatCard
          title="Cold Chain Health"
          value={thermalAnalysis ? `${thermalAnalysis.cold_chain_health_score}%` : '100%'}
          subtitle={thermalAnalysis ? `MKT: ${thermalAnalysis.mean_kinetic_temperature}°C` : 'Optimal'}
          icon={ThermometerSnowflake}
          color={thermalAnalysis?.status === 'SAFE' ? 'emerald' : thermalAnalysis?.status === 'WARNING' ? 'amber' : 'rose'}
        />
        <StatCard
          title="Shortage Alerts"
          value={shortagesCount}
          subtitle="Vaccines below safety reserve"
          icon={AlertTriangle}
          color={shortagesCount > 0 ? 'rose' : 'emerald'}
        />
        <StatCard
          title="Expiring Within 45 Days"
          value={expiringCount}
          subtitle="Eligible for redistribution"
          icon={Clock}
          color={expiringCount > 0 ? 'amber' : 'emerald'}
        />
      </div>

      {/* Thermal Alert Banner if Compromised */}
      {thermalAnalysis && thermalAnalysis.status !== 'SAFE' && (
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          thermalAnalysis.status === 'CRITICAL_QUARANTINE'
            ? 'bg-rose-50 border-rose-200 text-rose-900'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <div className="flex items-center space-x-3">
            <ShieldAlert className="w-6 h-6 shrink-0" />
            <div>
              <p className="text-sm font-bold">
                {thermalAnalysis.status === 'CRITICAL_QUARANTINE'
                  ? 'CRITICAL COLD-CHAIN INTEGRITY WARNING'
                  : 'THERMAL EXCURSION WARNING'}
              </p>
              <p className="text-xs mt-0.5">{thermalAnalysis.recommended_action}</p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('thermal')}
            className="px-3 py-1.5 bg-white text-xs font-semibold rounded-lg shadow-xs hover:bg-slate-50 transition-colors shrink-0"
          >
            Investigate in Thermal Hub →
          </button>
        </div>
      )}

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Inventory Quick View */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Vaccine Batches Status</h2>
              <p className="text-xs text-slate-500">Active refrigeration lots with FEFO expiry monitoring</p>
            </div>
            <button
              onClick={() => setActiveTab('inventory')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
            >
              <span>View All Batches</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-y border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Batch Number</th>
                  <th className="py-2.5 px-3">Vaccine</th>
                  <th className="py-2.5 px-3">Doses</th>
                  <th className="py-2.5 px-3">Expiry Date</th>
                  <th className="py-2.5 px-3">Days Left</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {safeBatches.slice(0, 6).map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{b.batch_number}</td>
                    <td className="py-2.5 px-3 text-slate-600">{b.vaccine_name}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{b.current_doses}</td>
                    <td className="py-2.5 px-3 text-slate-500">{b.expiry_date.slice(0, 10)}</td>
                    <td className="py-2.5 px-3">
                      <span className={b.days_to_expiry <= 45 ? 'text-amber-600 font-bold' : 'text-slate-600'}>
                        {b.days_to_expiry}d
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
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
          {/* Stock Balances */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-1">Stock Criticality</h2>
            <p className="text-xs text-slate-500 mb-3">Days of supply remaining by vaccine</p>

            <div className="space-y-3">
              {safeStockStatus.slice(0, 5).map((s) => (
                <div key={s.vaccine_id} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <div className="font-semibold text-slate-800">{s.vaccine_name}</div>
                    <div className="text-[11px] text-slate-500">{s.current_stock} doses ({s.days_of_supply_remaining}d supply)</div>
                  </div>
                  <Badge>{s.status}</Badge>
                </div>
              ))}
            </div>

            <button
              onClick={() => setActiveTab('stock')}
              className="mt-4 w-full py-2 text-xs font-semibold text-center text-blue-600 hover:bg-blue-50 rounded-xl border border-blue-200 transition-colors"
            >
              Analyze Safety Stock & ROP →
            </button>
          </div>

          {/* Quick Shortcuts */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-4 border border-indigo-100 text-xs">
            <h3 className="font-bold text-indigo-950 mb-1">Need Replenishment?</h3>
            <p className="text-indigo-800 mb-3">
              Submit an electronic supply order directly to Apex Biologics manufacturer.
            </p>
            <button
              onClick={() => setActiveTab('requests')}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors shadow-xs"
            >
              Open Vaccine Order Desk
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
