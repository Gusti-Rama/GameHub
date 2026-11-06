import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Tag, ToggleLeft, ToggleRight } from 'lucide-react';
import { usePromoStore } from '../stores/promoStore';
import { formatRupiah } from '../utils';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';

const SCOPE_LABELS = {
  all: 'Semua Item',
  rental: 'Rental Saja',
  fnb: 'F&B Saja',
  food: 'Makanan Saja',
  drink: 'Minuman Saja',
};

function PromoForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    type: initial?.type || 'percentage',
    value: initial?.value || '',
    scope: initial?.scope || 'all',
    active: initial?.active !== undefined ? initial.active : true,
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Nama promosi wajib diisi';
    if (!form.value || isNaN(form.value) || Number(form.value) <= 0) e.value = 'Nilai harus angka positif';
    if (form.type === 'percentage' && Number(form.value) > 100) e.value = 'Persentase tidak boleh lebih dari 100';
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave({ ...form, value: Number(form.value) });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Nama Promosi</label>
        <input className="input" placeholder="cth: Diskon Akhir Pekan" value={form.name} onChange={e => setForm(f => ({...f,name:e.target.value}))} />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Tipe Diskon</label>
          <select className="input" value={form.type} onChange={e => setForm(f => ({...f,type:e.target.value}))}>
            <option value="percentage">Persentase (%)</option>
            <option value="fixed">Nominal (Rp)</option>
          </select>
        </div>
        <div>
          <label className="label">Nilai</label>
          <input
            className="input"
            type="number"
            min="0"
            max={form.type === 'percentage' ? 100 : undefined}
            placeholder={form.type === 'percentage' ? 'cth: 20' : 'cth: 5000'}
            value={form.value}
            onChange={e => setForm(f => ({...f,value:e.target.value}))}
          />
          {errors.value && <p className="text-red-500 text-xs mt-1">{errors.value}</p>}
        </div>
      </div>
      <div>
        <label className="label">Berlaku Untuk</label>
        <select className="input" value={form.scope} onChange={e => setForm(f => ({...f,scope:e.target.value}))}>
          {Object.entries(SCOPE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="active-toggle"
          checked={form.active}
          onChange={e => setForm(f => ({...f,active:e.target.checked}))}
          className="w-4 h-4 accent-blue-600"
        />
        <label htmlFor="active-toggle" className="text-sm text-gray-700">Aktif</label>
      </div>
      <div className="flex gap-3 pt-2 justify-end">
        <button type="button" className="btn-secondary" onClick={onClose}>Batal</button>
        <button type="submit" className="btn-primary">{initial ? 'Simpan' : 'Buat Promosi'}</button>
      </div>
    </form>
  );
}

export default function Promotions() {
  const { promotions, addPromotion, updatePromotion, deletePromotion, toggleActive } = usePromoStore();
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promosi</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola diskon dan promosi untuk checkout.</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Buat Promosi
        </button>
      </div>

      {promotions.length === 0 ? (
        <div className="card p-12 text-center border-dashed border-2 border-gray-200">
          <Tag size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-lg font-semibold text-gray-600">Belum Ada Promosi</h2>
          <p className="text-sm text-gray-400 mt-2 mb-6 max-w-sm mx-auto">
            Buat promosi diskon untuk pelanggan. Promosi dapat diterapkan saat checkout.
          </p>
          <button className="btn-primary inline-flex items-center gap-2" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Buat Promosi Pertama
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nama</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Diskon</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Berlaku Untuk</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {promotions.map(p => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {p.type === 'percentage' ? `${p.value}%` : formatRupiah(p.value)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{SCOPE_LABELS[p.scope]}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(p.id)}
                      className={`badge cursor-pointer ${p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {p.active ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <button className="btn-secondary btn-xs flex items-center gap-1" onClick={() => setEditItem(p)}><Edit2 size={11}/> Edit</button>
                      <button className="btn-danger btn-xs flex items-center gap-1" onClick={() => setDeleteTarget(p)}><Trash2 size={11}/> Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <Modal title="Buat Promosi" onClose={() => setShowAdd(false)}>
          <PromoForm onSave={data => addPromotion(data)} onClose={() => setShowAdd(false)} />
        </Modal>
      )}
      {editItem && (
        <Modal title={`Edit Promosi: ${editItem.name}`} onClose={() => setEditItem(null)}>
          <PromoForm initial={editItem} onSave={data => updatePromotion(editItem.id, data)} onClose={() => setEditItem(null)} />
        </Modal>
      )}
      {deleteTarget && (
        <ConfirmDialog
          title="Hapus Promosi"
          message={`Hapus promosi "${deleteTarget.name}"?`}
          confirmLabel="Hapus"
          onConfirm={() => deletePromotion(deleteTarget.id)}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
