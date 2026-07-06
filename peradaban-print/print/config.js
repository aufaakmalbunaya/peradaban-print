// ============================================================
//  KONFIGURASI  — isi dengan kredensial Supabase Anda
//  (nilai ini AMAN untuk publik: hanya URL + anon key)
// ============================================================
window.APP_CONFIG = {
  // Dari Supabase > Project Settings > API
  SUPABASE_URL: "",              // contoh: https://xxxxx.supabase.co
  SUPABASE_ANON_KEY: "",        // anon public key

  // Nama bucket Storage (buat sesuai schema.sql)
  BUCKET: "print-files",

  // Batasan cetak
  MAX_MB: 20,                    // ukuran file maksimum
  MAX_PAGES: 30,                 // jumlah halaman maksimum
  MAX_COPIES: 5,                 // rangkap maksimum

  // Info tampilan
  BRAND: "Peradaban Moyudan",
  PRINTER: "Epson L300",
  LOCATION: "Moyudan, Sleman"
};
