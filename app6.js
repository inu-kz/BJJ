'use strict';
/* ================= BJJフロー v6 ================= */
const APP_VERSION = 6;
window.__ver_app = APP_VERSION;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const fmtT = t => { t = Math.max(0, Math.floor(t || 0)); const h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = t % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0'); };
const parseTime = str => {
  str = String(str ?? '').trim(); if (!str) return null;
  if (/^\d+$/.test(str)) return +str;
  const p = str.split(':').map(Number); if (p.some(x => !isFinite(x)) || p.length > 3) return null;
  return p.reduce((a, x) => a * 60 + x, 0);
};
const safeUrl = u => /^https?:\/\//i.test(String(u || '')) ? String(u) : '#';
const dateStr = () => new Date().toISOString().slice(0, 10);

const KINDS = ['ポジション', 'スイープ', 'パス', 'サブミッション', 'エスケープ', 'テイクダウン', 'その他'];
const KIND_VAR = { 'ポジション': '--k-pos', 'スイープ': '--k-sweep', 'パス': '--k-pass', 'サブミッション': '--k-sub', 'エスケープ': '--k-esc', 'テイクダウン': '--k-td', 'その他': '--k-etc' };
const kc = k => `var(${KIND_VAR[k] || '--k-etc'})`;
const glossKind = k => KINDS.includes(k) ? k : 'その他';
const OLD_COLOR_KIND = { '#4f8cff': 'ポジション', '#3ecf8e': 'スイープ', '#ff5d5d': 'サブミッション', '#f5a524': 'エスケープ', '#b07cff': 'その他' };
const MASTERY = ['未習得', '練習中', '使える'];
const SIDE_LABEL = { bottom: '下から', top: '上から' };
const other = s => s === 'top' ? 'bottom' : 'top';
const NW = 184;

/* ---------- 線画アイコン ---------- */
const IC = {
  back: '<path d="M15 5l-7 7 7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  undo: '<path d="M9 7L4.5 11.5 9 16"/><path d="M5 11.5h9.5a4.5 4.5 0 010 9H12"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 018 0v2.5"/>',
  unlock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 017.6-1.8"/>',
  more: '<circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="M16 10.5l5-3v9l-5-3z"/>',
  link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
  note: '<path d="M6 3.5h8.5L19 8v12.5H6z"/><path d="M14 3.5V8h5M9 12.5h7M9 16h5"/>',
  photo: '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="M20.5 15.5l-4.5-4.5-8.5 8"/>',
  play: '<path d="M8 5.5v13l11-6.5z"/>',
  bookmark: '<path d="M7 4h10v16l-5-3.5L7 20z"/>',
  trash: '<path d="M4.5 7h15M10 11v6M14 11v6M6.5 7l1 13h9l1-13M9.5 7V4.5h5V7"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  map: '<path d="M3.5 6.5L9 4l6 2.5L20.5 4v13.5L15 20l-6-2.5-5.5 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
  book: '<path d="M5 4.5h10a3 3 0 013 3V20H8a3 3 0 01-3-3z"/><path d="M5 17a3 3 0 013-3h10"/>',
  cards: '<rect x="3.5" y="7.5" width="12.5" height="13" rx="2"/><path d="M8 7.5V5.5a2 2 0 012-2h8.5a2 2 0 012 2v9a2 2 0 01-2 2H16"/>',
  sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5.5H4.5V6H10"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  right: '<path d="M9 6l6 6-6 6"/>',
  up: '<path d="M6 15l6-6 6 6"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
  connect: '<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M7.6 16.4l8.8-8.8"/>',
  shield: '<path d="M12 3.5l7 2.5v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/>',
  tree: '<rect x="9" y="3.5" width="6" height="4.5" rx="1"/><rect x="3.5" y="16" width="6" height="4.5" rx="1"/><rect x="14.5" y="16" width="6" height="4.5" rx="1"/><path d="M12 8v4M6.5 16v-4h11v4"/>',
  share: '<path d="M12 15V3.5M7.5 8L12 3.5 16.5 8M5 12v7.5h14V12"/>',
  download: '<path d="M12 3.5V15M7.5 10.5L12 15l4.5-4.5M5 19.5h14"/>',
  folder: '<path d="M3.5 7a2 2 0 012-2h4l2 2.5h7a2 2 0 012 2V18a2 2 0 01-2 2h-13a2 2 0 01-2-2z"/>',
  help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.5a2.5 2.5 0 114.1 1.9c-.9.6-1.7 1.2-1.7 2.4M12 16.8v.2"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  layers: '<path d="M12 4l8.5 4.5L12 13 3.5 8.5z"/><path d="M3.5 12.5L12 17l8.5-4.5M3.5 16.5L12 21l8.5-4.5"/>',
  sparkle: '<path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5l2.5 2.5M15 15l2.5 2.5M6.5 17.5L9 15M15 9l2.5-2.5"/>',
  broom: '<path d="M14 4l6 6M12.5 8.5l3 3M4 20l3.5-7.5 4 4z"/>',
  key: '<circle cx="8" cy="15" r="3.5"/><path d="M10.5 12.5L19 4M16 7l2.5 2.5"/>',
  swap: '<path d="M7 4.5L4 7.5l3 3M4 7.5h13M17 13.5l3 3-3 3M20 16.5H7"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5s1-6 3.5-8.5z"/>',
};
const icon = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${IC[n] || ''}</svg>`;

/* ---------- 小道具 ---------- */
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.style.display = 'block'; clearTimeout(toastT); toastT = setTimeout(() => t.style.display = 'none', 2600); }
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
  if (!key) return null;
  if (urlCache.has(key)) return urlCache.get(key);
  const b = await DB.get('videos', key); if (!b) return null;
  const u = URL.createObjectURL(b); urlCache.set(key, u); return u;
}

/* ---------- 画像・動画の下ごしらえ ---------- */
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

/* ================= データ ================= */
let state = { schema: 3, techs: {}, boards: [] };
let settings = {};
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => DB.put('kv', 'state', JSON.parse(JSON.stringify(state))).catch(e => alert('保存できませんでした: ' + e)), 250);
}
async function saveNow() { clearTimeout(saveTimer); await DB.put('kv', 'state', JSON.parse(JSON.stringify(state))); }
async function saveSettings() { await DB.put('kv', 'settings', settings); }

function blankTech(init) {
  return Object.assign({
    id: uid(), title: '', en: '', kind: 'ポジション', memo: '', mastery: 0, videos: [], marks: [], links: [], photos: [],
    img: null, imgCredit: null, thumb: null, lastPracticed: null, practiceCount: 0, quiz: { ok: 0, ng: 0 }, counters: []
  }, init || {});
}
const blankSide = () => ({ nodes: [], edges: [], view: { x: 20, y: 20, k: 1 } });
const blankBoard = name => ({ id: uid(), name, folder: '', side: 'bottom', sides: { bottom: blankSide(), top: blankSide() }, locked: false, snap: false, hl: false });
const validView = v => v && isFinite(v.k) && isFinite(v.x) && isFinite(v.y) && v.k > 0 ? { x: v.x, y: v.y, k: v.k } : { x: 20, y: 20, k: 1 };
const T = id => state.techs[id];

/* ---------- 旧データ（v3〜v5）からの移行 ---------- */
function techFromOld(n) {
  const videos = Array.isArray(n.videos) ? n.videos.slice() : [];
  if (n.videoId) videos.push({ id: uid(), kind: 'copy', vid: n.videoId, name: n.videoName || '動画' });
  if (n.videoRef) videos.push({ id: uid(), kind: 'ref', name: n.videoRef });
  return blankTech({
    title: n.title || '', en: n.en || '', kind: OLD_COLOR_KIND[String(n.color || '').toLowerCase()] || 'ポジション', memo: n.memo || '',
    mastery: [0, 1, 2].includes(n.mastery) ? n.mastery : 0, videos, marks: Array.isArray(n.marks) ? n.marks : [],
    links: Array.isArray(n.links) ? n.links : [], photos: Array.isArray(n.photos) ? n.photos : [],
    img: n.img || null, imgCredit: n.imgCredit || null, thumb: n.thumb || null, lastPracticed: n.lastPracticed || null,
    practiceCount: +n.practiceCount || 0, quiz: n.quiz && typeof n.quiz === 'object' ? { ok: +n.quiz.ok || 0, ng: +n.quiz.ng || 0 } : { ok: 0, ng: 0 }
  });
}
function mergeTech(a, b) {
  if (b.memo && !a.memo.includes(b.memo)) a.memo = a.memo ? a.memo + '\n\n' + b.memo : b.memo;
  if (!a.en) a.en = b.en;
  a.videos.push(...b.videos); a.marks.push(...b.marks); a.links.push(...b.links); a.photos.push(...b.photos);
  if (!a.img && b.img) { a.img = b.img; a.imgCredit = b.imgCredit; }
  if (!a.thumb) a.thumb = b.thumb;
  a.mastery = Math.max(a.mastery, b.mastery); a.practiceCount += b.practiceCount;
  if (b.lastPracticed && (!a.lastPracticed || b.lastPracticed > a.lastPracticed)) a.lastPracticed = b.lastPracticed;
  a.quiz.ok += b.quiz.ok; a.quiz.ng += b.quiz.ng;
}
function migrate(st) {
  if (!st || typeof st !== 'object') return normalize3({});
  if (st.techs && typeof st.techs === 'object') return normalize3(st);   // 技ライブラリがあれば新しい形式
  const techs = {}, byTitle = {}, out = { schema: 3, techs, boards: [] };
  (Array.isArray(st.boards) ? st.boards : []).forEach(b => {
    if (!b) return;
    const nb = { id: b.id || uid(), name: b.name || '無題', folder: b.folder || '', side: 'bottom', sides: { bottom: { nodes: [], edges: [], view: validView(b.view) }, top: blankSide() }, locked: !!b.locked, snap: !!b.snap, hl: !!b.hl };
    (Array.isArray(b.nodes) ? b.nodes : []).forEach(n => {
      if (!n) return;
      const t = techFromOld(n), key = t.title.trim(); let tid;
      if (key && byTitle[key]) { mergeTech(techs[byTitle[key]], t); tid = byTitle[key]; }
      else { techs[t.id] = t; tid = t.id; if (key) byTitle[key] = t.id; }
      nb.sides.bottom.nodes.push({ id: n.id || uid(), tid, x: +n.x || 0, y: +n.y || 0, collapsed: false, goto: n.boardLink ? { board: n.boardLink, side: 'bottom' } : null });
    });
    nb.sides.bottom.edges = (Array.isArray(b.edges) ? b.edges : []).map(e => ({ id: e.id || uid(), from: e.from, to: e.to, label: e.label || '', dash: !!e.dash }));
    out.boards.push(nb);
  });
  return normalize3(out);
}
function normalize3(st) {
  st.schema = 3;
  st.techs = st.techs && typeof st.techs === 'object' ? st.techs : {};
  st.boards = Array.isArray(st.boards) ? st.boards.filter(Boolean) : [];
  for (const [id, t0] of Object.entries(st.techs)) {
    if (!t0 || typeof t0 !== 'object') { delete st.techs[id]; continue; }
    const t = Object.assign(blankTech(), t0); t.id = id;
    t.title = String(t.title || ''); t.en = String(t.en || ''); t.memo = String(t.memo || '');
    t.kind = KINDS.includes(t.kind) ? t.kind : 'その他';
    ['videos', 'marks', 'links', 'photos', 'counters'].forEach(k => { if (!Array.isArray(t[k])) t[k] = []; });
    t.videos = t.videos.filter(Boolean); t.videos.forEach(v => { v.id = v.id || uid(); if (v.kind !== 'copy' && v.kind !== 'ref') v.kind = 'ref'; if (v.kind === 'copy' && !v.vid) v.kind = 'ref'; v.name = v.name || '動画'; });
    t.links = t.links.filter(l => l && l.url); t.links.forEach(l => { l.id = l.id || uid(); });
    t.marks = t.marks.filter(m => m && isFinite(m.t)); t.marks.forEach(m => { m.id = m.id || uid(); });
    t.mastery = [0, 1, 2].includes(t.mastery) ? t.mastery : 0;
    t.quiz = t.quiz && typeof t.quiz === 'object' ? { ok: +t.quiz.ok || 0, ng: +t.quiz.ng || 0 } : { ok: 0, ng: 0 };
    t.practiceCount = +t.practiceCount || 0;
    st.techs[id] = t;
  }
  for (const t of Object.values(st.techs)) t.counters = [...new Set(t.counters)].filter(c => c !== t.id && st.techs[c]);
  st.boards.forEach(b => { b.id = b.id || uid(); });
  const bids = new Set(st.boards.map(b => b.id));
  st.boards.forEach(b => {
    b.name = b.name || '無題'; b.folder = b.folder || ''; b.side = b.side === 'top' ? 'top' : 'bottom';
    b.locked = !!b.locked; b.snap = !!b.snap; b.hl = !!b.hl;
    b.sides = b.sides && typeof b.sides === 'object' ? b.sides : {};
    for (const s of ['bottom', 'top']) {
      const S = b.sides[s] = b.sides[s] && typeof b.sides[s] === 'object' ? b.sides[s] : blankSide();
      S.nodes = (Array.isArray(S.nodes) ? S.nodes : []).filter(n => n && st.techs[n.tid]);
      S.edges = Array.isArray(S.edges) ? S.edges : [];
      S.view = validView(S.view);
      S.nodes.forEach(n => {
        n.id = n.id || uid(); n.x = +n.x || 0; n.y = +n.y || 0; n.collapsed = !!n.collapsed;
        if (!n.goto || !bids.has(n.goto.board)) n.goto = null; else n.goto = { board: n.goto.board, side: n.goto.side === 'top' ? 'top' : 'bottom' };
      });
      const nids = new Set(S.nodes.map(n => n.id));
      S.edges = S.edges.filter(e => e && nids.has(e.from) && nids.has(e.to) && e.from !== e.to);
      S.edges.forEach(e => { e.id = e.id || uid(); e.label = e.label || ''; e.dash = !!e.dash; });
    }
  });
  return st;
}

/* ---------- 保存してある画像・動画の参照 / 掃除 ---------- */
function refsOfTech(t, set) {
  (t.videos || []).forEach(v => v && v.vid && set.add(v.vid));
  if (t.thumb) set.add(t.thumb); if (t.img) set.add(t.img);
  (t.photos || []).forEach(p => set.add(p));
}
function collectRefs(st, set) {
  if (!st) return;
  if (st.techs) Object.values(st.techs).forEach(t => t && refsOfTech(t, set));
  (st.boards || []).forEach(b => (b && b.nodes || []).forEach(n => { if (!n) return; if (n.videoId) set.add(n.videoId); refsOfTech(n, set); }));
}
async function gc() {
  const refs = new Set(); collectRefs(state, refs);
  const bk = (await DB.get('kv', 'backups')) || []; bk.forEach(b => collectRefs(b.data, refs));
  const keys = await DB.keys('videos'); let n = 0;
  for (const k of keys) if (!refs.has(k)) { await DB.del('videos', k); n++; }
  return n;
}

/* ---------- 自動バックアップ（構成とメモ） ---------- */
const MAX_BACKUPS = 8;
async function snapshot(label) {
  if (!state || !state.boards || !state.boards.length) return;
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

/* ---------- 参照の便利関数 ---------- */
function placements(tid) {
  const out = [];
  state.boards.forEach(b => ['bottom', 'top'].forEach(s => b.sides[s].nodes.forEach(n => { if (n.tid === tid) out.push({ board: b, side: s, node: n }); })));
  return out;
}
function coverOf(t) {
  if (!t) return null;
  if (t.img) return { key: t.img };
  if (t.thumb) return { key: t.thumb };
  const yl = t.links.find(l => l.yt);
  if (yl) return { url: `https://i.ytimg.com/vi/${yl.yt.id}/mqdefault.jpg` };
  return null;
}
function setImgSrc(img, cv, onFail) {
  if (!cv) { onFail && onFail(); return; }
  if (cv.url) img.src = cv.url; else blobUrl(cv.key).then(u => { if (u) img.src = u; else onFail && onFail(); });
}
function techFromGloss(g) { const t = blankTech({ title: g.jp, en: g.en, kind: glossKind(g.kind), memo: g.desc }); state.techs[t.id] = t; return t; }
function findTechByTitle(title) { title = String(title || '').trim(); return title ? Object.values(state.techs).find(t => t.title.trim() === title) : null; }
/* ================= 画面の土台（タブ・シート） ================= */
let board = null, selId = null, connectFrom = null, focusId = null, navStack = [], undoStack = [];
let curTab = 'pos';

