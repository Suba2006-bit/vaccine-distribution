import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  Boxes,
  Calendar,
  AlertTriangle,
  Sparkles,
  Info
} from 'lucide-react';

export default function DemandForecasting() {
  const { user } = useAuth();
  const [vaccines, setVaccines] = useState([]);
  const [selectedVaccineId, setSelectedVaccineId] = useState(1);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getVaccines()
      .then((vList) => {
        setVaccines(vList);
        if (vList.length > 0) setSelectedVaccineId(vList[0].id);
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (!user || !selectedVaccineId) return;
    setLoading(true);
    api.getDemandForecast(user.id, selectedVaccineId)
      .then((data) => setForecast(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [user, selectedVaccineId]);

  if (!forecast && loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const chartData = forecast?.daily_projections?.map((p) => ({
    date: p.date.slice(5),
    day: p.day_of_week,
    predicted: p.predicted_doses,
    lower: p.confidence_lower,
    upper: p.confidence_upper,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900">AI Future Demand Forecasting</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              <span>Time-Series ML</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Predicts future patient demand, seasonal variations, and inventory depletion velocity.
          </p>
        </div>

        {/* Vaccine Dropdown */}
        <div className="flex items-center space-x-2">
          <label className="text-xs font-semibold text-slate-600">Select Vaccine:</label>
          <select
            value={selectedVaccineId}
            onChange={(e) => setSelectedVaccineId(Number(e.target.value))}
            className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {vaccines.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.type})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Current In Stock"
          value={forecast ? `${forecast.current_stock.toLocaleString()} doses` : '0'}
          subtitle={`Available reserve (${forecast?.days_of_stock_remaining}d supply)`}
          icon={Boxes}
          color="blue"
        />
        <StatCard
          title="7-Day Predicted Need"
          value={forecast ? `${forecast.forecast_7_days.toLocaleString()} doses` : '0'}
          subtitle={`Daily avg ~${forecast?.average_daily_consumption} doses/day`}
          icon={Calendar}
          color="emerald"
        />
        <StatCard
          title="30-Day Predicted Need"
          value={forecast ? `${forecast.forecast_30_days.toLocaleString()} doses` : '0'}
          subtitle="Monthly forecasted requirement"
          icon={TrendingUp}
          color="indigo"
        />
        <StatCard
          title="90-Day Predicted Need"
          value={forecast ? `${forecast.forecast_90_days.toLocaleString()} doses` : '0'}
          subtitle="Quarterly buffer target"
          icon={Sparkles}
          color="purple"
        />
      </div>

      {/* Forecast Status Banner */}
      {forecast && (
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          forecast.shortage_risk === 'CRITICAL_SHORTAGE'
            ? 'bg-rose-50 border-rose-200 text-rose-900'
            : forecast.shortage_risk === 'EXCESS_STOCK'
            ? 'bg-blue-50 border-blue-200 text-blue-900'
            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider">
              Predicted Inventory Runway:
            </span>
            <p className="text-sm font-semibold mt-0.5">
              Current stock provides <strong>{forecast.days_of_stock_remaining} days</strong> of coverage at projected consumption rates.
            </p>
          </div>
          <Badge size="lg">{forecast.shortage_risk}</Badge>
        </div>
      )}

      {/* 30-Day Interactive Area/Line Projection Chart */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            30-Day Daily Demand Projections with Confidence Intervals
          </h2>
          <p className="text-xs text-slate-500">
            Predicted daily dose requirements incorporating day-of-week clinic scheduling and 95% confidence bounds (±15%).
          </p>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="boundGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit=" doses" />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg text-xs space-y-1">
                        <div className="font-bold text-indigo-300">{data.date} ({data.day})</div>
                        <div className="text-sm font-black text-white">
                          Predicted: {data.predicted} doses
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Confidence Range: {data.lower} – {data.upper} doses
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="upper"
                stroke="#cbd5e1"
                fill="url(#boundGrad)"
                strokeDasharray="2 2"
              />
              <Area
                type="monotone"
                dataKey="predicted"
                stroke="#4f46e5"
                strokeWidth={2.5}
                fill="url(#forecastGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Model Rationale Info */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 flex items-start space-x-3">
        <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-slate-800">Forecasting Methodology:</p>
          <p className="mt-0.5">
            Model synthesizes 60 days of historical facility administration logs using linear trend estimation combined with day-of-week seasonality factors (Tuesdays/Wednesdays feature pediatric clinic peaks; Sundays reflect minimum emergency administration).
          </p>
        </div>
      </div>
    </div>
  );
}
