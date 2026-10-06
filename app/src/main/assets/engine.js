/* ============================================================
   ANGRY BIRDS — ядро: константы, прогресс, звук, уровни, магазин.
   Экспорт: window.ABG  (физика и ход игры — в engine2.js)
   ============================================================ */
window.ABG = (function () {
'use strict';

var G = {};

/* ---------- константы ---------- */
G.SAVE_KEY = 'ab_save_v1';
G.WORLD_W = 2600;
G.WORLD_H = 800;
G.GROUND_Y = 720;
G.SLING_X = 235;
G.SLING_Y = G.GROUND_Y - 205;
G.MAX_PULL = 135;
G.POWER = 11;
G.GRAVITY = 1500;
G.AIR = 0.9994;
G.TOTAL_LEVELS = 50;

function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function rnd(a, b) { return a + Math.random() * (b - a); }
G.clamp = clamp;
G.rnd = rnd;

/* ---------- сохранение: сначала функции, потом вызов ---------- */
G.DEF = {
  levels: {}, coins: 0, items: {}, ach: {}, kills: 0, shots: 0,
  perfect: 0, spent: 0, sound: true, music: true, vibe: true
};

G.loadSave = function () {
  var s = null;
  try { s = JSON.parse(localStorage.getItem(G.SAVE_KEY) || 'null'); } catch (e) { s = null; }
  if (!s || typeof s !== 'object') s = {};
  for (var k in G.DEF) {
    if (!(k in s)) {
      s[k] = (G.DEF[k] && typeof G.DEF[k] === 'object') ? JSON.parse(JSON.stringify(G.DEF[k])) : G.DEF[k];
    }
  }
  if (!s.levels) s.levels = {};
  if (!s.items) s.items = {};
  if (!s.ach) s.ach = {};
  return s;
};

G.store = function () {
  try { localStorage.setItem(G.SAVE_KEY, JSON.stringify(G.save)); } catch (e) {}
};

G.starsTotal = function () { var t = 0, k; for (k in G.save.levels) t += G.save.levels[k] | 0; return t; };
G.levelsDone = function () { var c = 0, k; for (k in G.save.levels) if ((G.save.levels[k] | 0) > 0) c++; return c; };
G.itemsOwned = function () { var c = 0, k; for (k in G.save.items) c++; return c; };
G.achCount = function () { var c = 0, k; for (k in G.save.ach) c++; return c; };

G.maxUnlocked = function () {
  var m = 1, k, n;
  for (k in G.save.levels) {
    n = parseInt(k, 10);
    if ((G.save.levels[k] | 0) > 0 && n + 1 > m) m = n + 1;
  }
  return clamp(m, 1, G.TOTAL_LEVELS);
};

G.resetProgress = function () {
  G.save = JSON.parse(JSON.stringify(G.DEF));
  G.store();
};

/* загрузка прогресса — после объявления всех функций */
G.save = G.loadSave();

/* ---------- состояние ---------- */
G.state = 'menu';
G.level = 1;
G.score = 0;
G.blocks = [];
G.pigs = [];
G.parts = [];
G.pops = [];
G.extraFlyers = [];
G.birdsLeft = [];
G.active = null;
G.flying = null;
G.shotsFired = 0;
G.pigsAtStart = 0;
G.baseScore = 1;
G.loseTimer = 0;
G.dragging = false;
G.lastWin = null;

G.addScore = function (v) { G.score += v; };

/* ---------- звук ---------- */
var actx = null;
G.ac = function () {
  if (!actx) {
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; }
  }
  if (actx && actx.state === 'suspended') { try { actx.resume(); } catch (e) {} }
  return actx;
};

function tone(freq, dur, type, vol, slideTo) {
  if (!G.save.sound) return;
  var c = G.ac(); if (!c) return;
  try {
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), c.currentTime + dur);
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(vol || 0.14, c.currentTime + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g); g.connect(c.destination);
    o.start(); o.stop(c.currentTime + dur + 0.03);
  } catch (e) {}
}

