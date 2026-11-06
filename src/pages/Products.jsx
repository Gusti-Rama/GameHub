import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Package, ShoppingBag, ChevronDown, ChevronUp } from 'lucide-react';
import { useProductStore } from '../stores/productStore';
import { formatRupiah } from '../utils';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';

// ── Product Form ──────────────────────────────────────────────────────────────

function ProductForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    category: initial?.category || 'Food',
    price: initial?.price || '',
    stock: initial?.stock ?? '',
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Nama wajib diisi';
    if (!form.price || isNaN(form.price) || Number(form.price) < 0) e.price = 'Harga harus angka non-negatif';
    if (form.stock === '' || isNaN(form.stock) || Number(form.stock) < 0) e.stock = 'Stok harus angka non-negatif';
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave({ ...form, price: Number(form.price), stock: Number(form.stock) });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Nama Produk</label>
        <input className="input" placeholder="cth: Indomie Goreng" value={form.name} onChange={e => setForm(f => ({...f,name:e.target.value}))} />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>
      <div>
        <label className="label">Kategori</label>
        <select className="input" value={form.category} onChange={e => setForm(f => ({...f,category:e.target.value}))}>
          <option value="Food">Makanan</option>
          <option value="Drink">Minuman</option>
        </select>
      </div>
      <div>
        <label className="label">Harga (Rp)</label>
        <input className="input" type="number" min="0" placeholder="cth: 8000" value={form.price} onChange={e => setForm(f => ({...f,price:e.target.value}))} />
        {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
      </div>
      <div>
        <label className="label">Stok Awal</label>
        <input className="input" type="number" min="0" placeholder="cth: 50" value={form.stock} onChange={e => setForm(f => ({...f,stock:e.target.value}))} />
        {errors.stock && <p className="text-red-500 text-xs mt-1">{errors.stock}</p>}
      </div>
      <div className="flex gap-3 pt-2 justify-end">
        <button type="button" className="btn-secondary" onClick={onClose}>Batal</button>
        <button type="submit" className="btn-primary">{initial ? 'Simpan' : 'Tambah Produk'}</button>
      </div>
    </form>
  );
}

// ── Stock Adjust Form ─────────────────────────────────────────────────────────

