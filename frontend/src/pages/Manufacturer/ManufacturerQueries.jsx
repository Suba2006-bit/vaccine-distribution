import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import Badge from '../../components/Badge';
import {
  HelpCircle,
  MessageSquare,
  CheckCircle2,
  Clock,
  Send,
  Building2
} from 'lucide-react';

export default function ManufacturerQueries() {
  const { user } = useAuth();
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyingTicketId, setReplyingTicketId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [message, setMessage] = useState('');

  const loadQueries = async () => {
    try {
      const qList = await api.getQueries(user.id, 'MANUFACTURER');
      setQueries(qList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueries();
  }, []);

  const handleSendReply = async (queryId) => {
    try {
      await api.replyQuery(queryId, { reply: replyText, status: 'RESOLVED' });
      setMessage('Reply transmitted to hospital and ticket resolved.');
      setReplyingTicketId(null);
      setReplyText('');
      loadQueries();
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Hospital Communications & Query Desk</h1>
      </div>

      {message && (
        <div className="p-3 bg-purple-50 border border-purple-200 text-purple-800 rounded-xl text-xs flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-purple-600 font-bold hover:underline">
            ✕
          </button>
        </div>
      )}

      {/* Query List */}
      <div className="space-y-4">
        {queries.map((q) => (
          <div key={q.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-slate-800">#TKT-{q.id.toString().padStart(4, '0')}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-100">
                  {q.sender_name}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
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

            {/* Existing Reply */}
            {q.reply && (
              <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-xs space-y-1">
                <div className="flex items-center space-x-1.5 text-emerald-800 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Resolution Transmitted:</span>
                </div>
                <p className="text-emerald-950 leading-relaxed">{q.reply}</p>
              </div>
            )}

            {/* Reply Action */}
            {replyingTicketId === q.id ? (
              <div className="pt-2 space-y-2">
                <textarea
                  rows="3"
                  placeholder="Draft resolution or provide cold-chain stability records..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
                <div className="flex items-center justify-end space-x-2">
                  <button
                    onClick={() => {
                      setReplyingTicketId(null);
                      setReplyText('');
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSendReply(q.id)}
                    className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Resolution & Resolve</span>
                  </button>
                </div>
              </div>
            ) : (
              !q.reply && (
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => {
                      setReplyingTicketId(q.id);
                      setReplyText('');
                    }}
                    className="px-3.5 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Reply & Resolve Ticket</span>
                  </button>
                </div>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