G.SFX = {
  click: function () { tone(720, .07, 'triangle', .12); },
  pull:  function () { tone(180, .12, 'sine', .10, 320); },
  shot:  function () { tone(520, .16, 'sawtooth', .15, 140); },
  hit:   function () { tone(200, .08, 'square', .10, 90); },
  wood:  function () { tone(340, .10, 'triangle', .13, 150); },
  ice:   function () { tone(1200, .10, 'sine', .11, 1900); },
  stone: function () { tone(120, .12, 'square', .13, 70); },
  pig:   function () { tone(640, .18, 'triangle', .15, 180); },
  boom:  function () { tone(90, .35, 'sawtooth', .18, 40); },
  star:  function () { tone(1400, .10, 'triangle', .11, 1800); },
  win:   function () {
    tone(660, .12, 'triangle', .15);
    setTimeout(function () { tone(880, .14, 'triangle', .15); }, 130);
    setTimeout(function () { tone(1180, .22, 'triangle', .15); }, 280);
  },
  lose:  function () {
    tone(300, .20, 'sawtooth', .13, 180);
    setTimeout(function () { tone(200, .30, 'sawtooth', .13, 120); }, 190);
  }
};

G.vibe = function (ms) {
  try { if (G.save.vibe && navigator.vibrate) navigator.vibrate(ms); } catch (e) {}
};

var musicTimer = null, musicStep = 0;
var MUSIC = [220, 277, 330, 392, 330, 277, 247, 294];
G.musicStart = function () {
  if (!G.save.music || musicTimer) return;
  if (!G.ac()) return;
  musicTimer = setInterval(function () {
    if (!G.save.music || !actx) return;
    var f = MUSIC[musicStep % MUSIC.length]; musicStep++;
    try {
      var o = actx.createOscillator(), g = actx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.045, actx.currentTime + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 0.5);
      o.connect(g); g.connect(actx.destination);
      o.start(); o.stop(actx.currentTime + 0.55);
    } catch (e) {}
  }, 620);
};
G.musicStop = function () { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } };

/* ---------- материалы и уровни ---------- */
G.MAT = {
  wood:  { hp: 70,  sc: 500, fill: '#c98a3c', edge: '#8a5a20', sfx: 'wood' },
  ice:   { hp: 45,  sc: 500, fill: '#a8dcf0', edge: '#5fa8c9', sfx: 'ice' },
  stone: { hp: 130, sc: 500, fill: '#9aa3ad', edge: '#6b737c', sfx: 'stone' }
};

function matFor(n) {
  var r = Math.random();
  if (n <= 20) return r < 0.85 ? 'wood' : 'ice';
  if (n <= 35) return r < 0.45 ? 'wood' : (r < 0.80 ? 'ice' : 'stone');
  return r < 0.25 ? 'wood' : (r < 0.60 ? 'ice' : 'stone');
}
G.pigsFor = function (n) { return clamp(1 + Math.floor(n / 8), 1, 7); };
G.birdsFor = function (n) { return clamp(3 + Math.floor(n / 10), 3, 7); };

