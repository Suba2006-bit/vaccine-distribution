import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Building2, Factory, LogOut, ShieldCheck, Activity } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const isHospital = user.role === 'HOSPITAL';

  return (
    <header className="bg-gradient-to-r from-blue-50/95 via-indigo-50/95 to-purple-50/95 backdrop-blur-md border-b border-indigo-100 sticky top-0 z-30 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Portal Type */}
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-100 via-indigo-100 to-purple-100 text-indigo-700 flex items-center justify-center shadow-sm transition-transform duration-300 hover:scale-105">
            {isHospital ? <Building2 className="w-5 h-5" /> : <Factory className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-slate-900 text-lg tracking-tight">VaxTrack</span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
                {isHospital ? 'Clinical Hospital Portal' : 'Manufacturer Logistics Portal'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block font-medium">
              {isHospital 
                ? 'Cold-Chain Thermal Tracking & FEFO Inventory Control'
                : 'National Demand Planning & Cleanroom Supply Chain'}
            </p>
          </div>
        </div>

        {/* Right: Current Facility Identity & Sign Out */}
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-sm font-bold text-slate-900 flex items-center justify-end space-x-1.5">
              <span>{user.facility_name}</span>
            </div>
          </div>

          <button
            onClick={logout}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-xl transition-all duration-200 shadow-2xs cursor-pointer active:scale-95"
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
