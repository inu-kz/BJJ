'use strict';
/* ================= BJJフロー v4 ================= */
const APP_VERSION = 5;
window.__ver_app = APP_VERSION;

/* ---------- 小道具 ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const fmtT = t => { t = Math.max(0, Math.floor(t || 0)); const h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = t % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0'); };
const parseTime = str => {
  str = String(str ?? '').trim(); if (!str) return null;
  if (/^\d+$/.test(str)) return +str;
  const p = str.split(':').map(Number); if (p.some(x => !isFinite(x)) || p.length > 3) return null;
  return p.reduce((a, x) => a * 60 + x, 0);
};
const COLORS = [['#4f8cff', 'ポジション'], ['#3ecf8e', 'スイープ/パス'], ['#ff5d5d', 'サブミッション'], ['#f5a524', 'エスケープ'], ['#b07cff', 'その他']];
const MASTERY = ['未習得', '練習中', '使える'];
const NW = 140;
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.style.display = 'block'; clearTimeout(toastT); toastT = setTimeout(() => t.style.display = 'none', 2800); }
function pickFile(accept, multiple) {
  return new Promise(res => {
    const inp = $('#fileAny'); inp.accept = accept || ''; inp.multiple = !!multiple; inp.value = '';
    inp.onchange = () => { const fs = [...inp.files]; inp.value = ''; res(fs); };
    inp.click();
  });
}
async function shareOrDownload(file) {
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; } }
  catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}
const safeUrl = u => /^https?:\/\//i.test(String(u || '')) ? String(u) : '#';
const dateStr = () => new Date().toISOString().slice(0, 10);

/* ---------- 端末内保存 (IndexedDB) ---------- */
const DB = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('bjjflow', 1);
      r.onupgradeneeded = () => { r.result.createObjectStore('kv'); r.result.createObjectStore('videos'); };
      r.onsuccess = () => { this.db = r.result; res(); };
      r.onerror = () => rej(r.error);
    });
  },
  tx(store, mode, fn) {
    return new Promise((res, rej) => {
      const t = this.db.transaction(store, mode);
      const req = fn(t.objectStore(store));
      t.oncomplete = () => res(req && req.result);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    });
  },
  get: (s, k) => DB.tx(s, 'readonly', o => o.get(k)),
  put: (s, k, v) => DB.tx(s, 'readwrite', o => o.put(v, k)),
  del: (s, k) => DB.tx(s, 'readwrite', o => o.delete(k)),
  has: async (s, k) => (await DB.tx(s, 'readonly', o => o.getKey(k))) !== undefined,
  keys: s => new Promise((res, rej) => { const r = DB.db.transaction(s, 'readonly').objectStore(s).getAllKeys(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }),
};
async function putBlob(blob) { const k = uid(); await DB.put('videos', k, blob); return k; }
const urlCache = new Map();
async function blobUrl(key) {
  if (urlCache.has(key)) return urlCache.get(key);
  const b = await DB.get('videos', key); if (!b) return null;
  const u = URL.createObjectURL(b); urlCache.set(key, u); return u;
}

/* ---------- データ ---------- */
let state = { schema: 2, boards: [] };
let settings = {};
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => DB.put('kv', 'state', JSON.parse(JSON.stringify(state))).catch(e => alert('保存に失敗しました: ' + e)), 250);
}
async function saveNow() { clearTimeout(saveTimer); await DB.put('kv', 'state', JSON.parse(JSON.stringify(state))); }
async function saveSettings() { await DB.put('kv', 'settings', settings); }

function normalize(st) {
  if (!st || !Array.isArray(st.boards)) return { schema: 2, boards: [] };
  st.schema = 2;
  st.boards.forEach(b => {
    b.id = b.id || uid(); b.name = b.name || '無題'; b.folder = b.folder || '';
    b.nodes = Array.isArray(b.nodes) ? b.nodes : []; b.edges = Array.isArray(b.edges) ? b.edges : [];
    b.view = b.view && isFinite(b.view.k) && isFinite(b.view.x) && isFinite(b.view.y) ? b.view : { x: 20, y: 20, k: 1 };
    b.locked = !!b.locked; b.snap = !!b.snap; b.hl = !!b.hl;
    b.nodes.forEach(n => {
      n.id = n.id || uid(); n.x = +n.x || 0; n.y = +n.y || 0; n.title = n.title || ''; n.memo = n.memo || ''; n.en = n.en || '';
      n.color = n.color || COLORS[0][0];
      n.links = Array.isArray(n.links) ? n.links : []; n.marks = Array.isArray(n.marks) ? n.marks : [];
      n.photos = Array.isArray(n.photos) ? n.photos : []; n.videos = Array.isArray(n.videos) ? n.videos : [];
      if (n.videoId) n.videos.push({ id: uid(), kind: 'copy', vid: n.videoId, name: n.videoName || '動画' });
      if (n.videoRef) n.videos.push({ id: uid(), kind: 'ref', name: n.videoRef });
      delete n.videoId; delete n.videoName; delete n.videoRef;
      n.videos.forEach(v => { v.id = v.id || uid(); });
      n.mastery = [0, 1, 2].includes(n.mastery) ? n.mastery : 0; n.shape = n.shape === 'pill' ? 'pill' : 'rect';
      n.boardLink = n.boardLink || null; n.lastPracticed = n.lastPracticed || null; n.practiceCount = +n.practiceCount || 0;
      n.quiz = n.quiz && typeof n.quiz === 'object' ? { ok: +n.quiz.ok || 0, ng: +n.quiz.ng || 0 } : { ok: 0, ng: 0 };
      n.img = n.img || null; n.imgCredit = n.imgCredit || null; n.thumb = n.thumb || null;
    });
    b.edges.forEach(e => { e.id = e.id || uid(); e.label = e.label || ''; e.dash = !!e.dash; });
    b.edges = b.edges.filter(e => b.nodes.some(n => n.id === e.from) && b.nodes.some(n => n.id === e.to));
  });
  return st;
}

/* ---------- 保存してある画像・動画の参照 / 掃除 ---------- */
function collectRefs(st, set) {
  ((st && st.boards) || []).forEach(b => (b.nodes || []).forEach(n => {
    if (n.videoId) set.add(n.videoId);
    (n.videos || []).forEach(v => v.vid && set.add(v.vid));
    if (n.thumb) set.add(n.thumb); if (n.img) set.add(n.img);
    (n.photos || []).forEach(p => set.add(p));
  }));
}
async function gc() {
  const refs = new Set(); collectRefs(state, refs);
  const bk = (await DB.get('kv', 'backups')) || []; bk.forEach(b => collectRefs(b.data, refs));
  const keys = await DB.keys('videos'); let n = 0;
  for (const k of keys) if (!refs.has(k)) { await DB.del('videos', k); n++; }
  return n;
}

/* ---------- 自動バックアップ（構成とメモのみ） ---------- */
const MAX_BACKUPS = 8;
async function snapshot(label) {
  if (!state.boards || !state.boards.length) return;
  const list = (await DB.get('kv', 'backups')) || [];
  list.unshift({ t: new Date().toISOString(), label, data: JSON.parse(JSON.stringify(state)) });
  while (list.length > MAX_BACKUPS) list.pop();
  await DB.put('kv', 'backups', list);
}
async function autoBackup() {
  const meta = (await DB.get('kv', 'meta')) || {};
  const list = (await DB.get('kv', 'backups')) || [];
  const last = list.length ? new Date(list[0].t).getTime() : 0;
  if (meta.v !== APP_VERSION && state.boards && state.boards.length) await snapshot(`アプリ更新前（v${meta.v ?? '旧'}→v${APP_VERSION}）`);
  else if (Date.now() - last > 24 * 3600 * 1000) await snapshot('自動（1日ごと）');
  await DB.put('kv', 'meta', { v: APP_VERSION });
}

/* ---------- 元に戻す ---------- */
let board = null, selId = null, connectFrom = null, focusId = null, navStack = [], undoStack = [];
function pushUndo() {
  if (!board) return;
  undoStack.push(JSON.stringify({ nodes: board.nodes, edges: board.edges }));
  if (undoStack.length > 40) undoStack.shift();
  syncHeader();
}
function undo() {
  if (!board || !undoStack.length) return;
  const s = JSON.parse(undoStack.pop());
  closeSheet();
  board.nodes = s.nodes; board.edges = s.edges;
  connectFrom = null; focusId = null; setBanner('');
  save(); renderNodes(); syncHeader(); toast('元に戻しました');
}