function show(id) { $$('.view').forEach(v => v.classList.toggle('on', v.id === id)); }
function showTab(t) {
  curTab = t;
  $$('.tab').forEach(x => x.classList.toggle('on', x.id === 'tab-' + t));
  $$('#tabbar button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
  refreshTab(true);
}
function refreshTab(top) {
  const el = $('#tab-' + curTab); if (!el) return;
  const st = el.scrollTop;
  ({ pos: renderPositions, lib: renderLibrary, rev: renderReview, set: renderSettings })[curTab](el);
  el.scrollTop = top ? 0 : st;
}

/* ---------- シート ---------- */
let sheetDirty = false, sheetCleanup = null;
function openSheet(o) {
  if (sheetCleanup) { sheetCleanup(); sheetCleanup = null; }
  const sh = $('#sheet');
  const left = o.back ? `<button class="tb l" id="shBack">${icon('back')}<span>戻る</span></button>` : '<span></span>';
  sh.innerHTML = `<div class="shd"><span class="grab"></span>${left}<div class="t" id="shTitle">${esc(o.title || '')}</div><button class="tb r" id="shDone">${esc(o.done || '完了')}</button></div><div class="sbd">${o.body}</div>`;
  sh.style.display = 'block'; $('#shade').style.display = 'block'; sh.scrollTop = 0; sheetDirty = false;
  $('#shDone').onclick = () => { if (o.onDone) o.onDone(); else closeSheet(); };
  if (o.back) $('#shBack').onclick = () => o.back();
  fitSheet();
}
function setSheetTitle(t) { const e = $('#shTitle'); if (e) e.textContent = t; }
function closeSheet() {
  if (sheetCleanup) { sheetCleanup(); sheetCleanup = null; }
  $('#sheet').style.display = 'none'; $('#shade').style.display = 'none'; $('#sheet').innerHTML = ''; sheetDirty = false;
  if (board && $('#vBoard').classList.contains('on')) { selId = null; renderBoard(); syncHeader(); } else refreshTab();
}
$('#shade').onclick = () => closeSheet();
function edit() { if (!sheetDirty) { pushUndo(); sheetDirty = true; } save(); }

/* iPhoneのキーボードでシートが隠れないようにする */
function fitSheet() {
  const vv = window.visualViewport, sh = $('#sheet'); if (!vv || !sh) return;
  const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
  sh.style.bottom = kb + 'px'; sh.style.maxHeight = Math.max(240, Math.round(vv.height * (kb ? 0.97 : 0.92))) + 'px';
}
if (window.visualViewport) { visualViewport.addEventListener('resize', fitSheet); visualViewport.addEventListener('scroll', fitSheet); }
document.addEventListener('focusin', e => {
  if (e.target.closest && e.target.closest('#sheet') && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))
    setTimeout(() => { try { e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch { } }, 350);
});

/* ---------- 部品 ---------- */
const sw = (id, on) => `<button class="sw ${on ? 'on' : ''}" id="${id}" role="switch" aria-checked="${on}"></button>`;
function bindSwitch(id, fn) { const b = $('#' + id); b.onclick = () => { const v = !b.classList.contains('on'); b.classList.toggle('on', v); b.setAttribute('aria-checked', v); fn(v); }; }
const cell = (o) => `<div class="cell ${o.tap ? 'tap' : ''} ${o.cls || ''}" ${o.attr || ''}>${o.sq ? `<span class="sq" style="background:${o.sq}">${icon(o.icon)}</span>` : (o.icon ? `<span class="ib">${icon(o.icon)}</span>` : '')}<div class="cl"><div class="ct">${o.title}</div>${o.sub ? `<div class="cs">${o.sub}</div>` : ''}</div>${o.right || ''}${o.chev ? `<span class="chev">${icon('right')}</span>` : ''}</div>`;
function fillThumb(el, t) {
  const cv = coverOf(t);
  const ph = () => { el.innerHTML = ''; el.textContent = (t.title || '?').trim().slice(0, 1) || '?'; el.style.color = kc(t.kind); };
  if (!cv) { ph(); return; }
  const img = new Image(); img.alt = ''; img.onerror = ph; el.textContent = ''; el.appendChild(img); setImgSrc(img, cv, ph);
}
/* ================= タブ：ポジション ================= */
let posEdit = false;
function renderPositions(el) {
  const head = `<div class="ltbar">${state.boards.length ? `<button class="nb" id="pEdit">${posEdit ? '完了' : '並べ替え'}</button>` : ''}<span class="sp"></span><button class="nb ic" id="pNew" aria-label="新しいポジション">${icon('plus')}</button></div><h1 class="lt">ポジション</h1>`;
  if (!state.boards.length) {
    el.innerHTML = head + `<div class="empty"><h2>最初のポジションを作りましょう</h2><p>クローズドガードやマウントなど、ポジションごとに1枚の図を作ります。図の中では「下から」と「上から」を切り替えられます。</p><div class="bt-row c"><button class="btn solid" id="eNew">ポジションを作る</button><button class="btn" id="eSample">見本を入れる</button></div></div>`;
    $('#eNew').onclick = newPosition; $('#eSample').onclick = addSample; $('#pNew').onclick = newPosition; return;
  }
  const folders = []; state.boards.forEach(b => { if (!folders.includes(b.folder)) folders.push(b.folder); });
  folders.sort((a, b) => (a === '' ? 0 : 1) - (b === '' ? 0 : 1));
  let html = head;
  folders.forEach(f => {
    const bs = state.boards.filter(b => b.folder === f);
    if (f) html += `<div class="sh">${esc(f)}</div>`;
    html += '<div class="grp">' + bs.map(b => cell({
      tap: !posEdit, attr: `data-b="${b.id}"`, title: (b.locked ? `<span class="lk">${icon('lock')}</span>` : '') + esc(b.name),
      sub: `下から ${b.sides.bottom.nodes.length} ・ 上から ${b.sides.top.nodes.length}`,
      right: posEdit ? `<button class="ibtn mv" data-d="-1" aria-label="上へ">${icon('up')}</button><button class="ibtn mv" data-d="1" aria-label="下へ">${icon('down')}</button>` : '', chev: !posEdit
    })).join('') + '</div>';
  });
  el.innerHTML = html + '<div class="tabpad"></div>';
  $('#pNew').onclick = newPosition;
  $('#pEdit').onclick = () => { posEdit = !posEdit; refreshTab(); };
  $$('.cell[data-b]', el).forEach(c => {
    if (posEdit) $$('.mv', c).forEach(m => m.onclick = () => moveBoard(c.dataset.b, +m.dataset.d));
    else c.onclick = () => openBoard(c.dataset.b, 'fresh');
  });
}
function moveBoard(id, dir) {
  const b = state.boards.find(x => x.id === id), same = state.boards.filter(x => x.folder === b.folder);
  const i = same.indexOf(b), j = i + dir; if (j < 0 || j >= same.length) return;
  const bi = state.boards.indexOf(b), bj = state.boards.indexOf(same[j]);
  [state.boards[bi], state.boards[bj]] = [state.boards[bj], state.boards[bi]]; save(); refreshTab();
}
function newPosition() {
  const name = prompt('ポジション名（例：クローズドガード）'); if (!name || !name.trim()) return;
  const b = blankBoard(name.trim()); state.boards.push(b); save(); openBoard(b.id, 'fresh');
}

/* ================= タブ：技（ライブラリ） ================= */
let libQ = '', libKind = '';
function renderLibrary(el) {
  el.innerHTML = `<div class="ltbar"><span class="sp"></span><button class="nb ic" id="lNew" aria-label="技を追加">${icon('plus')}</button></div><h1 class="lt">技</h1>
  <label class="search">${icon('search')}<input id="lq" type="search" placeholder="名前・メモ・英語名で検索" value="${esc(libQ)}" autocomplete="off"></label>
  <div class="chips">${['', ...KINDS].map(k => `<button class="chip ${k === libKind ? 'on' : ''}" data-k="${k}">${k || 'すべて'}</button>`).join('')}</div>
  <div id="llist"></div><div class="tabpad"></div>`;
  $('#lq').oninput = e => { libQ = e.target.value; drawLib(); };
  $$('.chip', el).forEach(c => c.onclick = () => { libKind = c.dataset.k; $$('.chip', el).forEach(x => x.classList.toggle('on', x === c)); drawLib(); });
  $('#lNew').onclick = () => openPicker({ title: '技を追加', onPick: (tid, isNew) => { if (isNew) autoImage(T(tid), true); openTech(tid, null); } });
  drawLib();
}
function techMatches(t, q) {
  if (!q) return true;
  return [t.title, t.en, t.memo, ...t.marks.map(m => m.text), ...t.links.map(l => l.label)].some(s => String(s || '').toLowerCase().includes(q));
}
function drawLib() {
  const box = $('#llist'); if (!box) return;
  const q = libQ.trim().toLowerCase();
  const ts = Object.values(state.techs).filter(t => (!libKind || t.kind === libKind) && techMatches(t, q)).sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ja'));
  if (!ts.length) {
    box.innerHTML = Object.keys(state.techs).length ? '<div class="empty sm"><p>見つかりませんでした。</p></div>'
      : '<div class="empty"><h2>技はまだありません</h2><p>ポジションの図に技を置くと、ここに集まります。同じ技は、どの図から開いても同じ動画とメモになります。</p></div>';
    return;
  }
  box.innerHTML = '<div class="grp th">' + ts.map(t => {
    const pl = placements(t.id).length;
    return cell({ tap: true, attr: `data-t="${t.id}"`, title: esc(t.title) || '（名前なし）', sub: `<i class="kd" style="background:${kc(t.kind)}"></i>${t.kind}${t.en ? ' ・ ' + esc(t.en) : ''}${pl ? ` ・ 図 ${pl}` : ''}`, right: `<span class="ms m${t.mastery}" title="${MASTERY[t.mastery]}"></span>` }).replace('<div class="cl">', `<span class="thb" data-cv="${t.id}"></span><div class="cl">`);
  }).join('') + '</div>';
  $$('.thb', box).forEach(s => fillThumb(s, T(s.dataset.cv)));
  $$('.cell[data-t]', box).forEach(c => c.onclick = () => openTech(c.dataset.t, null));
}

/* ---------- 技を選ぶ（ライブラリ・用語辞典・新規） ---------- */
function openPicker({ title, onPick, back, exclude = [] }) {
  openSheet({ title, back, done: 'キャンセル', body: `<label class="search in">${icon('search')}<input id="pq" type="search" placeholder="技名を入力（例：三角）" autocomplete="off"></label><div id="pres"></div>` });
  const draw = () => {
    const q = $('#pq').value.trim(), ql = q.toLowerCase();
    const all = Object.values(state.techs).filter(t => !exclude.includes(t.id) && t.title);
    const gm = q ? matchGloss(q, 8) : [];
    let lib = q ? all.filter(t => [t.title, t.en].some(s => String(s).toLowerCase().includes(ql)) || gm.some(g => g.jp === t.title)) : all;
    lib = lib.sort((a, b) => a.title.localeCompare(b.title, 'ja')).slice(0, 40);
    const have = new Set(Object.values(state.techs).map(t => t.title.trim()));
    const gl = gm.filter(g => !have.has(g.jp));
    const exact = have.has(q) || gl.some(g => g.jp === q);
    let h = '';
    if (lib.length) h += `<div class="sh">あなたの技</div><div class="grp th">` + lib.map(t => cell({ tap: true, attr: `data-t="${t.id}"`, title: esc(t.title), sub: `<i class="kd" style="background:${kc(t.kind)}"></i>${t.kind}` }).replace('<div class="cl">', `<span class="thb sm" data-cv="${t.id}"></span><div class="cl">`)).join('') + '</div>';
    if (gl.length) h += `<div class="sh">用語辞典から</div><div class="grp">` + gl.map((g, i) => cell({ tap: true, attr: `data-g="${GLOSSARY.indexOf(g)}"`, title: `${esc(g.jp)} <span class="en">${esc(g.en)}</span>`, sub: esc(g.desc), cls: 'tall' })).join('') + '</div>';
    if (q && !exact) h += `<div class="grp">${cell({ tap: true, attr: 'id="pnew"', icon: 'plus', title: `「${esc(q)}」を新しく作る`, cls: 'act' })}</div>`;
    if (!h) h = '<div class="empty sm"><p>技名を入力してください。用語辞典に載っている技は、説明と画像の候補が自動で付きます。</p></div>';
    $('#pres').innerHTML = h;
    $$('#pres .thb').forEach(s => fillThumb(s, T(s.dataset.cv)));
    $$('#pres [data-t]').forEach(c => c.onclick = () => onPick(c.dataset.t, false));
    $$('#pres [data-g]').forEach(c => c.onclick = () => { const t = techFromGloss(GLOSSARY[+c.dataset.g]); save(); onPick(t.id, true); });
    const pn = $('#pnew'); if (pn) pn.onclick = () => { const t = blankTech({ title: q }); state.techs[t.id] = t; save(); onPick(t.id, true); };
  };
  $('#pq').oninput = draw; draw(); setTimeout(() => { const i = $('#pq'); if (i) i.focus(); }, 60);
}

/* ================= タブ：復習 ================= */
function quizPool() {
  const pool = [];
  state.boards.forEach(b => ['bottom', 'top'].forEach(s => {
    const Sd = b.sides[s];
    Sd.nodes.forEach(n => { const outs = Sd.edges.filter(e => e.from === n.id); const t = T(n.tid); if (outs.length && t && t.title) pool.push({ b, s, n, t, outs, Sd }); });
  }));
  return pool;
}
function renderReview(el) {
  const pool = quizPool(), ts = Object.values(state.techs).filter(t => t.title);
  const cnt = [0, 1, 2].map(m => ts.filter(t => t.mastery === m).length);
  const days = t => t.lastPracticed ? Math.floor((Date.now() - new Date(t.lastPracticed).getTime()) / 86400000) : null;
  const recent = ts.slice().sort((a, b) => (a.lastPracticed ? Date.parse(a.lastPracticed) : 0) - (b.lastPracticed ? Date.parse(b.lastPracticed) : 0)).slice(0, 20);
  el.innerHTML = `<div class="ltbar"></div><h1 class="lt">復習</h1>
  <div class="grp">${cell({ tap: true, attr: 'id="rQuiz"', sq: 'var(--tint)', icon: 'cards', title: '復習クイズ', sub: pool.length ? `つないだ流れから出題します（${pool.length}か所）` : '矢印でつないだ技ができると始められます', chev: true })}</div>
  <div class="stats">${MASTERY.map((m, i) => `<div class="stat"><div class="sv">${cnt[i]}</div><div class="sl"><span class="ms m${i}"></span>${m}</div></div>`).join('')}</div>
  <div class="sh">最近練習していない技</div>
  ${recent.length ? '<div class="grp">' + recent.map(t => { const d = days(t); return cell({ tap: true, attr: `data-t="${t.id}"`, title: esc(t.title), right: `<span class="cd">${d === null ? '未練習' : d === 0 ? '今日' : d + '日前'}</span>`, chev: true }); }).join('') + '</div><div class="sf">技の画面で「今日練習した」を押すと記録されます。</div>' : '<div class="empty sm"><p>技を追加すると、ここに並びます。</p></div>'}
  <div class="tabpad"></div>`;
  $('#rQuiz').onclick = startQuiz;
  $$('.cell[data-t]', el).forEach(c => c.onclick = () => openTech(c.dataset.t, null));
}
function startQuiz() {
  const pool = quizPool();
  if (!pool.length) { toast('矢印でつないだ技がまだありません'); return; }
  quizNext(pool, { n: 0, ok: 0 });
}
function quizNext(pool, st) {
  const w = pool.map(p => Math.max(0.3, 1 + (2 - p.t.mastery) * 1.5 + p.t.quiz.ng * 0.7 - p.t.quiz.ok * 0.2));
  let r = Math.random() * w.reduce((a, b) => a + b, 0), pick = pool[0];
  for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) { pick = pool[i]; break; } }
  const e = pick.outs[Math.floor(Math.random() * pick.outs.length)];
  const answers = e.label ? pick.outs.filter(x => x.label === e.label) : pick.outs;
  const tgt = x => { const n = pick.Sd.nodes.find(n => n.id === x.to); return n && T(n.tid); };
  openSheet({ title: '復習クイズ', done: '終了', body: `<div class="qz"><div class="qm">${esc(pick.b.name)} ・ ${SIDE_LABEL[pick.s]}　　${st.n}問中 ${st.ok}問 正解</div>
    <div class="qq">「${esc(pick.t.title)}」${e.label ? `で<br>「${esc(e.label)}」のとき` : 'から'}<br>次の一手は？</div>
    ${pick.t.memo ? '<button class="btn gray" id="qhint">ヒントを見る</button><p class="qh" id="qh"></p>' : ''}</div>
    <div id="qa"></div><div class="bt-row c" id="qbtn"><button class="btn solid lg" id="qshow">答えを見る</button></div>` });
  if (pick.t.memo) $('#qhint').onclick = () => { $('#qh').textContent = pick.t.memo.slice(0, 160); };
  $('#qshow').onclick = () => {
    $('#qa').innerHTML = '<div class="sh">答え</div><div class="grp">' + answers.map(a => { const t = tgt(a); return cell({ title: esc(t ? t.title : '?'), sub: t && t.memo ? esc(t.memo.slice(0, 90)) : '', cls: 'tall', icon: 'arrow' }); }).join('') + '</div>';
    $('#qbtn').innerHTML = '<button class="btn solid lg" id="qok">言えた</button><button class="btn gray lg" id="qng">まだ</button>';
    const rec = ok => { st.n++; if (ok) { st.ok++; pick.t.quiz.ok++; } else pick.t.quiz.ng++; save(); quizNext(pool, st); };
    $('#qok').onclick = () => rec(true); $('#qng').onclick = () => rec(false);
  };
}

