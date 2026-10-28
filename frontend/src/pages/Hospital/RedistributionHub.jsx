import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import Badge from '../../components/Badge';
import {
  RefreshCw,
  Building2,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  PackagePlus,
  SendHorizontal,
  Inbox,
  Send,
  History,
  Sparkles,
  Clock,
  Search,
  Check,
  X,
  ShieldCheck,
  AlertCircle,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Calendar,
  Layers
} from 'lucide-react';

export default function RedistributionHub() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [availableStock, setAvailableStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: '' }

  // Active tab: 'incoming' | 'browse' | 'outgoing' | 'ai' | 'history'
  const [activeTab, setActiveTab] = useState('incoming');

  // Request modal state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState(null);
  const [requestedDoses, setRequestedDoses] = useState(50);
  const [urgencyLevel, setUrgencyLevel] = useState('URGENT');
  const [requestReason, setRequestReason] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Search & Filter for Browse tab
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVaccine, setFilterVaccine] = useState('ALL');

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const recs = await api.getRedistributions();
      setRecommendations(recs || []);
    } catch (err) {
      console.error('Failed to load redistributions:', err);
    } finally {
      setLoading(false);
      if (isManualRefresh) setRefreshing(false);
    }
  };

  const loadAvailableStock = async () => {
    if (!user?.id) return;
    try {
      const stock = await api.getRedistributionAvailableStock(user.id);
      setAvailableStock(stock || []);
    } catch (err) {
      console.error('Failed to load available stock:', err);
    }
  };

  useEffect(() => {
    loadData();
    loadAvailableStock();
  }, [user?.id]);

  // Handle Accept, Reject, or Dismiss actions
  const handleAction = async (recId, action) => {
    try {
      const res = await api.actionRedistribution(recId, action, user.id);
      setMessage({
        type: 'success',
        text: res.message || `Action ${action} completed successfully.`
      });
      await Promise.all([loadData(), loadAvailableStock()]);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.message || `Failed to process ${action} action.`
      });
    }
  };

  // Open the request modal with a selected stock item
  const handleOpenRequestModal = (stockItem = null) => {
    const item = stockItem || availableStock[0] || null;
    setSelectedStockItem(item);
    if (item) {
      const defaultDoses = Math.min(100, item.available_doses || 50);
      setRequestedDoses(defaultDoses > 0 ? defaultDoses : 1);
    }
    setUrgencyLevel('URGENT');
    setRequestReason('');
    setShowRequestModal(true);
  };

  // Submit peer request
  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!selectedStockItem) return;

    const doses = Number(requestedDoses);
    if (!doses || doses <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid dose count greater than 0.' });
      return;
    }
    if (doses > selectedStockItem.available_doses) {
      setMessage({
        type: 'error',
        text: `Requested doses (${doses}) exceed available stock (${selectedStockItem.available_doses}).`
      });
      return;
    }

    setSubmittingRequest(true);
    setMessage(null);

    const fullReason = `[${urgencyLevel}] ${requestReason.trim() || 'Urgent inter-facility stock replenishment requested.'}`;

    try {
      const res = await api.createRedistributionRequest({
        facility_id: user.id,
        batch_id: Number(selectedStockItem.batch_id),
        requested_doses: doses,
        reason: fullReason,
      });

      setMessage({
        type: 'success',
        text: res.message || `Successfully sent transfer request for ${doses} doses to ${selectedStockItem.source_facility_name}.`
      });
      setShowRequestModal(false);
      setRequestReason('');
      setActiveTab('outgoing'); // Switch to outgoing tab to view sent request
      await Promise.all([loadData(), loadAvailableStock()]);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to submit vaccine request.' });
    } finally {
      setSubmittingRequest(false);
    }
  };

  // Filter calculations
  const involvesCurrentFacility = (r) =>
    r.source_facility_id === user.id || r.target_facility_id === user.id;

  // 1. Incoming Requests: other hospitals asking stock from THIS hospital
  const incomingRequests = recommendations.filter(
    (r) => r.status === 'REQUESTED' && r.source_facility_id === user.id
  );

  // 2. Outgoing Requests: THIS hospital asked another hospital for stock
  const outgoingRequests = recommendations.filter(
    (r) => r.status === 'REQUESTED' && r.target_facility_id === user.id
  );

  // 3. AI Automated recommendations involving this hospital
  const activeRecs = recommendations.filter(
    (r) => r.status === 'SUGGESTED' && involvesCurrentFacility(r)
  );

  // 4. Past completed or rejected records
  const pastRecs = recommendations.filter(
    (r) => r.status !== 'SUGGESTED' && r.status !== 'REQUESTED' && involvesCurrentFacility(r)
  );

  // Auto-switch initial tab if incoming requests exist
  useEffect(() => {
    if (incomingRequests.length > 0) {
      setActiveTab('incoming');
    } else if (availableStock.length > 0 && activeTab === 'incoming' && recommendations.length === 0) {
      setActiveTab('browse');
    }
  }, [incomingRequests.length]);

  // Unique vaccine names in available stock for filter dropdown
  const uniqueVaccines = useMemo(() => {
    const names = new Set(availableStock.map((s) => s.vaccine_name));
    return Array.from(names);
  }, [availableStock]);

  // Filtered available stock
  const filteredStock = useMemo(() => {
    return availableStock.filter((item) => {
      const matchesSearch =
        item.vaccine_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.source_facility_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.source_district && item.source_district.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.batch_number.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesVaccine = filterVaccine === 'ALL' || item.vaccine_name === filterVaccine;

      return matchesSearch && matchesVaccine;
    });
  }, [availableStock, searchQuery, filterVaccine]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] space-y-3">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-200 border-t-indigo-600"></div>
        <p className="text-xs font-semibold text-slate-500 animate-pulse">
          Connecting to regional healthcare redistribution hub...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-50/60 via-purple-50/40 to-transparent rounded-full blur-3xl -z-10 pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 text-[11px] font-bold tracking-wider uppercase bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100/80">
                Peer Hospital Network
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs font-medium text-slate-500 flex items-center space-x-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>{user?.facility_name}</span>
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Inter-Facility Redistribution &amp; Peer Request Hub
            </h1>
            <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
              Request critical vaccine supplies from partner hospitals, approve or reject incoming peer transfers,
              and coordinate regional emergency stock balances in real-time.
            </p>
          </div>

          <div className="flex items-center space-x-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                loadData(true);
                loadAvailableStock();
              }}
              disabled={refreshing}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center disabled:opacity-50"
              title="Refresh Redistribution Data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => handleOpenRequestModal()}
              disabled={availableStock.length === 0}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-300 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md transition-all flex items-center space-x-2"
            >
              <PackagePlus className="w-4 h-4" />
              <span>Ask for Vaccine from Hospital</span>
            </button>
          </div>
        </div>

        {/* Global Feedback Alert */}
        {message && (
          <div
            className={`mt-4 p-3.5 rounded-2xl border text-xs font-medium flex items-center justify-between transition-all ${
              message.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center space-x-2">
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
            <button
              onClick={() => setMessage(null)}
              className="font-bold text-slate-500 hover:text-slate-800 px-2 py-0.5 rounded-lg hover:bg-black/5"
            >
              ✕
            </button>
          </div>
        )}

        {/* 4 Quick Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setActiveTab('incoming')}
            className={`text-left p-3.5 rounded-2xl border transition-all ${
              activeTab === 'incoming'
                ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-400/20'
                : 'bg-slate-50/70 border-slate-100 hover:bg-slate-100/70'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 flex items-center space-x-1.5">
                <Inbox className="w-3.5 h-3.5 text-purple-600" />
                <span>Incoming Requests</span>
              </span>
              {incomingRequests.length > 0 && (
                <span className="animate-pulse px-1.5 py-0.5 bg-rose-600 text-white text-[10px] font-black rounded-full">
                  ACTION
                </span>
              )}
            </div>
            <div className="mt-1 text-2xl font-black text-slate-900">{incomingRequests.length}</div>
            <div className="text-[10px] text-slate-500 font-medium truncate">
              {incomingRequests.length > 0 ? 'Other hospitals waiting for decision' : 'All requests responded to'}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('browse')}
            className={`text-left p-3.5 rounded-2xl border transition-all ${
              activeTab === 'browse'
                ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-400/20'
                : 'bg-slate-50/70 border-slate-100 hover:bg-slate-100/70'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 flex items-center space-x-1.5">
                <Boxes className="w-3.5 h-3.5 text-blue-600" />
                <span>Peer Stock Batches</span>
              </span>
            </div>
            <div className="mt-1 text-2xl font-black text-slate-900">{availableStock.length}</div>
            <div className="text-[10px] text-slate-500 font-medium truncate">
              Available to request in other facilities
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('outgoing')}
            className={`text-left p-3.5 rounded-2xl border transition-all ${
              activeTab === 'outgoing'
                ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/20'
                : 'bg-slate-50/70 border-slate-100 hover:bg-slate-100/70'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 flex items-center space-x-1.5">
                <Send className="w-3.5 h-3.5 text-amber-600" />
                <span>My Sent Requests</span>
              </span>
            </div>
            <div className="mt-1 text-2xl font-black text-slate-900">{outgoingRequests.length}</div>
            <div className="text-[10px] text-slate-500 font-medium truncate">
              Pending answers from partner hospitals
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`text-left p-3.5 rounded-2xl border transition-all ${
              activeTab === 'ai'
                ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-400/20'
                : 'bg-slate-50/70 border-slate-100 hover:bg-slate-100/70'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>AI Rebalance Plans</span>
              </span>
            </div>
            <div className="mt-1 text-2xl font-black text-slate-900">{activeRecs.length}</div>
            <div className="text-[10px] text-slate-500 font-medium truncate">
              Algorithmic surplus reallocations
            </div>
          </button>
        </div>
      </div>

      {/* Main Tab Switcher Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('incoming')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all relative ${
            activeTab === 'incoming'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>📥 Incoming Requests (Accept / Reject)</span>
          {incomingRequests.length > 0 && (
            <span
              className={`px-2 py-0.5 text-[10px] font-black rounded-full ${
                activeTab === 'incoming' ? 'bg-white text-purple-700' : 'bg-purple-600 text-white'
              }`}
            >
              {incomingRequests.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('browse')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'browse'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <PackagePlus className="w-4 h-4" />
          <span>📤 Ask / Request Vaccine from Other Hospital</span>
          <span
            className={`px-2 py-0.5 text-[10px] font-black rounded-full ${
              activeTab === 'browse' ? 'bg-white text-blue-700' : 'bg-blue-100 text-blue-800'
            }`}
          >
            {availableStock.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('outgoing')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'outgoing'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>📋 My Sent Requests</span>
          <span
            className={`px-2 py-0.5 text-[10px] font-black rounded-full ${
              activeTab === 'outgoing' ? 'bg-white text-amber-700' : 'bg-amber-100 text-amber-800'
            }`}
          >
            {outgoingRequests.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ai')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'ai'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>🧠 AI Suggestions</span>
          <span
            className={`px-2 py-0.5 text-[10px] font-black rounded-full ${
              activeTab === 'ai' ? 'bg-white text-indigo-700' : 'bg-indigo-100 text-indigo-800'
            }`}
          >
            {activeRecs.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'history'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>📜 Audit History</span>
          <span
            className={`px-2 py-0.5 text-[10px] font-black rounded-full ${
              activeTab === 'history' ? 'bg-white text-slate-800' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {pastRecs.length}
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: INCOMING REQUESTS (Accept / Reject from other hospitals) */}
      {/* ======================================================== */}
      {activeTab === 'incoming' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <span>Incoming Vaccine Requests</span>
                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs font-bold">
                  {incomingRequests.length} pending
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Partner healthcare facilities are requesting doses from your storage. Review clinical details and choose to accept or reject.
              </p>
            </div>
          </div>

          {incomingRequests.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-3">
              <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <Inbox className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Pending Requests from Other Hospitals</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Your facility does not have any pending supply requests from neighboring hospitals.
                When a hospital requests stock from your inventory, you will be able to accept or reject it here.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('browse')}
                className="mt-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-colors"
              >
                Browse &amp; Request Vaccines from Other Facilities →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {incomingRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-white rounded-3xl border-2 border-purple-200/90 hover:border-purple-300 p-6 shadow-sm transition-all relative overflow-hidden"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    {/* Facility & Vaccine Info */}
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 bg-purple-600 text-white text-xs font-black rounded-lg flex items-center space-x-1.5 shadow-xs">
                          <Building2 className="w-3.5 h-3.5" />
                          <span>Requester: {request.target_facility_name}</span>
                        </span>
                        <span className="text-xs font-bold text-slate-500">
                          ({request.target_district || 'Regional Network'})
                        </span>
                        <Badge variant="warning">AWAITING YOUR DECISION</Badge>
                      </div>

                      {/* Main Request Callout */}
                      <div className="flex items-baseline space-x-3 bg-purple-50/60 border border-purple-100 rounded-2xl p-4">
                        <div className="text-2xl font-black text-purple-900 tracking-tight">
                          {request.recommended_doses}{' '}
                          <span className="text-base font-semibold text-purple-700">doses</span>
                        </div>
                        <div className="text-slate-400">of</div>
                        <div className="text-lg font-bold text-slate-900">{request.vaccine_name}</div>
                        <div className="text-xs text-slate-500 font-mono">
                          (Source Batch: {request.batch_number})
                        </div>
                      </div>

                      {/* Clinical Rationale Box */}
                      {request.reason && (
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60 text-xs text-slate-700 space-y-1">
                          <span className="font-bold text-slate-900 block flex items-center space-x-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-purple-600" />
                            <span>Clinical Rationale &amp; Urgency:</span>
                          </span>
                          <p className="leading-relaxed text-slate-600 italic">"{request.reason}"</p>
                        </div>
                      )}

                      <div className="text-[11px] text-slate-400 flex items-center space-x-2">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Submitted on {request.created_at || 'Recently'}</span>
                      </div>
                    </div>

                    {/* Dual Action Buttons: Reject vs Accept */}
                    <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 justify-center">
                      <button
                        type="button"
                        onClick={() => handleAction(request.id, 'ACCEPT')}
                        className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-xs hover:shadow-md transition-all flex items-center justify-center space-x-2"
                      >
                        <Check className="w-4 h-4" />
                        <span>Accept &amp; Transfer {request.recommended_doses} Doses</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAction(request.id, 'REJECT')}
                        className="px-5 py-2.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 hover:border-rose-400 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-2"
                      >
                        <X className="w-4 h-4" />
                        <span>Reject Request</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: BROWSE STOCK & ASK FOR VACCINE FROM OTHER HOSPITALS */}
      {/* ======================================================== */}
      {activeTab === 'browse' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <span>Available Vaccines at Partner Hospitals</span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">
                  {filteredStock.length} Batches
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Live inventory held by other healthcare facilities in your regional cold-chain network. Click "Request Doses" to ask for stock.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleOpenRequestModal()}
              disabled={availableStock.length === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-2 shrink-0 self-start sm:self-auto"
            >
              <PackagePlus className="w-4 h-4" />
              <span>Custom Request</span>
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by vaccine, hospital name, batch, or district..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl text-xs transition-colors focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center space-x-2 w-full md:w-auto shrink-0">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={filterVaccine}
                onChange={(e) => setFilterVaccine(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white"
              >
                <option value="ALL">All Vaccines ({uniqueVaccines.length})</option>
                {uniqueVaccines.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Available Stock Grid */}
          {filteredStock.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-3">
              <Boxes className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Matching Stock Available</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No active vaccine batches match your search criteria. Try clearing filters or check back later.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStock.map((stock) => (
                <div
                  key={stock.batch_id}
                  className="bg-white rounded-2xl border border-slate-200/90 hover:border-blue-300 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                          {stock.vaccine_name}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 mt-1.5 flex items-center space-x-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{stock.source_facility_name}</span>
                        </h4>
                        <p className="text-[11px] text-slate-500">{stock.source_district || 'Regional Partner'}</p>
                      </div>
                      <Badge variant="success">IN STOCK</Badge>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Available</span>
                        <span className="text-base font-black text-slate-900">{stock.available_doses} doses</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Batch Number</span>
                        <span className="text-xs font-mono font-bold text-slate-700 truncate block">
                          {stock.batch_number}
                        </span>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>Expires:</span>
                        </span>
                        <span className="font-semibold text-slate-700">{stock.expiry_date}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenRequestModal(stock)}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center space-x-1.5"
                  >
                    <SendHorizontal className="w-3.5 h-3.5" />
                    <span>Request Vaccine from this Hospital</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: MY SENT REQUESTS (OUTGOING TRACKING) */}
      {/* ======================================================== */}
      {activeTab === 'outgoing' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <span>My Outgoing Supply Requests</span>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-bold">
                  {outgoingRequests.length} Active
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Track vaccine requests your hospital has sent to other facilities and monitor approval status.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('browse')}
              className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5 self-start sm:self-auto"
            >
              <PackagePlus className="w-3.5 h-3.5" />
              <span>Ask for More Vaccines</span>
            </button>
          </div>

          {outgoingRequests.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-3">
              <Send className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Outgoing Requests Pending</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Your hospital has not sent any pending stock transfer requests to peer hospitals.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('browse')}
                className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Browse Partner Stocks to Request
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {outgoingRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white rounded-2xl border border-amber-200/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        Requested from: <strong className="text-blue-700">{req.source_facility_name}</strong>
                      </span>
                      <span className="text-slate-400 text-xs">({req.source_district})</span>
                    </div>

                    <div className="text-sm font-black text-slate-900 flex items-center space-x-2">
                      <span className="text-indigo-600">{req.recommended_doses} doses</span>
                      <span>·</span>
                      <span>{req.vaccine_name}</span>
                      <span className="text-xs font-mono font-normal text-slate-500">
                        (Batch: {req.batch_number})
                      </span>
                    </div>

                    {req.reason && (
                      <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        Reason: {req.reason}
                      </p>
                    )}

                    <div className="text-[11px] text-slate-400 flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Sent: {req.created_at || 'Recently'}</span>
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col items-end space-y-1">
                    <Badge variant="warning">AWAITING PARTNER APPROVAL</Badge>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Source hospital will review &amp; approve
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: AI SMART REBALANCING */}
      {/* ======================================================== */}
      {activeTab === 'ai' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <span>AI Automated Rebalancing Recommendations</span>
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-xs font-bold">
                  {activeRecs.length} Active
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Machine learning-driven rebalancing to prevent stockout in deficit clinics and minimize impending expiry wastage.
              </p>
            </div>
          </div>

          {activeRecs.length === 0 ? (
            <div className="p-8 bg-white border border-slate-200 rounded-3xl text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">Cold Chain Stock Perfectly Balanced</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No automated emergency rebalance transfers are currently flagged by AI models.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeRecs.map((rec) => (
                <div
                  key={rec.id}
                  className="bg-white rounded-3xl border-2 border-indigo-100 p-5 shadow-xs hover:border-indigo-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
                        {rec.vaccine_name}
                      </span>
                      <Badge variant="purple">AI SUGGESTION</Badge>
                    </div>

                    {/* Source -> Target Visual */}
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex-1">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Source (Surplus)</div>
                        <div className="font-bold text-slate-800 truncate">{rec.source_facility_name}</div>
                        <div className="text-[11px] text-slate-500">{rec.source_district}</div>
                      </div>

                      <div className="px-3 text-center shrink-0">
                        <ArrowRight className="w-5 h-5 text-indigo-600 mx-auto" />
                        <span className="text-[10px] font-bold text-indigo-700 block mt-0.5">
                          {rec.recommended_doses} doses
                        </span>
                      </div>

                      <div className="flex-1 text-right">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Target (Shortage)</div>
                        <div className="font-bold text-slate-800 truncate">{rec.target_facility_name}</div>
                        <div className="text-[11px] text-slate-500">{rec.target_district}</div>
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">
                        Algorithmic Rationale:
                      </span>
                      <p className="text-xs text-slate-700 leading-relaxed bg-amber-50/60 p-2.5 rounded-xl border border-amber-100/80">
                        {rec.reason}
                      </p>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center space-x-2">
                      <Boxes className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Batch: <strong>{rec.batch_number}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => handleAction(rec.id, 'DISMISS')}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl"
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAction(rec.id, 'ACCEPT')}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Execute Redistribution</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: AUDIT HISTORY & PAST TRANSFERS */}
      {/* ======================================================== */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <span>Inter-Facility Transfer Audit Log</span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-full text-xs font-bold">
                  {pastRecs.length} Records
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Complete historical record of completed, rejected, and dismissed inter-hospital vaccine transfers.
              </p>
            </div>
          </div>

          {pastRecs.length === 0 ? (
            <div className="p-8 bg-white border border-slate-200 rounded-3xl text-center text-xs text-slate-500">
              No historical transfers recorded yet.
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Date / Time</th>
                      <th className="py-3 px-4">Vaccine &amp; Batch</th>
                      <th className="py-3 px-4">Doses</th>
                      <th className="py-3 px-4">Transfer Route</th>
                      <th className="py-3 px-4">Clinical Rationale</th>
                      <th className="py-3 px-4 text-right">Final Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {pastRecs.map((r) => {
                      const isSource = r.source_facility_id === user.id;
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                            {r.created_at || 'Recorded'}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            <div>{r.vaccine_name}</div>
                            <div className="text-[10px] font-mono font-normal text-slate-400">
                              Batch: {r.batch_number}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-black text-indigo-700 whitespace-nowrap">
                            {r.recommended_doses} doses
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-1.5 font-medium text-slate-800">
                              <span className={isSource ? 'font-bold text-blue-700' : ''}>
                                {r.source_facility_name}
                              </span>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className={!isSource ? 'font-bold text-emerald-700' : ''}>
                                {r.target_facility_name}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate" title={r.reason}>
                            {r.reason || 'Standard inter-facility transfer'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Badge variant={r.status === 'COMPLETED' ? 'success' : r.status === 'REJECTED' ? 'danger' : 'default'}>
                              {r.status}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: SUBMIT PEER VACCINE REQUEST */}
      {/* ======================================================== */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                  Inter-Facility Request Form
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  Request Vaccine from Partner Hospital
                </h3>
                <p className="text-xs text-slate-500">
                  Submit a formal dose request to another healthcare facility in the regional cold-chain network.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="space-y-4">
              {/* Target Facility & Batch Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Select Target Hospital &amp; Available Batch</span>
                  {selectedStockItem && (
                    <span className="text-emerald-700 font-semibold text-[11px]">
                      {selectedStockItem.available_doses} doses available
                    </span>
                  )}
                </label>
                <select
                  required
                  value={selectedStockItem ? String(selectedStockItem.batch_id) : ''}
                  onChange={(e) => {
                    const batchId = e.target.value;
                    const stock = availableStock.find((item) => String(item.batch_id) === batchId);
                    setSelectedStockItem(stock || null);
                    if (stock) {
                      setRequestedDoses((prev) => Math.min(prev || 50, stock.available_doses));
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  {availableStock.map((stock) => (
                    <option key={stock.batch_id} value={stock.batch_id}>
                      {stock.vaccine_name} · {stock.source_facility_name} ({stock.available_doses} doses avail, Batch {stock.batch_number})
                    </option>
                  ))}
                </select>
              </div>

              {/* Doses Quantity with Stepper and Quick Presets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Doses Requested</label>
                  <span className="text-[11px] text-slate-500">
                    Max: {selectedStockItem?.available_doses || 0}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="1"
                    max={selectedStockItem?.available_doses || 1000}
                    value={requestedDoses}
                    onChange={(e) => setRequestedDoses(Math.max(1, Number(e.target.value)))}
                    required
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <div className="flex space-x-1">
                    {[25, 50, 100].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() =>
                          setRequestedDoses(Math.min(preset, selectedStockItem?.available_doses || preset))
                        }
                        className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                      >
                        {preset}
                      </button>
                    ))}
                    {selectedStockItem && (
                      <button
                        type="button"
                        onClick={() => setRequestedDoses(selectedStockItem.available_doses)}
                        className="px-2.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition-colors"
                      >
                        Max
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Urgency Level Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Clinical Urgency</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'ROUTINE', label: 'Routine Buffer' },
                    { key: 'URGENT', label: 'Urgent Shortage' },
                    { key: 'EMERGENCY', label: 'Emergency Camp' }
                  ].map((level) => (
                    <button
                      key={level.key}
                      type="button"
                      onClick={() => setUrgencyLevel(level.key)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                        urgencyLevel === level.key
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Justification / Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Clinical Rationale &amp; Justification Note
                </label>
                <textarea
                  rows={3}
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="e.g. Critical stockout anticipated before tomorrow's vaccination drive. Buffer storage exhausted."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-slate-400"
                ></textarea>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest || !selectedStockItem}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md transition-all flex items-center space-x-2"
                >
                  <SendHorizontal className="w-4 h-4" />
                  <span>{submittingRequest ? 'Submitting Request...' : 'Send Request to Hospital'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