/* ---------- シート ---------- */
let sheetDirty = false, sheetCleanup = null;
function openSheet(html) {
  if (sheetCleanup) { sheetCleanup(); sheetCleanup = null; }
  $('#sheet').innerHTML = html; $('#sheet').style.display = 'block'; $('#shade').style.display = 'block'; $('#sheet').scrollTop = 0; sheetDirty = false;
  const last = $('#sheet').lastElementChild; if (last && last.classList.contains('btns')) last.classList.add('sbar');
  fitSheetToKeyboard();
}
/* iPhoneのキーボードでシートが隠れないようにする */
function fitSheetToKeyboard() {
  const vv = window.visualViewport, sh = $('#sheet'); if (!vv || !sh) return;
  const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
  sh.style.bottom = kb + 'px'; sh.style.maxHeight = Math.max(220, Math.round(vv.height * (kb ? 0.96 : 0.9))) + 'px';
}
if (window.visualViewport) { visualViewport.addEventListener('resize', fitSheetToKeyboard); visualViewport.addEventListener('scroll', fitSheetToKeyboard); }
document.addEventListener('focusin', e => {
  if (e.target.closest && e.target.closest('#sheet') && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) setTimeout(() => { try { e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch { } }, 350);
});
function closeSheet() {
  if (sheetCleanup) { sheetCleanup(); sheetCleanup = null; }
  $('#sheet').style.display = 'none'; $('#shade').style.display = 'none'; $('#sheet').innerHTML = ''; sheetDirty = false;
  if (board) { selId = null; renderNodes(); }
}
$('#shade').onclick = () => closeSheet();
function edit() { if (!sheetDirty) { pushUndo(); sheetDirty = true; } save(); }
function show(id) { document.querySelectorAll('.view').forEach(v => v.classList.toggle('on', v.id === id)); }

/* ---------- 画像まわり ---------- */
async function resizeImage(file, max = 1280) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, ng) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ng; i.src = url; });
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return await new Promise(r => c.toBlob(r, 'image/jpeg', 0.82));
  } finally { URL.revokeObjectURL(url); }
}
function makePoster(blob) {
  return new Promise(res => {
    const url = URL.createObjectURL(blob), v = document.createElement('video'); let done = false;
    const fin = r => { if (done) return; done = true; v.remove(); URL.revokeObjectURL(url); res(r); };
    v.setAttribute('playsinline', ''); v.setAttribute('muted', '');
    v.style.cssText = 'position:fixed;left:-9999px;top:0;width:2px;height:2px;opacity:0;pointer-events:none';
    document.body.appendChild(v);
    setTimeout(() => fin(null), 7000);
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.onerror = () => fin(null);
    v.onloadedmetadata = () => { try { v.currentTime = Math.min(1, (isFinite(v.duration) && v.duration ? v.duration : 2) / 2); } catch { fin(null); } };
    v.onseeked = () => {
      try {
        const w = 320, h = Math.round(w * (v.videoHeight || 180) / (v.videoWidth || 320));
        const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(v, 0, 0, w, h);
        c.toBlob(b => fin(b), 'image/jpeg', 0.7);
      } catch { fin(null); }
    };
    v.src = url; try { v.load(); } catch { }
  });
}
/* ================= 一覧画面 ================= */
let listEdit = false; const folderClosed = {};
function renderList() {
  const el = $('#list'); el.innerHTML = '';
  const tools = document.createElement('div'); tools.className = 'tools';
  tools.innerHTML = '<button id="tQuiz">🧠 復習クイズ</button><button id="tRecent">📅 最近やってない技</button><button id="tGloss">📖 用語辞典</button><button id="tSet">⚙︎ 設定・バックアップ</button><button id="tHelp">❓ 使い方</button><button id="tSample">📘 見本の図を追加</button>';
  el.appendChild(tools);
  $('#tQuiz').onclick = startQuiz; $('#tRecent').onclick = showRecent; $('#tGloss').onclick = () => openGlossary(false); $('#tSet').onclick = showSettings; $('#tHelp').onclick = showHelp; $('#tSample').onclick = addSample;

  if (!state.boards.length) {
    const e = document.createElement('div'); e.className = 'foot'; e.textContent = 'まだフローチャートがありません。右上の「＋ 新規」から作成してください。'; el.appendChild(e);
  }
  const folders = []; state.boards.forEach(b => { const f = b.folder || ''; if (!folders.includes(f)) folders.push(f); });
  folders.sort((a, b) => (a === '' ? 0 : 1) - (b === '' ? 0 : 1));
  folders.forEach(f => {
    const bs = state.boards.filter(b => (b.folder || '') === f);
    if (f) {
      const h = document.createElement('div'); h.className = 'fh'; h.textContent = `📁 ${f}（${bs.length}） ${folderClosed[f] ? '▸' : '▾'}`;
      h.onclick = () => { folderClosed[f] = !folderClosed[f]; renderList(); }; el.appendChild(h);
      if (folderClosed[f]) return;
    }
    bs.forEach(b => {
      const c = document.createElement('div'); c.className = 'card';
      const nv = b.nodes.reduce((a, n) => a + n.videos.length, 0);
      c.innerHTML = `<div style="flex:1;min-width:0"><div class="nm">${b.locked ? '🔒 ' : ''}${esc(b.name)}</div><div class="meta">技 ${b.nodes.length} ・ 動画 ${nv}</div></div>` +
        (listEdit ? '<button class="sm up">↑</button><button class="sm dn">↓</button>' : '<span style="color:var(--sub)">›</span>');
      if (listEdit) {
        c.querySelector('.up').onclick = e => { e.stopPropagation(); moveBoard(b.id, -1); };
        c.querySelector('.dn').onclick = e => { e.stopPropagation(); moveBoard(b.id, 1); };
      } else c.onclick = () => openBoard(b.id, 'fresh');
      el.appendChild(c);
    });
  });
  const f = document.createElement('div'); f.className = 'foot';
  f.innerHTML = `<div class="btns"><button id="btnOrder" class="sm ${listEdit ? 'on' : ''}">${listEdit ? '並べ替えを終わる' : '↕ 並べ替え'}</button></div>
  <p>データと動画はこの端末のブラウザ内だけに保存され、外部には送信されません。<b>ホーム画面のアイコンを削除すると、データも消えます。</b>定期的に「設定・バックアップ」から書き出してください。</p>`;
  el.appendChild(f);
  $('#btnOrder').onclick = () => { listEdit = !listEdit; renderList(); };
}
function moveBoard(id, dir) {
  const b = state.boards.find(x => x.id === id);
  const same = state.boards.filter(x => (x.folder || '') === (b.folder || ''));
  const i = same.indexOf(b), j = i + dir; if (j < 0 || j >= same.length) return;
  const bi = state.boards.indexOf(b), bj = state.boards.indexOf(same[j]);
  [state.boards[bi], state.boards[bj]] = [state.boards[bj], state.boards[bi]];
  save(); renderList();
}
$('#btnNew').onclick = () => {
  const name = prompt('フローチャート名（例：クローズドガード）');
  if (!name) return;
  const b = { id: uid(), name, folder: '', nodes: [], edges: [], view: { x: 20, y: 20, k: 1 }, locked: false, snap: false, hl: false };
  state.boards.unshift(b); save(); openBoard(b.id, 'fresh');
};
$('#btnSearch').onclick = () => showSearch();

/* ---------- 全文検索 ---------- */
function showSearch() {
  openSheet(`<div class="row"><label>検索（技名・メモ・しおり・リンク名・英語名）</label><input type="text" id="sq" placeholder="例：三角 / hip bump / 袖"></div><div id="sres"></div><div class="btns"><button id="bok" class="primary">閉じる</button></div>`);
  $('#bok').onclick = closeSheet;
  const run = () => {
    const q = $('#sq').value.trim().toLowerCase(), box = $('#sres'); box.innerHTML = '';
    if (!q) return;
    const hits = [];
    state.boards.forEach(b => b.nodes.forEach(n => {
      const fields = [['技名', n.title], ['英語名', n.en], ['メモ', n.memo], ...n.marks.map(m => ['しおり', m.text]), ...n.links.map(l => ['リンク', l.label || l.url])];
      for (const [k, v] of fields) {
        const i = String(v || '').toLowerCase().indexOf(q);
        if (i >= 0) { const s = String(v); hits.push({ b, n, k, snip: s.slice(Math.max(0, i - 12), i + 28) }); break; }
      }
    }));
    if (!hits.length) { box.innerHTML = '<div class="vname">見つかりませんでした。</div>'; return; }
    hits.slice(0, 40).forEach(h => {
      const d = document.createElement('div'); d.className = 'card';
      d.innerHTML = `<div style="flex:1;min-width:0"><div class="nm" style="font-size:14px">${esc(h.n.title) || '（無題）'}</div><div class="meta">${esc(h.b.name)} ・ ${h.k}：${esc(h.snip)}</div></div><span style="color:var(--sub)">›</span>`;
      d.onclick = () => focusNode(h.b.id, h.n.id); box.appendChild(d);
    });
  };
  $('#sq').oninput = run; $('#sq').focus();
}
function focusNode(bid, nid) {
  closeSheet(); openBoard(bid, 'fresh');
  const n = board.nodes.find(x => x.id === nid); if (!n) return;
  const r = $('#canvas').getBoundingClientRect();
  board.view = { k: 1, x: r.width / 2 - (n.x + NW / 2), y: r.height / 2 - (n.y + 30) }; applyView(); save();
  const el = nodeEl(nid); if (el) { el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 2400); }
}

/* ---------- 最近練習していない技 ---------- */
function showRecent() {
  const all = [];
  state.boards.forEach(b => b.nodes.forEach(n => { if (n.title) all.push({ b, n }); }));
  if (!all.length) { toast('技がまだありません'); return; }
  all.sort((x, y) => (x.n.lastPracticed ? new Date(x.n.lastPracticed).getTime() : 0) - (y.n.lastPracticed ? new Date(y.n.lastPracticed).getTime() : 0));
  const days = n => n.lastPracticed ? Math.floor((Date.now() - new Date(n.lastPracticed).getTime()) / 86400000) : null;
  const rows = all.slice(0, 40).map((x, i) => {
    const d = days(x.n);
    return `<div class="card" data-i="${i}"><div style="flex:1;min-width:0"><div class="nm" style="font-size:14px"><span style="color:${['#6b7280', '#f5a524', '#3ecf8e'][x.n.mastery]}">●</span> ${esc(x.n.title)}</div><div class="meta">${esc(x.b.name)} ・ ${d === null ? '未練習' : (d === 0 ? '今日' : d + '日前')}${x.n.practiceCount ? ' ・ ' + x.n.practiceCount + '回' : ''}</div></div><span style="color:var(--sub)">›</span></div>`;
  }).join('');
  openSheet(`<div class="row"><label>最近練習していない順（上位40件）。技の画面の「✓ 今日練習した」で記録されます。</label>${rows}</div><div class="btns"><button id="bok" class="primary">閉じる</button></div>`);
  $('#bok').onclick = closeSheet;
  document.querySelectorAll('#sheet .card').forEach(c => c.onclick = () => { const x = all[+c.dataset.i]; focusNode(x.b.id, x.n.id); });
}

/* ---------- 復習クイズ ---------- */
function startQuiz() {
  const pool = [];
  state.boards.forEach(b => b.nodes.forEach(n => { const outs = b.edges.filter(e => e.from === n.id); if (outs.length && n.title) pool.push({ b, n, outs }); }));
  if (!pool.length) { toast('矢印でつないだ技がまだありません'); return; }
  quizNext(pool, { n: 0, ok: 0 });
}
function quizNext(pool, st) {
  const w = pool.map(p => Math.max(0.3, 1 + (2 - p.n.mastery) * 1.5 + (p.n.quiz.ng || 0) * 0.7 - (p.n.quiz.ok || 0) * 0.2));
  let r = Math.random() * w.reduce((a, b) => a + b, 0), pick = pool[0];
  for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) { pick = pool[i]; break; } }
  const e = pick.outs[Math.floor(Math.random() * pick.outs.length)];
  const answers = e.label ? pick.outs.filter(x => x.label === e.label) : pick.outs;
  const tgt = x => pick.b.nodes.find(n => n.id === x.to);
  openSheet(`<div class="row"><label>復習クイズ　${st.n}問中 ${st.ok}問 正解　／　${esc(pick.b.name)}</label>
    <div style="font-size:18px;line-height:1.6;margin:10px 0">「<b>${esc(pick.n.title)}</b>」から${e.label ? `<br>「<b>${esc(e.label)}</b>」のとき` : ''}<br>次の一手は？</div>
    ${pick.n.memo ? '<button id="qhint" class="sm">ヒント（メモを見る）</button><div id="qh" class="vname"></div>' : ''}</div>
    <div id="qa"></div>
    <div class="btns"><button id="qshow" class="primary big">答えを見る</button><button id="qend">終わる</button></div>`);
  if (pick.n.memo) $('#qhint').onclick = () => { $('#qh').textContent = pick.n.memo.slice(0, 160); };
  $('#qend').onclick = closeSheet;
  $('#qshow').onclick = () => {
    $('#qa').innerHTML = `<div class="row"><label>答え</label>${answers.map(a => { const t = tgt(a); return `<div class="box"><div class="t">→ <b>${esc(t ? t.title : '?')}</b></div>${t && t.memo ? `<div class="vname">${esc(t.memo.slice(0, 100))}</div>` : ''}</div>`; }).join('')}</div>`;
    $('#qshow').outerHTML = '<button id="qok" class="primary big">言えた</button><button id="qng" class="big">まだ</button>';
    const rec = ok => { st.n++; if (ok) st.ok++; if (ok) pick.n.quiz.ok++; else pick.n.quiz.ng++; save(); quizNext(pool, st); };
    $('#qok').onclick = () => rec(true); $('#qng').onclick = () => rec(false);
  };
}