/* ================= タブ：設定 ================= */
async function renderSettings(el) {
  el.innerHTML = `<div class="ltbar"></div><h1 class="lt">設定</h1>
  <div class="grp">
    ${cell({ tap: true, attr: 'id="sHelp"', sq: '#8E8E93', icon: 'help', title: '使い方', chev: true })}
    ${cell({ tap: true, attr: 'id="sSample"', sq: 'var(--k-pos)', icon: 'map', title: '見本の図を追加', chev: true })}
    ${cell({ tap: true, attr: 'id="sGloss"', sq: 'var(--k-esc)', icon: 'book', title: '用語辞典', right: `<span class="cd">${GLOSSARY.length}語</span>`, chev: true })}
  </div>
  <div class="sh">バックアップ</div>
  <div class="grp">
    ${cell({ tap: true, attr: 'id="sFull"', sq: 'var(--k-sweep)', icon: 'download', title: '動画ごと書き出す' })}
    ${cell({ tap: true, attr: 'id="sJson"', sq: 'var(--k-sweep)', icon: 'note', title: '構成とメモだけ書き出す' })}
    ${cell({ tap: true, attr: 'id="sImp"', sq: 'var(--k-pass)', icon: 'share', title: 'ファイルから読み込む' })}
    ${cell({ tap: true, attr: 'id="sAuto"', sq: 'var(--k-pass)', icon: 'clock', title: '自動バックアップ', chev: true })}
  </div>
  <div class="sf">データはこのiPhoneの中だけにあります。ホーム画面のアイコンを削除するとデータも消えるので、ときどき「動画ごと書き出す」でファイルアプリに保存してください。</div>
  <div class="sh">セキュリティ</div>
  <div class="grp">${cell({ tap: true, attr: 'id="sPin"', sq: '#8E8E93', icon: 'key', title: '暗証番号ロック', right: `<span class="cd">${settings.pin ? 'オン' : 'オフ'}</span>`, chev: true })}</div>
  <div class="sh">保存容量</div>
  <div class="grp">${cell({ title: '使用中', right: '<span class="cd" id="sUse">…</span>' })}${cell({ tap: true, attr: 'id="sGc"', title: '使われていないデータを整理', cls: 'act' })}</div>
  <div class="grp">${cell({ tap: true, attr: 'id="sWipe"', title: 'すべてのデータを消去', cls: 'act danger' })}</div>
  <div class="ver">BJJフロー ${APP_VERSION}</div><div class="tabpad"></div>`;
  $('#sHelp').onclick = showHelp; $('#sSample').onclick = addSample; $('#sGloss').onclick = () => openGlossary();
  $('#sFull').onclick = exportFull; $('#sJson').onclick = exportJson;
  $('#sImp').onclick = () => pickFile('', false).then(async ([f]) => { if (!f) return; try { await importAny(f); } catch (e) { alert('読み込めませんでした: ' + (e && e.message || e)); } });
  $('#sAuto').onclick = showBackups; $('#sPin').onclick = pinSettings;
  $('#sGc').onclick = async () => { const n = await gc(); toast(n ? `${n}件の不要なデータを整理しました` : '整理するデータはありません'); refreshTab(); };
  $('#sWipe').onclick = async () => { if (!confirm('すべてのポジション・技・動画・バックアップを、このiPhoneから消去します。元に戻せません。')) return; if (!confirm('本当に消去しますか？')) return; await wipeAll(); };
  if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(e => { const u = $('#sUse'); if (u) u.textContent = `約 ${Math.round(e.usage / 1048576)} MB`; });
}

/* ---------- 使い方 ---------- */
function showHelp() {
  openSheet({ title: '使い方', body: `<div class="help">
  <h3>ポジションごとに図を作る</h3><p>「ポジション」タブの＋で、クローズドガードやマウントなどの図を作ります。図の上の切り替えで、自分が「下から」攻める面と「上から」攻める面を行き来できます。</p>
  <h3>技を置いて、つなぐ</h3><p>図の下の＋で技を置きます。「三角」と入力すると、用語辞典の説明と画像の候補が付きます。技をタップして「矢印をつなぐ」を選び、つなぎ先をタップします。矢印には「相手が腕を引く」のような条件を書けます。</p>
  <h3>次のポジションへ移る</h3><p>スイープやパスの技に「この技のあと」の移動先を設定すると、図の中の技に移動先が表示され、タップでその図に移れます。</p>
  <h3>やられたときの対処</h3><p>技の画面の「この技への対処」で、反対側の面に対処の技を置けます。下からの三角絞めに、上からのスタックパスをつなぐ、といった使い方です。</p>
  <h3>図が混み合ってきたら</h3><p>技の下の小さな丸で、その先の枝を折りたためます。下のバーの整列ボタンで上から下に並べ直せます。縮小すると技の名前だけの表示になります。</p>
  <h3>同じ技は1つにまとまる</h3><p>同じ技を複数の図に置いても、動画・メモ・習熟度は1つです。「技」タブから一覧できます。</p>
  <h3>動画</h3><p>技の画面で動画を取り込み、再生中に「しおり」で見たい場面を記録できます。0.5倍速や区間のくり返しも使えます。</p>
  <p class="note">用語辞典と見本の図は一般的な説明と流れの一例です。練習では道場の先生の指導を優先してください。</p></div>` });
}

/* ---------- 用語辞典 ---------- */
function openGlossary() {
  openSheet({ title: '用語辞典', body: `<label class="search in">${icon('search')}<input id="gq" type="search" placeholder="名前・英語名で検索" autocomplete="off"></label><div id="gres"></div>` });
  const run = () => {
    const q = $('#gq').value.trim(), list = q ? matchGloss(q, 40) : GLOSSARY;
    $('#gres').innerHTML = list.length ? '<div class="grp">' + list.map(g => `<div class="gl" data-g="${GLOSSARY.indexOf(g)}"><div class="glh"><b>${esc(g.jp)}</b><span class="en">${esc(g.en)}</span><span class="tag" style="color:${kc(glossKind(g.kind))}">${esc(g.kind)}</span></div><p class="gd" hidden>${esc(g.desc)}</p><div class="bt-row" hidden>${findTechByTitle(g.jp) ? '<button class="btn gray gopen">技を開く</button>' : '<button class="btn gadd">技に追加</button>'}<a class="btn gray" href="https://www.google.com/search?tbm=isch&q=${encodeURIComponent(g.en + ' jiu-jitsu')}" target="_blank" rel="noopener noreferrer">画像を検索</a></div></div>`).join('') + '</div>' : '<div class="empty sm"><p>見つかりませんでした。</p></div>';
    $$('#gres .gl').forEach(el => {
      const g = GLOSSARY[+el.dataset.g];
      el.onclick = ev => { if (ev.target.closest('button,a')) return; $$('[hidden], .gd, .bt-row', el).forEach(x => x.hidden = !x.hidden); };
      const a = $('.gadd', el); if (a) a.onclick = () => { const t = techFromGloss(g); save(); autoImage(t, true); toast(`「${g.jp}」を技に追加しました`); run(); };
      const o = $('.gopen', el); if (o) o.onclick = () => openTech(findTechByTitle(g.jp).id, null, openGlossary);
    });
  };
  $('#gq').oninput = run; run();
}

/* ---------- 見本 ---------- */
async function addSample() {
  if (!confirm('見本「クローズドガード」と「マウント」の2つの図を追加します。自由に書き換えて使ってください。')) return;
  const tech = name => {
    const ex = findTechByTitle(name); if (ex) return ex;
    const g = GLOSSARY.find(x => x.jp === name);
    const t = blankTech({ title: name, en: g ? g.en : '', kind: g ? glossKind(g.kind) : 'その他', memo: (g ? g.desc + '\n\n' : '') + '（見本：自分の理解や先生の注意点に書き換えてください）' });
    state.techs[t.id] = t; return t;
  };
  const side = (spec, edges) => {
    const nodes = spec.map(([name, x, y]) => ({ id: uid(), tid: tech(name).id, x, y, collapsed: false, goto: null }));
    const id = name => nodes.find(n => T(n.tid).title === name).id;
    return { nodes, edges: edges.map(([a, b, label, dash]) => ({ id: uid(), from: id(a), to: id(b), label, dash: !!dash })), view: { x: 20, y: 20, k: 1 } };
  };
  const A = blankBoard('クローズドガード'), B = blankBoard('マウント');
  A.folder = B.folder = '見本';
  A.sides.bottom = side([['クローズドガード', 230, 0], ['ヒップバンプスイープ', -30, 260], ['シザースイープ', 230, 260], ['三角絞め', 490, 260], ['キムラ', -160, 520], ['ギロチンチョーク', 100, 520], ['腕十字', 490, 520]],
    [['クローズドガード', 'ヒップバンプスイープ', '相手が上体を起こす'], ['クローズドガード', 'シザースイープ', '相手の姿勢を崩せた'], ['クローズドガード', '三角絞め', '相手の片腕が内側に入る'],
     ['ヒップバンプスイープ', 'キムラ', '相手が手を床について耐える'], ['ヒップバンプスイープ', 'ギロチンチョーク', '相手が頭を下げて潰しにくる'], ['三角絞め', '腕十字', '三角を防がれたら', true]]);
  A.sides.top = side([['ポスチャー', 160, 0], ['ガード割り', 160, 230], ['ニーカットパス', 0, 470], ['スタックパス', 320, 470]],
    [['ポスチャー', 'ガード割り', '姿勢を作れた'], ['ガード割り', 'ニーカットパス', 'ガードが開いた'], ['ガード割り', 'スタックパス', '相手が脚を上げてきた']]);
  B.sides.top = side([['マウント', 160, 0], ['腕十字', 0, 240], ['アメリカーナ', 320, 240]], [['マウント', '腕十字', '相手が腕を伸ばして押す'], ['マウント', 'アメリカーナ', '相手の腕が床につく']]);
  B.sides.bottom = side([['マウント', 160, 0], ['ブリッジ', 0, 240], ['エルボーエスケープ', 320, 240]], [['マウント', 'ブリッジ', '相手が前に体重をかける'], ['マウント', 'エルボーエスケープ', '相手の腰が浮く']]);
  A.sides.bottom.nodes.forEach(n => { if (['ヒップバンプスイープ', 'シザースイープ'].includes(T(n.tid).title)) n.goto = { board: B.id, side: 'top' }; });
  const tt = name => findTechByTitle(name);
  const addC = (a, bs) => { const t = tt(a); bs.forEach(b => { const c = tt(b); if (c && !t.counters.includes(c.id)) t.counters.push(c.id); }); };
  addC('ヒップバンプスイープ', ['ポスチャー']); addC('三角絞め', ['ポスチャー', 'スタックパス']); addC('マウント', ['ブリッジ', 'エルボーエスケープ']);
  state.boards.push(A, B); await saveNow();
  closeSheet(); openBoard(A.id, 'fresh', 'bottom'); setTimeout(fitView, 60);
  toast('見本を追加しました');
  for (const t of new Set([...A.sides.bottom.nodes, ...A.sides.top.nodes, ...B.sides.top.nodes, ...B.sides.bottom.nodes].map(n => T(n.tid)))) { if (!coverOf(t)) await autoImage(t, true); }
}
/* ================= ポジションの図 ================= */
const canvas = $('#canvas'), world = $('#world'), nodesEl = $('#nodes'), edgeG = $('#edgeG');
const SD = () => board.sides[board.side];
let curVis = null;

