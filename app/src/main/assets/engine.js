/* ============================================================
   ANGRY BIRDS — ядро: мир, материалы, птицы, магазин,
   достижения, прогресс, звук, генератор 50 уровней.
   Экспорт: window.ABG
   ============================================================ */
window.ABG = (function () {
'use strict';
var G = {};

/* ---------------- мир ---------------- */
G.WORLD_W = 2100;
G.WORLD_H = 700;
G.GROUND_Y = 600;
G.SLING_X = 200;
G.SLING_Y = 452;
G.MAX_PULL = 115;
G.POWER = 7.3;
G.GRAVITY = 1400;
G.TOTAL_LEVELS = 50;

/* ---------------- материалы ---------------- */
G.MAT = {
  wood:  { hp: 70,  dens: 1.0, name: 'Дерево' },
  ice:   { hp: 42,  dens: 0.7, name: 'Лёд' },
  stone: { hp: 140, dens: 1.7, name: 'Камень' },
  sand:  { hp: 95,  dens: 1.3, name: 'Песчаник' }
};

/* ---------------- птицы ---------------- */
G.BIRDS = {
  red:    { r: 22, mass: 1.00, ability: 'none',  power: 1.00, name: 'Рэд' },
  yellow: { r: 20, mass: 0.85, ability: 'boost', power: 1.05, name: 'Чак' },
  blue:   { r: 17, mass: 0.70, ability: 'split', power: 0.95, name: 'Блю' },
  black:  { r: 25, mass: 1.35, ability: 'bomb',  power: 1.10, name: 'Бомб' }
};
G.BIRD = G.BIRDS;

/* ---------------- магазин ---------------- */
G.ITEMS = [
  { id: 'gloves',  name: 'Перчатки',  desc: 'Сила натяжения +18%', price: 300 },
  { id: 'goggles', name: 'Очки',      desc: 'Длинная линия прицела', price: 350 },
  { id: 'helmet',  name: 'Каска',     desc: 'Птицы крепче на 20%', price: 450 },
  { id: 'boots',   name: 'Сапоги',    desc: 'Разгон птиц +10%', price: 600 },
  { id: 'bag',     name: 'Мешок',     desc: '+1 птица на каждый уровень', price: 900 }
];

/* ---------------- достижения ---------------- */
G.ACH = [
  { id: 'shot1',   name: 'Первый выстрел',  desc: 'Запусти птицу из рогатки' },
  { id: 'win1',    name: 'Первая победа',   desc: 'Пройди один уровень' },
  { id: 'win10',   name: 'Десятка',         desc: 'Пройди 10 уровней' },
  { id: 'win25',   name: 'Половина пути',   desc: 'Пройди 25 уровней' },
  { id: 'win50',   name: 'Все уровни',      desc: 'Пройди все 50 уровней' },
  { id: 'three1',  name: 'Три звезды',      desc: 'Получи 3 звезды на уровне' },
  { id: 'three10', name: 'Идеалист',        desc: '10 уровней на три звезды' },
  { id: 'three25', name: 'Перфекционист',   desc: '25 уровней на три звезды' },
  { id: 'star30',  name: '30 звёзд',        desc: 'Собери 30 звёзд' },
  { id: 'star75',  name: '75 звёзд',        desc: 'Собери 75 звёзд' },
  { id: 'star150', name: 'Все звёзды',      desc: 'Собери все 150 звёзд' },
  { id: 'pig50',   name: 'Охотник',         desc: 'Снеси 50 свиней' },
  { id: 'pig200',  name: 'Гроза свиней',    desc: 'Снеси 200 свиней' },
  { id: 'blk500',  name: 'Разрушитель',     desc: 'Разбей 500 блоков' },
  { id: 'bomb10',  name: 'Подрывник',       desc: 'Взорви 10 чёрных птиц' },
  { id: 'onebird', name: 'Одной птицей',    desc: 'Пройди уровень одной птицей' },
  { id: 'rich',    name: 'Богач',           desc: 'Накопи 1000 монет' },
  { id: 'buyall',  name: 'Коллекционер',    desc: 'Купи всё в магазине' },
  { id: 'score50', name: 'Мастер',          desc: 'Набери 50 000 очков всего' },
  { id: 'nice',    name: 'Красиво!',        desc: 'Снеси свинью прямо в полёте' }
];

/* ---------------- состояние ---------------- */
G.state = 'menu';
G.level = 1;
G.score = 0;
G.blocks = []; G.pigs = []; G.parts = []; G.pops = []; G.extraFlyers = [];
G.birdsLeft = []; G.active = null; G.flying = null;
G.started = false; G.ended = false; G.winT = 0; G.loseT = 0; G.combo = 0;
G.lastWin = null;
G.shots = 0;
G.stats = { shots: 0, kills: 0, breaks: 0, total: 0, bombs: 0, cleanWins: 0, noAbilityWins: 0 };

/* ---------------- прогресс ---------------- */
var KEY = 'ab_save_v3';
function def() {
  return { coins: 0, stars: {}, items: [], ach: [], unlocked: 1,
           sound: true, music: true, vibe: true };
}
G.save = (function () {
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) {
      var o = JSON.parse(raw), d = def(), k;
      for (k in d) if (!(k in o)) o[k] = d[k];
      if (!o.stars || typeof o.stars !== 'object') o.stars = {};
      if (!o.items || !o.items.length) o.items = o.items || [];
      return o;
    }
  } catch (e) { /* испорченное сохранение — начинаем заново */ }
  return def();
})();

