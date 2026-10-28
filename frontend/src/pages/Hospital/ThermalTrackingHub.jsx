import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Database,
  Layers,
  MapPin,
  AlertTriangle,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Cpu,
  RefreshCw,
  Boxes,
  Building2
} from 'lucide-react';

export default function ThermalTrackingHub() {
  const { user } = useAuth();

  // Mode: 'DATASET' (Primary: real-world cold chain IoT dataset) or 'SIMULATOR' (interactive chamber)
  const [activeMode, setActiveMode] = useState('DATASET');

  // ==========================================
  // DATASET STATE
  // ==========================================
  const [datasetData, setDatasetData] = useState(null);
  const [datasetLoading, setDatasetLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [phaseFilter, setPhaseFilter] = useState('ALL'); // 'ALL', 'ULTRA_LOW_FREEZER', 'REFRIGERATED_STORAGE', 'EXCURSION_DISCARD'
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // ==========================================
  // SIMULATOR STATE
  // ==========================================
  const [logs, setLogs] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState('DOOR_AJAR');
  const [simLoading, setSimLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [autoStream, setAutoStream] = useState(false);
  const [unitName, setUnitName] = useState('Main Cold Room A');
  const [actionMessage, setActionMessage] = useState('');
  const timerRef = useRef(null);

  // Fetch dataset telemetry
  const fetchDatasetData = async () => {
    setDatasetLoading(true);
    setFetchError(null);
    try {
      const data = await api.getDatasetTelemetry();
      setDatasetData(data || null);
    } catch (err) {
      console.error('Failed to load dataset telemetry:', err);
      setFetchError(err.message || 'Failed to connect to dataset telemetry API.');
    } finally {
      setDatasetLoading(false);
    }
  };

  // Fetch virtual fridge simulator data
  const fetchThermalData = async () => {
    setSimLoading(true);
    try {
      const facilityId = user?.id || 1;
      const [logList, analysisData] = await Promise.all([
        api.getThermalLogs(facilityId, unitName, 40),
        api.getThermalAnalysis(facilityId, unitName),
      ]);
      setLogs(logList || []);
      setAnalysis(analysisData || null);
    } catch (err) {
      console.error('Failed to load simulator thermal data:', err);
    } finally {
      setSimLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasetData();
  }, []);

  useEffect(() => {
    if (activeMode === 'SIMULATOR') {
      fetchThermalData();
    }
  }, [user?.id, unitName, activeMode]);

  // Auto-stream simulator telemetry tick
  useEffect(() => {
    if (autoStream && activeMode === 'SIMULATOR') {
      timerRef.current = setInterval(async () => {
        try {
          await api.simulateStep({
            facility_id: user?.id || 1,
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
  }, [autoStream, selectedScenario, unitName, activeMode]);

  const handleSimulateBurst = async () => {
    setSimulating(true);
    setActionMessage('');
    try {
      await api.simulateBurst({
        facility_id: user?.id || 1,
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
        facility_id: user?.id || 1,
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
      await api.resetThermal({ facility_id: user?.id || 1, unit_name: unitName });
      setActionMessage('Reset thermal logs to optimal 4.5°C baseline.');
      await fetchThermalData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAutoQuarantine = async () => {
    try {
      const res = await api.autoQuarantine({
        facility_id: user?.id || 1,
        unit_name: unitName,
        reason: `Automated Cold-Chain Lock: MKT was ${analysis?.mean_kinetic_temperature}°C with ${analysis?.excursion_minutes_heat} mins heat excursion.`
      });
      setActionMessage(res.message);
    } catch (err) {
      console.error(err);
    }
  };

  // Export full 500-row dataset to CSV
  const handleExportCSV = () => {
    const records = datasetData?.all_records || datasetData?.table_records || [];
    if (!Array.isArray(records) || records.length === 0) return;

    const headers = [
      'date',
      'batch_id',
      'location',
      'current_hop',
      'external_storage',
      'thermal_shipper_temp_reading',
      'room_temp_reading',
      'room_humidity_reading',
      'item_expiry_hours',
      'ultra_low_temperature_freezer_hours',
      'out_of_bound_temperature_hours',
      'refrigeration_temperature_hours',
      'phase_tag'
    ];

    const rows = records.map((r) => [
      `"${r.date || ''}"`,
      `"${r.batch_id || ''}"`,
      `"${r.location || ''}"`,
      `"${r.current_hop || ''}"`,
      `"${r.external_storage || ''}"`,
      r.shipper_temp ?? 0,
      r.room_temp ?? 0,
      r.room_humidity ?? 0,
      r.item_expiry_hours ?? 0,
      r.ult_hours ?? 0,
      r.out_of_bound_hours ?? 0,
      r.refrig_hours ?? 0,
      `"${r.phase || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cold_chain_telemetry_${datasetData?.summary?.batch_id || 'batch001'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Safe Filtered dataset chart records
  const datasetChartData = useMemo(() => {
    const list = datasetData?.chronological_records || [];
    if (!Array.isArray(list)) return [];
    return list
      .filter((r) => r && (phaseFilter === 'ALL' || r.phase === phaseFilter))
      .map((r) => ({
        date: String(r.date || '').slice(0, 10),
        time: String(r.date || ''),
        shipperTemp: Number(r.shipper_temp ?? 0),
        roomTemp: Number(r.room_temp ?? 0),
        humidity: Number(r.room_humidity ?? 0),
        expiryHours: Number(r.item_expiry_hours ?? 0),
        hop: String(r.current_hop || ''),
        phase: String(r.phase || '')
      }));
  }, [datasetData, phaseFilter]);

  // Safe Filtered dataset table records
  const allDatasetRows = useMemo(() => {
    const list = datasetData?.all_records || datasetData?.table_records || [];
    if (!Array.isArray(list)) return [];
    const q = searchQuery.trim().toLowerCase();
    return list.filter((r) => {
      if (!r) return false;
      const phase = String(r.phase || '');
      const matchesPhase = phaseFilter === 'ALL' || phase === phaseFilter;
      const matchesSearch =
        !q ||
        String(r.date || '').toLowerCase().includes(q) ||
        String(r.batch_id || '').toLowerCase().includes(q) ||
        String(r.current_hop || '').toLowerCase().includes(q) ||
        String(r.shipper_temp ?? '').includes(q) ||
        phase.toLowerCase().includes(q);
      return matchesPhase && matchesSearch;
    });
  }, [datasetData, phaseFilter, searchQuery]);

  // Paginated records
  const totalPages = Math.max(1, Math.ceil(allDatasetRows.length / rowsPerPage));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return allDatasetRows.slice(start, start + rowsPerPage);
  }, [allDatasetRows, currentPage, rowsPerPage]);

  // Safe Simulator chart data
  const simChartData = useMemo(() => {
    if (!Array.isArray(logs)) return [];
    return logs.map((l) => ({
      time: l.timestamp ? String(l.timestamp).slice(11, 16) : '',
      temperature: Number(l.temperature ?? 4.5),
      safeMin: 2.0,
      safeMax: 8.0,
      door: l.door_status,
      power: l.power_status
    }));
  }, [logs]);

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

  // Loading State
  if (datasetLoading && !datasetData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] space-y-3 bg-white rounded-3xl p-8 border border-slate-200">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600"></div>
        <p className="text-xs font-semibold text-slate-500 animate-pulse">
          Ingesting IoT cold-chain dataset records...
        </p>
      </div>
    );
  }

  // Error State with Retry Button
  if (fetchError && !datasetData && activeMode === 'DATASET') {
    return (
      <div className="bg-white rounded-3xl border border-rose-200 p-8 shadow-xs max-w-lg mx-auto text-center space-y-4">
        <div className="w-12 h-12 bg-rose-100 text-rose-700 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900">Unable to Load Telemetry Dataset</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            {fetchError}
          </p>
        </div>
        <div className="pt-2 flex items-center justify-center space-x-3">
          <button
            type="button"
            onClick={fetchDatasetData}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('SIMULATOR')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
          >
            Switch to Virtual Simulator
          </button>
        </div>
      </div>
    );
  }

  const dsSummary = datasetData?.summary || {
    batch_id: 'batch001',
    vaccine_name: 'Comirnaty (mRNA COVID-19)',
    location: 'Jharkand',
    latest_shipper_temp: 14.0,
    latest_room_temp: 22.0,
    latest_humidity: 75.0,
    item_expiry_hours: -1,
    ult_freezer_hours: 720,
    refrigeration_hours: 119,
    refrig_mkt: 3.32,
    avg_ult_temp: -67.5,
    status: 'DISCARDED / QUARANTINED'
  };

  const currentTemp = analysis?.current_temperature ?? 4.5;
  const mkt = analysis?.mean_kinetic_temperature ?? 4.5;
  const healthScore = analysis?.cold_chain_health_score ?? 100;
  const isBreached = currentTemp > 8.0 || currentTemp < 2.0;

  return (
    <div className="space-y-6">
      {/* Top Header & Mode Switcher */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-50/60 via-cyan-50/40 to-transparent rounded-full blur-3xl -z-10 pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 text-[11px] font-bold tracking-wider uppercase bg-blue-50 text-blue-700 rounded-md border border-blue-100/80">
                Cold-Chain Intelligence &amp; IoT Telemetry
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs font-medium text-slate-500 flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{dsSummary?.location || 'Jharkhand Central Depot'}</span>
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Cold Storage &amp; Thermal Telemetry Tracking Hub
            </h1>
            <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
              Real-world IoT dataset telemetry tracking, Arrhenius Mean Kinetic Temperature (MKT) computation,
              thaw stability monitoring, and automated quarantine containment.
            </p>
          </div>

          {/* Mode Switcher + Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveMode('DATASET')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  activeMode === 'DATASET'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Real Dataset (batch001)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('SIMULATOR')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  activeMode === 'SIMULATOR'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Virtual Fridge Simulator</span>
              </button>
            </div>

            {activeMode === 'DATASET' && (
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5"
                title="Download complete 500-row telemetry dataset"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Dataset CSV</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (activeMode === 'DATASET') fetchDatasetData();
                else fetchThermalData();
              }}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              title="Refresh Telemetry"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {actionMessage && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs flex items-center justify-between">
            <span>{actionMessage}</span>
            <button onClick={() => setActionMessage('')} className="text-blue-600 font-bold hover:underline">
              ✕
            </button>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODE 1: REAL-WORLD COLD CHAIN DATASET (batch001)              */}
      {/* ============================================================== */}
      {activeMode === 'DATASET' && (
        <div className="space-y-6">
          {/* Executive Dataset Alert Banner */}
          <div className="bg-white rounded-3xl border-2 border-rose-200/90 p-6 shadow-sm relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 bg-rose-600 text-white text-xs font-black rounded-lg flex items-center space-x-1.5 shadow-xs">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Cold-Chain Breach Detected in Given Dataset</span>
                  </span>
                  <span className="text-xs font-bold text-slate-700">
                    Batch: <span className="font-mono text-slate-900">{dsSummary?.batch_id || 'batch001'}</span>
                  </span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs font-semibold text-slate-600">
                    {dsSummary?.vaccine_name || 'Comirnaty (mRNA COVID-19)'}
                  </span>
                </div>

                <h2 className="text-lg font-black text-slate-900">
                  Automated Cold-Chain Lockout: Batch Quarantined &amp; Routed to Discard Unit
                </h2>

                <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
                  The imported dataset records continuous hourly IoT telemetry from <strong>September 17 to October 7, 2020</strong>.
                  After surviving <strong>720 hours in ultra-low deep freeze (-70°C)</strong> and <strong>119 hours of clinical thawed refrigeration (2°C–4°C)</strong>,
                  the temperature breached to <strong>14.0°C</strong> exceeding the WHO 8.0°C maximum limit as the 120-hour thaw shelf life expired.
                  The platform's safety engine automatically locked the batch and routed it to <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px] text-rose-700">dest_discarded_vaccine_storage_unit</code>.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-2 shrink-0">
                <div className="px-4 py-2 bg-rose-50 border border-rose-200 rounded-2xl text-right">
                  <div className="text-[10px] font-black uppercase tracking-wider text-rose-600">Final Audit Status</div>
                  <div className="text-sm font-black text-rose-800">DISCARDED / QUARANTINED</div>
                </div>
                <div className="text-[11px] font-mono text-slate-500">
                  500 Total Ingested Readings
                </div>
              </div>
            </div>
          </div>

          {/* 6 Key Telemetry Metric Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 1. Shipper Temp */}
            <div className="p-4 rounded-2xl border bg-rose-50/80 border-rose-200 text-rose-950 shadow-xs">
              <div className="text-[10px] font-black text-rose-700 uppercase tracking-wider">Final Shipper Temp</div>
              <div className="text-2xl font-black mt-1 text-rose-700">
                {dsSummary?.latest_shipper_temp ?? 14.0}°C
              </div>
              <div className="text-[10px] text-rose-600 font-bold mt-1">⚠️ Breached (&gt;8°C Limit)</div>
            </div>

            {/* 2. Refrig Phase MKT */}
            <div className="p-4 rounded-2xl border bg-emerald-50/80 border-emerald-200 text-emerald-950 shadow-xs">
              <div className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">Thaw MKT (WHO)</div>
              <div className="text-2xl font-black mt-1 text-emerald-800">
                {dsSummary?.refrig_mkt ?? 3.32}°C
              </div>
              <div className="text-[10px] text-emerald-700 font-semibold mt-1">Mean Kinetic Temp</div>
            </div>

            {/* 3. Thaw Expiry Countdown */}
            <div className="p-4 rounded-2xl border bg-amber-50/80 border-amber-200 text-amber-950 shadow-xs">
              <div className="text-[10px] font-black text-amber-700 uppercase tracking-wider">Thaw Stability Expiry</div>
              <div className="text-2xl font-black mt-1 text-amber-800">
                {dsSummary?.item_expiry_hours ?? -1} hrs
              </div>
              <div className="text-[10px] text-amber-700 font-semibold mt-1">120h limit exhausted</div>
            </div>

            {/* 4. Ambient Room Temp & Humidity */}
            <div className="p-4 rounded-2xl border bg-white border-slate-200 shadow-xs">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Ambient Room</div>
              <div className="text-2xl font-black mt-1 text-slate-800">
                {dsSummary?.latest_room_temp ?? 22}°C
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-1">
                Humidity: {dsSummary?.latest_humidity ?? 75}%
              </div>
            </div>

            {/* 5. Deep Freeze Duration */}
            <div className="p-4 rounded-2xl border bg-cyan-50/80 border-cyan-200 text-cyan-950 shadow-xs">
              <div className="text-[10px] font-black text-cyan-700 uppercase tracking-wider">ULT Deep Freeze</div>
              <div className="text-2xl font-black mt-1 text-cyan-800">
                {dsSummary?.ult_freezer_hours ?? 720} hrs
              </div>
              <div className="text-[10px] text-cyan-700 font-semibold mt-1">Avg: {dsSummary?.avg_ult_temp ?? -67.5}°C</div>
            </div>

            {/* 6. Current Cold-Chain Hop */}
            <div className="p-4 rounded-2xl border bg-purple-50/80 border-purple-200 text-purple-950 shadow-xs">
              <div className="text-[10px] font-black text-purple-700 uppercase tracking-wider">Storage Hop Unit</div>
              <div className="text-xs font-mono font-bold mt-2 text-purple-900 truncate" title={dsSummary?.current_hop}>
                {dsSummary?.current_hop ? dsSummary.current_hop.replace('dest_', '') : 'discarded_unit'}
              </div>
              <div className="text-[10px] text-purple-700 font-semibold mt-1">Jharkhand Depot</div>
            </div>
          </div>

          {/* Cold-Chain Hop Journey Sequence */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Dataset Cold-Chain Lifecycle Stages (3 Phases)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Phase 1 */}
              <div className="p-4 rounded-2xl border-2 border-cyan-200 bg-cyan-50/30 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-cyan-800">
                  <span className="flex items-center space-x-1">
                    <ThermometerSnowflake className="w-4 h-4 text-cyan-600" />
                    <span>Phase 1: Deep Freeze Storage</span>
                  </span>
                  <span className="text-[10px] bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded-full font-mono">
                    380 Readings
                  </span>
                </div>
                <div className="text-sm font-black text-cyan-900">-70.0°C to -65.0°C</div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Maintained in ultra-cold thermal shipper with dry ice insulation. Item thaw countdown halted at 120h.
                </p>
              </div>

              {/* Phase 2 */}
              <div className="p-4 rounded-2xl border-2 border-blue-200 bg-blue-50/30 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-blue-800">
                  <span className="flex items-center space-x-1">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Phase 2: Thawed Refrigeration</span>
                  </span>
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-mono">
                    119 Readings
                  </span>
                </div>
                <div className="text-sm font-black text-blue-900">2.0°C to 4.0°C (MKT: 3.32°C)</div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Transferred to Jharkhand clinic cold unit. WHO compliant 2°C–8°C. Item expiry timer counted down from 120h to 0h.
                </p>
              </div>

              {/* Phase 3 */}
              <div className="p-4 rounded-2xl border-2 border-rose-300 bg-rose-50/40 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-rose-800">
                  <span className="flex items-center space-x-1">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Phase 3: Excursion &amp; Lockout</span>
                  </span>
                  <span className="text-[10px] bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full font-mono font-bold">
                    14.0°C Breach
                  </span>
                </div>
                <div className="text-sm font-black text-rose-900">14.0°C Spike &amp; Expiry Limit</div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Temperature spiked to 14°C at hour 119. Automated quarantine activated; batch moved to discarded storage unit.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Recharts Graph */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <span>Cold-Chain Telemetry Trajectory (Shipper Temp vs Ambient)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Hourly thermal sensor readings spanning Ultra-Low Storage (-70°C), Controlled Thaw (2°C - 8°C), and Excursion Event.
                </p>
              </div>

              {/* Phase Filter Buttons */}
              <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setPhaseFilter('ALL')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    phaseFilter === 'ALL' ? 'bg-white shadow-xs text-blue-700 font-bold' : 'text-slate-600'
                  }`}
                >
                  All 500 Pts
                </button>
                <button
                  type="button"
                  onClick={() => setPhaseFilter('ULTRA_LOW_FREEZER')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    phaseFilter === 'ULTRA_LOW_FREEZER' ? 'bg-white shadow-xs text-cyan-700 font-bold' : 'text-slate-600'
                  }`}
                >
                  ULT (-70°C)
                </button>
                <button
                  type="button"
                  onClick={() => setPhaseFilter('REFRIGERATED_STORAGE')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    phaseFilter === 'REFRIGERATED_STORAGE' ? 'bg-white shadow-xs text-blue-700 font-bold' : 'text-slate-600'
                  }`}
                >
                  Thawed (2-8°C)
                </button>
                <button
                  type="button"
                  onClick={() => setPhaseFilter('EXCURSION_DISCARD')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    phaseFilter === 'EXCURSION_DISCARD' ? 'bg-white shadow-xs text-rose-700 font-bold' : 'text-slate-600'
                  }`}
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
                          <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl text-xs space-y-1.5 border border-slate-700">
                            <div className="font-bold text-slate-300 font-mono text-[11px]">{d.time}</div>
                            <div className="text-sm font-black text-cyan-300">
                              Thermal Shipper: {d.shipperTemp}°C
                            </div>
                            <div className="text-slate-300 text-[11px]">
                              Ambient Room: <span className="text-white font-bold">{d.roomTemp}°C</span> · Humidity: <span className="text-white font-bold">{d.humidity}%</span>
                            </div>
                            <div className="text-amber-300 text-[11px] font-semibold">
                              Thaw Expiry Countdown: {d.expiryHours} hours left
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Storage Hop: {d.hop}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <ReferenceLine
                    y={8.0}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    label={{ value: 'Refrigeration Max (8.0°C)', fill: '#ef4444', fontSize: 10 }}
                  />
                  <ReferenceLine
                    y={2.0}
                    stroke="#06b6d4"
                    strokeDasharray="4 4"
                    label={{ value: 'Refrigeration Min (2.0°C)', fill: '#06b6d4', fontSize: 10 }}
                  />
                  <ReferenceLine
                    y={-60.0}
                    stroke="#3b82f6"
                    strokeDasharray="4 4"
                    label={{ value: 'ULT Threshold (-60°C)', fill: '#3b82f6', fontSize: 10 }}
                  />

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

          {/* Machine Learning & Algorithm Explanation Card */}
          <div className="bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/60 rounded-3xl border border-indigo-200/80 p-6 shadow-xs space-y-3">
            <div className="flex items-center space-x-2">
              <Cpu className="w-5 h-5 text-indigo-700" />
              <h3 className="text-sm font-bold text-slate-900">
                Data Science &amp; Cold-Chain Algorithms Applied to this Dataset
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              <div className="bg-white/80 p-3.5 rounded-2xl border border-indigo-100 text-xs space-y-1">
                <span className="font-bold text-indigo-900 block">1. Arrhenius MKT Formula</span>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Computes single continuous kinetic temperature using standard biologic activation energy (ΔH = 83.144 kJ/mol).
                  Accounts for accelerated chemical degradation at higher temperatures.
                </p>
              </div>

              <div className="bg-white/80 p-3.5 rounded-2xl border border-indigo-100 text-xs space-y-1">
                <span className="font-bold text-indigo-900 block">2. Thawed Shelf-Life Countdown</span>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Enforces strict WHO stability window: once an ultra-cold mRNA vial is thawed to 2°C–8°C,
                  it must be administered within exactly 120 hours. At hour 119, the timer expired.
                </p>
              </div>

              <div className="bg-white/80 p-3.5 rounded-2xl border border-indigo-100 text-xs space-y-1">
                <span className="font-bold text-indigo-900 block">3. Automated Quarantine Gate</span>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Instantaneous trigger upon detecting T &gt; 8.0°C or expired countdown.
                  Batch status transitions immediately to <code className="text-rose-700 font-bold">QUARANTINED_HEAT</code> to protect patients.
                </p>
              </div>
            </div>
          </div>

          {/* Dataset Telemetry Explorer & Table */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs space-y-0">
            {/* Table Controls */}
            <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <span>Dataset Telemetry Log Explorer</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-black rounded-full">
                    {allDatasetRows.length} matching rows
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Search, paginate, and audit all 500 records from <code className="font-mono">cold_chain_dataset.csv</code>.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search timestamp, hop, temp..."
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:bg-white"
                >
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                  <option value={100}>100 / page</option>
                </select>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-[460px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/90 text-slate-500 font-bold border-b border-slate-200 sticky top-0 backdrop-blur-xs text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Batch ID</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Shipper Temp</th>
                    <th className="py-3 px-4">Room Temp</th>
                    <th className="py-3 px-4">Humidity</th>
                    <th className="py-3 px-4">Thaw Countdown</th>
                    <th className="py-3 px-4">Storage Unit Hop</th>
                    <th className="py-3 px-4 text-right">Phase Tag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 font-sans text-xs">
                        No telemetry logs match your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-4 text-slate-700 whitespace-nowrap text-[11px]">
                          {row.date}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-900">{row.batch_id}</td>
                        <td className="py-2.5 px-4 text-slate-600 font-sans">{row.location}</td>
                        <td className="py-2.5 px-4 font-bold">
                          <span
                            className={
                              row.shipper_temp > 8.0
                                ? 'text-rose-600 font-black bg-rose-50 px-2 py-0.5 rounded'
                                : row.shipper_temp < -20.0
                                ? 'text-cyan-700 font-bold'
                                : 'text-emerald-700 font-bold'
                            }
                          >
                            {row.shipper_temp}°C
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">{row.room_temp}°C</td>
                        <td className="py-2.5 px-4 text-slate-600">{row.room_humidity}%</td>
                        <td className="py-2.5 px-4">
                          <span className={row.item_expiry_hours <= 0 ? 'text-rose-600 font-black' : 'text-slate-800'}>
                            {row.item_expiry_hours}h
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-[11px] text-slate-600 truncate max-w-xs font-sans">
                          {row.current_hop}
                        </td>
                        <td className="py-2.5 px-4 text-right font-sans">
                          <Badge size="sm">{row.phase}</Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div>
                Showing page <strong className="text-slate-800">{currentPage}</strong> of{' '}
                <strong className="text-slate-800">{totalPages}</strong> ({allDatasetRows.length} total rows)
              </div>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg text-slate-700 font-bold transition-colors flex items-center space-x-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg text-slate-700 font-bold transition-colors flex items-center space-x-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 2: INTERACTIVE VIRTUAL FRIDGE SIMULATOR                   */}
      {/* ============================================================== */}
      {activeMode === 'SIMULATOR' && (
        <div className="space-y-6">
          {/* Unit Selector & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Interactive Chamber Simulation
              </span>
              <p className="text-xs text-slate-600">
                Simulate thermodynamic excursions, door ajar thermal leaks, and compressor failures in real-time.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-xs font-semibold text-slate-600">Storage Unit:</label>
              <select
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="Main Cold Room A">Main Cold Room A (2°C - 8°C)</option>
                <option value="Secondary Cold Unit">Secondary Cold Unit</option>
                <option value="Pediatric Fridge B">Pediatric Fridge B</option>
              </select>
            </div>
          </div>

          {/* Live Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div
              className={`p-4 rounded-2xl border ${
                currentTemp > 8.0
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : currentTemp < 2.0
                  ? 'bg-cyan-50 border-cyan-200 text-cyan-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold opacity-80">
                <span>Current Temp</span>
                <ThermometerSnowflake className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black mt-1">{currentTemp.toFixed(1)}°C</div>
              <div className="text-[11px] mt-1 font-medium">
                {isBreached ? '⚠️ Excursion Active' : '✓ Safe 2°C - 8°C'}
              </div>
            </div>

            <div className="p-4 rounded-2xl border bg-white border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Mean Kinetic Temp</span>
                <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">MKT</span>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1">{mkt.toFixed(1)}°C</div>
              <div className="text-[11px] text-slate-500 mt-1">WHO Arrhenius Index</div>
            </div>

            <div className="p-4 rounded-2xl border bg-white border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Heat Excursion (&gt;8°C)</span>
                <Flame className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-amber-600 mt-1">
                {analysis?.excursion_minutes_heat ?? 0}m
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Degree-minutes</div>
            </div>

            <div className="p-4 rounded-2xl border bg-white border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Freeze Time (&lt;2°C)</span>
                <ThermometerSnowflake className="w-4 h-4 text-cyan-500" />
              </div>
              <div className="text-2xl font-black text-cyan-600 mt-1">
                {analysis?.excursion_minutes_freeze ?? 0}m
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Freeze-damage exposure</div>
            </div>

            <div
              className={`p-4 rounded-2xl border col-span-2 md:col-span-1 ${
                healthScore >= 85
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : healthScore >= 60
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold opacity-80">
                <span>Cold-Chain Health</span>
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black mt-1">{healthScore}%</div>
              <div className="text-[11px] mt-1 font-bold">
                <Badge size="sm">{analysis?.status || 'SAFE'}</Badge>
              </div>
            </div>
          </div>

          {/* Critical Quarantine Alert Banner if Compromised */}
          {analysis && analysis.status === 'CRITICAL_QUARANTINE' && (
            <div className="bg-rose-600 text-white rounded-3xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold">AUTOMATIC VACCINE QUARANTINE REQUIRED</h3>
                  <p className="text-xs text-rose-100 mt-0.5">{analysis.recommended_action}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAutoQuarantine}
                className="px-4 py-2.5 bg-white text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 shrink-0"
              >
                <Lock className="w-4 h-4" />
                <span>Lock All Batches in Unit Now</span>
              </button>
            </div>
          )}

          {/* Simulator Recharts Line Chart */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <span>Simulated Telemetry Stream</span>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Safe Band: 2.0°C to 8.0°C
                  </span>
                </h3>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
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
                  type="button"
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
                  <ReferenceLine
                    y={8.0}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    label={{ value: '8°C', fill: '#ef4444', fontSize: 10 }}
                  />
                  <ReferenceLine
                    y={2.0}
                    stroke="#06b6d4"
                    strokeDasharray="4 4"
                    label={{ value: '2°C', fill: '#06b6d4', fontSize: 10 }}
                  />
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
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">Thermodynamic Scenario Injector</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {scenarios.map((s) => {
                const Icon = s.icon;
                const isSelected = selectedScenario === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedScenario(s.id)}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? s.color + ' shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
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
                type="button"
                onClick={handleSimulateBurst}
                disabled={simulating}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center space-x-2 disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                <span>{simulating ? 'Injecting...' : `Inject 25 Telemetry Readings (${selectedScenario})`}</span>
              </button>

              <button
                type="button"
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
    </div>
  );
}
