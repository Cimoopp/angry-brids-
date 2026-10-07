/* ============================================================
   ANGRY BIRDS — ядро: данные, прогресс, магазин, достижения, звук
   Экспорт: window.ABG
   ============================================================ */
window.ABG = (function () {
'use strict';

var G = {};

/* ---------- мир ---------- */
G.WORLD_W = 2600;
G.WORLD_H = 720;
G.GROUND_Y = 620;
G.SLING_X = 220;
G.SLING_Y = 452;
G.MAX_PULL = 130;
G.POWER = 8.4;
G.GRAVITY = 1600;
G.TOTAL_LEVELS = 50;

/* ---------- материалы ---------- */
G.MAT = {
  wood:  { hp: 70,  fill: '#c98b3d', edge: '#8a5a22' },
  ice:   { hp: 40,  fill: '#a8e0f5', edge: '#6fb6d6' },
  sand:  { hp: 95,  fill: '#e3cf8f', edge: '#b5a05f' },
  stone: { hp: 150, fill: '#bcbcbc', edge: '#7b7b7b' }
};

/* ---------- птицы ---------- */
G.BIRDS = {
  red:    { r: 24, mass: 1.00, ability: 'none'  },
  yellow: { r: 21, mass: 0.85, ability: 'boost' },
  blue:   { r: 18, mass: 0.70, ability: 'split' },
  black:  { r: 27, mass: 1.40, ability: 'bomb'  }
};
G.BIRD = G.BIRDS;

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
G.started = false;
G.ended = false;
G.winT = 0;
G.loseT = 0;
G.lastWin = null;
G.shots = 0;
G.killed = 0;
G.earned = 0;

/* ---------- сохранение ---------- */
var KEY = 'angrybirds_save_v2';
G.save = { coins: 0, levels: {}, items: {}, ach: {}, sound: true, music: false, vibe: true, kills: 0 };

G.load = function () {
  try {
    var raw = localStorage.getItem(KEY);
    if (!raw) return;
    var o = JSON.parse(raw) || {};
    if (typeof o.coins === 'number') G.save.coins = o.coins;
    if (o.levels) G.save.levels = o.levels;
    if (o.items) G.save.items = o.items;
    if (o.ach) G.save.ach = o.ach;
    if (typeof o.sound === 'boolean') G.save.sound = o.sound;
    if (typeof o.music === 'boolean') G.save.music = o.music;
    if (typeof o.vibe === 'boolean') G.save.vibe = o.vibe;
    if (typeof o.kills === 'number') G.save.kills = o.kills;
  } catch (e) { }
};

G.store = function () {
  try { localStorage.setItem(KEY, JSON.stringify(G.save)); } catch (e) { }
};

G.resetProgress = function () {
  G.save = { coins: 0, levels: {}, items: {}, ach: {},
             sound: G.save.sound, music: false, vibe: G.save.vibe, kills: 0 };
  G.store();
};

G.starsTotal = function () {
  var t = 0, k;
  for (k in G.save.levels) if (Object.prototype.hasOwnProperty.call(G.save.levels, k)) t += (G.save.levels[k] | 0);
  return t;
};
G.levelsDone = function () {
  var c = 0, k;
  for (k in G.save.levels) if (Object.prototype.hasOwnProperty.call(G.save.levels, k) && (G.save.levels[k] | 0) > 0) c++;
  return c;
};
G.maxUnlocked = function () {
  var i;
  for (i = 1; i < G.TOTAL_LEVELS; i++) if ((G.save.levels[i] | 0) === 0) return i;
  return G.TOTAL_LEVELS;
};
G.achCount = function () {
  var c = 0, k;
  for (k in G.save.ach) if (Object.prototype.hasOwnProperty.call(G.save.ach, k) && G.save.ach[k]) c++;
  return c;
};

/* ---------- магазин ---------- */
G.ITEMS = [
  { id: 'redplus', ic: '🐦', t: 'Лишняя красная', d: '+1 птица на уровне',   p: 300  },
  { id: 'yellowu', ic: '💛', t: 'Жёлтая с завода', d: 'Жёлтая птица в наборе', p: 500  },
  { id: 'blueu',   ic: '💙', t: 'Синяя тройка',    d: 'Синяя птица в наборе',  p: 700  },
  { id: 'blacku',  ic: '🖤', t: 'Чёрная бомба',    d: 'Чёрная птица в наборе', p: 900  },
  { id: 'strong',  ic: '💪', t: 'Крепкие птицы',   d: '+25% к урону птиц',     p: 1200 },
  { id: 'magnet',  ic: '🧲', t: 'Магнит монет',    d: '+25% монет за уровень', p: 1500 },
  { id: 'gloves',  ic: '🧤', t: 'Перчатки',        d: 'Тянуть рогатку дальше', p: 1000 },
  { id: 'lucky',   ic: '🍀', t: 'Удача',           d: '+15% к очкам',          p: 2000 }
];

G.has = function (id) { return !!G.save.items[id]; };

G.buy = function (id) {
  var it = null, i;
  for (i = 0; i < G.ITEMS.length; i++) if (G.ITEMS[i].id === id) it = G.ITEMS[i];
  if (!it || G.has(id) || G.save.coins < it.p) return 'no';
  G.save.coins -= it.p;
  G.save.items[id] = true;
  G.store();
  G.unlockAch('shop');
  return 'ok';
};

/* ---------- достижения ---------- */
G.ACH = [
  { id: 'first',   n: 'Первый бросок',  d: 'Пройти уровень 1' },
  { id: 'lvl5',    n: 'Разогрев',       d: 'Пройти 5 уровней' },
  { id: 'lvl10',   n: 'Строитель',      d: 'Пройти 10 уровней' },
  { id: 'lvl25',   n: 'Разрушитель',    d: 'Пройти 25 уровней' },
  { id: 'lvl50',   n: 'Легенда',        d: 'Пройти все 50 уровней' },
  { id: 'k10',     n: 'Охотник',        d: 'Убрать 10 свиней' },
  { id: 'k50',     n: 'Гроза свиней',   d: 'Убрать 50 свиней' },
  { id: 'k200',    n: 'Свинобой',       d: 'Убрать 200 свиней' },
  { id: 's30',     n: 'Тридцать звёзд', d: 'Собрать 30 звёзд' },
  { id: 's75',     n: 'Полсотни',       d: 'Собрать 75 звёзд' },
  { id: 's150',    n: 'Идеально',       d: 'Собрать 150 звёзд' },
  { id: 'allbird', n: 'Птичий двор',    d: 'Выстрелить всеми птицами' },
  { id: 'bomb',    n: 'Бум',            d: 'Взорвать чёрную птицу' },
  { id: 'split',   n: 'Тройной удар',   d: 'Разделить синюю птицу' },
  { id: 'boost',   n: 'Рывок',          d: 'Ускорить жёлтую птицу' },
  { id: 'coins1k', n: 'Копилка',        d: 'Заработать 1000 монет' },
  { id: 'coins5k', n: 'Богач',          d: 'Заработать 5000 монет' },
  { id: 'three',   n: 'Три звезды',     d: 'Пройти уровень на все три' },
  { id: 'nohit',   n: 'Чисто',          d: 'Пройти уровень одной птицей' },
  { id: 'shop',    n: 'Покупатель',     d: 'Купить что-нибудь в магазине' }
];

G.unlockAch = function (id) {
  if (!id || G.save.ach[id]) return false;
  var ok = false, i;
  for (i = 0; i < G.ACH.length; i++) if (G.ACH[i].id === id) ok = true;
  if (!ok) return false;
  G.save.ach[id] = true;
  G.save.coins += 200;
  G.store();
  if (G.SFX && G.SFX.star) G.SFX.star();
  if (G.popText) G.popText(G.SLING_X + 120, G.SLING_Y - 60, '🏆 Достижение!');
  return true;
};

G.checkAch = function () {
  var done = G.levelsDone(), stars = G.starsTotal(), kills = G.save.kills || 0;
  if (done >= 1) G.unlockAch('first');
  if (done >= 5) G.unlockAch('lvl5');
  if (done >= 10) G.unlockAch('lvl10');
  if (done >= 25) G.unlockAch('lvl25');
  if (done >= 50) G.unlockAch('lvl50');
  if (kills >= 10) G.unlockAch('k10');
  if (kills >= 50) G.unlockAch('k50');
  if (kills >= 200) G.unlockAch('k200');
  if (stars >= 30) G.unlockAch('s30');
  if (stars >= 75) G.unlockAch('s75');
  if (stars >= 150) G.unlockAch('s150');
  if (G.earned >= 1000) G.unlockAch('coins1k');
  if (G.earned >= 5000) G.unlockAch('coins5k');
};

/* ---------- звук ---------- */
var acx = null;
function audio() {
  if (acx) return acx;
  try {
    var C = window.AudioContext || window.webkitAudioContext;
    if (C) acx = new C();
  } catch (e) { acx = null; }
  return acx;
}
G.ac = audio;

function tone(freq, dur, type, vol) {
  if (!G.save.sound) return;
  var a = audio();
  if (!a) return;
  try {
    if (a.state === 'suspended') a.resume();
    var o = a.createOscillator(), g = a.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    var v = (vol == null) ? 0.05 : vol;
    o.connect(g); g.connect(a.destination);
    var t = a.currentTime;
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch (e) { }
}

G.SFX = {
  click: function () { tone(680, 0.06, 'square', 0.04); },
  pull:  function () { tone(170, 0.09, 'sine', 0.05); },
  hit:   function () { tone(120, 0.11, 'sawtooth', 0.05); },
  pop:   function () { tone(430, 0.15, 'triangle', 0.06); },
  star:  function () { tone(900, 0.09, 'triangle', 0.05); setTimeout(function () { tone(1200, 0.13, 'triangle', 0.05); }, 100); },
  win:   function () { tone(660, 0.12); setTimeout(function () { tone(880, 0.12); }, 120); setTimeout(function () { tone(1180, 0.2); }, 240); },
  lose:  function () { tone(300, 0.18, 'sawtooth', 0.05); setTimeout(function () { tone(170, 0.3, 'sawtooth', 0.05); }, 170); },
  boost: function () { tone(950, 0.11, 'sawtooth', 0.05); },
  split: function () { tone(700, 0.08); setTimeout(function () { tone(900, 0.08); }, 85); },
  bomb:  function () { tone(85, 0.35, 'sawtooth', 0.07); },
  brk:   function () { tone(230, 0.08, 'square', 0.045); },
  pig:   function () { tone(540, 0.13, 'triangle', 0.055); }
};

/* ---------- музыка ---------- */
var mTimer = null, mStep = 0;
var MELODY = [392, 523, 659, 523, 440, 587, 698, 587];
G.musicStart = function () {
  if (!G.save.music || mTimer) return;
  if (!audio()) return;
  mTimer = setInterval(function () {
    if (!G.save.music || G.state === 'pause') return;
    tone(MELODY[mStep % MELODY.length], 0.26, 'triangle', 0.022);
    mStep++;
  }, 360);
};
G.musicStop = function () { if (mTimer) { clearInterval(mTimer); mTimer = null; } };

/* ---------- вибрация ---------- */
G.vibe = function (ms) {
  if (!G.save.vibe) return;
  try { if (navigator.vibrate) navigator.vibrate(ms || 15); } catch (e) { }
};

G.load();
return G;
})();