G.store = function () {
  try { localStorage.setItem(KEY, JSON.stringify(G.save)); } catch (e) { }
};
G.resetProgress = function () { G.save = def(); G.store(); };
G.has = function (id) { return G.save.items.indexOf(id) >= 0; };
G.buy = function (id) {
  var it = null, i;
  for (i = 0; i < G.ITEMS.length; i++) if (G.ITEMS[i].id === id) it = G.ITEMS[i];
  if (!it || G.has(id) || G.save.coins < it.price) return false;
  G.save.coins -= it.price;
  G.save.items.push(id);
  G.store();
  G.checkAch();
  return true;
};
G.starsOf = function (n) { return G.save.stars[n] || 0; };
G.starsTotal = function () {
  var s = 0, k;
  for (k in G.save.stars) if (G.save.stars.hasOwnProperty(k)) s += G.save.stars[k];
  return s;
};
G.levelsDone = function () {
  var n = 0, k;
  for (k in G.save.stars) if (G.save.stars.hasOwnProperty(k) && G.save.stars[k] > 0) n++;
  return n;
};
G.threeStars = function () {
  var n = 0, k;
  for (k in G.save.stars) if (G.save.stars[k] === 3) n++;
  return n;
};
G.maxUnlocked = function () { return Math.min(G.TOTAL_LEVELS, G.save.unlocked || 1); };
G.achDone = function (id) { return G.save.ach.indexOf(id) >= 0; };
G.achCount = function () { return G.save.ach.length; };
G.unlockAch = function (id) {
  if (G.achDone(id)) return;
  G.save.ach.push(id);
  G.store();
  if (G.SFX.coin) G.SFX.coin();
};

G.checkAch = function () {
  var a = G.ACH, i;
  var done = G.levelsDone(), stars = G.starsTotal(), st = G.stats;
  function lit(id, cond) { if (cond) G.unlockAch(id); }
  lit('shot1',   st.shots >= 1);
  lit('win1',    done >= 1);
  lit('win10',   done >= 10);
  lit('win25',   done >= 25);
  lit('win50',   done >= 50);
  lit('three1',  G.threeStars() >= 1);
  lit('three10', G.threeStars() >= 10);
  lit('three25', G.threeStars() >= 25);
  lit('star30',  stars >= 30);
  lit('star75',  stars >= 75);
  lit('star150', stars >= 150);
  lit('pig50',   st.kills >= 50);
  lit('pig200',  st.kills >= 200);
  lit('blk500',  st.breaks >= 500);
  lit('bomb10',  st.bombs >= 10);
  lit('onebird', st.cleanWins >= 1);
  lit('rich',    G.save.coins >= 1000);
  lit('buyall',  G.save.items.length >= G.ITEMS.length);
  lit('score50', st.total >= 50000);
  if (a.length !== 20 && G.save.ach.length > 20) G.save.ach.length = 20;
};

/* ---------------- звук ---------------- */
var actx = null, musicTimer = null, mi = 0;
var MEL = [262, 330, 392, 330, 294, 349, 440, 349];

