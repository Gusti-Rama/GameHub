import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts';
import { BarChart2 } from 'lucide-react';
import { useTransactionStore } from '../stores/transactionStore';
import { formatRupiah, formatDate } from '../utils';

const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

export default function Reports() {
  const { transactions, getNetRevenue } = useTransactionStore();
  const now = new Date();

  const [rangeMode, setRangeMode] = useState('month'); // 'month' | 'custom'
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Filter transactions by range
  const filteredTx = useMemo(() => {
    return transactions.filter(tx => {
      if (tx.status === 'voided') return false;
      const d = new Date(tx.createdAt);
      if (rangeMode === 'month') {
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      } else {
        const from = dateFrom ? new Date(dateFrom) : null;
        const to = dateTo ? new Date(dateTo + 'T23:59:59') : null;
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      }
    });
  }, [transactions, rangeMode, selectedMonth, selectedYear, dateFrom, dateTo]);

  const totalRevenue = useMemo(() => filteredTx.reduce((s, tx) => s + getNetRevenue(tx), 0), [filteredTx]);
  const totalRefunds = useMemo(() => filteredTx.reduce((s, tx) => s + (tx.refundAmount || 0), 0), [filteredTx]);
  const totalTransactions = filteredTx.length;

  // Daily breakdown
  const dailyData = useMemo(() => {
    const map = {};
    filteredTx.forEach(tx => {
      const d = new Date(tx.createdAt);
      const key = `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
      map[key] = (map[key] || 0) + getNetRevenue(tx);
    });
    return Object.entries(map)
      .sort((a, b) => {
        const parse = s => {
          const [day, mon] = s.split(' ');
          return MONTHS_SHORT.indexOf(mon) * 31 + parseInt(day);
        };
        return parse(a[0]) - parse(b[0]);
      })
      .map(([label, revenue]) => ({ label, revenue }));
  }, [filteredTx]);

  // Monthly 12-month summary
  const monthlyData = useMemo(() => {
    const months = [];
    for (let m = 0; m < 12; m++) {
      const rev = transactions
        .filter(tx => {
          if (tx.status === 'voided') return false;
          const d = new Date(tx.createdAt);
          return d.getMonth() === m && d.getFullYear() === selectedYear;
        })
        .reduce((s, tx) => s + getNetRevenue(tx), 0);
      months.push({ label: MONTHS_SHORT[m], revenue: rev });
    }
    return months;
  }, [transactions, selectedYear]);

  // Revenue breakdown by type
  const breakdown = useMemo(() => {
    let rental = 0, pkg = 0, food = 0, drink = 0;
    filteredTx.forEach(tx => {
      const net = getNetRevenue(tx);
      const rawTotal = tx.subtotal || 0;
      const discountRatio = rawTotal > 0 ? net / (tx.roundedAmount || rawTotal) : 1;
      tx.lineItems?.forEach(item => {
        const share = item.subtotal * discountRatio;
        if (item.type === 'rental') rental += share;
        else if (item.type === 'package') pkg += share;
        else if (item.type === 'food') food += share;
        else if (item.type === 'drink') drink += share;
      });
    });
    return { rental, pkg, food, drink };
  }, [filteredTx]);

  // Top products
  const topProducts = useMemo(() => {
    const map = {};
    filteredTx.forEach(tx => {
      tx.lineItems?.forEach(item => {
        if (item.type === 'food' || item.type === 'drink') {
          if (!map[item.name]) map[item.name] = { name: item.name, qty: 0, revenue: 0 };
          map[item.name].qty += item.qty;
          map[item.name].revenue += item.subtotal;
        }
      });
    });
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 8);
  }, [filteredTx]);

  const years = [];
  const startYear = 2024;
  for (let y = startYear; y <= now.getFullYear() + 1; y++) years.push(y);

  const hasTx = transactions.length > 0;
  const hasFiltered = filteredTx.length > 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan</h1>
          <p className="text-sm text-gray-500 mt-1">Ringkasan pendapatan dan analisis penjualan.</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="label">Mode Filter</label>
          <select className="input" value={rangeMode} onChange={e => setRangeMode(e.target.value)}>
            <option value="month">Per Bulan</option>
            <option value="custom">Rentang Tanggal</option>
          </select>
        </div>
        {rangeMode === 'month' ? (
          <>
            <div>
              <label className="label">Bulan</label>
              <select className="input" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
                {MONTHS_ID.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Tahun</label>
              <select className="input" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="label">Dari</label>
              <input className="input" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="label">Sampai</label>
              <input className="input" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </>
        )}
      </div>

      {!hasTx ? (
        <div className="card p-16 text-center border-dashed border-2 border-gray-200">
          <BarChart2 size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-lg font-semibold text-gray-600">Belum Ada Data Transaksi</h2>
          <p className="text-sm text-gray-400 mt-2 max-w-sm mx-auto">
            Laporan akan tampil setelah Anda menyelesaikan transaksi pertama.
          </p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Pendapatan Bersih', value: formatRupiah(totalRevenue), color: 'text-green-700', bg: 'bg-green-50' },
              { label: 'Total Transaksi', value: totalTransactions, color: 'text-blue-700', bg: 'bg-blue-50' },
              { label: 'Total Refund', value: formatRupiah(totalRefunds), color: 'text-red-700', bg: 'bg-red-50' },
              { label: 'Rata-rata per Transaksi', value: formatRupiah(totalTransactions > 0 ? totalRevenue / totalTransactions : 0), color: 'text-purple-700', bg: 'bg-purple-50' },
            ].map(card => (
              <div key={card.label} className={`card p-4 ${card.bg}`}>
                <p className="text-xs text-gray-500">{card.label}</p>
                <p className={`text-xl font-bold mt-1 ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Empty state for selected period */}
          {!hasFiltered && (
            <div className="card p-10 text-center">
              <p className="text-gray-400">Tidak ada transaksi di periode yang dipilih.</p>
            </div>
          )}

          {hasFiltered && (
            <>
              {/* Breakdown */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Rental', value: breakdown.rental, color: 'text-blue-600' },
                  { label: 'Paket', value: breakdown.pkg, color: 'text-purple-600' },
                  { label: 'Makanan', value: breakdown.food, color: 'text-orange-600' },
                  { label: 'Minuman', value: breakdown.drink, color: 'text-teal-600' },
                ].map(b => (
                  <div key={b.label} className="card p-4">
                    <p className="text-xs text-gray-500">{b.label}</p>
                    <p className={`text-lg font-bold mt-1 ${b.color}`}>{formatRupiah(b.value)}</p>
                  </div>
                ))}
              </div>

              {/* Daily chart */}
              {dailyData.length > 0 && (
                <div className="card p-5">
                  <h2 className="text-base font-semibold text-gray-900 mb-4">Pendapatan Harian</h2>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={dailyData} margin={{ top:4, right:8, left:8, bottom:4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={v => [formatRupiah(v), 'Pendapatan']} />
                      <Bar dataKey="revenue" fill="#3b82f6" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Top products */}
              {topProducts.length > 0 && (
                <div className="card p-5">
                  <h2 className="text-base font-semibold text-gray-900 mb-4">Produk F&B Terlaris</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <th className="text-left px-4 py-2 font-medium text-gray-600">#</th>
                          <th className="text-left px-4 py-2 font-medium text-gray-600">Produk</th>
                          <th className="text-left px-4 py-2 font-medium text-gray-600">Qty Terjual</th>
                          <th className="text-left px-4 py-2 font-medium text-gray-600">Total Pendapatan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topProducts.map((p, i) => (
                          <tr key={p.name} className="border-b border-gray-50">
                            <td className="px-4 py-2 text-gray-500">{i+1}</td>
                            <td className="px-4 py-2 font-medium text-gray-900">{p.name}</td>
                            <td className="px-4 py-2 text-gray-700">{p.qty}</td>
                            <td className="px-4 py-2 text-gray-700">{formatRupiah(p.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* 12-month trend */}
          <div className="card p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Tren Pendapatan {selectedYear}</h2>
            <p className="text-xs text-gray-400 mb-4">Semua transaksi sepanjang tahun (tidak terpengaruh filter bulan)</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyData} margin={{ top:4, right:8, left:8, bottom:4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={v => [formatRupiah(v), 'Pendapatan']} />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
