#!/usr/bin/env python3
"""
Peradaban Print — Raspberry Pi print worker

Alur:
  1. Polling Supabase tiap POLL_SECONDS untuk job berstatus 'approved'.
  2. Klaim job (set 'printing') agar tidak dobel.
  3. Unduh PDF via signed URL (service_role bypass RLS).
  4. Paksa semua halaman ke ukuran A4 (Ghostscript) sebelum cetak.
  5. Cetak ke Epson L300 lewat CUPS (lp), lalu set 'done' / 'failed'.

Jalankan sebagai service systemd (lihat peradaban-print.service).
Hanya butuh koneksi internet keluar — tidak perlu IP publik / port forwarding.
"""
import os, sys, time, tempfile, subprocess, urllib.request, json

SUPABASE_URL   = os.environ["SUPABASE_URL"].rstrip("/")
SERVICE_KEY    = os.environ["SUPABASE_SERVICE_ROLE_KEY"]  # RAHASIA — simpan hanya di Pi
BUCKET         = os.environ.get("BUCKET", "print-files")
PRINTER        = os.environ.get("CUPS_PRINTER", "EpsonL300")
POLL_SECONDS   = int(os.environ.get("POLL_SECONDS", "5"))
A4_TOL_PT      = 8.0
A4_W, A4_H     = 595.28, 841.89

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}

def api(method, path, body=None, extra=None):
    url = f"{SUPABASE_URL}{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    for k, v in {**HEADERS, **(extra or {})}.items():
        req.add_header(k, v)
    with urllib.request.urlopen(req, timeout=30) as r:
        raw = r.read().decode()
        return json.loads(raw) if raw else None

def claim_next():
    """Ambil satu job 'approved' lalu segera set 'printing' (atomic-ish)."""
    rows = api("GET", "/rest/v1/print_jobs?status=eq.approved&order=created_at.asc&limit=1")
    if not rows:
        return None
    job = rows[0]
    updated = api(
        "PATCH",
        f"/rest/v1/print_jobs?id=eq.{job['id']}&status=eq.approved",
        {"status": "printing"},
        extra={"Prefer": "return=representation"},
    )
    return updated[0] if updated else None  # None = sudah diklaim proses lain

def set_status(job_id, status, note=None):
    body = {"status": status}
    if note is not None:
        body["note"] = note
    api("PATCH", f"/rest/v1/print_jobs?id=eq.{job_id}", body)

def signed_url(path):
    res = api("POST", f"/storage/v1/object/sign/{BUCKET}/{path}", {"expiresIn": 120})
    return SUPABASE_URL + "/storage/v1" + res["signedURL"]

def download(url, dest):
    with urllib.request.urlopen(url, timeout=60) as r, open(dest, "wb") as f:
        f.write(r.read())

def force_a4(src, dst):
    """Paksa semua halaman ke ukuran A4 (skala fit-to-page) via Ghostscript."""
    cmd = ["gs", "-q", "-dBATCH", "-dNOPAUSE", "-dSAFER",
           "-sDEVICE=pdfwrite", "-sPAPERSIZE=a4",
           "-dFIXEDMEDIA", "-dPDFFitPage", "-dCompatibilityLevel=1.4",
           f"-sOutputFile={dst}", src]
    res = subprocess.run(cmd, capture_output=True, text=True)
    return res.returncode == 0 and os.path.exists(dst)

def print_pdf(path, copies):
    cmd = ["lp", "-d", PRINTER, "-n", str(copies),
           "-o", "media=A4", "-o", "fit-to-page", "-o", "sides=one-sided", path]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(res.stderr.strip() or "lp gagal")
    return res.stdout.strip()

def handle(job):
    print(f"[job] {job['tracking_code']} — {job['file_name']} ({job['copies']}x)")
    with tempfile.TemporaryDirectory() as tmp:
        pdf = os.path.join(tmp, "doc.pdf")
        download(signed_url(job["file_path"]), pdf)
        target = os.path.join(tmp, "a4.pdf")
        if force_a4(pdf, target):
            print("  → dokumen dinormalisasi ke A4")
        else:
            target = pdf  # fallback: andalkan fit-to-page dari CUPS
            print("  ! normalisasi gagal, pakai fit-to-page")
        try:
            print_pdf(target, int(job.get("copies", 1)))
            set_status(job["id"], "done")
            print("  ✓ selesai dicetak")
        except Exception as e:
            set_status(job["id"], "failed", f"Gagal cetak: {e}")
            print(f"  ✗ gagal: {e}")

def main():
    print(f"Peradaban Print worker aktif — printer '{PRINTER}', polling {POLL_SECONDS}s")
    while True:
        try:
            job = claim_next()
            if job:
                handle(job)
                continue  # langsung cek lagi kalau masih ada antrean
        except Exception as e:
            print(f"[error] {e}", file=sys.stderr)
        time.sleep(POLL_SECONDS)

if __name__ == "__main__":
    main()
