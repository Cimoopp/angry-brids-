/* ============================================================
   ANGRY BIRDS — ядро: мир, материалы, сохранение, звук, уровни
   Экспорт: window.ABG
   ============================================================ */
window.ABG = (function () {
'use strict';
var G = {};

/* ---------- размеры мира ---------- */
G.WORLD_W = 2400;
G.WORLD_H = 720;
G.GROUND_Y = 622;
G.SLING_X = 220;
G.SLING_Y = 468;
G.MAX_PULL = 130;
G.POWER = 8.2;
G.GRAVITY = 1600;
G.TOTAL_LEVELS = 50;
G.MAX_STARS = G.TOTAL_LEVELS * 3;

/* ---------- материалы ---------- */
G.MAT = {
  wood:  { hp: 80,  fill: '#c98b3d', edge: '#8a5a22', dens: 1.0, dust: '#a9742e' },
  ice:   { hp: 45,  fill: '#a8e0f5', edge: '#6fb6d6', dens: 0.7, dust: '#cdeefb' },
  stone: { hp: 150, fill: '#bcbcbc', edge: '#7d7d7d', dens: 1.7, dust: '#9a9a9a' },
  sand:  { hp: 100, fill: '#e3cf8f', edge: '#b5a05f', dens: 1.2, dust: '#cbb877' }
};

/* ---------- птицы ---------- */
G.BIRDS = {
  red:    { r: 22, mass: 1.00, ability: 'none',  fill: '#e8453c', belly: '#ffd9d6' },
  yellow: { r: 20, mass: 0.85, ability: 'boost', fill: '#f5c542', belly: '#fff0b8' },
  blue:   { r: 17, mass: 0.70, ability: 'split', fill: '#4aa8e8', belly: '#d6efff' },
  black:  { r: 25, mass: 1.35, ability: 'bomb',  fill: '#3a3a44', belly: '#6a6a76' }
};
G.BIRD = G.BIRDS;

/* ---------- изменяемое состояние ---------- */
G.state = 'menu';          // menu | play | pause | win | lose
G.level = 1;
G.score = 0;
G.ended = false;
G.winT = 0;
G.loseT = 0;
G.lastWin = null;
G.blocks = [];
G.pigs = [];
G.parts = [];
G.pops = [];
G.extraFlyers = [];
G.birdsLeft = [];
G.active = null;
G.flying = null;

/* ---------- сохранение ---------- */
var KEY = 'ab_save_v2';
G.save = { coins: 0, stars: {}, unlocked: 1, sound: true, music: true, vibe: true, items: {}, ach: {} };

G.load = function () {
  try {
    var s = localStorage.getItem(KEY);
    if (s) {
      var o = JSON.parse(s);
      if (o && typeof o === 'object') {
        for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) G.save[k] = o[k];
      }
    }
  } catch (e) { /* первый запуск */ }
  if (!G.save.stars) G.save.stars = {};
  if (!G.save.items) G.save.items = {};
  if (!G.save.ach) G.save.ach = {};
  if (!G.save.unlocked || G.save.unlocked < 1) G.save.unlocked = 1;
};

G.store = function () {
  try { localStorage.setItem(KEY, JSON.stringify(G.save)); } catch (e) { /* приватный режим */ }
};

G.resetProgress = function () {
  G.save.coins = 0; G.save.stars = {}; G.save.unlocked = 1; G.save.items = {}; G.save.ach = {};
  G.store();
};

/* ---------- сводка прогресса ---------- */
G.starsOf = function (n) { return G.save.stars[n] || 0; };
G.starsTotal = function () {
  var t = 0;
  for (var k in G.save.stars) if (G.save.stars[k] > t) t += 0; // суммируем отдельно
  t = 0;
  for (var i = 1; i <= G.TOTAL_LEVELS; i++) t += G.starsOf(i);
  return t;
};
G.levelsDone = function () {
  var c = 0;
  for (var i = 1; i <= G.TOTAL_LEVELS; i++) if (G.starsOf(i) > 0) c++;
  return c;
};
G.maxUnlocked = function () { return Math.max(1, Math.min(G.TOTAL_LEVELS, G.save.unlocked || 1)); };
G.has = function (id) { return !!G.save.items[id]; };
G.achCount = function () {
  var c = 0;
  for (var i = 0; i < G.ACH.length; i++) if (G.save.ach[G.ACH[i].id]) c++;
  return c;
};

/* ---------- магазин ---------- */
G.ITEMS = [
  { id: 'gloves',  name: 'Крепкая рогатка', desc: '+18% к силе натяжения', cost: 120, icon: '🎯' },
  { id: 'extra',   name: 'Запасная птица',  desc: '+1 птица на уровне',    cost: 200, icon: '🐦' },
  { id: 'hat',     name: 'Шляпа',           desc: 'Просто красиво',        cost: 300, icon: '🎩' },
  { id: 'gold',    name: 'Золотые перья',   desc: '+25% монет за уровень', cost: 450, icon: '✨' }
];

G.buy = function (id) {
  var it = null, i;
  for (i = 0; i < G.ITEMS.length; i++) if (G.ITEMS[i].id === id) it = G.ITEMS[i];
  if (!it || G.has(id) || G.save.coins < it.cost) return false;
  G.save.coins -= it.cost;
  G.save.items[id] = true;
  G.store();
  return true;
};

/* ---------- достижения ---------- */
G.ACH = [
  { id: 'first',   name: 'Первый выстрел',   desc: 'Пройди 1 уровень',        icon: '🥇' },
  { id: 'l10',     name: 'Десятка',          desc: 'Пройди 10 уровней',       icon: '🔟' },
  { id: 'l25',     name: 'Полпути',          desc: 'Пройди 25 уровней',       icon: '🏃' },
  { id: 'l50',     name: 'Легенда',          desc: 'Пройди все 50 уровней',   icon: '👑' },
  { id: 's30',     name: 'Копилка звёзд',    desc: 'Собери 30 звёзд',         icon: '⭐' },
  { id: 's75',     name: 'Половина неба',    desc: 'Собери 75 звёзд',         icon: '🌟' },
  { id: 's150',    name: 'Идеально',         desc: 'Собери все 150 звёзд',    icon: '💫' },
  { id: 'three',   name: 'Чисто',            desc: 'Три звезды на любом уровне', icon: '✨' },
  { id: 'nobird',  name: 'Экономный',        desc: 'Пройди уровень с 1 птицей',  icon: '🎯' },
  { id: 'coins',   name: 'Богач',            desc: 'Накопи 1000 монет',       icon: '💰' },
  { id: 'shop1',   name: 'Покупатель',       desc: 'Купи первую вещь',        icon: '🛒' },
  { id: 'shop4',   name: 'Коллекционер',     desc: 'Скупи весь магазин',      icon: '🏪' },
  { id: 'ice',     name: 'Ледокол',          desc: 'Разбей 20 ледяных блоков', icon: '🧊' },
  { id: 'wood',    name: 'Дровосек',         desc: 'Разбей 20 деревянных',    icon: '🪵' },
  { id: 'stone',   name: 'Камнелом',         desc: 'Разбей 20 каменных',      icon: '🪨' },
  { id: 'pigs50',  name: 'Охотник',          desc: 'Убери 50 свиней',         icon: '🐷' },
  { id: 'pigs200', name: 'Гроза свиней',     desc: 'Убери 200 свиней',        icon: '🐗' },
  { id: 'yellow',  name: 'Ускоритель',       desc: 'Используй жёлтую птицу',  icon: '⚡' },
  { id: 'blue',    name: 'Тройной удар',     desc: 'Используй синюю птицу',   icon: '🔷' },
  { id: 'black',   name: 'Бум',              desc: 'Взорви чёрную птицу',     icon: '💥' }
];

G.unlockAch = function (id, silent) {
  if (G.save.ach[id]) return false;
  G.save.ach[id] = true;
  G.save.coins += 50;
  G.store();
  G.pops.push({ x: G.SLING_X + 120, y: 140, t: 1.6, txt: '🏆 +50' });
  return true;
};

/* ---------- достижения: счётчики ---------- */
G.stat = G.save.stat || (G.save.stat = { ice: 0, wood: 0, stone: 0, pigs: 0 });
G.bump = function (k, v) {
  G.stat[k] = (G.stat[k] || 0) + (v || 1);
  if (k === 'pigs' && G.stat.pigs >= 50) G.unlockAch('pigs50');
  if (k === 'pigs' && G.stat.pigs >= 200) G.unlockAch('pigs200');
  if (k === 'ice' && G.stat.ice >= 20) G.unlockAch('ice');
  if (k === 'wood' && G.stat.wood >= 20) G.unlockAch('wood');
  if (k === 'stone' && G.stat.stone >= 20) G.unlockAch('stone');
  G.store();
};

/* ---------- звук (WebAudio, без файлов) ---------- */
var AC = null, master = null, musicTimer = null;

function ac() {
  if (AC) return AC;
  try {
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    AC = new C();
    master = AC.createGain();
    master.gain.value = 0.25;
    master.connect(AC.destination);
  } catch (e) { AC = null; }
  return AC;
}

function tone(freq, dur, type, vol, slide) {
  if (!G.save.sound) return;
  var ctx = ac();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  var o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type || 'sine';
  o.frequency.value = freq;
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), ctx.currentTime + dur);
  g.gain.value = 0.001;
  g.gain.exponentialRampToValueAtTime(vol || 0.3, ctx.currentTime + 0.012);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  o.connect(g); g.connect(master);
  o.start(); o.stop(ctx.currentTime + dur + 0.02);
}

