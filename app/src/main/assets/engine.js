/* ============================================================
   ANGRY BIRDS — ядро: мир, данные, сохранение, звук, уровни
   Экспорт: window.ABG
   ============================================================ */
window.ABG = (function () {
'use strict';
var G = {};

/* --- размеры мира (в условных единицах) --- */
G.WORLD_W = 2600;
G.WORLD_H = 720;
G.GROUND_Y = 620;
G.SLING_X = 215;
G.SLING_Y = 468;
G.MAX_PULL = 125;
G.POWER = 7.4;
G.GRAVITY = 1500;
G.TOTAL_LEVELS = 50;

/* --- материалы блоков --- */
G.MAT = {
  wood:  { hp: 75,  dens: 1.0, fill: '#c88a3c', edge: '#8a5a22' },
  ice:   { hp: 42,  dens: 0.7, fill: '#a9dff2', edge: '#6cb4d4' },
  stone: { hp: 135, dens: 1.7, fill: '#b6b6b6', edge: '#7b7b7b' },
  sand:  { hp: 95,  dens: 1.2, fill: '#e0cb8b', edge: '#b09a58' }
};

/* --- птицы --- */
G.BIRDS = {
  red:    { r: 22, mass: 1.00, ability: 'none',  fill: '#e8453c', belly: '#ffd9d4' },
  yellow: { r: 20, mass: 0.85, ability: 'boost', fill: '#f5c542', belly: '#fff0c2' },
  blue:   { r: 17, mass: 0.70, ability: 'split', fill: '#4aa8e8', belly: '#d6ecfa' },
  black:  { r: 25, mass: 1.40, ability: 'bomb',  fill: '#3a3a44', belly: '#8d8d97' }
};
G.BIRD = G.BIRDS;

/* --- состояние игры --- */
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

/* --- магазин --- */
G.ITEMS = {
  slingshot: { name: 'Крепкая рогатка', desc: '+10% к силе выстрела',   price: 150, ico: '🎯' },
  gloves:    { name: 'Перчатки',        desc: '+18% к натяжению',       price: 260, ico: '🧤' },
  helmet:    { name: 'Шлемы птицам',    desc: 'Птицы крепче на 25%',    price: 340, ico: '⛑️' },
  radar:     { name: 'Радар',           desc: 'Дольше видна траектория', price: 420, ico: '📡' }
};

/* --- достижения --- */
G.ACH = [
  { id: 'lvl1',    name: 'Первый полёт',  desc: 'Пройти 1 уровень',            ico: '🐣' },
  { id: 'lvl5',    name: 'Разминка',      desc: 'Пройти 5 уровней',            ico: '🥚' },
  { id: 'lvl10',   name: 'Десятка',       desc: 'Пройти 10 уровней',           ico: '🐦' },
  { id: 'lvl25',   name: 'Ветеран',       desc: 'Пройти 25 уровней',           ico: '🦅' },
  { id: 'lvl50',   name: 'Легенда',       desc: 'Пройти все 50 уровней',       ico: '👑' },
  { id: 'pig10',   name: 'Ловкий',        desc: 'Сбить 10 свиней',             ico: '🐷' },
  { id: 'pig50',   name: 'Охотник',       desc: 'Сбить 50 свиней',             ico: '🎯' },
  { id: 'pig150',  name: 'Гроза свиней',  desc: 'Сбить 150 свиней',            ico: '💥' },
  { id: 'star30',  name: 'Копилка',       desc: 'Собрать 30 звёзд',            ico: '⭐' },
  { id: 'star75',  name: 'Сияние',        desc: 'Собрать 75 звёзд',            ico: '✨' },
  { id: 'star150', name: 'Небо в звёздах',desc: 'Собрать все 150 звёзд',       ico: '🌟' },
  { id: 'three',   name: 'Идеально',      desc: 'Пройти уровень на 3 звезды',  ico: '🏅' },
  { id: 'onebird', name: 'Снайпер',       desc: 'Пройти уровень одной птицей', ico: '🎯' },
  { id: 'blue',    name: 'Трио',          desc: 'Разделить синюю птицу',       ico: '💙' },
  { id: 'black',   name: 'Бум',           desc: 'Взорвать чёрную птицу',       ico: '💣' },
  { id: 'yellow',  name: 'Ускорение',     desc: 'Ускорить жёлтую птицу',       ico: '⚡' },
  { id: 'rich',    name: 'Богач',         desc: 'Накопить 1000 монет',         ico: '🪙' },
  { id: 'shop2',   name: 'Шопоголик',     desc: 'Купить 2 предмета',           ico: '🛒' },
  { id: 'try3',    name: 'Постоянство',   desc: 'Запустить игру 3 раза',       ico: '📅' },
  { id: 'correct', name: 'Чисто',         desc: 'Пройти уровень, не разрушив ни одного блока', ico: '🧱' }
];

/* --- сохранение --- */
var KEY = 'ab_save_v1';

function blank() {
  return {
    coins: 150, stars: {}, unlocked: 1, ach: {}, items: {},
    pigs: 0, runs: 0, sound: true, music: true, vibe: true
  };
}
G.save = blank();

function load() {
  try {
    var raw = localStorage.getItem(KEY);
    if (!raw) return;
    var o = JSON.parse(raw);
    for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) G.save[k] = o[k];
  } catch (e) { /* начинаем заново */ }
}
function store() {
  try { localStorage.setItem(KEY, JSON.stringify(G.save)); } catch (e) { /* нет места */ }
}
G.store = store;
load();
G.save.runs = (G.save.runs | 0) + 1;
store();

G.has = function (id) { return !!G.save.items[id]; };

G.buy = function (id) {
  var it = G.ITEMS[id];
  if (!it || G.has(id) || G.save.coins < it.price) return false;
  G.save.coins -= it.price;
  G.save.items[id] = 1;
  var bought = 0, k;
  for (k in G.save.items) bought++;
  if (bought >= 2) G.giveAch('shop2');
  if (G.save.coins >= 1000) G.giveAch('rich');
  store();
  return true;
};

G.starsTotal = function () { var s = 0, k; for (k in G.save.stars) s += G.save.stars[k] | 0; return s; };
G.starOf = function (n) { return G.save.stars[n] | 0; };
G.levelsDone = function () { var c = 0, k; for (k in G.save.stars) if (G.save.stars[k]) c++; return c; };
G.achCount = function () { var c = 0, k; for (k in G.save.ach) if (G.save.ach[k]) c++; return c; };

G.giveAch = function (id) {
  if (G.save.ach[id]) return false;
  G.save.ach[id] = 1;
  store();
  var nm = id;
  for (var i = 0; i < G.ACH.length; i++) if (G.ACH[i].id === id) nm = G.ACH[i].name;
  G.pop('🏆 ' + nm, G.WORLD_W * 0.5, 150, '#ffd34d');
  return true;
};

G.checkAch = function () {
  var done = G.levelsDone();
  if (done >= 1) G.giveAch('lvl1');
  if (done >= 5) G.giveAch('lvl5');
  if (done >= 10) G.giveAch('lvl10');
  if (done >= 25) G.giveAch('lvl25');
  if (done >= 50) G.giveAch('lvl50');
  var p = G.save.pigs | 0;
  if (p >= 10) G.giveAch('pig10');
  if (p >= 50) G.giveAch('pig50');
  if (p >= 150) G.giveAch('pig150');
  var st = G.starsTotal();
  if (st >= 30) G.giveAch('star30');
  if (st >= 75) G.giveAch('star75');
  if (st >= 150) G.giveAch('star150');
  if ((G.save.runs | 0) >= 3) G.giveAch('try3');
  if ((G.save.coins | 0) >= 1000) G.giveAch('rich');
};

G.resetProgress = function () {
  var s = G.save;
  G.save = blank();
  G.save.sound = s.sound;
  G.save.music = s.music;
  G.save.vibe = s.vibe;
  store();
};

/* --- мелкие эффекты --- */
G.pop = function (text, x, y, col) {
  G.pops.push({ text: text, x: x || G.WORLD_W * 0.5, y: y || 200,
                life: 1.5, t: 1.5, col: col || '#ffd34d' });
};
G.burst = function (x, y, color, n) {
  n = n || 12;
  for (var i = 0; i < n; i++) {
    var a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 220;
    G.parts.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
                   size: 2 + Math.random() * 4, life: 0.5 + Math.random() * 0.7, col: color });
  }
};
G.vibe = function (ms) {
  if (!G.save.vibe) return;
  try { if (navigator.vibrate) navigator.vibrate(ms || 20); } catch (e) { /* нет вибро */ }
};

