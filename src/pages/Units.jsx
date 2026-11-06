import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Monitor, AlertCircle } from 'lucide-react';
import { useUnitStore } from '../stores/unitStore';
import { useSessionStore } from '../stores/sessionStore';
import { formatRupiah } from '../utils';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';

const UNIT_TYPES = ['PS', 'PC'];
const UNIT_STATUSES = [
  { value: 'available', label: 'Tersedia' },
  { value: 'maintenance', label: 'Perbaikan' },
];

function UnitForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    type: initial?.type || 'PS',
    hourlyRate: initial?.hourlyRate || '',
    status: initial?.status === 'maintenance' ? 'maintenance' : 'available',
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Nama wajib diisi';
    if (!form.hourlyRate || isNaN(form.hourlyRate) || Number(form.hourlyRate) <= 0)
      e.hourlyRate = 'Tarif per jam harus berupa angka positif';
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length) { setErrors(e2); return; }
    onSave(form);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Nama / ID Unit</label>
        <input
          className="input"
          placeholder="cth: PS5-01, PC-03"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>
      <div>
        <label className="label">Tipe</label>
        <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
          {UNIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Tarif per Jam (Rp)</label>
        <input
          className="input"
          type="number"
          min="0"
          placeholder="cth: 15000"
          value={form.hourlyRate}
          onChange={e => setForm(f => ({ ...f, hourlyRate: e.target.value }))}
        />
        {errors.hourlyRate && <p className="text-red-500 text-xs mt-1">{errors.hourlyRate}</p>}
      </div>
      {initial && (
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            {UNIT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      )}
      <div className="flex gap-3 pt-2 justify-end">
        <button type="button" className="btn-secondary" onClick={onClose}>Batal</button>
        <button type="submit" className="btn-primary">
          {initial ? 'Simpan Perubahan' : 'Tambah Unit'}
        </button>
      </div>
    </form>
  );
}

export default function Units() {
  const { units, addUnit, updateUnit, deleteUnit } = useUnitStore();
  const { sessions } = useSessionStore();
  const [showAdd, setShowAdd] = useState(false);
  const [editUnit, setEditUnit] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const hasActiveSession = (unitId) =>
    sessions.some(s => s.unitId === unitId && s.status !== 'ended');

  const statusLabel = (status) =>
    status === 'occupied' ? 'Terpakai' :
    status === 'maintenance' ? 'Perbaikan' : 'Tersedia';

  const statusBadge = (status) =>
    status === 'occupied' ? 'badge bg-red-100 text-red-700' :
    status === 'maintenance' ? 'badge bg-amber-100 text-amber-700' :
    'badge bg-green-100 text-green-700';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Unit</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola unit PS dan PC yang tersedia untuk disewakan.</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Tambah Unit
        </button>
      </div>

      {units.length === 0 ? (
        <div className="card p-12 text-center border-dashed border-2 border-gray-200">
          <Monitor size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-lg font-semibold text-gray-600">Belum Ada Unit</h2>
          <p className="text-sm text-gray-400 mt-2 mb-6 max-w-sm mx-auto">
            Tambahkan unit PS atau PC untuk mulai menerima sesi rental. Setiap unit memiliki tarif per jam sendiri.
          </p>
          <button className="btn-primary inline-flex items-center gap-2" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Tambah Unit Pertama
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nama/ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tipe</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tarif/Jam</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {units.map(unit => (
                <tr key={unit.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{unit.name}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${unit.type === 'PS' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {unit.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{formatRupiah(unit.hourlyRate)}/jam</td>
                  <td className="px-4 py-3">
                    <span className={statusBadge(unit.status)}>{statusLabel(unit.status)}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        className="btn-secondary btn-xs flex items-center gap-1"
                        onClick={() => setEditUnit(unit)}
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                      <button
                        className="btn-danger btn-xs flex items-center gap-1"
                        disabled={hasActiveSession(unit.id)}
                        title={hasActiveSession(unit.id) ? 'Tidak bisa hapus unit yang sedang aktif' : ''}
                        onClick={() => setDeleteTarget(unit)}
                      >
                        <Trash2 size={12} /> Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <Modal title="Tambah Unit" onClose={() => setShowAdd(false)}>
          <UnitForm
            onSave={data => addUnit(data)}
            onClose={() => setShowAdd(false)}
          />
        </Modal>
      )}

      {/* Edit modal */}
      {editUnit && (
        <Modal title={`Edit Unit: ${editUnit.name}`} onClose={() => setEditUnit(null)}>
          <UnitForm
            initial={editUnit}
            onSave={data => {
              // If unit has active session, don't change status to available/maintenance
              if (hasActiveSession(editUnit.id)) {
                const { status, ...rest } = data;
                updateUnit(editUnit.id, rest);
              } else {
                updateUnit(editUnit.id, data);
              }
            }}
            onClose={() => setEditUnit(null)}
          />
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <ConfirmDialog
          title="Hapus Unit"
          message={`Hapus unit "${deleteTarget.name}"? Tindakan ini tidak dapat dibatalkan.`}
          confirmLabel="Hapus"
          onConfirm={() => deleteUnit(deleteTarget.id)}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
