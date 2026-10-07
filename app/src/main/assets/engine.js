/* ============================================================
   ANGRY BIRDS — ядро: константы, прогресс, звук, уровни
   Экспорт: window.ABG
   ============================================================ */
window.ABG = (function () {
'use strict';
var G = {};

/* ---------- мир ---------- */
G.WORLD_W = 2400; G.WORLD_H = 720; G.GROUND_Y = 620;
G.SLING_X = 220; G.SLING_Y = 460;
G.MAX_PULL = 110; G.POWER = 7.2; G.GRAVITY = 1500;
G.TOTAL_LEVELS = 50;

/* ---------- материалы ---------- */
G.MAT = {
  wood:  { hp: 65,  fill: '#c98b3d', edge: '#8a5a22', dens: 1.0 },
  ice:   { hp: 35,  fill: '#b7e9fa', edge: '#74bcd8', dens: 0.7 },
  stone: { hp: 150, fill: '#c2c2c2', edge: '#828282', dens: 1.7 },
  sand:  { hp: 80,  fill: '#e6d296', edge: '#b8a261', dens: 1.2 }
};

/* ---------- птицы ---------- */
G.BIRDS = {
  red:    { r: 22, mass: 1.00, ability: 'none' },
  yellow: { r: 20, mass: 0.85, ability: 'boost' },
  blue:   { r: 17, mass: 0.70, ability: 'split' },
  black:  { r: 26, mass: 1.40, ability: 'bomb' }
};
G.BIRD = G.BIRDS;

/* ---------- магазин ---------- */
G.ITEMS = [
  { id: 'gloves',  ic: '🧤', t: 'Перчатки',    d: '+18% к силе натяжения',      p: 300 },
  { id: 'extra',   ic: '🐦', t: 'Запасная птица', d: '+1 птица на каждом уровне', p: 600 },
  { id: 'gift',    ic: '🎁', t: 'Корзина монет',  d: '+50 монет за уровень',      p: 450 },
  { id: 'glasses', ic: '👓', t: 'Прицел',      d: 'Длинный след траектории',   p: 250 },
  { id: 'lucky',   ic: '🍀', t: 'Клевер',      d: 'Монеты за уровень ×2',      p: 900 }
];

/* ---------- достижения ---------- */
G.ACH = [
  { id: 'lvl1',    n: 'Первый шаг',      d: 'Пройти 1 уровень' },
  { id: 'lvl5',    n: 'Разминка',        d: 'Пройти 5 уровней' },
  { id: 'lvl10',   n: 'Десятка',         d: 'Пройти 10 уровней' },
  { id: 'lvl25',   n: 'Половина пути',   d: 'Пройти 25 уровней' },
  { id: 'lvl50',   n: 'Покоритель',      d: 'Пройти все 50 уровней' },
  { id: 'stars15', n: 'Звёздный старт',  d: 'Собрать 15 звёзд' },
  { id: 'stars60', n: 'Сияние',          d: 'Собрать 60 звёзд' },
  { id: 'stars150',n: 'Небо в звёздах',  d: 'Собрать все 150 звёзд' },
  { id: 'kills10', n: 'Охотник',         d: 'Убрать 10 свиней' },
  { id: 'kills50', n: 'Гроза свиней',    d: 'Убрать 50 свиней' },
  { id: 'kills200',n: 'Легенда',         d: 'Убрать 200 свиней' },
  { id: 'perfect5',n: 'Безупречно',      d: '5 уровней на три звезды' },
  { id: 'coins500',n: 'Копилка',         d: 'Накопить 500 монет' },
  { id: 'coins2000',n:'Богач',           d: 'Накопить 2000 монет' },
  { id: 'bomb10',  n: 'Подрывник',       d: '10 раз применить бомбу' },
  { id: 'split30', n: 'Тройной удар',    d: '30 раз разделить синюю птицу' },
  { id: 'boost30', n: 'Ускоритель',      d: '30 раз ускорить жёлтую птицу' },
  { id: 'shop3',   n: 'Покупатель',      d: 'Купить 3 предмета' },
  { id: 'shopall', n: 'Всё своё',        d: 'Купить все предметы' },
  { id: 'noshot',  n: 'Тихий стрелок',   d: 'Убрать всех свиней одним выстрелом' }
];

/* ---------- состояние ---------- */
G.state = 'menu';
G.level = 1;
G.score = 0;
G.shots = 0;
G.combo = 0;
G.started = false;
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
G.drag = false;

/* ---------- прогресс ---------- */
var KEY = 'ab_save_v2';

function blank() {
  return { coins: 0, levels: {}, items: {}, ach: {}, kills: 0,
           sound: true, music: false, vibe: true, shots: 0, perfect: 0, bombs: 0, splits: 0, boosts: 0 };
}

G.save = blank();

G.load = function () {
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) {
      var o = JSON.parse(raw), k;
      for (k in o) if (Object.prototype.hasOwnProperty.call(o, k)) G.save[k] = o[k];
    }
  } catch (e) { /* пустое сохранение — ок */ }
  if (!G.save.levels || typeof G.save.levels !== 'object') G.save.levels = {};
  if (!G.save.items || typeof G.save.items !== 'object') G.save.items = {};
  if (!G.save.ach || typeof G.save.ach !== 'object') G.save.ach = {};
};

