import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import Badge from '../../components/Badge';
import {
  Truck,
  ThermometerSnowflake,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  Clock,
  ArrowRight
} from 'lucide-react';

export default function TransitTracking() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getRequests(user.id, 'MANUFACTURER')
      .then((data) => setRequests(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const dispatchedShipments = requests.filter((r) => r.status === 'DISPATCHED' || r.status === 'APPROVED');
  const deliveredShipments = requests.filter((r) => r.status === 'DELIVERED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Cold-Chain Distribution & Transit Monitoring</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Simulated freight route tracking and in-transit temperature integrity verification.
        </p>
      </div>

      {/* Active Dispatches */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
          <Truck className="w-4 h-4 text-purple-600" />
          <span>Active Freight Shipments ({dispatchedShipments.length})</span>
        </h2>

        {dispatchedShipments.length === 0 ? (
          <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center text-xs text-slate-500">
            No active freight shipments currently in transit.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dispatchedShipments.map((shipment) => (
              <div
                key={shipment.id}
                className="bg-white rounded-2xl border-2 border-purple-100 p-5 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-800">
                    #ORD-{shipment.id.toString().padStart(4, '0')}
                  </span>
                  <Badge>{shipment.status}</Badge>
                </div>

                <div className="flex items-center justify-between text-xs p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <div className="font-bold text-slate-900">{shipment.vaccine_name}</div>
                    <div className="text-slate-500">{shipment.requested_doses.toLocaleString()} doses</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900">{shipment.requesting_facility_name}</div>
                    <div className="text-slate-500">{shipment.requesting_district}</div>
                  </div>
                </div>

                {/* Simulated Transit Temperature Telemetry */}
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ThermometerSnowflake className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-emerald-900">
                        In-Transit Temp: {shipment.transit_temperature || 4.2}°C
                      </div>
                      <div className="text-[10px] text-emerald-700">
                        Passive PCM Phase Change Container • Safe
                      </div>
                    </div>
                  </div>
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </div>

                <div className="text-[11px] text-slate-500">
                  Packaging: <span className="font-medium text-slate-700">{shipment.dispatch_notes || 'Refrigerated van with temperature logger.'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delivered Archive */}
      {deliveredShipments.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-slate-900">Successfully Delivered Shipments</h2>
          <div className="space-y-2">
            {deliveredShipments.map((d) => (
              <div key={d.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800">#ORD-{d.id.toString().padStart(4, '0')}</span>
                  <span className="text-slate-600"> — {d.requested_doses} doses of {d.vaccine_name} to {d.requesting_facility_name}</span>
                </div>
                <Badge variant="success">DELIVERED</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