G.ac = ac;
G.SFX = {
  click: function () { tone(520, 0.07, 'square', 0.16); },
  pull:  function () { tone(180, 0.12, 'sawtooth', 0.10, 90); },
  shoot: function () { tone(700, 0.16, 'triangle', 0.22, 180); },
  hit:   function () { tone(140, 0.10, 'square', 0.20, 70); },
  crack: function () { tone(240, 0.14, 'sawtooth', 0.18, 90); },
  boom:  function () { tone(90, 0.42, 'sawtooth', 0.32, 35); },
  pig:   function () { tone(880, 0.10, 'square', 0.20, 320); },
  win:   function () { tone(660, 0.14, 'triangle', 0.24); setTimeout(function () { tone(880, 0.18, 'triangle', 0.24); }, 130); setTimeout(function () { tone(1180, 0.26, 'triangle', 0.24); }, 280); },
  lose:  function () { tone(320, 0.22, 'sine', 0.22, 120); setTimeout(function () { tone(180, 0.34, 'sine', 0.22, 70); }, 190); }
};

/* ---------- музыка: простая петля ---------- */
G.musicStart = function () {
  if (!G.save.music || musicTimer) return;
  var ctx = ac();
  if (!ctx) return;
  var notes = [392, 466, 523, 466, 392, 349, 392, 523];
  var i = 0;
  var tick = function () {
    if (!G.save.music) { G.musicStop(); return; }
    tone(notes[i % notes.length], 0.26, 'triangle', 0.055);
    i++;
  };
  musicTimer = setInterval(tick, 340);
  tick();
};
G.musicStop = function () {
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
};

