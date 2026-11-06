import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { genId } from '../utils';

/**
 * Transaction structure:
 * {
 *   id: string,
 *   sessionId: string | null,   // null for standalone F&B
 *   unitId: string | null,
 *   unitName: string | null,
 *   billingType: string | null,
 *   
 *   lineItems: Array<{
 *     id, type, name, qty, unitPrice, subtotal,
 *     productId?, packageId?, packageItems?
 *   }>,
 *
 *   subtotal: number,         // sum of line items before discount and rounding
 *   discountAmount: number,
 *   promoId: string | null,
 *   promoName: string | null,
 *   roundedAmount: number,    // after rounding to nearest 500
 *   
 *   payments: Array<{ method: string, amount: number }>,
 *   totalPaid: number,
 *   change: number,
 *
 *   status: 'completed' | 'refunded' | 'partial_refund' | 'voided',
 *   refundAmount: number,
 *   refundMethod: string | null,
 *   refundNote: string,
 *   refundedAt: number | null,
 *
 *   createdAt: number,
 *   updatedAt: number,
 *   note: string,
 * }
 */

export const useTransactionStore = create(
  persist(
    (set, get) => ({
      transactions: [],

      // ── Record transaction ─────────────────────────────────────────────────

      recordTransaction: (data) => {
        const tx = {
          id: genId('tx_'),
          sessionId: data.sessionId || null,
          unitId: data.unitId || null,
          unitName: data.unitName || null,
          billingType: data.billingType || null,
          lineItems: data.lineItems || [],
          subtotal: data.subtotal || 0,
          discountAmount: data.discountAmount || 0,
          promoId: data.promoId || null,
          promoName: data.promoName || null,
          roundedAmount: data.roundedAmount || 0,
          payments: data.payments || [],
          totalPaid: data.totalPaid || 0,
          change: data.change || 0,
          status: 'completed',
          refundAmount: 0,
          refundMethod: null,
          refundNote: '',
          refundedAt: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          note: data.note || '',
        };
        set(s => ({ transactions: [tx, ...s.transactions] }));
        return tx;
      },

      // ── Update / edit ──────────────────────────────────────────────────────

      updateTransaction: (id, data) => {
        set(s => ({
          transactions: s.transactions.map(tx =>
            tx.id === id ? { ...tx, ...data, updatedAt: Date.now() } : tx
          ),
        }));
      },

      // ── Refund ─────────────────────────────────────────────────────────────

      refundTransaction: (id, { amount, method, note }) => {
        set(s => ({
          transactions: s.transactions.map(tx => {
            if (tx.id !== id) return tx;
            const isFullRefund = amount >= tx.roundedAmount - tx.refundAmount;
            return {
              ...tx,
              status: isFullRefund ? 'refunded' : 'partial_refund',
              refundAmount: (tx.refundAmount || 0) + amount,
              refundMethod: method,
              refundNote: note || '',
              refundedAt: Date.now(),
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      // ── Void ──────────────────────────────────────────────────────────────

      voidTransaction: (id, note) => {
        set(s => ({
          transactions: s.transactions.map(tx =>
            tx.id === id
              ? { ...tx, status: 'voided', refundNote: note || '', updatedAt: Date.now() }
              : tx
          ),
        }));
      },

      getTransaction: (id) => get().transactions.find(t => t.id === id),

      // ── Revenue helpers ───────────────────────────────────────────────────

      getNetRevenue: (tx) => {
        if (tx.status === 'voided') return 0;
        return tx.roundedAmount - (tx.refundAmount || 0);
      },
    }),
    { name: 'gamehub-transactions' }
  )
);
