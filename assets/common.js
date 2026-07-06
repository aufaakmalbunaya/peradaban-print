// Shared helpers + Supabase client bootstrap
const CFG = window.APP_CONFIG || {};
window.DEMO = !CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY;
let sb = null;
if (!window.DEMO && window.supabase) {
  sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
}
window.sb = sb;

// A4 in points (1pt = 1/72"). A4 = 210x297mm = 595.28 x 841.89pt
const A4 = { w: 595.28, h: 841.89, tol: 8 };
window.isA4 = (w, h) => {
  const p = Math.abs(w - A4.w) <= A4.tol && Math.abs(h - A4.h) <= A4.tol; // portrait
  const l = Math.abs(w - A4.h) <= A4.tol && Math.abs(h - A4.w) <= A4.tol; // landscape
  return p || l;
};

window.fmtBytes = (b) => {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b/1024).toFixed(0) + ' KB';
  return (b/1048576).toFixed(1) + ' MB';
};

window.STATUS = {
  pending:  { label: 'Menunggu persetujuan', badge: 'orange' },
  approved: { label: 'Disetujui',            badge: 'blue'   },
  printing: { label: 'Sedang dicetak',       badge: 'blue'   },
  done:     { label: 'Selesai',              badge: 'green'  },
  rejected: { label: 'Ditolak',              badge: 'red'    },
  failed:   { label: 'Gagal cetak',          badge: 'red'    }
};

window.genCode = () => {
  const a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i=0;i<6;i++) s += a[Math.floor(Math.random()*a.length)];
  return s.slice(0,3) + '-' + s.slice(3);
};

window.toast = (msg, err) => {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id='toast'; t.className='toast'; document.body.appendChild(t); }
  t.textContent = msg; t.className = 'toast show' + (err ? ' err' : '');
  clearTimeout(window.__tt); window.__tt = setTimeout(()=>{ t.className='toast'+(err?' err':''); }, 3200);
};

window.esc = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
window.timeAgo = (iso) => {
  if (!iso) return '';
  const d = (Date.now() - new Date(iso).getTime())/1000;
  if (d < 60) return 'baru saja';
  if (d < 3600) return Math.floor(d/60) + ' mnt lalu';
  if (d < 86400) return Math.floor(d/3600) + ' jam lalu';
  return new Date(iso).toLocaleString('id-ID', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
};

// Shared markup ------------------------------------------------
window.navHTML = (active) => {
  const link = (href,label,key)=>`<a href="${href}"${active===key?' style=\"color:var(--text)\"':''}>${label}</a>`;
  return `<div class="nav"><div class="wrap row">
    <a class="brand" href="/"><span class="logo">${ICON.printer(16)}</span><span>${esc(CFG.BRAND||'Peradaban Print')}<small>Layanan cetak ${esc(CFG.PRINTER||'')}</small></span></a>
    <nav class="nav-links">
      ${link('/print','Cetak','print')}
      ${link('/status','Cek Status','status')}
      <a class="cta" href="/print">Mulai Cetak</a>
    </nav>
  </div></div>`;
};
window.footerHTML = () => `<footer class="footer"><div class="wrap">
  <strong>${esc(CFG.BRAND||'Peradaban Print')}</strong> — layanan cetak mandiri berbasis web.<br>
  Printer ${esc(CFG.PRINTER||'')} · ${esc(CFG.LOCATION||'')} · Semua dicetak di kertas A4.
  ${window.DEMO?' <span class=\"badge orange\" style=\"margin-left:8px\"><span class=\"dot\"></span>Mode Demo</span>':''}
</div></footer>`;

window.ICON = {
  printer:(s=20)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>`,
  file:(s=20)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  upload:(s=20)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
  check:(s=14)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  x:(s=14)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  clock:(s=14)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  paper:(s=20)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="13" y2="15"/></svg>`,
  lock:(s=20)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  bolt:(s=20)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`
};
