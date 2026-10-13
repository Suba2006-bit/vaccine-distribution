import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

// Dedicated Separate Login Pages & Gateway
import PortalLanding from './pages/Auth/PortalLanding';
import HospitalLogin from './pages/Auth/HospitalLogin';
import ManufacturerLogin from './pages/Auth/ManufacturerLogin';

// Hospital Pages
import HospitalDashboard from './pages/Hospital/HospitalDashboard';
import InventoryManagement from './pages/Hospital/InventoryManagement';
import ThermalTrackingHub from './pages/Hospital/ThermalTrackingHub';
import DemandForecasting from './pages/Hospital/DemandForecasting';
import StockAnalysis from './pages/Hospital/StockAnalysis';
import VaccineRequests from './pages/Hospital/VaccineRequests';
import RedistributionHub from './pages/Hospital/RedistributionHub';
import HospitalQueries from './pages/Hospital/HospitalQueries';

// Manufacturer Pages
import ManufacturerDashboard from './pages/Manufacturer/ManufacturerDashboard';
import DemandPlanning from './pages/Manufacturer/DemandPlanning';
import RequestFulfillment from './pages/Manufacturer/RequestFulfillment';
import SupplyPlanning from './pages/Manufacturer/SupplyPlanning';
import TransitTracking from './pages/Manufacturer/TransitTracking';
import InventoryRequirements from './pages/Manufacturer/InventoryRequirements';
import ManufacturerQueries from './pages/Manufacturer/ManufacturerQueries';

function MainApp() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  // Authentication door state: 'GATEWAY', 'HOSPITAL', or 'MANUFACTURER'
  const [portalState, setPortalState] = useState('GATEWAY');

  useEffect(() => {
    if (user) {
      if (user.role === 'MANUFACTURER') {
        if (!activeTab.startsWith('mfg-')) {
          setActiveTab('mfg-dashboard');
        }
      } else {
        if (activeTab.startsWith('mfg-')) {
          setActiveTab('dashboard');
        }
      }
    }
  }, [user?.role, user?.id, activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-xs font-semibold text-slate-500">Initializing VaxTrack Platform...</p>
        </div>
      </div>
    );
  }

  // Not logged in: Show 2 Separate Login Pages or Portal Gateway
  if (!user) {
    if (portalState === 'HOSPITAL') {
      return (
        <HospitalLogin
          onBackToGateway={() => setPortalState('GATEWAY')}
          onSwitchToManufacturer={() => setPortalState('MANUFACTURER')}
        />
      );
    }
    if (portalState === 'MANUFACTURER') {
      return (
        <ManufacturerLogin
          onBackToGateway={() => setPortalState('GATEWAY')}
          onSwitchToHospital={() => setPortalState('HOSPITAL')}
        />
      );
    }
    return <PortalLanding onSelectPortal={(portal) => setPortalState(portal)} />;
  }

  const isHospital = user.role === 'HOSPITAL';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
          {/* Hospital Routes */}
          {isHospital && (
            <>
              {activeTab === 'dashboard' && <HospitalDashboard setActiveTab={setActiveTab} />}
              {activeTab === 'inventory' && <InventoryManagement />}
              {activeTab === 'thermal' && <ThermalTrackingHub />}
              {activeTab === 'demand' && <DemandForecasting />}
              {activeTab === 'stock' && <StockAnalysis setActiveTab={setActiveTab} />}
              {activeTab === 'requests' && <VaccineRequests />}
              {activeTab === 'redistribution' && <RedistributionHub />}
              {activeTab === 'queries' && <HospitalQueries />}
            </>
          )}

          {/* Manufacturer Routes */}
          {!isHospital && (
            <>
              {activeTab === 'mfg-dashboard' && <ManufacturerDashboard setActiveTab={setActiveTab} />}
              {activeTab === 'mfg-demand' && <DemandPlanning setActiveTab={setActiveTab} />}
              {activeTab === 'mfg-requests' && <RequestFulfillment />}
              {activeTab === 'mfg-supply' && <SupplyPlanning />}
              {activeTab === 'mfg-transit' && <TransitTracking />}
              {activeTab === 'mfg-requirements' && <InventoryRequirements />}
              {activeTab === 'mfg-queries' && <ManufacturerQueries />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
