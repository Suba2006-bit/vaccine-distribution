import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Factory, ShieldCheck, Mail, Lock, ArrowRight, ArrowLeft, Truck, Building2 } from 'lucide-react';

export default function ManufacturerLogin({ onBackToGateway, onSwitchToHospital }) {
  const { login, logout, demoUsers, loginAs } = useAuth();
  const [email, setEmail] = useState('manufacturer@serumlab.com');
  const [password, setPassword] = useState('admin123');
  const [plantId, setPlantId] = useState('PLANT-APEX-09');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedUser = await login(email, password);
      if (loggedUser.role !== 'MANUFACTURER') {
        logout();
        setError('Access Denied: This account belongs to a Hospital / Clinic. Please sign in through the Hospital Login Portal.');
      }
    } catch (err) {
      setError(err.message || 'Manufacturer login failed. Verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const manufacturerDemoUsers = demoUsers.filter((u) => u.role === 'MANUFACTURER');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/50 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 bg-white rounded-3xl shadow-2xl overflow-hidden border border-purple-100">
        
        {/* Left Side: Manufacturer Branding & Quick Access */}
        <div className="bg-gradient-to-br from-purple-950 via-indigo-950 to-slate-950 p-8 text-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-8">
              <button
                type="button"
                onClick={onBackToGateway}
                className="text-xs text-purple-200 hover:text-white flex items-center space-x-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Portal Selection</span>
              </button>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-400/30 px-2.5 py-0.5 rounded-full">
                Portal 2: Manufacturer
              </span>
            </div>

            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Factory className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">VaxTrack Central</h1>
                <p className="text-xs text-purple-200">Vaccine Production & Logistics Plant</p>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              <h2 className="text-2xl font-bold text-white leading-tight">
                National Supply & Production Control
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Log in to synthesize regional hospital demand, approve and dispatch cold-freight orders, schedule cleanroom batch filling, and verify in-transit temperatures.
              </p>
            </div>
          </div>

          {/* Quick Demo Accounts for Manufacturer */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-purple-300 mb-2.5">
              ⚡ 1-Click Manufacturer Demo Account (For Viva)
            </div>
            <div className="space-y-2">
              {manufacturerDemoUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => loginAs(u)}
                  className="w-full text-left p-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center space-x-2.5">
                    <Factory className="w-4 h-4 text-purple-300 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-purple-200">
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

        {/* Right Side: Manufacturer Login Form */}
        <div className="p-8 sm:p-10 flex flex-col justify-center">
          <div className="mb-6">
            <div className="flex items-center space-x-2 text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">
              <Factory className="w-4 h-4" />
              <span>Pharmaceutical Facility Access</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900">Manufacturer Login</h3>
            <p className="text-xs text-slate-500 mt-1">
              Sign in with your manufacturing plant credentials
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
                Manufacturer Corporate Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manufacturer@serumlab.com"
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
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
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Manufacturing Plant ID / License Number
              </label>
              <input
                type="text"
                value={plantId}
                onChange={(e) => setPlantId(e.target.value)}
                placeholder="PLANT-APEX-09"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-purple-500/10 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{loading ? 'Validating Plant Access...' : 'Sign In to Manufacturer Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Switch to Hospital Link */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Hospital or Pharmacy Staff?</span>
            <button
              type="button"
              onClick={onSwitchToHospital}
              className="font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Go to Hospital Login →</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