G.ac = function () {
  if (!actx) {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) actx = new AC();
    } catch (e) { actx = null; }
  }
  try {
    if (actx && actx.state === 'suspended') actx.resume();
  } catch (e) { }
  return actx;
};

function tone(freq, dur, type, vol, to, force) {
  if (!force && !G.save.sound) return;
  var a = G.ac();
  if (!a) return;
  try {
    var o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, a.currentTime);
    if (to) o.frequency.exponentialRampToValueAtTime(Math.max(30, to), a.currentTime + dur);
    g.gain.setValueAtTime(Math.max(0.001, vol || 0.14), a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0008, a.currentTime + dur);
    o.connect(g); g.connect(a.destination);
    o.start();
    o.stop(a.currentTime + dur + 0.03);
  } catch (e) { }
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
    g.gain.value = vol || 0.25;
    src.connect(g); g.connect(a.destination);
    src.start();
  } catch (e) { }
}

G.SFX = {
  click: function () { tone(660, 0.06, 'square', 0.06); },
  pull:  function () { tone(180, 0.1, 'sawtooth', 0.05, 320); },
  hit:   function () { tone(150, 0.12, 'square', 0.1, 70); },
  boom:  function () { noise(0.5, 0.34); tone(90, 0.4, 'sawtooth', 0.16, 35); },
  pig:   function () { tone(520, 0.09, 'square', 0.11, 300); setTimeout(function () { tone(330, 0.1, 'square', 0.09, 200); }, 70); },
  boost: function () { tone(400, 0.22, 'sawtooth', 0.12, 1200); },
  split: function () { tone(700, 0.1, 'triangle', 0.09, 1100); setTimeout(function () { tone(900, 0.1, 'triangle', 0.07, 1300); }, 60); },
  coin:  function () { tone(880, 0.08, 'square', 0.08); setTimeout(function () { tone(1320, 0.12, 'square', 0.07); }, 70); },
  win:   function () {
    tone(523, 0.14, 'triangle', 0.12);
    setTimeout(function () { tone(659, 0.14, 'triangle', 0.12); }, 130);
    setTimeout(function () { tone(784, 0.26, 'triangle', 0.13); }, 260);
  },
  lose:  function () {
    tone(300, 0.22, 'triangle', 0.11, 180);
    setTimeout(function () { tone(200, 0.34, 'triangle', 0.1, 110); }, 200);
  }
};

G.musicStart = function () {
  if (!G.save.music || musicTimer) return;
  if (!G.ac()) return;
  musicTimer = setInterval(function () {
    if (!G.save.music) { G.musicStop(); return; }
    var f = MEL[mi % MEL.length];
    mi++;
    tone(f, 0.3, 'triangle', 0.05, 0, true);
    if (mi % 4 === 0) tone(f / 2, 0.5, 'sine', 0.04, 0, true);
  }, 430);
};
G.musicStop = function () {
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
};

G.vibe = function (ms) {
  if (!G.save.vibe || !navigator.vibrate) return;
  try { navigator.vibrate(ms); } catch (e) { }
};

