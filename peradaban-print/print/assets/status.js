const $ = s => document.querySelector(s);
document.getElementById('nav').innerHTML = navHTML('status');
document.getElementById('foot').innerHTML = footerHTML();
const codeInput = $('#code');
codeInput.addEventListener('input', ()=>{ codeInput.value = codeInput.value.toUpperCase(); });
codeInput.addEventListener('keydown', e=>{ if(e.key==='Enter') lookup(); });
$('#look').addEventListener('click', lookup);

const pre = new URLSearchParams(location.search).get('code');
if (pre){ codeInput.value = pre.toUpperCase(); lookup(); }

const ORDER = ['pending','approved','printing','done'];

async function lookup(){
  const code = codeInput.value.trim().toUpperCase();
  if (!code) return toast('Masukkan kode dulu', true);
  $('#result').innerHTML = `<div class="card pad center"><span class="spin" style="border-color:var(--border);border-top-color:var(--blue)"></span></div>`;
  let job = null;
  try{
    if (window.DEMO){
      await new Promise(r=>setTimeout(r,500));
      job = { tracking_code:code, requester_name:'Contoh Pengguna', file_name:'dokumen-a4.pdf', pages:3, copies:1, status:'printing', note:'', created_at:new Date(Date.now()-3600e3).toISOString(), updated_at:new Date().toISOString() };
    } else {
      const { data, error } = await sb.rpc('get_job_status', { p_code: code });
      if (error) throw error;
      job = Array.isArray(data) ? data[0] : data;
    }
  }catch(e){ console.error(e); }
  render(job, code);
}

function render(job, code){
  if (!job){
    $('#result').innerHTML = `<div class="card pad center"><div style="font-size:15px"><b>Kode tidak ditemukan</b></div><p class="hint mt8">Periksa kembali kode <span class="mono">${esc(code)}</span> Anda.</p></div>`;
    return;
  }
  const st = STATUS[job.status] || STATUS.pending;
  const rejected = job.status==='rejected' || job.status==='failed';
  const doneIdx = ORDER.indexOf(job.status);
  const stepLabels = [['pending','Permintaan diterima'],['approved','Disetujui'],['printing','Sedang dicetak'],['done','Selesai']];
  let tl;
  if (rejected){
    tl = `<li class="done"><span class="node">${ICON.check(12)}</span><b>Permintaan diterima</b><div class="t">${timeAgo(job.created_at)}</div></li>
          <li class="reject"><span class="node">${ICON.x(12)}</span><b>${st.label}</b><div class="t">${job.note?esc(job.note):'Silakan hubungi pemilik untuk info lebih lanjut.'}</div></li>`;
  } else {
    tl = stepLabels.map((s,i)=>{
      const cls = i<doneIdx?'done':(i===doneIdx?'active':'');
      const ic = i<doneIdx?ICON.check(12):(i===doneIdx?ICON.clock(12):'');
      return `<li class="${cls}"><span class="node">${ic}</span><b>${s[1]}</b>${i===doneIdx?`<div class="t">${timeAgo(job.updated_at)}</div>`:''}</li>`;
    }).join('');
  }
  $('#result').innerHTML = `<div class="card pad">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
      <div><span class="code-pill" style="font-size:16px;padding:6px 12px">${esc(job.tracking_code)}</span></div>
      <span class="badge ${st.badge}"><span class="dot"></span>${st.label}</span>
    </div>
    <div class="filechip mt24">
      <span class="fi">${ICON.file(20)}</span>
      <div class="meta"><b>${esc(job.file_name)}</b><span class="hint">${job.pages} halaman · ${job.copies} rangkap · A4</span></div>
    </div>
    <hr style="border:none;border-top:1px solid var(--border);margin:24px 0">
    <ul class="tl">${tl}</ul>
  </div>`;
}
