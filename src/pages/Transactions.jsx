import React, { useState, useMemo } from 'react';
import { Search, Receipt, ChevronDown, ChevronUp, RefreshCw, XCircle, Edit2 } from 'lucide-react';
import { useTransactionStore } from '../stores/transactionStore';
import { formatRupiah, formatDateTime } from '../utils';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';

const PAYMENT_METHODS = ['Cash', 'QRIS', 'Transfer Bank', 'E-wallet'];

const STATUS_BADGE = {
  completed: 'bg-green-100 text-green-700',
  refunded: 'bg-red-100 text-red-700',
  partial_refund: 'bg-amber-100 text-amber-700',
  voided: 'bg-gray-100 text-gray-500 line-through',
};
const STATUS_LABEL = {
  completed: 'Selesai',
  refunded: 'Dikembalikan',
  partial_refund: 'Refund Sebagian',
  voided: 'Dibatalkan',
};

// ── Refund Form ───────────────────────────────────────────────────────────────

function RefundForm({ tx, onSave, onClose }) {
  const maxRefund = tx.roundedAmount - (tx.refundAmount || 0);
  const [amount, setAmount] = useState(maxRefund);
  const [method, setMethod] = useState('Cash');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!amount || isNaN(amount) || Number(amount) <= 0) e.amount = 'Jumlah refund harus positif';
    if (Number(amount) > maxRefund) e.amount = `Maksimal refund: ${formatRupiah(maxRefund)}`;
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave({ amount: Number(amount), method, note });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 rounded-lg p-3 text-sm">
        <div className="flex justify-between"><span className="text-gray-500">Total Transaksi</span><span className="font-medium">{formatRupiah(tx.roundedAmount)}</span></div>
        {tx.refundAmount > 0 && <div className="flex justify-between text-red-600"><span>Refund Sebelumnya</span><span>-{formatRupiah(tx.refundAmount)}</span></div>}
        <div className="flex justify-between font-semibold border-t border-gray-200 mt-2 pt-2"><span>Maks. Refund</span><span>{formatRupiah(maxRefund)}</span></div>
      </div>
      <div>
        <label className="label">Jumlah Refund (Rp)</label>
        <input className="input" type="number" min="1" max={maxRefund} value={amount} onChange={e => setAmount(e.target.value)} />
        {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
      </div>
      <div>
        <label className="label">Metode Pengembalian</label>
        <select className="input" value={method} onChange={e => setMethod(e.target.value)}>
          {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Catatan (opsional)</label>
        <input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="Alasan refund..." />
      </div>
      <div className="flex gap-3 justify-end">
        <button type="button" className="btn-secondary" onClick={onClose}>Batal</button>
        <button type="submit" className="btn-danger">Proses Refund</button>
      </div>
    </form>
  );
}

// ── Edit Note Form ─────────────────────────────────────────────────────────────

function EditNoteForm({ tx, onSave, onClose }) {
  const [note, setNote] = useState(tx.note || '');
  return (
    <div className="space-y-4">
      <div>
        <label className="label">Catatan Transaksi</label>
        <textarea className="input h-24 resize-none" value={note} onChange={e => setNote(e.target.value)} placeholder="Catatan untuk transaksi ini..." />
      </div>
      <div className="flex gap-3 justify-end">
        <button className="btn-secondary" onClick={onClose}>Batal</button>
        <button className="btn-primary" onClick={() => { onSave(note); onClose(); }}>Simpan</button>
      </div>
    </div>
  );
}

// ── Transaction Detail ────────────────────────────────────────────────────────

