import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { genId, calcBillableMinutes } from '../utils';

/**
 * Session structure:
 * {
 *   id: string,
 *   unitId: string,
 *   billingType: 'open' | 'fixed' | 'package',
 *   status: 'active' | 'paused' | 'ended',
 *   
 *   // For fixed / package
 *   fixedMinutes: number | null,       // originally booked minutes
 *   remainingSeconds: number | null,   // countdown seconds remaining at last update
 *   lastTickAt: number | null,         // timestamp when remainingSeconds was recorded
 *   timerExpired: boolean,
 *
 *   // Billing segments for open-bill time tracking
 *   // Each segment: { start, end, paused }
 *   // paused=true segments are NOT billable
 *   segments: Array<{ start, end, paused }>,
 *
 *   // Cart items
 *   // { id, type:'rental'|'package'|'food'|'drink', name, qty, unitPrice, subtotal,
 *   //   productId?, packageId?,
 *   //   packageItems?: [{productId,qty,replacement?}],
 *   //   isPackageRental?: true  (the rental portion of a package - no individual price) }
 *   cart: Array,
 *
 *   // Applied promo at checkout
 *   promoId: string | null,
 *   discountAmount: number,
 *
 *   startedAt: number,
 *   endedAt: number | null,
 *   
 *   // Extra hours added
 *   addedMinutes: number,
 * }
 */

