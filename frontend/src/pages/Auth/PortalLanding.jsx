import React from 'react';
import { Building2, Factory, ShieldCheck, ArrowRight, ThermometerSnowflake, TrendingUp, Boxes, Truck } from 'lucide-react';

export default function PortalLanding({ onSelectPortal }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-indigo-50 to-purple-100 text-slate-900 flex flex-col justify-between p-6 sm:p-10">

      {/* Top Header */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-blue-700" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-slate-900">VaxTrack</span>
            <p className="text-xs text-slate-500">Vaccine Distribution & Cold Storage Thermal Hub</p>
          </div>
        </div>
        <div className="hidden sm:block text-xs text-slate-500 font-medium text-right">
          Dual-Portal Architecture • Role-Based Authentication
        </div>
      </div>

      {/* Main Choice Section */}
      <div className="max-w-5xl w-full mx-auto py-12">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Select Your Designated Portal
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Please choose your user category to access the specialized login page and tailored analytics dashboard.
          </p>
        </div>

        {/* Two Separate Portal Doorways */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* Card 1: Hospital & Pharmacy Doorway */}
          <div
            onClick={() => onSelectPortal('HOSPITAL')}
            className="group relative bg-blue-50/80 hover:bg-blue-100/80 border-2 border-blue-200 hover:border-blue-300 rounded-3xl p-8 transition-all duration-300 cursor-pointer shadow-lg shadow-blue-100/60 hover:shadow-xl hover:shadow-blue-200/60 flex flex-col justify-between"
          >
            <div className="flex flex-1 flex-col">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 group-hover:bg-blue-200 transition-all mb-6">
                <Building2 className="w-7 h-7" />
              </div>

              <div className="inline-block text-[11px] font-bold uppercase tracking-wider text-blue-600 mb-1">
                Portal 1
              </div>
              <h2 className="text-2xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                Hospital / Pharmacy Login
              </h2>
              {/* Feature Tags */}
              <div className="mt-auto pt-6 flex flex-wrap gap-2 text-[11px] text-slate-700">
                <span className="px-2.5 py-1 bg-blue-100/70 border border-blue-200 rounded-lg flex items-center space-x-1 font-medium">
                  <ThermometerSnowflake className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Virtual Fridge Hub</span>
                </span>
                <span className="px-2.5 py-1 bg-blue-100/70 border border-blue-200 rounded-lg flex items-center space-x-1 font-medium">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                  <span>AI Demand Predictor</span>
                </span>
                <span className="px-2.5 py-1 bg-blue-100/70 border border-blue-200 rounded-lg flex items-center space-x-1 font-medium">
                  <Boxes className="w-3.5 h-3.5 text-emerald-600" />
                  <span>FEFO Expiry Control</span>
                </span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-blue-600 font-bold text-sm group-hover:text-blue-700">
              <span>Go to Hospital Login Page</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </div>

          {/* Card 2: Manufacturer Doorway */}
          <div
            onClick={() => onSelectPortal('MANUFACTURER')}
            className="group relative bg-purple-50/80 hover:bg-purple-100/80 border-2 border-purple-200 hover:border-purple-300 rounded-3xl p-8 transition-all duration-300 cursor-pointer shadow-lg shadow-purple-100/60 hover:shadow-xl hover:shadow-purple-200/60 flex flex-col justify-between"
          >
            <div className="flex flex-1 flex-col">
              <div className="w-14 h-14 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 group-hover:bg-purple-200 transition-all mb-6">
                <Factory className="w-7 h-7" />
              </div>

              <div className="inline-block text-[11px] font-bold uppercase tracking-wider text-purple-600 mb-1">
                Portal 2
              </div>
              <h2 className="text-2xl font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                Manufacturer Login
              </h2>
              {/* Feature Tags */}
              <div className="mt-auto pt-6 flex flex-wrap gap-2 text-[11px] text-slate-700">
                <span className="px-2.5 py-1 bg-purple-100/70 border border-purple-200 rounded-lg flex items-center space-x-1 font-medium">
                  <Factory className="w-3.5 h-3.5 text-purple-600" />
                  <span>Production Scheduling</span>
                </span>
                <span className="px-2.5 py-1 bg-purple-100/70 border border-purple-200 rounded-lg flex items-center space-x-1 font-medium">
                  <Truck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Transit Temp Tracker</span>
                </span>
                <span className="px-2.5 py-1 bg-purple-100/70 border border-purple-200 rounded-lg flex items-center space-x-1 font-medium">
                  <Boxes className="w-3.5 h-3.5 text-amber-600" />
                  <span>Raw Materials Planner</span>
                </span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-purple-600 font-bold text-sm group-hover:text-purple-700">
              <span>Go to Manufacturer Login Page</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
