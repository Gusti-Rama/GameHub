import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Monitor, TrendingUp, ShoppingBag, Clock, AlertCircle, Plus } from 'lucide-react';
import { useUnitStore } from '../stores/unitStore';
import { useTransactionStore } from '../stores/transactionStore';
import { useSessionStore } from '../stores/sessionStore';
import { formatRupiah, formatDate } from '../utils';

const MONTHS_ID = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

function StatCard({ label, value, sub, icon: Icon, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { units } = useUnitStore();
  const { transactions, getNetRevenue } = useTransactionStore();
  const { sessions } = useSessionStore();

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  // Today stats
  const todayStr = now.toLocaleDateString('id-ID');
  const todayTx = useMemo(() =>
    transactions.filter(tx => {
      const d = new Date(tx.createdAt);
      return d.toLocaleDateString('id-ID') === todayStr && tx.status !== 'voided';
    }),
    [transactions, todayStr]
  );
  const todayRevenue = useMemo(() => todayTx.reduce((s, tx) => s + getNetRevenue(tx), 0), [todayTx]);
  const thisMonthTx = useMemo(() =>
    transactions.filter(tx => {
      const d = new Date(tx.createdAt);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear && tx.status !== 'voided';
    }),
    [transactions]
  );
  const monthRevenue = useMemo(() => thisMonthTx.reduce((s, tx) => s + getNetRevenue(tx), 0), [thisMonthTx]);

  // Active sessions
  const activeSessions = useMemo(() =>
    sessions.filter(s => s.status === 'active' || s.status === 'paused'),
    [sessions]
  );

  // Unit stats
  const availableUnits = units.filter(u => u.status === 'available');
  const occupiedUnits = units.filter(u => u.status === 'occupied');
  const maintenanceUnits = units.filter(u => u.status === 'maintenance');

  // Daily revenue chart (last 14 days)
  const dailyData = useMemo(() => {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const label = `${d.getDate()} ${MONTHS_ID[d.getMonth()]}`;
      const dateStr = d.toLocaleDateString('id-ID');
      const dayRevenue = transactions
        .filter(tx => {
          const td = new Date(tx.createdAt);
          return td.toLocaleDateString('id-ID') === dateStr && tx.status !== 'voided';
        })
        .reduce((s, tx) => s + getNetRevenue(tx), 0);
      days.push({ label, revenue: dayRevenue });
    }
    return days;
  }, [transactions]);

  // Best F&B
  const fnbSales = useMemo(() => {
    const map = {};
    transactions.forEach(tx => {
      if (tx.status === 'voided') return;
      tx.lineItems?.forEach(item => {
        if (item.type === 'food' || item.type === 'drink') {
          map[item.name] = (map[item.name] || 0) + item.qty;
        }
        if (item.type === 'package' && item.packageItems) {
          item.packageItems.forEach(pi => {
            // package F&B items tracked via package
          });
        }
      });
    });
    return Object.entries(map)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [transactions]);

  // Best units (by revenue)
  const unitRevenue = useMemo(() => {
    const map = {};
    transactions.forEach(tx => {
      if (tx.status === 'voided' || !tx.unitId) return;
      map[tx.unitId] = (map[tx.unitId] || { name: tx.unitName || tx.unitId, rev: 0 });
      map[tx.unitId].rev += getNetRevenue(tx);
    });
    return Object.values(map).sort((a, b) => b.rev - a.rev).slice(0, 5);
  }, [transactions]);

  const hasUnits = units.length > 0;
  const hasTx = transactions.length > 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            {now.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          </p>
        </div>
      </div>

      {/* No units banner */}
      {!hasUnits && (
        <div className="card p-6 border-dashed border-2 border-blue-200 bg-blue-50 text-center">
          <AlertCircle className="mx-auto text-blue-400 mb-3" size={36} />
          <h2 className="text-lg font-semibold text-blue-900">Belum Ada Unit Terdaftar</h2>
          <p className="text-sm text-blue-700 mt-1 mb-4">
            Tambahkan unit PS/PC terlebih dahulu agar Anda bisa membuka sesi rental dan mulai berjualan.
          </p>
          <Link to="/units" className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} /> Tambah Unit
          </Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Pendapatan Hari Ini" value={formatRupiah(todayRevenue)} sub={`${todayTx.length} transaksi`} icon={TrendingUp} color="green" />
        <StatCard label="Pendapatan Bulan Ini" value={formatRupiah(monthRevenue)} sub={`${thisMonthTx.length} transaksi`} icon={TrendingUp} color="blue" />
        <StatCard label="Sesi Aktif" value={activeSessions.length} sub={`${occupiedUnits.length} unit terpakai`} icon={Clock} color="amber" />
        <StatCard label="Total Unit" value={units.length} sub={`${availableUnits.length} tersedia`} icon={Monitor} color="purple" />
      </div>

      {/* Unit grid */}
      {hasUnits && (
        <div className="card p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Status Unit</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-2">
            {units.map(unit => {
              const statusColor =
                unit.status === 'occupied' ? 'bg-red-100 border-red-300 text-red-700' :
                unit.status === 'maintenance' ? 'bg-amber-100 border-amber-300 text-amber-700' :
                'bg-green-100 border-green-300 text-green-700';
              const typeColor = unit.type === 'PS' ? 'text-blue-700' : 'text-green-700';
              return (
                <div key={unit.id} className={`border rounded-lg p-2 text-center text-xs ${statusColor}`}>
                  <div className={`font-bold text-sm ${typeColor}`}>{unit.type}</div>
                  <div className="font-medium truncate">{unit.name}</div>
                  <div className="mt-0.5 capitalize">
                    {unit.status === 'occupied' ? 'Terpakai' : unit.status === 'maintenance' ? 'Perbaikan' : 'Tersedia'}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-400 inline-block"/> Tersedia ({availableUnits.length})</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-400 inline-block"/> Terpakai ({occupiedUnits.length})</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block"/> Perbaikan ({maintenanceUnits.length})</span>
          </div>
        </div>
      )}

      {/* Revenue chart */}
      <div className="card p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Pendapatan 14 Hari Terakhir</h2>
        {!hasTx ? (
          <div className="text-center py-12 text-gray-400">
            <ShoppingBag size={36} className="mx-auto mb-2" />
            <p className="text-sm">Belum ada transaksi. Mulai rental atau jual F&B untuk melihat data pendapatan.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dailyData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [formatRupiah(v), 'Pendapatan']} />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[4,4,0,0]} name="Pendapatan" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Best F&B */}
        <div className="card p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">F&B Terlaris</h2>
          {fnbSales.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Belum ada penjualan F&B.</p>
          ) : (
            <div className="space-y-3">
              {fnbSales.map((item, i) => (
                <div key={item.name} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center flex-shrink-0">{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{item.qty}x</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Best units */}
        <div className="card p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Unit Terbaik</h2>
          {unitRevenue.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Belum ada data rental unit.</p>
          ) : (
            <div className="space-y-3">
              {unitRevenue.map((u, i) => (
                <div key={u.name} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 text-xs font-bold flex items-center justify-center flex-shrink-0">{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{u.name}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{formatRupiah(u.rev)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
