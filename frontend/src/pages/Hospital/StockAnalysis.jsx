import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import Badge from '../../components/Badge';
import {
  Scale,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  PackagePlus
} from 'lucide-react';

export default function StockAnalysis({ setActiveTab }) {
  const { user } = useAuth();
  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.getStockStatus(user.id)
      .then((data) => setStockItems(data))
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

  const shortageItems = stockItems.filter((i) => i.status.includes('SHORTAGE') || i.status.includes('LOW'));
  const excessItems = stockItems.filter((i) => i.status === 'EXCESS_STOCK');
  const optimalItems = stockItems.filter((i) => i.status === 'OPTIMAL');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Shortage & Excess Stock Analysis</h1>
      </div>

      {/* Summary Stat Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Shortage Alerts</span>
            <div className="text-2xl font-black text-rose-900 mt-1">{shortageItems.length} Vaccines</div>
            <p className="text-[11px] text-rose-600 mt-0.5">Below 20 days runway</p>
          </div>
          <AlertTriangle className="w-8 h-8 text-rose-500 opacity-80" />
        </div>

        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Balanced / Optimal</span>
            <div className="text-2xl font-black text-emerald-900 mt-1">{optimalItems.length} Vaccines</div>
            <p className="text-[11px] text-emerald-600 mt-0.5">Within 20–65 days runway</p>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-80" />
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Excess Inventory</span>
            <div className="text-2xl font-black text-blue-900 mt-1">{excessItems.length} Vaccines</div>
            <p className="text-[11px] text-blue-600 mt-0.5">&gt; 65 days (Candidate for redistribution)</p>
          </div>
          <TrendingUp className="w-8 h-8 text-blue-500 opacity-80" />
        </div>
      </div>

      {/* Stock Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Inventory Status Matrix</h2>
          <span className="text-xs text-slate-400">Evaluated against past 30-day burn rate</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Vaccine</th>
                <th className="py-3 px-4">Current Stock</th>
                <th className="py-3 px-4">Daily Burn Rate</th>
                <th className="py-3 px-4">Days of Supply</th>
                <th className="py-3 px-4">Safety Stock (7d)</th>
                <th className="py-3 px-4">Reorder Point (14d)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stockItems.map((item) => (
                <tr key={item.vaccine_id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900">{item.vaccine_name}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{item.current_stock.toLocaleString()} doses</td>
                  <td className="py-3 px-4 text-slate-600">{item.daily_burn_rate} doses/day</td>
                  <td className="py-3 px-4">
                    <span className={`font-bold ${
                      item.days_of_supply_remaining < 14
                        ? 'text-rose-600'
                        : item.days_of_supply_remaining < 25
                        ? 'text-amber-600'
                        : item.days_of_supply_remaining > 65
                        ? 'text-blue-600'
                        : 'text-emerald-600'
                    }`}>
                      {item.days_of_supply_remaining} days
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500">{item.safety_stock_threshold} doses</td>
                  <td className="py-3 px-4 text-slate-500">{item.reorder_point} doses</td>
                  <td className="py-3 px-4">
                    <Badge>{item.status}</Badge>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {item.status.includes('SHORTAGE') || item.status.includes('LOW') ? (
                      <button
                        onClick={() => setActiveTab('requests')}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] shadow-xs transition-colors flex items-center space-x-1 ml-auto"
                      >
                        <PackagePlus className="w-3.5 h-3.5" />
                        <span>Order Now</span>
                      </button>
                    ) : item.status === 'EXCESS_STOCK' ? (
                      <button
                        onClick={() => setActiveTab('redistribution')}
                        className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-bold text-[11px] transition-colors ml-auto"
                      >
                        Redistribute
                      </button>
                    ) : (
                      <span className="text-slate-400 font-medium">Optimal</span>
                    )}
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