function openBoard(id, mode, sideKey) {
  const b = state.boards.find(x => x.id === id); if (!b) return;
  if (mode === 'link' && board) navStack.push({ id: board.id, side: board.side }); else if (mode === 'fresh') navStack = [];
  board = b; if (sideKey) b.side = sideKey;
  selId = connectFrom = focusId = null; undoStack = []; setBanner('');
  show('vBoard'); syncHeader(); renderBoard();
}
function syncHeader() {
  if (!board) return;
  $('#bTitle').textContent = board.name;
  $('#bBack').innerHTML = icon('back') + `<span>${navStack.length ? esc(state.boards.find(b => b.id === navStack[navStack.length - 1].id)?.name || '戻る') : 'ポジション'}</span>`;
  $$('#sideSeg button').forEach(b => b.classList.toggle('on', b.dataset.s === board.side));
  $('#tLock').innerHTML = icon(board.locked ? 'lock' : 'unlock'); $('#tLock').classList.toggle('on', board.locked);
  $('#tUndo').classList.toggle('off', !undoStack.length || board.locked);
  $('#tAdd').style.display = board.locked ? 'none' : ''; $('#tLay').style.display = board.locked ? 'none' : '';
}
$('#bBack').onclick = () => {
  closeSheet();
  if (navStack.length) { const p = navStack.pop(); openBoard(p.id, 'back', p.side); return; }
  board = null; show('vTabs'); refreshTab();
};
$$('#sideSeg button').forEach(b => b.onclick = () => {
  if (board.side === b.dataset.s) return;
  board.side = b.dataset.s; selId = connectFrom = focusId = null; setBanner(''); save(); syncHeader(); renderBoard();
});
function setBanner(t) { const b = $('#banner'); b.style.display = t ? 'block' : 'none'; b.textContent = t; }
function applyView() { const v = SD().view; world.style.transform = `translate(${v.x}px,${v.y}px) scale(${v.k})`; world.classList.toggle('far', v.k < 0.45); }

/* ---------- 元に戻す ---------- */
function pushUndo() {
  if (!board) return;
  undoStack.push(JSON.stringify({ techs: state.techs, board }));
  if (undoStack.length > 40) undoStack.shift();
  syncHeader();
}
function undo() {
  if (!board || !undoStack.length || board.locked) return;
  closeSheet();
  const s = JSON.parse(undoStack.pop());
  state.techs = s.techs; const i = state.boards.findIndex(b => b.id === s.board.id);
  if (i >= 0) state.boards[i] = s.board; board = s.board;
  connectFrom = focusId = null; setBanner(''); save(); syncHeader(); renderBoard(); toast('元に戻しました');
}

/* ---------- 折りたたみ（見える技の計算） ---------- */
function visInfo(Sd) {
  const ids = Sd.nodes.map(n => n.id), out = new Map(ids.map(i => [i, []])), indeg = new Map(ids.map(i => [i, 0]));
  Sd.edges.forEach(e => { out.get(e.from).push(e.to); indeg.set(e.to, indeg.get(e.to) + 1); });
  const col = new Map(Sd.nodes.map(n => [n.id, n.collapsed]));
  const bfs = (starts, stop) => { const seen = new Set(starts), q = [...starts]; while (q.length) { const u = q.shift(); if (stop && col.get(u)) continue; for (const v of out.get(u)) if (!seen.has(v)) { seen.add(v); q.push(v); } } return seen; };
  let starts = ids.filter(i => !indeg.get(i));
  const all = bfs(starts, false); starts = starts.concat(ids.filter(i => !all.has(i)));
  const visible = bfs(starts, true), hidden = new Map();
  Sd.nodes.forEach(n => { if (n.collapsed) { let c = 0; bfs([n.id], false).forEach(v => { if (v !== n.id && !visible.has(v)) c++; }); hidden.set(n.id, c); } });
  return { visible, out, hidden };
}
function neighborSet(id) { const s = new Set([id]); SD().edges.forEach(e => { if (e.from === id) s.add(e.to); if (e.to === id) s.add(e.from); }); return s; }

/* ---------- 描画 ---------- */
function nodeHtml(n, vi, near) {
  const t = T(n.tid), cv = coverOf(t), kids = vi.out.get(n.id).length;
  const ic = [];
  if (t.videos.length) ic.push(icon('video')); if (t.links.length) ic.push(icon('link')); if (t.memo) ic.push(icon('note')); if (t.counters.length) ic.push(icon('shield'));
  const gb = n.goto && state.boards.find(b => b.id === n.goto.board);
  const cls = ['node', n.id === selId ? 'sel' : '', n.id === connectFrom ? 'from' : '', near && !near.has(n.id) ? 'dim' : '', board.hl && t.mastery === 2 && !near ? 'weak' : ''].join(' ');
  return `<div class="${cls}" data-id="${n.id}" style="left:${n.x}px;top:${n.y}px">
    <div class="nh">${cv ? `<img class="nthumb" data-t="${t.id}" alt="" draggable="false">` : ''}<div class="nt"><div class="ttl">${esc(t.title) || '（名前なし）'}</div><div class="meta"><i class="kd" style="background:${kc(t.kind)}"></i><span>${t.kind}</span>${ic.join('')}</div></div></div>
    <span class="ms m${t.mastery}"></span>
    ${gb ? `<button class="goto">${icon('arrow')}<span>${esc(gb.name)}・${SIDE_LABEL[n.goto.side]}</span></button>` : ''}
    ${kids ? `<button class="fold ${n.collapsed ? 'c' : ''}" aria-label="${n.collapsed ? '展開' : '折りたたむ'}">${n.collapsed ? '+' + vi.hidden.get(n.id) : icon('down')}</button>` : ''}
  </div>`;
}
function renderBoard() {
  if (!board) return;
  const Sd = SD(); applyView();
  const vi = curVis = visInfo(Sd), near = focusId ? neighborSet(focusId) : null;
  nodesEl.innerHTML = Sd.nodes.filter(n => vi.visible.has(n.id)).map(n => nodeHtml(n, vi, near)).join('');
  $$('img.nthumb', nodesEl).forEach(img => { img.onload = renderEdges; setImgSrc(img, coverOf(T(img.dataset.t)), () => { img.remove(); renderEdges(); }); img.onerror = () => { img.remove(); renderEdges(); }; });
  $('#emptyHint').style.display = Sd.nodes.length ? 'none' : 'block';
  $('#emptyHint').innerHTML = `<b>${SIDE_LABEL[board.side]}の面はまだ空です</b><br>下の＋で技を置きましょう。`;
  renderEdges();
}
const nodeEl = id => nodesEl.querySelector(`[data-id="${id}"]`);
function box(n) { const el = nodeEl(n.id), w = el ? el.offsetWidth : NW, h = el ? el.offsetHeight : 60; return { x: n.x, y: n.y, w, h, cx: n.x + w / 2, cy: n.y + h / 2 }; }
function edgeGeom(e) {
  const Sd = SD(), na = Sd.nodes.find(n => n.id === e.from), nb = Sd.nodes.find(n => n.id === e.to); if (!na || !nb) return null;
  const a = box(na), b = box(nb), dx = b.cx - a.cx, dy = b.cy - a.cy;
  let p1, p2, c1, c2;
  if (Math.abs(dy) > (a.h + b.h) / 2 + 6 && Math.abs(dy) >= Math.abs(dx) * 0.35) {
    const s = dy > 0 ? 1 : -1;
    p1 = [a.cx, s > 0 ? a.y + a.h + 12 : a.y]; p2 = [b.cx, s > 0 ? b.y - 2 : b.y + b.h + 2];
    const off = Math.max(30, Math.abs(p2[1] - p1[1]) * 0.5); c1 = [p1[0], p1[1] + s * off]; c2 = [p2[0], p2[1] - s * off];
  } else {
    const s = dx > 0 ? 1 : -1;
    p1 = [s > 0 ? a.x + a.w : a.x, a.cy]; p2 = [s > 0 ? b.x - 2 : b.x + b.w + 2, b.cy];
    const off = Math.max(30, Math.abs(p2[0] - p1[0]) * 0.5); c1 = [p1[0] + s * off, p1[1]]; c2 = [p2[0] - s * off, p2[1]];
  }
  const m = [0.125 * p1[0] + 0.375 * c1[0] + 0.375 * c2[0] + 0.125 * p2[0], 0.125 * p1[1] + 0.375 * c1[1] + 0.375 * c2[1] + 0.125 * p2[1]];
  return { p1, c1, c2, p2, m, d: `M${p1[0]},${p1[1]} C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}` };
}
function labelSpots(Sd) {
  const placed = [], out = new Map();
  const nodeBoxes = Sd.nodes.filter(n => curVis.visible.has(n.id)).map(box);
  const hit = (r, s) => !(r.x2 < s.x1 || r.x1 > s.x2 || r.y2 < s.y1 || r.y1 > s.y2);
  Sd.edges.forEach(e => {
    if (!e.label || !curVis.visible.has(e.from) || !curVis.visible.has(e.to)) return;
    const g = edgeGeom(e); if (!g) return;
    const w = Math.min(180, e.label.length * 12 + 12), h = 18;
    let best = null;
    for (const dy of [0, -18, 18, -36, 36, -54, 54]) {
      const r = { x1: g.m[0] - w / 2, x2: g.m[0] + w / 2, y1: g.m[1] + dy - h / 2, y2: g.m[1] + dy + h / 2 };
      if (!placed.some(p => hit(p, r)) && !nodeBoxes.some(b => hit({ x1: b.x, x2: b.x + b.w, y1: b.y, y2: b.y + b.h }, r))) { best = r; break; }
      if (!best) best = r;
    }
    placed.push(best); out.set(e.id, [g.m[0], (best.y1 + best.y2) / 2]);
  });
  return out;
}
function renderEdges() {
  if (!board) return;
  const Sd = SD(), ns = 'http://www.w3.org/2000/svg'; edgeG.innerHTML = '';
  if (!curVis) curVis = visInfo(Sd);
  const spots = labelSpots(Sd);
  Sd.edges.forEach(e => {
    if (!curVis.visible.has(e.from) || !curVis.visible.has(e.to)) return;
    const g0 = edgeGeom(e); if (!g0) return;
    const g = document.createElementNS(ns, 'g'); g.dataset.eid = e.id;
    if (focusId && e.from !== focusId && e.to !== focusId) g.setAttribute('opacity', '0.12');
    const line = document.createElementNS(ns, 'path'); line.setAttribute('d', g0.d); line.setAttribute('class', 'edge' + (e.dash ? ' dash' : '')); line.setAttribute('marker-end', 'url(#arr)');
    const hitp = document.createElementNS(ns, 'path'); hitp.setAttribute('d', g0.d); hitp.setAttribute('class', 'ehit');
    g.append(line, hitp);
    if (e.label && spots.has(e.id)) {
      const [x, y] = spots.get(e.id), t = document.createElementNS(ns, 'text');
      t.setAttribute('class', 'elbl'); t.setAttribute('x', x); t.setAttribute('y', y + 4); t.textContent = e.label; g.append(t);
    }
    edgeG.appendChild(g);
  });
}

