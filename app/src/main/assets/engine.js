/* ANGRY BIRDS — ядро: мир, прогресс, звук, магазин, достижения, уровни.
   Экспорт: window.ABG */
(function () {
'use strict';

var G = window.ABG = {};

/* ---------- константы мира ---------- */
G.WORLD_W = 2400;
G.WORLD_H = 720;
G.GROUND_Y = 640;
G.SLING_X = 250;
G.SLING_Y = 450;
G.GRAVITY = 1500;
G.POWER = 7.4;
G.MAX_PULL = 150;
G.PIG_R = 27;
G.TOTAL_LEVELS = 50;

G.MAT = {
  wood:  { fill: '#c8894a', edge: '#8a5a24', hp: 60,  coins: 20 },
  ice:   { fill: '#bfe9ff', edge: '#7cbcd8', hp: 42,  coins: 25 },
  stone: { fill: '#9aa3ad', edge: '#6a727c', hp: 130, coins: 35 }
};

G.BIRD = {
  red:    { r: 21, col: '#e8453c', dmg: 1.0 },
  yellow: { r: 20, col: '#f5c542', dmg: 0.9 },
  blue:   { r: 16, col: '#4aa8e8', dmg: 0.7 },
  black:  { r: 23, col: '#3a3a44', dmg: 1.1 },
  ram:    { r: 24, col: '#c62828', dmg: 1.8 }
};

/* ---------- состояние ---------- */
G.state = 'menu';
G.level = 1;
G.score = 0;
G.blocks = [];
G.pigs = [];
G.active = null;
G.flying = null;
G.extraFlyers = [];
G.birdsLeft = [];
G.parts = [];
G.pops = [];
G.lastWin = null;

/* ---------- прогресс ---------- */
var KEY = 'angry_birds_save_v1';

function fresh() {
  return { coins: 0, levels: {}, ach: {}, items: {}, sound: true, music: true,
           vibe: true, kills: 0, shots: 0, wins: 0 };
}

G.save = (function () {
  var s = null;
  try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { s = null; }
  if (!s || typeof s !== 'object') s = fresh();
  if (!s.levels) s.levels = {};
  if (!s.ach) s.ach = {};
  if (!s.items) s.items = {};
  return s;
})();

G.store = function () {
  try { localStorage.setItem(KEY, JSON.stringify(G.save)); } catch (e) {}
};
G.resetProgress = function () { G.save = fresh(); G.store(); };

G.maxUnlocked = function () {
  var m = 1, i;
  for (i = 1; i <= G.TOTAL_LEVELS; i++) {
    if ((G.save.levels[i] | 0) > 0) m = Math.min(G.TOTAL_LEVELS, i + 1);
  }
  return m;
};
G.starsTotal = function () {
  var t = 0, k;
  for (k in G.save.levels) t += (G.save.levels[k] | 0);
  return t;
};
G.levelsDone = function () {
  var n = 0, k;
  for (k in G.save.levels) if ((G.save.levels[k] | 0) > 0) n++;
  return n;
};
G.achCount = function () {
  var n = 0, k;
  for (k in G.save.ach) if (G.save.ach[k]) n++;
  return n;
};
G.alivePigs = function () {
  var n = 0, i;
  for (i = 0; i < G.pigs.length; i++) if (!G.pigs[i].dead) n++;
  return n;
};

/* ---------- звук ---------- */
var AC = null;
function actx() {
  if (!AC) {
    try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; }
  }
  return AC;
}
G.ac = function () {
  var a = actx();
  if (a && a.state === 'suspended') { try { a.resume(); } catch (e) {} }
};

function tone(freq, dur, type, vol) {
  var a = actx();
  if (!a) return;
  var o = a.createOscillator(), g = a.createGain();
  o.type = type || 'sine';
  o.frequency.value = freq;
  g.gain.value = 0;
  g.gain.linearRampToValueAtTime(vol || 0.12, a.currentTime + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.connect(g);
  g.connect(a.destination);
  o.start();
  o.stop(a.currentTime + dur + 0.03);
}

G.SFX = {
  click:  function () { if (G.save.sound) tone(660, 0.07, 'square', 0.07); },
  hit:    function () { if (G.save.sound) tone(170, 0.10, 'sawtooth', 0.09); },
  pull:   function () { if (G.save.sound) tone(300, 0.06, 'triangle', 0.05); },
  launch: function () { if (G.save.sound) tone(520, 0.12, 'triangle', 0.11); },
  pop:    function () {
    if (!G.save.sound) return;
    tone(880, 0.09, 'sine', 0.13);
    setTimeout(function () { tone(1180, 0.10, 'sine', 0.10); }, 70);
  },
  crack:  function () { if (G.save.sound) tone(140, 0.08, 'square', 0.09); },
  boom:   function () { if (G.save.sound) tone(90, 0.30, 'sawtooth', 0.18); },
  star:   function () {
    if (!G.save.sound) return;
    tone(1040, 0.10, 'sine', 0.11);
    setTimeout(function () { tone(1560, 0.14, 'sine', 0.11); }, 90);
  }
};

G.vibe = function (ms) {
  if (G.save.vibe && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} }
};

/* ---------- музыка ---------- */
var musTimer = null, musStep = 0;
var MELODY = [523, 659, 784, 659, 587, 698, 880, 698];

function musicNote(freq) {
  var a = actx();
  if (!a) return;
  var o = a.createOscillator(), g = a.createGain();
  o.type = 'triangle';
  o.frequency.value = freq;
  g.gain.value = 0;
  g.gain.linearRampToValueAtTime(0.03, a.currentTime + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.44);
  o.connect(g);
  g.connect(a.destination);
  o.start();
  o.stop(a.currentTime + 0.48);
}

G.musicStart = function () {
  if (!G.save.music || musTimer) return;
  G.ac();
  musTimer = setInterval(function () {
    if (!G.save.music) return;
    musicNote(MELODY[musStep % MELODY.length]);
    musStep++;
  }, 480);
};
G.musicStop = function () {
  if (musTimer) { clearInterval(musTimer); musTimer = null; }
};

/* ---------- магазин ---------- */
G.ITEMS = [
  { id: 'blue',   t: 'Синяя птица',  d: 'Раскалывается на три в полёте', p: 300,  ic: '🔵' },
  { id: 'bomb',   t: 'Чёрная птица', d: 'Взрывается по тапу в полёте',    p: 600,  ic: '💣' },
  { id: 'gold',   t: 'Золотая птица', d: 'Три жёлтых птицы в колоде',     p: 1200, ic: '⭐' },
  { id: 'ram',    t: 'Супер-таран',  d: 'Три усиленных красных',          p: 1800, ic: '🐦' },
  { id: 'pantry', t: 'Кладовая',     d: '+25% монет за уровень',          p: 2500, ic: '🪙' }
];

G.buy = function (id) {
  var it = null, i;
  for (i = 0; i < G.ITEMS.length; i++) if (G.ITEMS[i].id === id) it = G.ITEMS[i];
  if (!it) return 'none';
  if (G.save.items[id]) return 'owned';
  if (G.save.coins < it.p) return 'money';
  G.save.coins -= it.p;
  G.save.items[id] = true;
  G.store();
  return 'ok';
};

/* ---------- достижения (20) ---------- */
G.ACH = [
  { id: 'lvl1',  n: 'Первый шаг',     d: 'Пройти 1 уровень',              f: function () { return G.levelsDone() >= 1; } },
  { id: 'lvl5',  n: 'Новичок',        d: 'Пройти 5 уровней',              f: function () { return G.levelsDone() >= 5; } },
  { id: 'lvl10', n: 'Опытный',        d: 'Пройти 10 уровней',             f: function () { return G.levelsDone() >= 10; } },
  { id: 'lvl20', n: 'Ветеран',        d: 'Пройти 20 уровней',             f: function () { return G.levelsDone() >= 20; } },
  { id: 'lvl30', n: 'Мастер',         d: 'Пройти 30 уровней',             f: function () { return G.levelsDone() >= 30; } },
  { id: 'lvl50', n: 'Легенда',        d: 'Пройти все 50 уровней',         f: function () { return G.levelsDone() >= 50; } },
  { id: 'st10',  n: 'Первые звёзды',  d: 'Собрать 10 звёзд',              f: function () { return G.starsTotal() >= 10; } },
  { id: 'st40',  n: 'Созвездие',      d: 'Собрать 40 звёзд',              f: function () { return G.starsTotal() >= 40; } },
  { id: 'st75',  n: 'Половина неба',  d: 'Собрать 75 звёзд',              f: function () { return G.starsTotal() >= 75; } },
  { id: 'st150', n: 'Идеально',       d: 'Собрать все 150 звёзд',         f: function () { return G.starsTotal() >= 150; } },
  { id: 'k10',   n: 'Охотник',        d: 'Разбить 10 свинок',             f: function () { return G.save.kills >= 10; } },
  { id: 'k50',   n: 'Гроза свиней',   d: 'Разбить 50 свинок',             f: function () { return G.save.kills >= 50; } },
  { id: 'k150',  n: 'Истребитель',    d: 'Разбить 150 свинок',            f: function () { return G.save.kills >= 150; } },
  { id: 'k300',  n: 'Легенда охоты',  d: 'Разбить 300 свинок',            f: function () { return G.save.kills >= 300; } },
  { id: 's100',  n: 'Сто выстрелов',  d: 'Сделать 100 выстрелов',         f: function () { return G.save.shots >= 100; } },
  { id: 'c1000', n: 'Богач',          d: 'Накопить 1000 монет',           f: function () { return G.save.coins >= 1000; } },
  { id: 'c5000', n: 'Копилка',        d: 'Накопить 5000 монет',           f: function () { return G.save.coins >= 5000; } },
  { id: 'b1',    n: 'Покупатель',     d: 'Купить любую вещь в магазине',  f: function () { for (var k in G.save.items) if (G.save.items[k]) return true; return false; } },
  { id: 'b5',    n: 'Всё своё',       d: 'Скупить весь магазин',          f: function () { for (var i = 0; i < G.ITEMS.length; i++) if (!G.save.items[G.ITEMS[i].id]) return false; return true; } },
  { id: 'w10',   n: 'Триумф',         d: '10 уровней на три звезды',      f: function () { var n = 0, k; for (k in G.save.levels) if ((G.save.levels[k] | 0) === 3) n++; return n >= 10; } }
];

G.checkAch = function () {
  var gained = 0, i;
  for (i = 0; i < G.ACH.length; i++) {
    var a = G.ACH[i];
    if (G.save.ach[a.id]) continue;
    var ok = false;
    try { ok = !!a.f(); } catch (e) { ok = false; }
    if (ok) { G.save.ach[a.id] = true; G.save.coins += 200; gained++; }
  }
  if (gained) { G.store(); G.SFX.star(); }
  return gained;
};

/* ---------- генератор 50 уровней ---------- */
function mulberry(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

G.levelData = function (n) {
  var rnd = mulberry(n * 7919 + 13);
  var tiers = Math.min(4, Math.floor((n - 1) / 10));
  var mats = tiers >= 4 ? ['stone', 'stone', 'wood']
           : tiers >= 3 ? ['stone', 'wood', 'ice']
           : tiers >= 2 ? ['ice', 'wood', 'stone']
           : tiers >= 1 ? ['ice', 'wood'] : ['wood', 'ice'];

  var pigsN = Math.min(7, 1 + Math.floor((n - 1) / 7));
  var baseX = 1450 + Math.floor(rnd() * 250);
  var blocks = [], slots = [], i, y;

  function col(cx, bottom, w, h, m) {
    blocks.push({ x: cx, y: bottom - h / 2, w: w, h: h, m: m });
    return bottom - h;
  }
  function slot(cx, bottom) { slots.push({ x: cx, y: bottom - G.PIG_R }); }

  var tmpl = n % 6;
  var fi = function (k) { return mats[k % mats.length]; };

  if (tmpl === 0) {
    y = G.GROUND_Y - 4;
    var lv = 2 + Math.floor(rnd() * 2);
    for (i = 0; i < lv; i++) {
      col(baseX - 55, y, 30, 90, fi(i));
      col(baseX + 55, y, 30, 90, fi(i));
      y = col(baseX, y, 170, 26, fi(i + 1));
      slot(baseX, y + 26);
      y -= 4;
    }
  } else if (tmpl === 1) {
    y = G.GROUND_Y - 4;
    col(baseX - 70, y, 28, 110, fi(0));
    col(baseX + 70, y, 28, 110, fi(0));
    y = col(baseX, y, 200, 28, fi(1));
    col(baseX - 40, y, 28, 80, fi(1));
    col(baseX + 40, y, 28, 80, fi(1));
    col(baseX, y - 80, 160, 26, fi(2));
    slot(baseX, G.GROUND_Y - 4);
    slot(baseX, y + 28);
  } else if (tmpl === 2) {
    y = G.GROUND_Y - 4;
    for (i = 0; i < 4; i++) {
      col(baseX - 90 + i * 60, y, 34, 34, fi(i));
      col(baseX - 60 + i * 60, y, 34, 34, fi(i + 1));
    }
    y = col(baseX - 60, y, 30, 70, fi(1));
    col(baseX + 60, y, 30, 70, fi(1));
    col(baseX - 30, y + 70, 30, 70, fi(0));
    col(baseX + 30, y + 70, 30, 70, fi(0));
    col(baseX, y, 200, 26, fi(2));
    slot(baseX, G.GROUND_Y - 4);
    slot(baseX, y + 26);
  } else if (tmpl === 3) {
    y = G.GROUND_Y - 4;
    col(baseX - 130, y, 30, 80, fi(0));
    col(baseX + 130, y, 30, 80, fi(0));
    col(baseX, y, 34, 80, fi(1));
    y = col(baseX, y, 320, 26, fi(2));
    slot(baseX - 65, G.GROUND_Y - 4);
    slot(baseX + 65, G.GROUND_Y - 4);
    slot(baseX, y + 26);
  } else if (tmpl === 4) {
    var left = baseX - 120, right = baseX + 120;
    y = G.GROUND_Y - 4;
    for (i = 0; i < 2; i++) {
      col(left - 40, y, 28, 100, fi(i));
      col(left + 40, y, 28, 100, fi(i));
      col(right - 40, y, 28, 100, fi(i));
      col(right + 40, y, 28, 100, fi(i));
      y = col(left, y, 130, 24, fi(i + 1));
      col(right, y, 130, 24, fi(i + 1));
      slot(left, y + 24);
      slot(right, y + 24);
      y -= 4;
    }
  } else {
    y = G.GROUND_Y - 4;
    for (i = 0; i < 3; i++) col(baseX - 140 + i * 140, y, 30, 120, fi(i));
    y = col(baseX, y, 420, 28, fi(1));
    col(baseX - 90, y, 28, 80, fi(2));
    col(baseX + 90, y, 28, 80, fi(2));
    col(baseX, y - 80, 240, 26, fi(0));
    slot(baseX - 70, G.GROUND_Y - 4);
    slot(baseX + 70, G.GROUND_Y - 4);
    slot(baseX, y + 28);
  }

  var pigs = [];
  for (i = 0; i < pigsN && i < slots.length; i++) pigs.push(slots[i]);
  while (pigs.length < pigsN) {
    pigs.push({ x: baseX + (rnd() * 60 - 30), y: G.GROUND_Y - G.PIG_R });
  }

  return { blocks: blocks, pigs: pigs, birds: 3 + Math.min(3, Math.floor((n - 1) / 12)) };
};

G.deckFor = function (n) {
  var total = 3 + Math.min(3, Math.floor((n - 1) / 12));
  var deck = [], i;
  for (i = 0; i < total; i++) {
    if (i === 1 && n >= 4) deck.push('yellow');
    else if (i === 2 && n >= 9) deck.push('blue');
    else if (i === 3 && n >= 15) deck.push('black');
    else deck.push('red');
  }
  if (G.save.items.blue) deck.splice(1, 0, 'blue');
  if (G.save.items.bomb) deck.push('black');
  if (G.save.items.gold) { deck.push('yellow', 'yellow', 'yellow'); }
  if (G.save.items.ram) { deck.push('ram', 'ram', 'ram'); }
  if (deck.length > 12) deck = deck.slice(0, 12);
  return deck;
};

G.startLevel = function (n) {
  n = Math.max(1, Math.min(G.TOTAL_LEVELS, n | 0));
  G.level = n;
  G.score = 0;
  G.blocks = [];
  G.pigs = [];
  G.parts = [];
  G.pops = [];
  G.extraFlyers = [];
  G.flying = null;
  G.lastWin = null;

  var data = G.levelData(n), i, b, p, m;
  for (i = 0; i < data.blocks.length; i++) {
    b = data.blocks[i];
    m = G.MAT[b.m];
    G.blocks.push({ x: b.x, y: b.y, w: b.w, h: b.h, m: b.m,
                    hp: m.hp, max: m.hp, dead: false, vy: 0, fall: false });
  }
  for (i = 0; i < data.pigs.length; i++) {
    p = data.pigs[i];
    G.pigs.push({ x: p.x, y: p.y, r: G.PIG_R, hp: 100, max: 100, dead: false });
  }

  var deck = G.deckFor(n), first = deck[0];
  G.active = { type: first, x: G.SLING_X, y: G.SLING_Y, r: G.BIRD[first].r,
               state: 'ready', used: false, vx: 0, vy: 0 };
  G.birdsLeft = deck.slice(1);
  G.state = 'play';
  G.checkAch();
  G.store();
};

G.addPop = function (x, y, txt) { G.pops.push({ x: x, y: y, t: 1, txt: txt }); };

G.burst = function (x, y, n, col, power) {
  for (var i = 0; i < n; i++) {
    var a = Math.random() * 6.2832, s = power * (0.35 + Math.random() * 0.85);
    G.parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 90,
                   s: 5 + Math.random() * 5, c: col, life: 0.5 + Math.random() * 0.5 });
  }
};

if (!window.ABG) { window.ABG = G; }
})();
