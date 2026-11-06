import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { genId } from '../utils';

export const useProductStore = create(
  persist(
    (set, get) => ({
      products: [],
      packages: [],

      // ── Products ──────────────────────────────────────────────────────────

      addProduct: (data) => {
        const product = {
          id: genId('prod_'),
          name: data.name.trim(),
          category: data.category, // 'Food' | 'Drink'
          price: Number(data.price),
          stock: Number(data.stock),
          createdAt: Date.now(),
        };
        set(s => ({ products: [...s.products, product] }));
        return product;
      },

      updateProduct: (id, data) => {
        set(s => ({
          products: s.products.map(p =>
            p.id === id ? { ...p, ...data } : p
          ),
        }));
      },

      deleteProduct: (id) => {
        set(s => ({ products: s.products.filter(p => p.id !== id) }));
      },

      adjustStock: (id, delta) => {
        set(s => ({
          products: s.products.map(p =>
            p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p
          ),
        }));
      },

      deductStock: (cartItems) => {
        // cartItems: [{ productId, qty }]
        set(s => {
          const products = s.products.map(p => {
            const needed = cartItems
              .filter(c => c.productId === p.id)
              .reduce((sum, c) => sum + c.qty, 0);
            return needed > 0 ? { ...p, stock: Math.max(0, p.stock - needed) } : p;
          });
          return { products };
        });
      },

      getProduct: (id) => get().products.find(p => p.id === id),

      // ── Packages ──────────────────────────────────────────────────────────

      addPackage: (data) => {
        const pkg = {
          id: genId('pkg_'),
          name: data.name.trim(),
          price: Number(data.price),
          durationMinutes: Number(data.durationMinutes),
          // items: [{ productId, qty }]
          items: data.items || [],
          createdAt: Date.now(),
        };
        set(s => ({ packages: [...s.packages, pkg] }));
        return pkg;
      },

      updatePackage: (id, data) => {
        set(s => ({
          packages: s.packages.map(p =>
            p.id === id ? { ...p, ...data } : p
          ),
        }));
      },

      deletePackage: (id) => {
        set(s => ({ packages: s.packages.filter(p => p.id !== id) }));
      },

      getPackage: (id) => get().packages.find(p => p.id === id),
    }),
    { name: 'gamehub-products' }
  )
);
