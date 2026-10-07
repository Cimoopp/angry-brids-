/* ============================================================
   ANGRY BIRDS — данные, прогресс, магазин, достижения, звук
   Экспорт: window.ABG
   ============================================================ */
window.ABG = (function () {
'use strict';
var G = {};

/* ---------- мир ---------- */
G.WORLD_W = 2200;
G.WORLD_H = 720;
G.GROUND_Y = 620;
G.SLING_X = 205;
G.SLING_Y = 466;
G.MAX_PULL = 118;
G.POWER = 8.0;
G.GRAVITY = 1500;
G.TOTAL_LEVELS = 50;

/* ---------- материалы ---------- */
G.MAT = {
  wood:  { hp: 60,  fill: '#c98b3d', edge: '#8a5a22', dens: 1.00 },
  ice:   { hp: 34,  fill: '#a8e0f5', edge: '#6fb6d6', dens: 0.65 },
  stone: { hp: 120, fill: '#b9b9b9', edge: '#7d7d7d', dens: 1.70 },
  sand:  { hp: 80,  fill: '#e3cf8f', edge: '#b5a05f', dens: 1.20 }
};

/* ---------- птицы ---------- */
G.BIRDS = {
  red:    { r: 22, mass: 1.00, ability: 'none'  },
  yellow: { r: 20, mass: 0.85, ability: 'boost' },
  blue:   { r: 17, mass: 0.70, ability: 'split' },
  black:  { r: 25, mass: 1.35, ability: 'bomb'  }
};
G.BIRD = G.BIRDS;

/* ---------- состояние ---------- */
G.state = 'menu';
G.level = 1;
G.score = 0;
G.started = false;
G.ended = false;
G.winT = 0;
G.loseT = 0;
G.shots = 0;
G.kills = 0;
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
var KEY = 'ab_save_v3';
function def() {
  return {
    stars: {}, coins: 0, unlocked: 1,
    sound: true, music: true, vibe: true,
    items: {},
    stats: { shots: 0, kills: 0, blocks: 0, wins: 0, bombs: 0, splits: 0, boosts: 0, noloss: 0, buy: 0, maxCoins: 0 },
    ach: {}
  };
}
G.save = def();
try {
  var raw = localStorage.getItem(KEY);
  if (raw) {
    var o = JSON.parse(raw), d = def(), k;
    for (k in d) if (!(k in o)) o[k] = d[k];
    for (k in d.stats) if (!(k in (o.stats || {}))) (o.stats = o.stats || {})[k] = 0;
    G.save = o;
  }
} catch (e) { G.save = def(); }

G.store = function () { try { localStorage.setItem(KEY, JSON.stringify(G.save)); } catch (e) {} };
G.has = function (id) { return !!(G.save.items && G.save.items[id]); };
G.resetProgress = function () { G.save = def(); G.store(); };
G.vibrate = function (ms) { if (G.save.vibe && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } };

G.stars = function (n) { return G.save.stars[n] || 0; };
G.setStars = function (n, v) {
  if ((G.save.stars[n] || 0) < v) G.save.stars[n] = v;
  if ((G.save.unlocked || 1) < n + 1) G.save.unlocked = Math.min(G.TOTAL_LEVELS, n + 1);
  G.store();
};
G.totalStars = function () {
  var s = 0, i;
  for (i = 1; i <= G.TOTAL_LEVELS; i++) s += (G.save.stars[i] || 0);
  return s;
};
G.doneLevels = function () {
  var c = 0, i;
  for (i = 1; i <= G.TOTAL_LEVELS; i++) if (G.save.stars[i]) c++;
  return c;
};
G.maxUnlocked = function () { return Math.max(1, Math.min(G.TOTAL_LEVELS, G.save.unlocked || 1)); };
G.pigPips = function (n) { return Math.max(1, 1 + Math.floor(n / 6)); };

/* ---------- магазин ---------- */
G.ITEMS = [
  { id: 'gloves', name: 'Перчатки',      desc: 'Сила выстрела +18%',      price: 120, ico: '🧤' },
  { id: 'feather', name: 'Лёгкое перо',  desc: 'Птица летит дальше',      price: 150, ico: '🪶' },
  { id: 'extra',  name: 'Запасная птица', desc: '+1 птица на уровень',     price: 220, ico: '🛡️' },
  { id: 'smooth', name: 'Плавная камера', desc: 'Камера следит мягче',     price: 90,  ico: '🌀' },
  { id: 'gold',   name: 'Золотая птица',  desc: '+25% монет за уровень',   price: 300, ico: '🪙' },
  { id: 'bomb',   name: 'Чёрная птица',   desc: 'Бомба в каждом наборе',   price: 400, ico: '💣' }
];

G.buy = function (id) {
  var it = null, i;
  for (i = 0; i < G.ITEMS.length; i++) if (G.ITEMS[i].id === id) it = G.ITEMS[i];
  if (!it || G.has(id)) return false;
  if ((G.save.coins || 0) < it.price) return false;
  G.save.coins -= it.price;
  G.save.items[id] = true;
  G.save.stats.buy = (G.save.stats.buy || 0) + 1;
  G.store();
  G.checkAch();
  return true;
};

/* ---------- достижения ---------- */
G.ACH = [
  { id: 'a1',  ico: '🎯', name: 'Первый выстрел',  desc: 'Выстрелить один раз',        f: function (s) { return s.shots >= 1; } },
  { id: 'a2',  ico: '🏹', name: 'Меткий глаз',     desc: '50 выстрелов',               f: function (s) { return s.shots >= 50; } },
  { id: 'a3',  ico: '🧱', name: 'Разрушитель',     desc: 'Разбить 100 блоков',         f: function (s) { return s.blocks >= 100; } },
  { id: 'a4',  ico: '🐷', name: 'Первый свин',     desc: 'Лопнуть первого свина',      f: function (s) { return s.kills >= 1; } },
  { id: 'a5',  ico: '⚡', name: 'Гроза свиней',    desc: '100 свиней',                 f: function (s) { return s.kills >= 100; } },
  { id: 'a6',  ico: '🏆', name: 'Первый уровень',  desc: 'Пройти уровень',             f: function (s) { return s.wins >= 1; } },
  { id: 'a7',  ico: '🎖️', name: 'Ветеран',         desc: '10 уровней',                 f: function (s) { return s.wins >= 10; } },
  { id: 'a8',  ico: '👑', name: 'Мастер',          desc: '25 уровней',                 f: function (s) { return s.wins >= 25; } },
  { id: 'a9',  ico: '🌟', name: 'Все уровни',      desc: 'Пройти все 50 уровней',      f: function (s) { return s.wins >= 50; } },
  { id: 'a10', ico: '⭐', name: '10 звёзд',        desc: 'Собрать 10 звёзд',           f: function () { return G.totalStars() >= 10; } },
  { id: 'a11', ico: '✨', name: '50 звёзд',        desc: 'Собрать 50 звёзд',           f: function () { return G.totalStars() >= 50; } },
  { id: 'a12', ico: '💫', name: '100 звёзд',       desc: 'Собрать 100 звёзд',          f: function () { return G.totalStars() >= 100; } },
  { id: 'a13', ico: '💰', name: 'Богач',           desc: 'Накопить 500 монет',         f: function () { return (G.save.coins || 0) >= 500; } },
  { id: 'a14', ico: '💎', name: 'Миллионер',       desc: 'Накопить 2000 монет',        f: function (s) { return (s.maxCoins || 0) >= 2000; } },
  { id: 'a15', ico: '🛒', name: 'Покупатель',      desc: 'Купить 3 предмета',          f: function (s) { return s.buy >= 3; } },
  { id: 'a16', ico: '📦', name: 'Коллекционер',    desc: 'Купить всё в магазине',      f: function (s) { return s.buy >= 6; } },
  { id: 'a17', ico: '🕊️', name: 'Без потерь',     desc: 'Пройти уровень всеми птицами', f: function (s) { return s.noloss >= 1; } },
  { id: 'a18', ico: '💣', name: 'Взрывник',        desc: '20 взрывов',                 f: function (s) { return s.bombs >= 20; } },
  { id: 'a19', ico: '🔷', name: 'Тройной удар',    desc: '20 раз разделить синюю',     f: function (s) { return s.splits >= 20; } },
  { id: 'a20', ico: '💛', name: 'Рывок',           desc: '20 раз ускорить жёлтую',     f: function (s) { return s.boosts >= 20; } }
];

G.checkAch = function () {
  var s = G.save.stats, i, a, unlocked = false;
  if ((G.save.coins || 0) > (s.maxCoins || 0)) { s.maxCoins = G.save.coins; }
  for (i = 0; i < G.ACH.length; i++) {
    a = G.ACH[i];
    if (!G.save.ach[a.id]) {
      var ok = false;
      try { ok = !!a.f(s); } catch (e) { ok = false; }
      if (ok) { G.save.ach[a.id] = 1; unlocked = true; }
    }
  }
  if (unlocked) G.store();
  return unlocked;
};
G.achCount = function () {
  var c = 0, i;
  for (i = 0; i < G.ACH.length; i++) if (G.save.ach[G.ACH[i].id]) c++;
  return c;
};

/* ---------- звук (WebAudio, без файлов) ---------- */
var actx = null;
G.ac = function () {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; } }
  if (actx && actx.state === 'suspended') { try { actx.resume(); } catch (e) {} }
  return actx;
};
function tone(freq, dur, type, vol) {
  var a = G.ac();
  if (!a || !G.save.sound) return;
  try {
    var o = a.createOscillator(), g = a.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    g.gain.value = 0.0001;
    o.connect(g); g.connect(a.destination);
    var t = a.currentTime;
    g.gain.exponentialRampToValueAtTime(vol || 0.07, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur + 0.02);
  } catch (e) {}
}
G.SFX = {
  click: function () { tone(660, 0.06, 'square', 0.05); },
  pull:  function () { tone(180, 0.10, 'sawtooth', 0.05); },
  shoot: function () { tone(320, 0.12, 'triangle', 0.08); },
  thud:  function () { G.vibrate(12); tone(110, 0.10, 'sine', 0.08); },
  hit:   function () { tone(240, 0.07, 'square', 0.06); G.vibrate(18); },
  brk:   function () { G.vibrate(22); tone(150, 0.13, 'sawtooth', 0.07); },
  pig:   function () { tone(520, 0.13, 'triangle', 0.08); G.vibrate(16); },
  bomb:  function () { G.vibrate(60); tone(70, 0.32, 'sawtooth', 0.12); },
  win:   function () { tone(660, 0.13, 'triangle', 0.09); setTimeout(function () { tone(880, 0.16, 'triangle', 0.09); }, 130); setTimeout(function () { tone(1180, 0.22, 'triangle', 0.09); }, 280); },
  lose:  function () { tone(300, 0.22, 'sine', 0.08); setTimeout(function () { tone(200, 0.32, 'sine', 0.08); }, 220); },
  coin:  function () { tone(980, 0.08, 'square', 0.06); setTimeout(function () { tone(1320, 0.10, 'square', 0.06); }, 80); }
};

/* ---------- музыка (простая петля) ---------- */
var mTimer = null, mStep = 0;
var MELODY = [262, 330, 392, 330, 294, 349, 440, 349, 262, 330, 392, 523, 466, 392, 330, 294];
G.musicStart = function () {
  if (!G.save.music || mTimer) return;
  G.ac();
  mTimer = setInterval(function () {
    if (!G.save.music) { G.musicStop(); return; }
    if (G.state === 'play' || G.state === 'pause') { mStep++; return; }
    tone(MELODY[mStep % MELODY.length], 0.32, 'sine', 0.035);
    mStep++;
  }, 430);
};
G.musicStop = function () { if (mTimer) { clearInterval(mTimer); mTimer = null; } };

return G;
})();
