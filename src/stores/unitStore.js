import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { genId } from '../utils';

export const useUnitStore = create(
  persist(
    (set, get) => ({
      units: [],

      addUnit: (data) => {
        const unit = {
          id: genId('unit_'),
          name: data.name.trim(),
          type: data.type, // 'PS' | 'PC'
          hourlyRate: Number(data.hourlyRate),
          status: 'available', // 'available' | 'occupied' | 'maintenance'
          createdAt: Date.now(),
        };
        set(s => ({ units: [...s.units, unit] }));
        return unit;
      },

      updateUnit: (id, data) => {
        set(s => ({
          units: s.units.map(u =>
            u.id === id ? { ...u, ...data } : u
          ),
        }));
      },

      deleteUnit: (id) => {
        set(s => ({ units: s.units.filter(u => u.id !== id) }));
      },

      setUnitStatus: (id, status) => {
        set(s => ({
          units: s.units.map(u => u.id === id ? { ...u, status } : u),
        }));
      },

      getUnit: (id) => get().units.find(u => u.id === id),
    }),
    { name: 'gamehub-units' }
  )
);
