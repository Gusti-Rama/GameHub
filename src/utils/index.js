// Utility functions for GameHub

// ── Currency ──────────────────────────────────────────────────────────────────

/**
 * Format a number as Indonesian Rupiah.
 * e.g. 15000 → "Rp15.000"
 */
export function formatRupiah(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return 'Rp0';
  return 'Rp' + Math.round(amount).toLocaleString('id-ID');
}

/**
 * Round to nearest Rp500.
 * 10010 → 10000, 10260 → 10500, 10250 → 10000 (round half down) 
 * Rule: < 250 → floor, 250-749 → 500, >= 750 → ceil to next 1000
 */
export function roundToNearest500(amount) {
  const remainder = amount % 500;
  if (remainder < 250) {
    return amount - remainder;
  } else {
    return amount - remainder + 500;
  }
}

// ── Billing ───────────────────────────────────────────────────────────────────

/**
 * Calculate rental charge from billable minutes and hourly rate.
 * charge = hourlyRate × billableMinutes / 60
 */
export function calcRentalCharge(hourlyRate, billableMinutes) {
  return (hourlyRate * billableMinutes) / 60;
}

/**
 * Calculate billable minutes from session segments.
 * Each segment: { start: timestamp, end: timestamp | null, paused: bool }
 */
export function calcBillableMinutes(segments) {
  let totalMs = 0;
  const now = Date.now();
  for (const seg of segments) {
    if (!seg.paused) {
      const end = seg.end ?? now;
      totalMs += Math.max(0, end - seg.start);
    }
  }
  return totalMs / 60000;
}

// ── Time ──────────────────────────────────────────────────────────────────────

export function formatDuration(minutes) {
  if (!minutes && minutes !== 0) return '0 mnt';
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  const s = Math.floor((minutes * 60) % 60);
  if (h > 0 && m > 0) return `${h}j ${m}m`;
  if (h > 0) return `${h} jam`;
  if (m > 0 && s > 0) return `${m}m ${s}d`;
  if (m > 0) return `${m} mnt`;
  return `${s} dtk`;
}

export function formatDurationHHMM(minutes) {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  const s = Math.floor((minutes % 1) * 60);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

export function formatDateTime(ts) {
  if (!ts) return '-';
  return new Date(ts).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatDate(ts) {
  if (!ts) return '-';
  return new Date(ts).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatDateISO(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toISOString().slice(0,10);
}

// ── IDs ───────────────────────────────────────────────────────────────────────

let _counter = 0;
export function genId(prefix = '') {
  _counter++;
  return `${prefix}${Date.now()}_${_counter}_${Math.random().toString(36).slice(2,7)}`;
}

// ── Promotions ────────────────────────────────────────────────────────────────

/**
 * Apply a promotion to a set of line items.
 * Returns discount amount (never exceeds total).
 */
export function applyPromotion(promo, lineItems) {
  if (!promo || !promo.active) return 0;

  const eligible = lineItems.filter(item => {
    if (promo.scope === 'all') return true;
    if (promo.scope === 'rental') return item.type === 'rental' || item.type === 'package';
    if (promo.scope === 'fnb') return item.type === 'food' || item.type === 'drink';
    if (promo.scope === 'food') return item.type === 'food';
    if (promo.scope === 'drink') return item.type === 'drink';
    return false;
  });

  const eligibleTotal = eligible.reduce((s, i) => s + i.subtotal, 0);

  let discount = 0;
  if (promo.type === 'percentage') {
    discount = eligibleTotal * (promo.value / 100);
  } else {
    discount = promo.value;
  }

  return Math.min(discount, eligibleTotal);
}

// ── Stock validation ──────────────────────────────────────────────────────────

/**
 * Check if a cart can be fulfilled given current stock.
 * Returns array of { productId, name, required, available } for items with issues.
 */
export function validateStock(cartItems, products) {
  const needs = {};
  for (const item of cartItems) {
    if (!item.productId) continue;
    needs[item.productId] = (needs[item.productId] || 0) + item.qty;
  }
  const issues = [];
  for (const [productId, qty] of Object.entries(needs)) {
    const product = products.find(p => p.id === productId);
    if (!product) continue;
    if (product.stock < qty) {
      issues.push({ productId, name: product.name, required: qty, available: product.stock });
    }
  }
  return issues;
}