G.store = function () {
  try { localStorage.setItem(KEY, JSON.stringify(G.save)); } catch (e) { /* нет места — не страшно */ }
};

G.load();

G.has = function (id) { return !!G.save.items[id]; };

G.resetProgress = function () {
  var s = G.save;
  G.save = blank();
  G.save.sound = s.sound; G.save.music = s.music; G.save.vibe = s.vibe;
  G.store();
};

G.starsTotal = function () {
  var s = 0, i;
  for (i = 1; i <= G.TOTAL_LEVELS; i++) s += (G.save.levels[i] | 0);
  return s;
};

G.levelsDone = function () {
  var n = 0, i;
  for (i = 1; i <= G.TOTAL_LEVELS; i++) if (G.save.levels[i]) n++;
  return n;
};

G.perfectCount = function () {
  var n = 0, i;
  for (i = 1; i <= G.TOTAL_LEVELS; i++) if ((G.save.levels[i] | 0) >= 3) n++;
  return n;
};

G.maxUnlocked = function () {
  var m = 1, i;
  for (i = 1; i < G.TOTAL_LEVELS; i++) if (G.save.levels[i]) m = i + 1;
  if (G.save.levels[G.TOTAL_LEVELS]) m = G.TOTAL_LEVELS;
  return m;
};

G.achCount = function () {
  var n = 0, i;
  for (i = 0; i < G.ACH.length; i++) if (G.save.ach[G.ACH[i].id]) n++;
  return n;
};

G.giveAch = function (id) {
  if (G.save.ach[id]) return false;
  G.save.ach[id] = 1;
  G.save.coins += 200;
  G.store();
  if (G.SFX.star) G.SFX.star();
  if (G.pops) G.pops.push({ x: G.SLING_X + 300, y: 200, txt: 'Достижение! +200', t: 1.8 });
  return true;
};

G.buy = function (id) {
  var it = null, i;
  for (i = 0; i < G.ITEMS.length; i++) if (G.ITEMS[i].id === id) it = G.ITEMS[i];
  if (!it || G.has(id)) return 'owned';
  if (G.save.coins < it.p) return 'money';
  G.save.coins -= it.p;
  G.save.items[id] = 1;
  G.store();
  if (G.achCount() >= 3) G.giveAch('shop3');
  var all = true;
  for (i = 0; i < G.ITEMS.length; i++) if (!G.save.items[G.ITEMS[i].id]) all = false;
  if (all) G.giveAch('shopall');
  return 'ok';
};

/* ---------- звук ---------- */
var actx = null, musicTimer = null, musicStep = 0;

G.ac = function () {
  try {
    if (!actx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) actx = new AC();
    }
    if (actx && actx.state === 'suspended') actx.resume();
  } catch (e) { actx = null; }
  return actx;
};

