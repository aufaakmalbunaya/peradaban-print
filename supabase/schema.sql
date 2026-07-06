-- ============================================================
--  Peradaban Print — skema Supabase
--  Jalankan di Supabase > SQL Editor (satu kali)
-- ============================================================

-- 1) Tabel antrean cetak ------------------------------------
create table if not exists public.print_jobs (
  id             uuid primary key default gen_random_uuid(),
  tracking_code  text not null unique,
  requester_name text not null,
  contact        text not null,
  file_name      text not null,
  file_path      text not null,
  pages          int  not null default 1,
  copies         int  not null default 1 check (copies between 1 and 20),
  color_mode     text not null default 'mono' check (color_mode in ('mono','color')),
  note           text default '',
  status         text not null default 'pending'
                 check (status in ('pending','approved','printing','done','rejected','failed')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists print_jobs_status_idx on public.print_jobs(status);
create index if not exists print_jobs_code_idx   on public.print_jobs(tracking_code);
-- Jika tabel sudah pernah dibuat tanpa kolom warna, jalankan sekali:
--   alter table public.print_jobs add column if not exists color_mode text not null default 'mono' check (color_mode in ('mono','color'));

-- auto-update updated_at
create or replace function public.touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;
drop trigger if exists trg_touch on public.print_jobs;
create trigger trg_touch before update on public.print_jobs
  for each row execute function public.touch_updated_at();

-- 2) Row Level Security -------------------------------------
alter table public.print_jobs enable row level security;

-- Publik (anon) boleh MEMBUAT permintaan cetak
drop policy if exists anon_insert on public.print_jobs;
create policy anon_insert on public.print_jobs
  for insert to anon with check (
    status = 'pending' and copies between 1 and 20
  );

-- Admin (email pemilik) boleh baca & ubah semua.
-- GANTI email di bawah dengan email pemilik Anda.
drop policy if exists admin_all on public.print_jobs;
create policy admin_all on public.print_jobs
  for all to authenticated
  using  ( auth.jwt() ->> 'email' = 'peradaban06@belibuku.link' )
  with check ( auth.jwt() ->> 'email' = 'peradaban06@belibuku.link' );
-- (Catatan: Raspberry Pi memakai service_role key yang otomatis bypass RLS.)

-- 3) RPC status publik --------------------------------------
-- Pemohon melacak lewat kode tanpa bisa membaca data orang lain.
create or replace function public.get_job_status(p_code text)
returns table (
  tracking_code text, requester_name text, file_name text,
  pages int, copies int, color_mode text, status text, note text,
  created_at timestamptz, updated_at timestamptz
) language sql security definer set search_path = public as $$
  select tracking_code, requester_name, file_name, pages, copies, color_mode, status, note, created_at, updated_at
  from public.print_jobs where tracking_code = upper(p_code) limit 1;
$$;
grant execute on function public.get_job_status(text) to anon, authenticated;

-- 4) Storage bucket -----------------------------------------
insert into storage.buckets (id, name, public)
values ('print-files','print-files', false)
on conflict (id) do nothing;

-- Publik boleh UPLOAD (insert) ke bucket, tapi tidak membaca/menghapus.
drop policy if exists anon_upload on storage.objects;
create policy anon_upload on storage.objects
  for insert to anon with check ( bucket_id = 'print-files' );

-- Admin boleh baca file untuk pratinjau.
drop policy if exists admin_read_files on storage.objects;
create policy admin_read_files on storage.objects
  for select to authenticated using (
    bucket_id = 'print-files' and auth.jwt() ->> 'email' = 'peradaban06@belibuku.link'
  );
-- (Pi mengunduh file via service_role → bypass RLS.)
