import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Boxes,
  ThermometerSnowflake,
  TrendingUp,
  Scale,
  SendHorizontal,
  RefreshCw,
  HelpCircle,
  Factory,
  Truck,
  PackageCheck,
  ClipboardList
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const { user } = useAuth();
  if (!user) return null;

  const isHospital = user.role === 'HOSPITAL';

  const hospitalItems = [
    { id: 'dashboard', label: 'Hospital Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory & Batches', icon: Boxes },
    { id: 'thermal', label: 'Thermal Tracking Hub', icon: ThermometerSnowflake, highlight: true },
    { id: 'demand', label: 'Demand Forecasting', icon: TrendingUp },
    { id: 'stock', label: 'Shortage & Excess Stock', icon: Scale },
    { id: 'requests', label: 'Request Vaccines', icon: SendHorizontal },
    { id: 'redistribution', label: 'Redistribution Hub', icon: RefreshCw },
    { id: 'queries', label: 'Query Desk', icon: HelpCircle },
  ];

  const manufacturerItems = [
    { id: 'mfg-dashboard', label: 'Operations Dashboard', icon: LayoutDashboard },
    { id: 'mfg-demand', label: 'Aggregate Demand', icon: TrendingUp },
    { id: 'mfg-requests', label: 'Hospital Orders', icon: PackageCheck, badge: 'New' },
    { id: 'mfg-supply', label: 'Supply & Production', icon: Factory },
    { id: 'mfg-transit', label: 'Distribution & Transit', icon: Truck },
    { id: 'mfg-requirements', label: 'Inventory Requirements', icon: ClipboardList },
    { id: 'mfg-queries', label: 'Hospital Query Desk', icon: HelpCircle },
  ];

  const items = isHospital ? hospitalItems : manufacturerItems;
  const activeBg = isHospital ? 'bg-blue-600 text-white shadow-xs' : 'bg-purple-600 text-white shadow-xs';
  const iconColor = isHospital ? 'text-blue-600' : 'text-purple-600';

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between shrink-0">
      <div className="space-y-6">
        <div>
          <div className="px-3 mb-2 flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${isHospital ? 'text-blue-700' : 'text-purple-700'}`}>
              {isHospital ? '🏥 Hospital Navigation' : '🏭 Manufacturer Navigation'}
            </span>
          </div>

          <nav className="space-y-1">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? activeBg
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? iconColor : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.highlight && !isActive && (
                    <span className={`w-2 h-2 rounded-full ${isHospital ? 'bg-blue-600' : 'bg-purple-600'} animate-pulse`}></span>
                  )}
                  {item.badge && !isActive && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-700">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500">
        <p className="font-semibold text-slate-700">Strict Role Isolation</p>
        <p className="mt-0.5">
          {isHospital
            ? 'Only hospital inventory & cold storage tracking visible.'
            : 'Only manufacturing plant logistics & production visible.'}
        </p>
      </div>
    </aside>
  );
}