export const useSessionStore = create(
  persist(
    (set, get) => ({
      sessions: [], // all sessions (including ended)

      // ── Active session helpers ─────────────────────────────────────────────

      getActiveSession: (unitId) =>
        get().sessions.find(s => s.unitId === unitId && s.status !== 'ended'),

      getSession: (id) => get().sessions.find(s => s.id === id),

      // ── Start session ──────────────────────────────────────────────────────

      startSession: ({ unitId, billingType, fixedMinutes, packageId, packageName, packagePrice, packageItems }) => {
        const now = Date.now();
        const id = genId('sess_');

        const cart = [];

        if (billingType === 'package') {
          cart.push({
            id: genId('ci_'),
            type: 'package',
            name: packageName,
            qty: 1,
            unitPrice: packagePrice,
            subtotal: packagePrice,
            packageId,
            packageItems: packageItems || [],
          });
        }

        const session = {
          id,
          unitId,
          billingType,
          status: 'active',
          fixedMinutes: billingType !== 'open' ? (fixedMinutes || 0) : null,
          remainingSeconds: billingType !== 'open' ? ((fixedMinutes || 0) * 60) : null,
          lastTickAt: billingType !== 'open' ? now : null,
          timerExpired: false,
          segments: [{ start: now, end: null, paused: false }],
          cart,
          promoId: null,
          discountAmount: 0,
          startedAt: now,
          endedAt: null,
          addedMinutes: 0,
        };

        set(s => ({ sessions: [...s.sessions, session] }));
        return session;
      },

      // ── Pause / Resume ─────────────────────────────────────────────────────

      pauseSession: (id) => {
        const now = Date.now();
        set(s => ({
          sessions: s.sessions.map(sess => {
            if (sess.id !== id || sess.status !== 'active') return sess;
            // Close active segment
            const segments = sess.segments.map(seg =>
              seg.end === null && !seg.paused ? { ...seg, end: now } : seg
            );
            // Capture remaining seconds for countdown sessions
            let remainingSeconds = sess.remainingSeconds;
            if (sess.lastTickAt !== null && remainingSeconds !== null) {
              const elapsed = (now - sess.lastTickAt) / 1000;
              remainingSeconds = Math.max(0, remainingSeconds - elapsed);
            }
            return {
              ...sess,
              status: 'paused',
              segments: [...segments, { start: now, end: null, paused: true }],
              remainingSeconds,
              lastTickAt: now,
            };
          }),
        }));
      },

      resumeSession: (id) => {
        const now = Date.now();
        set(s => ({
          sessions: s.sessions.map(sess => {
            if (sess.id !== id || sess.status !== 'paused') return sess;
            // Close paused segment
            const segments = sess.segments.map(seg =>
              seg.end === null && seg.paused ? { ...seg, end: now } : seg
            );
            return {
              ...sess,
              status: 'active',
              segments: [...segments, { start: now, end: null, paused: false }],
              lastTickAt: now,
            };
          }),
        }));
      },

      // ── Timer tick (called by UI every second) ────────────────────────────

      tickSession: (id) => {
        const now = Date.now();
        set(s => ({
          sessions: s.sessions.map(sess => {
            if (sess.id !== id || sess.status !== 'active') return sess;
            if (sess.remainingSeconds === null) return sess;

            const elapsed = (now - (sess.lastTickAt || now)) / 1000;
            const remaining = Math.max(0, sess.remainingSeconds - elapsed);
            const expired = remaining <= 0 && !sess.timerExpired;
            return {
              ...sess,
              remainingSeconds: remaining,
              lastTickAt: now,
              timerExpired: expired || sess.timerExpired,
              // Stop billing when fixed timer expires — don't advance segments
            };
          }),
        }));
      },

      // ── Add hours ─────────────────────────────────────────────────────────

      addHours: (id, minutes, price) => {
        set(s => ({
          sessions: s.sessions.map(sess => {
            if (sess.id !== id) return sess;
            const newRemaining = (sess.remainingSeconds || 0) + minutes * 60;
            const extraItem = {
              id: genId('ci_'),
              type: 'rental',
              name: `Tambah Waktu +${minutes >= 60 ? `${minutes/60}j` : `${minutes}m`}`,
              qty: 1,
              unitPrice: price,
              subtotal: price,
            };
            return {
              ...sess,
              remainingSeconds: newRemaining,
              lastTickAt: Date.now(),
              timerExpired: false,
              addedMinutes: sess.addedMinutes + minutes,
              cart: [...sess.cart, extraItem],
            };
          }),
        }));
      },

      // ── Cart management ───────────────────────────────────────────────────

      addCartItem: (sessionId, item) => {
        set(s => ({
          sessions: s.sessions.map(sess => {
            if (sess.id !== sessionId) return sess;
            // Merge with existing same productId if simple F&B
            if (item.productId) {
              const existing = sess.cart.find(c => c.productId === item.productId && !c.packageId);
              if (existing) {
                return {
                  ...sess,
                  cart: sess.cart.map(c =>
                    c.id === existing.id
                      ? { ...c, qty: c.qty + item.qty, subtotal: (c.qty + item.qty) * c.unitPrice }
                      : c
                  ),
                };
              }
            }
            return { ...sess, cart: [...sess.cart, { id: genId('ci_'), ...item }] };
          }),
        }));
      },

      updateCartItemQty: (sessionId, cartItemId, qty) => {
        set(s => ({
          sessions: s.sessions.map(sess => {
            if (sess.id !== sessionId) return sess;
            if (qty <= 0) {
              return { ...sess, cart: sess.cart.filter(c => c.id !== cartItemId) };
            }
            return {
              ...sess,
              cart: sess.cart.map(c =>
                c.id === cartItemId ? { ...c, qty, subtotal: qty * c.unitPrice } : c
              ),
            };
          }),
        }));
      },

      removeCartItem: (sessionId, cartItemId) => {
        set(s => ({
          sessions: s.sessions.map(sess => {
            if (sess.id !== sessionId) return sess;
            return { ...sess, cart: sess.cart.filter(c => c.id !== cartItemId) };
          }),
        }));
      },

      replacePackageItem: (sessionId, cartItemId, oldProductId, newProductId, newQty) => {
        // Replace an out-of-stock package item with a substitute
        set(s => ({
          sessions: s.sessions.map(sess => {
            if (sess.id !== sessionId) return sess;
            return {
              ...sess,
              cart: sess.cart.map(c => {
                if (c.id !== cartItemId || !c.packageItems) return c;
                return {
                  ...c,
                  packageItems: c.packageItems.map(pi =>
                    pi.productId === oldProductId
                      ? { ...pi, productId: newProductId, qty: newQty, replacement: { originalProductId: oldProductId } }
                      : pi
                  ),
                };
              }),
            };
          }),
        }));
      },

      // ── Apply / remove promo ──────────────────────────────────────────────

      setPromo: (sessionId, promoId, discountAmount) => {
        set(s => ({
          sessions: s.sessions.map(sess =>
            sess.id === sessionId ? { ...sess, promoId, discountAmount } : sess
          ),
        }));
      },

      // ── End session ───────────────────────────────────────────────────────

      endSession: (id) => {
        const now = Date.now();
        set(s => ({
          sessions: s.sessions.map(sess => {
            if (sess.id !== id) return sess;
            // Close any open segment
            const segments = sess.segments.map(seg =>
              seg.end === null ? { ...seg, end: now } : seg
            );
            return { ...sess, status: 'ended', segments, endedAt: now };
          }),
        }));
      },

      // ── Get billable minutes for a session ────────────────────────────────

      getBillableMinutes: (id) => {
        const sess = get().sessions.find(s => s.id === id);
        if (!sess) return 0;
        if (sess.billingType === 'fixed' || sess.billingType === 'package') {
          // Fixed: charge original fixedMinutes + addedMinutes
          return (sess.fixedMinutes || 0) + (sess.addedMinutes || 0);
        }
        // Open bill: sum non-paused segments
        return calcBillableMinutes(sess.segments);
      },
    }),
    { name: 'gamehub-sessions' }
  )
);
