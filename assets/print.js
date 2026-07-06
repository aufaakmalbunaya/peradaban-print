const $ = s => document.querySelector(s);
document.getElementById('nav').innerHTML = navHTML('print');
document.getElementById('foot').innerHTML = footerHTML();
$('#drop-ico').innerHTML = ICON.upload(24);
$('#ok-ico').innerHTML = ICON.check(30);
$('#lim-mb').textContent = CFG.MAX_MB; $('#lim-pg').textContent = CFG.MAX_PAGES;
$('#cp').innerHTML = Array.from({length:CFG.MAX_COPIES},(_,i)=>`<option value="${i+1}">${i+1} rangkap</option>`).join('');

let current = null; // {file, pages}

const drop = $('#drop'), fileInput = $('#file');
drop.addEventListener('click', ()=>fileInput.click());
['dragover','dragenter'].forEach(e=>drop.addEventListener(e, ev=>{ev.preventDefault();drop.classList.add('drag');}));
['dragleave','drop'].forEach(e=>drop.addEventListener(e, ev=>{ev.preventDefault();drop.classList.remove('drag');}));
drop.addEventListener('drop', ev=>{ if(ev.dataTransfer.files[0]) handleFile(ev.dataTransfer.files[0]); });
fileInput.addEventListener('change', ()=>{ if(fileInput.files[0]) handleFile(fileInput.files[0]); });

async function handleFile(file){
  current = null; $('#send').disabled = true;
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')){
    return showFile(file, {ok:false, msg:'Bukan file PDF. Hanya menerima .pdf'});
  }
  if (file.size > CFG.MAX_MB*1048576){
    return showFile(file, {ok:false, msg:`Ukuran melebihi ${CFG.MAX_MB}MB (${fmtBytes(file.size)})`});
  }
  showFile(file, {ok:null, msg:'Memeriksa ukuran halaman…'});
  try{
    const buf = await file.arrayBuffer();
    const pdf = await PDFLib.PDFDocument.load(buf, {ignoreEncryption:true});
    const pages = pdf.getPages();
    if (pages.length > CFG.MAX_PAGES) return showFile(file,{ok:false,msg:`${pages.length} halaman melebihi batas ${CFG.MAX_PAGES}`});
    const nonA4 = pages.filter(p=>{ const {width,height}=p.getSize(); return !isA4(width,height); }).length;
    current = {file, pages: pages.length, scale: nonA4>0};
    showFile(file,{ok:true, pages:pages.length, scale:nonA4>0, nonA4});
    $('#send').disabled = false;
  }catch(e){
    showFile(file,{ok:false,msg:'Gagal membaca PDF. File mungkin rusak atau terenkripsi.'});
  }
}

function showFile(file, st){
  const box = $('#filebox'); box.classList.remove('hide');
  drop.classList.toggle('has', st.ok===true);
  let right = '';
  if (st.ok===true && st.scale) right = `<span class="badge orange"><span class="dot"></span>→ A4 · ${st.pages} hlm</span>`;
  else if (st.ok===true) right = `<span class="badge green"><span class="dot"></span>A4 · ${st.pages} hlm</span>`;
  else if (st.ok===false) right = `<span class="badge red"><span class="dot"></span>Ditolak</span>`;
  else right = `<span class="badge gray"><span class="dot"></span>Memeriksa</span>`;
  const info = st.scale ? `${st.nonA4} halaman bukan A4 — akan otomatis disesuaikan ke ukuran A4 saat dicetak.` : st.msg;
  box.innerHTML = `<div class="card pad" style="padding:16px">
    <div class="filechip">
      <span class="fi">${ICON.file(20)}</span>
      <div class="meta"><b>${esc(file.name)}</b><span class="hint">${fmtBytes(file.size)}</span></div>
      ${right}
    </div>
    ${info?`<p class="hint mt8" style="color:${st.ok===false?'var(--red)':'var(--text-2)'}">${esc(info)}</p>`:''}
    <button class="btn ghost sm mt16" onclick="resetFile()">Ganti file</button>
  </div>`;
}
window.resetFile = () => { current=null; fileInput.value=''; $('#filebox').classList.add('hide'); drop.classList.remove('has'); $('#send').disabled=true; };

$('#send').addEventListener('click', submit);
async function submit(){
  const name = $('#nm').value.trim(), wa = $('#wa').value.trim();
  if (!current) return toast('Pilih file PDF A4 dulu', true);
  if (!name) return toast('Isi nama Anda', true);
  if (!wa)   return toast('Isi nomor WhatsApp', true);
  const btn = $('#send'); btn.disabled=true; btn.innerHTML='<span class="spin"></span> Mengirim…';
  const code = genCode();
  const copies = parseInt($('#cp').value,10);
  const note = $('#nt').value.trim();

  try{
    if (window.DEMO){
      await new Promise(r=>setTimeout(r,900));
      return success(code);
    }
    const id = crypto.randomUUID();
    const path = `${id}/${current.file.name}`;
    const up = await sb.storage.from(CFG.BUCKET).upload(path, current.file, {contentType:'application/pdf', upsert:false});
    if (up.error) throw up.error;
    const ins = await sb.from('print_jobs').insert({
      id, tracking_code: code, requester_name: name, contact: wa,
      file_name: current.file.name, file_path: path, pages: current.pages,
      copies, note, status: 'pending'
    });
    if (ins.error) throw ins.error;
    success(code);
  }catch(e){
    console.error(e);
    toast('Gagal mengirim: ' + (e.message||'coba lagi'), true);
    btn.disabled=false; btn.textContent='Kirim permintaan cetak';
  }
}
function success(code){
  $('#form-view').classList.add('hide');
  $('#ok-view').classList.remove('hide');
  $('#ok-code').textContent = code;
  $('#ok-track').href = '/status?code=' + encodeURIComponent(code);
  window.scrollTo({top:0,behavior:'smooth'});
}