function StockAdjustForm({ product, onSave, onClose }) {
  const [delta, setDelta] = useState('');
  const [mode, setMode] = useState('add'); // 'add' | 'set'

  const handleSubmit = (e) => {
    e.preventDefault();
    const val = Number(delta);
    if (isNaN(val)) return;
    if (mode === 'set') {
      onSave(val - product.stock);
    } else {
      onSave(val);
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-600">Stok saat ini: <strong>{product.stock}</strong></p>
      <div>
        <label className="label">Mode</label>
        <select className="input" value={mode} onChange={e => setMode(e.target.value)}>
          <option value="add">Tambah stok</option>
          <option value="sub">Kurangi stok</option>
          <option value="set">Set stok langsung</option>
        </select>
      </div>
      <div>
        <label className="label">Jumlah</label>
        <input className="input" type="number" min="0" value={delta} onChange={e => setDelta(e.target.value)} />
      </div>
      <div className="flex gap-3 justify-end">
        <button type="button" className="btn-secondary" onClick={onClose}>Batal</button>
        <button type="submit" className="btn-primary">Simpan</button>
      </div>
    </form>
  );
}

// ── Package Form ──────────────────────────────────────────────────────────────

function PackageForm({ initial, onSave, onClose, products }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    price: initial?.price || '',
    durationMinutes: initial?.durationMinutes || '',
    items: initial?.items ? [...initial.items] : [],
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Nama paket wajib diisi';
    if (!form.price || isNaN(form.price) || Number(form.price) < 0) e.price = 'Harga harus angka non-negatif';
    if (!form.durationMinutes || isNaN(form.durationMinutes) || Number(form.durationMinutes) <= 0)
      e.durationMinutes = 'Durasi harus angka positif (menit)';
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave({ ...form, price: Number(form.price), durationMinutes: Number(form.durationMinutes) });
    onClose();
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { productId: products[0]?.id || '', qty: 1 }] }));
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i, field, val) => setForm(f => ({
    ...f,
    items: f.items.map((item, idx) => idx === i ? { ...item, [field]: val } : item),
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Nama Paket</label>
        <input className="input" placeholder="cth: Paket Main 2 Jam" value={form.name} onChange={e => setForm(f => ({...f,name:e.target.value}))} />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Harga Paket (Rp)</label>
          <input className="input" type="number" min="0" value={form.price} onChange={e => setForm(f => ({...f,price:e.target.value}))} />
          {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
        </div>
        <div>
          <label className="label">Durasi Termasuk (menit)</label>
          <input className="input" type="number" min="1" placeholder="cth: 120" value={form.durationMinutes} onChange={e => setForm(f => ({...f,durationMinutes:e.target.value}))} />
          {errors.durationMinutes && <p className="text-red-500 text-xs mt-1">{errors.durationMinutes}</p>}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Item F&B Termasuk</label>
          <button type="button" className="btn-secondary btn-xs flex items-center gap-1" onClick={addItem} disabled={products.length === 0}>
            <Plus size={12} /> Tambah Item
          </button>
        </div>
        {products.length === 0 && <p className="text-xs text-amber-600">Belum ada produk. Tambahkan produk terlebih dahulu.</p>}
        {form.items.length === 0 && products.length > 0 && (
          <p className="text-xs text-gray-400">Paket tanpa item F&B.</p>
        )}
        {form.items.map((item, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <select
              className="input flex-1"
              value={item.productId}
              onChange={e => updateItem(i, 'productId', e.target.value)}
            >
              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.category})</option>)}
            </select>
            <input
              className="input w-20"
              type="number"
              min="1"
              value={item.qty}
              onChange={e => updateItem(i, 'qty', Number(e.target.value))}
            />
            <button type="button" className="btn-danger btn-xs" onClick={() => removeItem(i)}>✕</button>
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-2 justify-end">
        <button type="button" className="btn-secondary" onClick={onClose}>Batal</button>
        <button type="submit" className="btn-primary">{initial ? 'Simpan' : 'Buat Paket'}</button>
      </div>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Products() {
  const { products, packages, addProduct, updateProduct, deleteProduct, adjustStock, addPackage, updatePackage, deletePackage } = useProductStore();
  const [tab, setTab] = useState('products');
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [expandedPkg, setExpandedPkg] = useState(null);

  const getProductName = (id) => products.find(p => p.id === id)?.name || id;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produk & Paket</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola produk F&B dan paket rental.</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> {tab === 'products' ? 'Tambah Produk' : 'Buat Paket'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'products' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setTab('products')}>
          Produk F&B ({products.length})
        </button>
        <button className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'packages' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setTab('packages')}>
          Paket ({packages.length})
        </button>
      </div>

      {/* Products table */}
      {tab === 'products' && (
        <>
          {products.length === 0 ? (
            <div className="card p-12 text-center border-dashed border-2 border-gray-200">
              <ShoppingBag size={48} className="mx-auto text-gray-300 mb-4" />
              <h2 className="text-lg font-semibold text-gray-600">Belum Ada Produk</h2>
              <p className="text-sm text-gray-400 mt-2 mb-6 max-w-sm mx-auto">
                Tambahkan produk makanan dan minuman untuk dijual saat sesi rental.
              </p>
              <button className="btn-primary inline-flex items-center gap-2" onClick={() => setShowAdd(true)}>
                <Plus size={16} /> Tambah Produk Pertama
              </button>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Nama</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Kategori</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Harga</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Stok</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${p.category === 'Food' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                          {p.category === 'Food' ? 'Makanan' : 'Minuman'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{formatRupiah(p.price)}</td>
                      <td className="px-4 py-3">
                        <span className={p.stock === 0 ? 'text-red-600 font-semibold' : p.stock <= 5 ? 'text-amber-600 font-medium' : 'text-gray-700'}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                          <button className="btn-secondary btn-xs" onClick={() => setAdjustTarget(p)}>Stok</button>
                          <button className="btn-secondary btn-xs flex items-center gap-1" onClick={() => setEditItem(p)}><Edit2 size={11}/> Edit</button>
                          <button className="btn-danger btn-xs flex items-center gap-1" onClick={() => setDeleteTarget({ type:'product', item:p })}><Trash2 size={11}/> Hapus</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Packages table */}
      {tab === 'packages' && (
        <>
          {packages.length === 0 ? (
            <div className="card p-12 text-center border-dashed border-2 border-gray-200">
              <Package size={48} className="mx-auto text-gray-300 mb-4" />
              <h2 className="text-lg font-semibold text-gray-600">Belum Ada Paket</h2>
              <p className="text-sm text-gray-400 mt-2 mb-6 max-w-sm mx-auto">
                Buat paket rental yang mencakup durasi bermain dan F&B pilihan dengan harga tetap.
              </p>
              <button className="btn-primary inline-flex items-center gap-2" onClick={() => setShowAdd(true)}>
                <Plus size={16} /> Buat Paket Pertama
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {packages.map(pkg => (
                <div key={pkg.id} className="card overflow-hidden">
                  <div className="flex items-center gap-4 px-5 py-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                        <span className="badge bg-purple-100 text-purple-700">
                          {pkg.durationMinutes >= 60 ? `${pkg.durationMinutes/60}j` : `${pkg.durationMinutes}m`} rental
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{formatRupiah(pkg.price)} · {pkg.items.length} item F&B</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="btn-secondary btn-xs flex items-center gap-1"
                        onClick={() => setExpandedPkg(expandedPkg === pkg.id ? null : pkg.id)}
                      >
                        {expandedPkg === pkg.id ? <ChevronUp size={12}/> : <ChevronDown size={12}/>} Detail
                      </button>
                      <button className="btn-secondary btn-xs flex items-center gap-1" onClick={() => setEditItem(pkg)}><Edit2 size={11}/> Edit</button>
                      <button className="btn-danger btn-xs flex items-center gap-1" onClick={() => setDeleteTarget({ type:'package', item:pkg })}><Trash2 size={11}/> Hapus</button>
                    </div>
                  </div>
                  {expandedPkg === pkg.id && (
                    <div className="border-t border-gray-100 px-5 py-3 bg-gray-50">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Item F&B Termasuk</p>
                      {pkg.items.length === 0 ? (
                        <p className="text-sm text-gray-400">Tidak ada item F&B</p>
                      ) : (
                        <ul className="space-y-1">
                          {pkg.items.map((item, i) => (
                            <li key={i} className="text-sm text-gray-700">
                              {item.qty}× {getProductName(item.productId)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add modal */}
      {showAdd && tab === 'products' && (
        <Modal title="Tambah Produk F&B" onClose={() => setShowAdd(false)}>
          <ProductForm onSave={data => addProduct(data)} onClose={() => setShowAdd(false)} />
        </Modal>
      )}
      {showAdd && tab === 'packages' && (
        <Modal title="Buat Paket Rental" onClose={() => setShowAdd(false)} size="lg">
          <PackageForm products={products} onSave={data => addPackage(data)} onClose={() => setShowAdd(false)} />
        </Modal>
      )}

      {/* Edit modals */}
      {editItem && products.includes(editItem) && (
        <Modal title={`Edit Produk: ${editItem.name}`} onClose={() => setEditItem(null)}>
          <ProductForm initial={editItem} onSave={data => updateProduct(editItem.id, data)} onClose={() => setEditItem(null)} />
        </Modal>
      )}
      {editItem && packages.includes(editItem) && (
        <Modal title={`Edit Paket: ${editItem.name}`} onClose={() => setEditItem(null)} size="lg">
          <PackageForm initial={editItem} products={products} onSave={data => updatePackage(editItem.id, data)} onClose={() => setEditItem(null)} />
        </Modal>
      )}

      {/* Stock adjust */}
      {adjustTarget && (
        <Modal title={`Sesuaikan Stok: ${adjustTarget.name}`} onClose={() => setAdjustTarget(null)} size="sm">
          <StockAdjustForm
            product={adjustTarget}
            onSave={(delta) => adjustStock(adjustTarget.id, delta)}
            onClose={() => setAdjustTarget(null)}
          />
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <ConfirmDialog
          title={`Hapus ${deleteTarget.type === 'product' ? 'Produk' : 'Paket'}`}
          message={`Hapus "${deleteTarget.item.name}"? Tindakan ini tidak dapat dibatalkan.`}
          confirmLabel="Hapus"
          onConfirm={() => {
            if (deleteTarget.type === 'product') deleteProduct(deleteTarget.item.id);
            else deletePackage(deleteTarget.item.id);
          }}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