/* ---------- タッチ操作 ---------- */
const pts = new Map(); let drag = null, pinch = null;
canvas.addEventListener('pointerdown', ev => {
  if (ev.target.closest('#toolbar') || ev.target.closest('#emptyHint button')) return;
  canvas.setPointerCapture(ev.pointerId);
  pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  const v = SD().view;
  if (pts.size === 1) {
    const nEl = ev.target.closest('.node'), eEl = ev.target.closest('[data-eid]');
    const base = { sx: ev.clientX, sy: ev.clientY, vx: v.x, vy: v.y, moved: false };
    if (nEl && ev.target.closest('.goto')) drag = { ...base, type: 'pan', kind: 'goto', id: nEl.dataset.id };
    else if (nEl && ev.target.closest('.fold')) drag = { ...base, type: 'pan', kind: 'fold', id: nEl.dataset.id };
    else if (nEl) { const n = SD().nodes.find(x => x.id === nEl.dataset.id); drag = { ...base, type: (connectFrom || board.locked) ? 'pan' : 'node', kind: 'node', id: n.id, ox: n.x, oy: n.y }; }
    else if (eEl) drag = { ...base, type: 'pan', kind: 'edge', id: eEl.dataset.eid };
    else drag = { ...base, type: 'pan', kind: 'bg' };
  } else if (pts.size === 2) {
    drag = null;
    const [p, q] = [...pts.values()], r = canvas.getBoundingClientRect();
    const cx = (p.x + q.x) / 2 - r.left, cy = (p.y + q.y) / 2 - r.top;
    pinch = { d0: Math.hypot(p.x - q.x, p.y - q.y) || 1, k0: v.k, wx: (cx - v.x) / v.k, wy: (cy - v.y) / v.k };
  }
});
canvas.addEventListener('pointermove', ev => {
  if (!pts.has(ev.pointerId)) return;
  pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  const v = SD().view;
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
    const n = SD().nodes.find(x => x.id === drag.id);
    let nx = drag.ox + dx / v.k, ny = drag.oy + dy / v.k;
    if (board.snap) { nx = Math.round(nx / 20) * 20; ny = Math.round(ny / 20) * 20; }
    n.x = Math.round(nx); n.y = Math.round(ny);
    const el = nodeEl(n.id); el.style.left = n.x + 'px'; el.style.top = n.y + 'px'; renderEdges();
  } else { v.x = drag.vx + dx; v.y = drag.vy + dy; applyView(); }
});
function endPointer(ev) {
  if (!pts.has(ev.pointerId)) return;
  pts.delete(ev.pointerId);
  if (pinch) { if (pts.size < 2) { pinch = null; drag = null; save(); renderEdges(); } return; }
  const d = drag; drag = null; if (!d) return;
  if (d.moved) { save(); syncHeader(); return; }
  tap(d);
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

function tap(d) {
  const n = d.id && SD().nodes.find(x => x.id === d.id);
  if (d.kind === 'goto' && n && n.goto) { openBoard(n.goto.board, 'link', n.goto.side); setTimeout(fitView, 30); return; }
  if (d.kind === 'fold' && n) { if (!board.locked) pushUndo(); n.collapsed = !n.collapsed; save(); renderBoard(); return; }
  if (d.kind === 'node' && n) {
    if (connectFrom && connectFrom !== n.id) {
      pushUndo();
      let e = SD().edges.find(x => x.from === connectFrom && x.to === n.id);
      if (!e) { e = { id: uid(), from: connectFrom, to: n.id, label: '', dash: false }; SD().edges.push(e); }
      const src = SD().nodes.find(x => x.id === connectFrom); if (src) src.collapsed = false;
      connectFrom = null; setBanner(''); save(); renderBoard(); syncHeader(); openEdgeSheet(e.id); return;
    }
    if (connectFrom === n.id) { connectFrom = null; setBanner(''); renderBoard(); return; }
    openTech(n.tid, { nodeId: n.id }); return;
  }
  if (d.kind === 'edge') { if (!board.locked) openEdgeSheet(d.id); return; }
  if (connectFrom || focusId) { connectFrom = focusId = null; setBanner(''); renderBoard(); }
}

/* ---------- 置く・見る ---------- */
function placeNode(tid, sideKey, near) {
  const s = sideKey || board.side, Sd = board.sides[s], r = canvas.getBoundingClientRect(), v = Sd.view, j = (Sd.nodes.length % 5) * 16;
  const pos = near ? { x: near.x, y: near.y } : { x: Math.round((r.width / 2 - v.x) / v.k - NW / 2 + j), y: Math.round((r.height / 2 - v.y) / v.k - 30 + j) };
  const n = { id: uid(), tid, x: pos.x, y: pos.y, collapsed: false, goto: null };
  Sd.nodes.push(n); save(); if (s === board.side) renderBoard(); return n;
}
$('#tAdd').onclick = () => openPicker({
  title: '技を置く', onPick: (tid, isNew) => {
    pushUndo(); const n = placeNode(tid); closeSheet(); syncHeader();
    if (isNew) { openTech(tid, { nodeId: n.id }); autoImage(T(tid)); } else toast(`「${T(tid).title}」を置きました`);
  }
});
$('#tUndo').onclick = undo;
$('#tLock').onclick = () => { board.locked = !board.locked; connectFrom = null; setBanner(''); save(); syncHeader(); toast(board.locked ? 'ロック中：技を動かしたり編集したりできません' : 'ロックを解除しました'); };
$('#tFit').onclick = () => fitView();
$('#tLay').onclick = () => autoLayout();
$('#bMore').onclick = boardMenu;

function centerOn(n) {
  const r = canvas.getBoundingClientRect(), b = box(n), v = SD().view; v.k = Math.max(v.k, 0.8);
  v.x = r.width / 2 - b.cx * v.k; v.y = r.height / 2 - b.cy * v.k; applyView(); save();
}
function flash(id) { const el = nodeEl(id); if (el) { el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 2000); } }
function gotoNode(bid, sideKey, nid, mode) {
  closeSheet(); openBoard(bid, mode || 'fresh', sideKey);
  const n = SD().nodes.find(x => x.id === nid); if (!n) return;
  let p = n; // 折りたたまれた先にあれば展開する
  if (!curVis.visible.has(n.id)) { SD().nodes.forEach(x => x.collapsed = false); renderBoard(); }
  centerOn(p); flash(nid);
}
function fitView() {
  if (!board) return;
  const Sd = SD(), vis = Sd.nodes.filter(n => !curVis || curVis.visible.has(n.id));
  if (!vis.length) { Sd.view = { x: 20, y: 20, k: 1 }; applyView(); save(); return; }
  const r = canvas.getBoundingClientRect(), bs = vis.map(box);
  const minX = Math.min(...bs.map(b => b.x)) - 24, maxX = Math.max(...bs.map(b => b.x + b.w)) + 24, minY = Math.min(...bs.map(b => b.y)) - 24, maxY = Math.max(...bs.map(b => b.y + b.h)) + 40;
  const availH = r.height - 90;
  const k = Math.min(1.1, Math.max(0.2, Math.min(r.width / (maxX - minX), availH / (maxY - minY))));
  Sd.view = { k, x: (r.width - (maxX - minX) * k) / 2 - minX * k, y: (availH - (maxY - minY) * k) / 2 - minY * k };
  applyView(); save(); renderEdges();
}

/* ---------- 自動整列（上から下へのツリー） ---------- */
function autoLayout() {
  const Sd = SD(), N = Sd.nodes; if (!N.length) return;
  pushUndo();
  const ids = N.map(n => n.id), out = new Map(ids.map(i => [i, []])), inn = new Map(ids.map(i => [i, 0]));
  Sd.edges.forEach(e => { out.get(e.from).push(e.to); inn.set(e.to, inn.get(e.to) + 1); });
  const color = new Map(), fwd = new Map(ids.map(i => [i, []]));
  const byX = (a, b) => N.find(n => n.id === a).x - N.find(n => n.id === b).x;
  const dfs = u => { color.set(u, 1); for (const v of out.get(u).slice().sort(byX)) { if (!color.has(v)) { fwd.get(u).push(v); dfs(v); } else if (color.get(v) === 2) fwd.get(u).push(v); } color.set(u, 2); };
  const roots = ids.filter(i => !inn.get(i)).sort(byX);
  roots.forEach(r => { if (!color.has(r)) dfs(r); }); ids.forEach(i => { if (!color.has(i)) dfs(i); });
  const preds = new Map(ids.map(i => [i, []])); fwd.forEach((vs, u) => vs.forEach(v => preds.get(v).push(u)));
  const deg = new Map(ids.map(i => [i, preds.get(i).length])), layer = new Map(), q = ids.filter(i => !deg.get(i));
  q.forEach(i => layer.set(i, 0));
  while (q.length) { const u = q.shift(); for (const v of fwd.get(u)) { layer.set(v, Math.max(layer.get(v) || 0, layer.get(u) + 1)); deg.set(v, deg.get(v) - 1); if (!deg.get(v)) q.push(v); } }
  const L = []; ids.forEach(i => { const l = layer.get(i) || 0; (L[l] = L[l] || []).push(i); });
  for (let l = 0; l < L.length; l++) if (!L[l]) L[l] = [];
  L.forEach(row => row.sort(byX));
  const idx = () => { const m = new Map(); L.forEach(row => row.forEach((id, i) => m.set(id, i))); return m; };
  for (let it = 0; it < 4; it++) {
    for (let l = 1; l < L.length; l++) { const m = idx(); L[l].sort((a, b) => { const pa = preds.get(a), pb = preds.get(b); return (pa.length ? pa.reduce((s, p) => s + m.get(p), 0) / pa.length : m.get(a)) - (pb.length ? pb.reduce((s, p) => s + m.get(p), 0) / pb.length : m.get(b)); }); }
    for (let l = L.length - 2; l >= 0; l--) { const m = idx(); L[l].sort((a, b) => { const sa = fwd.get(a), sb = fwd.get(b); return (sa.length ? sa.reduce((s, p) => s + m.get(p), 0) / sa.length : m.get(a)) - (sb.length ? sb.reduce((s, p) => s + m.get(p), 0) / sb.length : m.get(b)); }); }
  }
  const node = id => N.find(n => n.id === id), GX = 28, cx = new Map(); let y = 0;
  L.forEach((row, l) => {
    if (!row.length) return;
    const ws = row.map(id => box(node(id)).w);
    const want = row.map((id, i) => { const p = preds.get(id).filter(x => cx.has(x)); return p.length ? p.reduce((s, x) => s + cx.get(x), 0) / p.length : null; });
    let xs = [], prev = -Infinity;
    row.forEach((id, i) => { const w = ws[i], d = want[i] !== null ? want[i] - w / 2 : (prev === -Infinity ? 0 : prev + GX); const x = Math.max(d, prev === -Infinity ? d : prev + GX); xs.push(x); prev = x + w; });
    const diffs = row.map((id, i) => want[i] !== null ? (xs[i] + ws[i] / 2) - want[i] : null).filter(v => v !== null);
    const shift = diffs.length ? -diffs.reduce((a, b) => a + b, 0) / diffs.length : 0;
    let h = 0;
    row.forEach((id, i) => { const n = node(id); n.x = Math.round(xs[i] + shift); n.y = y; cx.set(id, n.x + ws[i] / 2); h = Math.max(h, box(n).h); });
    y += h + 92;
  });
  save(); renderBoard(); fitView(); syncHeader(); toast('並べ直しました');
}

/* ---------- 図のメニュー ---------- */
function boardMenu() {
  const ro = board.locked, folders = [...new Set(state.boards.map(b => b.folder).filter(Boolean))];
  openSheet({ title: 'ポジションの設定', body: `
  <div class="grp"><div class="cell"><div class="cl lbl">名前</div><input class="inp r" id="bn" value="${esc(board.name)}" ${ro ? 'disabled' : ''}></div>
  <div class="cell"><div class="cl lbl">フォルダ</div><input class="inp r" id="bf" list="fl" placeholder="なし" value="${esc(board.folder)}" ${ro ? 'disabled' : ''}><datalist id="fl">${folders.map(f => `<option value="${esc(f)}">`).join('')}</datalist></div></div>
  <div class="grp">${cell({ title: 'グリッドに合わせる', right: sw('bsnap', board.snap) })}${cell({ title: '使える技を薄く表示', sub: 'まだ弱い技が目立ちます', right: sw('bhl', board.hl) })}</div>
  <div class="grp">${cell({ tap: true, attr: 'id="bpng"', icon: 'photo', title: '画像として書き出す', cls: 'act' })}</div>
  ${ro ? '' : `<div class="grp">${cell({ tap: true, attr: 'id="bdel"', title: 'このポジションを削除', cls: 'act danger' })}</div><div class="sf">技そのものは「技」タブに残ります。</div>`}` });
  if (!ro) {
    $('#bn').oninput = e => { board.name = e.target.value.trim() || '無題'; $('#bTitle').textContent = board.name; save(); };
    $('#bf').oninput = e => { board.folder = e.target.value.trim(); save(); };
    $('#bdel').onclick = async () => {
      if (!confirm(`「${board.name}」を削除しますか？\n（自動バックアップから戻せます）`)) return;
      await snapshot('ポジション削除前'); const id = board.id;
      state.boards = state.boards.filter(b => b.id !== id);
      state.boards.forEach(b => ['bottom', 'top'].forEach(s => b.sides[s].nodes.forEach(n => { if (n.goto && n.goto.board === id) n.goto = null; })));
      await saveNow(); closeSheet(); board = null; navStack = []; show('vTabs'); refreshTab();
    };
  }
  bindSwitch('bsnap', v => { board.snap = v; save(); });
  bindSwitch('bhl', v => { board.hl = v; save(); renderBoard(); });
  $('#bpng').onclick = exportPng;
}

/* ---------- 矢印 ---------- */
function openEdgeSheet(id) {
  const e = SD().edges.find(x => x.id === id); if (!e) return;
  const a = SD().nodes.find(n => n.id === e.from), b = SD().nodes.find(n => n.id === e.to);
  openSheet({ title: '矢印', body: `<div class="sh">${esc(T(a.tid).title)} → ${esc(T(b.tid).title)}</div>
  <div class="grp"><input class="inp" id="el" value="${esc(e.label)}" placeholder="条件（例：相手が腕を引く）"></div>
  <div class="grp">${cell({ title: '点線にする', sub: '「防がれたら」など、予備の流れに', right: sw('edash', e.dash) })}${cell({ tap: true, attr: 'id="erev"', icon: 'swap', title: '向きを逆にする', cls: 'act' })}</div>
  <div class="grp">${cell({ tap: true, attr: 'id="edel"', title: '矢印を削除', cls: 'act danger' })}</div>` });
  $('#el').oninput = ev => { edit(); e.label = ev.target.value; renderEdges(); };
  bindSwitch('edash', v => { edit(); e.dash = v; renderEdges(); });
  $('#erev').onclick = () => { edit(); [e.from, e.to] = [e.to, e.from]; closeSheet(); };
  $('#edel').onclick = () => { edit(); SD().edges = SD().edges.filter(x => x !== e); closeSheet(); };
}