/* --- звук --- */
var actx = null, musicTimer = null;

G.ac = function () {
  if (!G.save.sound) return null;
  try {
    if (!actx) {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      actx = new C();
    }
    if (actx.state === 'suspended') actx.resume();
  } catch (e) { return null; }
  return actx;
};

function beep(freq, dur, type, vol) {
  var c = G.ac();
  if (!c) return;
  try {
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    g.gain.value = vol || 0.06;
    o.connect(g);
    g.connect(c.destination);
    var t = c.currentTime;
    o.start(t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.1));
    o.stop(t + (dur || 0.1) + 0.03);
  } catch (e) { /* тишина */ }
}
G.beep = beep;

G.SFX = {
  click: function () { beep(520, 0.06, 'triangle', 0.05); },
  pull:  function () { beep(180, 0.05, 'sine', 0.04); },
  hit:   function () { beep(150, 0.09, 'square', 0.05); },
  pop:   function () { beep(680, 0.08, 'triangle', 0.05); },
  bird:  function () { beep(880, 0.06, 'sine', 0.05); },
  boost: function () { beep(1120, 0.10, 'sawtooth', 0.05); },
  split: function () { beep(760, 0.09, 'triangle', 0.05); },
  boom:  function () { beep(90, 0.28, 'sawtooth', 0.07); },
  break: function () { beep(240, 0.07, 'square', 0.05); },
  win:   function () {
    beep(660, 0.12, 'triangle', 0.06);
    setTimeout(function () { beep(880, 0.14, 'triangle', 0.06); }, 130);
    setTimeout(function () { beep(1180, 0.16, 'triangle', 0.06); }, 280);
  },
  lose:  function () { beep(200, 0.24, 'sine', 0.06); }
};

