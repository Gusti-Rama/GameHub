# GameHub

**Sistem POS dan billing untuk rental PlayStation (PS) dan PC**

GameHub membantu operator mengelola sesi rental, penjualan makanan dan minuman, pembayaran, stok, serta promosi dalam satu aplikasi. Pemilik usaha dapat melihat ringkasan performa, laporan pendapatan, dan riwayat transaksi.

## Fitur

- **Dashboard** — ringkasan transaksi dan pendapatan, grafik, performa unit, produk terlaris, serta status unit. Dashboard dimulai dalam keadaan kosong dan menampilkan petunjuk saat belum ada unit atau transaksi.
- **Sesi rental dan kasir** — mulai sesi Open Bill, durasi tetap, atau paket; jeda dan lanjutkan timer; lihat tagihan berjalan; tambahkan F&B; dan lakukan checkout.
- **Pembayaran** — dukungan Cash, QRIS, Transfer Bank, dan E-wallet. Pembayaran dapat dibagi ke beberapa metode; jika jumlah yang dibayarkan melebihi tagihan, sistem menghitung kembalian.
- **Unit** — tambah, lihat, ubah, dan hapus unit PS atau PC beserta tarif per jam dan statusnya.
- **Produk dan paket** — kelola produk makanan/minuman, harga dan stok; buat paket berisi durasi rental dan item F&B.
- **Promosi** — diskon persentase atau nominal dengan cakupan seluruh transaksi, rental, F&B, makanan, atau minuman.
- **Laporan** — ringkasan pendapatan per bulan atau rentang tanggal khusus, grafik pendapatan harian dan tren bulanan, serta rincian penjualan.
- **Riwayat transaksi** — cari transaksi, lihat detail, edit catatan, catat refund penuh atau sebagian, dan tandai transaksi sebagai dibatalkan.

## Teknologi

- React 19
- Vite 8
- Tailwind CSS 3
- Zustand 5 untuk state dan persistensi lokal
- React Router 7
- Recharts 3
- Lucide React
- date-fns 4

## Menjalankan aplikasi

### Prasyarat

- Node.js `^20.19.0` atau `>=22.12.0`
- npm

### Instalasi dan mode pengembangan

Jalankan perintah dari folder proyek:

```bash
npm install
npm run dev
```

Buka alamat yang ditampilkan Vite di terminal (biasanya `http://localhost:5173`).

### Build dan pratinjau produksi

```bash
npm run build
npm run preview
```

### Pemeriksaan kode

```bash
npm run lint
```

## Aturan bisnis

### Tarif rental

Tarif rental bersifat linear dan dihitung berdasarkan durasi yang dapat ditagih:

```text
Biaya rental = tarif per jam × menit tertagih ÷ 60
```

Waktu sesi yang dijeda tidak dihitung. Sesi **Open Bill** ditagih berdasarkan waktu aktif. Sesi berdurasi tetap menggunakan hitung mundur; ketika waktunya habis, operator mendapat pemberitahuan visual dan audio, lalu dapat menambah durasi atau mengakhiri sesi. Waktu tambahan ditambahkan ke tagihan akhir.

Paket ditampilkan sebagai satu item dengan harga paket. Durasi dan F&B yang termasuk ditampilkan sebagai rincian tanpa harga per item. Jika item paket tidak tersedia, operator dapat menggantinya dengan item berharga sama atau lebih rendah. Harga paket tidak berubah.

### Diskon dan pembulatan

Diskon diterapkan pada item yang sesuai dengan cakupan promo. Setelah diskon, total pembayaran dibulatkan ke kelipatan Rp500 terdekat. Pada nilai tepat di tengah, pembulatan dilakukan ke atas.

Contoh:

- Rp10.010 menjadi Rp10.000
- Rp10.250 menjadi Rp10.500
- Rp10.260 menjadi Rp10.500

### Stok dan transaksi

Stok produk berkurang saat checkout berhasil, termasuk untuk item F&B yang termasuk dalam paket. Checkout tidak dapat diselesaikan jika stok produk yang diperlukan tidak mencukupi.

Refund penuh maupun sebagian dicatat pada transaksi. Transaksi yang dibatalkan tetap disimpan sebagai catatan dan dikecualikan dari laporan pendapatan. Fitur edit transaksi saat ini digunakan untuk mengubah catatan transaksi.

## Penyimpanan data

Data unit, produk, paket, sesi, promosi, dan transaksi disimpan di `localStorage` browser melalui middleware persist Zustand.

Konsekuensinya, data hanya tersedia pada browser dan perangkat tempat aplikasi digunakan. Data tidak tersinkron antarperangkat atau pengguna, dan dapat terhapus jika data browser dibersihkan. Aplikasi ini belum menggunakan backend atau pencadangan otomatis.

## Struktur proyek

```text
src/
├── components/       # Layout, modal, dan dialog konfirmasi
├── pages/            # Dashboard, Rentals, Units, Products, Promotions,
│                     # Reports, dan Transactions
├── stores/           # Penyimpanan state berbasis Zustand
├── utils/            # Format Rupiah, billing, diskon, dan validasi stok
├── App.jsx
└── main.jsx
public/               # Ikon dan aset publik
screenshots/          # Panduan dan tempat menyimpan screenshot aplikasi
```

## Screenshot

Folder [`screenshots`](screenshots/README.md) disiapkan untuk gambar aplikasi. Tambahkan screenshot di sana jika ingin menampilkan tampilan GameHub di README.
