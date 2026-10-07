/* ============================================================
   ANGRY BIRDS — ядро: мир, материалы, птицы, сохранение,
   магазин, достижения, звук, генератор уровней и startLevel.
   Экспорт: window.ABG
   ============================================================ */
window.ABG = (function () {
'use strict';
var G = {};

/* ---------------- мир ---------------- */
G.WORLD_W   = 2000;
G.WORLD_H   = 700;
G.GROUND_Y  = 600;
G.SLING_X   = 200;
G.SLING_Y   = 450;
G.MAX_PULL  = 115;
G.POWER     = 7.4;
G.GRAVITY   = 1500;
G.TOTAL_LEVELS = 50;

/* ---------------- материалы ---------------- */
G.MAT = {
  wood:  { hp: 70,  den: 1.0, fill: '#c98b3d', edge: '#8a5a22', nm: 'Дерево'   },
  ice:   { hp: 42,  den: 0.7, fill: '#a9e0f6', edge: '#6fb6d6', nm: 'Лёд'      },
  stone: { hp: 140, den: 1.7, fill: '#b8b8bd', edge: '#7c7c86', nm: 'Камень'   },
  sand:  { hp: 95,  den: 1.3, fill: '#e2cd8d', edge: '#b29f61', nm: 'Песчаник' }
};

/* ---------------- птицы ---------------- */
G.BIRDS = {
  red:    { r: 22, mass: 1.00, dmg: 34, ability: 'none',  color: '#e8453c', nm: 'Ред'   },
  yellow: { r: 20, mass: 0.85, dmg: 30, ability: 'boost', color: '#f5c542', nm: 'Чак'   },
  blue:   { r: 17, mass: 0.70, dmg: 22, ability: 'split', color: '#4aa8e8', nm: 'Блюз'  },
  black:  { r: 25, mass: 1.40, dmg: 48, ability: 'bomb',  color: '#3a3a44', nm: 'Бомб'  }
};
G.BIRD = G.BIRDS;

/* ---------------- состояние ---------------- */
G.state = 'menu';  G.level = 1;  G.score = 0;
G.blocks = [];  G.pigs = [];  G.parts = [];  G.pops = [];  G.extraFlyers = [];
G.birdsLeft = [];  G.active = null;  G.flying = null;
G.started = false;  G.ended = false;  G.winT = 0;  G.loseT = 0;  G.combo = 0;
G.shots = 0;  G.kills = 0;  G.lastWin = null;  G.t = 0;

/* ---------------- магазин ---------------- */
G.ITEMS = [
  { id: 'gloves', nm: 'Крепкая резина', ds: '+18% к силе натяжения', price: 250, ico: '🧤' },
  { id: 'boots',  nm: 'Ботинки',        ds: '+1 птица в начале уровня', price: 400, ico: '👟' },
  { id: 'helmet', nm: 'Каска',          ds: 'Свиньи крепче, но +30% монет', price: 600, ico: '⛑' },
  { id: 'feather',nm: 'Перо',           ds: 'Птицы бьют на 20% сильнее', price: 350, ico: '🪶' },
  { id: 'magnet', nm: 'Магнит',         ds: '+15% монет за уровень', price: 500, ico: '🧲' },
  { id: 'wind',   nm: 'Попутный ветер',  ds: 'Ветер помогает в полёте', price: 450, ico: '🌬' }
];

/* ---------------- достижения ---------------- */
G.ACH = [
  { id: 'l1',    nm: 'Первый шаг',      ds: 'Пройди уровень 1',            ico: '🥚', test: function (s) { return s.levelsDone() >= 1; } },
  { id: 'l5',    nm: 'Новичок',         ds: 'Пройди 5 уровней',            ico: '🐣', test: function (s) { return s.levelsDone() >= 5; } },
  { id: 'l10',   nm: 'Охотник',         ds: 'Пройди 10 уровней',           ico: '🐦', test: function (s) { return s.levelsDone() >= 10; } },
  { id: 'l25',   nm: 'Разрушитель',     ds: 'Пройди 25 уровней',           ico: '🎯', test: function (s) { return s.levelsDone() >= 25; } },
  { id: 'l50',   nm: 'Легенда',         ds: 'Пройди все 50 уровней',       ico: '👑', test: function (s) { return s.levelsDone() >= 50; } },
  { id: 's30',   nm: 'Тридцать звёзд',  ds: 'Собери 30 звёзд',             ico: '⭐', test: function (s) { return s.starsTotal() >= 30; } },
  { id: 's75',   nm: 'Семьдесят пять',  ds: 'Собери 75 звёзд',             ico: '🌟', test: function (s) { return s.starsTotal() >= 75; } },
  { id: 's150',  nm: 'Звёздный путь',   ds: 'Собери 150 звёзд',            ico: '💫', test: function (s) { return s.starsTotal() >= 150; } },
  { id: 'k50',   nm: 'Пятьдесят свиней',ds: 'Победи 50 свиней',            ico: '🐷', test: function (s) { return (s.save.kills || 0) >= 50; } },
  { id: 'k200',  nm: 'Двести свиней',   ds: 'Победи 200 свиней',           ico: '🐽', test: function (s) { return (s.save.kills || 0) >= 200; } },
  { id: 'c500',  nm: 'Пятьсот монет',   ds: 'Накопи 500 монет',            ico: '🪙', test: function (s) { return s.save.coins >= 500; } },
  { id: 'c2000', nm: 'Богач',           ds: 'Накопи 2000 монет',           ico: '💰', test: function (s) { return s.save.coins >= 2000; } },
  { id: 'w1',    nm: 'Без потерь',      ds: '3 звезды на уровне',          ico: '🏅', test: function (s) { return (s.save.perfect || 0) >= 1; } },
  { id: 'w5',    nm: 'Отличник',        ds: '3 звезды на 5 уровнях',       ico: '🎖', test: function (s) { return (s.save.perfect || 0) >= 5; } },
  { id: 'w15',   nm: 'Академик',        ds: '3 звезды на 15 уровнях',      ico: '🏆', test: function (s) { return (s.save.perfect || 0) >= 15; } },
  { id: 'b20',   nm: 'Двадцать выстрелов', ds: 'Сделай 20 выстрелов',      ico: '🎯', test: function (s) { return (s.save.shots || 0) >= 20; } },
  { id: 'b100',  nm: 'Снайпер',         ds: 'Сделай 100 выстрелов',        ico: '🎪', test: function (s) { return (s.save.shots || 0) >= 100; } },
  { id: 'dry',   nm: 'Чистая работа',   ds: 'Уровень одной птицей',        ico: '🎈', test: function (s) { return (s.save.oneBird || 0) >= 1; } },
  { id: 'shop',  nm: 'Покупатель',      ds: 'Купи первую вещь в магазине', ico: '🛒', test: function (s) { return Object.keys(s.save.items || {}).length >= 1; } },
  { id: 'all',   nm: 'Коллекционер',    ds: 'Купи всё в магазине',         ico: '🎁', test: function (s) { return Object.keys(s.save.items || {}).length >= 6; } }
];

/* ---------------- прогресс ---------------- */
var KEY = 'ab_save_v2';
var DEF = {
  coins: 150, sound: true, music: false, vibe: true,
  items: {}, ach: {}, stars: {}, maxLevel: 1,
  kills: 0, shots: 0, perfect: 0, oneBird: 0
};

function copy(o) {
  var r = {}, k;
  for (k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k];
  return r;
}

G.load = function () {
  var d = null;
  try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
  G.save = copy(DEF);
  if (d && typeof d === 'object') {
    var k;
    for (k in DEF) if (d[k] !== undefined && d[k] !== null) G.save[k] = d[k];
    if (typeof d.items !== 'object' || !d.items) G.save.items = {};
    if (typeof d.ach   !== 'object' || !d.ach)   G.save.ach = {};
    if (typeof d.stars !== 'object' || !d.stars) G.save.stars = {};
    if (!(G.save.maxLevel >= 1)) G.save.maxLevel = 1;
  }
  return G.save;
};

G.store = function () {
  try { localStorage.setItem(KEY, JSON.stringify(G.save)); } catch (e) { /* нет места */ }
};

G.starsTotal = function () {
  var n = 0, k;
  for (k in G.save.stars) if (Object.prototype.hasOwnProperty.call(G.save.stars, k)) n += G.save.stars[k] | 0;
  return n;
};
G.levelsDone = function () { return Object.keys(G.save.stars || {}).length; };
G.achCount   = function () { return Object.keys(G.save.ach || {}).length; };
G.has        = function (id) { return !!(G.save.items && G.save.items[id]); };

G.buy = function (id) {
  var it = null, i;
  for (i = 0; i < G.ITEMS.length; i++) if (G.ITEMS[i].id === id) it = G.ITEMS[i];
  if (!it || G.has(id)) return false;
  if (G.save.coins < it.price) return false;
  G.save.coins -= it.price;
  G.save.items[id] = 1;
  G.checkAch();
  G.store();
  return true;
};

G.checkAch = function () {
  var got = [], i, a;
  for (i = 0; i < G.ACH.length; i++) {
    a = G.ACH[i];
    if (!G.save.ach[a.id]) {
      var ok = false;
      try { ok = !!a.test(G); } catch (e) { ok = false; }
      if (ok) { G.save.ach[a.id] = 1; got.push(a); }
    }
  }
  if (got.length) G.store();
  return got;
};

G.resetProgress = function () {
  var sound = G.save.sound, music = G.save.music, vibe = G.save.vibe;
  G.save = copy(DEF);
  G.save.sound = sound; G.save.music = music; G.save.vibe = vibe;
  G.store();
};

/* ---------------- звук ---------------- */
var ac = null, musicOn = false, musicTimer = null;
function actx() {
  if (!ac) {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ac = new AC(); } catch (e) { ac = null; }
  }
  if (ac && ac.state === 'suspended') { try { ac.resume(); } catch (e) { /* игнор */ } }
  return ac;
}
function tone(freq, dur, type, vol, when) {
  var c = actx();
  if (!c || !G.save.sound) return;
  var t0 = c.currentTime + (when || 0);
  var o = c.createOscillator(), gn = c.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(freq, t0);
  gn.gain.setValueAtTime(0.0001, t0);
  gn.gain.linearRampToValueAtTime(vol == null ? 0.16 : vol, t0 + 0.012);
  gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(gn); gn.connect(c.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}
G.SFX = {
  ac: function () { actx(); },
  click:  function () { tone(660, 0.07, 'square', 0.09); },
  pull:   function () { tone(180, 0.12, 'sawtooth', 0.06); },
  shoot:  function () { tone(420, 0.16, 'triangle', 0.12); tone(210, 0.22, 'sine', 0.08, 0.02); },
  hit:    function () { tone(120, 0.12, 'square', 0.10); },
  wood:   function () { tone(240, 0.10, 'square', 0.09); },
  ice:    function () { tone(1400, 0.09, 'triangle', 0.08); },
  stone:  function () { tone(90, 0.16, 'sawtooth', 0.11); },
  pig:    function () { tone(520, 0.10, 'square', 0.10); tone(360, 0.14, 'square', 0.08, 0.06); },
  boost:  function () { tone(300, 0.20, 'sawtooth', 0.10); tone(900, 0.18, 'triangle', 0.07, 0.04); },
  split:  function () { tone(700, 0.08, 'square', 0.09); tone(900, 0.08, 'square', 0.09, 0.05); },
  bomb:   function () { tone(70, 0.34, 'sawtooth', 0.17); tone(140, 0.28, 'square', 0.10, 0.01); },
  win:    function () { tone(523, 0.14, 'sine', 0.13); tone(659, 0.14, 'sine', 0.13, 0.13); tone(784, 0.24, 'sine', 0.13, 0.26); },
  lose:   function () { tone(300, 0.20, 'sine', 0.11); tone(200, 0.30, 'sine', 0.11, 0.18); },
  coin:   function () { tone(1100, 0.07, 'square', 0.08); tone(1500, 0.10, 'square', 0.07, 0.05); }
};

G.musicStart = function () {
  if (musicOn || !G.save.music) return;
  var c = actx();
  if (!c) return;
  musicOn = true;
  var seq = [262, 330, 392, 330, 294, 349, 440, 392], i = 0;
  musicTimer = setInterval(function () {
    if (!G.save.music) { G.musicStop(); return; }
    tone(seq[i % seq.length], 0.42, 'triangle', 0.035);
    if (i % 4 === 0) tone(seq[i % seq.length] / 2, 0.7, 'sine', 0.03);
    i++;
  }, 480);
};
G.musicStop = function () {
  musicOn = false;
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
};

G.vibe = function (ms) {
  if (!G.save.vibe) return;
  try { if (navigator.vibrate) navigator.vibrate(ms || 20); } catch (e) { /* игнор */ }
};

G.ac = function () { return actx(); };  /* совместимость с внешними вызовами */

/* ---------------- генератор уровней ---------------- */
/* Детерминированный псевдослучайный поток по номеру уровня */
function pick(seed, i) {
  var x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function structure(x, gy, w, h, mat) {
  var list = [];
  var cols = 2, rows = 3, cw = w, ch = h / rows, gap = 6, i, j;
  for (j = 0; j < rows; j++) {
    for (i = 0; i < cols; i++) {
      list.push({
        x: x + i * (cw + gap),
        y: gy - (j + 1) * (ch + gap),
        w: cw, h: ch, m: mat
      });
    }
  }
  return list;
}

G.def = function (n) {
  var gy = G.GROUND_Y;
  var out = { blocks: [], pigs: [] };
  var mats = ['wood', 'ice', 'stone', 'sand'];
  var diff = Math.min(1, (n - 1) / 49);
  var mat = mats[Math.floor(pick(n, 3) * 4) % 4];
  var towers = 1 + Math.floor(pick(n, 1) * (1 + diff * 2));   /* 1..3 башни */
  var x0 = 780 + Math.floor(pick(n, 2) * 120);
  var t, base;

  for (t = 0; t < towers; t++) {
    base = x0 + t * 300;
    var w = 66 + Math.floor(pick(n, 10 + t) * 18);
    var h = 150 + Math.floor(pick(n, 20 + t) * 120);
    var st = structure(base, gy, w, h, mat);
    var k;
    for (k = 0; k < st.length; k++) out.blocks.push(st[k]);

    /* горизонтальная плита сверху */
    out.blocks.push({ x: base - 10, y: gy - h - 16, w: w * 2 + 26, h: 16, m: 'stone' });

    /* свинья внутри башни */
    out.pigs.push({ x: base + w / 2, y: gy - 52, r: 24 });
    if (pick(n, 40 + t) > 0.45) out.pigs.push({ x: base + w / 2, y: gy - h + 24, r: 20 });
  }

  /* свинья на земле слева от построек */
  if (pick(n, 50) > 0.6) out.pigs.push({ x: x0 - 120, y: gy - 26, r: 26 });

  /* гарантия: минимум одна свинья и одна постройка */
  if (!out.pigs.length) out.pigs.push({ x: x0 + 60, y: gy - 26, r: 26 });
  if (!out.blocks.length) {
    var b = structure(x0, gy, 70, 180, 'wood');
    for (var q = 0; q < b.length; q++) out.blocks.push(b[q]);
  }
  return out;
};

/* ---------------- птицы уровня ---------------- */
function birdSet(n) {
  var types = ['red'];
  if (n >= 3)  types.push('yellow');
  if (n >= 7)  types.push('blue');
  if (n >= 12) types.push('black');
  if (n >= 20) { types.push('yellow'); types.push('red'); }
  if (n >= 30) { types.push('black'); types.push('blue'); }
  var count = 3 + (n >= 10 ? 1 : 0) + (n >= 25 ? 1 : 0);
  if (G.has('boots')) count += 1;
  var out = [], i;
  for (i = 0; i < count; i++) out.push(types[i % types.length]);
  return out;
}

/* ---------------- запуск уровня ---------------- */
G.startLevel = function (n) {
  n = Math.max(1, Math.min(G.TOTAL_LEVELS, n | 0 || 1));
  G.level = n;
  G.score = 0;
  G.state = 'play';
  G.started = false;
  G.ended = false;
  G.winT = 0;
  G.loseT = 0;
  G.combo = 0;
  G.shots = 0;
  G.t = 0;
  G.blocks = [];
  G.pigs = [];
  G.parts = [];
  G.pops = [];
  G.extraFlyers = [];
  G.flying = null;
  G.active = null;

  var L = G.def(n), i;
  for (i = 0; i < L.blocks.length; i++) {
    var b = L.blocks[i], mt = G.MAT[b.m] || G.MAT.wood;
    var hp = Math.round(mt.hp * (1 + 0.35 * (1 - (L.blocks.length ? 0 : 1))));
    if (G.has('helmet')) hp = Math.round(hp * 1.25);
    G.blocks.push({
      x: b.x, y: b.y, w: b.w, h: b.h, m: b.m,
      vx: 0, vy: 0, hp: hp, max: hp, dead: false, static: false, slp: 0
    });
  }
  for (i = 0; i < L.pigs.length; i++) {
    var p = L.pigs[i];
    var php = Math.round(46 + p.r * 2.6);
    if (G.has('helmet')) php = Math.round(php * 1.2);
    G.pigs.push({ x: p.x, y: p.y, r: p.r, vx: 0, vy: 0, hp: php, max: php, dead: false, slp: 0, blink: 0 });
  }

  G.birdsLeft = birdSet(n);
  G.started = true;
  G.nextBird();
  return G;
};

/* ---------------- птица на рогатке ---------------- */
G.nextBird = function () {
  G.flying = null;
  G.active = null;
  if (!G.birdsLeft.length) return null;
  var t = G.birdsLeft.shift();
  var B = G.BIRDS[t] || G.BIRDS.red;
  G.active = {
    type: t, x: G.SLING_X, y: G.SLING_Y, vx: 0, vy: 0, r: B.r,
    state: 'ready', used: false, rot: 0, dmg: B.dmg, mass: B.mass, color: B.color
  };
  return G.active;
};

G.alivePigs = function () {
  var n = 0, i;
  for (i = 0; i < G.pigs.length; i++) if (!G.pigs[i].dead) n++;
  return n;
};

G.deadBlocks = function () {
  var n = 0, i;
  for (i = 0; i < G.blocks.length; i++) if (G.blocks[i].dead) n++;
  return n;
};

G.load();
return G;
})();
