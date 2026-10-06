/* ============================================================
   ANGRY BIRDS — ядро: константы, прогресс, звук, уровни,
   магазин, достижения.  Экспорт: window.ABG
   ============================================================ */
(function () {
'use strict';

var KEY = 'angry_birds_save_v1';

var G = {
  WORLD_W: 2100, WORLD_H: 720,
  GROUND_Y: 640,
  SLING_X: 260, SLING_Y: 470,
  GRAVITY: 1500, POWER: 8.2, MAX_PULL: 130,
  TOTAL_LEVELS: 50,

  MAT: {
    wood:  { fill: '#c08b45', edge: '#8a5a24', hp: 60,  dens: 1.0 },
    ice:   { fill: '#a8dcf0', edge: '#5fa8c8', hp: 35,  dens: 0.8 },
    stone: { fill: '#9aa3ad', edge: '#5f6a76', hp: 120, dens: 1.6 }
  },

  BIRD: {
    red:    { r: 22, dmg: 1.0, mat: 1.0 },
    yellow: { r: 20, dmg: 1.2, mat: 0.9 },
    blue:   { r: 17, dmg: 0.8, mat: 0.8 },
    black:  { r: 25, dmg: 1.4, mat: 1.3 }
  },

  ITEMS: [
    { id: 'blue',   ic: '🔵', t: 'Синяя птица',  d: 'Раскалывается на три', p: 300 },
    { id: 'bomb',   ic: '💥', t: 'Бомба',        d: 'Взрыв на месте тапа',  p: 250 },
    { id: 'gold',   ic: '🥇', t: 'Золотая',      d: 'Тройной урон, ×3 шт.', p: 500 },
    { id: 'ram',    ic: '🐗', t: 'Супер-таран',  d: 'Пробивает камень, ×3', p: 450 },
    { id: 'pantry', ic: '📦', t: 'Кладовая',     d: '+25% монет всегда',    p: 800 }
  ],

  ACH: [
    { id: 'first',   n: 'Первый шаг',      d: 'Пройди 1 уровень' },
    { id: 'l10',     n: 'Десятка',         d: 'Пройди 10 уровней' },
    { id: 'l25',     n: 'Половина пути',   d: 'Пройди 25 уровней' },
    { id: 'l50',     n: 'Все уровни',      d: 'Пройди все 50 уровней' },
    { id: 'p50',     n: 'Охотник',         d: 'Убей 50 свиней' },
    { id: 'p200',    n: 'Гроза свиней',    d: 'Убей 200 свиней' },
    { id: 'p500',    n: 'Легенда',         d: 'Убей 500 свиней' },
    { id: 's30',     n: 'Тридцать звёзд',  d: 'Собери 30 звёзд' },
    { id: 's75',     n: 'Полсотни',        d: 'Собери 75 звёзд' },
    { id: 's150',    n: 'Идеально',        d: 'Собери все 150 звёзд' },
    { id: 'b100',    n: 'Разрушитель',     d: 'Разбей 100 блоков' },
    { id: 'b500',    n: 'Крушитель',       d: 'Разбей 500 блоков' },
    { id: 'c1000',   n: 'Богач',           d: 'Заработай 1000 монет' },
    { id: 'c5000',   n: 'Казначей',        d: 'Заработай 5000 монет' },
    { id: 'shop1',   n: 'Покупатель',      d: 'Купи первую вещь' },
    { id: 'shop3',   n: 'Коллекционер',    d: 'Купи три вещи' },
    { id: 'shopa',   n: 'Всё моё',         d: 'Купи всё в магазине' },
    { id: 's3',      n: 'Чистое небо',     d: 'Пройди уровень на 3 звезды' },
    { id: 's3x10',   n: 'Снайпер',         d: '10 уровней на 3 звезды' },
    { id: 'combo',   n: 'Цепная реакция',  d: 'Сбей 3 свиньи одной птицей' }
  ],

  save: null,
  state: 'menu',
  level: 1, score: 0, result: null,
  lastWin: null,
  blocks: [], pigs: [], parts: [], pops: [],
  birdsLeft: [], extraFlyers: [],
  active: null, flying: null,
  dragPull: 0
};

/* ---------- сохранение ---------- */
function fresh() {
  return {
    coins: 0, stars: 0, kills: 0, blocks: 0, earned: 0,
    levels: {}, items: {}, ach: {},
    sound: true, music: true, vibe: true, played: 0
  };
}

G.load = function () {
  try {
    var raw = localStorage.getItem(KEY);
    G.save = raw ? JSON.parse(raw) : fresh();
  } catch (e) { G.save = fresh(); }
  if (!G.save || typeof G.save !== 'object') G.save = fresh();
  if (!G.save.levels) G.save.levels = {};
  if (!G.save.items) G.save.items = {};
  if (!G.save.ach) G.save.ach = {};
};

G.store = function () {
  try { localStorage.setItem(KEY, JSON.stringify(G.save)); } catch (e) { /* приватный режим */ }
};

G.resetProgress = function () {
  var s = G.save;
  G.save = fresh();
  G.save.sound = s.sound; G.save.music = s.music; G.save.vibe = s.vibe;
  G.store();
};

/* ---------- прогресс ---------- */
G.starsTotal = function () {
  var n = 0, k;
  for (k in G.save.levels) if (G.save.levels.hasOwnProperty(k)) n += (G.save.levels[k] | 0);
  return n;
};
G.levelsDone = function () {
  var n = 0, k;
  for (k in G.save.levels) if (G.save.levels.hasOwnProperty(k) && (G.save.levels[k] | 0) > 0) n++;
  return n;
};
G.maxUnlocked = function () { return Math.min(G.TOTAL_LEVELS, G.levelsDone() + 1); };
G.achCount = function () {
  var n = 0, k;
  for (k in G.save.ach) if (G.save.ach.hasOwnProperty(k) && G.save.ach[k]) n++;
  return n;
};
G.alivePigs = function () {
  var n = 0;
  for (var i = 0; i < G.pigs.length; i++) if (!G.pigs[i].dead) n++;
  return n;
};

/* ---------- магазин ---------- */
G.buy = function (id) {
  var it = null, i;
  for (i = 0; i < G.ITEMS.length; i++) if (G.ITEMS[i].id === id) it = G.ITEMS[i];
  if (!it) return 'no';
  if (G.save.items[id]) return 'owned';
  if (G.save.coins < it.p) return 'poor';
  G.save.coins -= it.p;
  G.save.items[id] = true;
  G.store();
  G.checkAch();
  return 'ok';
};

/* ---------- достижения ---------- */
G.checkAch = function () {
  function give(id) {
    if (!G.save.ach[id]) { G.save.ach[id] = true; G.save.coins += 200; G.SFX.star(); }
  }
  var done = G.levelsDone(), stars = G.starsTotal(), bought = 0, k;
  for (k in G.save.items) if (G.save.items.hasOwnProperty(k) && G.save.items[k]) bought++;

  if (done >= 1) give('first');
  if (done >= 10) give('l10');
  if (done >= 25) give('l25');
  if (done >= 50) give('l50');
  if (G.save.kills >= 50) give('p50');
  if (G.save.kills >= 200) give('p200');
  if (G.save.kills >= 500) give('p500');
  if (stars >= 30) give('s30');
  if (stars >= 75) give('s75');
  if (stars >= 150) give('s150');
  if (G.save.blocks >= 100) give('b100');
  if (G.save.blocks >= 500) give('b500');
  if (G.save.earned >= 1000) give('c1000');
  if (G.save.earned >= 5000) give('c5000');
  if (bought >= 1) give('shop1');
  if (bought >= 3) give('shop3');
  if (bought >= G.ITEMS.length) give('shopa');
  var threes = 0;
  for (k in G.save.levels) if (G.save.levels.hasOwnProperty(k) && (G.save.levels[k] | 0) >= 3) threes++;
  if (threes >= 1) give('s3');
  if (threes >= 10) give('s3x10');
  G.store();
};

/* ---------- звук ---------- */
(function () {
  var AC = null, musicTimer = null, step = 0;

  function ctx() {
    if (!AC) {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      AC = new C();
    }
    return AC;
  }

  function tone(freq, dur, type, vol) {
    if (!G.save.sound) return;
    var a = ctx();
    if (!a) return;
    var o = a.createOscillator(), g = a.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    g.gain.value = vol || 0.06;
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    o.connect(g);
    g.connect(a.destination);
    o.start();
    o.stop(a.currentTime + dur);
  }

  G.SFX = {
    click:  function () { tone(660, 0.07, 'square', 0.05); },
    pull:   function () { tone(180, 0.09, 'sine', 0.05); },
    launch: function () { tone(520, 0.14, 'sawtooth', 0.06); },
    hit:    function () { tone(110, 0.06, 'square', 0.05); },
    pop:    function () { tone(880, 0.08, 'triangle', 0.07); },
    boom:   function () { tone(70, 0.30, 'sawtooth', 0.09); },
    star:   function () {
      tone(880, 0.10, 'triangle', 0.07);
      setTimeout(function () { tone(1320, 0.14, 'triangle', 0.07); }, 110);
    }
  };

  G.unlockAudio = function () {
    var a = ctx();
    if (a && a.state === 'suspended') a.resume();
  };

  var MELODY = [392, 494, 587, 494, 440, 523, 659, 523];
  G.musicStart = function () {
    if (!G.save.music || musicTimer) return;
    var a = ctx();
    if (!a) return;
    musicTimer = setInterval(function () {
      if (!G.save.music) return;
      var f = MELODY[step % MELODY.length];
      step++;
      try {
        var o = a.createOscillator(), g = a.createGain();
        o.type = 'triangle';
        o.frequency.value = f;
        g.gain.value = 0.025;
        g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.42);
        o.connect(g); g.connect(a.destination);
        o.start(); o.stop(a.currentTime + 0.45);
      } catch (e) { /* игнор */ }
    }, 460);
  };
  G.musicStop = function () {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  };
})();

G.vibe = function (ms) {
  if (G.save.vibe && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { /* игнор */ } }
};

/* ---------- генератор уровней ---------- */
function levelConfig(n) {
  var t = (n - 1) % 6;
  var mat = n <= 15 ? 'wood' : (n <= 35 ? 'ice' : 'stone');
  var pigs = Math.min(7, 1 + Math.floor(n / 8) + (t === 2 ? 1 : 0));
  var birds = Math.min(7, 2 + Math.floor(n / 12));
  var list = ['red', 'red'];
  if (n >= 4) list.push('yellow');
  if (n >= 9) list.push('red');
  if (n >= 14 || G.save.items.blue) list.push('blue');
  if (n >= 20) list.push('black');
  if (n >= 26) list.push('yellow');
  if (n >= 33) list.push('black');
  if (G.save.items.gold) list.push('yellow');
  if (G.save.items.ram) list.push('red');
  list = list.slice(0, Math.max(birds, 3 + Math.floor(n / 10)));
  return { n: n, type: t, mat: mat, pigs: pigs, birds: list, seed: n * 7919 };
}

G.levelConfig = levelConfig;

/* ---------- старт уровня ---------- */
G.startLevel = function (n) {
  var cfg = levelConfig(n);
  G.level = n;
  G.score = 0;
  G.state = 'play';
  G.result = null;
  G.lastWin = null;
  G.blocks = [];
  G.pigs = [];
  G.parts = [];
  G.pops = [];
  G.extraFlyers = [];
  G.flying = null;
  G.active = null;
  G.birdsLeft = cfg.birds.slice();
  G.buildLevel(cfg);
  G.musicStart();
};

G.spawnPops = function (x, y, txt) { G.pops.push({ x: x, y: y, txt: txt, t: 1.1 }); };
G.burst = function (x, y, color, count) {
  for (var i = 0; i < count; i++) {
    G.parts.push({
      x: x, y: y,
      vx: (Math.random() - 0.5) * 420,
      vy: -Math.random() * 320,
      s: 4 + Math.random() * 6,
      c: color, life: 0.6 + Math.random() * 0.6
    });
  }
};

G.load();
window.ABG = G;
})();
