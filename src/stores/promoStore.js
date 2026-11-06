import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { genId } from '../utils';

export const usePromoStore = create(
  persist(
    (set, get) => ({
      promotions: [],

      addPromotion: (data) => {
        const promo = {
          id: genId('promo_'),
          name: data.name.trim(),
          type: data.type, // 'percentage' | 'fixed'
          value: Number(data.value),
          scope: data.scope, // 'all' | 'rental' | 'fnb' | 'food' | 'drink'
          active: data.active !== undefined ? data.active : true,
          createdAt: Date.now(),
        };
        set(s => ({ promotions: [...s.promotions, promo] }));
        return promo;
      },

      updatePromotion: (id, data) => {
        set(s => ({
          promotions: s.promotions.map(p =>
            p.id === id ? { ...p, ...data } : p
          ),
        }));
      },

      deletePromotion: (id) => {
        set(s => ({ promotions: s.promotions.filter(p => p.id !== id) }));
      },

      toggleActive: (id) => {
        set(s => ({
          promotions: s.promotions.map(p =>
            p.id === id ? { ...p, active: !p.active } : p
          ),
        }));
      },

      getPromotion: (id) => get().promotions.find(p => p.id === id),
    }),
    { name: 'gamehub-promotions' }
  )
);
