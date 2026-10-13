import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Building2, Factory, LogOut } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const isHospital = user.role === 'HOSPITAL';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Portal Type */}
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs ${
            isHospital 
              ? 'bg-gradient-to-tr from-blue-600 to-indigo-600' 
              : 'bg-gradient-to-tr from-purple-600 to-indigo-800'
          }`}>
            {isHospital ? <Building2 className="w-5 h-5" /> : <Factory className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-900 text-base leading-tight">VaxTrack</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                isHospital
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-purple-50 text-purple-700 border-purple-200'
              }`}>
                {isHospital ? 'Hospital / Pharmacy Portal' : 'Manufacturer Logistics Portal'}
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              {isHospital 
                ? 'Clinical Inventory Control & Cold Storage Thermal Tracking'
                : 'Central Vaccine Production, Distribution & Demand Planning'}
            </p>
          </div>
        </div>

        {/* Right: Current Facility Identity & Logout (Strictly Isolated) */}
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-sm font-bold text-slate-900 flex items-center justify-end space-x-1.5">
              <span>{user.facility_name}</span>
            </div>
            <div className="text-xs text-slate-500">
              <span className={`inline-block w-2 h-2 rounded-full mr-1 ${isHospital ? 'bg-blue-500' : 'bg-purple-500'}`}></span>
              {user.facility_type} • {user.district}, {user.state}
            </div>
          </div>

          <button
            onClick={logout}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-xl transition-all shadow-2xs"
            title="Log out of current portal"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