var NOTE = [523, 587, 659, 784, 880];
G.musicStart = function () {
  if (!G.save.music || musicTimer) return;
  var i = 0;
  musicTimer = setInterval(function () {
    beep(NOTE[i % NOTE.length] / 2, 0.18, 'triangle', 0.020);
    i++;
  }, 560);
};
G.musicStop = function () {
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
};

/* --- построение уровней --- */
G.buildLevel = function (n) {
  var blocks = [], pigs = [];
  var keys = ['wood', 'ice', 'sand', 'stone'];
  var m1 = keys[(n - 1) % 4];
  var m2 = keys[n % 4];
  var gx = 1180, gy = G.GROUND_Y;
  var floors = Math.min(3, 1 + Math.floor((n - 1) / 9));
  var pigCount = Math.min(5, 1 + Math.floor(n / 4));
  var f, i, x, base;

  /* этажи: три стойки + перекрытие */
  for (f = 0; f < floors; f++) {
    base = gy - f * 150;
    for (i = 0; i < 3; i++) {
      x = gx + (i - 1) * 80;
      blocks.push({ x: x, y: base - 55, w: 26, h: 110, mat: (f + i) % 2 ? m1 : m2, static: false });
    }
    blocks.push({ x: gx, y: base - 121, w: 236, h: 22, mat: m2, static: false });
  }

  /* свиньи внутри этажей */
  for (i = 0; i < pigCount; i++) {
    f = i % floors;
    base = gy - f * 150;
    pigs.push({ x: gx + ((i % 3) - 1) * 78, y: base - 22, r: 16 + (i % 2) * 4 });
  }

  /* передний щит, чтобы было интереснее пробивать */
  blocks.push({ x: gx - 210, y: gy - 80, w: 30, h: 160, mat: m1, static: false });

  /* земля как статичная платформа */
  blocks.push({ x: gx, y: gy + 60, w: 900, h: 120, mat: 'stone', static: true });

  return { blocks: blocks, pigs: pigs };
};

G.newBird = function () {
  if (!G.birdsLeft.length) return null;
  var type = G.birdsLeft.shift();
  var B = G.BIRDS[type];
  return { type: type, x: G.SLING_X, y: G.SLING_Y, vx: 0, vy: 0,
           r: B.r, mass: B.mass, state: 'ready', used: false, still: 0 };
};

G.startLevel = function (n) {
  n = n | 0;
  if (n < 1) n = 1;
  if (n > G.TOTAL_LEVELS) n = G.TOTAL_LEVELS;
  G.level = n;

  var L = G.buildLevel(n);
  G.blocks = L.blocks.map(function (b) {
    var M = G.MAT[b.mat];
    return { x: b.x, y: b.y, w: b.w, h: b.h, vx: 0, vy: 0, mat: b.mat,
             hp: M.hp, max: M.hp, dead: false, slp: 0, static: !!b.static };
  });
  G.pigs = L.pigs.map(function (p) {
    var hp = Math.round(50 + p.r * 2.4);
    return { x: p.x, y: p.y, r: p.r, vx: 0, vy: 0, hp: hp, max: hp, dead: false, slp: 0 };
  });
  if (!G.pigs.length) {
    G.pigs.push({ x: 1180, y: G.GROUND_Y - 22, r: 20, vx: 0, vy: 0, hp: 90, max: 90, dead: false, slp: 0 });
  }

  var types = ['red', 'red', 'yellow'];
  if (n >= 3) types.push('blue');
  if (n >= 5) types.push('black');
  if (n >= 8) types.push('yellow');
  G.birdsLeft = types.slice(0, n >= 12 ? 5 : 4);

  G.parts = [];
  G.pops = [];
  G.extraFlyers = [];
  G.flying = null;
  G.active = G.newBird();
  G.score = 0;
  G.started = true;
  G.ended = false;
  G.winT = 0;
  G.loseT = 0;
  G.state = 'play';
  return true;
};

G.alivePigs = function () {
  var c = 0, i;
  for (i = 0; i < G.pigs.length; i++) if (!G.pigs[i].dead) c++;
  return c;
};

G.unlockNext = function () {
  var next = G.level + 1;
  if (next > G.TOTAL_LEVELS) next = G.TOTAL_LEVELS;
  if (next > (G.save.unlocked | 0)) { G.save.unlocked = next; store(); }
};

G.checkAch();
return G;
})();
