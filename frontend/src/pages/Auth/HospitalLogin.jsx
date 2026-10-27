import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Building2, ShieldCheck, Mail, Lock, ArrowRight, ArrowLeft, ThermometerSnowflake, CheckCircle2, Factory } from 'lucide-react';

const DEMO_PASSWORDS = {
  'hospital@citycare.org': 'hospital123',
  'clinic@greenvalley.org': 'clinic123',
};

export default function HospitalLogin({ onBackToGateway, onSwitchToManufacturer }) {
  const { login, logout, demoUsers } = useAuth();
  const [email, setEmail] = useState('hospital@citycare.org');
  const [password, setPassword] = useState('hospital123');
  const [deptCode, setDeptCode] = useState('CLINIC-PHARM-01');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedUser = await login(email, password);
      if (loggedUser.role !== 'HOSPITAL') {
        logout();
        setError('Access Denied: This account belongs to a Manufacturer. Please sign in through the Manufacturer Portal.');
      }
    } catch (err) {
      setError(err.message || 'Hospital login failed. Verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const hospitalDemoUsers = demoUsers.filter((u) => u.role === 'HOSPITAL');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 bg-white rounded-3xl shadow-2xl overflow-hidden border border-blue-100">
        
        {/* Left Side: Hospital Branding & Quick Access */}
        <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 p-8 text-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-8">
              <button
                type="button"
                onClick={onBackToGateway}
                className="text-xs text-blue-200 hover:text-white flex items-center space-x-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Portal Selection</span>
              </button>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2.5 py-0.5 rounded-full">
                Portal 1: Hospital / Pharmacy
              </span>
            </div>

            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">VaxTrack Clinical</h1>
                <p className="text-xs text-blue-200">Hospital & Pharmacy Inventory Hub</p>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              <h2 className="text-2xl font-bold text-white leading-tight">
                Hospital Cold-Chain & Batch Management
              </h2>
            </div>
          </div>

          {/* Quick Demo Accounts for Hospital */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-300 mb-2.5">
              ⚡ Hospital Demo Accounts
            </div>
            <div className="space-y-2">
              {hospitalDemoUsers.map((u) => (
                <button
                  type="button"
                  key={u.id}
                  onClick={() => {
                    setEmail(u.email);
                    setPassword(DEMO_PASSWORDS[u.email] || 'demo');
                    setError('');
                  }}
                  className="w-full text-left p-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center space-x-2.5">
                    <Building2 className="w-4 h-4 text-blue-300 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-blue-200">
                        {u.facility_name}
                      </div>
                      <div className="text-[11px] text-slate-300">
                        {u.district} • {u.email}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Hospital Login Form */}
        <div className="p-8 sm:p-10 flex flex-col justify-center">
          <div className="mb-6">
            <div className="flex items-center space-x-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
              <Building2 className="w-4 h-4" />
              <span>Healthcare Facility Access</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900">Hospital / Pharmacy Login</h3>
            <p className="text-xs text-slate-500 mt-1">
              Sign in with your clinical facility credentials
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hospital Account Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hospital@citycare.org"
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Account Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Clinical Department / Station Code
              </label>
              <input
                type="text"
                value={deptCode}
                onChange={(e) => setDeptCode(e.target.value)}
                placeholder="CLINIC-PHARM-01"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-blue-500/10 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{loading ? 'Validating Clinic Access...' : 'Sign In to Hospital Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Switch to Manufacturer Link */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Vaccine Manufacturer?</span>
            <button
              type="button"
              onClick={onSwitchToManufacturer}
              className="font-bold text-purple-600 hover:text-purple-700 flex items-center space-x-1"
            >
              <Factory className="w-3.5 h-3.5" />
              <span>Go to Manufacturer Login →</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
