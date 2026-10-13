import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import Badge from '../../components/Badge';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Legend
} from 'recharts';
import {
  ThermometerSnowflake,
  Play,
  RotateCcw,
  Zap,
  DoorOpen,
  PowerOff,
  Flame,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Info,
  Clock,
  Database,
  Layers,
  MapPin,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';

export default function ThermalTrackingHub() {
  const { user } = useAuth();
  // View Modes: 'DATASET' (the imported cold-chain dataset) or 'SIMULATOR' (interactive virtual fridge)
  const [activeMode, setActiveMode] = useState('DATASET');

  // Simulator State
  const [logs, setLogs] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState('DOOR_AJAR');
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [autoStream, setAutoStream] = useState(false);
  const [unitName, setUnitName] = useState('Main Cold Room A');
  const [actionMessage, setActionMessage] = useState('');
  const timerRef = useRef(null);

  // Dataset State
  const [datasetData, setDatasetData] = useState(null);
  const [datasetLoading, setDatasetLoading] = useState(false);
  const [phaseFilter, setPhaseFilter] = useState('ALL'); // 'ALL', 'ULTRA_LOW_FREEZER', 'REFRIGERATED_STORAGE', 'EXCURSION_DISCARD'

  const fetchThermalData = async () => {
    try {
      const [logList, analysisData] = await Promise.all([
        api.getThermalLogs(user.id, unitName, 40),
        api.getThermalAnalysis(user.id, unitName),
      ]);
      setLogs(logList);
      setAnalysis(analysisData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDatasetData = async () => {
    setDatasetLoading(true);
    try {
      const data = await api.getDatasetTelemetry();
      setDatasetData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setDatasetLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchThermalData();
      fetchDatasetData();
    }
  }, [user, unitName]);

  // Auto-stream continuous telemetry tick for simulator
  useEffect(() => {
    if (autoStream) {
      timerRef.current = setInterval(async () => {
        try {
          await api.simulateStep({
            facility_id: user.id,
            unit_name: unitName,
            scenario: selectedScenario
          });
          fetchThermalData();
        } catch (err) {
          console.error(err);
        }
      }, 2500);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoStream, selectedScenario, unitName]);

  const handleSimulateBurst = async () => {
    setSimulating(true);
    setActionMessage('');
    try {
      await api.simulateBurst({
        facility_id: user.id,
        unit_name: unitName,
        scenario: selectedScenario,
        count: 25
      });
      setActionMessage(`Generated 25 telemetry points under scenario: ${selectedScenario}`);
      await fetchThermalData();
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  const handleSimulateStep = async () => {
    try {
      await api.simulateStep({
        facility_id: user.id,
        unit_name: unitName,
        scenario: selectedScenario
      });
      await fetchThermalData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReset = async () => {
    setActionMessage('');
    try {
      await api.resetThermal({ facility_id: user.id, unit_name: unitName });
      setActionMessage('Reset thermal logs to optimal 4.5°C baseline.');
      await fetchThermalData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAutoQuarantine = async () => {
    try {
      const res = await api.autoQuarantine({
        facility_id: user.id,
        unit_name: unitName,
        reason: `Automated Cold-Chain Lock: MKT was ${analysis?.mean_kinetic_temperature}°C with ${analysis?.excursion_minutes_heat} mins heat excursion.`
      });
      setActionMessage(res.message);
    } catch (err) {
      console.error(err);
    }
  };

  // Format simulator data for chart
  const simChartData = logs.map((l) => ({
    time: l.timestamp ? l.timestamp.slice(11, 16) : '',
    temperature: l.temperature,
    safeMin: 2.0,
    safeMax: 8.0,
    door: l.door_status,
    power: l.power_status
  }));

  // Format dataset records for chart
  const datasetChartData = (datasetData?.chronological_records || [])
    .filter((r) => phaseFilter === 'ALL' || r.phase === phaseFilter)
    .map((r) => ({
      date: r.date.slice(0, 10),
      time: r.date,
      shipperTemp: r.shipper_temp,
      roomTemp: r.room_temp,
      humidity: r.room_humidity,
      expiryHours: r.item_expiry_hours,
      hop: r.current_hop,
      phase: r.phase
    }));

  const scenarios = [
    {
      id: 'OPTIMAL',
      label: 'Optimal Baseline',
      desc: 'Normal cold refrigeration at 4.5°C ± 0.6°C',
      icon: ShieldCheck,
      color: 'border-emerald-500 bg-emerald-50/50 text-emerald-800'
    },
    {
      id: 'DOOR_AJAR',
      label: 'Door Ajar Spike',
      desc: 'Heat intrusion rising to 10°C - 12°C',
      icon: DoorOpen,
      color: 'border-amber-500 bg-amber-50/50 text-amber-800'
    },
    {
      id: 'POWER_FAILURE',
      label: 'Compressor Failure',
      desc: 'Power loss: Temperature decays toward 24°C',
      icon: PowerOff,
      color: 'border-rose-500 bg-rose-50/50 text-rose-800'
    },
    {
      id: 'FREEZE_EXCURSION',
      label: 'Freezing Excursion',
      desc: 'Thermostat drop below 0°C (Freeze damage)',
      icon: ThermometerSnowflake,
      color: 'border-cyan-500 bg-cyan-50/50 text-cyan-800'
    },
  ];

  if (loading && !datasetData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const dsSummary = datasetData?.summary;
  const currentTemp = analysis?.current_temperature ?? 4.5;
  const mkt = analysis?.mean_kinetic_temperature ?? 4.5;
  const healthScore = analysis?.cold_chain_health_score ?? 100;
  const isBreached = currentTemp > 8.0 || currentTemp < 2.0;

  return (
    <div className="space-y-6">
      {/* Top Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900">Cold Storage & Thermal Tracking Hub</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-700">
              Live Software Analytics
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Switch between the imported real cold-chain dataset and the interactive thermodynamic simulator.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveMode('DATASET')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeMode === 'DATASET'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Dataset Mode (batch001)</span>
          </button>
          <button
            onClick={() => setActiveMode('SIMULATOR')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeMode === 'SIMULATOR'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Virtual Fridge Simulator</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage('')} className="text-blue-600 font-bold hover:underline">
            ✕
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 1: IMPORTED REAL-WORLD DATASET (batch001 - Jharkhand)     */}
      {/* ============================================================== */}
      {activeMode === 'DATASET' && (
        <div className="space-y-6">
          {/* Top Banner for Dataset */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-6 rounded-2xl shadow-lg border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/80 px-2.5 py-0.5 rounded-full border border-cyan-800">
                  Imported Dataset Telemetry
                </span>
                <span className="text-xs text-slate-300">500 Timestamped Readings</span>
              </div>
              <h2 className="text-xl font-bold mt-1 text-white">
                Batch: {dsSummary?.batch_id || 'batch001'} • {dsSummary?.location || 'Jharkhand'}
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Tracks a continuous multi-phase cold-chain lifecycle: <strong>Phase 1 Ultra-Low Freezer (-70°C)</strong>, transitioning into <strong>Phase 2 Thawed Refrigeration (2°C–4°C)</strong>, and ending in <strong>Phase 3 Excursion Spike (14°C)</strong> moving to discarded unit.
              </p>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 block">Final Status</span>
              <span className="inline-block mt-1 px-3 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold text-xs rounded-full">
                🚨 {dsSummary?.status || 'DISCARDED / QUARANTINED'}
              </span>
            </div>
          </div>

          {/* Dataset Metric Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {/* Shipper Temp */}
            <div className="p-4 rounded-2xl border bg-rose-50 border-rose-200 text-rose-950 shadow-xs">
              <div className="text-[11px] font-bold text-rose-700 uppercase">Shipper Temp</div>
              <div className="text-2xl font-black mt-1 text-rose-700">
                {dsSummary?.latest_shipper_temp}°C
              </div>
              <div className="text-[10px] text-rose-600 font-semibold mt-0.5">⚠️ Out of Bound</div>
            </div>

            {/* Room Temp */}
            <div className="p-4 rounded-2xl border bg-white border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Ambient Room</div>
              <div className="text-2xl font-black mt-1 text-slate-800">
                {dsSummary?.latest_room_temp}°C
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">{dsSummary?.latest_humidity}% Humidity</div>
            </div>

            {/* Item Expiry Hours */}
            <div className="p-4 rounded-2xl border bg-rose-50 border-rose-200 text-rose-950 shadow-xs">
              <div className="text-[11px] font-bold text-rose-700 uppercase">Thawed Expiry</div>
              <div className="text-2xl font-black mt-1 text-rose-700">
                {dsSummary?.item_expiry_hours} hrs
              </div>
              <div className="text-[10px] text-rose-600 font-semibold mt-0.5">Shelf-Life Passed</div>
            </div>

            {/* ULT Freezer Hours */}
            <div className="p-4 rounded-2xl border bg-cyan-50 border-cyan-200 text-cyan-950 shadow-xs">
              <div className="text-[11px] font-bold text-cyan-700 uppercase">ULT Freezer (-70°C)</div>
              <div className="text-2xl font-black mt-1 text-cyan-800">
                {dsSummary?.ult_freezer_hours} hrs
              </div>
              <div className="text-[10px] text-cyan-600 mt-0.5">30-Day Maximum</div>
            </div>

            {/* Refrigeration Hours */}
            <div className="p-4 rounded-2xl border bg-blue-50 border-blue-200 text-blue-950 shadow-xs">
              <div className="text-[11px] font-bold text-blue-700 uppercase">Refrigerated (2-8°C)</div>
              <div className="text-2xl font-black mt-1 text-blue-800">
                {dsSummary?.refrigeration_hours} hrs
              </div>
              <div className="text-[10px] text-blue-600 mt-0.5">Thawed Handling Time</div>
            </div>

            {/* Current Hop / Unit */}
            <div className="p-4 rounded-2xl border bg-slate-900 text-white shadow-xs col-span-2 md:col-span-1">
              <div className="text-[11px] font-bold text-cyan-400 uppercase">Storage Unit Hop</div>
              <div className="text-xs font-mono font-bold mt-1 text-white truncate" title={dsSummary?.current_hop}>
                {dsSummary?.current_hop?.replace('dest_', '')}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Automatic Discard Lock</div>
            </div>
          </div>

          {/* Phase Sequence Timeline Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-2xl border-2 border-cyan-200 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-cyan-700 mb-1">
                <span>Phase 1: Ultra-Low Temperature</span>
                <span className="text-[10px] bg-cyan-100 px-2 py-0.5 rounded-full">342h – 720h</span>
              </div>
              <p className="text-xs text-slate-600">
                Maintained deep sub-zero conditions (-70°C to -65°C) inside vacuum insulated shipper with dry ice.
              </p>
            </div>

            <div className="p-4 bg-white rounded-2xl border-2 border-blue-200 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-blue-700 mb-1">
                <span>Phase 2: Thawed Refrigeration</span>
                <span className="text-[10px] bg-blue-100 px-2 py-0.5 rounded-full">0h – 119h</span>
              </div>
              <p className="text-xs text-slate-600">
                Transferred to standard 2°C–4°C cold storage. Item expiry hours counted down from 120h to 0h.
              </p>
            </div>

            <div className="p-4 bg-white rounded-2xl border-2 border-rose-300 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-rose-700 mb-1">
                <span>Phase 3: Thermal Breach & Discard</span>
                <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">14°C Excursion</span>
              </div>
              <p className="text-xs text-slate-600">
                Temperature rose to 14°C. System automatically marked batch as expired and routed to discarded unit.
              </p>
            </div>
          </div>

          {/* Interactive Recharts Graph for Dataset */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Cold-Chain Trajectory Graph (Shipper Temp vs Room Temp)
                </h3>
                <p className="text-xs text-slate-500">
                  Visualizes the transition from -70°C ultra-cold through thawing and final 14°C excursion.
                </p>
              </div>

              {/* Phase Filter Buttons */}
              <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setPhaseFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg ${phaseFilter === 'ALL' ? 'bg-white shadow-xs text-blue-700' : 'text-slate-600'}`}
                >
                  All 500 Pts
                </button>
                <button
                  onClick={() => setPhaseFilter('ULTRA_LOW_FREEZER')}
                  className={`px-2.5 py-1 rounded-lg ${phaseFilter === 'ULTRA_LOW_FREEZER' ? 'bg-white shadow-xs text-cyan-700' : 'text-slate-600'}`}
                >
                  ULT (-70°C)
                </button>
                <button
                  onClick={() => setPhaseFilter('REFRIGERATED_STORAGE')}
                  className={`px-2.5 py-1 rounded-lg ${phaseFilter === 'REFRIGERATED_STORAGE' ? 'bg-white shadow-xs text-blue-700' : 'text-slate-600'}`}
                >
                  Thawed (2-8°C)
                </button>
                <button
                  onClick={() => setPhaseFilter('EXCURSION_DISCARD')}
                  className={`px-2.5 py-1 rounded-lg ${phaseFilter === 'EXCURSION_DISCARD' ? 'bg-white shadow-xs text-rose-700' : 'text-slate-600'}`}
                >
                  Breach (14°C)
                </button>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={datasetChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis domain={[-75, 25]} tick={{ fontSize: 10, fill: '#64748b' }} unit="°C" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1">
                            <div className="font-bold text-slate-300">{d.time}</div>
                            <div className="text-sm font-black text-cyan-300">
                              Shipper Temp: {d.shipperTemp}°C
                            </div>
                            <div className="text-slate-400">
                              Room Temp: <span className="text-white font-medium">{d.roomTemp}°C</span> | Humidity: <span className="text-white font-medium">{d.humidity}%</span>
                            </div>
                            <div className="text-amber-300">
                              Expiry Countdown: {d.expiryHours} hours remaining
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Hop: {d.hop}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <ReferenceLine y={8.0} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Refrig Max (8°C)', fill: '#ef4444', fontSize: 10 }} />
                  <ReferenceLine y={2.0} stroke="#06b6d4" strokeDasharray="3 3" label={{ value: 'Refrig Min (2°C)', fill: '#06b6d4', fontSize: 10 }} />
                  <ReferenceLine y={-60.0} stroke="#3b82f6" strokeDasharray="3 3" label={{ value: 'ULT Threshold (-60°C)', fill: '#3b82f6', fontSize: 10 }} />

                  <Line
                    type="monotone"
                    dataKey="shipperTemp"
                    name="Thermal Shipper Temp (°C)"
                    stroke="#0284c7"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="roomTemp"
                    name="Ambient Room Temp (°C)"
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Dataset Table View */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Dataset Telemetry Records (First 100 Rows)</h3>
                <p className="text-xs text-slate-500">Live records from cold_chain_dataset.csv in database</p>
              </div>
              <span className="text-xs px-2.5 py-1 bg-slate-100 rounded-lg font-mono font-semibold text-slate-700">
                500 Total Readings Ingested
              </span>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Batch</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3">Shipper Temp</th>
                    <th className="py-2.5 px-3">Room Temp</th>
                    <th className="py-2.5 px-3">Humidity</th>
                    <th className="py-2.5 px-3">Expiry Countdown</th>
                    <th className="py-2.5 px-3">Storage Unit Hop</th>
                    <th className="py-2.5 px-3">Phase Tag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {(datasetData?.table_records || []).map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 text-slate-700">{row.date}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{row.batch_id}</td>
                      <td className="py-2 px-3 text-slate-600">{row.location}</td>
                      <td className="py-2 px-3 font-bold">
                        <span className={
                          row.shipper_temp > 8.0
                            ? 'text-rose-600 font-black'
                            : row.shipper_temp < -20.0
                            ? 'text-cyan-700 font-bold'
                            : 'text-emerald-700'
                        }>
                          {row.shipper_temp}°C
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600">{row.room_temp}°C</td>
                      <td className="py-2 px-3 text-slate-600">{row.room_humidity}%</td>
                      <td className="py-2 px-3">
                        <span className={row.item_expiry_hours <= 0 ? 'text-rose-600 font-bold' : 'text-slate-800'}>
                          {row.item_expiry_hours}h
                        </span>
                      </td>
                      <td className="py-2 px-3 text-[11px] text-slate-600 truncate max-w-xs">{row.current_hop}</td>
                      <td className="py-2 px-3">
                        <Badge size="sm">{row.phase}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 2: INTERACTIVE THERMODYNAMIC SIMULATOR (Method A)        */}
      {/* ============================================================== */}
      {activeMode === 'SIMULATOR' && (
        <div className="space-y-6">
          {/* Unit Selector */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Interactive Virtual Refrigerator Controls
            </span>
            <div className="flex items-center space-x-2">
              <label className="text-xs font-semibold text-slate-600">Storage Unit:</label>
              <select
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="Main Cold Room A">Main Cold Room A (2°C - 8°C)</option>
                <option value="Secondary Cold Unit">Secondary Cold Unit</option>
                <option value="Pediatric Fridge B">Pediatric Fridge B</option>
              </select>
            </div>
          </div>

          {/* Live Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className={`p-4 rounded-2xl border ${
              currentTemp > 8.0
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : currentTemp < 2.0
                ? 'bg-cyan-50 border-cyan-200 text-cyan-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}>
              <div className="flex items-center justify-between text-xs font-semibold opacity-80">
                <span>Current Temp</span>
                <ThermometerSnowflake className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black mt-1">
                {currentTemp.toFixed(1)}°C
              </div>
              <div className="text-[11px] mt-1 font-medium">
                {isBreached ? '⚠️ Excursion Active' : '✓ Safe 2°C - 8°C'}
              </div>
            </div>

            <div className="p-4 rounded-2xl border bg-white border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Mean Kinetic Temp</span>
                <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">MKT</span>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {mkt.toFixed(1)}°C
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                WHO Arrhenius Index
              </div>
            </div>

            <div className="p-4 rounded-2xl border bg-white border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Heat Excursion (&gt;8°C)</span>
                <Flame className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-amber-600 mt-1">
                {analysis?.excursion_minutes_heat ?? 0}m
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Degree-minutes
              </div>
            </div>

            <div className="p-4 rounded-2xl border bg-white border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Freeze Time (&lt;2°C)</span>
                <ThermometerSnowflake className="w-4 h-4 text-cyan-500" />
              </div>
              <div className="text-2xl font-black text-cyan-600 mt-1">
                {analysis?.excursion_minutes_freeze ?? 0}m
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Freeze-damage exposure
              </div>
            </div>

            <div className={`p-4 rounded-2xl border col-span-2 md:col-span-1 ${
              healthScore >= 85
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : healthScore >= 60
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              <div className="flex items-center justify-between text-xs font-semibold opacity-80">
                <span>Cold-Chain Health</span>
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black mt-1">
                {healthScore}%
              </div>
              <div className="text-[11px] mt-1 font-bold">
                <Badge size="sm">{analysis?.status || 'SAFE'}</Badge>
              </div>
            </div>
          </div>

          {/* Critical Quarantine Alert Banner if Compromised */}
          {analysis && analysis.status === 'CRITICAL_QUARANTINE' && (
            <div className="bg-rose-600 text-white rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold">AUTOMATIC VACCINE QUARANTINE REQUIRED</h3>
                  <p className="text-xs text-rose-100 mt-0.5">
                    {analysis.recommended_action}
                  </p>
                </div>
              </div>
              <button
                onClick={handleAutoQuarantine}
                className="px-4 py-2.5 bg-white text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 shrink-0"
              >
                <Lock className="w-4 h-4" />
                <span>Lock All Batches in Unit Now</span>
              </button>
            </div>
          )}

          {/* Simulator Recharts Line Chart */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <span>Simulated Telemetry Stream</span>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Safe Band: 2.0°C to 8.0°C
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Simulated refrigerator temperature points over time with excursion alerts.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setAutoStream(!autoStream)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all flex items-center space-x-1.5 ${
                    autoStream
                      ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{autoStream ? 'Stop Stream' : 'Auto Stream'}</span>
                </button>
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center space-x-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={simChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis domain={[-4, 26]} tick={{ fontSize: 11, fill: '#64748b' }} unit="°C" />
                  <Tooltip />
                  <ReferenceArea y1={2.0} y2={8.0} fill="#10b981" fillOpacity={0.08} />
                  <ReferenceLine y={8.0} stroke="#ef4444" strokeDasharray="4 4" label={{ value: '8°C', fill: '#ef4444', fontSize: 10 }} />
                  <ReferenceLine y={2.0} stroke="#06b6d4" strokeDasharray="4 4" label={{ value: '2°C', fill: '#06b6d4', fontSize: 10 }} />
                  <Line
                    type="monotone"
                    dataKey="temperature"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#2563eb' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Scenario Selector */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">Thermodynamic Scenario Injector</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {scenarios.map((s) => {
                const Icon = s.icon;
                const isSelected = selectedScenario === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedScenario(s.id)}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected ? s.color + ' shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-900">{s.label}</span>
                      <Icon className="w-4 h-4 text-slate-600" />
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">{s.desc}</p>
                    <div className="mt-2.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                      {isSelected ? '✓ Active Scenario' : 'Click to Select'}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleSimulateBurst}
                disabled={simulating}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center space-x-2 disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                <span>{simulating ? 'Injecting...' : `Inject 25 Telemetry Readings (${selectedScenario})`}</span>
              </button>

              <button
                onClick={handleSimulateStep}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors flex items-center space-x-1.5"
              >
                <Zap className="w-4 h-4 text-amber-600" />
                <span>Single Tick</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Academic Mathematical Callout */}
      <div className="bg-slate-900 text-slate-200 rounded-2xl p-5 border border-slate-800 space-y-2">
        <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
          <Info className="w-4 h-4" />
          <span>Academic Reference: WHO / USP Mean Kinetic Temperature (MKT) Arrhenius Formula</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Mean Kinetic Temperature (MKT) calculates the non-linear degradation rate of vaccines under fluctuating storage temperatures using the <strong>Arrhenius Equation</strong>:
        </p>
        <div className="bg-slate-950 p-3 rounded-xl font-mono text-xs text-cyan-300 overflow-x-auto text-center border border-slate-800">
          Tk = (ΔH / R) / [ -ln ( (1/n) * Σ exp(-ΔH / (R * Ti)) ) ] - 273.15
        </div>
      </div>
    </div>
  );
}
