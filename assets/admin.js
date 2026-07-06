const $ = s => document.querySelector(s);
document.getElementById('nav').innerHTML = navHTML('admin');
document.getElementById('foot').innerHTML = footerHTML();

let FILTER = 'pending';
let JOBS = [];

const DEMO_JOBS = [
  { id:'1', tracking_code:'ABC-D2X', requester_name:'Budi Santoso', contact:'0812xxxx1', file_name:'proposal-kegiatan.pdf', pages:5, copies:2, note:'Hitam putih ya', status:'pending', created_at:new Date(Date.now()-6*60e3).toISOString(), updated_at:new Date(Date.now()-6*60e3).toISOString() },
  { id:'2', tracking_code:'KLM-7YZ', requester_name:'Siti Aminah', contact:'0813xxxx2', file_name:'tugas-akhir.pdf', pages:12, copies:1, note:'', status:'pending', created_at:new Date(Date.now()-22*60e3).toISOString(), updated_at:new Date(Date.now()-22*60e3).toISOString() },
  { id:'3', tracking_code:'QRS-9AB', requester_name:'Andi Wijaya', contact:'0857xxxx3', file_name:'undangan.pdf', pages:1, copies:3, note:'', status:'printing', created_at:new Date(Date.now()-40*60e3).toISOString(), updated_at:new Date(Date.now()-2*60e3).toISOString() },
  { id:'4', tracking_code:'TUV-3CD', requester_name:'Rina Melati', contact:'0821xxxx4', file_name:'laporan.pdf', pages:8, copies:1, note:'', status:'done', created_at:new Date(Date.now()-3*3600e3).toISOString(), updated_at:new Date(Date.now()-2.5*3600e3).toISOString() },
  { id:'5', tracking_code:'WXY-6EF', requester_name:'Joko Prasetyo', contact:'0838xxxx5', file_name:'brosur-a3.pdf', pages:2, copies:1, note:'Kertas habis', status:'rejected', created_at:new Date(Date.now()-5*3600e3).toISOString(), updated_at:new Date(Date.now()-4.5*3600e3).toISOString() }
];

init();
async function init(){
  if (window.DEMO){ JOBS = DEMO_JOBS; showDash(); return; }
  const { data:{ session } } = await sb.auth.getSession();
  if (session) { showDash(); subscribe(); load(); }
  else showLogin();
  sb.auth.onAuthStateChange((_e, s)=>{ if(s){ showDash(); subscribe(); load(); } else showLogin(); });
}

function showLogin(){ $('#login').classList.remove('hide'); $('#dash').classList.add('hide'); }
function showDash(){ $('#login').classList.add('hide'); $('#dash').classList.remove('hide'); buildFilters(); render(); if(window.DEMO) $('#live').classList.add('hide'); }

$('#send-link') && $('#send-link').addEventListener('click', async ()=>{
  const email = $('#email').value.trim();
  if (!email) return toast('Isi email dulu', true);
  const { error } = await sb.auth.signInWithOtp({ email, options:{ emailRedirectTo: location.href } });
  $('#login-msg').textContent = error ? ('Gagal: '+error.message) : 'Tautan masuk sudah dikirim ke email Anda.';
});
$('#logout') && $('#logout').addEventListener('click', async ()=>{ if(sb) await sb.auth.signOut(); location.reload(); });

async function load(){
  const { data, error } = await sb.from('print_jobs').select('*').order('created_at',{ascending:false});
  if (error){ toast('Gagal memuat: '+error.message, true); return; }
  JOBS = data || []; render();
}
function subscribe(){
  sb.channel('jobs').on('postgres_changes',{event:'*',schema:'public',table:'print_jobs'},()=>load()).subscribe();
}

