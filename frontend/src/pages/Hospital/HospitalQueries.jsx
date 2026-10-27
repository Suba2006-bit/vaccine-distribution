import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import Badge from '../../components/Badge';
import {
  HelpCircle,
  Plus,
  Send,
  MessageSquare,
  Clock,
  CheckCircle2
} from 'lucide-react';

export default function HospitalQueries() {
  const { user } = useAuth();
  const [queries, setQueries] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const [formData, setFormData] = useState({
    subject: '',
    category: 'GENERAL',
    message: ''
  });

  const loadQueries = async () => {
    try {
      const qList = await api.getQueries(user.id, 'HOSPITAL');
      setQueries(qList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadQueries();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createQuery({
        sender_id: user.id,
        ...formData
      });
      setMessage('Query ticket submitted to manufacturer.');
      setIsModalOpen(false);
      setFormData({ subject: '', category: 'GENERAL', message: '' });
      loadQueries();
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Query & Support Desk</h1>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center space-x-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Query Ticket</span>
        </button>
      </div>

      {message && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-blue-600 font-bold hover:underline">
            ✕
          </button>
        </div>
      )}

      {/* Query List */}
      <div className="space-y-4">
        {queries.length === 0 ? (
          <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center text-xs text-slate-500">
            No active queries filed.
          </div>
        ) : (
          queries.map((q) => (
            <div key={q.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-900">#TKT-{q.id.toString().padStart(4, '0')}</span>
                  <span className="text-xs px-2 py-0.5 rounded-md font-semibold bg-slate-100 text-slate-700">
                    {q.category}
                  </span>
                </div>
                <Badge>{q.status}</Badge>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900">{q.subject}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {q.message}
                </p>
              </div>

              {/* Manufacturer Reply */}
              {q.reply ? (
                <div className="mt-3 p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-xs space-y-1">
                  <div className="flex items-center space-x-1.5 text-emerald-800 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Response from Manufacturer:</span>
                  </div>
                  <p className="text-emerald-950 leading-relaxed">{q.reply}</p>
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Awaiting response from manufacturer support team...</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* New Query Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Create Support Query</h3>
            <p className="text-xs text-slate-500 mb-4">
              Send an inquiry regarding cold-chain stability, batch records, or delivery timing.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Temperature verification during interstate transit"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Inquiry Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                >
                  <option value="GENERAL">General Communication</option>
                  <option value="TEMPERATURE_EXCURSION">Cold Chain Excursion / Stability</option>
                  <option value="ORDER_STATUS">Order Status & Expedited Dispatch</option>
                  <option value="STOCK_ISSUE">Batch Quality Verification</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Message Details</label>
                <textarea
                  rows="4"
                  placeholder="Explain the specific inquiry or required documentation..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