/* ---------- 使い方 ---------- */
function showHelp() {
  openSheet(`<div class="row"><label>使い方（ざっくり）</label><div class="gd">
  <p><b>1. 図を作る</b>：右上「＋ 新規」。図の中で「＋ 技を追加」。</p>
  <p><b>2. 技の名前を入れる</b>：「三角」などと打つと、用語辞典の説明が出ます。「この名前・説明を使う」で説明と画像の候補が自動で入ります（画像はネット接続時のみ）。</p>
  <p><b>3. つなぐ</b>：技をタップ →「→ 矢印をつなぐ」→ つなぎ先をタップ。矢印に「相手が腕を引く」などの条件を書けます。</p>
  <p><b>4. 動画</b>：技の画面で「取り込む」。再生中に「🔖 ここにしおり」で見たい場面を記録。0.5倍速やA-Bくり返しも使えます。</p>
  <p><b>5. 操作</b>：1本指でドラッグ＝移動、2本指＝拡大縮小、空白をタップ＝選択解除。「↶」で元に戻す、「🔒」で誤操作防止。</p>
  <p><b>6. 復習</b>：一覧の「復習クイズ」「最近やってない技」。技ごとに習熟度を付けておくと、苦手な技が多めに出題されます。</p>
  <p><b>7. 大事なデータを守る</b>：データはこのiPhoneの中だけにあります。ホーム画面のアイコンを消すとデータも消えます。ときどき「設定・バックアップ → 動画ごと書き出す」でファイルアプリに保存してください。</p>
  <p style="color:var(--sub)">用語辞典や見本の図は一般的な説明・流れの一例です。実際の練習では道場の先生の指導を優先してください。</p></div></div>
  <div class="btns"><button id="bok" class="primary">閉じる</button></div>`);
  $('#bok').onclick = closeSheet;
}

/* ---------- 見本の図（初心者向け） ---------- */
async function addSample() {
  if (!confirm('見本「クローズドガードの基本」を追加します。自由に書き換えて使ってください。\n（ネット接続中なら画像の候補も自動で付けます）')) return;
  const G = name => GLOSSARY.find(g => g.jp === name);
  const spec = [
    ['クローズドガード', 230, 0], ['ヒップバンプスイープ', -30, 250], ['シザースイープ', 230, 250], ['三角絞め', 490, 250],
    ['キムラ', -160, 500], ['ギロチンチョーク', 100, 500], ['腕十字', 490, 500]
  ];
  const nodes = spec.map(([jp, x, y]) => {
    const g = G(jp);
    return { id: uid(), x, y, title: g.jp, en: g.en, memo: g.desc + '\n\n（見本：自分の理解や先生の注意点に書き換えてください）', color: (window.KIND_COLOR || {})[g.kind] || COLORS[0][0],
      shape: 'rect', mastery: 0, videos: [], marks: [], links: [], photos: [], boardLink: null, lastPracticed: null, practiceCount: 0, quiz: { ok: 0, ng: 0 }, img: null, imgCredit: null, thumb: null };
  });
  const id = jp => nodes.find(n => n.title === jp).id;
  const E = (a, b, label, dash) => ({ id: uid(), from: id(a), to: id(b), label, dash: !!dash });
  const b = { id: uid(), name: 'クローズドガードの基本（見本）', folder: '見本', view: { x: 20, y: 20, k: 1 }, locked: false, snap: false, hl: false, nodes,
    edges: [E('クローズドガード', 'ヒップバンプスイープ', '相手が上体を起こす'), E('クローズドガード', 'シザースイープ', '相手の姿勢を崩せた'),
      E('クローズドガード', '三角絞め', '相手の片腕が内側に入る'), E('ヒップバンプスイープ', 'キムラ', '相手が手を床について耐える'),
      E('ヒップバンプスイープ', 'ギロチンチョーク', '相手が頭を下げて潰しにくる'), E('三角絞め', '腕十字', '三角を防がれたら', true)] };
  state.boards.push(b); await saveNow(); openBoard(b.id, 'fresh'); setTimeout(fitView, 50);
  toast('見本を追加しました。画像を探しています…');
  for (const n of nodes) { if (board !== b) break; await autoImage(n, true); }
}
/* ================= ボード（フローチャート）画面 ================= */
const canvas = $('#canvas'), world = $('#world'), nodesEl = $('#nodes'), edgeG = $('#edgeG');

function openBoard(id, mode) {
  const b = state.boards.find(x => x.id === id); if (!b) return;
  if (mode === 'link' && board) navStack.push(board.id); else if (mode === 'fresh') navStack = [];
  board = b; selId = null; connectFrom = null; focusId = null; undoStack = []; setBanner('');
  show('vBoard'); syncHeader(); applyView(); renderNodes();
}
function syncHeader() {
  if (!board) return;
  $('#boardTitle').textContent = board.name;
  $('#btnLock').textContent = board.locked ? '🔒' : '🔓';
  $('#btnLock').classList.toggle('on', board.locked);
  $('#btnUndo').disabled = !undoStack.length || board.locked;
  $('#fab').style.display = board.locked ? 'none' : '';
  $('#btnBack').textContent = navStack.length ? '‹ 前の図' : '‹ 戻る';
}
$('#btnBack').onclick = () => {
  closeSheet();
  if (navStack.length) { openBoard(navStack.pop(), 'back'); return; }
  board = null; renderList(); show('vList');
};
$('#btnUndo').onclick = undo;
$('#btnLock').onclick = () => { board.locked = !board.locked; connectFrom = null; setBanner(''); save(); syncHeader(); toast(board.locked ? '閲覧ロック：動かしたり編集したりできません' : 'ロックを解除しました'); };
function applyView() { const v = board.view; world.style.transform = `translate(${v.x}px,${v.y}px) scale(${v.k})`; }
function setBanner(t) { const b = $('#banner'); b.style.display = t ? 'block' : 'none'; b.textContent = t; }

function coverOf(n) {
  if (n.img) return { key: n.img };
  if (n.thumb) return { key: n.thumb };
  const yl = n.links.find(l => l.yt);
  if (yl) return { url: `https://i.ytimg.com/vi/${yl.yt.id}/mqdefault.jpg` };
  return null;
}
function neighborSet(id) {
  const s = new Set([id]);
  board.edges.forEach(e => { if (e.from === id) s.add(e.to); if (e.to === id) s.add(e.from); });
  return s;
}
function renderNodes() {
  if (!board) return;
  nodesEl.innerHTML = '';
  const near = focusId ? neighborSet(focusId) : null;
  board.nodes.forEach(n => {
    const d = document.createElement('div');
    d.className = 'node' + (n.shape === 'pill' ? ' pill' : '') + (n.id === selId ? ' sel' : '') + (n.id === connectFrom ? ' from' : '') +
      (near && !near.has(n.id) ? ' dim' : '') + (board.hl && n.mastery === 2 && !near ? ' dimw' : '');
    d.dataset.id = n.id; d.style.left = n.x + 'px'; d.style.top = n.y + 'px'; d.style.setProperty('--c', n.color || COLORS[0][0]);
    const cv = coverOf(n);
    const ic = [];
    if (n.videos.length) ic.push('🎬' + (n.videos.length > 1 ? n.videos.length : ''));
    if (n.links.length) ic.push('🔗'); if (n.memo) ic.push('📝'); if (n.boardLink) ic.push('↗');
    d.innerHTML = (cv ? '<img class="pic" draggable="false" alt="">' : '') + `<div>${esc(n.title) || '（無題）'}</div>` + (ic.length ? `<div class="ic">${ic.join(' ')}</div>` : '') + `<span class="ms m${n.mastery}"></span>`;
    nodesEl.appendChild(d);
    if (cv) {
      const img = d.querySelector('img'); img.onload = renderEdges; img.onerror = () => { img.style.display = 'none'; renderEdges(); };
      if (cv.url) img.src = cv.url; else blobUrl(cv.key).then(u => { if (u) img.src = u; else { img.style.display = 'none'; renderEdges(); } });
    }
  });
  renderEdges();
}
function nodeEl(id) { return nodesEl.querySelector(`[data-id="${id}"]`); }
function nodeSize(n) { const el = nodeEl(n.id); return el ? [el.offsetWidth, el.offsetHeight] : [NW, 56]; }
function clip(cx, cy, w, h, dx, dy) {
  if (!dx && !dy) return [cx, cy];
  const t = Math.min(dx ? (w / 2) / Math.abs(dx) : Infinity, dy ? (h / 2) / Math.abs(dy) : Infinity);
  return [cx + dx * t, cy + dy * t];
}
function edgeGeom(e) {
  const a = board.nodes.find(n => n.id === e.from), b = board.nodes.find(n => n.id === e.to); if (!a || !b) return null;
  const [aw, ah] = nodeSize(a), [bw, bh] = nodeSize(b);
  const ac = [a.x + aw / 2, a.y + ah / 2], bc = [b.x + bw / 2, b.y + bh / 2], dx = bc[0] - ac[0], dy = bc[1] - ac[1];
  return { p1: clip(ac[0], ac[1], aw + 4, ah + 4, dx, dy), p2: clip(bc[0], bc[1], bw + 8, bh + 8, -dx, -dy) };
}
function renderEdges() {
  if (!board) return;
  edgeG.innerHTML = '';
  const ns = 'http://www.w3.org/2000/svg';
  board.edges.forEach(e => {
    const g0 = edgeGeom(e); if (!g0) return; const { p1, p2 } = g0;
    const g = document.createElementNS(ns, 'g'); g.dataset.eid = e.id;
    if (focusId && e.from !== focusId && e.to !== focusId) g.setAttribute('opacity', '0.15');
    const d = `M${p1[0]},${p1[1]} L${p2[0]},${p2[1]}`;
    const line = document.createElementNS(ns, 'path'); line.setAttribute('d', d); line.setAttribute('class', 'edge-line'); line.setAttribute('marker-end', 'url(#arr)');
    if (e.dash) line.setAttribute('stroke-dasharray', '7 5');
    const hit = document.createElementNS(ns, 'path'); hit.setAttribute('d', d); hit.setAttribute('class', 'edge-hit');
    g.append(line, hit);
    if (e.label) { const t = document.createElementNS(ns, 'text'); t.setAttribute('class', 'edge-lbl'); t.setAttribute('x', (p1[0] + p2[0]) / 2); t.setAttribute('y', (p1[1] + p2[1]) / 2 - 4); t.textContent = e.label; g.append(t); }
    edgeG.appendChild(g);
  });
}