function buildFilters(){
  const defs = [['pending','Menunggu'],['printing','Diproses'],['done','Selesai'],['rejected','Ditolak'],['all','Semua']];
  $('#filters').innerHTML = defs.map(d=>`<button class="btn ${FILTER===d[0]?'':'ghost'} sm" data-f="${d[0]}">${d[1]}</button>`).join('');
  $('#filters').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{ FILTER=b.dataset.f; buildFilters(); render(); }));
}

function render(){
  const counts = { pending:0, printing:0, done:0, rejected:0 };
  JOBS.forEach(j=>{ if(j.status==='approved') counts.printing++; else if(counts[j.status]!==undefined) counts[j.status]++; });
  $('#stats').innerHTML = [
    ['Menunggu', counts.pending, 'orange'], ['Diproses', counts.printing, 'blue'],
    ['Selesai', counts.done, 'green'], ['Ditolak', counts.rejected, 'red']
  ].map(s=>`<div class="card pad" style="padding:18px"><div class="hint">${s[0]}</div><div style="font-size:30px;font-weight:700;margin-top:4px;color:var(--${s[2]})">${s[1]}</div></div>`).join('');

  let list = JOBS;
  if (FILTER==='printing') list = JOBS.filter(j=>j.status==='printing'||j.status==='approved');
  else if (FILTER!=='all') list = JOBS.filter(j=>j.status===FILTER);

  $('#empty').classList.toggle('hide', list.length>0);
  $('#rows').innerHTML = list.map(rowHTML).join('');
  list.forEach(j=>{
    const el = document.getElementById('r-'+j.id); if(!el) return;
    el.querySelectorAll('[data-act]').forEach(b=>b.addEventListener('click',()=>act(j, b.dataset.act)));
  });
}

function rowHTML(j){
  const st = STATUS[j.status] || STATUS.pending;
  let actions = '';
  if (j.status==='pending') actions = `<button class="btn green sm" data-act="approve">Izinkan</button> <button class="btn ghost sm" data-act="reject">Tolak</button>`;
  else if (j.status==='printing'||j.status==='approved') actions = `<button class="btn ghost sm" data-act="done">Tandai selesai</button>`;
  const dl = `<button class="btn ghost sm" data-act="file">Lihat PDF</button>`;
  return `<tr id="r-${j.id}">
    <td><span class="mono" style="font-weight:600">${esc(j.tracking_code)}</span></td>
    <td><b>${esc(j.requester_name)}</b><br><span class="hint">${esc(j.contact)}</span></td>
    <td>${esc(j.file_name)}${j.note?`<br><span class="hint">“${esc(j.note)}”</span>`:''}</td>
    <td class="hint">${j.pages} hlm · ${j.copies}×<br>A4</td>
    <td><span class="badge ${st.badge}"><span class="dot"></span>${st.label}</span></td>
    <td class="hint">${timeAgo(j.created_at)}</td>
    <td style="white-space:nowrap;text-align:right">${dl} ${actions}</td>
  </tr>`;
}

async function act(job, action){
  if (action==='file') return openFile(job);
  let patch = null;
  if (action==='approve') patch = { status:'approved' };
  if (action==='done')    patch = { status:'done' };
  if (action==='reject'){
    const reason = prompt('Alasan penolakan (opsional, tampil ke pemohon):','Stok kertas tidak tersedia');
    if (reason===null) return;
    patch = { status:'rejected', note: reason };
  }
  if (window.DEMO){ Object.assign(job, patch, {updated_at:new Date().toISOString()}); render(); toast('(Demo) '+STATUS[patch.status].label); return; }
  const { error } = await sb.from('print_jobs').update(patch).eq('id', job.id);
  if (error) toast('Gagal: '+error.message, true); else toast(STATUS[patch.status].label);
}

async function openFile(job){
  if (window.DEMO) return toast('(Demo) pratinjau PDF tidak tersedia');
  const { data, error } = await sb.storage.from(CFG.BUCKET).createSignedUrl(job.file_path, 120);
  if (error) return toast('Gagal buka file: '+error.message, true);
  window.open(data.signedUrl, '_blank');
}