/* ---------- 画像として書き出し ---------- */
function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function wrapText(ctx, text, maxW) { const lines = []; let cur = ''; for (const ch of String(text)) { if (cur && ctx.measureText(cur + ch).width > maxW) { lines.push(cur); cur = ch; } else cur += ch; } lines.push(cur); return lines; }
async function exportPng() {
  closeSheet();
  const Sd = SD(), vis = Sd.nodes.filter(n => curVis.visible.has(n.id)); if (!vis.length) { toast('技がありません'); return; }
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const col = { bg: css('--bg'), card: css('--card'), label: css('--label'), label2: css('--label2'), edge: css('--edge'), tint: css('--tint'), sep: css('--sep') };
  const bs = vis.map(n => ({ n, ...box(n) })), pad = 48;
  const minX = Math.min(...bs.map(b => b.x)) - pad, minY = Math.min(...bs.map(b => b.y)) - pad - 40;
  const W = Math.max(...bs.map(b => b.x + b.w)) + pad - minX, H = Math.max(...bs.map(b => b.y + b.h)) + pad - minY;
  const sc = Math.min(2, 4000 / Math.max(W, H)), c = document.createElement('canvas'); c.width = Math.round(W * sc); c.height = Math.round(H * sc);
  const ctx = c.getContext('2d'); ctx.scale(sc, sc); ctx.translate(-minX, -minY);
  const F = (s, w = 400) => `${w} ${s}px -apple-system, "Hiragino Sans", sans-serif`;
  ctx.fillStyle = col.bg; ctx.fillRect(minX, minY, W, H);
  ctx.fillStyle = col.label; ctx.font = F(22, 700); ctx.fillText(`${board.name}　${SIDE_LABEL[board.side]}`, minX + pad, minY + pad + 6);
  const spots = labelSpots(Sd);
  Sd.edges.forEach(e => {
    if (!curVis.visible.has(e.from) || !curVis.visible.has(e.to)) return;
    const g = edgeGeom(e); if (!g) return;
    ctx.strokeStyle = col.edge; ctx.fillStyle = col.edge; ctx.lineWidth = 1.5; ctx.setLineDash(e.dash ? [6, 5] : []);
    ctx.beginPath(); ctx.moveTo(...g.p1); ctx.bezierCurveTo(...g.c1, ...g.c2, ...g.p2); ctx.stroke(); ctx.setLineDash([]);
    const a = Math.atan2(g.p2[1] - g.c2[1], g.p2[0] - g.c2[0]);
    ctx.beginPath(); ctx.moveTo(...g.p2); ctx.lineTo(g.p2[0] - 9 * Math.cos(a - 0.45), g.p2[1] - 9 * Math.sin(a - 0.45)); ctx.lineTo(g.p2[0] - 9 * Math.cos(a + 0.45), g.p2[1] - 9 * Math.sin(a + 0.45)); ctx.closePath(); ctx.fill();
    if (e.label && spots.has(e.id)) { const [x, y] = spots.get(e.id); ctx.font = F(12); ctx.textAlign = 'center'; ctx.lineWidth = 6; ctx.strokeStyle = col.bg; ctx.strokeText(e.label, x, y + 4); ctx.fillStyle = col.label2; ctx.fillText(e.label, x, y + 4); ctx.textAlign = 'left'; }
  });
  bs.forEach(({ n, x, y, w, h }) => {
    const t = T(n.tid);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.08)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3; rrect(ctx, x, y, w, h, 12); ctx.fillStyle = col.card; ctx.fill(); ctx.restore();
    ctx.fillStyle = col.label; ctx.font = F(15, 600); wrapText(ctx, t.title || '（名前なし）', w - 36).slice(0, 3).forEach((ln, i) => ctx.fillText(ln, x + 12, y + 26 + i * 20));
    ctx.beginPath(); ctx.arc(x + 15, y + h - 15, 3.5, 0, 7); ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(KIND_VAR[t.kind]).trim(); ctx.fill();
    ctx.fillStyle = col.label2; ctx.font = F(12); ctx.fillText(t.kind, x + 24, y + h - 11);
    ctx.beginPath(); ctx.arc(x + w - 14, y + 14, 4.5, 0, 7); ctx.fillStyle = [col.sep, css('--warn'), css('--ok')][t.mastery]; ctx.fill();
  });
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  await shareOrDownload(new File([blob], `${board.name}_${SIDE_LABEL[board.side]}.png`.replace(/[\\/:*?"<>|]/g, '_'), { type: 'image/png' }));
}
/* ================= 技の画面 ================= */
let curTid = null, playerUrls = [];

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
    const t = x.searchParams.get('t') || x.searchParams.get('start') || '0'; let start = 0;
    if (/^\d+$/.test(t)) start = +t; else { const m = t.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/); start = (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0); }
    return { id, start };
  } catch { return null; }
}

function openTech(tid, ctx, back) {
  const t = T(tid); if (!t) return;
  const node = ctx && board && $('#vBoard').classList.contains('on') ? SD().nodes.find(n => n.id === ctx.nodeId) : null;
  if (node) { selId = node.id; renderBoard(); }
  curTid = tid;
  const R = { t, node, ro: !!(node && board.locked), back, reopen: () => openTech(tid, ctx, back) };
  openSheet({ title: t.title || '技', back, body: '<div id="tCover"></div><div id="tHero"></div><div id="tGloss"></div><div id="tMast"></div><div id="tMemo"></div><div id="tVid"></div><div id="tLink"></div><div id="tImg"></div><div id="tNext"></div><div id="tCnt"></div><div id="tPl"></div><div id="tAct"></div>' });
  sheetCleanup = () => { closeAllPlayers(); curTid = null; };
  drawCover(R); drawHero(R); drawGloss(R); drawMast(R); drawMemo(R); drawVideos(R); drawLinks(R); drawImg(R); drawNext(R); drawCounters(R); drawPlaces(R); drawActs(R);
}
const live = R => curTid === R.t.id && $('#tHero');
function changed(R) { edit(); if (board && $('#vBoard').classList.contains('on')) renderBoard(); }

/* ---------- 見出し ---------- */
function drawHero(R) {
  const { t, ro } = R, d = ro ? 'disabled' : '';
  $('#tHero').innerHTML = `<div class="grp hero"><input class="inp big" id="ht" value="${esc(t.title)}" placeholder="技・ポジション名" ${d}>
  <input class="inp en" id="he" value="${esc(t.en)}" placeholder="英語名（画像検索に使います）" autocapitalize="off" ${d}>
  <div class="cell"><div class="cl lbl">種類</div><select class="sel" id="hk" ${d}>${KINDS.map(k => `<option ${k === t.kind ? 'selected' : ''}>${k}</option>`).join('')}</select><i class="kd lg" style="background:${kc(t.kind)}"></i></div></div>`;
  if (ro) return;
  $('#ht').oninput = e => { t.title = e.target.value; changed(R); setSheetTitle(t.title || '技'); drawGloss(R); };
  $('#he').oninput = e => { t.en = e.target.value; edit(); };
  $('#hk').onchange = e => { t.kind = e.target.value; changed(R); drawHero(R); };
}
function drawGloss(R) {
  const { t, ro } = R; const box = $('#tGloss'); if (!box) return;
  const ms = t.title.trim() ? matchGloss(t.title, 2).filter(g => !(g.jp === t.title && t.en === g.en && t.memo.includes(g.desc))) : [];
  box.innerHTML = ms.length ? `<div class="sh">用語辞典</div><div class="grp">${ms.map((g, i) => `<div class="gl open" data-i="${i}"><div class="glh"><b>${esc(g.jp)}</b><span class="en">${esc(g.en)}</span><span class="tag" style="color:${kc(glossKind(g.kind))}">${esc(g.kind)}</span></div><p class="gd">${esc(g.desc)}</p>${ro ? '' : '<div class="bt-row"><button class="btn guse">この説明を使う</button></div>'}</div>`).join('')}</div>` : '';
  $$('.gl', box).forEach(el => { const b = $('.guse', el); if (b) b.onclick = () => applyGloss(R, ms[+el.dataset.i]); });
}
function applyGloss(R, g) {
  const { t } = R; edit();
  t.title = g.jp; t.en = g.en; t.kind = glossKind(g.kind);
  if (!t.memo.includes(g.desc)) t.memo = (t.memo ? t.memo + '\n\n' : '') + g.desc;
  setSheetTitle(t.title); drawHero(R); drawGloss(R); drawMemo(R); drawImg(R); if (board) renderBoard();
  if (!coverOf(t)) autoImage(t);
}

/* ---------- 画像 ---------- */
function drawCover(R) {
  const { t } = R, box = $('#tCover'); if (!box) return;
  const cv = coverOf(t); if (!cv) { box.innerHTML = ''; return; }
  const cr = t.img && t.imgCredit;
  box.innerHTML = `<div class="grp cv"><img class="cover" id="cimg" alt=""></div>${cr ? `<div class="sf">${cr.auto ? '自動で付けた画像です。技と合っているか確認してください。<br>' : ''}出典：Wikimedia Commons「${esc(cr.title)}」${cr.artist ? ' / ' + esc(cr.artist) : ''}${cr.license ? '（' + esc(cr.license) + '）' : ''} <a href="${esc(safeUrl(cr.page))}" target="_blank" rel="noopener noreferrer">ページを開く</a></div>` : ''}`;
  const im = $('#cimg'); setImgSrc(im, cv, () => { box.innerHTML = ''; });
  im.onclick = () => { if (t.img && t.photos.includes(t.img)) openViewer(R, t.img); };
}
function drawImg(R) {
  const { t, ro } = R, box = $('#tImg'); if (!box) return;
  const q = (t.en || t.title).trim();
  const g = q && `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q + ' jiu-jitsu')}`, y = q && `https://www.youtube.com/results?search_query=${encodeURIComponent(q + ' jiu-jitsu technique')}`;
  box.innerHTML = `<div class="sh">画像</div><div class="grp">
    ${ro ? '' : cell({ tap: true, attr: 'id="ifind"', icon: 'search', title: 'フリー画像から探す', sub: 'Wikimedia Commons', cls: 'act' }) + cell({ tap: true, attr: 'id="iphoto"', icon: 'photo', title: '写真を追加', cls: 'act' })}
    ${q ? `<a class="cell tap act" href="${g}" target="_blank" rel="noopener noreferrer"><span class="ib">${icon('globe')}</span><div class="cl"><div class="ct">Googleで画像を検索</div></div><span class="chev">${icon('external')}</span></a><a class="cell tap act" href="${y}" target="_blank" rel="noopener noreferrer"><span class="ib">${icon('play')}</span><div class="cl"><div class="ct">YouTubeで動画を探す</div></div><span class="chev">${icon('external')}</span></a>` : ''}
    ${!ro && t.img ? cell({ tap: true, attr: 'id="irm"', icon: 'close', title: '表紙の画像を外す', cls: 'act danger' }) : ''}
  </div><div id="cand"></div>${t.photos.length ? '<div class="sh">写真</div><div class="grp"><div class="pg" id="pgrid"></div></div>' : ''}`;
  t.photos.forEach(k => { const im = document.createElement('img'); im.alt = ''; blobUrl(k).then(u => { if (u) im.src = u; }); im.onclick = () => openViewer(R, k); $('#pgrid').appendChild(im); });
  if (ro) return;
  $('#ifind').onclick = () => findImages(R, q);
  $('#iphoto').onclick = async () => {
    const files = await pickFile('image/*', true); if (!files.length) return;
    toast('写真を保存しています');
    for (const f of files) { try { const k = await putBlob(await resizeImage(f)); edit(); t.photos.push(k); if (!t.img) { t.img = k; t.imgCredit = null; } } catch { toast('読み込めない写真がありました'); } }
    save(); if (live(R)) { drawCover(R); drawImg(R); } if (board) renderBoard();
  };
  const rm = $('#irm'); if (rm) rm.onclick = () => { edit(); t.img = null; t.imgCredit = null; drawCover(R); drawImg(R); if (board) renderBoard(); };
}
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
async function setImageFromCandidate(t, c, auto) {
  const r = await fetch(c.thumb); if (!r.ok) throw new Error('img ' + r.status);
  const k = await putBlob(await r.blob());
  t.img = k; t.imgCredit = { title: c.title, page: c.page, license: c.license, artist: c.artist, auto: !!auto }; save();
  if (curTid === t.id && $('#tHero')) { drawCover({ t }); }
  if (board && $('#vBoard').classList.contains('on')) renderBoard();
}
async function autoImage(t, quiet) {
  if (!t || !(t.en || '').trim() || coverOf(t)) return;
  try {
    const res = await commonsSearch(t.en); if (!res.length) { if (!quiet) toast('画像の候補は見つかりませんでした'); return; }
    await setImageFromCandidate(t, res[0], true); if (!quiet) toast('画像を自動で付けました。内容を確認してください');
  } catch { if (!quiet) toast('画像を取得できませんでした（オフラインかもしれません）'); }
}
async function findImages(R, q) {
  if (!q) { toast('先に技の名前を入れてください'); return; }
  const box = $('#cand'); box.innerHTML = '<div class="sf">探しています…（送られるのは技の名前だけです）</div>';
  try {
    const res = await commonsSearch(q);
    if (!res.length) { box.innerHTML = '<div class="sf">候補が見つかりませんでした。Googleでの検索や、写真の追加を使ってください。</div>'; return; }
    box.innerHTML = '<div class="sh">合う画像をタップ</div><div class="grp"><div class="pg">' + res.map((r, i) => `<img data-i="${i}" src="${esc(r.thumb)}" alt="">`).join('') + '</div></div>';
    $$('img', box).forEach(im => im.onclick = async () => {
      box.innerHTML = '<div class="sf">保存しています…</div>';
      try { edit(); await setImageFromCandidate(R.t, res[+im.dataset.i], false); box.innerHTML = ''; drawImg(R); } catch { box.innerHTML = '<div class="sf">画像を取得できませんでした。</div>'; }
    });
  } catch { box.innerHTML = '<div class="sf">取得できませんでした（オフラインかもしれません）。</div>'; }
}
async function openViewer(R, key) {
  const v = $('#viewer'), u = await blobUrl(key); if (!u) return;
  v.innerHTML = `<img src="${u}" alt=""><div class="bt-row c">${R.ro ? '' : '<button class="btn" id="vcov">表紙にする</button><button class="btn red" id="vdel">削除</button>'}<button class="btn solid" id="vcl">閉じる</button></div>`;
  v.style.display = 'flex';
  const close = () => { v.style.display = 'none'; v.innerHTML = ''; };
  $('#vcl').onclick = close;
  if (!R.ro) {
    $('#vcov').onclick = () => { edit(); R.t.img = key; R.t.imgCredit = null; close(); drawCover(R); drawImg(R); if (board) renderBoard(); };
    $('#vdel').onclick = () => { if (!confirm('この写真を削除しますか？')) return; edit(); R.t.photos = R.t.photos.filter(x => x !== key); if (R.t.img === key) { R.t.img = null; R.t.imgCredit = null; } close(); drawCover(R); drawImg(R); if (board) renderBoard(); };
  }
}

/* ---------- 習熟度・メモ ---------- */
function drawMast(R) {
  const { t } = R;
  const info = () => t.lastPracticed ? `${new Date(t.lastPracticed).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}・累計${t.practiceCount}回` : 'まだ記録なし';
  $('#tMast').innerHTML = `<div class="sh">習熟度</div><div class="grp"><div class="pad"><div class="seg" id="mst">${MASTERY.map((m, i) => `<button data-m="${i}" class="${t.mastery === i ? 'on' : ''}">${m}</button>`).join('')}</div></div>${cell({ tap: true, attr: 'id="prc"', icon: 'check', title: '今日練習した', right: `<span class="cd" id="prcd">${info()}</span>`, cls: 'act' })}</div>`;
  $$('#mst button').forEach(b => b.onclick = () => { t.mastery = +b.dataset.m; changed(R); $$('#mst button').forEach(x => x.classList.toggle('on', x === b)); });
  $('#prc').onclick = () => { t.lastPracticed = new Date().toISOString(); t.practiceCount++; save(); $('#prcd').textContent = info(); toast('練習を記録しました'); };
}
function drawMemo(R) {
  const { t, ro } = R;
  $('#tMemo').innerHTML = `<div class="sh">メモ</div><div class="grp"><textarea class="inp memo" id="hm" placeholder="ポイント、注意点、先生に言われたことなど" ${ro ? 'disabled' : ''}>${esc(t.memo)}</textarea></div>`;
  if (!ro) $('#hm').oninput = e => { t.memo = e.target.value; edit(); };
}

