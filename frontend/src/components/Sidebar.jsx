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
  ClipboardList,
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
    { id: 'mfg-requests', label: 'Hospital Orders', icon: PackageCheck, badge: 'Active' },
    { id: 'mfg-supply', label: 'Supply & Production', icon: Factory },
    { id: 'mfg-transit', label: 'Distribution & Transit', icon: Truck },
    { id: 'mfg-requirements', label: 'Inventory Requirements', icon: ClipboardList },
    { id: 'mfg-queries', label: 'Hospital Query Desk', icon: HelpCircle },
  ];

  const items = isHospital ? hospitalItems : manufacturerItems;
  const activeBg = 'bg-gradient-to-r from-blue-100 to-purple-100 text-indigo-900 border border-indigo-200 shadow-sm';
  const iconColor = 'text-indigo-600';

  return (
    <aside className="w-64 bg-gradient-to-b from-blue-50 via-indigo-50 to-purple-50 border-r border-indigo-100 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between shrink-0 shadow-xs">
      <div className="space-y-6">
        <div>
          <div className="px-3 mb-3 flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-700">
              {isHospital ? 'Healthcare Navigation' : 'Manufacturer Logistics'}
            </span>
          </div>

          <nav className="space-y-1.5">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group ${
                    isActive
                      ? activeBg
                      : 'text-slate-600 hover:text-indigo-900 hover:bg-blue-100/70'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${
                      isActive ? 'text-indigo-700' : item.highlight ? iconColor : 'text-slate-400'
                    }`} />
                    <span className="tracking-tight">{item.label}</span>
                  </div>
                  {item.highlight && !isActive && (
                    <span className="flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    </span>
                  )}
                  {item.badge && !isActive && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

    </aside>
  );
}
