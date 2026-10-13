import React from 'react';
import { Building2, Factory, ShieldCheck, ArrowRight, ThermometerSnowflake, TrendingUp, Boxes, Truck } from 'lucide-react';

export default function PortalLanding({ onSelectPortal }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 text-white flex flex-col justify-between p-6 sm:p-10">
      {/* Top Header */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold tracking-tight text-white">VaxTrack</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                CSE Software Project
              </span>
            </div>
            <p className="text-xs text-slate-400">Vaccine Distribution & Cold Storage Thermal Hub</p>
          </div>
        </div>
        <div className="hidden sm:block text-xs text-slate-400 text-right">
          Dual-Portal Architecture • Role-Based Authentication
        </div>
      </div>

      {/* Main Choice Section */}
      <div className="max-w-5xl w-full mx-auto py-12">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Select Your Designated Portal
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Please choose your user category to access the specialized login page and tailored analytics dashboard.
          </p>
        </div>

        {/* Two Separate Portal Doorways */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* Card 1: Hospital & Pharmacy Doorway */}
          <div
            onClick={() => onSelectPortal('HOSPITAL')}
            className="group relative bg-slate-900/80 hover:bg-slate-900 border-2 border-blue-500/30 hover:border-blue-500 rounded-3xl p-8 transition-all duration-300 cursor-pointer shadow-xl hover:shadow-2xl hover:shadow-blue-500/10 flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all mb-6">
                <Building2 className="w-7 h-7" />
              </div>

              <div className="inline-block text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-1">
                Portal 1
              </div>
              <h2 className="text-2xl font-bold text-white group-hover:text-blue-300 transition-colors">
                Hospital / Pharmacy Login
              </h2>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                For clinical staff, hospital pharmacists, and health centers to manage batch inventory, view AI demand forecasts, track simulated cold-room temperatures, and place replenishment requests.
              </p>

              {/* Feature Tags */}
              <div className="mt-6 flex flex-wrap gap-2 text-[11px] text-slate-300">
                <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg flex items-center space-x-1">
                  <ThermometerSnowflake className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Virtual Fridge Hub</span>
                </span>
                <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg flex items-center space-x-1">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                  <span>AI Demand Predictor</span>
                </span>
                <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg flex items-center space-x-1">
                  <Boxes className="w-3.5 h-3.5 text-emerald-400" />
                  <span>FEFO Expiry Control</span>
                </span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between text-blue-400 font-bold text-sm group-hover:text-blue-300">
              <span>Go to Hospital Login Page</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </div>

          {/* Card 2: Manufacturer Doorway */}
          <div
            onClick={() => onSelectPortal('MANUFACTURER')}
            className="group relative bg-slate-900/80 hover:bg-slate-900 border-2 border-purple-500/30 hover:border-purple-500 rounded-3xl p-8 transition-all duration-300 cursor-pointer shadow-xl hover:shadow-2xl hover:shadow-purple-500/10 flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-all mb-6">
                <Factory className="w-7 h-7" />
              </div>

              <div className="inline-block text-[11px] font-bold uppercase tracking-wider text-purple-400 mb-1">
                Portal 2
              </div>
              <h2 className="text-2xl font-bold text-white group-hover:text-purple-300 transition-colors">
                Manufacturer Login
              </h2>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                For pharmaceutical production plants and central distributors to manage aggregate national demand, fulfill hospital orders, schedule manufacturing runs, and monitor in-transit freight.
              </p>

              {/* Feature Tags */}
              <div className="mt-6 flex flex-wrap gap-2 text-[11px] text-slate-300">
                <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg flex items-center space-x-1">
                  <Factory className="w-3.5 h-3.5 text-purple-400" />
                  <span>Production Scheduling</span>
                </span>
                <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg flex items-center space-x-1">
                  <Truck className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Transit Temp Tracker</span>
                </span>
                <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg flex items-center space-x-1">
                  <Boxes className="w-3.5 h-3.5 text-amber-400" />
                  <span>Raw Materials Planner</span>
                </span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between text-purple-400 font-bold text-sm group-hover:text-purple-300">
              <span>Go to Manufacturer Login Page</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="max-w-6xl w-full mx-auto text-center text-xs text-slate-500 border-t border-white/5 pt-6">
        Software-Only Academic Project • Built with React 19, Tailwind CSS & Flask Python API
      </div>
    </div>
  );
}