G.buildLevel = function (n) {
  var blocks = [], slots = [];
  var kind = ['tower', 'house', 'pyramid', 'bridge', 'double', 'castle'][(n - 1) % 6];
  var floors = clamp(2 + Math.floor(n / 12), 2, 5);
  var cx = 1230, colW = 26, colH = 76, beamH = 22, span = 132;
  var f, yBase, by, i, count, bx, r, s, shift;

  function addB(x, y, w, h, m) {
    blocks.push({
      x: x, y: y, w: w, h: h, m: m, hp: G.MAT[m].hp, max: G.MAT[m].hp,
      vx: 0, vy: 0, dead: false, box: true, mass: Math.max(0.7, w * h / 1400)
    });
  }
  function addSlot(x, y) { slots.push({ x: x, y: y }); }

  if (kind === 'tower') {
    for (f = 0; f < floors; f++) {
      yBase = G.GROUND_Y - f * (colH + beamH);
      addB(cx - span / 2 + colW / 2, yBase - colH / 2, colW, colH, matFor(n));
      addB(cx + span / 2 - colW / 2, yBase - colH / 2, colW, colH, matFor(n));
      addB(cx, yBase - colH - beamH / 2, span + colW, beamH, matFor(n));
      addSlot(cx, yBase - colH - beamH - 26);
      void by;
    }
    addSlot(cx, G.GROUND_Y - 30);
  } else if (kind === 'house') {
    for (f = 0; f < floors; f++) {
      yBase = G.GROUND_Y - f * (colH + beamH);
      addB(cx - 78, yBase - colH / 2, 30, colH, matFor(n));
      addB(cx + 78, yBase - colH / 2, 30, colH, matFor(n));
      addB(cx, yBase - colH - beamH / 2, 200, beamH, matFor(n));
      addSlot(cx, yBase - colH + 4);
    }
    addSlot(cx, G.GROUND_Y - 30);
  } else if (kind === 'pyramid') {
    var rows = clamp(2 + Math.floor(n / 14), 2, 4), cube = 40;
    for (f = 0; f < rows; f++) {
      count = rows - f + 1;
      for (i = 0; i < count; i++) {
        bx = cx + (i - (count - 1) / 2) * (cube + 4);
        addB(bx, G.GROUND_Y - cube / 2 - f * (cube + 4), cube, cube, matFor(n));
      }
      addSlot(cx, G.GROUND_Y - cube * (f + 1) - 4 * f - 26);
    }
  } else if (kind === 'bridge') {
    addB(cx - 130, G.GROUND_Y - colH / 2, colW, colH, matFor(n));
    addB(cx, G.GROUND_Y - colH / 2, colW, colH, matFor(n));
    addB(cx + 130, G.GROUND_Y - colH / 2, colW, colH, matFor(n));
    addB(cx, G.GROUND_Y - colH - beamH / 2, 320, beamH, matFor(n));
    addSlot(cx - 65, G.GROUND_Y - colH - beamH - 26);
    addSlot(cx + 65, G.GROUND_Y - colH - beamH - 26);
    addSlot(cx, G.GROUND_Y - 30);
    for (f = 1; f < floors; f++) {
      yBase = G.GROUND_Y - colH - beamH;
      addB(cx - 60, yBase - colH / 2, colW, colH, matFor(n));
      addB(cx + 60, yBase - colH / 2, colW, colH, matFor(n));
      addB(cx, yBase - colH - beamH / 2, 150, beamH, matFor(n));
      addSlot(cx, yBase - colH + 4);
    }
  } else if (kind === 'double') {
    var towers = [cx - 150, cx + 150];
    for (i = 0; i < 2; i++) {
      for (f = 0; f < floors; f++) {
        yBase = G.GROUND_Y - f * (colH + beamH);
        addB(towers[i] - 40, yBase - colH / 2, colW, colH, matFor(n));
        addB(towers[i] + 40, yBase - colH / 2, colW, colH, matFor(n));
        addB(towers[i], yBase - colH - beamH / 2, 106, beamH, matFor(n));
        addSlot(towers[i], yBase - colH + 4);
      }
    }
    addB(cx, G.GROUND_Y - floors * (colH + beamH) - beamH / 2, 300, beamH, matFor(n));
    addSlot(cx, G.GROUND_Y - 30);
  } else {
    var side = [cx - 190, cx + 190];
    for (i = 0; i < 2; i++) {
      for (f = 0; f < floors + 1; f++) {
        yBase = G.GROUND_Y - f * (colH + beamH);
        addB(side[i] - 45, yBase - colH / 2, 30, colH, matFor(n));
        addB(side[i] + 45, yBase - colH / 2, 30, colH, matFor(n));
        addB(side[i], yBase - colH - beamH / 2, 120, beamH, matFor(n));
      }
      addSlot(side[i], G.GROUND_Y - colH - beamH - 26);
    }
    for (f = 0; f < floors; f++) {
      yBase = G.GROUND_Y - f * (colH + beamH);
      addB(cx - 60, yBase - colH / 2, 26, colH, matFor(n));
      addB(cx + 60, yBase - colH / 2, 26, colH, matFor(n));
      addB(cx, yBase - colH - beamH / 2, 146, beamH, matFor(n));
      addSlot(cx, yBase - colH + 4);
    }
  }

  var need = G.pigsFor(n), pigs = [];
  for (i = 0; i < need; i++) {
    s = slots.length ? slots[i % slots.length] : { x: cx, y: G.GROUND_Y - 30 };
    r = rnd(-5, 5);
    shift = Math.floor(i / Math.max(1, slots.length)) * 30;
    pigs.push({
      x: clamp(s.x + r + shift, 900, G.WORLD_W - 120),
      y: s.y, r: 26, hp: 50, max: 50, vx: 0, vy: 0, dead: false, mass: 2.2
    });
  }
  return { blocks: blocks, pigs: pigs, kind: kind };
};

G.birdList = function (n) {
  var list = [], i, count = G.birdsFor(n);
  for (i = 0; i < count; i++) list.push('red');
  if (G.save.items.blue) list.push('blue');
  if (G.save.items.bomb) list.push('black');
  if (G.save.items.golden) list.push('yellow');
  if (G.save.items.extra) list.push('red');
  return list;
};

