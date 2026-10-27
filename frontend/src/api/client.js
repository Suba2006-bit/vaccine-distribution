const API_BASE = '/api';

async function executeRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  };

  try {
    const res = await fetch(url, config);
    const text = await res.text();
    let data = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        if (!res.ok) {
          throw new Error(`Server connection issue (${res.status}): Please ensure the VaxTrack backend is running.`);
        }
        data = { message: text };
      }
    }

    if (!res.ok) {
      const errorMsg = data.error || data.message || (res.status === 502 || res.status === 503 || res.status === 504 
        ? 'Cannot connect to backend server. The backend API is starting up...' 
        : `Request failed with status ${res.status}`);
      throw new Error(errorMsg);
    }
    return data;
  } catch (err) {
    if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to load') || err.message.includes('unexpected end of data') || err.message.includes('Unexpected end of JSON'))) {
      throw new Error('VaxTrack backend server is starting up or unreachable. Please wait a moment...');
    }
    throw err;
  }
}

async function request(endpoint, options = {}, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await executeRequest(endpoint, options);
    } catch (err) {
      const isTransient = err.message && (
        err.message.includes('starting up') ||
        err.message.includes('Cannot connect') ||
        err.message.includes('502') ||
        err.message.includes('503') ||
        err.message.includes('504') ||
        err.message.includes('unreachable')
      );
      if (isTransient && attempt < retries) {
        console.warn(`[VaxTrack] Waiting for backend API on ${endpoint}... (retry ${attempt + 1}/${retries})`);
        await new Promise((r) => setTimeout(r, 1200));
        continue;
      }
      console.error(`API Error on ${endpoint}:`, err);
      throw err;
    }
  }
}

export const api = {
  // Auth
  getDemoUsers: () => request('/auth/demo-users'),
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (userData) => request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),

  // Inventory
  getVaccines: () => request('/inventory/vaccines'),
  getBatches: (facilityId) => request(`/inventory/batches?facility_id=${facilityId}`),
  createBatch: (batchData) => request('/inventory/batches', { method: 'POST', body: JSON.stringify(batchData) }),
  consumeDoses: (batchId, doses) => request(`/inventory/batches/${batchId}/consume`, {
    method: 'POST',
    body: JSON.stringify({ doses_to_consume: doses })
  }),
  quarantineBatch: (batchId, status, reason) => request(`/inventory/batches/${batchId}/quarantine`, {
    method: 'POST',
    body: JSON.stringify({ status, reason })
  }),

  // Thermal Tracking (Method A Hero + Dataset Integration)
  getDatasetTelemetry: () => request('/thermal/dataset-telemetry'),
  getThermalLogs: (facilityId, unitName = 'Main Cold Room A', limit = 40) =>
    request(`/thermal/logs?facility_id=${facilityId}&unit_name=${encodeURIComponent(unitName)}&limit=${limit}`),
  getThermalAnalysis: (facilityId, unitName = 'Main Cold Room A') =>
    request(`/thermal/analysis?facility_id=${facilityId}&unit_name=${encodeURIComponent(unitName)}`),
  simulateStep: (payload) => request('/thermal/simulate-step', { method: 'POST', body: JSON.stringify(payload) }),
  simulateBurst: (payload) => request('/thermal/simulate-burst', { method: 'POST', body: JSON.stringify(payload) }),
  autoQuarantine: (payload) => request('/thermal/auto-quarantine', { method: 'POST', body: JSON.stringify(payload) }),
  resetThermal: (payload) => request('/thermal/reset', { method: 'POST', body: JSON.stringify(payload) }),

  // Analytics & AI
  getDemandForecast: (facilityId, vaccineId) =>
    request(`/analytics/demand-forecast?facility_id=${facilityId}&vaccine_id=${vaccineId}`),
  getStockStatus: (facilityId) => request(`/analytics/stock-status?facility_id=${facilityId}`),
  getExpiryRisk: (facilityId) => request(`/analytics/expiry-risk?facility_id=${facilityId}`),

  // Vaccine Requests
  getRequests: (facilityId, role) => request(`/requests?facility_id=${facilityId}&role=${role}`),
  createRequest: (reqData) => request('/requests', { method: 'POST', body: JSON.stringify(reqData) }),
  updateRequestStatus: (reqId, statusData) =>
    request(`/requests/${reqId}/update-status`, { method: 'POST', body: JSON.stringify(statusData) }),

  // Redistribution
  getRedistributions: () => request('/redistribution/recommendations'),
  getRedistributionAvailableStock: (facilityId) =>
    request(`/redistribution/available-stock?facility_id=${facilityId}`),
  createRedistributionRequest: (requestData) =>
    request('/redistribution/requests', { method: 'POST', body: JSON.stringify(requestData) }),
  actionRedistribution: (recId, action, facilityId) =>
    request(`/redistribution/recommendations/${recId}/action`, {
      method: 'POST',
      body: JSON.stringify({ action, facility_id: facilityId }),
    }),

  // Queries
  getQueries: (facilityId, role) => request(`/queries?facility_id=${facilityId}&role=${role}`),
  createQuery: (queryData) => request('/queries', { method: 'POST', body: JSON.stringify(queryData) }),
  replyQuery: (queryId, replyData) =>
    request(`/queries/${queryId}/reply`, { method: 'POST', body: JSON.stringify(replyData) }),

  // Manufacturer
  getAggregateDemand: () => request('/manufacturer/aggregate-demand'),
  getProductionPlans: () => request('/manufacturer/production-plans'),
  createProductionPlan: (planData) =>
    request('/manufacturer/production-plans', { method: 'POST', body: JSON.stringify(planData) }),
  getInventoryRequirements: () => request('/manufacturer/inventory-requirements'),
};