/* ---------- タッチ操作 ---------- */
const pts = new Map(); let drag = null, pinch = null;
canvas.addEventListener('pointerdown', ev => {
  if (ev.target.closest('button')) return;
  canvas.setPointerCapture(ev.pointerId);
  pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  if (pts.size === 1) {
    const nEl = ev.target.closest('.node'), eEl = ev.target.closest('[data-eid]'), v = board.view;
    if (nEl) {
      const n = board.nodes.find(x => x.id === nEl.dataset.id);
      drag = { type: (connectFrom || board.locked) ? 'pan' : 'node', kind: 'node', id: n.id, sx: ev.clientX, sy: ev.clientY, ox: n.x, oy: n.y, vx: v.x, vy: v.y, moved: false };
    } else if (eEl) drag = { type: 'tap', kind: 'edge', id: eEl.dataset.eid, sx: ev.clientX, sy: ev.clientY, moved: false };
    else drag = { type: 'pan', kind: 'bg', sx: ev.clientX, sy: ev.clientY, vx: v.x, vy: v.y, moved: false };
  } else if (pts.size === 2) {
    drag = null;
    const [p, q] = [...pts.values()], r = canvas.getBoundingClientRect(), v = board.view;
    const cx = (p.x + q.x) / 2 - r.left, cy = (p.y + q.y) / 2 - r.top;
    pinch = { d0: Math.hypot(p.x - q.x, p.y - q.y), k0: v.k, wx: (cx - v.x) / v.k, wy: (cy - v.y) / v.k };
  }
});
canvas.addEventListener('pointermove', ev => {
  if (!pts.has(ev.pointerId)) return;
  pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  const v = board.view;
  if (pinch && pts.size >= 2) {
    const [p, q] = [...pts.values()], r = canvas.getBoundingClientRect();
    const k = Math.min(2.5, Math.max(0.2, pinch.k0 * Math.hypot(p.x - q.x, p.y - q.y) / pinch.d0));
    const cx = (p.x + q.x) / 2 - r.left, cy = (p.y + q.y) / 2 - r.top;
    v.k = k; v.x = cx - pinch.wx * k; v.y = cy - pinch.wy * k; applyView(); return;
  }
  if (!drag) return;
  const dx = ev.clientX - drag.sx, dy = ev.clientY - drag.sy;
  if (!drag.moved && Math.hypot(dx, dy) > 6) { drag.moved = true; if (drag.type === 'node') pushUndo(); }
  if (!drag.moved) return;
  if (drag.type === 'node') {
    const n = board.nodes.find(x => x.id === drag.id);
    let nx = drag.ox + dx / v.k, ny = drag.oy + dy / v.k;
    if (board.snap) { nx = Math.round(nx / 20) * 20; ny = Math.round(ny / 20) * 20; }
    n.x = Math.round(nx); n.y = Math.round(ny);
    const el = nodeEl(n.id); el.style.left = n.x + 'px'; el.style.top = n.y + 'px'; renderEdges();
  } else if (drag.type === 'pan') { v.x = drag.vx + dx; v.y = drag.vy + dy; applyView(); }
});
function endPointer(ev) {
  if (!pts.has(ev.pointerId)) return;
  pts.delete(ev.pointerId);
  if (pinch) { if (pts.size < 2) { pinch = null; drag = null; save(); } return; }
  const d = drag; drag = null; if (!d) return;
  if (d.moved) { save(); syncHeader(); return; }
  tap(d);
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

function tap(d) {
  if (d.kind === 'node') {
    if (connectFrom && connectFrom !== d.id) {
      pushUndo();
      let e = board.edges.find(x => x.from === connectFrom && x.to === d.id);
      if (!e) { e = { id: uid(), from: connectFrom, to: d.id, label: '', dash: false }; board.edges.push(e); }
      connectFrom = null; setBanner(''); save(); renderNodes(); syncHeader(); openEdgeSheet(e.id); return;
    }
    if (connectFrom === d.id) { connectFrom = null; setBanner(''); renderNodes(); return; }
    openNodeSheet(d.id);
  } else if (d.kind === 'edge') { if (board.locked) return; openEdgeSheet(d.id); }
  else {
    if (connectFrom) { connectFrom = null; setBanner(''); renderNodes(); }
    if (focusId) { focusId = null; setBanner(''); renderNodes(); }
  }
}

function addNodeAtCenter(init) {
  const r = canvas.getBoundingClientRect(), v = board.view, j = (board.nodes.length % 5) * 14;
  const n = Object.assign({
    id: uid(), x: Math.round((r.width / 2 - v.x) / v.k - NW / 2 + j), y: Math.round((r.height / 2 - v.y) / v.k - 24 + j), title: '', memo: '', en: '', color: COLORS[0][0],
    shape: 'rect', mastery: 0, videos: [], marks: [], links: [], photos: [], boardLink: null, lastPracticed: null, practiceCount: 0, quiz: { ok: 0, ng: 0 }, img: null, imgCredit: null, thumb: null
  }, init || {});
  pushUndo(); board.nodes.push(n); save(); renderNodes(); syncHeader(); return n;
}
$('#fab').onclick = () => { const n = addNodeAtCenter(); openNodeSheet(n.id, true); };
function fitView() {
  if (!board.nodes.length) { board.view = { x: 20, y: 20, k: 1 }; applyView(); save(); return; }
  const r = canvas.getBoundingClientRect();
  const rects = board.nodes.map(n => { const [w, h] = nodeSize(n); return [n.x, n.y, n.x + w, n.y + h]; });
  const minX = Math.min(...rects.map(x => x[0])) - 20, maxX = Math.max(...rects.map(x => x[2])) + 20, minY = Math.min(...rects.map(x => x[1])) - 20, maxY = Math.max(...rects.map(x => x[3])) + 20;
  const k = Math.min(1.2, Math.max(0.2, Math.min(r.width / (maxX - minX), r.height / (maxY - minY))));
  board.view = { k, x: (r.width - (maxX - minX) * k) / 2 - minX * k, y: (r.height - (maxY - minY) * k) / 2 - minY * k };
  applyView(); save();
}
$('#fit').onclick = fitView;

/* ---------- 自動整列 ---------- */
function autoLayout() {
  const N = board.nodes; if (!N.length) return;
  pushUndo();
  const out = new Map(N.map(n => [n.id, []])), indeg = new Map(N.map(n => [n.id, 0]));
  board.edges.forEach(e => { out.get(e.from).push(e.to); indeg.set(e.to, indeg.get(e.to) + 1); });
  const layer = new Map(), queue = [];
  const roots = N.filter(n => indeg.get(n.id) === 0);
  (roots.length ? roots : [N[0]]).forEach(n => { layer.set(n.id, 0); queue.push(n.id); });
  while (queue.length) { const id = queue.shift(); for (const t of out.get(id)) if (!layer.has(t)) { layer.set(t, layer.get(id) + 1); queue.push(t); } }
  N.forEach(n => { if (!layer.has(n.id)) layer.set(n.id, 0); });
  const maxL = Math.max(...layer.values()); let y = 0;
  for (let l = 0; l <= maxL; l++) {
    const row = N.filter(n => layer.get(n.id) === l).sort((a, b) => a.x - b.x); if (!row.length) continue;
    let h = 0; row.forEach((n, i) => { n.x = i * (NW + 30); n.y = y; h = Math.max(h, nodeSize(n)[1]); });
    y += h + 56;
  }
  save(); renderNodes(); fitView(); syncHeader(); toast('整列しました（「↶」で元に戻せます）');
}

/* ---------- 画像として書き出し ---------- */
function wrapText(ctx, text, maxW) {
  const lines = [];
  String(text).split('\n').forEach(par => { let cur = ''; for (const ch of par) { if (cur && ctx.measureText(cur + ch).width > maxW) { lines.push(cur); cur = ch; } else cur += ch; } lines.push(cur); });
  return lines;
}
function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
async function exportPng() {
  closeSheet();
  if (!board.nodes.length) { toast('技がありません'); return; }
  const rects = board.nodes.map(n => { const [w, h] = nodeSize(n); return { n, x: n.x, y: n.y, w, h }; });
  const pad = 40, minX = Math.min(...rects.map(r => r.x)) - pad, minY = Math.min(...rects.map(r => r.y)) - pad;
  const W = Math.max(...rects.map(r => r.x + r.w)) + pad - minX, H = Math.max(...rects.map(r => r.y + r.h)) + pad - minY;
  const sc = Math.min(2, 4000 / Math.max(W, H));
  const c = document.createElement('canvas'); c.width = Math.round(W * sc); c.height = Math.round(H * sc);
  const ctx = c.getContext('2d'); ctx.scale(sc, sc); ctx.translate(-minX, -minY);
  ctx.fillStyle = '#14161a'; ctx.fillRect(minX, minY, W, H);
  ctx.font = '12px -apple-system, "Hiragino Sans", sans-serif';
  board.edges.forEach(e => {
    const g = edgeGeom(e); if (!g) return; const { p1, p2 } = g;
    ctx.strokeStyle = '#aab3c5'; ctx.fillStyle = '#aab3c5'; ctx.lineWidth = 2; ctx.setLineDash(e.dash ? [7, 5] : []);
    ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke(); ctx.setLineDash([]);
    const a = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
    ctx.beginPath(); ctx.moveTo(p2[0], p2[1]); ctx.lineTo(p2[0] - 10 * Math.cos(a - 0.4), p2[1] - 10 * Math.sin(a - 0.4)); ctx.lineTo(p2[0] - 10 * Math.cos(a + 0.4), p2[1] - 10 * Math.sin(a + 0.4)); ctx.closePath(); ctx.fill();
    if (e.label) { ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = '#14161a'; const mx = (p1[0] + p2[0]) / 2, my = (p1[1] + p2[1]) / 2 - 4; ctx.strokeText(e.label, mx, my); ctx.fillStyle = '#e9ecf1'; ctx.fillText(e.label, mx, my); }
  });
  ctx.font = '14px -apple-system, "Hiragino Sans", sans-serif'; ctx.textAlign = 'left';
  rects.forEach(({ n, x, y, w, h }) => {
    rrect(ctx, x, y, w, h, n.shape === 'pill' ? 24 : 10); ctx.fillStyle = '#262a32'; ctx.fill(); ctx.strokeStyle = '#3a3f4a'; ctx.lineWidth = 1; ctx.stroke();
    ctx.save(); rrect(ctx, x, y, w, h, n.shape === 'pill' ? 24 : 10); ctx.clip(); ctx.fillStyle = n.color; ctx.fillRect(x, y, 6, h); ctx.restore();
    ctx.fillStyle = '#e9ecf1'; const lines = wrapText(ctx, n.title || '（無題）', w - 36);
    lines.slice(0, Math.max(1, Math.floor((h - 12) / 19))).forEach((ln, i) => ctx.fillText(ln, x + 16, y + 24 + i * 19));
    ctx.beginPath(); ctx.arc(x + w - 11, y + 11, 5, 0, 7); ctx.fillStyle = ['#6b7280', '#f5a524', '#3ecf8e'][n.mastery]; ctx.fill();
  });
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  await shareOrDownload(new File([blob], `${board.name.replace(/[\\/:*?"<>|]/g, '_')}.png`, { type: 'image/png' }));
}

/* ---------- ボードのメニュー ---------- */
$('#btnBoardMenu').onclick = () => {
  const ro = board.locked, folders = [...new Set(state.boards.map(b => b.folder).filter(Boolean))];
  openSheet(`<div class="row"><label>フローチャート名</label><input type="text" id="bn" value="${esc(board.name)}" ${ro ? 'disabled' : ''}></div>
  <div class="row"><label>フォルダ（空欄＝なし）</label><input type="text" id="bf" list="fl" value="${esc(board.folder)}" ${ro ? 'disabled' : ''}><datalist id="fl">${folders.map(f => `<option value="${esc(f)}">`).join('')}</datalist></div>
  <div class="row"><label>表示</label><div class="btns"><button id="bsnap" class="${board.snap ? 'on' : ''}">グリッドに吸着：${board.snap ? 'ON' : 'OFF'}</button><button id="bhl" class="${board.hl ? 'on' : ''}">弱点ハイライト：${board.hl ? 'ON' : 'OFF'}</button></div><div class="vname">弱点ハイライト：「使える」の技を薄く表示して、まだ弱い技を目立たせます。</div></div>
  <div class="row"><div class="btns">${ro ? '' : '<button id="blay">自動整列</button><button id="bgl">📖 用語辞典から技を追加</button>'}<button id="bpng">🖼 画像として書き出す</button></div></div>
  <div class="btns">${ro ? '' : '<button id="bdel" class="danger">このフローチャートを削除</button>'}<button id="bok" class="primary" style="margin-left:auto">閉じる</button></div>`);
  $('#bok').onclick = closeSheet;
  if (!ro) {
    $('#bn').oninput = e => { board.name = e.target.value || '無題'; $('#boardTitle').textContent = board.name; save(); };
    $('#bf').oninput = e => { board.folder = e.target.value.trim(); save(); };
    $('#blay').onclick = () => { closeSheet(); autoLayout(); };
    $('#bgl').onclick = () => { closeSheet(); openGlossary(true); };
    $('#bdel').onclick = async () => {
      if (!confirm(`「${board.name}」を削除します。よろしいですか？\n（直前の自動バックアップから復元できます）`)) return;
      await snapshot('フローチャート削除前'); const id = board.id;
      state.boards = state.boards.filter(b => b.id !== id); state.boards.forEach(b => b.nodes.forEach(n => { if (n.boardLink === id) n.boardLink = null; }));
      await saveNow(); closeSheet(); board = null; navStack = []; renderList(); show('vList');
    };
  }
  $('#bsnap').onclick = () => { board.snap = !board.snap; save(); $('#bsnap').className = board.snap ? 'on' : ''; $('#bsnap').textContent = `グリッドに吸着：${board.snap ? 'ON' : 'OFF'}`; };
  $('#bhl').onclick = () => { board.hl = !board.hl; save(); $('#bhl').className = board.hl ? 'on' : ''; $('#bhl').textContent = `弱点ハイライト：${board.hl ? 'ON' : 'OFF'}`; };
  $('#bpng').onclick = exportPng;
};

/* ---------- 矢印のシート ---------- */
function openEdgeSheet(id) {
  const e = board.edges.find(x => x.id === id); if (!e) return;
  const a = board.nodes.find(n => n.id === e.from), b = board.nodes.find(n => n.id === e.to);
  openSheet(`<div class="row"><label>${esc(a && a.title || '無題')} → ${esc(b && b.title || '無題')}</label>
  <input type="text" id="el" value="${esc(e.label)}" placeholder="条件・きっかけ（例：相手が腕を引く）"></div>
  <div class="btns"><button id="edash" class="${e.dash ? 'on' : ''}">点線：${e.dash ? 'ON' : 'OFF'}</button><button id="erev">向きを逆にする</button><button id="edel" class="danger">削除</button><button id="bok" class="primary" style="margin-left:auto">閉じる</button></div>`);
  $('#el').oninput = ev => { edit(); e.label = ev.target.value; renderEdges(); };
  $('#edash').onclick = () => { edit(); e.dash = !e.dash; $('#edash').className = e.dash ? 'on' : ''; $('#edash').textContent = `点線：${e.dash ? 'ON' : 'OFF'}`; renderEdges(); };
  $('#erev').onclick = () => { edit(); [e.from, e.to] = [e.to, e.from]; closeSheet(); };
  $('#edel').onclick = () => { edit(); board.edges = board.edges.filter(x => x !== e); closeSheet(); };
  $('#bok').onclick = closeSheet;
}
/* ================= 技（ノード）のシート ================= */
let curNodeId = null, playerUrls = [];
const KC = () => window.KIND_COLOR || {};

function ytInfo(u) {
  try {
    const x = new URL(/^https?:\/\//i.test(u.trim()) ? u.trim() : 'https://' + u.trim()), h = x.hostname.replace(/^(www|m|music)\./, '');
    let id = null;
    if (h === 'youtu.be') id = x.pathname.slice(1, 12);
    else if (h === 'youtube.com' || h === 'youtube-nocookie.com') {
      if (x.pathname === '/watch') id = x.searchParams.get('v');
      else { const m = x.pathname.match(/^\/(shorts|embed|live)\/([\w-]{11})/); if (m) id = m[2]; }
    }
    if (!id || !/^[\w-]{11}$/.test(id)) return null;
    const t = x.searchParams.get('t') || x.searchParams.get('start') || '0';
    let start = 0;
    if (/^\d+$/.test(t)) start = +t; else { const m = t.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/); start = (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0); }
    return { id, start };
  } catch { return null; }
}

async function openNodeSheet(id, focusTitle) {
  const n = board.nodes.find(x => x.id === id); if (!n) return;
  selId = id; curNodeId = id; renderNodes();
  const ro = !!board.locked;
  openSheet(`
  <div class="row"><label>技・ポジション名</label><input type="text" id="nt" value="${esc(n.title)}" placeholder="例：クローズドガード" ${ro ? 'disabled' : ''}><div id="gbox"></div></div>
  <div class="row" id="cbox"></div>
  <div class="row"><label>習熟度</label><div class="seg" id="mst">${MASTERY.map((m, i) => `<button data-m="${i}" class="${n.mastery === i ? 'on' : ''}">${m}</button>`).join('')}</div>
    <div class="btns" style="margin-top:8px"><button id="bprc">✓ 今日練習した</button></div><div class="vname" id="prc"></div></div>
  <div class="row"><label>メモ</label><textarea id="nm" placeholder="ポイント、注意点など" ${ro ? 'disabled' : ''}>${esc(n.memo)}</textarea></div>
  <div class="row" id="vbox"></div>
  <div class="row" id="lbox"></div>
  <div class="row" id="bbox"></div>
  ${ro ? '' : `<div class="row"><label>種類（色）と形</label><div class="chips" id="chips"></div><div class="btns" style="margin-top:10px"><button id="shp" class="sm"></button></div></div>`}
  <div class="btns"><button id="bhi">👁 次の一手だけ表示</button>${ro ? '' : '<button id="bcon">→ 矢印をつなぐ</button><button id="bdel" class="danger">削除</button>'}<button id="bok" class="primary" style="margin-left:auto">閉じる</button></div>`);
  sheetCleanup = () => { closeAllPlayers(); curNodeId = null; };

  $('#nt').oninput = e => { n.title = e.target.value; edit(); renderGloss(n); renderCover(n, true); };
  $('#nm').oninput = e => { n.memo = e.target.value; edit(); };
  $('#mst').querySelectorAll('button').forEach(b => b.onclick = () => { n.mastery = +b.dataset.m; save(); $('#mst').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); });
  const prc = () => { $('#prc').textContent = n.lastPracticed ? `最終練習：${new Date(n.lastPracticed).toLocaleDateString('ja-JP')}　累計 ${n.practiceCount} 回` : 'まだ練習の記録がありません'; };
  prc();
  $('#bprc').onclick = () => { n.lastPracticed = new Date().toISOString(); n.practiceCount++; save(); prc(); toast('練習を記録しました'); };
  $('#bhi').onclick = () => { focusId = n.id; closeSheet(); setBanner('ハイライト中（空白をタップで解除）'); renderNodes(); };
  $('#bok').onclick = closeSheet;
  if (!ro) {
    const drawChips = () => {
      $('#chips').innerHTML = COLORS.map(([c, nm]) => `<div class="chip ${c === n.color ? 'on' : ''}" data-c="${c}" title="${nm}" style="background:${c}"></div>`).join('');
      $('#chips').querySelectorAll('.chip').forEach(c => c.onclick = () => { edit(); n.color = c.dataset.c; drawChips(); });
      $('#shp').textContent = n.shape === 'pill' ? '形：丸み（タップで四角に）' : '形：四角（タップで丸みに）';
    };
    drawChips();
    $('#shp').onclick = () => { edit(); n.shape = n.shape === 'pill' ? 'rect' : 'pill'; drawChips(); };
    $('#bcon').onclick = () => { closeSheet(); connectFrom = id; setBanner('つなぎ先の技をタップ（空白タップで中止）'); renderNodes(); };
    $('#bdel').onclick = () => {
      if (!confirm('この技を削除します。（「↶」で元に戻せます）')) return;
      edit(); board.nodes = board.nodes.filter(x => x !== n); board.edges = board.edges.filter(e => e.from !== id && e.to !== id);
      closeSheet(); syncHeader();
    };
  }
  renderGloss(n); renderCover(n); renderLinks(n); renderBoardLink(n);
  await renderVideos(n);
  if (focusTitle && !ro) $('#nt').focus();
}

