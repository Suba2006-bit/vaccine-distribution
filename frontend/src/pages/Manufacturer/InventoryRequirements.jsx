import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import {
  ClipboardList,
  Boxes,
  ShieldCheck,
  Package,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function InventoryRequirements() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getInventoryRequirements()
      .then((res) => setData(res))
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Manufacturing Inventory & Raw Material Requirements</h1>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Borosilicate Glass Vials"
          value={data?.total_glass_vials_needed?.toLocaleString() || '0'}
          icon={Package}
          color="purple"
        />
        <StatCard
          title="Isothermal Freight Boxes"
          value={data?.total_cold_boxes_needed?.toLocaleString() || '0'}
          icon={Boxes}
          color="blue"
        />
        <StatCard
          title="Raw Material Readiness"
          value={data?.buffer_raw_material_readiness || '94%'}
          icon={ShieldCheck}
          color="emerald"
        />
      </div>

      {/* Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Batch-by-Batch Material Allocation</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Batch Lot</th>
                <th className="py-3 px-4">Vaccine Target</th>
                <th className="py-3 px-4">Planned Output</th>
                <th className="py-3 px-4">Vials Needed</th>
                <th className="py-3 px-4">Elastomer Stoppers</th>
                <th className="py-3 px-4">Aluminum Seals</th>
                <th className="py-3 px-4">Shipping Boxes</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.requirements?.map((req) => (
                <tr key={req.plan_id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{req.batch_code}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{req.vaccine_name}</td>
                  <td className="py-3 px-4 font-bold text-purple-700">{req.planned_doses.toLocaleString()} doses</td>
                  <td className="py-3 px-4 text-slate-700 font-medium">{req.vials_required.toLocaleString()}</td>
                  <td className="py-3 px-4 text-slate-700">{req.elastomer_stoppers_required.toLocaleString()}</td>
                  <td className="py-3 px-4 text-slate-700">{req.aluminum_seals_required.toLocaleString()}</td>
                  <td className="py-3 px-4 font-bold text-blue-700">{req.isothermal_shipping_boxes} boxes</td>
                  <td className="py-3 px-4">
                    <Badge>{req.status}</Badge>
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