/* ---------- 動画 ---------- */
function closeAllPlayers() {
  $$('#sheet .phost, #sheet .lplay').forEach(h => { const v = $('video', h); if (v) v.pause(); h.innerHTML = ''; });
  playerUrls.forEach(u => URL.revokeObjectURL(u)); playerUrls = [];
}
function drawMarks(R, src, box, seek) {
  const ms = R.t.marks.filter(m => m.src === src).sort((a, b) => a.t - b.t);
  box.innerHTML = ms.map(m => `<div class="mk" data-m="${m.id}"><button class="mgo"><span class="tm">${fmtT(m.t)}</span>${esc(m.text) || 'しおり'}</button>${R.ro ? '' : `<button class="ibtn mdel" aria-label="削除">${icon('close')}</button>`}</div>`).join('');
  $$('.mk', box).forEach(el => {
    const m = R.t.marks.find(x => x.id === el.dataset.m);
    $('.mgo', el).onclick = () => seek(m.t);
    const d = $('.mdel', el); if (d) d.onclick = () => { edit(); R.t.marks = R.t.marks.filter(x => x !== m); drawMarks(R, src, box, seek); };
  });
}
async function openPlayer(R, v, host, file) {
  closeAllPlayers();
  const blob = file || await DB.get('videos', v.vid); if (!blob) { toast('動画が見つかりません'); return; }
  const url = URL.createObjectURL(blob); playerUrls.push(url);
  const src = 'v:' + v.id; let A = null, B = null;
  host.innerHTML = `<video controls playsinline preload="metadata" src="${url}"></video>
  <div class="pad"><div class="seg sm">${[0.5, 0.75, 1, 1.5, 2].map(s => `<button data-s="${s}" class="${s === 1 ? 'on' : ''}">${s}×</button>`).join('')}</div>
  <div class="bt-row tight"><button class="btn gray pa">A点</button><button class="btn gray pb">B点</button><button class="btn gray pc">くり返し解除</button><span class="pl"></span></div>
  <div class="bt-row tight"><button class="btn pm">${icon('bookmark')}<span>ここにしおり</span></button></div><div class="mks"></div></div>`;
  const vid = $('video', host), pl = $('.pl', host), mks = $('.mks', host);
  const upd = () => { pl.textContent = (A != null ? 'A ' + fmtT(A) : '') + (B != null ? '　B ' + fmtT(B) : '') + (A != null && B != null && A < B ? '　くり返し中' : ''); };
  vid.addEventListener('timeupdate', () => { if (A != null && B != null && A < B && vid.currentTime >= B) vid.currentTime = A; });
  $$('.seg button', host).forEach(b => b.onclick = () => { vid.playbackRate = +b.dataset.s; $$('.seg button', host).forEach(x => x.classList.toggle('on', x === b)); });
  $('.pa', host).onclick = () => { A = vid.currentTime; upd(); }; $('.pb', host).onclick = () => { B = vid.currentTime; upd(); }; $('.pc', host).onclick = () => { A = B = null; upd(); };
  const seek = t => { vid.currentTime = t; vid.play().catch(() => { }); };
  $('.pm', host).onclick = () => { const t = vid.currentTime, txt = prompt(`しおりのメモ（${fmtT(t)}）`, ''); if (txt === null) return; edit(); R.t.marks.push({ id: uid(), src, t, text: txt }); drawMarks(R, src, mks, seek); };
  drawMarks(R, src, mks, seek);
}
async function drawVideos(R) {
  const { t, ro } = R, box = $('#tVid'); if (!box) return;
  closeAllPlayers();
  const oks = []; for (const v of t.videos) oks.push(v.kind === 'ref' || await DB.has('videos', v.vid));
  if (!live(R)) return;
  box.innerHTML = `<div class="sh">動画</div><div class="grp">${t.videos.map((v, i) => `<div class="vrow" data-v="${v.id}">${cell({ icon: 'video', title: esc(v.name), sub: v.kind === 'copy' ? (oks[i] ? 'このiPhoneに保存済み' : '<span class="red">見つかりません</span>') : '名前だけ記録（再生時にファイルを選ぶ）', right: `<button class="ibtn vplay" aria-label="再生">${icon(v.kind === 'copy' && !oks[i] ? 'share' : 'play')}</button>${ro ? '' : `<button class="ibtn vrm" aria-label="外す">${icon('close')}</button>`}` })}<div class="phost"></div></div>`).join('')}
  ${ro ? '' : cell({ tap: true, attr: 'id="vadd"', icon: 'plus', title: '動画を取り込む', cls: 'act' }) + cell({ tap: true, attr: 'id="vref"', icon: 'link', title: '名前だけ記録する', cls: 'act' })}</div>
  ${ro ? '' : '<div class="sf">取り込むとオフラインですぐ再生できます（保存容量を使います）。名前だけの場合は容量を使いませんが、再生のたびにファイルを選びます。</div>'}`;
  $$('.vrow', box).forEach((el, i) => {
    const v = t.videos[i], host = $('.phost', el);
    $('.vplay', el).onclick = () => {
      if (v.kind === 'ref') pickFile('video/*').then(([f]) => { if (!f) return; if (f.name !== v.name && !confirm(`記録した名前（${v.name}）と違うファイルです。再生しますか？`)) return; openPlayer(R, v, host, f); });
      else if (!oks[i]) pickFile('video/*').then(async ([f]) => { if (!f) return; v.vid = await putBlob(f); v.name = f.name; save(); drawVideos(R); });
      else openPlayer(R, v, host);
    };
    const rm = $('.vrm', el);
    if (rm) rm.onclick = () => {
      if (!confirm('この動画を外しますか？（元に戻すボタンで戻せます）')) return;
      edit(); t.videos = t.videos.filter(x => x !== v); t.marks = t.marks.filter(m => m.src !== 'v:' + v.id);
      if (!t.videos.length) t.thumb = null; drawVideos(R); drawCover(R); if (board) renderBoard();
    };
  });
  const add = async kind => {
    const files = await pickFile('video/*', true); if (!files.length) return;
    let i = 0;
    for (const f of files) {
      i++; if (kind === 'copy') toast(`保存しています ${i}/${files.length}`);
      try {
        const v = { id: uid(), kind, name: f.name }; if (kind === 'copy') v.vid = await putBlob(f);
        edit(); t.videos.push(v);
        if (!t.thumb) { const p = await makePoster(f); if (p) t.thumb = await putBlob(p); }
        save();
      } catch (err) { alert('動画を保存できませんでした（容量が足りない可能性があります）: ' + err); break; }
    }
    if (live(R)) { drawVideos(R); drawCover(R); } if (board) renderBoard();
  };
  if (!ro) { $('#vadd').onclick = () => add('copy'); $('#vref').onclick = () => add('ref'); }
}

