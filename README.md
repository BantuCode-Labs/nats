# NATS — Enterprise Resource Planning System (v1.0.0-alpha)

NATS adalah sistem ERP berbasis Next.js yang dirancang untuk menangani berbagai fungsi bisnis mulai dari akuntansi, inventaris, penjualan, pembelian, POS, hingga penggajian.

## Fitur Utama

- **Akuntansi**: Buku besar, jurnal, dan laporan keuangan otomatis.
- **Inventaris**: Manajemen stok, gudang, dan pergerakan barang.
- **Penjualan & Pembelian**: Alur kerja lengkap dari pesanan hingga faktur.
- **Point of Sale (POS)**: Antarmuka kasir yang responsif dan mudah digunakan.
- **Penggajian (Payroll)**: Manajemen struktur gaji dan slip gaji otomatis.
- **AI Integration**: Fitur cerdas untuk membantu analisis data bisnis.

## Screenshots

![Dashboard](https://via.placeholder.com/800x450?text=NATS+Dashboard+Screenshot)
_Tampilan Dashboard Utama_

![Accounting](https://via.placeholder.com/800x450?text=NATS+Accounting+Module)
_Modul Akuntansi & Laporan Keuangan_

![POS Interface](https://via.placeholder.com/800x450?text=NATS+POS+Interface)
_Antarmuka Point of Sale (POS)_

## Panduan Instalasi

Ikuti langkah-langkah di bawah ini untuk menjalankan NATS di lingkungan lokal Anda.

### Prerequisites

Sebelum memulai, pastikan sistem Anda memiliki komponen berikut:

- **Node.js**: Versi 20.x atau lebih baru.
- **NPM**: Biasanya disertakan dengan instalasi Node.js.
- **PostgreSQL**: Database utama sistem.
- **Git**: Untuk manajemen source code.

### Langkah-langkah Instalasi

#### 1. Clone Repository

```bash
git clone <repository-url>
cd nats
```

#### 2. Install Dependensi

```bash
npm install
```

#### 3. Konfigurasi Environment Variables

Salin file `.env.example` menjadi `.env` dan sesuaikan nilainya:

```bash
cp .env.example .env
```

Pastikan variabel `DATABASE_URL` sudah benar mengarah ke instance PostgreSQL Anda:
`DATABASE_URL="postgresql://user:password@localhost:5432/nats"`

#### 4. Persiapan Database

Buat database di PostgreSQL:

```bash
psql -U postgres -c "CREATE DATABASE nats;"
```

Lakukan migrasi database dan pembuatan schema:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

#### 5. Seed Data Awal

Isi database dengan data awal (roles, default users, dll):

```bash
npm run prisma db seed
```

#### 6. Jalankan Aplikasi

Jalankan server pengembangan:

```bash
npm run dev
```

Aplikasi dapat diakses di [http://localhost:3000](http://localhost:3000).

---

## Instalasi Menggunakan Docker (Opsional)

Jika Anda ingin menjalankan aplikasi menggunakan Docker Compose:

```bash
docker-compose up -d
```

Setelah kontainer berjalan, lakukan inisialisasi database:

```bash
docker-compose exec app npx prisma migrate deploy
docker-compose exec app npx prisma db seed
```

---

## Lisensi

Proyek ini dilisensikan di bawah [LICENSE](LICENSE).
