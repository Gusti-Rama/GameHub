import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Monitor, Package, Tag, BarChart2,
  Receipt, Gamepad2, ChevronRight
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/rentals', label: 'Rental & POS', icon: Gamepad2 },
  { to: '/units', label: 'Unit', icon: Monitor },
  { to: '/products', label: 'Produk & Paket', icon: Package },
  { to: '/promotions', label: 'Promosi', icon: Tag },
  { to: '/reports', label: 'Laporan', icon: BarChart2 },
  { to: '/transactions', label: 'Transaksi', icon: Receipt },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-56' : 'w-16'} flex-shrink-0 bg-gray-900 text-white flex flex-col transition-all duration-200`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-700">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Gamepad2 size={18} />
          </div>
          {sidebarOpen && (
            <span className="font-bold text-lg tracking-tight">GameHub</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <Icon size={18} className="flex-shrink-0" />
              {sidebarOpen && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Toggle button */}
        <button
          onClick={() => setSidebarOpen(o => !o)}
          className="flex items-center justify-center gap-2 px-4 py-3 border-t border-gray-700 text-gray-400 hover:text-white text-xs transition-colors"
        >
          <ChevronRight size={16} className={`transition-transform ${sidebarOpen ? 'rotate-180' : ''}`} />
          {sidebarOpen && <span>Ciutkan</span>}
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