function tone(freq, dur, type, vol) {
  var c = G.ac();
  if (!c) return;
  try {
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    var t = c.currentTime, v = vol || 0.05;
    o.connect(g); g.connect(c.destination);
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch (e) { /* звук не критичен */ }
}

function melody(notes, gap, type, vol) {
  for (var i = 0; i < notes.length; i++) {
    (function (f, k) {
      setTimeout(function () { tone(f, 0.2, type, vol); }, k * gap);
    })(notes[i], i);
  }
}

G.SFX = {
  click: function () { if (G.save.sound) tone(520, 0.07, 'square', 0.05); },
  pull:  function () { if (G.save.sound) tone(170, 0.12, 'sine', 0.04); },
  launch:function () { if (G.save.sound) tone(320, 0.14, 'sawtooth', 0.05); },
  hit:   function () { if (G.save.sound) tone(110, 0.09, 'square', 0.05); },
  crack: function () { if (G.save.sound) tone(95, 0.16, 'sawtooth', 0.05); },
  pig:   function () { if (G.save.sound) { tone(720, 0.12, 'square', 0.06); setTimeout(function () { tone(480, 0.12, 'square', 0.05); }, 80); } },
  star:  function () { if (G.save.sound) { tone(880, 0.1, 'sine', 0.06); setTimeout(function () { tone(1320, 0.16, 'sine', 0.06); }, 100); } },
  win:   function () { if (G.save.sound) melody([523, 659, 784, 1047], 130, 'sine', 0.07); },
  lose:  function () { if (G.save.sound) melody([392, 330, 262], 170, 'sawtooth', 0.06); }
};

G.musicStart = function () {
  if (musicTimer || !G.save.music) return;
  if (!G.ac()) return;
  var seq = [392, 494, 587, 494, 440, 523, 659, 523];
  musicStep = 0;
  musicTimer = setInterval(function () {
    if (!G.save.music) { G.musicStop(); return; }
    tone(seq[musicStep % seq.length], 0.3, 'triangle', 0.03);
    musicStep++;
  }, 340);
};

G.musicStop = function () {
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
};

G.vibe = function (ms) {
  if (!G.save.vibe) return;
  try { if (navigator.vibrate) navigator.vibrate(ms || 20); } catch (e) { /* нет вибро */ }
};

/* ---------- тела ---------- */
G.makeBlock = function (x, y, w, h, m, stat) {
  var mat = G.MAT[m] || G.MAT.wood;
  return { x: x, y: y, w: w, h: h, vx: 0, vy: 0, m: m || 'wood', static: !!stat,
           hp: mat.hp, max: mat.hp, dead: false, rest: 0, mass: mat.dens * (w * h) / 1000 };
};

G.makePig = function (x, y, r) {
  r = r || 22;
  var hp = Math.round(45 + r * 2.6);
  return { x: x, y: y, r: r, vx: 0, vy: 0, hp: hp, max: hp, dead: false, rest: 0, mass: r / 20 };
};

G.makeBird = function (type, x, y) {
  var b = G.BIRDS[type] || G.BIRDS.red;
  return { type: type in G.BIRDS ? type : 'red', x: x, y: y, vx: 0, vy: 0,
           r: b.r, mass: b.mass, state: 'ready', used: false, still: 0 };
};

/* ---------- уровни ---------- */
function pickBird(n, i) {
  if (n > 24 && i % 4 === 3) return 'black';
  if (n > 14 && i % 3 === 2) return 'blue';
  if (n > 6 && i % 3 === 1) return 'yellow';
  return 'red';
}

G.buildLevel = function (n) {
  var lv = n - 1, gy = G.GROUND_Y;
  var blocks = [], pigs = [], birds = [];
  var tier = Math.min(2, Math.floor(lv / 18));
  var soft = ['wood', 'sand', 'wood'][tier];
  var hard = ['wood', 'wood', 'stone'][tier];
  var vsoft = ['ice', 'ice', 'ice'][tier];
  var x0 = G.SLING_X + 640;
  var kind = lv % 5;
  var birdCount = Math.max(2, 4 - Math.floor(lv / 15));
  var pigCount = 1 + Math.floor(lv / 9);
  var i;

  function box(cx, cy, w, h, m) { blocks.push({ x: cx, y: cy, w: w, h: h, m: m }); }
  function pig(cx, cy, r) { pigs.push({ x: cx, y: cy, r: r || 22 }); }
  function frame(x, span, h, m) {
    box(x, gy - h / 2, 24, h, m);
    box(x + span, gy - h / 2, 24, h, m);
    box(x + span / 2, gy - h - 12, span + 40, 24, m);
  }

  if (kind === 0) {
    frame(x0, 150, 130, soft);
    pig(x0 + 75, gy - 26);
    if (pigCount > 1) pig(x0 + 75, gy - 168, 20);
    if (pigCount > 2) { frame(x0 + 230, 130, 150, hard); pig(x0 + 295, gy - 26); }
  } else if (kind === 1) {
    var y = gy, w = 210, lvl;
    for (lvl = 0; lvl < 3; lvl++) {
      box(x0 + 105 + lvl * 18, y - 12, w, 24, lvl === 2 ? hard : soft);
      y -= 24;
      box(x0 + 105 + lvl * 18, y - 34, 22, 68, vsoft);
      y -= 68;
      if (lvl < 2) pig(x0 + 60 + lvl * 90, gy - 30, 20);
    }
    pig(x0 + 105, y - 26);
    if (pigCount > 2) pig(x0 + 180, gy - 26);
  } else if (kind === 2) {
    frame(x0, 170, 140, soft);
    frame(x0 + 210, 170, 140, soft);
    box(x0 + 200, gy - 152, 260, 24, hard);
    pig(x0 + 85, gy - 26);
    pig(x0 + 295, gy - 26);
    if (pigCount > 2) pig(x0 + 190, gy - 176, 20);
  } else if (kind === 3) {
    box(x0, gy - 70, 26, 140, hard);
    box(x0 + 120, gy - 70, 26, 140, hard);
    box(x0 + 60, gy - 152, 160, 24, soft);
    box(x0 + 60, gy - 182, 26, 60, vsoft);
    pig(x0 + 60, gy - 26);
    pig(x0 + 190, gy - 26);
    if (pigCount > 2) pig(x0 + 60, gy - 220, 20);
  } else {
    frame(x0, 190, 120, hard);
    frame(x0 + 40, 110, 210, soft);
    pig(x0 + 95, gy - 26);
    pig(x0 + 240, gy - 26);
    if (pigCount > 2) pig(x0 + 240, gy - 250, 20);
  }

  /* усиление на высоких уровнях */
  if (lv > 30) {
    box(x0 - 90, gy - 60, 26, 120, 'stone');
    pig(x0 - 90, gy - 140, 20);
  }

  /* страховка: свинья и птицы обязаны быть */
  if (!pigs.length) pig(x0 + 80, gy - 24);
  for (i = 0; i < birdCount; i++) birds.push(pickBird(n, i));
  if (G.has && G.has('extra')) birds.push('red');

  return { blocks: blocks, pigs: pigs, birds: birds };
};

/* ---------- старт уровня ---------- */
G.spawnActive = function () {
  if (!G.birdsLeft.length) { G.active = null; return false; }
  var t = G.birdsLeft.shift();
  G.active = G.makeBird(t, G.SLING_X, G.SLING_Y);
  return true;
};

G.startLevel = function (n) {
  n = Math.max(1, Math.min(G.TOTAL_LEVELS, n | 0));
  var L = G.buildLevel(n), i;

  G.level = n;
  G.score = 0;
  G.shots = 0;
  G.combo = 0;
  G.state = 'play';
  G.started = true;
  G.ended = false;
  G.winT = 0;
  G.loseT = 0;
  G.lastWin = null;
  G.drag = false;

  G.blocks = []; G.pigs = []; G.parts = []; G.pops = [];
  G.extraFlyers = []; G.birdsLeft = [];
  G.flying = null; G.active = null;

  for (i = 0; i < L.blocks.length; i++) {
    var d = L.blocks[i];
    G.blocks.push(G.makeBlock(d.x, d.y, d.w, d.h, d.m, false));
  }
  for (i = 0; i < L.pigs.length; i++) {
    var p = L.pigs[i];
    G.pigs.push(G.makePig(p.x, p.y, p.r));
  }
  G.birdsLeft = L.birds.slice(0);
  G.spawnActive();

  if (!G.blocks.length) {
    G.blocks.push(G.makeBlock(G.SLING_X + 700, G.GROUND_Y - 40, 30, 80, 'wood', false));
  }
  if (!G.pigs.length) G.pigs.push(G.makePig(G.SLING_X + 760, G.GROUND_Y - 24, 22));
  if (!G.active) G.active = G.makeBird('red', G.SLING_X, G.SLING_Y);

  return L;
};

return G;
})();
