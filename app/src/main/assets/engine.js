/* ============================================================
   ANGRY BIRDS — ЯДРО
   мир, материалы, птицы, прогресс, магазин, достижения, звук,
   генератор 50 уровней.  Экспорт: window.ABG
   ============================================================ */
window.ABG = (function () {
'use strict';
var G = {};

/* ---------------- мир ---------------- */
G.WORLD_W = 2000; G.WORLD_H = 700; G.GROUND_Y = 600;
G.SLING_X = 200; G.SLING_Y = 448;
G.MAX_PULL = 115; G.POWER = 7.4; G.GRAVITY = 1400;
G.TOTAL_LEVELS = 50;

/* ---------------- материалы ---------------- */
G.MAT = {
  wood:  { hp: 70,  dens: 1.0, name: 'Дерево'   },
  ice:   { hp: 42,  dens: 0.7, name: 'Лёд'      },
  stone: { hp: 140, dens: 1.7, name: 'Камень'   },
  sand:  { hp: 95,  dens: 1.3, name: 'Песчаник' }
};

/* ---------------- птицы ---------------- */
G.BIRDS = {
  red:    { r: 22, mass: 1.00, hp: 100, ability: 'none'  },
  yellow: { r: 20, mass: 0.85, hp: 100, ability: 'boost' },
  blue:   { r: 17, mass: 0.70, hp: 100, ability: 'split' },
  black:  { r: 25, mass: 1.35, hp: 100, ability: 'bomb'  }
};
G.BIRD = G.BIRDS;

/* ---------------- магазин ---------------- */
G.ITEMS = [
  { id: 'gloves',  name: 'Перчатки',  desc: 'Натяжение +18%',        price: 300 },
  { id: 'helmet',  name: 'Каска',     desc: 'Птицы крепче на 20%',   price: 450 },
  { id: 'boots',   name: 'Сапоги',    desc: 'Скорость полёта +10%',  price: 600 },
  { id: 'goggles', name: 'Очки',      desc: 'Длинная линия прицела', price: 350 },
  { id: 'bag',     name: 'Мешок',     desc: '+1 птица на уровень',   price: 900 }
];

/* ---------------- достижения ---------------- */
G.ACH = [
  { id: 'a1',  name: 'Первый выстрел',   desc: 'Запусти птицу' },
  { id: 'a2',  name: 'Первая победа',    desc: 'Пройди уровень' },
  { id: 'a3',  name: 'Три звезды',       desc: 'Собери 3 звезды на уровне' },
  { id: 'a4',  name: 'Пять уровней',     desc: 'Пройди 5 уровней' },
  { id: 'a5',  name: 'Десятка',          desc: 'Пройди 10 уровней' },
  { id: 'a6',  name: 'Половина пути',    desc: 'Пройди 25 уровней' },
  { id: 'a7',  name: 'Все уровни',       desc: 'Пройди все 50 уровней' },
  { id: 'a8',  name: 'Мясник',           desc: 'Убей 25 свиней' },
  { id: 'a9',  name: 'Разрушитель',      desc: 'Разбей 100 блоков' },
  { id: 'a10', name: 'Снайпер',          desc: 'Попади в свинью первым выстрелом' },
  { id: 'a11', name: 'Одно попадание',   desc: 'Пройди уровень одной птицей' },
  { id: 'a12', name: 'Без потерь',       desc: 'Пройди уровень, не потеряв птиц' },
  { id: 'a13', name: 'Бомбист',          desc: 'Взорви 10 чёрных птиц' },
  { id: 'a14', name: 'Тройной удар',     desc: 'Раздели 10 синих птиц' },
  { id: 'a15', name: 'Ускоритель',       desc: 'Ускорься 10 жёлтыми птицами' },
  { id: 'a16', name: 'Богач',            desc: 'Собери 1000 монет' },
  { id: 'a17', name: 'Покупатель',       desc: 'Купи первый предмет' },
  { id: 'a18', name: 'Коллекционер',     desc: 'Купи все предметы' },
  { id: 'a19', name: 'Серия',            desc: 'Пройди 3 уровня подряд' },
  { id: 'a20', name: 'Легенда',          desc: 'Набери 50 000 очков' }
];

/* ---------------- состояние ---------------- */
G.state = 'menu'; G.level = 1; G.score = 0; G.combo = 0;
G.blocks = []; G.pigs = []; G.parts = []; G.pops = []; G.extraFlyers = [];
G.birdsLeft = []; G.active = null; G.flying = null;
G.started = false; G.ended = false; G.winT = 0; G.loseT = 0;
G.lastWin = null;
G.stats = { shots: 0, kills: 0, breaks: 0, bombs: 0, splits: 0, boosts: 0, winStreak: 0 };

/* ---------------- сохранение ---------------- */
var KEY = 'ab_save_v3';
function fresh() {
  return { coins: 0, stars: {}, items: [], ach: [], unlocked: 1,
           sound: true, music: true, vibe: true, total: 0 };
}
G.save = fresh();
try {
  var raw = localStorage.getItem(KEY);
  if (raw) {
    var d = JSON.parse(raw);
    for (var k in G.save) if (d[k] !== undefined) G.save[k] = d[k];
  }
} catch (e) { G.save = fresh(); }

G.store = function () {
  try { localStorage.setItem(KEY, JSON.stringify(G.save)); } catch (e) {}
};
G.has = function (id) { return G.save.items.indexOf(id) >= 0; };
G.starsOf = function (n) { return G.save.stars[n] || 0; };
G.levelsDone = function () {
  var c = 0; for (var k in G.save.stars) if (G.save.stars[k] > 0) c++; return c;
};
G.starsTotal = function () {
  var c = 0; for (var k in G.save.stars) c += G.save.stars[k]; return c;
};
G.maxUnlocked = function () { return Math.max(1, Math.min(G.TOTAL_LEVELS, G.save.unlocked || 1)); };
G.achDone = function (id) { return G.save.ach.indexOf(id) >= 0; };
G.achCount = function () { return G.save.ach.length; };
G.unlockAch = function (id) {
  if (G.achDone(id)) return;
  G.save.ach.push(id); G.store();
  if (G.SFX && G.SFX.coin) G.SFX.coin();
};
G.buy = function (id) {
  var it = null;
  for (var i = 0; i < G.ITEMS.length; i++) if (G.ITEMS[i].id === id) it = G.ITEMS[i];
  if (!it || G.has(id) || G.save.coins < it.price) return false;
  G.save.coins -= it.price;
  G.save.items.push(id);
  G.store(); G.unlockAch('a17');
  if (G.save.items.length === G.ITEMS.length) G.unlockAch('a18');
  return true;
};
G.resetProgress = function () {
  var snd = G.save.sound, mus = G.save.music, vib = G.save.vibe;
  G.save = fresh();
  G.save.sound = snd; G.save.music = mus; G.save.vibe = vib;
  G.store();
};

/* ---------------- звук ---------------- */
var actx = null;
G.ac = function () {
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
  } catch (e) { actx = null; }
  return actx;
};
function tone(freq, dur, type, vol, delay) {
  if (!G.save.sound) return;
  var a = G.ac(); if (!a) return;
  var t0 = a.currentTime + (delay || 0);
  var o = a.createOscillator(), g = a.createGain();
  o.type = type || 'square';
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol || 0.06, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(a.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}
G.SFX = {
  click: function () { tone(620, 0.07, 'square', 0.05); },
  pull:  function () { tone(180, 0.12, 'sawtooth', 0.04); },
  hit:   function () { tone(120, 0.1, 'triangle', 0.07); },
  wood:  function () { tone(320, 0.09, 'square', 0.05); },
  ice:   function () { tone(1200, 0.1, 'sine', 0.05); },
  stone: function () { tone(90, 0.14, 'sawtooth', 0.06); },
  pig:   function () { tone(700, 0.12, 'sine', 0.07); tone(500, 0.16, 'sine', 0.05, 0.08); },
  boost: function () { tone(900, 0.18, 'sawtooth', 0.05); },
  split: function () { tone(500, 0.14, 'triangle', 0.05); tone(760, 0.14, 'triangle', 0.05, 0.07); },
  boom:  function () { tone(70, 0.35, 'sawtooth', 0.09); },
  coin:  function () { tone(1400, 0.1, 'sine', 0.05); },
  win:   function () { tone(660, 0.14, 'square', 0.06); tone(880, 0.14, 'square', 0.06, 0.14); tone(1180, 0.24, 'square', 0.06, 0.28); },
  lose:  function () { tone(400, 0.2, 'sawtooth', 0.06); tone(240, 0.34, 'sawtooth', 0.06, 0.2); }
};

/* музыка: простая зацикленная мелодия */
var musicTimer = null, mstep = 0;
var MEL = [262, 330, 392, 330, 294, 349, 440, 349];
G.musicStart = function () {
  if (musicTimer || !G.save.music) return;
  G.ac();
  musicTimer = setInterval(function () {
    if (!G.save.music) { G.musicStop(); return; }
    tone(MEL[mstep % MEL.length], 0.26, 'triangle', 0.028);
    mstep++;
  }, 300);
};
G.musicStop = function () {
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
};
G.vibe = function (ms) {
  try { if (G.save.vibe && navigator.vibrate) navigator.vibrate(ms); } catch (e) {}
};

/* ---------------- генератор уровней ---------------- */
function rnd(seed) {                       // детерминированный ГПСЧ
  var s = seed * 9301 + 49297;
  return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

G.makeBirdSet = function (n) {
  var birds = [];
  var total = 3 + Math.min(2, Math.floor(n / 14));        // 3..5 птиц
  if (G.has('bag')) total++;
  for (var i = 0; i < total; i++) {
    var r = (i + n) % 4;
    if (n < 4)       birds.push('red');
    else if (n < 10) birds.push(r === 1 ? 'yellow' : 'red');
    else if (n < 18) birds.push(r === 1 ? 'yellow' : (r === 2 ? 'blue' : 'red'));
    else             birds.push(r === 0 ? 'red' : (r === 1 ? 'yellow' : (r === 2 ? 'blue' : 'black')));
  }
  return birds;
};

G.MATS_BY_LEVEL = function (n) {
  if (n <= 6)  return ['wood', 'wood'];
  if (n <= 14) return ['wood', 'ice'];
  if (n <= 24) return ['wood', 'stone'];
  if (n <= 34) return ['ice', 'sand'];
  return ['stone', 'sand'];
};

/* строит уровень: блоки, свиньи, птицы */
G.buildLevel = function (n) {
  var r = rnd(n * 77 + 13);
  var mats = G.MATS_BY_LEVEL(n);
  var base = 620 + (n % 5) * 90;
  var B = [], P = [];
  function add(x, y, w, h, mat, stat) { B.push({ X: x, Y: y, W: w, H: h, mat: mat, stat: !!stat }); }

  /* платформа-земля для постройки */
  var gw = 300 + Math.floor(r() * 120);
  add(base - 6, G.GROUND_Y, gw, 14, 'sand', true);

  /* два столба и перекладина */
  var bh = 90 + Math.floor(r() * 40);
  var top = G.GROUND_Y - bh;
  add(base, top, 18, bh, mats[0]);
  add(base + gw - 40, top, 18, bh, mats[1]);
  add(base - 10, top - 16, gw + 10, 16, mats[1]);

  /* второй этаж на высоких уровнях */
  if (n > 8) {
    var top2 = top - 16 - 70;
    add(base + 40, top2, 16, 70, mats[0]);
    add(base + gw - 80, top2, 16, 70, mats[1]);
    add(base + 30, top2 - 14, gw - 60, 14, mats[0]);
  }
  /* третий этаж */
  if (n > 22) {
    var top3 = top - 16 - 70 - 14 - 60;
    add(base + 90, top3, 16, 60, mats[1]);
    add(base + gw - 130, top3, 16, 60, mats[0]);
    add(base + 80, top3 - 12, gw - 150, 12, mats[1]);
  }

  /* свиньи */
  var pigCount = 1 + Math.min(3, Math.floor(n / 12));
  P.push({ x: base + gw * 0.5, y: G.GROUND_Y - 26, r: 26 });
  if (pigCount > 1) P.push({ x: base + gw * 0.5, y: top - 42, r: 22 });
  if (pigCount > 2) P.push({ x: base + 22, y: G.GROUND_Y - 24, r: 24 });
  if (pigCount > 3) P.push({ x: base + gw - 40, y: top - 40, r: 20 });

  return { blocks: B, pigs: P, birds: G.makeBirdSet(n), base: base };
};

/* ---------------- старт уровня ---------------- */
G.startLevel = function (n) {
  G.level = Math.max(1, Math.min(G.TOTAL_LEVELS, n | 0));
  var L = G.buildLevel(G.level);

  G.blocks = []; G.pigs = []; G.parts = []; G.pops = []; G.extraFlyers = [];
  G.flying = null; G.active = null; G.combo = 0; G.score = 0;
  G.ended = false; G.winT = 0; G.loseT = 0; G.lastWin = null;
  G.started = true;

  G.LEVEL_BLOCKS = [];
  for (var i = 0; i < L.blocks.length; i++) G.LEVEL_BLOCKS.push(i);

  G.SPAWN = L;
  return L;
};

return G;
})();