/* ---------- вибрация ---------- */
G.vibe = function (ms) {
  if (!G.save.vibe) return;
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* нет вибро */ }
};

/* ---------- генератор 50 уровней ---------- */
function rng(n) {
  var s = n * 2654435761 % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function birdSet(n) {
  if (n <= 3) return ['red', 'red'];
  if (n <= 8) return ['red', 'red', 'yellow'];
  if (n <= 14) return ['red', 'yellow', 'blue'];
  if (n <= 20) return ['yellow', 'blue', 'red', 'red'];
  if (n <= 30) return ['red', 'yellow', 'blue', 'red', 'yellow'];
  if (n <= 40) return ['red', 'yellow', 'blue', 'black', 'red'];
  return ['black', 'yellow', 'blue', 'red', 'yellow', 'red'];
}

G.LEVELS = (function () {
  var out = [], n, r, mats = ['wood', 'wood', 'ice', 'stone', 'sand'];
  for (n = 1; n <= G.TOTAL_LEVELS; n++) {
    r = rng(n + 7);
    var blocks = [], pigs = [];
    var towers = 2 + Math.floor((n - 1) / 8);
    if (towers > 5) towers = 5;
    var hardness = Math.min(3, Math.floor((n - 1) / 17));
    for (var t = 0; t < towers; t++) {
      var bx = 1180 + t * (128 + Math.floor(r() * 46));
      var h = 2 + Math.floor(r() * 4);
      for (var i = 0; i < h; i++) {
        var left = { x: bx, y: G.GROUND_Y - 44 * (i + 1), w: 44, h: 44, mat: mats[Math.floor(r() * mats.length)] };
        var right = { x: bx + 76, y: G.GROUND_Y - 44 * (i + 1), w: 44, h: 44, mat: mats[Math.floor(r() * mats.length)] };
        if (n > 12 && i === h - 1) { left.mat = 'stone'; right.mat = 'stone'; }
        blocks.push(left, right);
      }
      var top = { x: bx - 6, y: G.GROUND_Y - 44 * h - 26, w: 132, h: 26, mat: mats[Math.floor(r() * (1 + hardness))] };
      blocks.push(top);
      if (r() < 0.85) pigs.push({ x: bx + 60, y: G.GROUND_Y - 22, r: 19 + Math.round(r() * 7) });
      if (r() < 0.45) pigs.push({ x: bx + 60, y: G.GROUND_Y - 44 * h - 24, r: 17 + Math.round(r() * 6) });
    }
    if (n <= 2) { pigs.push({ x: 1310, y: G.GROUND_Y - 24, r: 22 }); }
    out.push({ n: n, blocks: blocks, pigs: pigs, birds: birdSet(n) });
  }
  return out;
})();

/* ---------- старт уровня ---------- */
G.startLevel = function (n) {
  n = Math.max(1, Math.min(G.TOTAL_LEVELS, n | 0));
  var L = G.LEVELS[n - 1];

  G.level = n;
  G.score = 0;
  G.state = 'play';
  G.ended = false;
  G.winT = 0;
  G.loseT = 0;
  G.lastWin = null;
  G.blocks = [];
  G.pigs = [];
  G.parts = [];
  G.pops = [];
  G.extraFlyers = [];
  G.flying = null;

  var i;
  for (i = 0; i < L.blocks.length; i++) G.blocks.push(G.makeBlock(L.blocks[i]));
  for (i = 0; i < L.pigs.length; i++) G.pigs.push(G.makePig(L.pigs[i]));

  if (!G.pigs.length) G.pigs.push(G.makePig({ x: 1300, y: G.GROUND_Y - 24, r: 22 }));

  G.birdsLeft = L.birds.slice();
  if (G.has('extra')) G.birdsLeft.push('red');

  G.nextBird();
};

return G;
})();
