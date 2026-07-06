// ============================================================
//  KONFIGURASI  — isi dengan kredensial Supabase Anda
//  (nilai ini AMAN untuk publik: hanya URL + anon key)
// ============================================================
window.APP_CONFIG = {
  // Dari Supabase > Project Settings > API
  SUPABASE_URL: "https://ykkngtxsqmbzaswylywv.supabase.co",              // contoh: https://xxxxx.supabase.co
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlra25ndHhzcW1iemFzd3lseXd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyOTAwMDcsImV4cCI6MjA5ODg2NjAwN30.No1q9ljdDgzqaJdo_Ss7DiogvrGrJmL1Jj7uCL3kfFM",        // anon public key

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
