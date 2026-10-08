/* ============================================================
   ANGRY BIRDS — ядро: мир, материалы, птицы, прогресс,
   звук, магазин, достижения, генератор уровней
   Экспорт: window.ABG
   ============================================================ */
window.ABG = (function () {
'use strict';
var G = {};

/* ---------- мир ---------- */
G.WORLD_W = 2300;
G.WORLD_H = 700;
G.GROUND_Y = 600;
G.SLING_X = 210;
G.SLING_Y = 452;
G.MAX_PULL = 115;
G.POWER = 7.4;
G.GRAVITY = 1400;
G.TOTAL_LEVELS = 50;

/* ---------- материалы ---------- */
G.MAT = {
  wood:  { hp: 62,  dens: 1.0, name: 'Дерево' },
  ice:   { hp: 38,  dens: 0.7, name: 'Лёд' },
  stone: { hp: 135, dens: 1.7, name: 'Камень' },
  sand:  { hp: 88,  dens: 1.3, name: 'Песчаник' }
};

/* ---------- птицы ---------- */
G.BIRDS = {
  red:    { r: 22, mass: 1.00, ability: 'none' },
  yellow: { r: 20, mass: 0.85, ability: 'boost' },
  blue:   { r: 17, mass: 0.70, ability: 'split' },
  black:  { r: 25, mass: 1.35, ability: 'bomb' }
};
G.BIRD = G.BIRDS;

/* ---------- магазин ---------- */
G.ITEMS = [
  { id: 'gloves',  icon: '🧤', name: 'Перчатки',  desc: 'Сила натяжения +18%',      price: 300 },
  { id: 'helmet',  icon: '⛑️', name: 'Каска',      desc: 'Урон птиц +20%',           price: 450 },
  { id: 'boots',   icon: '👟', name: 'Сапоги',    desc: 'Скорость вылета +10%',     price: 600 },
  { id: 'goggles', icon: '🥽', name: 'Очки',      desc: 'Длинная линия прицела',     price: 350 },
  { id: 'bag',     icon: '🎒', name: 'Мешок',     desc: '+1 птица на уровень',      price: 900 }
];

/* ---------- достижения ---------- */
G.ACH = [
  { id: 'first',    name: 'Первый выстрел',   desc: 'Запустить первую птицу',        reward: 50 },
  { id: 'win1',     name: 'Начало',           desc: 'Пройти уровень 1',              reward: 50 },
  { id: 'win5',     name: 'Разогрев',         desc: 'Пройти 5 уровней',              reward: 120 },
  { id: 'win10',    name: 'Опытный',          desc: 'Пройти 10 уровней',             reward: 200 },
  { id: 'win25',    name: 'Меткий',           desc: 'Пройти 25 уровней',             reward: 400 },
  { id: 'win50',    name: 'Легенда',          desc: 'Пройти все 50 уровней',         reward: 1000 },
  { id: 'stars30',  name: 'Тридцать звёзд',   desc: 'Собрать 30 звёзд',              reward: 250 },
  { id: 'stars60',  name: 'Шестьдесят звёзд', desc: 'Собрать 60 звёзд',              reward: 400 },
  { id: 'stars90',  name: 'Девяносто звёзд',  desc: 'Собрать 90 звёзд',              reward: 600 },
  { id: 'stars150', name: 'Все звёзды',       desc: 'Собрать 150 звёзд',             reward: 1500 },
  { id: 'coins1k',  name: 'Копилка',          desc: 'Накопить 1000 монет',           reward: 100 },
  { id: 'wood100',  name: 'Дровосек',         desc: 'Разбить 100 деревянных блоков', reward: 300 },
  { id: 'ice100',   name: 'Ледокол',          desc: 'Разбить 100 ледяных блоков',    reward: 300 },
  { id: 'stone100', name: 'Камнелом',         desc: 'Разбить 100 каменных блоков',   reward: 400 },
  { id: 'pigs50',   name: 'Свинобой',         desc: 'Убрать 50 свиней',              reward: 250 },
  { id: 'pigs200',  name: 'Гроза свиней',     desc: 'Убрать 200 свиней',             reward: 700 },
  { id: 'onebird',  name: 'Одной птицей',     desc: 'Пройти уровень, потратив 1 птицу', reward: 200 },
  { id: 'nopigs',   name: 'Чисто',            desc: 'Пройти уровень без выстрела',   reward: 500 },
  { id: 'shop1',    name: 'Покупатель',       desc: 'Купить первый предмет',         reward: 100 },
  { id: 'shopall',  name: 'Полный комплект',  desc: 'Купить всё в магазине',        reward: 800 }
];

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
G.combo = 0;
G.lastWin = null;
G.stats = { shots: 0, pigs: 0, wood: 0, ice: 0, stone: 0, spentBirds: 0 };

/* ---------- сохранение ---------- */
var KEY = 'ab_save_v2';

function blank() {
  return {
    coins: 0, stars: {}, items: [], ach: [], unlocked: 1,
    sound: true, music: true, vibe: true,
    st: { shots: 0, pigs: 0, wood: 0, ice: 0, stone: 0, spentBirds: 0 }
  };
}

G.save = blank();

G.load = function () {
  try {
    var raw = localStorage.getItem(KEY);
    if (!raw) return;
    var d = JSON.parse(raw);
    var b = blank(), k;
    for (k in b) if (Object.prototype.hasOwnProperty.call(b, k)) G.save[k] = b[k];
    for (k in d) if (Object.prototype.hasOwnProperty.call(d, k)) G.save[k] = d[k];
    if (!G.save.st) G.save.st = blank().st;
  } catch (e) { G.save = blank(); }
};

G.store = function () {
  try { localStorage.setItem(KEY, JSON.stringify(G.save)); }
  catch (e) { /* хранилище недоступно — играем без сохранения */ }
};

G.coins = function () { return G.save.coins; };
G.has = function (id) { return G.save.items.indexOf(id) >= 0; };
G.starsOf = function (n) { return G.save.stars[n] || 0; };
G.maxUnlocked = function () { return G.save.unlocked; };

G.starsTotal = function () {
  var s = 0, k;
  for (k in G.save.stars) if (Object.prototype.hasOwnProperty.call(G.save.stars, k)) s += G.save.stars[k];
  return s;
};

G.levelsDone = function () {
  var c = 0, k;
  for (k in G.save.stars) if (Object.prototype.hasOwnProperty.call(G.save.stars, k)) c++;
  return c;
};

G.achCount = function () { return G.save.ach.length; };

G.addCoins = function (n) {
  G.save.coins = Math.max(0, G.save.coins + n);
  G.store();
  G.checkAch();
};

G.buy = function (id) {
  var i, it = null;
  for (i = 0; i < G.ITEMS.length; i++) if (G.ITEMS[i].id === id) it = G.ITEMS[i];
  if (!it || G.has(id) || G.save.coins < it.price) return false;
  G.save.coins -= it.price;
  G.save.items.push(id);
  G.store();
  G.checkAch();
  return true;
};

G.unlockAch = function (id) {
  var i, a = null;
  if (G.save.ach.indexOf(id) >= 0) return false;
  for (i = 0; i < G.ACH.length; i++) if (G.ACH[i].id === id) a = G.ACH[i];
  if (!a) return false;
  G.save.ach.push(id);
  G.save.coins += a.reward;
  G.store();
  if (G.SFX.coin) G.SFX.coin();
  return true;
};

G.checkAch = function () {
  var s = G.save.st, done = G.levelsDone(), stars = G.starsTotal();
  if (s.shots >= 1) G.unlockAch('first');
  if (G.starsOf(1) > 0) G.unlockAch('win1');
  if (done >= 5) G.unlockAch('win5');
  if (done >= 10) G.unlockAch('win10');
  if (done >= 25) G.unlockAch('win25');
  if (done >= 50) G.unlockAch('win50');
  if (stars >= 30) G.unlockAch('stars30');
  if (stars >= 60) G.unlockAch('stars60');
  if (stars >= 90) G.unlockAch('stars90');
  if (stars >= 150) G.unlockAch('stars150');
  if (G.save.coins >= 1000) G.unlockAch('coins1k');
  if (s.wood >= 100) G.unlockAch('wood100');
  if (s.ice >= 100) G.unlockAch('ice100');
  if (s.stone >= 100) G.unlockAch('stone100');
  if (s.pigs >= 50) G.unlockAch('pigs50');
  if (s.pigs >= 200) G.unlockAch('pigs200');
  if (G.save.items.length >= 1) G.unlockAch('shop1');
  if (G.save.items.length >= G.ITEMS.length) G.unlockAch('shopall');
};

G.resetProgress = function () {
  G.save = blank();
  G.store();
};

/* ---------- звук ---------- */
var actx = null, musicTimer = null, musicStep = 0;

G.ac = function () {
  if (!actx) {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { actx = new AC(); } catch (e) { return null; }
  }
  if (actx.state === 'suspended') { try { actx.resume(); } catch (e) {} }
  return actx;
};

function tone(freq, dur, type, vol, slideTo) {
  if (!G.save.sound) return;
  var a = G.ac();
  if (!a) return;
  try {
    var o = a.createOscillator(), g = a.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, a.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), a.currentTime + dur);
    g.gain.setValueAtTime(0.0001, a.currentTime);
    g.gain.exponentialRampToValueAtTime(vol || 0.16, a.currentTime + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    o.connect(g);
    g.connect(a.destination);
    o.start(a.currentTime);
    o.stop(a.currentTime + dur + 0.03);
  } catch (e) { /* тишина лучше падения */ }
}

function noise(dur, vol) {
  if (!G.save.sound) return;
  var a = G.ac();
  if (!a) return;
  try {
    var len = Math.floor(a.sampleRate * dur);
    var buf = a.createBuffer(1, len, a.sampleRate);
    var d = buf.getChannelData(0), i;
    for (i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = a.createBufferSource(), g = a.createGain();
    src.buffer = buf;
    g.gain.value = vol || 0.22;
    src.connect(g);
    g.connect(a.destination);
    src.start();
  } catch (e) {}
}

G.SFX = {
  click: function () { tone(620, 0.06, 'square', 0.1); },
  pull:  function () { tone(180, 0.12, 'sawtooth', 0.09, 320); },
  hit:   function () { tone(140, 0.09, 'triangle', 0.14, 90); },
  coin:  function () { tone(880, 0.07, 'square', 0.12); setTimeout(function () { tone(1320, 0.1, 'square', 0.11); }, 70); },
  pig:   function () { tone(420, 0.16, 'sawtooth', 0.16, 160); },
  boom:  function () { noise(0.42, 0.3); tone(80, 0.35, 'sawtooth', 0.2, 40); },
  win:   function () {
    var n = [523, 659, 784, 1046], i;
    for (i = 0; i < n.length; i++) {
      (function (f, k) { setTimeout(function () { tone(f, 0.16, 'square', 0.14); }, k * 110); })(n[i], i);
    }
  },
  lose:  function () {
    var n = [392, 330, 262], i;
    for (i = 0; i < n.length; i++) {
      (function (f, k) { setTimeout(function () { tone(f, 0.22, 'triangle', 0.14); }, k * 160); })(n[i], i);
    }
  },
  boost: function () { tone(300, 0.18, 'sawtooth', 0.14, 900); },
  split: function () { tone(700, 0.12, 'square', 0.12, 1100); }
};

/* ---------- музыка ---------- */
var MELODY = [392, 523, 659, 523, 440, 587, 698, 587];

G.musicStart = function () {
  if (musicTimer || !G.save.music) return;
  var a = G.ac();
  if (!a) return;
  musicTimer = setInterval(function () {
    if (!G.save.music) return;
    var f = MELODY[musicStep % MELODY.length];
    musicStep++;
    try {
      var o = a.createOscillator(), g = a.createGain();
      o.type = 'triangle';
      o.frequency.value = f / 2;
      g.gain.setValueAtTime(0.0001, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.045, a.currentTime + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.42);
      o.connect(g); g.connect(a.destination);
      o.start(); o.stop(a.currentTime + 0.45);
    } catch (e) {}
  }, 460);
};

G.musicStop = function () {
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
};

G.vibe = function (ms) {
  if (!G.save.vibe) return;
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {}
};

/* ---------- тела ---------- */
G.makeBlock = function (x, y, w, h, mat, stat) {
  var m = G.MAT[mat] || G.MAT.wood;
  return {
    x: x, y: y, w: w, h: h, vx: 0, vy: 0,
    m: mat, static: !!stat, hp: m.hp, max: m.hp, dead: false, touch: false
  };
};

G.makePig = function (x, y, r) {
  var hp = Math.round(48 + r * 3.4);
  return { x: x, y: y, r: r, vx: 0, vy: 0, hp: hp, max: hp, dead: false, still: 0 };
};

G.makeBird = function (type, x, y) {
  var t = G.BIRDS[type] || G.BIRDS.red;
  return {
    type: type, x: x, y: y, vx: 0, vy: 0, r: t.r, mass: t.mass,
    hp: 100, dead: false, used: false, state: 'ready', rot: 0, trail: []
  };
};

/* ---------- уровни ---------- */
function rng(seed) {
  var s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = s * 16807 % 2147483647;
    return (s - 1) / 2147483646;
  };
}

G.buildLevel = function (n) {
  var r = rng(n * 7919 + 13);
  G.blocks = [];
  G.pigs = [];

  var mats = ['wood', 'ice', 'sand', 'stone'];
  var kinds = ['wood'];
  if (n >= 4) kinds.push('ice');
  if (n >= 9) kinds.push('sand');
  if (n >= 14) kinds.push('stone');

  var b = 44;
  var bx = 1180 + Math.floor(r() * 160);
  var floors = 1 + Math.min(3, Math.floor(n / 9) + (n > 3 ? 1 : 0));
  var f, mat, half, y, i, cols;

  for (f = 0; f < floors; f++) {
    mat = kinds[Math.floor(r() * kinds.length)];
    half = (f % 2 === 0) ? 96 : 76;
    var baseY = G.GROUND_Y;
    y = baseY - (f + 1) * b * 2 - f * b;

    cols = [[bx - half, y], [bx + half, y]];
    for (i = 0; i < cols.length; i++) {
      G.blocks.push(G.makeBlock(cols[i][0], cols[i][1] - b, b, b * 2, mat, false));
    }
    G.blocks.push(G.makeBlock(bx, y - b * 2 - b / 2, b * 4, b, (f === 0) ? 'wood' : kinds[0], false));

    if (r() > 0.35 || f === 0) {
      G.pigs.push(G.makePig(bx, y - b * 0.9, 21 + Math.floor(r() * 4)));
    }
  }

  if (n >= 3) G.pigs.push(G.makePig(bx - 150, G.GROUND_Y - 22, 23));
  if (n >= 6) G.pigs.push(G.makePig(bx + 170, G.GROUND_Y - 22, 23));
  if (n >= 12) G.pigs.push(G.makePig(bx + 60, G.GROUND_Y - 22, 25));
  if (G.pigs.length === 0) G.pigs.push(G.makePig(bx, G.GROUND_Y - 24, 23));

  var birds = ['red', 'red'];
  if (n >= 2) birds.push('yellow');
  if (n >= 5) birds.push('blue');
  if (n >= 7) birds.push('black');
  if (n >= 11) birds.push('red');
  if (n >= 16) birds.push('black');
  var extra = Math.min(4, Math.floor(n / 6));
  for (i = 0; i < extra; i++) birds.push(birds[Math.floor(r() * birds.length)]);
  if (G.has('bag')) birds.push('red');

  return birds;
};

G.startLevel = function (n) {
  G.level = Math.max(1, Math.min(G.TOTAL_LEVELS, n | 0));
  G.state = 'play';
  G.score = 0;
  G.started = true;
  G.ended = false;
  G.winT = 0;
  G.loseT = 0;
  G.combo = 0;
  G.lastWin = null;
  G.parts = [];
  G.pops = [];
  G.extraFlyers = [];
  G.flying = null;

  var types = G.buildLevel(G.level) || ['red'];

  G.birdsLeft = [];
  var i;
  for (i = 1; i < types.length; i++) G.birdsLeft.push(G.makeBird(types[i], G.SLING_X - (i * 52), G.GROUND_Y - 24));

  G.active = G.makeBird(types[0], G.SLING_X, G.SLING_Y);
  G.active.state = 'ready';
  return G.level;
};

G.onWin = function (stars, coins) {
  G.lastWin = { stars: stars, coins: coins, score: G.score };
  var old = G.starsOf(G.level);
  if (stars > old) G.save.stars[G.level] = stars;
  if (G.level < G.TOTAL_LEVELS) G.save.unlocked = Math.max(G.save.unlocked, G.level + 1);
  G.save.unlocked = Math.max(G.save.unlocked, 1);
  G.save.coins += coins;
  G.store();
  G.checkAch();
};

G.load();

return G;
})();