/* ---------- достижения ---------- */
G.ACH = [
  { id: 'a1',  n: 'Первый выстрел', d: 'Запусти первую птицу',           f: function () { return G.save.shots >= 1; } },
  { id: 'a2',  n: 'Стрелок',        d: 'Сделай 10 выстрелов',            f: function () { return G.save.shots >= 10; } },
  { id: 'a3',  n: 'Снайпер',        d: 'Сделай 100 выстрелов',           f: function () { return G.save.shots >= 100; } },
  { id: 'a4',  n: 'Охотник',        d: 'Убей 10 свиней',                 f: function () { return G.save.kills >= 10; } },
  { id: 'a5',  n: 'Гроза свиней',   d: 'Убей 50 свиней',                 f: function () { return G.save.kills >= 50; } },
  { id: 'a6',  n: 'Мясник',         d: 'Убей 250 свиней',                f: function () { return G.save.kills >= 250; } },
  { id: 'a7',  n: 'Легенда',        d: 'Убей 1000 свиней',               f: function () { return G.save.kills >= 1000; } },
  { id: 'a8',  n: 'Начало',         d: 'Пройди уровень 1',               f: function () { return (G.save.levels[1] | 0) > 0; } },
  { id: 'a9',  n: 'Пятёрка',        d: 'Пройди 5 уровней',               f: function () { return G.levelsDone() >= 5; } },
  { id: 'a10', n: 'Десятка',        d: 'Пройди 10 уровней',              f: function () { return G.levelsDone() >= 10; } },
  { id: 'a11', n: 'Половина пути',  d: 'Пройди 25 уровней',              f: function () { return G.levelsDone() >= 25; } },
  { id: 'a12', n: 'Победитель',     d: 'Пройди все 50 уровней',          f: function () { return G.levelsDone() >= 50; } },
  { id: 'a13', n: 'Три звезды',     d: 'Получи 3 звезды на уровне',      f: function () { var k; for (k in G.save.levels) if (G.save.levels[k] === 3) return true; return false; } },
  { id: 'a14', n: '15 звёзд',       d: 'Собери 15 звёзд',                f: function () { return G.starsTotal() >= 15; } },
  { id: 'a15', n: '50 звёзд',       d: 'Собери 50 звёзд',                f: function () { return G.starsTotal() >= 50; } },
  { id: 'a16', n: '150 звёзд',      d: 'Собери все 150 звёзд',           f: function () { return G.starsTotal() >= 150; } },
  { id: 'a17', n: 'Без потерь',     d: 'Пройди уровень без потерь птиц', f: function () { return G.save.perfect >= 1; } },
  { id: 'a18', n: 'Мастер',         d: '10 уровней без потерь',          f: function () { return G.save.perfect >= 10; } },
  { id: 'a19', n: 'Богач',          d: 'Имей 2000 монет',                f: function () { return G.save.coins >= 2000; } },
  { id: 'a20', n: 'Покупатель',     d: 'Купи 3 предмета в магазине',     f: function () { return G.itemsOwned() >= 3; } }
];

G.checkAchievements = function () {
  var got = 0, i, a, ok;
  for (i = 0; i < G.ACH.length; i++) {
    a = G.ACH[i];
    if (!G.save.ach[a.id]) {
      ok = false;
      try { ok = !!a.f(); } catch (e) { ok = false; }
      if (ok) { G.save.ach[a.id] = 1; G.save.coins += 200; got++; G.SFX.star(); }
    }
  }
  if (got) G.store();
  return got;
};

/* ---------- магазин ---------- */
G.ITEMS = [
  { id: 'blue',    ic: '🟦', t: 'Синяя птица',    d: '+1 синяя: в полёте делится на три',  p: 300 },
  { id: 'bomb',    ic: '⬛', t: 'Птица-бомба',    d: '+1 чёрная: взрывает постройки',      p: 500 },
  { id: 'golden',  ic: '🟨', t: 'Золотая птица',  d: '+1 жёлтая: ускоряется по тапу',      p: 800 },
  { id: 'extra',   ic: '🔴', t: 'Запасная птица', d: '+1 обычная птица на каждый уровень', p: 250 },
  { id: 'storage', ic: '📦', t: 'Кладовая',       d: '+25% монет за каждый уровень',       p: 400 }
];

G.buy = function (id) {
  var i, item = null;
  for (i = 0; i < G.ITEMS.length; i++) if (G.ITEMS[i].id === id) item = G.ITEMS[i];
  if (!item || G.save.items[id]) return 'owned';
  if (G.save.coins < item.p) return 'poor';
  G.save.coins -= item.p;
  G.save.items[id] = 1;
  G.save.spent += item.p;
  G.store();
  G.checkAchievements();
  return 'ok';
};

return G;
})();