/* ---------- リンク ---------- */
function showEmbed(l, host, start) {
  host.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${l.yt.id}?start=${Math.floor(start || 0)}&playsinline=1&rel=0${start ? '&autoplay=1' : ''}" allow="fullscreen; picture-in-picture; encrypted-media; autoplay" allowfullscreen></iframe>`;
}
function drawLinks(R) {
  const { t, ro } = R, box = $('#tLink'); if (!box) return;
  box.innerHTML = `<div class="sh">リンク</div><div class="grp">${t.links.map(l => {
    const name = l.label || (l.yt ? 'YouTube動画' : (() => { try { return new URL(l.url).hostname; } catch { return l.url; } })());
    return `<div class="lrow" data-id="${l.id}">${cell({ icon: l.yt ? 'play' : 'link', title: esc(name), sub: l.yt ? 'YouTube' : esc((() => { try { return new URL(l.url).hostname; } catch { return ''; } })()) })}
      <div class="bt-row tight in">${l.yt ? '<button class="btn lemb">ここで再生</button><button class="btn gray lmk">しおりを追加</button>' : ''}<a class="btn gray" href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener noreferrer">${l.yt ? 'YouTubeで開く' : '開く'}</a>${ro ? '' : '<button class="btn red ldel">削除</button>'}</div><div class="lplay"></div><div class="lmks pad"></div></div>`;
  }).join('')}
  ${ro ? '' : `<input class="inp" id="lu" placeholder="URLを貼り付け（YouTubeなど）" inputmode="url" autocapitalize="off" autocorrect="off"><input class="inp" id="ll" placeholder="ラベル（任意）"><div class="bt-row"><button class="btn" id="ladd">リンクを追加</button></div>`}</div>
  <div class="sf">YouTubeの再生とサムネイル表示のときだけ、YouTubeと通信します。</div>`;
  $$('.lrow', box).forEach(el => {
    const l = t.links.find(x => x.id === el.dataset.id), host = $('.lplay', el), mk = $('.lmks', el);
    if (l.yt) {
      const src = 'l:' + l.id, seek = s => showEmbed(l, host, s), draw = () => drawMarks(R, src, mk, seek); draw();
      $('.lemb', el).onclick = () => { if (host.firstChild) { host.innerHTML = ''; $('.lemb', el).textContent = 'ここで再生'; } else { showEmbed(l, host, l.yt.start); $('.lemb', el).textContent = '閉じる'; } };
      $('.lmk', el).onclick = () => { const ts = prompt('しおりの時間（例 3:20）'); if (ts === null) return; const s = parseTime(ts); if (s === null) { toast('時間の形式が正しくありません'); return; } const txt = prompt('メモ（例：入り方）', ''); if (txt === null) return; edit(); t.marks.push({ id: uid(), src, t: s, text: txt }); draw(); };
    }
    const d = $('.ldel', el); if (d) d.onclick = () => { if (!confirm('このリンクを削除しますか？')) return; edit(); t.links = t.links.filter(x => x !== l); t.marks = t.marks.filter(m => m.src !== 'l:' + l.id); drawLinks(R); drawCover(R); if (board) renderBoard(); };
  });
  if (!ro) $('#ladd').onclick = () => {
    const u = $('#lu').value.trim(); if (!u) return;
    let url; try { url = new URL(/^https?:\/\//i.test(u) ? u : 'https://' + u).href; } catch { toast('URLの形式が正しくありません'); return; }
    edit(); t.links.push({ id: uid(), url, label: $('#ll').value.trim(), yt: ytInfo(url) }); drawLinks(R); drawCover(R); if (board) renderBoard();
  };
}

/* ---------- この技のあと（ポジション移動） ---------- */
function drawNext(R) {
  const { t, node, ro } = R, box = $('#tNext'); if (!box) return;
  if (!node) { box.innerHTML = ''; return; }
  const cur = node.goto ? node.goto.board + '|' + node.goto.side : '';
  const gb = node.goto && state.boards.find(b => b.id === node.goto.board);
  const opts = state.boards.map(b => ['bottom', 'top'].map(s => `<option value="${b.id}|${s}" ${cur === b.id + '|' + s ? 'selected' : ''}>${esc(b.name)}（${SIDE_LABEL[s]}）</option>`).join('')).join('');
  box.innerHTML = `<div class="sh">この技のあと</div><div class="grp">
    <div class="cell"><div class="cl lbl">移るポジション</div><select class="sel" id="gsel" ${ro ? 'disabled' : ''}><option value="">なし</option>${opts}${ro ? '' : '<option value="__new">新しいポジションを作る…</option>'}</select></div>
    ${gb ? cell({ tap: true, attr: 'id="ggo"', icon: 'arrow', title: `${esc(gb.name)}・${SIDE_LABEL[node.goto.side]}を開く`, cls: 'act' }) : ''}</div>
    <div class="sf">スイープやパスで別のポジションに移る技に設定すると、図の中の技からすぐ移れます。</div>`;
  if (gb) $('#ggo').onclick = () => { closeSheet(); openBoard(gb.id, 'link', node.goto.side); setTimeout(fitView, 30); };
  if (ro) return;
  $('#gsel').onchange = e => {
    const v = e.target.value;
    if (v === '__new') {
      const name = prompt('新しいポジション名（例：マウント）'); if (!name || !name.trim()) { drawNext(R); return; }
      const nb = blankBoard(name.trim()); state.boards.push(nb); edit();
      node.goto = { board: nb.id, side: ['スイープ', 'パス', 'テイクダウン'].includes(t.kind) ? 'top' : board.side };
    } else { edit(); node.goto = v ? { board: v.split('|')[0], side: v.split('|')[1] } : null; }
    save(); renderBoard(); drawNext(R);
  };
}

/* ---------- 対処 ---------- */
function drawCounters(R) {
  const { t, node, ro } = R, box = $('#tCnt'); if (!box) return;
  const rev = Object.values(state.techs).filter(x => x.counters.includes(t.id));
  const row = (c, attr) => { const ps = placements(c.id); return cell({ tap: true, attr, icon: 'shield', title: esc(c.title), sub: ps.length ? ps.slice(0, 2).map(p => `${esc(p.board.name)}・${SIDE_LABEL[p.side]}`).join('、') : 'まだ図に置いていません', chev: true, right: ro ? '' : (attr.startsWith('data-c') ? `<button class="ibtn crm" aria-label="外す">${icon('close')}</button>` : '') }); };
  box.innerHTML = `<div class="sh">この技への対処</div><div class="grp">${t.counters.map(id => row(T(id), `data-c="${id}"`)).join('')}${ro ? '' : cell({ tap: true, attr: 'id="cadd"', icon: 'plus', title: '対処を追加', cls: 'act' })}</div>
  <div class="sf">${node ? `追加した対処は、このポジションの「${SIDE_LABEL[other(board.side)]}」の面にも置かれます。` : '相手にこの技をされたときの対処をまとめておけます。'}</div>
  ${rev.length ? `<div class="sh">この技で対処できる技</div><div class="grp">${rev.map(c => row(c, `data-r="${c.id}"`)).join('')}</div>` : ''}`;
  $$('[data-c],[data-r]', box).forEach(el => el.onclick = ev => {
    const id = el.dataset.c || el.dataset.r;
    if (ev.target.closest('.crm')) { edit(); t.counters = t.counters.filter(x => x !== id); drawCounters(R); if (board) renderBoard(); return; }
    jumpToTech(id, R);
  });
  if (!ro) $('#cadd').onclick = () => openPicker({
    title: '対処を追加', back: R.reopen, exclude: [t.id, ...t.counters], onPick: (cid, isNew) => {
      edit(); t.counters.push(cid);
      if (node) {
        const os = other(board.side), Sd = board.sides[os];
        if (!Sd.nodes.some(n => n.tid === cid)) { placeNode(cid, os, { x: node.x, y: node.y + (Sd.nodes.length ? 0 : 0) + Sd.nodes.length * 20 }); toast(`「${SIDE_LABEL[os]}」の面に置きました`); }
      }
      save(); if (isNew) autoImage(T(cid), true); R.reopen();
    }
  });
}
function jumpToTech(tid, R) {
  if (board && $('#vBoard').classList.contains('on')) {
    for (const s of [other(board.side), board.side]) {
      const n = board.sides[s].nodes.find(n => n.tid === tid);
      if (n) { closeSheet(); board.side = s; save(); syncHeader(); renderBoard(); if (!curVis.visible.has(n.id)) { board.sides[s].nodes.forEach(x => x.collapsed = false); renderBoard(); } centerOn(n); flash(n.id); return; }
    }
  }
  const pl = placements(tid)[0];
  if (pl) { gotoNode(pl.board.id, pl.side, pl.node.id, board ? 'link' : 'fresh'); return; }
  openTech(tid, null, R && R.reopen);
}

/* ---------- 配置・操作 ---------- */
function drawPlaces(R) {
  const { t, node } = R, box = $('#tPl'); if (!box) return;
  const ps = placements(t.id).filter(p => !node || p.node !== node);
  box.innerHTML = ps.length ? `<div class="sh">${node ? 'ほかに置いてある図' : '置いてある図'}</div><div class="grp">${ps.map((p, i) => cell({ tap: true, attr: `data-p="${i}"`, icon: 'map', title: esc(p.board.name), sub: SIDE_LABEL[p.side], chev: true })).join('')}</div>` : (node ? '' : '<div class="sh">置いてある図</div><div class="grp">' + cell({ title: 'まだどの図にも置いていません', cls: 'muted' }) + '</div>');
  $$('[data-p]', box).forEach(el => el.onclick = () => { const p = ps[+el.dataset.p]; gotoNode(p.board.id, p.side, p.node.id, board ? 'link' : 'fresh'); });
}
function drawActs(R) {
  const { t, node, ro } = R, box = $('#tAct'); if (!box) return;
  if (node) {
    const kids = SD().edges.some(e => e.from === node.id);
    box.innerHTML = `<div class="grp">${cell({ tap: true, attr: 'id="ahi"', icon: 'eye', title: 'つながりだけを表示', cls: 'act' })}${ro ? '' : cell({ tap: true, attr: 'id="acon"', icon: 'connect', title: '矢印をつなぐ', cls: 'act' })}${kids ? cell({ tap: true, attr: 'id="afold"', icon: node.collapsed ? 'down' : 'up', title: node.collapsed ? 'この先を表示する' : 'この先を折りたたむ', cls: 'act' }) : ''}</div>
    ${ro ? '' : `<div class="grp">${cell({ tap: true, attr: 'id="arm"', title: 'この図から外す', cls: 'act danger' })}</div><div class="sf">外しても、技は「技」タブに残ります。</div>`}`;
    $('#ahi').onclick = () => { focusId = node.id; closeSheet(); setBanner('つながりだけを表示中（空いている所をタップで解除）'); renderBoard(); };
    if (kids) $('#afold').onclick = () => { edit(); node.collapsed = !node.collapsed; closeSheet(); };
    if (ro) return;
    $('#acon').onclick = () => { closeSheet(); connectFrom = node.id; setBanner('つなぎ先の技をタップ（空いている所で中止）'); renderBoard(); };
    $('#arm').onclick = () => { edit(); const Sd = SD(); Sd.nodes = Sd.nodes.filter(x => x !== node); Sd.edges = Sd.edges.filter(e => e.from !== node.id && e.to !== node.id); closeSheet(); syncHeader(); toast('図から外しました'); };
  } else {
    box.innerHTML = `<div class="grp">${cell({ tap: true, attr: 'id="adel"', title: 'この技を削除', cls: 'act danger' })}</div><div class="sf">すべての図から外れ、動画やメモも消えます。</div>`;
    $('#adel').onclick = async () => {
      const n = placements(t.id).length;
      if (!confirm(`「${t.title || 'この技'}」を削除しますか？${n ? `\n${n}か所の図からも外れます。` : ''}\n（自動バックアップから戻せます）`)) return;
      await snapshot('技の削除前');
      state.boards.forEach(b => ['bottom', 'top'].forEach(s => { const Sd = b.sides[s], ids = new Set(Sd.nodes.filter(x => x.tid === t.id).map(x => x.id)); Sd.nodes = Sd.nodes.filter(x => !ids.has(x.id)); Sd.edges = Sd.edges.filter(e => !ids.has(e.from) && !ids.has(e.to)); }));
      Object.values(state.techs).forEach(x => x.counters = x.counters.filter(c => c !== t.id));
      delete state.techs[t.id]; await saveNow(); closeSheet(); toast('削除しました');
    };
  }
}
/* ================= バックアップ・読み込み・ロック・起動 ================= */
async function showBackups() {
  const list = (await DB.get('kv', 'backups')) || [];
  const cnt = d => { const m = d.techs ? Object.keys(d.techs).length : (d.boards || []).reduce((a, b) => a + ((b && b.nodes) || []).length, 0); return `ポジション ${(d.boards || []).length} ・ 技 ${m}`; };
  openSheet({ title: '自動バックアップ', body: (list.length ? '<div class="grp">' + list.map((b, i) => { const d = new Date(b.t); return cell({ attr: `data-i="${i}"`, title: `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}　${esc(b.label)}`, sub: cnt(b.data), right: '<button class="btn sm">復元</button>' }); }).join('') + '</div>' : '<div class="empty sm"><p>まだバックアップはありません。</p></div>') + '<div class="sf">構成・メモ・しおりを最大8件まで自動で残します。動画そのものは含まれません。復元すると今のデータは置き換わりますが、復元前の状態も1件残ります。</div>' });
  $$('#sheet [data-i] .btn').forEach(btn => btn.onclick = async () => {
    const b = list[+btn.closest('[data-i]').dataset.i];
    if (!confirm('このバックアップの状態に戻しますか？')) return;
    await snapshot('復元前の状態');
    state = migrate(JSON.parse(JSON.stringify(b.data))); await saveNow(); closeSheet(); board = null; show('vTabs'); refreshTab(); toast('復元しました');
  });
}

async function exportJson() {
  const st = JSON.parse(JSON.stringify(state));
  Object.values(st.techs).forEach(t => { t.videos = t.videos.map(v => ({ ...v, kind: 'ref', vid: null })); t.thumb = null; t.img = null; t.imgCredit = null; t.photos = []; });
  await shareOrDownload(new File([JSON.stringify({ app: 'bjjflow', format: 3, state: st }, null, 1)], `bjjflow-${dateStr()}.json`, { type: 'application/json' }));
}
async function exportFull() {
  toast('書き出しを準備しています（動画が多いと時間がかかります）');
  const refs = new Set(); collectRefs(state, refs); const meta = [], parts = [];
  for (const k of refs) { const b = await DB.get('videos', k); if (b) { meta.push({ key: k, size: b.size, type: b.type }); parts.push(b); } }
  const header = new TextEncoder().encode(JSON.stringify({ app: 'bjjflow', format: 3, state, blobs: meta }));
  const len = new Uint8Array(4); new DataView(len.buffer).setUint32(0, header.length);
  await shareOrDownload(new File(['BJJBAK01', len, header, ...parts], `bjjflow-full-${dateStr()}.bjjbak`, { type: 'application/octet-stream' }));
}
function remapImported(st, remap) {
  Object.values(st.techs).forEach(t => {
    t.thumb = remap[t.thumb] || null; t.img = remap[t.img] || null; if (!t.img) t.imgCredit = null;
    t.photos = t.photos.map(p => remap[p]).filter(Boolean);
    t.videos = t.videos.map(v => { if (v.kind === 'copy') { if (remap[v.vid]) v.vid = remap[v.vid]; else { v.kind = 'ref'; delete v.vid; } } return v; });
  });
  const tmap = {}, bmap = {}, techs = {};
  Object.keys(st.techs).forEach(id => { tmap[id] = uid(); });
  st.boards.forEach(b => { bmap[b.id] = uid(); });
  Object.entries(st.techs).forEach(([id, t]) => { t.id = tmap[id]; t.counters = t.counters.map(c => tmap[c]).filter(Boolean); techs[t.id] = t; });
  st.techs = techs;
  st.boards.forEach(b => { b.id = bmap[b.id]; ['bottom', 'top'].forEach(s => b.sides[s].nodes.forEach(n => { n.tid = tmap[n.tid]; if (n.goto) n.goto.board = bmap[n.goto.board]; })); });
  return st;
}
async function importAny(file) {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const magic = new TextDecoder().decode(head.slice(0, 8)); let raw, remap = {}, nb = 0;
  if (magic === 'BJJBAK01') {
    const hl = new DataView(head.buffer, 8, 4).getUint32(0);
    const hdr = JSON.parse(await file.slice(12, 12 + hl).text());
    if (hdr.app !== 'bjjflow' || !hdr.state) throw new Error('形式が違います');
    if (!confirm(`${(hdr.state.boards || []).length}件のポジションと、画像・動画${hdr.blobs.length}個を、今のデータに追加します。`)) return;
    toast('読み込んでいます'); let off = 12 + hl;
    for (const b of hdr.blobs) { const nk = uid(); await DB.put('videos', nk, file.slice(off, off + b.size, b.type)); remap[b.key] = nk; off += b.size; nb++; }
    raw = hdr.state;
  } else {
    const d = JSON.parse(await file.text()); if (d.app !== 'bjjflow') throw new Error('形式が違います');
    raw = d.state || { boards: d.boards };
    if (!confirm(`${(raw.boards || []).length}件のポジションを、今のデータに追加します（動画は含まれません）。`)) return;
  }
  const st = remapImported(migrate(JSON.parse(JSON.stringify(raw))), remap);
  await snapshot('読み込み前の状態');
  Object.assign(state.techs, st.techs); state.boards.push(...st.boards); state = normalize3(state);
  await saveNow(); closeSheet(); refreshTab(); toast('読み込みました');
}
async function wipeAll() {
  try { DB.db.close(); } catch { }
  await new Promise(r => { const q = indexedDB.deleteDatabase('bjjflow'); q.onsuccess = q.onerror = q.onblocked = () => r(); });
  location.reload();
}

/* ---------- 暗証番号ロック ---------- */
let pinBuf = '', pinFail = 0, pinBlock = 0, hiddenAt = 0, lockedNow = false;
async function sha256(s) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join(''); }
function drawDots() { const d = $('#ldots'); if (d) d.innerHTML = [0, 1, 2, 3].map(i => `<i class="${i < pinBuf.length ? 'on' : ''}"></i>`).join(''); }
function lockMsg(t) { const m = $('#lmsg'); if (m) m.textContent = t; }
function hideLock() { $('#lock').style.display = 'none'; $('#lock').innerHTML = ''; lockedNow = false; }
function showLock(cover) {
  const el = $('#lock'); el.style.display = 'flex';
  if (cover) { if (!lockedNow) el.innerHTML = ''; return; }
  lockedNow = true; pinBuf = '';
  el.innerHTML = `<div class="lt2">BJJフロー</div><div class="lmsg" id="lmsg">暗証番号を入力</div><div class="dots" id="ldots"></div>
  <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'del'].map(k => k === '' ? '<span></span>' : k === 'del' ? `<button class="del" data-k="del" aria-label="1文字消す">${icon('back')}</button>` : `<button data-k="${k}">${k}</button>`).join('')}</div>
  <button class="tb" id="lforget">暗証番号を忘れた場合</button>`;
  drawDots();
  $$('.pad button', el).forEach(b => b.onclick = () => pinKey(b.dataset.k));
  $('#lforget').onclick = async () => { if (confirm('暗証番号は復元できません。すべてのデータを消去してロックを解除しますか？') && confirm('本当にすべて消去しますか？')) await wipeAll(); };
}
async function pinKey(k) {
  if (Date.now() < pinBlock) { lockMsg(`あと${Math.ceil((pinBlock - Date.now()) / 1000)}秒お待ちください`); return; }
  if (k === 'del') pinBuf = pinBuf.slice(0, -1); else if (pinBuf.length < 4) pinBuf += k;
  drawDots();
  if (pinBuf.length === 4) {
    const h = await sha256(settings.pin.salt + pinBuf);
    if (h === settings.pin.hash) { pinFail = 0; hideLock(); }
    else { pinFail++; pinBuf = ''; drawDots(); if (pinFail >= 5) { pinBlock = Date.now() + 30000; pinFail = 0; lockMsg('5回まちがえました。30秒お待ちください'); } else lockMsg('暗証番号が違います'); }
  }
}
function pinSettings() {
  openSheet({ title: '暗証番号ロック', body: `<div class="grp">${cell({ title: '暗証番号ロック', right: sw('pon', !!settings.pin) })}</div>
  <div id="pset"></div>
  <div class="sf">アプリを開いたときと、1分以上ほかのアプリを使って戻ったときに4桁の番号を聞きます。画面を隠すだけで、データの暗号化ではありません。iPhone自体のロックで足りる場合は、使わなくてかまいません。番号を忘れると、すべてのデータを消去しないと解除できません。</div>` });
  const form = () => {
    $('#pset').innerHTML = `<div class="grp"><input class="inp" type="tel" id="p1" maxlength="4" inputmode="numeric" placeholder="新しい暗証番号（数字4桁）"><input class="inp" type="tel" id="p2" maxlength="4" inputmode="numeric" placeholder="もう一度入力"></div><div class="bt-row"><button class="btn solid" id="psave">設定する</button></div>`;
    $('#psave').onclick = async () => {
      const a = $('#p1').value.trim(), b = $('#p2').value.trim();
      if (!/^\d{4}$/.test(a)) { toast('数字4桁で入力してください'); return; } if (a !== b) { toast('2回の入力が一致しません'); return; }
      const salt = uid() + uid(); settings.pin = { salt, hash: await sha256(salt + a) }; await saveSettings(); closeSheet(); toast('暗証番号を設定しました');
    };
  };
  bindSwitch('pon', async v => {
    if (v) form();
    else { if (!confirm('暗証番号ロックをオフにしますか？')) { $('#pon').classList.add('on'); return; } delete settings.pin; await saveSettings(); $('#pset').innerHTML = ''; toast('オフにしました'); }
  });
}
document.addEventListener('visibilitychange', () => {
  if (!settings.pin) return;
  if (document.hidden) { hiddenAt = Date.now(); showLock(true); }
  else if (lockedNow || Date.now() - hiddenAt > 60000) showLock(false); else hideLock();
});

/* ---------- 起動 ---------- */
$$('#tabbar button').forEach(b => b.onclick = () => showTab(b.dataset.t));
(async function init() {
  try {
    await DB.open();
    const raw = await DB.get('kv', 'state');
    state = raw && typeof raw === 'object' ? raw : { schema: 3, techs: {}, boards: [] };
    settings = (await DB.get('kv', 'settings')) || {};
    if (settings.pin) showLock(false);
    await autoBackup();                 // 変換する前の状態を先に残す
    state = migrate(state); await saveNow();
    await gc();
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
  } catch (e) { alert('この環境では保存機能が使えません: ' + e); }
  showTab('pos');
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
})();
