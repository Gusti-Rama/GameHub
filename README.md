# GameHub — POS & Billing untuk Rental PS/PC

Aplikasi point-of-sale dan manajemen billing berbasis web untuk bisnis rental PlayStation (PS) dan PC gaming. Dibangun dengan React + Vite + Tailwind CSS + Zustand, tanpa backend atau layanan eksternal berbayar.

---

## Cara Menjalankan

### Prasyarat
- Node.js ≥ 18
- npm ≥ 9

### Instalasi & Jalankan

```bash
cd gamehub
npm install
npm run dev
```

Buka browser di `http://localhost:5173`.

### Build untuk Produksi

```bash
npm run build
npm run preview
```

---

## Fitur Utama

| Modul | Fitur |
|---|---|
| **Dashboard** | Statistik hari ini, pendapatan bulan ini, grafik 14 hari, grid status unit, F&B terlaris, unit terbaik |
| **Rental & POS** | Sesi open bill, durasi tetap, paket; jeda/lanjut; timer countdown; keranjang F&B; checkout split payment |
| **Unit** | CRUD unit PS/PC dengan tarif per jam; proteksi hapus jika ada sesi aktif |
| **Produk & Paket** | CRUD produk F&B dengan stok; CRUD paket dengan item termasuk |
| **Promosi** | Diskon persentase/nominal dengan scope (semua/rental/F&B/makanan/minuman) |
| **Laporan** | Filter per bulan / rentang tanggal, grafik harian, grafik tren 12 bulan, breakdown per kategori |
| **Transaksi** | Riwayat dengan pencarian; refund penuh/sebagian; void transaksi; edit catatan |

---

## Penjelasan Teknis

### Billing

#### Open Bill
Waktu tertagih dihitung dari segmen aktif (non-jeda):
```
Biaya = tarif_per_jam × total_menit_aktif / 60
```
Waktu jeda **tidak dihitung** ke tagihan.

#### Durasi Tetap
Operator memilih durasi dalam jam. Sistem memulai countdown. Saat habis:
- Notifikasi visual + audio (Web Audio API)
- Unit tetap ditandai "terpakai"
- Operator dapat menambah jam atau mengakhiri sesi
- Tambahan jam ditagih terpisah; pembayaran tidak diperlukan sebelum perpanjangan

#### Paket
Paket memiliki harga tetap, durasi termasuk, dan item F&B termasuk. Paket muncul sebagai satu baris tagihan (tidak ada harga individual per item). Durasi paket digunakan sebagai countdown.

### Pembulatan
Setelah diskon, total dibulatkan ke kelipatan Rp500 terdekat:
```
sisa = total % 500
jika sisa < 250 → bulatkan ke bawah (total - sisa)
jika sisa ≥ 250 → bulatkan ke atas (total - sisa + 500)
```

### Stok
- Stok dikurangi saat transaksi berhasil disimpan (setelah konfirmasi checkout)
- Checkout diblokir jika stok tidak mencukupi, dengan pesan yang jelas
- Paket dengan item F&B mengurangi stok item tersebut

### Refund & Void
- **Refund penuh/sebagian**: mencatat jumlah, metode, dan catatan. Pendapatan bersih = total - refund
- **Void**: transaksi ditandai "dibatalkan" dan dikecualikan dari semua laporan
- Transaksi **tidak pernah dihapus secara permanen**

### Split Payment
Operator dapat menambahkan beberapa metode pembayaran (Cash, QRIS, Transfer Bank, E-wallet). Total yang dimasukkan harus ≥ total bayar sebelum checkout bisa disimpan.

### Format Uang
Semua nilai dalam IDR. Format: `Rp15.000` menggunakan `toLocaleString('id-ID')`.

---

## Persistensi Data

Semua data (unit, produk, paket, sesi, transaksi, promosi) disimpan di **localStorage** browser menggunakan Zustand `persist` middleware.

**Keterbatasan localStorage:**
- Data hanya tersimpan di browser & perangkat yang sama
- Kapasitas terbatas sekitar 5–10 MB (cukup untuk ribuan transaksi)
- Data hilang jika pengguna membersihkan data browser / private mode
- Tidak ada sinkronisasi antar perangkat
- Tidak ada backup otomatis

**Untuk penggunaan produksi**, pertimbangkan menambahkan backend (Node.js + SQLite/PostgreSQL) dan mengganti store Zustand dengan panggilan API.

---

## Struktur Proyek

```
gamehub/
├── src/
│   ├── components/
│   │   ├── Layout.jsx        # Sidebar + navigasi utama
│   │   ├── Modal.jsx         # Komponen modal reusable
│   │   └── ConfirmDialog.jsx # Dialog konfirmasi
│   ├── pages/
│   │   ├── Dashboard.jsx     # Halaman utama & statistik
│   │   ├── Rentals.jsx       # POS & manajemen sesi
│   │   ├── Units.jsx         # CRUD unit PS/PC
│   │   ├── Products.jsx      # CRUD produk & paket
│   │   ├── Promotions.jsx    # CRUD promosi
│   │   ├── Reports.jsx       # Laporan & grafik
│   │   └── Transactions.jsx  # Riwayat transaksi
│   ├── stores/
│   │   ├── unitStore.js      # State unit
│   │   ├── productStore.js   # State produk & paket
│   │   ├── sessionStore.js   # State sesi rental
│   │   ├── transactionStore.js # State transaksi
│   │   └── promoStore.js     # State promosi
│   ├── utils/
│   │   └── index.js          # Format, kalkulasi, validasi
│   └── App.jsx
├── tailwind.config.js
└── package.json
```

---

## Stack Teknologi

| Library | Versi | Fungsi |
|---|---|---|
| React | 19 | UI framework |
| Vite | 8 | Build tool |
| Tailwind CSS | 3 | Styling |
| Zustand | 5 | State management + localStorage |
| React Router DOM | 7 | Routing |
| Recharts | 2 | Grafik & chart |
| Lucide React | latest | Ikon |
| date-fns | latest | Utilitas tanggal |