function TxDetail({ tx }) {
  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <div><span className="text-gray-500">ID Transaksi</span><p className="font-mono text-xs">{tx.id}</p></div>
        <div><span className="text-gray-500">Status</span><p><span className={`badge ${STATUS_BADGE[tx.status]}`}>{STATUS_LABEL[tx.status]}</span></p></div>
        <div><span className="text-gray-500">Waktu</span><p>{formatDateTime(tx.createdAt)}</p></div>
        {tx.unitName && <div><span className="text-gray-500">Unit</span><p>{tx.unitName}</p></div>}
        {tx.billingType && <div><span className="text-gray-500">Tipe Billing</span><p className="capitalize">{tx.billingType}</p></div>}
      </div>

      <div>
        <p className="font-semibold text-gray-700 mb-2">Item</p>
        <div className="space-y-1">
          {tx.lineItems?.map((item, i) => (
            <div key={i} className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-700">{item.qty}× {item.name}</span>
              <span className="font-medium">{formatRupiah(item.subtotal)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-3 space-y-1">
        <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatRupiah(tx.subtotal)}</span></div>
        {tx.discountAmount > 0 && <div className="flex justify-between text-green-600"><span>Diskon ({tx.promoName})</span><span>-{formatRupiah(tx.discountAmount)}</span></div>}
        <div className="flex justify-between font-semibold border-t border-gray-200 mt-1 pt-1"><span>Total Bayar</span><span>{formatRupiah(tx.roundedAmount)}</span></div>
      </div>

      <div>
        <p className="font-semibold text-gray-700 mb-2">Pembayaran</p>
        {tx.payments?.map((p, i) => (
          <div key={i} className="flex justify-between text-sm py-1">
            <span className="text-gray-600">{p.method}</span>
            <span>{formatRupiah(p.amount)}</span>
          </div>
        ))}
        {tx.change > 0 && <div className="flex justify-between text-gray-500 text-xs pt-1"><span>Kembalian</span><span>{formatRupiah(tx.change)}</span></div>}
      </div>

      {tx.refundAmount > 0 && (
        <div className="bg-red-50 rounded-lg p-3 text-sm">
          <p className="font-semibold text-red-700 mb-1">Refund</p>
          <div className="flex justify-between"><span>Jumlah</span><span className="font-medium">{formatRupiah(tx.refundAmount)}</span></div>
          {tx.refundMethod && <div className="flex justify-between"><span>Metode</span><span>{tx.refundMethod}</span></div>}
          {tx.refundNote && <div className="flex justify-between"><span>Catatan</span><span>{tx.refundNote}</span></div>}
          {tx.refundedAt && <div className="flex justify-between text-gray-500 text-xs"><span>Waktu</span><span>{formatDateTime(tx.refundedAt)}</span></div>}
        </div>
      )}

      {tx.note && <div className="bg-amber-50 rounded-lg p-3 text-sm"><p className="text-amber-800">📝 {tx.note}</p></div>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Transactions() {
  const { transactions, refundTransaction, voidTransaction, updateTransaction } = useTransactionStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [refundTarget, setRefundTarget] = useState(null);
  const [voidTarget, setVoidTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      if (statusFilter !== 'all' && tx.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          tx.id.toLowerCase().includes(q) ||
          (tx.unitName || '').toLowerCase().includes(q) ||
          (tx.note || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [transactions, search, statusFilter]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Riwayat Transaksi</h1>
          <p className="text-sm text-gray-500 mt-1">Lihat, refund, atau batalkan transaksi.</p>
        </div>
      </div>

      {/* Search & filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Cari ID, nama unit, catatan..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input w-44" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">Semua Status</option>
          <option value="completed">Selesai</option>
          <option value="partial_refund">Refund Sebagian</option>
          <option value="refunded">Dikembalikan</option>
          <option value="voided">Dibatalkan</option>
        </select>
      </div>

      {transactions.length === 0 ? (
        <div className="card p-16 text-center border-dashed border-2 border-gray-200">
          <Receipt size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-lg font-semibold text-gray-600">Belum Ada Transaksi</h2>
          <p className="text-sm text-gray-400 mt-2 max-w-sm mx-auto">
            Transaksi akan muncul di sini setelah sesi rental atau penjualan F&B selesai.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-gray-400">Tidak ada transaksi yang cocok dengan pencarian.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Waktu</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Unit</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Total</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(tx => (
                <React.Fragment key={tx.id}>
                  <tr className={`border-b border-gray-50 hover:bg-gray-50 ${tx.status === 'voided' ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDateTime(tx.createdAt)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{tx.unitName || 'F&B Mandiri'}</td>
                    <td className="px-4 py-3 font-medium">{formatRupiah(tx.roundedAmount)}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${STATUS_BADGE[tx.status]}`}>{STATUS_LABEL[tx.status]}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          className="btn-secondary btn-xs"
                          onClick={() => setExpanded(expanded === tx.id ? null : tx.id)}
                        >
                          {expanded === tx.id ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                        </button>
                        <button className="btn-secondary btn-xs" onClick={() => setEditTarget(tx)} title="Edit catatan"><Edit2 size={12}/></button>
                        {tx.status !== 'voided' && tx.status !== 'refunded' && (
                          <button className="btn-warning btn-xs flex items-center gap-1" onClick={() => setRefundTarget(tx)}>
                            <RefreshCw size={11}/> Refund
                          </button>
                        )}
                        {tx.status === 'completed' && (
                          <button className="btn-danger btn-xs flex items-center gap-1" onClick={() => setVoidTarget(tx)}>
                            <XCircle size={11}/> Batal
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expanded === tx.id && (
                    <tr className="bg-gray-50">
                      <td colSpan={5} className="px-6 py-4">
                        <TxDetail tx={tx} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Refund modal */}
      {refundTarget && (
        <Modal title="Proses Refund" onClose={() => setRefundTarget(null)} size="sm">
          <RefundForm
            tx={refundTarget}
            onSave={data => refundTransaction(refundTarget.id, data)}
            onClose={() => setRefundTarget(null)}
          />
        </Modal>
      )}

      {/* Void confirm */}
      {voidTarget && (
        <ConfirmDialog
          title="Batalkan Transaksi"
          message={`Batalkan transaksi ${voidTarget.id}? Transaksi akan ditandai sebagai dibatalkan dan tidak dihitung dalam laporan.`}
          confirmLabel="Batalkan Transaksi"
          onConfirm={() => voidTransaction(voidTarget.id, 'Dibatalkan oleh operator')}
          onClose={() => setVoidTarget(null)}
        />
      )}

      {/* Edit note */}
      {editTarget && (
        <Modal title="Edit Catatan Transaksi" onClose={() => setEditTarget(null)} size="sm">
          <EditNoteForm
            tx={editTarget}
            onSave={note => updateTransaction(editTarget.id, { note })}
            onClose={() => setEditTarget(null)}
          />
        </Modal>
      )}
    </div>
  );
}
