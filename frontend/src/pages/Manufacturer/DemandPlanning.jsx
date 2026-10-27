import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  TrendingUp,
  Factory,
  Boxes,
  Sparkles,
  AlertTriangle,
  Info
} from 'lucide-react';

export default function DemandPlanning({ setActiveTab }) {
  const [demandData, setDemandData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAggregateDemand()
      .then((data) => setDemandData(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const chartData = demandData.map((d) => ({
    name: d.vaccine_name,
    projected30d: d.projected_demand_30d,
    inProduction: d.units_in_production,
    pendingOrders: d.pending_hospital_orders,
  }));

  const total30d = demandData.reduce((acc, d) => acc + d.projected_demand_30d, 0);
  const totalInProd = demandData.reduce((acc, d) => acc + d.units_in_production, 0);
  const totalPending = demandData.reduce((acc, d) => acc + d.pending_hospital_orders, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">National Aggregate Demand Planning</h1>
        </div>

        <button
          onClick={() => setActiveTab('mfg-supply')}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center space-x-1.5 shrink-0"
        >
          <Factory className="w-4 h-4" />
          <span>Schedule Manufacturing Batch</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="30-Day Aggregate Demand"
          value={`${total30d.toLocaleString()} doses`}
          icon={TrendingUp}
          color="purple"
        />
        <StatCard
          title="Currently in Production"
          value={`${totalInProd.toLocaleString()} doses`}
          icon={Factory}
          color="blue"
        />
        <StatCard
          title="Pending Order Backlog"
          value={`${totalPending.toLocaleString()} doses`}
          icon={AlertTriangle}
          color={totalPending > totalInProd ? 'rose' : 'emerald'}
        />
      </div>

      {/* Comparison Chart */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Production vs Projected Hospital Demand</h2>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg text-xs space-y-1">
                        <div className="font-bold text-purple-300">{label}</div>
                        {payload.map((entry, idx) => (
                          <div key={idx} style={{ color: entry.color }}>
                            {entry.name}: {entry.value.toLocaleString()} doses
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              <Bar dataKey="projected30d" name="Projected 30d Demand" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="inProduction" name="In Production" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pendingOrders" name="Pending Hospital Orders" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Production Quota Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Production Planning & Recommended Batch Sizes</h2>
          <span className="text-xs text-slate-400">Includes 15% seasonal surge buffer</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Vaccine</th>
                <th className="py-3 px-4">Monthly Burn Rate</th>
                <th className="py-3 px-4">Forecasted 30d Need</th>
                <th className="py-3 px-4">Forecasted 90d Need</th>
                <th className="py-3 px-4">Pending Orders</th>
                <th className="py-3 px-4">Recommended Batch</th>
                <th className="py-3 px-4">Urgency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {demandData.map((d) => (
                <tr key={d.vaccine_id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900">{d.vaccine_name}</td>
                  <td className="py-3 px-4 text-slate-600">{d.monthly_burn_rate.toLocaleString()} doses</td>
                  <td className="py-3 px-4 font-semibold text-purple-700">{d.projected_demand_30d.toLocaleString()} doses</td>
                  <td className="py-3 px-4 text-slate-600">{d.projected_demand_90d.toLocaleString()} doses</td>
                  <td className="py-3 px-4 font-bold text-slate-800">{d.pending_hospital_orders}</td>
                  <td className="py-3 px-4 font-bold text-blue-700">{d.recommended_batch_size.toLocaleString()} doses</td>
                  <td className="py-3 px-4">
                    <Badge>{d.production_urgency === 'HIGH' ? 'High Urgency' : 'Normal'}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
