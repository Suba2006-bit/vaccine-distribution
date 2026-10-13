import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Building2, Factory, ArrowRight, Lock, Mail } from 'lucide-react';

export default function Login() {
  const { login, demoUsers, loginAs } = useAuth();
  const [role, setRole] = useState('HOSPITAL');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200/80">
        {/* Left Side: Brand & Quick Demo Access */}
        <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-8 text-white flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg">
                <ShieldCheck className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">VaxTrack</h1>
                <p className="text-xs text-blue-200">Vaccine Inventory & Cold-Chain Hub</p>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              <h2 className="text-2xl font-bold text-white leading-tight">
                Intelligent Vaccine Logistics & Thermal Tracking
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                CSE software platform providing AI-driven demand forecasting, Mean Kinetic Temperature analysis, and real-time cold-storage excursion simulation.
              </p>
            </div>
          </div>

          {/* Quick Demo Login Cards */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-300 mb-3">
              ⚡ Quick 1-Click Demo Login (For Viva)
            </div>
            <div className="space-y-2">
              {demoUsers.map((u) => {
                const isMfg = u.role === 'MANUFACTURER';
                return (
                  <button
                    key={u.id}
                    onClick={() => loginAs(u)}
                    className="w-full text-left p-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center space-x-2.5">
                      {isMfg ? (
                        <Factory className="w-5 h-5 text-purple-400 shrink-0" />
                      ) : (
                        <Building2 className="w-5 h-5 text-blue-400 shrink-0" />
                      )}
                      <div>
                        <div className="text-xs font-semibold text-white group-hover:text-blue-200 transition-colors">
                          {u.facility_name}
                        </div>
                        <div className="text-[11px] text-slate-300">
                          {isMfg ? 'Manufacturer' : 'Hospital / Pharmacy'} • {u.district}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Traditional Login Form */}
        <div className="p-8 sm:p-10 flex flex-col justify-center">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-slate-900">Sign In</h3>
            <p className="text-sm text-slate-500 mt-1">Select your account role to proceed</p>
          </div>

          {/* Role Toggle */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setRole('HOSPITAL');
                setEmail('hospital@citycare.org');
                setPassword('hospital123');
              }}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center space-x-2 transition-all ${
                role === 'HOSPITAL'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Hospital / Pharmacy</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRole('MANUFACTURER');
                setEmail('manufacturer@serumlab.com');
                setPassword('admin123');
              }}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center space-x-2 transition-all ${
                role === 'MANUFACTURER'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Factory className="w-4 h-4" />
              <span>Manufacturer</span>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@facility.org"
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-sm transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Pre-configured credentials are pre-filled on role switch.
          </div>
        </div>
      </div>
    </div>
  );
}
