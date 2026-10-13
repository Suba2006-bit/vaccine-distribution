import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'blue', trend = null }) {
  const colorMap = {
    blue: {
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-100'
    },
    emerald: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      border: 'border-emerald-100'
    },
    amber: {
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      border: 'border-amber-100'
    },
    rose: {
      bg: 'bg-rose-50',
      text: 'text-rose-600',
      border: 'border-rose-100'
    },
    purple: {
      bg: 'bg-purple-50',
      text: 'text-purple-600',
      border: 'border-purple-100'
    },
  };

  const scheme = colorMap[color] || colorMap.blue;

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
        </div>
        {Icon && (
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${scheme.bg} ${scheme.text} border ${scheme.border}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
      {(subtitle || trend) && (
        <div className="mt-3 flex items-center text-xs text-slate-500">
          {trend && (
            <span className={`font-semibold mr-1.5 ${trend.positive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {trend.positive ? '↑' : '↓'} {trend.label}
            </span>
          )}
          <span>{subtitle}</span>
        </div>
      )}
    </div>
  );
}