/* ---------- 用語辞典の候補 ---------- */
function renderGloss(n) {
  const box = $('#gbox'); if (!box) return; const ro = board.locked;
  const ms = n.title.trim() ? matchGloss(n.title, 3) : [];
  box.innerHTML = ms.map((g, i) => `<div class="box gd" data-i="${i}"><b>${esc(g.jp)}</b> <span style="color:var(--sub)">${esc(g.en)}</span><span class="k">${g.kind}</span><div style="margin:6px 0">${esc(g.desc)}</div>${ro ? '' : '<div class="btns"><button class="sm gu">この名前・説明を使う（画像も探す）</button></div>'}</div>`).join('');
  box.querySelectorAll('.gd').forEach(el => { const b = el.querySelector('.gu'); if (b) b.onclick = () => applyGloss(n, ms[+el.dataset.i]); });
}
function applyGloss(n, g) {
  edit(); n.title = g.jp; n.en = g.en; n.color = KC()[g.kind] || n.color;
  if (!n.memo.includes(g.desc)) n.memo = (n.memo ? n.memo + '\n\n' : '') + g.desc;
  $('#nt').value = n.title; $('#nm').value = n.memo; renderGloss(n);
  const chips = $('#chips'); if (chips) chips.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c.dataset.c === n.color));
  renderCover(n);
  if (!coverOf(n)) autoImage(n);
}

