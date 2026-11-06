import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Play, Pause, StopCircle, Plus, Minus, ShoppingBag, Clock, AlertTriangle,
  Monitor, Coffee, Check, ChevronRight, Package, Zap, Timer, X, Bell
} from 'lucide-react';
import { useUnitStore } from '../stores/unitStore';
import { useSessionStore } from '../stores/sessionStore';
import { useProductStore } from '../stores/productStore';
import { usePromoStore } from '../stores/promoStore';
import { useTransactionStore } from '../stores/transactionStore';
import {
  formatRupiah, formatDurationHHMM, formatDuration, genId,
  calcRentalCharge, calcBillableMinutes, roundToNearest500,
  applyPromotion, validateStock
} from '../utils';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';

const PAYMENT_METHODS = ['Cash', 'QRIS', 'Transfer Bank', 'E-wallet'];

// ── Audio alert ────────────────────────────────────────────────────────────────

function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.4 + 0.3);
      osc.start(ctx.currentTime + i * 0.4);
      osc.stop(ctx.currentTime + i * 0.4 + 0.3);
    }
  } catch (e) { /* ignore */ }
}

// ── Start Session Modal ────────────────────────────────────────────────────────

function StartSessionModal({ unit, packages, onStart, onClose }) {
  const [billingType, setBillingType] = useState('open');
  const [fixedHours, setFixedHours] = useState(1);
  const [selectedPackage, setSelectedPackage] = useState(packages[0]?.id || '');

  const pkg = packages.find(p => p.id === selectedPackage);

  const handleStart = () => {
    if (billingType === 'open') {
      onStart({ billingType: 'open' });
    } else if (billingType === 'fixed') {
      onStart({ billingType: 'fixed', fixedMinutes: Number(fixedHours) * 60 });
    } else if (billingType === 'package') {
      if (!pkg) return;
      onStart({
        billingType: 'package',
        fixedMinutes: pkg.durationMinutes,
        packageId: pkg.id,
        packageName: pkg.name,
        packagePrice: pkg.price,
        packageItems: pkg.items,
      });
    }
    onClose();
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="label">Tipe Billing</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'open', label: 'Open Bill', icon: Clock, desc: 'Dihitung per menit aktif' },
            { value: 'fixed', label: 'Durasi Tetap', icon: Timer, desc: 'Pilih durasi jam' },
            { value: 'package', label: 'Paket', icon: Package, desc: 'Paket dengan F&B', disabled: packages.length === 0 },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              disabled={opt.disabled}
              onClick={() => setBillingType(opt.value)}
              className={`rounded-lg border-2 p-3 text-left transition-colors ${
                billingType === opt.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <opt.icon size={18} className={billingType === opt.value ? 'text-blue-600' : 'text-gray-400'} />
              <p className="text-sm font-medium mt-1">{opt.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {billingType === 'fixed' && (
        <div>
          <label className="label">Durasi (jam)</label>
          <div className="flex items-center gap-3">
            <button type="button" className="btn-secondary w-10 h-10 flex items-center justify-center text-lg" onClick={() => setFixedHours(h => Math.max(0.5, h - 0.5))}>−</button>
            <span className="text-xl font-bold w-20 text-center">{fixedHours}j</span>
            <button type="button" className="btn-secondary w-10 h-10 flex items-center justify-center text-lg" onClick={() => setFixedHours(h => h + 0.5)}>+</button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Tarif: {formatRupiah(calcRentalCharge(unit.hourlyRate, fixedHours * 60))}
          </p>
        </div>
      )}

      {billingType === 'package' && (
        <div>
          <label className="label">Pilih Paket</label>
          <select className="input" value={selectedPackage} onChange={e => setSelectedPackage(e.target.value)}>
            {packages.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} — {formatRupiah(p.price)} · {p.durationMinutes >= 60 ? `${p.durationMinutes/60}j` : `${p.durationMinutes}m`}
              </option>
            ))}
          </select>
          {pkg && (
            <div className="mt-2 bg-purple-50 rounded-lg p-3 text-sm">
              <p className="font-medium text-purple-800">{pkg.name}</p>
              <p className="text-purple-600 text-xs mt-1">Durasi: {pkg.durationMinutes >= 60 ? `${pkg.durationMinutes/60} jam` : `${pkg.durationMinutes} menit`}</p>
              {pkg.items.length > 0 && (
                <ul className="mt-2 space-y-0.5">
                  {pkg.items.map((item, i) => (
                    <li key={i} className="text-xs text-purple-700">• Item F&B termasuk (detail di keranjang)</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 justify-end pt-2">
        <button className="btn-secondary" onClick={onClose}>Batal</button>
        <button className="btn-success" onClick={handleStart}>
          <Play size={14} className="inline mr-1" /> Mulai Sesi
        </button>
      </div>
    </div>
  );
}

// ── Add Hours Modal ────────────────────────────────────────────────────────────

function AddHoursModal({ unit, onAdd, onClose }) {
  const [hours, setHours] = useState(0.5);

  const price = calcRentalCharge(unit.hourlyRate, hours * 60);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Timer habis. Pilih tambahan waktu untuk dilanjutkan.</p>
      <div>
        <label className="label">Tambah Waktu (jam)</label>
        <div className="flex items-center gap-3">
          <button type="button" className="btn-secondary w-10 h-10 flex items-center justify-center" onClick={() => setHours(h => Math.max(0.5, h - 0.5))}>−</button>
          <span className="text-xl font-bold w-20 text-center">{hours}j</span>
          <button type="button" className="btn-secondary w-10 h-10 flex items-center justify-center" onClick={() => setHours(h => h + 0.5)}>+</button>
        </div>
        <p className="text-sm text-gray-500 mt-2">Biaya tambahan: <strong>{formatRupiah(price)}</strong></p>
      </div>
      <div className="flex gap-3 justify-end">
        <button className="btn-secondary" onClick={onClose}>Akhiri Sesi Saja</button>
        <button className="btn-primary" onClick={() => { onAdd(hours * 60, price); onClose(); }}>Tambah Waktu</button>
      </div>
    </div>
  );
}

// ── Checkout Modal ─────────────────────────────────────────────────────────────

function CheckoutModal({ session, unit, products, promotions, onClose, onComplete }) {
  const { getBillableMinutes } = useSessionStore();
  const billableMinutes = getBillableMinutes(session.id);

  // Build line items: rental charge + cart items
  const buildLineItems = useCallback(() => {
    const items = [];
    if (session.billingType === 'open') {
      // Open bill: charge by actual billable minutes
      const charge = calcRentalCharge(unit.hourlyRate, billableMinutes);
      if (charge > 0) {
        items.push({
          id: genId('li_'),
          type: 'rental',
          name: `Rental ${unit.name} (${Math.round(billableMinutes)} mnt)`,
          qty: 1,
          unitPrice: charge,
          subtotal: charge,
        });
      }
    } else if (session.billingType === 'fixed') {
      // Fixed: charge based on booked + added minutes
      const charge = calcRentalCharge(unit.hourlyRate, billableMinutes);
      if (charge > 0) {
        const totalMins = Math.round(billableMinutes);
        items.push({
          id: genId('li_'),
          type: 'rental',
          name: `Rental ${unit.name} (${totalMins >= 60 ? `${(totalMins/60).toFixed(1)}j` : `${totalMins}m`} tetap)`,
          qty: 1,
          unitPrice: charge,
          subtotal: charge,
        });
      }
    }
    // Cart items (package price already inside cart for package billing)
    session.cart.forEach(ci => {
      const product = ci.productId ? products.find(p => p.id === ci.productId) : null;
      items.push({
        ...ci,
        type: ci.type || (product?.category === 'Food' ? 'food' : product?.category === 'Drink' ? 'drink' : 'rental'),
      });
    });
    return items;
  }, [session, unit, billableMinutes, products]);

  const lineItems = buildLineItems();
  const subtotal = lineItems.reduce((s, i) => s + i.subtotal, 0);

  const [promoId, setPromoId] = useState(session.promoId || '');
  const [payments, setPayments] = useState([{ method: 'Cash', amount: '' }]);
  const [stockIssues, setStockIssues] = useState([]);

  const activePromotions = promotions.filter(p => p.active);
  const selectedPromo = activePromotions.find(p => p.id === promoId);
  const discountAmount = selectedPromo ? applyPromotion(selectedPromo, lineItems) : 0;
  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const roundedTotal = roundToNearest500(afterDiscount);

  const totalPaid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const change = Math.max(0, totalPaid - roundedTotal);
  const remaining = Math.max(0, roundedTotal - totalPaid);

  // Stock check
  const cartProductItems = [];
  session.cart.forEach(ci => {
    if (ci.productId) cartProductItems.push({ productId: ci.productId, qty: ci.qty });
    if (ci.packageItems) {
      ci.packageItems.forEach(pi => cartProductItems.push({ productId: pi.productId, qty: pi.qty }));
    }
  });
  const currentStockIssues = validateStock(cartProductItems, products);

  const addPaymentRow = () => setPayments(p => [...p, { method: 'Cash', amount: '' }]);
  const removePaymentRow = (i) => setPayments(p => p.filter((_, idx) => idx !== i));
  const updatePayment = (i, field, val) => setPayments(p => p.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  const fillRemainder = (i) => updatePayment(i, 'amount', remaining + (Number(payments[i].amount) || 0));

  const canCheckout = totalPaid >= roundedTotal && currentStockIssues.length === 0 && roundedTotal >= 0;

  return (
    <div className="space-y-4">
      {/* Stock issues */}
      {currentStockIssues.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm font-semibold text-red-700 mb-1">⚠ Stok Tidak Cukup</p>
          {currentStockIssues.map(issue => (
            <p key={issue.productId} className="text-xs text-red-600">
              {issue.name}: diperlukan {issue.required}, tersedia {issue.available}
            </p>
          ))}
        </div>
      )}

      {/* Line items */}
      <div>
        <p className="label">Rincian</p>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {lineItems.map((item, i) => (
            <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-50">
              <span className="text-gray-700">{item.qty > 1 ? `${item.qty}× ` : ''}{item.name}</span>
              <span className="font-medium">{formatRupiah(item.subtotal)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Promo */}
      <div>
        <label className="label">Promosi</label>
        <select className="input" value={promoId} onChange={e => setPromoId(e.target.value)}>
          <option value="">Tanpa Promosi</option>
          {activePromotions.map(p => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.type === 'percentage' ? `${p.value}%` : formatRupiah(p.value)})
            </option>
          ))}
        </select>
      </div>

      {/* Total summary */}
      <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
        <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatRupiah(subtotal)}</span></div>
        {discountAmount > 0 && <div className="flex justify-between text-green-600"><span>Diskon {selectedPromo?.name}</span><span>−{formatRupiah(discountAmount)}</span></div>}
        {afterDiscount !== subtotal - discountAmount && <div className="flex justify-between text-gray-400 text-xs"><span>Sebelum pembulatan</span><span>{formatRupiah(afterDiscount)}</span></div>}
        <div className="flex justify-between font-bold text-base border-t border-gray-200 mt-1 pt-2">
          <span>Total Bayar</span>
          <span className="text-blue-700">{formatRupiah(roundedTotal)}</span>
        </div>
        <p className="text-xs text-gray-400">Dibulatkan ke Rp500 terdekat</p>
      </div>

      {/* Payments */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Pembayaran</label>
          <button type="button" className="btn-secondary btn-xs" onClick={addPaymentRow}>+ Metode</button>
        </div>
        {payments.map((p, i) => (
          <div key={i} className="flex gap-2 mb-2 items-center">
            <select className="input w-36" value={p.method} onChange={e => updatePayment(i, 'method', e.target.value)}>
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <input
              className="input flex-1"
              type="number"
              min="0"
              placeholder="Jumlah"
              value={p.amount}
              onChange={e => updatePayment(i, 'amount', e.target.value)}
            />
            <button type="button" className="btn-secondary btn-xs" onClick={() => fillRemainder(i)} title="Isi sisa">
              ↑
            </button>
            {payments.length > 1 && (
              <button type="button" className="btn-danger btn-xs" onClick={() => removePaymentRow(i)}>✕</button>
            )}
          </div>
        ))}
        <div className="flex justify-between text-sm mt-2">
          <span className="text-gray-500">Dibayar</span>
          <span className={totalPaid >= roundedTotal ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
            {formatRupiah(totalPaid)}
          </span>
        </div>
        {totalPaid < roundedTotal && (
          <p className="text-xs text-red-500 mt-1">Kurang: {formatRupiah(remaining)}</p>
        )}
        {change > 0 && (
          <p className="text-sm text-green-600 mt-1">Kembalian: <strong>{formatRupiah(change)}</strong></p>
        )}
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <button className="btn-secondary" onClick={onClose}>Kembali</button>
        <button
          className="btn-success"
          disabled={!canCheckout}
          onClick={() => onComplete({ lineItems, subtotal, discountAmount, promoId, promoName: selectedPromo?.name || null, roundedTotal, payments, totalPaid, change })}
        >
          <Check size={14} className="inline mr-1" /> Selesaikan & Simpan
        </button>
      </div>
    </div>
  );
}

// ── F&B Cart Adder ─────────────────────────────────────────────────────────────

function FnbAdder({ products, onAdd }) {
  const [search, setSearch] = useState('');
  const filtered = products.filter(p =>
    p.stock > 0 && p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <input
        className="input text-xs mb-2"
        placeholder="Cari produk..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {filtered.length === 0 && <p className="text-xs text-gray-400 text-center py-2">Tidak ada produk</p>}
        {filtered.map(p => (
          <div key={p.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50">
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">{p.name}</p>
              <p className="text-xs text-gray-400">{formatRupiah(p.price)} · Stok: {p.stock}</p>
            </div>
            <button
              className="btn-primary btn-xs ml-2 flex-shrink-0"
              onClick={() => onAdd(p)}
            >
              + Tambah
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Unit Card (with timer) ─────────────────────────────────────────────────────

function UnitCard({ unit, onAction }) {
  const { sessions, tickSession } = useSessionStore();
  const session = sessions.find(x => x.unitId === unit.id && x.status !== 'ended') || null;
  const { products } = useProductStore();

  // elapsed seconds — purely local, incremented by setInterval every second
  const [elapsed, setElapsed] = useState(0);
  const alertFired = useRef(false);
  const intervalRef = useRef(null);

  // Start/stop the local stopwatch based on session state
  useEffect(() => {
    // Clear any existing interval first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!session || session.status !== 'active') return;

    if (session.billingType === 'open') {
      // Open bill: run a pure local stopwatch, no store writes needed
      intervalRef.current = setInterval(() => {
        setElapsed(e => e + 1);
      }, 1000);
    } else {
      // Fixed/package: tick the store to decrement remainingSeconds
      intervalRef.current = setInterval(() => {
        tickSession(session.id);
        setElapsed(e => e + 1); // also force re-render for display
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // Re-run only when session identity or running state changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, session?.status]);

  // Alert on timer expiry
  useEffect(() => {
    if (!session) { alertFired.current = false; return; }
    if (session.timerExpired && !alertFired.current) {
      alertFired.current = true;
      playAlertSound();
    }
  }, [session?.id, session?.timerExpired]);

  const isOccupied = session && session.status !== 'ended';
  const isPaused = session?.status === 'paused';
  const isActive = session?.status === 'active';

  // Compute billable milliseconds from segment timestamps + live elapsed for the open segment
  const getBillableMs = () => {
    if (!session) return 0;
    let ms = 0;
    const nowMs = Date.now();
    for (const seg of session.segments) {
      if (seg.paused) continue;
      const end = seg.end ?? nowMs;
      ms += Math.max(0, end - seg.start);
    }
    return ms;
  };

  // Billable minutes (recalculated each render — driven by elapsed ticking)
  const billableMs = getBillableMs();
  const billableMinutes = billableMs / 60000;

  // Current rental charge for display
  let currentRentalAmount = 0;
  if (session) {
    if (session.billingType === 'open') {
      currentRentalAmount = calcRentalCharge(unit.hourlyRate, billableMinutes);
    } else if (session.billingType === 'fixed') {
      const billedMinutes = (session.fixedMinutes || 0) + (session.addedMinutes || 0);
      currentRentalAmount = calcRentalCharge(unit.hourlyRate, billedMinutes);
    }
    // package: price already in cart
  }

  // Current subtotal
  const cartTotal = session?.cart.reduce((s, i) => s + i.subtotal, 0) || 0;
  const currentSubtotal = currentRentalAmount + cartTotal;

  const typeColor = unit.type === 'PS' ? 'bg-blue-600' : 'bg-green-700';
  const statusBg =
    unit.status === 'occupied' ? 'border-red-300 bg-red-50' :
    unit.status === 'maintenance' ? 'border-amber-300 bg-amber-50' :
    'border-gray-200 bg-white';

  return (
    <div className={`card border-2 ${statusBg} overflow-hidden transition-all`}>
      {/* Header */}
      <div className={`${typeColor} text-white px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm">{unit.type}</span>
          <span className="font-semibold">{unit.name}</span>
        </div>
        <span className="text-xs opacity-80">{formatRupiah(unit.hourlyRate)}/jam</span>
      </div>

      {/* Timer expired banner */}
      {session?.timerExpired && (
        <div className="bg-red-500 text-white px-4 py-2 flex items-center gap-2 animate-pulse">
          <Bell size={14} />
          <span className="text-xs font-semibold">WAKTU HABIS — Akhiri sesi atau tambah waktu!</span>
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Status */}
        {!isOccupied && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-400 mb-3">
              {unit.status === 'maintenance' ? 'Unit sedang dalam perbaikan' : 'Unit tersedia'}
            </p>
            {unit.status === 'available' && (
              <button
                className="btn-success btn-sm flex items-center gap-2 mx-auto"
                onClick={() => onAction('start', unit, session)}
              >
                <Play size={14} /> Mulai Sesi
              </button>
            )}
          </div>
        )}

        {isOccupied && (
          <>
            {/* Timer display */}
            {session.billingType !== 'open' && session.remainingSeconds !== null && (
              <div className={`rounded-lg p-3 text-center ${session.timerExpired ? 'bg-red-100' : 'bg-gray-100'}`}>
                <p className="text-xs text-gray-500 mb-1">Sisa Waktu</p>
                <p className={`text-2xl font-mono font-bold ${session.timerExpired ? 'text-red-600' : 'text-gray-800'}`}>
                  {formatDurationHHMM(Math.max(0, session.remainingSeconds) / 60)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {session.billingType === 'package' ? `Paket: ${session.cart[0]?.name || ''}` : 'Durasi tetap'}
                </p>
              </div>
            )}

            {/* Open bill stopwatch */}
            {session.billingType === 'open' && (
              <div className="rounded-lg p-3 text-center bg-blue-50">
                <p className="text-xs text-blue-500 mb-1">Waktu Tertagih</p>
                <p className="text-2xl font-mono font-bold text-blue-700">
                  {formatDurationHHMM(billableMinutes)}
                </p>
                <p className="text-xs text-blue-400 mt-1">Open Bill · {isPaused ? '⏸ Dijeda' : '▶ Aktif'}</p>
              </div>
            )}

            {/* Cart summary */}
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-500">KERANJANG</span>
                <button
                  className="text-xs text-blue-600 hover:text-blue-700"
                  onClick={() => onAction('addFnb', unit, session)}
                >
                  + F&B
                </button>
              </div>
              {session.cart.length === 0 ? (
                <p className="text-xs text-gray-400">Belum ada item</p>
              ) : (
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {session.cart.map(item => (
                    <div key={item.id} className="flex items-center justify-between text-xs">
                      <span className="text-gray-700 truncate flex-1">{item.qty > 1 ? `${item.qty}× ` : ''}{item.name}</span>
                      <span className="text-gray-600 ml-2 flex-shrink-0">
                        {item.type === 'package' ? formatRupiah(item.subtotal) : formatRupiah(item.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t border-gray-200 mt-2 pt-1 flex justify-between">
                <span className="text-xs font-semibold text-gray-500">Est. Total</span>
                <span className="text-xs font-bold text-gray-800">{formatRupiah(currentSubtotal)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-2 flex-wrap">
              {isActive && !session.timerExpired && (
                <button
                  className="btn-warning btn-sm flex items-center gap-1 flex-1"
                  onClick={() => onAction('pause', unit, session)}
                >
                  <Pause size={13}/> Jeda
                </button>
              )}
              {isPaused && (
                <button
                  className="btn-success btn-sm flex items-center gap-1 flex-1"
                  onClick={() => onAction('resume', unit, session)}
                >
                  <Play size={13}/> Lanjut
                </button>
              )}
              {session.timerExpired && (
                <button
                  className="btn-primary btn-sm flex items-center gap-1 flex-1"
                  onClick={() => onAction('addHours', unit, session)}
                >
                  <Plus size={13}/> Tambah Waktu
                </button>
              )}
              <button
                className="btn-danger btn-sm flex items-center gap-1 flex-1"
                onClick={() => onAction('checkout', unit, session)}
              >
                <StopCircle size={13}/> Selesai
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Standalone F&B Sale ────────────────────────────────────────────────────────

function StandaloneFnbModal({ products, promotions, onClose, onComplete }) {
  const [cart, setCart] = useState([]);
  const [promoId, setPromoId] = useState('');

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(c => c.productId === product.id);
      if (existing) {
        return prev.map(c => c.id === existing.id ? { ...c, qty: c.qty + 1, subtotal: (c.qty + 1) * c.unitPrice } : c);
      }
      return [...prev, {
        id: genId('ci_'), type: product.category === 'Food' ? 'food' : 'drink',
        name: product.name, qty: 1, unitPrice: product.price, subtotal: product.price,
        productId: product.id,
      }];
    });
  };

  const updateQty = (id, qty) => {
    if (qty <= 0) setCart(c => c.filter(i => i.id !== id));
    else setCart(c => c.map(i => i.id === id ? { ...i, qty, subtotal: qty * i.unitPrice } : i));
  };

  const subtotal = cart.reduce((s, i) => s + i.subtotal, 0);
  const activePromotions = promotions.filter(p => p.active);
  const selectedPromo = activePromotions.find(p => p.id === promoId);
  const discountAmount = selectedPromo ? applyPromotion(selectedPromo, cart) : 0;
  const roundedTotal = roundToNearest500(Math.max(0, subtotal - discountAmount));

  const [payments, setPayments] = useState([{ method: 'Cash', amount: '' }]);
  const totalPaid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const change = Math.max(0, totalPaid - roundedTotal);
  const remaining = Math.max(0, roundedTotal - totalPaid);

  const stockIssues = validateStock(cart.map(c => ({ productId: c.productId, qty: c.qty })), products);
  const canCheckout = cart.length > 0 && totalPaid >= roundedTotal && roundedTotal > 0 && stockIssues.length === 0;

  const addPaymentRow = () => setPayments(p => [...p, { method: 'Cash', amount: '' }]);
  const updatePayment = (i, field, val) => setPayments(p => p.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  const fillRemainder = (i) => updatePayment(i, 'amount', remaining + (Number(payments[i].amount) || 0));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="label">Tambah Produk F&B</p>
          <FnbAdder products={products} onAdd={addToCart} />
        </div>
        <div>
          <p className="label">Keranjang</p>
          {cart.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">Belum ada item</p>
          ) : (
            <div className="space-y-1">
              {cart.map(item => (
                <div key={item.id} className="flex items-center gap-2 py-1">
                  <span className="text-xs text-gray-700 flex-1 truncate">{item.name}</span>
                  <div className="flex items-center gap-1">
                    <button className="w-6 h-6 rounded border text-xs flex items-center justify-center hover:bg-gray-100" onClick={() => updateQty(item.id, item.qty - 1)}>−</button>
                    <span className="text-xs w-6 text-center">{item.qty}</span>
                    <button className="w-6 h-6 rounded border text-xs flex items-center justify-center hover:bg-gray-100" onClick={() => updateQty(item.id, item.qty + 1)}>+</button>
                  </div>
                  <span className="text-xs font-medium">{formatRupiah(item.subtotal)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {stockIssues.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-600">
          Stok tidak cukup: {stockIssues.map(i => i.name).join(', ')}
        </div>
      )}

      {/* Promo */}
      <div>
        <label className="label">Promosi</label>
        <select className="input" value={promoId} onChange={e => setPromoId(e.target.value)}>
          <option value="">Tanpa Promosi</option>
          {activePromotions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
        <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatRupiah(subtotal)}</span></div>
        {discountAmount > 0 && <div className="flex justify-between text-green-600"><span>Diskon</span><span>−{formatRupiah(discountAmount)}</span></div>}
        <div className="flex justify-between font-bold border-t pt-2"><span>Total Bayar</span><span className="text-blue-700">{formatRupiah(roundedTotal)}</span></div>
      </div>

      {/* Payments */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Pembayaran</label>
          <button className="btn-secondary btn-xs" onClick={addPaymentRow}>+ Metode</button>
        </div>
        {payments.map((p, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <select className="input w-36" value={p.method} onChange={e => updatePayment(i, 'method', e.target.value)}>
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <input className="input flex-1" type="number" min="0" placeholder="Jumlah" value={p.amount} onChange={e => updatePayment(i, 'amount', e.target.value)} />
            <button className="btn-secondary btn-xs" onClick={() => fillRemainder(i)}>↑</button>
          </div>
        ))}
        {totalPaid < roundedTotal && cart.length > 0 && <p className="text-xs text-red-500">Kurang: {formatRupiah(remaining)}</p>}
        {change > 0 && <p className="text-sm text-green-600">Kembalian: <strong>{formatRupiah(change)}</strong></p>}
      </div>

      <div className="flex gap-3 justify-end">
        <button className="btn-secondary" onClick={onClose}>Batal</button>
        <button className="btn-success" disabled={!canCheckout} onClick={() => onComplete({ lineItems: cart, subtotal, discountAmount, promoId, promoName: selectedPromo?.name || null, roundedTotal, payments, totalPaid, change })}>
          <Check size={14} className="inline mr-1" /> Bayar
        </button>
      </div>
    </div>
  );
}

// ── Main Rentals Page ──────────────────────────────────────────────────────────

export default function Rentals() {
  const { units } = useUnitStore();
  const { setUnitStatus } = useUnitStore();
  const { sessions, startSession, pauseSession, resumeSession, endSession, addCartItem, addHours, setPromo, getActiveSession } = useSessionStore();
  const { products, packages, deductStock } = useProductStore();
  const { promotions } = usePromoStore();
  const { recordTransaction } = useTransactionStore();

  const [modal, setModal] = useState(null); // { type, unit, session }
  const [showStandaloneFnb, setShowStandaloneFnb] = useState(false);

  const handleAction = (type, unit, session) => {
    setModal({ type, unit, session });
  };

  const handleStartSession = (unit, opts) => {
    startSession({ unitId: unit.id, ...opts });
    setUnitStatus(unit.id, 'occupied');
    setModal(null);
  };

  const handlePause = (unit, session) => {
    pauseSession(session.id);
    setModal(null);
  };

  const handleResume = (unit, session) => {
    resumeSession(session.id);
    setModal(null);
  };

  const handleAddHoursConfirm = (session, minutes, price) => {
    addHours(session.id, minutes, price);
    setModal(null);
  };

  const handleCheckoutComplete = (unit, session, data) => {
    // 1. End session
    endSession(session.id);
    setUnitStatus(unit.id, 'available');

    // 2. Deduct stock
    const stockItems = [];
    data.lineItems.forEach(item => {
      if (item.productId) stockItems.push({ productId: item.productId, qty: item.qty });
      if (item.packageItems) item.packageItems.forEach(pi => stockItems.push({ productId: pi.productId, qty: pi.qty }));
    });
    deductStock(stockItems);

    // 3. Record transaction
    recordTransaction({
      sessionId: session.id,
      unitId: unit.id,
      unitName: unit.name,
      billingType: session.billingType,
      lineItems: data.lineItems,
      subtotal: data.subtotal,
      discountAmount: data.discountAmount,
      promoId: data.promoId,
      promoName: data.promoName,
      roundedAmount: data.roundedTotal,
      payments: data.payments,
      totalPaid: data.totalPaid,
      change: data.change,
    });

    setModal(null);
  };

  const handleStandaloneFnb = (data) => {
    // Deduct stock
    const stockItems = data.lineItems.map(i => ({ productId: i.productId, qty: i.qty })).filter(i => i.productId);
    deductStock(stockItems);

    // Record
    recordTransaction({
      sessionId: null,
      unitId: null,
      unitName: null,
      billingType: null,
      lineItems: data.lineItems,
      subtotal: data.subtotal,
      discountAmount: data.discountAmount,
      promoId: data.promoId,
      promoName: data.promoName,
      roundedAmount: data.roundedTotal,
      payments: data.payments,
      totalPaid: data.totalPaid,
      change: data.change,
    });

    setShowStandaloneFnb(false);
  };

  const handleAddFnb = (unit, session, product) => {
    addCartItem(session.id, {
      type: product.category === 'Food' ? 'food' : 'drink',
      name: product.name,
      qty: 1,
      unitPrice: product.price,
      subtotal: product.price,
      productId: product.id,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rental & POS</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola sesi rental dan penjualan F&B.</p>
        </div>
        <button
          className="btn-secondary flex items-center gap-2"
          onClick={() => setShowStandaloneFnb(true)}
        >
          <ShoppingBag size={16} /> Jual F&B Mandiri
        </button>
      </div>

      {units.length === 0 ? (
        <div className="card p-12 text-center border-dashed border-2 border-gray-200">
          <Monitor size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-lg font-semibold text-gray-600">Belum Ada Unit</h2>
          <p className="text-sm text-gray-400 mt-2 mb-6 max-w-sm mx-auto">
            Tambahkan unit PS atau PC terlebih dahulu untuk mulai membuka sesi rental.
          </p>
          <Link to="/units" className="btn-primary inline-flex items-center gap-2">
            <Monitor size={16} /> Kelola Unit
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {units.map(unit => (
            <UnitCard
              key={unit.id}
              unit={unit}
              onAction={(type, u, s) => {
                if (type === 'pause') { pauseSession(s.id); return; }
                if (type === 'resume') { resumeSession(s.id); return; }
                setModal({ type, unit: u, session: s });
              }}
            />
          ))}
        </div>
      )}

      {/* Start session modal */}
      {modal?.type === 'start' && (
        <Modal title={`Mulai Sesi — ${modal.unit.name}`} onClose={() => setModal(null)}>
          <StartSessionModal
            unit={modal.unit}
            packages={packages}
            onStart={(opts) => handleStartSession(modal.unit, opts)}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}

      {/* Add hours modal */}
      {modal?.type === 'addHours' && (
        <Modal title="Tambah Waktu" onClose={() => setModal(null)} size="sm">
          <AddHoursModal
            unit={modal.unit}
            onAdd={(minutes, price) => handleAddHoursConfirm(modal.session, minutes, price)}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}

      {/* F&B adder modal */}
      {modal?.type === 'addFnb' && (
        <Modal title={`Tambah F&B — ${modal.unit.name}`} onClose={() => setModal(null)} size="sm">
          <FnbAdder
            products={products}
            onAdd={(p) => { handleAddFnb(modal.unit, modal.session, p); }}
          />
          <div className="mt-4 text-right">
            <button className="btn-primary" onClick={() => setModal(null)}>Selesai</button>
          </div>
        </Modal>
      )}

      {/* Checkout modal */}
      {modal?.type === 'checkout' && (
        <Modal title={`Checkout — ${modal.unit.name}`} onClose={() => setModal(null)} size="lg">
          <CheckoutModal
            session={modal.session}
            unit={modal.unit}
            products={products}
            promotions={promotions}
            onClose={() => setModal(null)}
            onComplete={(data) => handleCheckoutComplete(modal.unit, modal.session, data)}
          />
        </Modal>
      )}

      {/* Standalone F&B modal */}
      {showStandaloneFnb && (
        <Modal title="Penjualan F&B Mandiri" onClose={() => setShowStandaloneFnb(false)} size="lg">
          <StandaloneFnbModal
            products={products}
            promotions={promotions}
            onClose={() => setShowStandaloneFnb(false)}
            onComplete={handleStandaloneFnb}
          />
        </Modal>
      )}
    </div>
  );
}
