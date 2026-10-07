import React, { useEffect, useState } from 'react';
import { X, Receipt, Download, Loader2, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { fetchMyPayments, PaymentRecord } from '../utils/api';

interface PaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  getApiUrl: (path: string) => string;
  isDark: boolean;
}

export const PaymentHistoryModal: React.FC<PaymentHistoryModalProps> = ({
  isOpen,
  onClose,
  getApiUrl,
  isDark,
}) => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PaymentRecord | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    setSelected(null);
    fetchMyPayments(getApiUrl)
      .then((res) => {
        if (mounted) setPayments(res.payments || []);
      })
      .catch((e) => {
        if (mounted) setError(e?.message || 'Payment history load nahi ho payi.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [isOpen, getApiUrl]);

  if (!isOpen) return null;

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const downloadReceipt = (p: PaymentRecord) => {
    const lines = [
      '════════════════════════════════════════════',
      '         TEJAS AI — PAYMENT RECEIPT',
      '════════════════════════════════════════════',
      '',
      `Receipt / Tx ID : ${p.txId}`,
      `Date            : ${formatDate(p.createdAt)}`,
      '',
      '--- PLAN DETAILS ---',
      `Plan            : ${p.planName}`,
      `Model           : ${p.modelId}`,
      `Duration        : ${p.period} (${p.durationDays} days)`,
      `Amount Paid     : ₹${p.amount}`,
      '',
      '--- PAYMENT DETAILS ---',
      `Method          : ${p.paymentMethod.toUpperCase()}`,
      p.utrNumber ? `UTR / Reference : ${p.utrNumber}` : 'UTR / Reference : —',
      `Transaction ID  : ${p.txId}`,
      `Status          : SUCCESS`,
      '',
      '════════════════════════════════════════════',
      'Thank you for subscribing to Tejas AI.',
      'For support, contact: support@tejasai.app',
      '════════════════════════════════════════════',
    ].join('\n');

    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tejas-receipt-${p.txId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto p-3 sm:p-4 bg-black/70 backdrop-blur-sm flex justify-center items-start sm:items-center min-h-screen animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-2xl my-auto max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
          isDark ? 'bg-[#18181b] border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-3.5 border-b shrink-0 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
          <div className="flex items-center gap-2.5">
            {selected ? (
              <button
                type="button"
                onClick={() => setSelected(null)}
                className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            )}
            <div>
              <h2 className="text-sm sm:text-base font-bold">
                {selected ? 'Payment Details' : 'Payment History'}
              </h2>
              <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {selected ? 'Full receipt details' : 'All your past subscription payments'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {loading && (
            <div className="flex items-center justify-center gap-2 text-zinc-400 py-16">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading history…</span>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <AlertCircle className="w-8 h-8 text-rose-400" />
              <p className="text-sm text-zinc-400">{error}</p>
            </div>
          )}

          {!loading && !error && selected && (
            <div className="space-y-3">
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-400">Payment Successful</span>
                </div>
                <div className="space-y-2 text-xs">
                  <Row label="Receipt / Tx ID" value={selected.txId} mono />
                  <Row label="Date" value={formatDate(selected.createdAt)} />
                  <Row label="Plan" value={selected.planName} />
                  <Row label="Model" value={selected.modelId} mono />
                  <Row label="Duration" value={`${selected.period} (${selected.durationDays} days)`} />
                  <Row label="Amount Paid" value={`₹${selected.amount}`} highlight />
                  <Row label="Payment Method" value={selected.paymentMethod.toUpperCase()} />
                  <Row label="UTR / Reference" value={selected.utrNumber || '—'} mono />
                </div>
              </div>

              <button
                type="button"
                onClick={() => downloadReceipt(selected)}
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-cyan-700 to-blue-700 hover:from-cyan-600 hover:to-blue-600 text-white flex items-center justify-center gap-2 transition-all shadow-md shadow-cyan-950/20"
              >
                <Download className="w-4 h-4" />
                Download Receipt (.txt)
              </button>
            </div>
          )}

          {!loading && !error && !selected && payments.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <Receipt className="w-8 h-8 text-zinc-500" />
              <p className="text-sm text-zinc-400">No payments yet.</p>
              <p className="text-xs text-zinc-500">Subscription kharidne ke baad history yahan dikhegi.</p>
            </div>
          )}

          {!loading && !error && !selected && payments.length > 0 && (
            <div className="space-y-2">
              {payments.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelected(p)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                    isDark
                      ? 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                      : 'bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{p.planName}</p>
                      <p className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        {formatDate(p.createdAt)} • {p.paymentMethod.toUpperCase()}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-emerald-400">₹{p.amount}</p>
                      <p className={`text-[10px] font-mono ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        {p.txId.slice(0, 16)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Simple label/value row for the detail view
const Row: React.FC<{ label: string; value: string; mono?: boolean; highlight?: boolean }> = ({
  label,
  value,
  mono,
  highlight,
}) => (
  <div className="flex items-start justify-between gap-3 py-1">
    <span className="text-zinc-500 shrink-0">{label}</span>
    <span
      className={`text-right break-all ${mono ? 'font-mono' : ''} ${
        highlight ? 'text-emerald-400 font-bold' : ''
      }`}
    >
      {value}
    </span>
  </div>
);
