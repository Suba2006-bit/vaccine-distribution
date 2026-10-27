import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'blue', trend = null }) {
  const colorMap = {
    blue: {
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-100',
      topLine: 'from-blue-500 to-indigo-500',
      shadow: 'group-hover:shadow-blue-500/10'
    },
    emerald: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      border: 'border-emerald-100',
      topLine: 'from-emerald-500 to-teal-500',
      shadow: 'group-hover:shadow-emerald-500/10'
    },
    amber: {
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      border: 'border-amber-100',
      topLine: 'from-amber-500 to-orange-500',
      shadow: 'group-hover:shadow-amber-500/10'
    },
    rose: {
      bg: 'bg-rose-50',
      text: 'text-rose-600',
      border: 'border-rose-100',
      topLine: 'from-rose-500 to-red-500',
      shadow: 'group-hover:shadow-rose-500/10'
    },
    purple: {
      bg: 'bg-purple-50',
      text: 'text-purple-600',
      border: 'border-purple-100',
      topLine: 'from-purple-500 to-pink-500',
      shadow: 'group-hover:shadow-purple-500/10'
    },
    cyan: {
      bg: 'bg-cyan-50',
      text: 'text-cyan-600',
      border: 'border-cyan-100',
      topLine: 'from-cyan-500 to-blue-500',
      shadow: 'group-hover:shadow-cyan-500/10'
    }
  };

  const scheme = colorMap[color] || colorMap.blue;

  return (
    <div className="group relative bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-xl transition-all duration-300 card-hover overflow-hidden flex flex-col justify-between">
      {/* Top accent gradient bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${scheme.topLine} opacity-80`} />

      <div>
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</p>
          {Icon && (
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${scheme.bg} ${scheme.text} border ${scheme.border} transition-transform duration-300 group-hover:scale-105 shadow-xs`}>
              <Icon className="w-5 h-5" />
            </div>
          )}
        </div>
        <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1.5">{value}</h3>
      </div>

      {(subtitle || trend) && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs text-slate-500 font-medium">
          {trend && (
            <span className={`inline-flex items-center font-bold mr-1.5 px-1.5 py-0.5 rounded text-[10px] ${
              trend.positive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            }`}>
              {trend.positive ? '↑' : '↓'} {trend.label}
            </span>
          )}
          <span className="truncate">{subtitle}</span>
        </div>
      )}
    </div>
  );
}