/* ---------- Wikimedia Commons（フリー画像）検索 ---------- */
async function commonsSearch(q) {
  const strip = s => String(s || '').replace(/<[^>]*>/g, '').trim().slice(0, 60);
  const seen = new Set(), out = [];
  for (const t of [`${q} jiu-jitsu`, `${q} grappling`, q]) {
    const p = new URLSearchParams({ action: 'query', format: 'json', origin: '*', generator: 'search', gsrsearch: `${t} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '12', prop: 'imageinfo', iiprop: 'url|mime|extmetadata', iiurlwidth: '640', iiextmetadatafilter: 'Artist|LicenseShortName' });
    const r = await fetch('https://commons.wikimedia.org/w/api.php?' + p); if (!r.ok) throw new Error('http ' + r.status);
    const j = await r.json();
    Object.values((j.query && j.query.pages) || {}).sort((a, b) => a.index - b.index).forEach(pg => {
      const ii = pg.imageinfo && pg.imageinfo[0];
      if (!ii || !/^image\/(jpeg|png|webp)/.test(ii.mime) || seen.has(pg.title)) return;
      seen.add(pg.title); const md = ii.extmetadata || {};
      out.push({ title: pg.title.replace(/^File:/, ''), thumb: ii.thumburl || ii.url, page: ii.descriptionurl, license: (md.LicenseShortName && md.LicenseShortName.value) || '', artist: strip(md.Artist && md.Artist.value) });
    });
    if (out.length >= 3) break;
  }
  return out.slice(0, 9);
}
async function setImageFromCandidate(n, c, auto) {
  const r = await fetch(c.thumb); if (!r.ok) throw new Error('img ' + r.status);
  const k = await putBlob(await r.blob());
  if (!auto) edit();
  n.img = k; n.imgCredit = { title: c.title, page: c.page, license: c.license, artist: c.artist, auto: !!auto };
  save(); renderNodes(); if (curNodeId === n.id) renderCover(n);
}
async function autoImage(n, quiet) {
  if (!n.en) return;
  try {
    const res = await commonsSearch(n.en);
    if (!res.length) { if (!quiet) toast('画像の候補が見つかりませんでした'); return; }
    await setImageFromCandidate(n, res[0], true); if (!quiet) toast('画像を自動で付けました（内容を確認してください）');
  } catch (e) { if (!quiet) toast('画像を取得できませんでした（オフライン？）'); }
}

/* ---------- 画像（カバー・写真） ---------- */
async function renderCover(n, soft) {
  const box = $('#cbox'); if (!box || curNodeId !== n.id) return; const ro = board.locked;
  const cv = coverOf(n), nm = (n.en || n.title || '').trim();
  const gl = matchGloss(n.title, 1)[0], q = n.en || (gl && gl.en) || n.title.trim();
  if (soft) { const a = box.querySelector('.ext'); if (a) { box.querySelector('#gimg').href = 'https://www.google.com/search?tbm=isch&q=' + encodeURIComponent(q + ' jiu-jitsu'); box.querySelector('#yts').href = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q + ' jiu-jitsu technique'); return; } }
  const cr = n.img && n.imgCredit;
  box.innerHTML = `<label>画像</label>${cv ? '<img class="cover" id="cimg" alt="">' : '<div class="vname">まだ画像がありません。下のボタンで探せます。</div>'}
  ${cr ? `<div class="vname">${cr.auto ? '⚠︎ 自動で付けた画像です。内容が合っているか確認してください。<br>' : ''}出典：Wikimedia Commons「${esc(cr.title)}」${cr.artist ? ' / ' + esc(cr.artist) : ''}${cr.license ? '（' + esc(cr.license) + '）' : ''} <a href="${esc(safeUrl(cr.page))}" target="_blank" rel="noopener noreferrer">ページ</a></div>` : ''}
  <div class="btns">${ro ? '' : '<button id="cfind" class="sm">🖼 画像を探す</button><button id="cphoto" class="sm">📷 写真を追加</button>'}${!ro && n.img ? '<button id="crm" class="sm danger">カバーを外す</button>' : ''}
  ${q ? `<a class="ext" id="gimg" href="https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q + ' jiu-jitsu')}" target="_blank" rel="noopener noreferrer"><button class="sm" type="button">Google画像検索 ↗</button></a><a class="ext" id="yts" href="https://www.youtube.com/results?search_query=${encodeURIComponent(q + ' jiu-jitsu technique')}" target="_blank" rel="noopener noreferrer"><button class="sm" type="button">YouTube検索 ↗</button></a>` : ''}</div>
  <div id="cand"></div>
  ${n.photos.length ? '<label style="margin-top:10px">追加した写真（タップで拡大）</label><div class="grid" id="pgrid"></div>' : ''}`;
  if (cv) { const im = $('#cimg'); if (cv.url) im.src = cv.url; else blobUrl(cv.key).then(u => { if (u) im.src = u; }); }
  n.photos.forEach(k => { const im = document.createElement('img'); im.alt = ''; blobUrl(k).then(u => { if (u) im.src = u; }); im.onclick = () => openViewer(n, k); $('#pgrid').appendChild(im); });
  if (!ro) {
    $('#cfind').onclick = () => findImages(n, q);
    $('#cphoto').onclick = async () => {
      const files = await pickFile('image/*', true); if (!files.length) return;
      toast('写真を保存中…');
      for (const f of files) { try { const k = await putBlob(await resizeImage(f)); edit(); n.photos.push(k); if (!n.img) { n.img = k; n.imgCredit = null; } } catch (e) { toast('この写真は読み込めませんでした'); } }
      save(); renderCover(n); renderNodes();
    };
    const rm = $('#crm'); if (rm) rm.onclick = () => { edit(); n.img = null; n.imgCredit = null; renderCover(n); renderNodes(); };
  }
}
async function findImages(n, q) {
  if (!q) { toast('先に技の名前を入れてください'); return; }
  const box = $('#cand'); box.innerHTML = '<div class="vname">Wikimedia Commons を検索中…（技の名前だけが送信されます）</div>';
  try {
    const res = await commonsSearch(q);
    if (!res.length) { box.innerHTML = '<div class="vname">候補が見つかりませんでした。「Google画像検索」や「写真を追加」をお使いください。</div>'; return; }
    box.innerHTML = '<div class="vname">合うものをタップ（Wikimedia Commons のフリー画像です）</div><div class="grid">' + res.map((r, i) => `<img data-i="${i}" src="${esc(r.thumb)}" alt="">`).join('') + '</div>';
    box.querySelectorAll('img').forEach(im => im.onclick = async () => {
      box.innerHTML = '<div class="vname">保存中…</div>';
      try { await setImageFromCandidate(n, res[+im.dataset.i], false); } catch (e) { toast('画像を取得できませんでした'); }
    });
  } catch (e) { box.innerHTML = '<div class="vname">取得できませんでした（オフラインの可能性）。</div>'; }
}
async function openViewer(n, key) {
  const v = $('#viewer'), u = await blobUrl(key); if (!u) return; const ro = board.locked;
  v.innerHTML = `<img src="${u}" alt=""><div class="btns">${ro ? '' : '<button id="vcov">カバーにする</button><button id="vdel" class="danger">削除</button>'}<button id="vcl" class="primary">閉じる</button></div>`;
  v.style.display = 'flex';
  const close = () => { v.style.display = 'none'; v.innerHTML = ''; };
  $('#vcl').onclick = close;
  if (!ro) {
    $('#vcov').onclick = () => { edit(); n.img = key; n.imgCredit = null; close(); renderCover(n); renderNodes(); };
    $('#vdel').onclick = () => { if (!confirm('この写真を削除しますか？')) return; edit(); n.photos = n.photos.filter(x => x !== key); if (n.img === key) { n.img = null; n.imgCredit = null; } close(); renderCover(n); renderNodes(); };
  }
}

/* ---------- 動画 ---------- */
function closeAllPlayers() {
  document.querySelectorAll('#sheet .phost').forEach(h => { const v = h.querySelector('video'); if (v) v.pause(); h.innerHTML = ''; });
  playerUrls.forEach(u => URL.revokeObjectURL(u)); playerUrls = [];
}
function renderMarks(n, src, box, seek) {
  const ms = n.marks.filter(m => m.src === src).sort((a, b) => a.t - b.t);
  box.innerHTML = ms.map(m => `<div class="mk" data-m="${m.id}"><button class="go sm">🔖 ${fmtT(m.t)}　${esc(m.text) || '（メモなし）'}</button><button class="sm danger md">✕</button></div>`).join('');
  box.querySelectorAll('.mk').forEach(el => {
    const m = n.marks.find(x => x.id === el.dataset.m);
    el.querySelector('.go').onclick = () => seek(m.t);
    el.querySelector('.md').onclick = () => { if (!confirm('このしおりを削除しますか？')) return; edit(); n.marks = n.marks.filter(x => x !== m); renderMarks(n, src, box, seek); };
  });
}
async function openPlayer(n, v, host, file) {
  closeAllPlayers();
  const blob = file || await DB.get('videos', v.vid);
  if (!blob) { toast('動画が見つかりません'); return; }
  const url = URL.createObjectURL(blob); playerUrls.push(url);
  const src = 'v:' + v.id; let A = null, B = null;
  host.innerHTML = `<video controls playsinline preload="metadata" src="${url}" style="margin-top:8px"></video>
  <div class="btns" style="margin-top:8px">${[0.5, 0.75, 1, 1.5, 2].map(s => `<button class="sm sp ${s === 1 ? 'on' : ''}" data-s="${s}">${s}×</button>`).join('')}</div>
  <div class="btns" style="margin-top:8px;align-items:center"><button class="sm pa">A点</button><button class="sm pb">B点</button><button class="sm pc">ループ解除</button><span class="vname pl"></span></div>
  <div class="btns" style="margin-top:8px"><button class="sm pm">🔖 ここにしおり</button></div><div class="mks"></div>`;
  const vid = host.querySelector('video'), pl = host.querySelector('.pl'), mks = host.querySelector('.mks');
  const upd = () => { pl.textContent = (A != null ? 'A ' + fmtT(A) : '') + (B != null ? '　B ' + fmtT(B) : '') + (A != null && B != null && A < B ? '　🔁ループ中' : ''); };
  vid.addEventListener('timeupdate', () => { if (A != null && B != null && A < B && vid.currentTime >= B) vid.currentTime = A; });
  host.querySelectorAll('.sp').forEach(b => b.onclick = () => { vid.playbackRate = +b.dataset.s; host.querySelectorAll('.sp').forEach(x => x.classList.toggle('on', x === b)); });
  host.querySelector('.pa').onclick = () => { A = vid.currentTime; upd(); };
  host.querySelector('.pb').onclick = () => { B = vid.currentTime; upd(); };
  host.querySelector('.pc').onclick = () => { A = B = null; upd(); };
  const seek = t => { vid.currentTime = t; vid.play().catch(() => { }); };
  host.querySelector('.pm').onclick = () => {
    const t = vid.currentTime, txt = prompt(`しおりのメモ（${fmtT(t)}）`, ''); if (txt === null) return;
    edit(); n.marks.push({ id: uid(), src, t, text: txt }); renderMarks(n, src, mks, seek);
  };
  renderMarks(n, src, mks, seek);
}
async function renderVideos(n) {
  const box = $('#vbox'); if (!box || curNodeId !== n.id) return; const ro = board.locked;
  closeAllPlayers();
  const oks = []; for (const v of n.videos) oks.push(v.kind === 'ref' || await DB.has('videos', v.vid));
  if (curNodeId !== n.id) return;
  box.innerHTML = '<label>動画（端末内のファイル）</label>' + n.videos.map((v, i) => `<div class="box" data-v="${v.id}"><div class="t">🎬 ${esc(v.name)} <span style="color:var(--sub);font-size:12px">${v.kind === 'copy' ? (oks[i] ? '取り込み済' : '<span style="color:var(--danger)">見つかりません</span>') : '参照のみ'}</span></div>
    <div class="btns"><button class="sm vplay">${v.kind === 'copy' && !oks[i] ? '選び直す' : '▶ 再生' + (v.kind === 'ref' ? '（ファイルを選ぶ）' : '')}</button>${ro ? '' : '<button class="sm danger vrm">外す</button>'}</div><div class="phost"></div></div>`).join('') +
    (ro ? '' : '<div class="btns"><button id="vadd">🎬 取り込む（端末内にコピー）</button><button id="vref">📎 名前だけ記録</button></div><div class="vname">取り込む：オフラインですぐ再生できるが、保存容量を使う。名前だけ：容量は使わないが、再生のたびにファイルを選ぶ。</div>');
  box.querySelectorAll('.box').forEach((el, i) => {
    const v = n.videos[i], host = el.querySelector('.phost');
    el.querySelector('.vplay').onclick = () => {
      if (v.kind === 'ref') { pickFile('video/*').then(([f]) => { if (!f) return; if (f.name !== v.name && !confirm(`記録した名前（${v.name}）と違うファイルです。再生しますか？`)) return; openPlayer(n, v, host, f); }); }
      else if (!oks[i]) { pickFile('video/*').then(async ([f]) => { if (!f) return; v.vid = await putBlob(f); v.name = f.name; save(); renderVideos(n); }); }
      else openPlayer(n, v, host);
    };
    const rm = el.querySelector('.vrm');
    if (rm) rm.onclick = () => {
      if (!confirm('この動画を外します。（「↶」で元に戻せます。取り込んだ動画のデータは、しばらくしてから自動で整理されます）')) return;
      edit(); n.videos = n.videos.filter(x => x !== v); n.marks = n.marks.filter(m => m.src !== 'v:' + v.id);
      if (!n.videos.length && n.thumb) n.thumb = null;
      renderVideos(n); renderCover(n); renderNodes();
    };
  });
  const add = async kind => {
    const files = await pickFile('video/*', true); if (!files.length) return;
    let i = 0;
    for (const f of files) {
      i++; if (kind === 'copy') toast(`端末内に保存中 ${i}/${files.length}…`);
      try {
        const v = { id: uid(), kind, name: f.name };
        if (kind === 'copy') v.vid = await putBlob(f);
        edit(); n.videos.push(v);
        if (!n.thumb) { const p = await makePoster(f); if (p) n.thumb = await putBlob(p); }
        save();
      } catch (err) { alert('動画を保存できませんでした（容量不足の可能性）: ' + err); break; }
    }
    renderVideos(n); renderCover(n); renderNodes();
  };
  if (!ro) { $('#vadd').onclick = () => add('copy'); $('#vref').onclick = () => add('ref'); }
}

/* ---------- リンク（YouTubeなど） ---------- */
function showEmbed(l, host, start) {
  host.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${l.yt.id}?start=${Math.floor(start || 0)}&playsinline=1&rel=0${start ? '&autoplay=1' : ''}" allow="fullscreen; picture-in-picture; encrypted-media; autoplay" allowfullscreen style="width:100%;aspect-ratio:16/9;border:0;border-radius:10px;background:#000;margin:8px 0"></iframe>`;
}
function renderLinks(n) {
  const box = $('#lbox'); if (!box || curNodeId !== n.id) return; const ro = board.locked;
  box.innerHTML = '<label>リンク（YouTubeなど）</label>' + n.links.map(l => {
    const name = l.label || (l.yt ? 'YouTube動画' : (() => { try { return new URL(l.url).hostname; } catch { return l.url; } })());
    return `<div class="box lk" data-id="${l.id}"><div class="t">${l.yt ? '▶︎ ' : '🔗 '}${esc(name)}</div>
      <div class="btns">${l.yt ? '<button class="sm lemb">埋め込み再生</button><button class="sm lmk">🔖 しおり追加</button>' : ''}<a href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener noreferrer"><button class="sm" type="button">${l.yt ? 'YouTubeで開く' : '開く'}</button></a>${ro ? '' : '<button class="sm danger ldel">削除</button>'}</div>
      <div class="lplay"></div><div class="lmks"></div></div>`;
  }).join('') + (ro ? '' : `<input type="text" id="lu" placeholder="URLを貼り付け（youtube.com など）" inputmode="url" autocapitalize="off" autocorrect="off" style="margin-bottom:8px">
  <input type="text" id="ll" placeholder="ラベル（任意）例：ヒップバンプ解説" style="margin-bottom:8px"><button id="ladd">リンクを追加</button>
  <div class="vname">YouTubeの埋め込み再生・サムネイル表示はネット接続が必要で、そのときだけYouTubeに通信します。</div>`);
  box.querySelectorAll('.lk').forEach(el => {
    const l = n.links.find(x => x.id === el.dataset.id), host = el.querySelector('.lplay'), mk = el.querySelector('.lmks');
    if (l.yt) {
      const src = 'l:' + l.id, seek = t => showEmbed(l, host, t);
      const draw = () => renderMarks(n, src, mk, seek); draw();
      el.querySelector('.lemb').onclick = () => { if (host.firstChild) host.innerHTML = ''; else showEmbed(l, host, l.yt.start); };
      el.querySelector('.lmk').onclick = () => {
        const ts = prompt('しおりの時間（例 3:20）'); if (ts === null) return; const t = parseTime(ts); if (t === null) { toast('時間の形式が正しくありません'); return; }
        const txt = prompt('メモ（例：入り方）', ''); if (txt === null) return;
        edit(); n.marks.push({ id: uid(), src, t, text: txt }); draw();
      };
    }
    const d = el.querySelector('.ldel');
    if (d) d.onclick = () => { if (!confirm('このリンクを削除しますか？')) return; edit(); n.links = n.links.filter(x => x !== l); n.marks = n.marks.filter(m => m.src !== 'l:' + l.id); renderLinks(n); renderCover(n); renderNodes(); };
  });
  if (!ro) $('#ladd').onclick = () => {
    const u = $('#lu').value.trim(); if (!u) return;
    let url; try { url = new URL(/^https?:\/\//i.test(u) ? u : 'https://' + u).href; } catch { alert('URLの形式が正しくありません'); return; }
    edit(); n.links.push({ id: uid(), url, label: $('#ll').value.trim(), yt: ytInfo(url) }); renderLinks(n); renderCover(n); renderNodes();
  };
}

/* ---------- 別のフローチャートへのリンク ---------- */
function renderBoardLink(n) {
  const box = $('#bbox'); if (!box || curNodeId !== n.id) return; const ro = board.locked;
  const cur = state.boards.find(b => b.id === n.boardLink), others = state.boards.filter(b => b.id !== board.id);
  if (ro && !cur) { box.innerHTML = ''; return; }
  box.innerHTML = `<label>別のフローチャートへのリンク</label>${ro ? '' : `<select id="bls"><option value="">（なし）</option>${others.map(b => `<option value="${b.id}" ${b.id === n.boardLink ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select>`}
  ${cur ? `<div class="btns" style="margin-top:8px"><button id="bgo" class="primary">↗ 「${esc(cur.name)}」を開く</button></div>` : ''}`;
  if (!ro) $('#bls').onchange = e => { edit(); n.boardLink = e.target.value || null; renderBoardLink(n); };
  if (cur) $('#bgo').onclick = () => { closeSheet(); openBoard(cur.id, 'link'); };
}
/* ================= 用語辞典 / 設定 / バックアップ / ロック / 起動 ================= */

/* ---------- 用語辞典 ---------- */
function openGlossary(addMode) {
  openSheet(`<div class="row"><label>用語辞典（${GLOSSARY.length}語）：名前・英語名で検索。タップで説明</label><input type="text" id="gq" placeholder="例：三角 / armbar / ベリンボロ"></div><div id="gres"></div><div class="btns"><button id="bok" class="primary">閉じる</button></div>`);
  $('#bok').onclick = closeSheet;
  const run = () => {
    const q = $('#gq').value.trim(), list = q ? matchGloss(q, 30) : GLOSSARY, box = $('#gres');
    if (!list.length) { box.innerHTML = '<div class="vname">見つかりませんでした。</div>'; return; }
    box.innerHTML = list.map((g, i) => `<div class="box gd" data-i="${i}"><div><b>${esc(g.jp)}</b> <span style="color:var(--sub)">${esc(g.en)}</span><span class="k">${g.kind}</span></div><div class="det" style="display:none"><div style="margin:8px 0">${esc(g.desc)}</div>
      <div class="btns"><a href="https://www.google.com/search?tbm=isch&q=${encodeURIComponent(g.en + ' jiu-jitsu')}" target="_blank" rel="noopener noreferrer"><button class="sm" type="button">Google画像検索 ↗</button></a><a href="https://www.youtube.com/results?search_query=${encodeURIComponent(g.en + ' jiu-jitsu technique')}" target="_blank" rel="noopener noreferrer"><button class="sm" type="button">YouTube検索 ↗</button></a>${addMode ? '<button class="sm primary gadd">このフローチャートに追加</button>' : ''}</div></div></div>`).join('');
    box.querySelectorAll('.gd').forEach(el => {
      const g = list[+el.dataset.i];
      el.onclick = ev => { if (ev.target.closest('button,a')) return; const d = el.querySelector('.det'); d.style.display = d.style.display === 'none' ? 'block' : 'none'; };
      const a = el.querySelector('.gadd');
      if (a) a.onclick = () => {
        const n = addNodeAtCenter({ title: g.jp, en: g.en, memo: g.desc, color: KC()[g.kind] || COLORS[0][0] });
        closeSheet(); toast(`「${g.jp}」を追加しました。画像を探しています…`); autoImage(n);
      };
    });
  };
  $('#gq').oninput = run; run();
}

/* ---------- 設定 ---------- */
async function showSettings() {
  const est = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : null;
  const per = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : null;
  const mb = x => Math.round(x / 1048576);
  openSheet(`
  <div class="row"><label>🔒 暗証番号ロック</label><div class="btns"><button id="spin">${settings.pin ? '暗証番号を変更' : '暗証番号を設定'}</button>${settings.pin ? '<button id="spoff" class="danger">解除</button>' : ''}</div>
    <div class="vname">アプリを開いたとき、1分以上離れて戻ったときに4桁の番号を聞きます。画面を隠すだけで、データの暗号化ではありません。忘れた場合は全データを消去しないと解除できません。</div></div>
  <div class="row"><label>💾 バックアップ（機種変更・万一のとき用）</label><div class="btns"><button id="bfull">動画ごと書き出す</button><button id="bjson">構成・メモだけ書き出す</button><button id="bimp">読み込む</button></div>
    <div class="vname">「動画ごと」は大きなファイルになることがあります。書き出したファイルは「ファイル」アプリなどに保存してください。読み込みは、今のデータに追加されます。</div></div>
  <div class="row"><label>🕘 自動バックアップ</label><button id="bauto">一覧を見る・復元する</button></div>
  <div class="row"><label>保存容量</label><div class="vname">${est ? `使用中 約${mb(est.usage)}MB ／ 目安上限 約${mb(est.quota)}MB` : '取得できません'}${per === false ? '<br>※ブラウザが容量確保のために削除する可能性があります。ホーム画面のアイコンから使ってください。' : ''}</div><button id="bgc" class="sm">使われていない動画・画像データを整理</button></div>
  <div class="row"><label>アプリ情報</label><div class="vname">BJJフロー v${APP_VERSION}</div></div>
  <div class="btns"><button id="bwipe" class="danger">全データを消去</button><button id="bok" class="primary" style="margin-left:auto">閉じる</button></div>`);
  $('#bok').onclick = closeSheet;
  $('#spin').onclick = setPinSheet;
  const off = $('#spoff'); if (off) off.onclick = async () => { if (!confirm('暗証番号ロックを解除しますか？')) return; delete settings.pin; await saveSettings(); toast('解除しました'); showSettings(); };
  $('#bfull').onclick = exportFull; $('#bjson').onclick = exportJson;
  $('#bimp').onclick = () => { pickFile('', false).then(async ([f]) => { if (!f) return; try { await importAny(f); } catch (e) { alert('読み込めませんでした: ' + (e && e.message || e)); } }); };
  $('#bauto').onclick = showBackups;
  $('#bgc').onclick = async () => { const n = await gc(); toast(n ? `${n}件の不要なデータを整理しました` : '整理するデータはありません'); showSettings(); };
  $('#bwipe').onclick = async () => {
    if (!confirm('すべてのフローチャート・動画・バックアップをこの端末から消去します。元に戻せません。よろしいですか？')) return;
    if (!confirm('本当に消去しますか？')) return; await wipeAll();
  };
}
async function wipeAll() {
  try { DB.db.close(); } catch { }
  await new Promise(r => { const q = indexedDB.deleteDatabase('bjjflow'); q.onsuccess = q.onerror = q.onblocked = () => r(); });
  location.reload();
}

/* ---------- 自動バックアップの一覧 ---------- */
async function showBackups() {
  const list = (await DB.get('kv', 'backups')) || [];
  const rows = list.length ? list.map((b, i) => {
    const d = new Date(b.t), nb = b.data.boards.length, nn = b.data.boards.reduce((a, x) => a + (x.nodes || []).length, 0);
    return `<div class="card" data-i="${i}"><div style="flex:1;min-width:0"><div class="nm" style="font-size:14px">${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}　${esc(b.label)}</div><div class="meta">フローチャート ${nb} ・ 技 ${nn}</div></div><button class="sm">復元</button></div>`;
  }).join('') : '<div class="vname">まだバックアップがありません。</div>';
  openSheet(`<div class="row"><label>自動バックアップ（構成・メモ・しおりのみ。動画そのものは対象外）</label>${rows}</div><div class="vname">復元すると今のデータは置き換わります。復元前の状態も自動で1件保存されます。</div><div class="btns"><button id="bok" class="primary">閉じる</button></div>`);
  $('#bok').onclick = closeSheet;
  document.querySelectorAll('#sheet .card button').forEach(btn => btn.onclick = async () => {
    const b = list[+btn.closest('.card').dataset.i];
    if (!confirm('このバックアップに戻します。よろしいですか？')) return;
    await snapshot('復元前の状態');
    state = normalize(JSON.parse(JSON.stringify(b.data))); await saveNow(); closeSheet(); board = null; renderList(); show('vList'); toast('復元しました');
  });
}

/* ---------- 書き出し / 読み込み ---------- */
async function exportJson() {
  const st = JSON.parse(JSON.stringify(state));
  st.boards.forEach(b => b.nodes.forEach(n => { n.videos = n.videos.map(v => ({ ...v, vid: null })); n.thumb = null; n.img = null; n.imgCredit = null; n.photos = []; }));
  await shareOrDownload(new File([JSON.stringify({ app: 'bjjflow', format: 1, boards: st.boards }, null, 1)], `bjjflow-${dateStr()}.json`, { type: 'application/json' }));
}
async function exportFull() {
  toast('書き出しを準備中…（動画が多いと時間がかかります）');
  const refs = new Set(); collectRefs(state, refs); const meta = [], parts = [];
  for (const k of refs) { const b = await DB.get('videos', k); if (b) { meta.push({ key: k, size: b.size, type: b.type }); parts.push(b); } }
  const header = new TextEncoder().encode(JSON.stringify({ app: 'bjjflow', format: 2, state, blobs: meta }));
  const len = new Uint8Array(4); new DataView(len.buffer).setUint32(0, header.length);
  await shareOrDownload(new File(['BJJBAK01', len, header, ...parts], `bjjflow-full-${dateStr()}.bjjbak`, { type: 'application/octet-stream' }));
}
function remapState(st, remap) {
  const bmap = {}; st.boards.forEach(b => { const nid = uid(); bmap[b.id] = nid; b.id = nid; });
  st.boards.forEach(b => (b.nodes || []).forEach(n => {
    n.thumb = remap[n.thumb] || null; n.img = remap[n.img] || null; if (!n.img) n.imgCredit = null;
    n.photos = (n.photos || []).map(p => remap[p]).filter(Boolean);
    n.videos = (n.videos || []).map(v => { if (v.kind === 'copy') { if (remap[v.vid]) v.vid = remap[v.vid]; else { v.kind = 'ref'; delete v.vid; } } return v; });
    delete n.videoId; n.boardLink = bmap[n.boardLink] || null;
  }));
}
async function importAny(file) {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const magic = new TextDecoder().decode(head.slice(0, 8)); let st, remap = {};
  if (magic === 'BJJBAK01') {
    const hl = new DataView(head.buffer, 8, 4).getUint32(0);
    const hdr = JSON.parse(await file.slice(12, 12 + hl).text());
    if (hdr.app !== 'bjjflow' || !hdr.state) throw new Error('形式が違います');
    if (!confirm(`${hdr.state.boards.length}件のフローチャートと動画${hdr.blobs.length}個を、今のデータに追加で読み込みます。`)) return;
    toast('読み込み中…'); let off = 12 + hl;
    for (const b of hdr.blobs) { const nk = uid(); await DB.put('videos', nk, file.slice(off, off + b.size, b.type)); remap[b.key] = nk; off += b.size; }
    st = hdr.state;
  } else {
    st = JSON.parse(await file.text()); if (st.app !== 'bjjflow' || !Array.isArray(st.boards)) throw new Error('形式が違います');
    if (!confirm(`${st.boards.length}件のフローチャートを、今のデータに追加で読み込みます（動画は含まれません）。`)) return;
  }
  remapState(st, remap); st = normalize(st);
  await snapshot('読み込み前の状態');
  st.boards.forEach(b => state.boards.push(b)); await saveNow(); closeSheet(); renderList(); toast('読み込みました');
}

/* ---------- 暗証番号ロック ---------- */
let pinBuf = '', pinFail = 0, pinBlock = 0, hiddenAt = 0, lockedNow = false;
async function sha256(s) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join(''); }
function drawDots() { const d = $('#ldots'); if (d) d.textContent = '●'.repeat(pinBuf.length) + '○'.repeat(4 - pinBuf.length); }
function lockMsg(t) { const m = $('#lmsg'); if (m) m.textContent = t; }
function hideLock() { $('#lock').style.display = 'none'; $('#lock').innerHTML = ''; lockedNow = false; }
function showLock(cover) {
  const el = $('#lock'); el.style.display = 'flex';
  if (cover) { if (!lockedNow) el.innerHTML = '<div class="lt">BJJフロー</div>'; return; }
  lockedNow = true; pinBuf = '';
  el.innerHTML = `<div class="lt">BJJフロー</div><div class="vname" id="lmsg">暗証番号を入力</div><div class="dots" id="ldots"></div>
  <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map(k => k === '' ? '<span></span>' : `<button data-k="${k}">${k}</button>`).join('')}</div><button class="sm" id="lforget" style="margin-top:10px">暗証番号を忘れた</button>`;
  drawDots();
  el.querySelectorAll('.pad button').forEach(b => b.onclick = () => pinKey(b.dataset.k));
  $('#lforget').onclick = async () => { if (confirm('暗証番号は復元できません。全データを消去してロックを解除しますか？') && confirm('本当に全データを消去しますか？')) await wipeAll(); };
}
async function pinKey(k) {
  if (Date.now() < pinBlock) { lockMsg(`あと${Math.ceil((pinBlock - Date.now()) / 1000)}秒お待ちください`); return; }
  if (k === '⌫') pinBuf = pinBuf.slice(0, -1); else if (pinBuf.length < 4) pinBuf += k;
  drawDots();
  if (pinBuf.length === 4) {
    const h = await sha256(settings.pin.salt + pinBuf);
    if (h === settings.pin.hash) { pinFail = 0; hideLock(); }
    else { pinFail++; pinBuf = ''; drawDots(); if (pinFail >= 5) { pinBlock = Date.now() + 30000; pinFail = 0; lockMsg('5回まちがえました。30秒お待ちください'); } else lockMsg('ちがいます'); }
  }
}
function setPinSheet() {
  openSheet(`<div class="row"><label>新しい暗証番号（数字4桁）</label><input type="tel" id="p1" maxlength="4" inputmode="numeric" placeholder="••••"></div>
  <div class="row"><label>もう一度</label><input type="tel" id="p2" maxlength="4" inputmode="numeric" placeholder="••••"></div>
  <div class="vname">忘れると、全データを消去しないと解除できません。必ずバックアップを取ってから設定してください。</div>
  <div class="btns"><button id="psave" class="primary">設定する</button><button id="bok">キャンセル</button></div>`);
  $('#bok').onclick = closeSheet;
  $('#psave').onclick = async () => {
    const a = $('#p1').value.trim(), b = $('#p2').value.trim();
    if (!/^\d{4}$/.test(a)) { toast('数字4桁で入力してください'); return; } if (a !== b) { toast('2回の入力が一致しません'); return; }
    const salt = uid() + uid(); settings.pin = { salt, hash: await sha256(salt + a) }; await saveSettings(); closeSheet(); toast('暗証番号を設定しました');
  };
}
document.addEventListener('visibilitychange', () => {
  if (!settings.pin) return;
  if (document.hidden) { hiddenAt = Date.now(); showLock(true); }
  else if (lockedNow || Date.now() - hiddenAt > 60000) showLock(false); else hideLock();
});

/* ---------- 起動 ---------- */
(async function init() {
  try {
    await DB.open();
    const raw = await DB.get('kv', 'state');
    state = raw && Array.isArray(raw.boards) ? raw : { schema: 2, boards: [] };
    settings = (await DB.get('kv', 'settings')) || {};
    if (settings.pin) showLock(false);
    await autoBackup();            // 変換する前の状態を先にバックアップ
    state = normalize(state); await saveNow();
    await gc();
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
  } catch (e) { alert('この環境では保存機能が使えません: ' + e); }
  renderList();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
})();