/* ---------------- уровни ---------------- */
function mulberry(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function house(bx, mat, floors, blocks, pigs, r) {
  var y0 = G.GROUND_Y, w = 28, h = 62, i;
  blocks.push({ x: bx - 40, y: y0 - h / 2, w: w, h: h, m: mat });
  blocks.push({ x: bx + 40, y: y0 - h / 2, w: w, h: h, m: mat });
  pigs.push({ x: bx, y: y0 - 26, r: 24 });
  for (i = 1; i < floors; i++) {
    var top = y0 - h * i - 16;
    blocks.push({ x: bx, y: top + 8, w: 124, h: 16, m: mat });
    blocks.push({ x: bx - 40, y: top - h / 2, w: w, h: h, m: mat });
    blocks.push({ x: bx + 40, y: top - h / 2, w: w, h: h, m: mat });
    if (r() > 0.35) pigs.push({ x: bx, y: top - 26, r: 22 });
  }
  if (r() > 0.6) blocks.push({ x: bx, y: y0 - h * floors - 24, w: 96, h: 18, m: mat });
}

G.LEVELS = (function () {
  var out = [], n, i, t;
  for (n = 1; n <= G.TOTAL_LEVELS; n++) {
    var r = mulberry(n * 7919 + 13);
    var phase = Math.floor((n - 1) / 10);
    var towers = 1 + phase + (r() > 0.65 ? 1 : 0);
    var pool = ['wood', 'ice', 'sand', 'stone'];
    var blocks = [], pigs = [], birds = [];
    var bx = 1220;

    for (t = 0; t < towers; t++) {
      var mat = pool[Math.min(3, Math.floor(r() * (2 + phase)))];
      var floors = 2 + Math.floor(r() * 2) + (phase > 2 ? 1 : 0);
      house(bx, mat, floors, blocks, pigs, r);
      bx += 210 + r() * 70;
    }

    var kinds = ['red'];
    if (n >= 4) kinds.push('yellow');
    if (n >= 8) kinds.push('blue');
    if (n >= 14) kinds.push('black');
    var nb = 3 + Math.floor(r() * 2) + (phase > 3 ? 1 : 0);
    for (i = 0; i < nb; i++) birds.push(kinds[Math.floor(r() * kinds.length)]);

    out.push({ blocks: blocks, pigs: pigs, birds: birds });
  }
  return out;
})();

/* ---------------- старт уровня ---------------- */
G.startLevel = function (n) {
  n = Math.max(1, Math.min(G.TOTAL_LEVELS, Math.floor(n) || 1));
  G.level = n;
  G.score = 0;
  G.blocks = [];
  G.pigs = [];
  G.parts = [];
  G.pops = [];
  G.extraFlyers = [];
  G.flying = null;
  G.active = null;
  G.ended = false;
  G.winT = 0;
  G.loseT = 0;
  G.combo = 0;
  G.shots = 0;
  G.lastWin = null;

  var L = G.LEVELS[n - 1], i, b, p, M;
  for (i = 0; i < L.blocks.length; i++) {
    b = L.blocks[i];
    M = G.MAT[b.m] || G.MAT.wood;
    G.blocks.push({
      x: b.x, y: b.y, w: b.w, h: b.h, m: b.m,
      vx: 0, vy: 0, hp: M.hp, max: M.hp, dead: false, hold: 0
    });
  }
  for (i = 0; i < L.pigs.length; i++) {
    p = L.pigs[i];
    var hp = Math.round(45 + p.r * 2.4);
    G.pigs.push({ x: p.x, y: p.y, r: p.r, vx: 0, vy: 0, hp: hp, max: hp, dead: false, hold: 0 });
  }
  if (!G.pigs.length) G.pigs.push({ x: 1300, y: G.GROUND_Y - 26, r: 24, vx: 0, vy: 0, hp: 100, max: 100, dead: false, hold: 0 });

  G.birdsLeft = L.birds.slice();
  if (G.has('bag')) G.birdsLeft.push('red');
  if (!G.birdsLeft.length) G.birdsLeft.push('red');

  G.started = true;
  G.state = 'play';
  if (G.nextBird) G.nextBird();
};

/* прибавка монет/звёзд за победу */
G.finishLevel = function () {
  var alive = G.alivePigs ? G.alivePigs() : 0;
  if (alive > 0) return;

  var left = G.birdsLeft.length + (G.active ? 1 : 0);
  var stars = left >= 2 ? 3 : (left === 1 ? 2 : 1);

  var old = G.save.stars[G.level] || 0;
  if (stars > old) G.save.stars[G.level] = stars;

  var base = stars === 3 ? 300 : (stars === 2 ? 200 : 120);
  coins = base;
  G.save.coins += coins;

  if (G.level + 1 > G.save.unlocked && G.level < G.TOTAL_LEVELS) {
    G.save.unlocked = G.level + 1;
  }
  G.stats.total += G.score;
  if (left >= 2) G.stats.cleanWins++;
  G.store();
  G.checkAch();

  G.lastWin = { stars: stars, coins: coins, score: G.score };
  return G.lastWin;
};

/* очки и монеты */
var coins = 0;
G.addScore = function (v) {
  G.score += v;
  G.pops.push({
    x: 0, y: 0, t: 1, text: '+' + v,
    color: v >= 1000 ? '#ff6b5e' : '#ffd34d'
  });
  return G.score;
};

return G;
})();
