import { faker } from "@faker-js/faker/locale/id_ID";

export const SEED_COUNT = 1000;

export function getRandomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function getRandomItems<T>(items: T[], count: number): T[] {
  const shuffled = [...items].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export function getRandomDateInLastMonths(months: number = 6): Date {
  const now = new Date();
  const start = new Date();
  start.setMonth(now.getMonth() - months);
  return faker.date.between({ from: start, to: now });
}

export function getWeightedRandomStatus<T>(statuses: T[], weights: number[]): T {
  const totalWeight = weights.reduce((acc, w) => acc + w, 0);
  let random = Math.random() * totalWeight;
  for (let i = 0; i < weights.length; i++) {
    if (random < weights[i]) return statuses[i];
    random -= weights[i];
  }
  return statuses[statuses.length - 1];
}

export async function runInChunks<T>(
  items: T[],
  chunkSize: number,
  processor: (chunk: T[]) => Promise<void>,
) {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await processor(chunk);
    console.log(
      `  Diproses ${Math.min(i + chunkSize, items.length)} / ${items.length}`,
    );
  }
}

const sessionSuffix = faker.string.alphanumeric(4).toUpperCase();

export function generateUniqueSKU(prefix: string, index: number): string {
  return `${prefix}-${sessionSuffix}-${String(index).padStart(6, "0")}`;
}

/** Nominal rupiah bulat (tanpa desimal), kelipatan 100. */
export function randomIdrAmount(min: number, max: number): number {
  const raw = faker.number.int({ min, max });
  return Math.round(raw / 100) * 100;
}

const INCOME_DESCRIPTIONS = [
  "Penerimaan piutang usaha",
  "Setoran tunai penjualan harian",
  "Penerimaan transfer pelanggan",
  "Pendapatan jasa konsultasi",
  "Pendapatan sewa peralatan",
  "Pengembalian dana vendor",
  "Penerimaan uang muka pelanggan",
  "Pendapatan bunga bank",
];

const EXPENSE_DESCRIPTIONS = [
  "Pembayaran sewa kantor bulanan",
  "Tagihan listrik PLN",
  "Tagihan air PDAM",
  "Biaya internet dan telepon",
  "Pembelian ATK kantor",
  "Biaya transportasi operasional",
  "Biaya bahan bakar kendaraan",
  "Biaya pemasaran digital",
  "Premi asuransi kantor",
  "Biaya langganan perangkat lunak",
  "Biaya perjalanan dinas",
  "Biaya konsumsi rapat",
  "Biaya pemeliharaan gedung",
  "Biaya kebersihan kantor",
  "Biaya pengiriman barang",
  "Biaya parkir dan tol",
];

const JOURNAL_DESCRIPTIONS = [
  "Jurnal penjualan tunai",
  "Jurnal penjualan kredit",
  "Penerimaan pelunasan piutang",
  "Pembayaran utang usaha",
  "Pencatatan biaya operasional",
  "Penyesuaian saldo awal",
  "Jurnal akrual gaji karyawan",
  "Pembayaran gaji karyawan",
  "Pencatatan penyusutan aset",
  "Koreksi selisih kas",
  "Jurnal transfer antar rekening",
  "Pencatatan pendapatan jasa",
];

const RETURN_REASONS = [
  "Barang rusak saat pengiriman",
  "Spesifikasi tidak sesuai pesanan",
  "Kelebihan kuantitas kirim",
  "Produk cacat pabrik",
  "Salah kirim model barang",
  "Kualitas di bawah standar",
  "Barang kedaluwarsa",
  "Permintaan retur dari pelanggan",
];

const PRODUCT_ADJECTIVES = [
  "Premium",
  "Standar",
  "Ekonomis",
  "Pro",
  "Lite",
  "Plus",
  "Max",
  "Ultra",
];

const PRODUCT_NOUNS = [
  "Laptop Kantor",
  "Kursi Ergonomis",
  "Meja Kerja",
  "Printer Laser",
  "Monitor LED",
  "Keyboard Mekanik",
  "Mouse Nirkabel",
  "Headset Meeting",
  "Proyektor Portable",
  "Scanner Dokumen",
  "Kertas A4",
  "Tinta Printer",
  "Kabel HDMI",
  "UPS Backup",
  "Hard Disk Eksternal",
  "Flashdisk",
  "Rak Arsip",
  "Lemari Penyimpanan",
  "Mesin Fotokopi",
  "Telepon IP",
];

const COMPANY_SUFFIXES = [
  "Nusantara",
  "Mandiri",
  "Sejahtera",
  "Makmur",
  "Jaya",
  "Abadi",
  "Prima",
  "Sentosa",
  "Berkah",
  "Utama",
];

const COMPANY_PREFIXES = [
  "PT",
  "CV",
  "UD",
];

const BUSINESS_WORDS = [
  "Teknologi",
  "Dagang",
  "Distribusi",
  "Retail",
  "Solusi",
  "Industri",
  "Logistik",
  "Peralatan",
  "Elektronik",
  "Komputer",
  "Furnitur",
  "Alat Tulis",
  "Bahan Bangunan",
  "Makanan",
  "Minuman",
];

export function randomIncomeDescription(): string {
  return getRandomItem(INCOME_DESCRIPTIONS);
}

export function randomExpenseDescription(): string {
  return getRandomItem(EXPENSE_DESCRIPTIONS);
}

export function randomJournalDescription(): string {
  return getRandomItem(JOURNAL_DESCRIPTIONS);
}

export function randomReturnReason(): string {
  return getRandomItem(RETURN_REASONS);
}

export function randomProductName(): string {
  return `${getRandomItem(PRODUCT_ADJECTIVES)} ${getRandomItem(PRODUCT_NOUNS)}`;
}

export function randomProductDescription(): string {
  return `Produk ${faker.commerce.productMaterial().toLowerCase()} untuk kebutuhan operasional bisnis.`;
}

export function randomCompanyName(isVendor = false): string {
  const prefix = getRandomItem(COMPANY_PREFIXES);
  const word = getRandomItem(BUSINESS_WORDS);
  const suffix = getRandomItem(COMPANY_SUFFIXES);
  const extra = isVendor ? " Supplier" : "";
  return `${prefix} ${word} ${suffix}${extra}`;
}

export function randomIndonesianPhone(): string {
  const prefixes = ["0812", "0813", "0821", "0822", "0852", "0856", "0877", "0896"];
  const prefix = getRandomItem(prefixes);
  const number = faker.string.numeric(8);
  return `${prefix}${number}`;
}

export function randomIndonesianAddress(): string {
  const streets = [
    "Jl. Sudirman",
    "Jl. Gatot Subroto",
    "Jl. Thamrin",
    "Jl. Asia Afrika",
    "Jl. Diponegoro",
    "Jl. Ahmad Yani",
    "Jl. Merdeka",
    "Jl. Imam Bonjol",
    "Jl. Gajah Mada",
    "Jl. Hayam Wuruk",
  ];
  const cities = [
    "Jakarta Selatan",
    "Jakarta Pusat",
    "Jakarta Barat",
    "Bandung",
    "Surabaya",
    "Medan",
    "Semarang",
    "Yogyakarta",
    "Makassar",
    "Denpasar",
  ];
  const no = faker.number.int({ min: 1, max: 200 });
  return `${getRandomItem(streets)} No. ${no}, ${getRandomItem(cities)}`;
}

export { faker };
