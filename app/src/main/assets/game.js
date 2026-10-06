/* ============================================================
   ANGRY BIRDS — движок игры
   Canvas 2D + собственная физика. Без внешних библиотек.
   Полный файл: состояние, уровни, физика, рендер, ввод, меню.
   ============================================================ */
(function () {
'use strict';

/* ---------------------- утилиты ---------------------- */
function $(s) { return document.querySelector(s); }
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function rnd(a, b) { return a + Math.random() * (b - a); }

/* ---------------------- константы ---------------------- */
var SAVE_KEY = 'ab_save_v1';
var WORLD_W = 2600;
var WORLD_H = 800;
var GROUND_Y = 720;
var SLING_X = 235;
var SLING_Y = GROUND_Y - 205;
var MAX_PULL = 135;
var POWER = 11;
var GRAVITY = 1500;
var AIR = 0.9994;
var TOTAL_LEVELS = 50;

/* ---------------------- сохранение ---------------------- */
var DEF = {
  levels: {}, coins: 0, items: {}, ach: {}, kills: 0, shots: 0,
  perfect: 0, spent: 0, sound: true, music: true, vibe: true
};
var save = loadSave();

function loadSave() {
  var s = null;
  try { s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { s = null; }
  if (!s || typeof s !== 'object') s = {};
  for (var k in DEF) {
    if (!(k in s)) {
      s[k] = (DEF[k] && typeof DEF[k] === 'object') ? JSON.parse(JSON.stringify(DEF[k])) : DEF[k];
    }
  }
  if (!s.levels) s.levels = {};
  if (!s.items) s.items = {};
  if (!s.ach) s.ach = {};
  return s;
}
function store() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
function starsTotal() { var t = 0, k; for (k in save.levels) t += save.levels[k] | 0; return t; }
function levelsDone() { var c = 0, k; for (k in save.levels) if ((save.levels[k] | 0) > 0) c++; return c; }
function maxUnlocked() {
  var m = 1, k;
  for (k in save.levels) {
    var n = parseInt(k, 10);
    if ((save.levels[k] | 0) > 0 && n + 1 > m) m = n + 1;
  }
  return clamp(m, 1, TOTAL_LEVELS);
}

/* ---------------------- звук ---------------------- */
var actx = null;
function ac() {
  if (!actx) {
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; }
  }
  if (actx && actx.state === 'suspended') { try { actx.resume(); } catch (e) {} }
  return actx;
}
function tone(freq, dur, type, vol, slideTo) {
  if (!save.sound) return;
  var c = ac(); if (!c) return;
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
var SFX = {
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
function vibe(ms) {
  try { if (save.vibe && navigator.vibrate) navigator.vibrate(ms); } catch (e) {}
}
var musicTimer = null, musicStep = 0;
var MUSIC = [220, 277, 330, 392, 330, 277, 247, 294];
function musicStart() {
  if (!save.music || musicTimer) return;
  var c = ac(); if (!c) return;
  musicTimer = setInterval(function () {
    if (!save.music || !actx) return;
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
}
function musicStop() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } }

/* ---------------------- материалы и уровни ---------------------- */
var MAT = {
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
function pigsFor(n) { return clamp(1 + Math.floor(n / 8), 1, 7); }
function birdsFor(n) { return clamp(3 + Math.floor(n / 10), 3, 7); }

function buildLevel(n) {
  var blocks = [], slots = [];
  var kind = ['tower', 'house', 'pyramid', 'bridge', 'double', 'castle'][(n - 1) % 6];
  var floors = clamp(2 + Math.floor(n / 12), 2, 5);
  var cx = 1230;
  var colW = 26, colH = 76, beamH = 22, span = 132;

  function addB(x, y, w, h, m) {
    blocks.push({
      x: x, y: y, w: w, h: h, m: m, hp: MAT[m].hp, max: MAT[m].hp,
      vx: 0, vy: 0, dead: false, mass: Math.max(0.7, w * h / 1400), rot: 0
    });
  }
  function addSlot(x, y) { slots.push({ x: x, y: y }); }

  var f, yBase, yTop, by, i;

  if (kind === 'tower') {
    for (f = 0; f < floors; f++) {
      yBase = GROUND_Y - f * (colH + beamH);
      yTop = yBase - colH / 2;
      addB(cx - span / 2 + colW / 2, yTop, colW, colH, matFor(n));
      addB(cx + span / 2 - colW / 2, yTop, colW, colH, matFor(n));
      by = yBase - colH - beamH / 2;
      addB(cx, by, span + colW, beamH, matFor(n));
      addSlot(cx, yBase - colH - beamH - 26);
    }
    addSlot(cx, GROUND_Y - 30);
  } else if (kind === 'house') {
    for (f = 0; f < floors; f++) {
      yBase = GROUND_Y - f * (colH + beamH);
      addB(cx - 78, yBase - colH / 2, 30, colH, matFor(n));
      addB(cx + 78, yBase - colH / 2, 30, colH, matFor(n));
      addB(cx, yBase - colH - beamH / 2, 200, beamH, matFor(n));
      addSlot(cx, yBase - colH + 4);
    }
    addSlot(cx, GROUND_Y - 30);
  } else if (kind === 'pyramid') {
    var rows = clamp(2 + Math.floor(n / 14), 2, 4);
    var cube = 40;
    for (f = 0; f < rows; f++) {
      var count = rows - f + 1;
      for (i = 0; i < count; i++) {
        var bx = cx + (i - (count - 1) / 2) * (cube + 4);
        addB(bx, GROUND_Y - cube / 2 - f * (cube + 4), cube, cube, matFor(n));
      }
      addSlot(cx, GROUND_Y - cube * (f + 1) - 4 * f - 26);
    }
  } else if (kind === 'bridge') {
    addB(cx - 130, GROUND_Y - colH / 2, colW, colH, matFor(n));
    addB(cx, GROUND_Y - colH / 2, colW, colH, matFor(n));
    addB(cx + 130, GROUND_Y - colH / 2, colW, colH, matFor(n));
    addB(cx, GROUND_Y - colH - beamH / 2, 320, beamH, matFor(n));
    addSlot(cx - 65, GROUND_Y - colH - beamH - 26);
    addSlot(cx + 65, GROUND_Y - colH - beamH - 26);
    addSlot(cx, GROUND_Y - 30);
    for (f = 1; f < floors; f++) {
      yBase = GROUND_Y - colH - beamH;
      addB(cx - 60, yBase - colH / 2, colW, colH, matFor(n));
      addB(cx + 60, yBase - colH / 2, colW, colH, matFor(n));
      addB(cx, yBase - colH - beamH / 2, 150, beamH, matFor(n));
      addSlot(cx, yBase - colH + 4);
    }
  } else if (kind === 'double') {
    var towers = [cx - 150, cx + 150];
    for (i = 0; i < 2; i++) {
      for (f = 0; f < floors; f++) {
        yBase = GROUND_Y - f * (colH + beamH);
        addB(towers[i] - 40, yBase - colH / 2, colW, colH, matFor(n));
        addB(towers[i] + 40, yBase - colH / 2, colW, colH, matFor(n));
        addB(towers[i], yBase - colH - beamH / 2, 106, beamH, matFor(n));
        addSlot(towers[i], yBase - colH + 4);
      }
    }
    addB(cx, GROUND_Y - floors * (colH + beamH) - beamH / 2, 300, beamH, matFor(n));
    addSlot(cx, GROUND_Y - 30);
  } else {
    var side = [cx - 190, cx + 190];
    for (i = 0; i < 2; i++) {
      for (f = 0; f < floors + 1; f++) {
        yBase = GROUND_Y - f * (colH + beamH);
        addB(side[i] - 45, yBase - colH / 2, 30, colH, matFor(n));
        addB(side[i] + 45, yBase - colH / 2, 30, colH, matFor(n));
        addB(side[i], yBase - colH - beamH / 2, 120, beamH, matFor(n));
      }
      addSlot(side[i], GROUND_Y - colH - beamH - 26);
    }
    for (f = 0; f < floors; f++) {
      yBase = GROUND_Y - f * (colH + beamH);
      addB(cx - 60, yBase - colH / 2, 26, colH, matFor(n));
      addB(cx + 60, yBase - colH / 2, 26, colH, matFor(n));
      addB(cx, yBase - colH - beamH / 2, 146, beamH, matFor(n));
      addSlot(cx, yBase - colH + 4);
    }
  }

  var need = pigsFor(n), pigs = [];
  for (i = 0; i < need; i++) {
    var s = slots.length ? slots[i % slots.length] : { x: cx, y: GROUND_Y - 30 };
    var jitter = slots.length ? (i - (i % slots.length)) / slots.length * 26 : i * 40;
    pigs.push({
      x: clamp(s.x + rnd(-5, 5) + jitter, 900, WORLD_W - 120),
      y: s.y, r: 26, hp: 50, max: 50, vx: 0, vy: 0, dead: false, mass: 2.2
    });
  }
  return { blocks: blocks, pigs: pigs, kind: kind };
}

function birdList(n) {
  var list = [], i, count = birdsFor(n);
  for (i = 0; i < count; i++) list.push('red');
  if (save.items.blue) list.push('blue');
  if (save.items.bomb) list.push('black');
  if (save.items.golden) list.push('yellow');
  if (save.items.extra) list.push('red');
  return list;
}

/* ---------------------- состояние игры ---------------------- */
var cv = null, ctx = null, scale = 1, viewW = 0;
var state = 'menu';
var level = 1, score = 0, birdsLeft = [], active = null, flying = null;
var blocks = [], pigs = [], parts = [], pops = [];
var cam = { x: 0, target: 0 };
var dragging = false, dragPos = { x: 0, y: 0 }, usedPower = false;
var shotsFired = 0, pigsAtStart = 0, baseScore = 1, killsThisLevel = 0, combo = 0;
var winTimer = 0, loseTimer = 0, clouds = [], skyPhase = 0;

/* ---------------------- физика ---------------------- */
function bodies() {
  var arr = [], i;
  for (i = 0; i < blocks.length; i++) if (!blocks[i].dead) arr.push(blocks[i]);
  for (i = 0; i < pigs.length; i++) if (!pigs[i].dead) arr.push(pigs[i]);
  if (flying && flying.state === 'fly') arr.push(flying);
  return arr;
}

function integrate(h) {
  var i, b;
  for (i = 0; i < blocks.length; i++) {
    b = blocks[i]; if (b.dead) continue;
    b.vy += GRAVITY * h;
    b.x += b.vx * h; b.y += b.vy * h;
    b.vx *= 0.999; b.vy *= 0.999;
  }
  for (i = 0; i < pigs.length; i++) {
    b = pigs[i]; if (b.dead) continue;
    b.vy += GRAVITY * h;
    b.x += b.vx * h; b.y += b.vy * h;
    b.vx *= 0.999; b.vy *= 0.999;
  }
  if (flying && flying.state === 'fly') {
    flying.vy += GRAVITY * h;
    flying.x += flying.vx * h; flying.y += flying.vy * h;
    flying.vx *= AIR; flying.vy *= AIR;
  }
}

function groundCollide(h) {
  var i, b, pen;
  for (i = 0; i < blocks.length; i++) {
    b = blocks[i]; if (b.dead) continue;
    pen = (b.y + b.h / 2) - GROUND_Y;
    if (pen > 0) {
      b.y -= pen;
      if (b.vy > 0) {
        var d = Math.abs(b.vy) * b.mass * 0.04;
        if (d > 6) damageBlock(b, d);
        b.vy = -b.vy * 0.18;
      }
      b.vx *= 0.72;
      b.vy *= 0.75;
    }
  }
  for (i = 0; i < pigs.length; i++) {
    b = pigs[i]; if (b.dead) continue;
    pen = (b.y + b.r) - GROUND_Y;
    if (pen > 0) {
      b.y -= pen;
      if (b.vy > 0) {
        var dp = Math.abs(b.vy) * b.mass * 0.05;
        if (dp > 12) damagePig(b, dp * 1.6);
        b.vy = -b.vy * 0.2;
      }
      b.vx *= 0.7; b.vy *= 0.8;
    }
  }
  if (flying && flying.state === 'fly' && flying.y + flying.r > GROUND_Y) {
    flying.y = GROUND_Y - flying.r;
    if (Math.abs(flying.vy) < 60) { flying.vx *= 0.6; flying.vy = 0; }
    else { flying.vy = -flying.vy * 0.28; flying.vx *= 0.75; SFX.hit(); }
  }
}

function circleBox(c, b) {
  var cx = clamp(c.x, b.x - b.w / 2, b.x + b.w / 2);
  var cy = clamp(c.y, b.y - b.h / 2, b.y + b.h / 2);
  var dx = c.x - cx, dy = c.y - cy, d = Math.sqrt(dx * dx + dy * dy);
  if (d > c.r) return null;
  var nx, ny, pen;
  if (d < 0.0001) {
    var ox = (c.x - b.x), oy = (c.y - b.y);
    if (Math.abs(ox) / (b.w / 2) > Math.abs(oy) / (b.h / 2)) { nx = ox > 0 ? 1 : -1; ny = 0; }
    else { nx = 0; ny = oy > 0 ? 1 : -1; }
    pen = c.r + Math.min(b.w, b.h) / 2;
  } else {
    nx = dx / d; ny = dy / d; pen = c.r - d;
  }
  return { nx: nx, ny: ny, pen: pen };
}

function resolve(c, b, n, pen) {
  var tot = c.mass + b.mass;
  c.x += n.nx * pen * (b.mass / tot);
  c.y += n.ny * pen * (b.mass / tot);
  b.x -= n.nx * pen * (c.mass / tot);
  b.y -= n.ny * pen * (c.mass / tot);

  var rvx = c.vx - b.vx, rvy = c.vy - b.vy;
  var vn = rvx * n.nx + rvy * n.ny;
  if (vn > 0) return 0;
  var e = c.bounce != null ? c.bounce : 0.22;
  var j = -(1 + e) * vn / (1 / c.mass + 1 / b.mass);
  c.vx += j * n.nx / c.mass; c.vy += j * n.ny / c.mass;
  b.vx -= j * n.nx / b.mass; b.vy -= j * n.ny / b.mass;
  return Math.abs(j);
}

function damageBlock(b, d) {
  if (b.dead || d < 6) return;
  b.hp -= d;
  if (b.hp <= 0) {
    b.dead = true;
    addScore(MAT[b.m].sc);
    if (SFX[MAT[b.m].sfx]) SFX[MAT[b.m].sfx]();
    for (var i = 0; i < 8; i++) {
      parts.push({
        x: b.x + rnd(-b.w / 2, b.w / 2), y: b.y + rnd(-b.h / 2, b.h / 2),
        vx: rnd(-160, 160), vy: rnd(-260, -40), life: rnd(0.4, 0.9),
        c: MAT[b.m].fill, s: rnd(3, 7)
      });
    }
  }
}

function damagePig(p, d) {
  if (p.dead || d < 10) return;
  p.hp -= d;
  if (p.hp <= 0) {
    p.dead = true;
    killsThisLevel++;
    save.kills++;
    addScore(5000);
    pops.push({ x: p.x, y: p.y, t: 1, txt: '+5000' });
    SFX.pig(); vibe(30);
    for (var i = 0; i < 10; i++) {
      parts.push({
        x: p.x, y: p.y, vx: rnd(-200, 200), vy: rnd(-300, -60),
        life: rnd(0.4, 1.0), c: i % 2 ? '#8ed14b' : '#6fae2f', s: rnd(3, 8)
      });
    }
  }
}

function collideAll() {
  var list = bodies(), i, n, j, a, b, imp;
  for (i = 0; i < list.length; i++) {
    a = list[i];
    if (a.dead || a.box !== undefined) continue; /* только круги */
    for (j = 0; j < list.length; j++) {
      b = list[j];
      if (b === a) continue;
      if (b.box === undefined) {
        /* круг-круг (свинья или птица) */
        var dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy);
        var rr = a.r + b.r;
        if (d < rr && d > 0.0001) {
          n = { nx: dx / d, ny: dy / d, pen: rr - d };
          imp = resolve(a, b, n, n.pen);
          if (imp > 5) {
            if (b.type === 'pig') damagePig(b, imp * 1.6);
            if (a.type === 'pig') damagePig(a, imp * 1.6);
            if (b.type === 'pig' && a.type === 'pig') { damagePig(a, imp); damagePig(b, imp); }
            if (imp > 40) SFX.hit();
          }
        }
      } else {
        if (b.dead) continue;
        var hit = circleBox(a, b);
        if (hit) {
          imp = resolve(a, b, hit, hit.pen);
          if (imp > 4) {
            damageBlock(b, imp * 0.02 * 60 / 60 * 100 / 100 * 1);
            if (imp > 8) damageBlock(b, 0);
            if (a.type === 'pig') damagePig(a, imp * 1.2);
            var dmg = imp * 0.02;
            damageBlockOnly(b, dmg);
          }
        }
      }
    }
  }
  /* блоки друг с другом */
  for (i = 0; i < blocks.length; i++) {
    if (blocks[i].dead) continue;
    for (j = i + 1; j < blocks.length; j++) {
      if (blocks[j].dead) continue;
      boxBox(blocks[i], blocks[j]);
    }
  }
}

function boxBox(a, b) {
  var dx = b.x - a.x, ox = (a.w + b.w) / 2 - Math.abs(dx);
  if (ox <= 0) return;
  var dy = b.y - a.y, oy = (a.h + b.h) / 2 - Math.abs(dy);
  if (oy <= 0) return;
  var nx = 0, ny = 0, pen = 0;
  if (ox < oy) { nx = dx > 0 ? 1 : -1; pen = ox; }
  else { ny = dy > 0 ? 1 : -1; pen = oy; }
  var tot = a.mass + b.mass;
  a.x -= nx * pen * (b.mass / tot); a.y -= ny * pen * (b.mass / tot);
  b.x += nx * pen * (a.mass / tot); b.y += ny * pen * (a.mass / tot);
  var rvx = b.vx - a.vx, rvy = b.vy - a.vy;
  var vn = rvx * nx + rvy * ny;
  if (vn < 0) {
    var e = 0.15;
    var j = -(1 + e) * vn / (1 / a.mass + 1 / b.mass);
    a.vx -= j * nx / a.mass; a.vy -= j * ny / a.mass;
    b.vx += j * nx / b.mass; b.vy += j * ny / b.mass;
  }
  a.vx *= 0.9; b.vx *= 0.9;
}

function damageBlockOnly(b, d) {
  if (d > 6) damageBlock(b, d);
}

function physics(dt) {
  var sub = 4, i, h = dt / sub;
  for (i = 0; i < sub; i++) {
    integrate(h);
    groundCollide(h);
    collideAll();
  }
}

/* ---------------------- логика уровня ---------------------- */
function addScore(v) { score += v; }

function startLevel(n) {
  level = n;
  var data = buildLevel(n);
  blocks = data.blocks;
  pigs = data.pigs;
  parts = []; pops = [];
  score = 0; killsThisLevel = 0; combo = 0;
  shotsFired = 0; usedPower = false;
  pigsAtStart = pigs.length;
  var nb = 0, i;
  for (i = 0; i < blocks.length; i++) nb++;
  baseScore = pigsAtStart * 5000 + nb * 500;
  birdsLeft = birdList(n);
  flying = null;
  active = { type: birdsLeft.shift(), x: SLING_X, y: SLING_Y, r: 22, state: 'ready', used: false, mass: 8, bounce: 0.25 };
  cam.x = 0; cam.target = 0;
  state = 'play';
  winTimer = 0; loseTimer = 0;
  dragging = false;
  syncHud();
  showScreen(null);
  var h = $('#hud'); if (h) h.classList.remove('hidden');
  musicStart();
  store();
}

function shoot() {
  if (!active || active.state !== 'ready') return;
  var dx = SLING_X - active.x, dy = SLING_Y - active.y;
  if (Math.sqrt(dx * dx + dy * dy) < 12) { active.x = SLING_X; active.y = SLING_Y; return; }
  active.state = 'fly';
  active.vx = dx * POWER;
  active.vy = dy * POWER;
  flying = active;
  active = null;
  usedPower = false;
  shotsFired++; save.shots++; store();
  SFX.shot(); vibe(20);
  cam.target = clamp(flying.x - viewW * 0.42, 0, WORLD_W - viewW);
}

function useAbility() {
  if (!flying || flying.used) return;
  if (flying.type === 'yellow') {
    var sp = Math.sqrt(flying.vx * flying.vx + flying.vy * flying.vy) || 300;
    flying.vx *= 1.9; flying.vy *= 1.9;
    flying.used = true;
    SFX.shot();
    for (var i = 0; i < 8; i++) parts.push({
      x: flying.x, y: flying.y, vx: rnd(-80, 80), vy: rnd(-80, 80),
      life: rnd(0.2, 0.5), c: '#f5c542', s: rnd(3, 6)
    });
  } else if (flying.type === 'blue') {
    flying.used = true;
    var base = flying;
    for (var k = -1; k <= 1; k += 2) {
      var clone = {
        type: 'blue', x: base.x, y: base.y, r: 16, state: 'fly', used: true, mass: 4,
        bounce: 0.3, vx: base.vx * 0.9, vy: base.vy + k * 220
      };
      birdsLeftExtra().push(clone);
    }
    SFX.shot();
  } else if (flying.type === 'black') {
    explode(flying.x, flying.y, 190, 2600);
    flying.dead = true;
    flying.state = 'boom';
  }
}
var extraFlyers = [];
function birdsLeftExtra() { return extraFlyers; }

function explode(x, y, radius, force) {
  var i, b, dx, dy, d, f;
  SFX.boom(); vibe(60);
  for (i = 0; i < 26; i++) parts.push({
    x: x, y: y, vx: rnd(-420, 420), vy: rnd(-420, 200),
    life: rnd(0.3, 0.9), c: i % 3 === 0 ? '#ffd34d' : (i % 3 === 1 ? '#ff7a4d' : '#ffe9a8'), s: rnd(3, 9)
  });
  for (i = 0; i < blocks.length; i++) {
    b = blocks[i]; if (b.dead) continue;
    dx = b.x - x; dy = b.y - y; d = Math.sqrt(dx * dx + dy * dy) || 1;
    if (d < radius) {
      f = (1 - d / radius) * force;
      b.vx += (dx / d) * f / b.mass * 0.35;
      b.vy += (dy / d) * f / b.mass * 0.35 - 30;
      damageBlockOnly(b, f * 0.05);
    }
  }
  for (i = 0; i < pigs.length; i++) {
    b = pigs[i]; if (b.dead) continue;
    dx = b.x - x; dy = b.y - y; d = Math.sqrt(dx * dx + dy * dy) || 1;
    if (d < radius) {
      f = (1 - d / radius) * force;
      b.vx += (dx / d) * f / b.mass * 0.2;
      b.vy += (dy / d) * f / b.mass * 0.2 - 20;
      damagePig(b, f * 0.12);
    }
  }
}

function nextBird() {
  if (birdsLeft.length) active = { type: birdsLeft.shift(), x: SLING_X, y: SLING_Y, r: 22, state: 'ready', used: false, mass: 8, bounce: 0.25 };
  else active = null;
  syncHud();
}

function checkEnd(dt) {
  var alive = 0, i;
  for (i = 0; i < pigs.length; i++) if (!pigs[i].dead) alive++;
  if (alive === 0 && state === 'play') {
    state = 'win';
    var left = (active ? 1 : 0) + birdsLeft.length;
    if (left > 0) addScore(left * 10000);
    if (shotsFired <= pigsAtStart) save.perfect++;
    var stars = 1;
    if (score >= baseScore * 1.45) stars = 2;
    if (score >= baseScore * 2.0) stars = 3;
    var prev = save.levels[level] | 0;
    if (stars > prev) save.levels[level] = stars;
    var coins = 120 + stars * 60;
    if (save.items.storage) coins = Math.round(coins * 1.25);
    save.coins += coins;
    store();
    checkAchievements();
    SFX.win();
    var wc = $('#winCoins'); if (wc) wc.textContent = coins;
    var ws = $('#winScore'); if (ws) ws.textContent = score;
    var wsx = $('#winStars');
    if (wsx) {
      var str = '';
      for (i = 0; i < 3; i++) str += (i < stars ? '★' : '☆');
      wsx.innerHTML = (stars >= 1 ? '<span>★</span>' : '<span class="off">☆</span>') +
                     (stars >= 2 ? '<span>★</span>' : '<span class="off">☆</span>') +
                     (stars >= 3 ? '<span>★</span>' : '<span class="off">☆</span>');
    }
    var nb = $('#btnNext');
    if (nb) nb.style.display = level < TOTAL_LEVELS ? '' : 'none';
    var ov = $('#ovWin'); if (ov) ov.classList.remove('hidden');
    var h = $('#hud'); if (h) h.classList.add('hidden');
    musicStop();
  }
  if (state === 'play' && alive > 0 && !active && !flying && birdsLeft.length === 0 && extraFlyers.length === 0) {
    loseTimer += dt;
    if (loseTimer > 1.4) {
      state = 'lose';
      SFX.lose();
      var lp = $('#losePigs'); if (lp) lp.textContent = alive;
      var ov2 = $('#ovLose'); if (ov2) ov2.classList.remove('hidden');
      var h2 = $('#hud'); if (h2) h2.classList.add('hidden');
      musicStop();
    }
  } else { loseTimer = 0; }
}

/* ---------------------- достижения ---------------------- */
var ACH = [
  { id: 'a1',  n: 'Первый выстрел',      d: 'Запусти первую птицу',            f: function () { return save.shots >= 1; } },
  { id: 'a2',  n: 'Стрелок',             d: 'Сделай 10 выстрелов',             f: function () { return save.shots >= 10; } },
  { id: 'a3',  n: 'Снайпер',             d: 'Сделай 100 выстрелов',            f: function () { return save.shots >= 100; } },
  { id: 'a4',  n: 'Охотник',             d: 'Убей 10 свиней',                  f: function () { return save.kills >= 10; } },
  { id: 'a5',  n: 'Гроза свиней',        d: 'Убей 50 свиней',                  f: function () { return save.kills >= 50; } },
  { id: 'a6',  n: 'Мясник',              d: 'Убей 250 свиней',                 f: function () { return save.kills >= 250; } },
  { id: 'a7',  n: 'Легенда',             d: 'Убей 1000 свиней',                f: function () { return save.kills >= 1000; } },
  { id: 'a8',  n: 'Начало',              d: 'Пройди уровень 1',                f: function () { return (save.levels[1] | 0) > 0; } },
  { id: 'a9',  n: 'Пятёрка',             d: 'Пройди 5 уровней',                f: function () { return levelsDone() >= 5; } },
  { id: 'a10', n: 'Десятка',             d: 'Пройди 10 уровней',               f: function () { return levelsDone() >= 10; } },
  { id: 'a11', n: 'Половина пути',       d: 'Пройди 25 уровней',               f: function () { return levelsDone() >= 25; } },
  { id: 'a12', n: 'Победитель',          d: 'Пройди все 50 уровней',           f: function () { return levelsDone() >= 50; } },
  { id: 'a13', n: 'Три звезды',          d: 'Получи 3 звезды на уровне',       f: function () { var k; for (k in save.levels) if (save.levels[k] === 3) return true; return false; } },
  { id: 'a14', n: '15 звёзд',            d: 'Собери 15 звёзд',                 f: function () { return starsTotal() >= 15; } },
  { id: 'a15', n: '50 звёзд',            d: 'Собери 50 звёзд',                 f: function () { return starsTotal() >= 50; } },
  { id: 'a16', n: '150 звёзд',           d: 'Собери все 150 звёзд',            f: function () { return starsTotal() >= 150; } },
  { id: 'a17', n: 'Без потерь',          d: 'Пройди уровень без потери птиц',  f: function () { return save.perfect >= 1; } },
  { id: 'a18', n: 'Мастер',              d: '10 уровней без потерь',           f: function () { return save.perfect >= 10; } },
  { id: 'a19', n: 'Богач',               d: 'Имей на счету 2000 монет',        f: function () { return save.coins >= 2000; } },
  { id: 'a20', n: 'Покупатель',          d: 'Купи 3 предмета в магазине',      f: function () { var c = 0, k; for (k in save.items) c++; return c >= 3; } }
];
function achDone(id) { return !!save.ach[id]; }
function checkAchievements() {
  var got = 0, i;
  for (i = 0; i < ACH.length; i++) {
    var a = ACH[i];
    if (!save.ach[a.id]) {
      var ok = false;
      try { ok = !!a.f(); } catch (e) { ok = false; }
      if (ok) { save.ach[a.id] = 1; save.coins += 200; got++; SFX.star(); }
    }
  }
  if (got) store();
  return got;
}

/* ---------------------- магазин ---------------------- */
var ITEMS = [
  { id: 'blue',    n: '🟦 Синяя птица',  d: '+1 синяя: в полёте делится на три', p: 300 },
  { id: 'bomb',    n: '⬛ Птица-бомба',  d: '+1 чёрная: взрывает постройки',     p: 500 },
  { id: 'golden',  n: '🟨 Золотая птица', d: '+1 жёлтая: ускоряется по тапу',    p: 800 },
  { id: 'extra',   n: '🔴 Запасная птица', d: '+1 обычная птица на каждый уровень', p: 250 },
  { id: 'storage', n: '📦 Кладовая',     d: '+25% монет за каждый уровень',      p: 400 }
];

/* ---------------------- интерфейс ---------------------- */
var screens = ['menu', 'levels', 'shop', 'ach', 'settings'];
function showScreen(name) {
  var i, el;
  for (i = 0; i < screens.length; i++) {
    el = document.getElementById(screens[i]);
    if (el) el.classList.toggle('hidden', screens[i] !== name);
  }
  if (name) {
    var h = $('#hud'); if (h) h.classList.add('hidden');
    if (name === 'levels') renderLevels();
    if (name === 'shop') renderShop();
    if (name === 'ach') renderAch();
    if (name === 'settings') renderSettings();
  }
  refreshMoney();
}
function refreshMoney() {
  var t = starsTotal();
  var mc = $('#menuCoins'); if (mc) mc.textContent = save.coins;
  var ms = $('#menuStars'); if (ms) ms.textContent = t;
  var lc = $('#levelsCoins'); if (lc) lc.textContent = save.coins;
  var sc = $('#shopCoins'); if (sc) sc.textContent = save.coins;
  var ad = $('#achDone'); if (ad) ad.textContent = (function () { var c = 0, k; for (k in save.ach) c++; return c; })();
  var at = $('#achTotal'); if (at) at.textContent = ACH.length;
}
function renderLevels() {
  var grid = $('#levelsGrid'); if (!grid) return;
  var open = maxUnlocked(), html = '', i;
  for (i = 1; i <= TOTAL_LEVELS; i++) {
    var st = save.levels[i] | 0, isOpen = i <= open;
    var stars = '';
    for (var k = 0; k < 3; k++) stars += (k < st ? '★' : '·');
    html += '<div class="lvl ' + (isOpen ? 'open' : 'locked') + '" data-lvl="' + i + '">' +
            (isOpen ? i : '🔒') + '<div class="st">' + (isOpen ? stars : '') + '</div></div>';
  }
  grid.innerHTML = html;
  var cells = grid.querySelectorAll('.lvl');
  for (i = 0; i < cells.length; i++) {
    cells[i].addEventListener('click', function () {
      var n = parseInt(this.getAttribute('data-lvl'), 10);
      if (n > maxUnlocked()) { SFX.hit(); return; }
      SFX.click(); startLevel(n);
    });
  }
}
function renderShop() {
  var list = $('#shopList'); if (!list) return;
  var html = '', i;
  for (i = 0; i < ITEMS.length; i++) {
    var it = ITEMS[i], owned = !!save.items[it.id];
    html += '<div class="card ' + (owned ? 'done' : '') + '">' +
      '<div class="ico">' + it.n.split(' ')[0] + '</div>' +
      '<div class="txt"><div class="nm">' + it.n.replace(/^[^ ]+ /, '') + '</div>' +
      '<div class="ds">' + it.d + '</div></div>' +
      '<button class="btn small ' + (owned ? 'ghost' : '') + '" data-item="' + it.id + '"' + (owned ? ' disabled' : '') + '>' +
      (owned ? 'Куплено' : '🪙 ' + it.p) + '</button></div>';
  }
  list.innerHTML = html;
  var btns = list.querySelectorAll('button[data-item]');
  for (i = 0; i < btns.length; i++) {
    btns[i].addEventListener('click', function () {
      var id = this.getAttribute('data-item'), item = null, k;
      for (k = 0; k < ITEMS.length; k++) if (ITEMS[k].id === id) item = ITEMS[k];
      if (!item || save.items[id]) return;
      if (save.coins < item.p) { SFX.hit(); this.classList.add('shake'); return; }
      save.coins -= item.p; save.items[id] = 1; save.spent += item.p; store();
      SFX.star(); checkAchievements(); renderShop(); refreshMoney();
    });
  }
}
function renderAch() {
  var list = $('#achList'); if (!list) return;
  var html = '', i;
  for (i = 0; i < ACH.length; i++) {
    var a = ACH[i], done = achDone(a.id);
    html += '<div class="card ' + (done ? 'done' : '') + '">' +
      '<div class="ico">' + (done ? '🏆' : '🔒') + '</div>' +
      '<div class="txt"><div class="nm">' + a.n + '</div>' +
      '<div class="ds">' + a.d + '</div></div>' +
      '<div class="lvlpips">' + (done ? '+200 🪙' : '—') + '</div></div>';
  }
  list.innerHTML = html;
}
function renderSettings() {
  var s = save;
  var a = $('#swSound'); if (a) a.classList.toggle('on', !!s.sound);
  var b = $('#swMusic'); if (b) b.classList.toggle('on', !!s.music);
  var c = $('#swVibe'); if (c) c.classList.toggle('on', !!s.vibe);
  var inf = $('#setInfo');
  if (inf) inf.textContent = 'Пройдено уровней: ' + levelsDone() + ' из 50 · Звёзд: ' + starsTotal() + ' из 150 · Свиней: ' + save.kills;
}
function syncHud() {
  var hl = $('#hudLevel'); if (hl) hl.textContent = 'Уровень ' + level;
  var alive = 0, i;
  for (i = 0; i < pigs.length; i++) if (!pigs[i].dead) alive++;
  var hp = $('#hudPigs'); if (hp) hp.textContent = '🐷 ' + alive;
  var hb = $('#hudBirds'); if (hb) {
    var html = '';
    var listNow = [];
    if (active) listNow.push(active.type);
    for (i = 0; i < birdsLeft.length; i++) listNow.push(birdsLeft[i]);
    for (i = 0; i < listNow.length && i < 8; i++) html += '<div class="pip ' + listNow[i] + '"></div>';
    hb.innerHTML = html;
  }
}
function updateScoreHud() {
  var hs = $('#hudScore'); if (hs) hs.textContent = score;
}

/* ---------------------- отрисовка ---------------------- */
function resize() {
  if (!cv) return;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var w = window.innerWidth, h = window.innerHeight;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  cv.style.width = w + 'px'; cv.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  scale = h / WORLD_H;
  viewW = w / scale;
  makeClouds();
}
function makeClouds() {
  clouds = [];
  for (var i = 0; i < 9; i++) {
    clouds.push({
      x: rnd(-200, WORLD_W + 200), y: rnd(40, 300),
      s: rnd(0.5, 1.4), v: rnd(4, 14)
    });
  }
}
function sx(x) { return (x - cam.x) * scale; }
function sy(y) { return y * scale; }

function draw() {
  if (!ctx) return;
  var w = window.innerWidth, h = window.innerHeight, i;

  /* небо */
  var g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#5fb6e8');
  g.addColorStop(0.55, '#a8dcf0');
  g.addColorStop(1, '#dff2f7');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

  /* облака */
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  for (i = 0; i < clouds.length; i++) {
    var c = clouds[i];
    var cx = sx(c.x - cam.x * 0.35) , cy = sy(c.y);
    var r = 26 * c.s * scale / 1.0;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 6.284);
    ctx.arc(cx + r * 0.9, cy + r * 0.15, r * 0.75, 0, 6.284);
    ctx.arc(cx - r * 0.9, cy + r * 0.2, r * 0.65, 0, 6.284);
    ctx.fill();
  }

  /* холмы */
  ctx.fillStyle = '#7fbf5a';
  ctx.beginPath();
  ctx.moveTo(0, sy(GROUND_Y));
  for (i = 0; i <= 12; i++) {
    var hx = i * (w / 12);
    var hy = sy(GROUND_Y) - 40 * scale * (0.4 + 0.6 * Math.abs(Math.sin(i * 1.3 + cam.x * 0.001)));
    ctx.quadraticCurveTo(hx + w / 24, hy, hx + w / 12, sy(GROUND_Y) - 10 * scale);
  }
  ctx.lineTo(w, sy(GROUND_Y)); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();

  /* земля */
  var gg = ctx.createLinearGradient(0, sy(GROUND_Y), 0, h);
  gg.addColorStop(0, '#8fce63'); gg.addColorStop(0.18, '#6fae3f');
  gg.addColorStop(0.2, '#7a5a35'); gg.addColorStop(1, '#4d3820');
  ctx.fillStyle = gg;
  ctx.fillRect(0, sy(GROUND_Y), w, h - sy(GROUND_Y));

  /* рогатка — задняя часть */
  drawSling(true);

  /* блоки */
  for (i = 0; i < blocks.length; i++) drawBlock(blocks[i]);

  /* свиньи */
  for (i = 0; i < pigs.length; i++) drawPig(pigs[i]);

  /* птицы */
  if (flying && flying.state === 'fly') drawBird(flying);
  for (i = 0; i < extraFlyers.length; i++) drawBird(extraFlyers[i]);
  if (active && active.state === 'ready') drawBird(active);

  /* рогатка — передняя часть и резинка */
  drawSling(false);

  /* траектория */
  if (dragging && active && active.state === 'ready') drawTrail();

  /* частицы */
  for (i = 0; i < parts.length; i++) {
    var p = parts[i];
    ctx.fillStyle = p.c;
    ctx.fillRect(sx(p.x) - p.s / 2 * scale, sy(p.y) - p.s / 2 * scale, p.s * scale, p.s * scale);
  }

  /* очки */
  ctx.textAlign = 'center';
  for (i = 0; i < pops.length; i++) {
    var pp = pops[i];
    ctx.globalAlpha = clamp(pp.t, 0, 1);
    ctx.font = 'bold ' + Math.round(28 * scale) + 'px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = 'rgba(0,0,0,.55)';
    ctx.lineWidth = 4 * scale;
    ctx.strokeText(pp.txt, sx(pp.x), sy(pp.y) - (1 - pp.t) * 60 * scale);
    ctx.fillText(pp.txt, sx(pp.x), sy(pp.y) - (1 - pp.t) * 60 * scale);
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'left';
}

function drawSling(back) {
  var x = sx(SLING_X), y = sy(SLING_Y), gy = sy(GROUND_Y);
  var wdt = 13 * scale;
  if (back) {
    ctx.fillStyle = '#7a4b22';
    ctx.fillRect(x - wdt / 2, y, wdt, gy - y);
    ctx.fillRect(x - wdt * 1.6, y - 6 * scale, wdt, 26 * scale);
    return;
  }
  ctx.fillStyle = '#8a5a2b';
  ctx.fillRect(x - wdt * 1.7, y - 12 * scale, wdt, 30 * scale);
  ctx.fillRect(x + wdt * 0.7, y - 12 * scale, wdt, 30 * scale);
  /* резинка */
  if (active && active.state === 'ready') {
    ctx.strokeStyle = '#3b2412';
    ctx.lineWidth = 6 * scale;
    ctx.beginPath();
    ctx.moveTo(x - wdt * 1.3, y - 4 * scale);
    ctx.lineTo(sx(active.x), sy(active.y));
    ctx.lineTo(x + wdt * 1.3, y - 4 * scale);
    ctx.stroke();
  }
}

function drawTrail() {
  var dx = SLING_X - active.x, dy = SLING_Y - active.y;
  var vx = dx * POWER, vy = dy * POWER;
  var x = active.x, y = active.y, t = 0.033, i;
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  for (i = 0; i < 26; i++) {
    x += vx * t; y += vy * t; vy += GRAVITY * t;
    if (y > GROUND_Y || x > WORLD_W) break;
    ctx.beginPath();
    ctx.arc(sx(x), sy(y), Math.max(1.5, 3.4 * scale - i * 0.06 * scale), 0, 6.284);
    ctx.fill();
  }
}

function drawBlock(b) {
  if (b.dead) return;
  var m = MAT[b.m];
  var x = sx(b.x - b.w / 2), y = sy(b.y - b.h / 2);
  var w = b.w * scale, h = b.h * scale;
  ctx.fillStyle = m.edge;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = m.fill;
  ctx.fillRect(x + 2 * scale, y + 2 * scale, w - 4 * scale, h - 4 * scale);
  if (b.m === 'wood') {
    ctx.strokeStyle = 'rgba(90,60,20,.45)';
    ctx.lineWidth = 1.6 * scale;
    for (var i = 1; i < 3; i++) {
      ctx.beginPath();
      if (b.w > b.h) { ctx.moveTo(x + w * i / 3, y + 3 * scale); ctx.lineTo(x + w * i / 3, y + h - 3 * scale); }
      else { ctx.moveTo(x + 3 * scale, y + h * i / 3); ctx.lineTo(x + w - 3 * scale, y + h * i / 3); }
      ctx.stroke();
    }
  } else if (b.m === 'ice') {
    ctx.strokeStyle = 'rgba(255,255,255,.75)';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.2, y + h * 0.85);
    ctx.lineTo(x + w * 0.5, y + h * 0.3);
    ctx.lineTo(x + w * 0.75, y + h * 0.6);
    ctx.stroke();
  }
  var ratio = b.hp / b.max;
  if (ratio < 0.65) {
    ctx.strokeStyle = 'rgba(20,10,0,.7)';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.15, y + h * 0.2);
    ctx.lineTo(x + w * 0.45, y + h * 0.6);
    ctx.lineTo(x + w * 0.3, y + h * 0.9);
    if (ratio < 0.35) {
      ctx.moveTo(x + w * 0.6, y + h * 0.15);
      ctx.lineTo(x + w * 0.8, y + h * 0.55);
    }
    ctx.stroke();
  }
}

function drawPig(p) {
  if (p.dead) return;
  var x = sx(p.x), y = sy(p.y), r = p.r * scale;
  ctx.fillStyle = '#8ed14b';
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.284); ctx.fill();
  ctx.strokeStyle = '#5f8f2c'; ctx.lineWidth = 2 * scale; ctx.stroke();
  ctx.fillStyle = '#a8e063';
  ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.3, r * 0.22, 0, 6.284); ctx.fill();
  /* глаза */
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x - r * 0.34, y - r * 0.18, r * 0.2, 0, 6.284); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.34, y - r * 0.18, r * 0.2, 0, 6.284); ctx.fill();
  ctx.fillStyle = '#1b1b1b';
  ctx.beginPath(); ctx.arc(x - r * 0.31, y - r * 0.18, r * 0.09, 0, 6.284); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.31, y - r * 0.18, r * 0.09, 0, 6.284); ctx.fill();
  /* пятачок */
  ctx.fillStyle = '#6fae2f';
  ctx.beginPath(); ctx.ellipse ? ctx.ellipse(x, y + r * 0.28, r * 0.3, r * 0.22, 0, 0, 6.284) : ctx.arc(x, y + r * 0.28, r * 0.25, 0, 6.284);
  ctx.fill();
  ctx.fillStyle = '#3f6b16';
  ctx.beginPath(); ctx.arc(x - r * 0.11, y + r * 0.28, r * 0.06, 0, 6.284); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.11, y + r * 0.28, r * 0.06, 0, 6.284); ctx.fill();
  if (p.hp < p.max * 0.85) {
    ctx.strokeStyle = 'rgba(180,40,40,.8)';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath(); ctx.moveTo(x - r * 0.6, y - r * 0.7); ctx.lineTo(x - r * 0.2, y - r * 0.95); ctx.stroke();
  }
}

function drawBird(b) {
  var x = sx(b.x), y = sy(b.y), r = b.r * scale;
  var col = '#e8453c', dark = '#a8261f', belly = '#ffd9d6';
  if (b.type === 'yellow') { col = '#f5c542'; dark = '#c9962a'; belly = '#fff0c2'; }
  else if (b.type === 'blue') { col = '#4aa8e8'; dark = '#2a6fa8'; belly = '#d6ecff'; }
  else if (b.type === 'black') { col = '#3a3a44'; dark = '#20202a'; belly = '#5a5a68'; }
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.284); ctx.fill();
  ctx.strokeStyle = dark; ctx.lineWidth = 2 * scale; ctx.stroke();
  ctx.fillStyle = belly;
  ctx.beginPath(); ctx.ellipse ? ctx.ellipse(x, y + r * 0.4, r * 0.55, r * 0.35, 0, 0, 6.284) : ctx.arc(x, y + r * 0.4, r * 0.45, 0, 6.284);
  ctx.fill();
  /* глаза и брови */
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.28, r * 0.28, 0, 6.284); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.3, y - r * 0.28, r * 0.28, 0, 6.284); ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.arc(x - r * 0.26, y - r * 0.26, r * 0.12, 0, 6.284); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.26, y - r * 0.26, r * 0.12, 0, 6.284); ctx.fill();
  ctx.strokeStyle = dark; ctx.lineWidth = 3.2 * scale;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.62, y - r * 0.68); ctx.lineTo(x - r * 0.06, y - r * 0.42);
  ctx.moveTo(x + r * 0.62, y - r * 0.68); ctx.lineTo(x + r * 0.06, y - r * 0.42);
  ctx.stroke();
  /* клюв */
  ctx.fillStyle = '#f2a93b';
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.05);
  ctx.lineTo(x + r * 0.62, y + r * 0.22);
  ctx.lineTo(x, y + r * 0.42);
  ctx.closePath(); ctx.fill();
}

/* ---------------------- ввод ---------------------- */
function toWorld(px, py) { return { x: px / scale + cam.x, y: py / scale }; }

function onDown(e) {
  if (state !== 'play') return;
  var t = e.touches ? e.touches[0] : e;
  var pt = toWorld(t.clientX, t.clientY);
  ac();
  if (flying && flying.state === 'fly' && !flying.used) { useAbility(); return; }
  if (active && active.state === 'ready') {
    var d = Math.sqrt((pt.x - active.x) * (pt.x - active.x) + (pt.y - active.y) * (pt.y - active.y));
    if (d < 160) { dragging = true; SFX.pull(); moveDrag(pt); }
  }
}
function moveDrag(pt) {
  var dx = pt.x - SLING_X, dy = pt.y - SLING_Y;
  var d = Math.sqrt(dx * dx + dy * dy);
  if (d > MAX_PULL) { dx = dx / d * MAX_PULL; dy = dy / d * MAX_PULL; }
  active.x = SLING_X + dx; active.y = SLING_Y + dy;
}
function onMove(e) {
  if (!dragging || state !== 'play') return;
  var t = e.touches ? e.touches[0] : e;
  moveDrag(toWorld(t.clientX, t.clientY));
  if (e.cancelable) e.preventDefault();
}
function onUp() {
  if (!dragging) return;
  dragging = false;
  shoot();
}

/* ---------------------- цикл ---------------------- */
var last = 0;
function frame(ts) {
  var dt = Math.min(0.033, (ts - last) / 1000 || 0.016);
  last = ts;

  if (state === 'play') {
    physics(dt);
    var i;
    for (i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.vy += 900 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0 || p.y > GROUND_Y + 40) parts.splice(i, 1);
    }
    for (i = pops.length - 1; i >= 0; i--) {
      pops[i].t -= dt * 0.9;
      if (pops[i].t <= 0) pops.splice(i, 1);
    }
    /* смена птицы */
    if (flying && flying.state === 'fly') {
      var sp = Math.sqrt(flying.vx * flying.vx + flying.vy * flying.vy);
      var off = flying.x < -60 || flying.x > WORLD_W + 60 || flying.y > GROUND_Y + 80;
      if (sp < 40 && flying.y + flying.r >= GROUND_Y - 1) flying.still = (flying.still || 0) + dt;
      else flying.still = 0;
      if (off || flying.still > 0.9) { flying = null; nextBird(); }
      else cam.target = clamp(flying.x - viewW * 0.42, 0, WORLD_W - viewW);
    }
    /* дополнительные птицы (синяя) */
    for (i = extraFlyers.length - 1; i >= 0; i--) {
      var eb = extraFlyers[i];
      eb.state = 'fly';
      var sp2 = Math.sqrt(eb.vx * eb.vx + eb.vy * eb.vy);
      if (eb.x < -60 || eb.x > WORLD_W + 60 || eb.y > GROUND_Y + 80 || (sp2 < 40 && eb.y + eb.r >= GROUND_Y - 1)) extraFlyers.splice(i, 1);
    }
    checkEnd(dt);
  }

  cam.x += (cam.target - cam.x) * Math.min(1, dt * 4);
  cam.x = clamp(cam.x, 0, Math.max(0, WORLD_W - viewW));

  for (var c = 0; c < clouds.length; c++) {
    clouds[c].x += clouds[c].v * dt;
    if (clouds[c].x > WORLD_W + 260) clouds[c].x = -260;
  }

  draw();
  updateScoreHud();
  requestAnimationFrame(frame);
}

/* ---------------------- привязка интерфейса ---------------------- */
function bind() {
  function on(id, fn) { var el = document.getElementById(id); if (el) el.addEventListener('click', fn); }

  on('btnPlay', function () { SFX.click(); showScreen('levels'); });
  on('btnShop', function () { SFX.click(); showScreen('shop'); });
  on('btnAch', function () { SFX.click(); showScreen('ach'); });
  on('btnSettings', function () { SFX.click(); showScreen('settings'); });
  on('btnLevelsBack', function () { SFX.click(); showScreen('menu'); });
  on('btnShopBack', function () { SFX.click(); showScreen('menu'); });
  on('btnAchBack', function () { SFX.click(); showScreen('menu'); });
  on('btnSettingsBack', function () { SFX.click(); showScreen('menu'); });

  on('swSound', function () { save.sound = !save.sound; store(); SFX.click(); renderSettings(); });
  on('swMusic', function () {
    save.music = !save.music; store(); renderSettings();
    if (save.music) musicStart(); else musicStop();
  });
  on('swVibe', function () { save.vibe = !save.vibe; store(); vibe(20); renderSettings(); });

  on('btnReset', function () {
    save = JSON.parse(JSON.stringify(DEF));
    store(); renderSettings(); refreshMoney();
    SFX.hit();
  });

  on('btnPause', function () {
    if (state !== 'play')return;
    state = 'pause';
    var ov = document.getElementById('ovPause'); if (ov) ov.classList.remove('hidden');
  });
  on('btnResume', function () {
    var ov = document.getElementById('ovPause'); if (ov) ov.classList.add('hidden');
    if (state === 'pause') state = 'play';
  });
  on('btnRestart', function () {
    var ov = document.getElementById('ovPause'); if (ov) ov.classList.add('hidden');
    startLevel(level);
  });
  on('btnQuitP', function () {
    var ov = document.getElementById('ovPause'); if (ov) ov.classList.add('hidden');
    goMenu();
  });

  on('btnNext', function () {
    var ov = document.getElementById('ovWin'); if (ov) ov.classList.add('hidden');
    startLevel(clamp(level + 1, 1, TOTAL_LEVELS));
  });
  on('btnReplay', function () {
    var ov = document.getElementById('ovWin'); if (ov) ov.classList.add('hidden');
    startLevel(level);
  });
  on('btnQuitW', function () {
    var ov = document.getElementById('ovWin'); if (ov) ov.classList.add('hidden');
    goMenu();
  });

  on('btnRetry', function () {
    var ov = document.getElementById('ovLose'); if (ov) ov.classList.add('hidden');
    startLevel(level);
  });
  on('btnQuitL', function () {
    var ov = document.getElementById('ovLose'); if (ov) ov.classList.add('hidden');
    goMenu();
  });
}

function goMenu() {
  state = 'menu';
  var h = document.getElementById('hud'); if (h) h.classList.add('hidden');
  ['ovPause', 'ovWin', 'ovLose'].forEach(function (id) {
    var el = document.getElementById(id); if (el) el.classList.add('hidden');
  });
  musicStop();
  showScreen('menu');
  refreshMoney();
}

/* ---------------------- запуск ---------------------- */
function startup() {
  cv = document.getElementById('cv');
  if (!cv) return;
  ctx = cv.getContext('2d');
  resize();
  bind();
  showScreen('menu');
  refreshMoney();
  if (!frame._started) { frame._started = true; requestAnimationFrame(frame); }

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 250); });

  cv.addEventListener('touchstart', onDown, { passive: false });
  cv.addEventListener('touchmove', onMove, { passive: false });
  cv.addEventListener('touchend', onUp, { passive: false });
  cv.addEventListener('touchcancel', onUp, { passive: false });
  cv.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);

  document.addEventListener('visibilitychange', function () {
    if (document.hidden && state === 'play') {
      state = 'pause';
      var ov = document.getElementById('ovPause'); if (ov) ov.classList.remove('hidden');
    }
  });

  ['touchstart', 'mousedown', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, function once() {
      ac(); musicStart();
      window.removeEventListener(ev, once);
    }, { once: true });
  });
}

/* кнопка «назад» на Android */
window.onAndroidBack = function () {
  if (state === 'pause') {
    var ov = document.getElementById('ovPause'); if (ov) ov.classList.add('hidden');
    state = 'play'; return true;
  }
  if (state === 'play') {
    state = 'pause';
    var o2 = document.getElementById('ovPause'); if (o2) o2.classList.remove('hidden');
    return true;
  }
  if (state === 'win' || state === 'lose' || state === 'pause') { goMenu(); return true; }
  var cur = null;
  for (var i = 0; i < screens.length; i++) {
    var el = document.getElementById(screens[i]);
    if (el && !el.classList.contains('hidden')) cur = screens[i];
  }
  if (cur && cur !== 'menu') { showScreen('menu'); return true; }
  return false;
};

function pauseToMenu() { goMenu(); }

window.AB = {
  start: startup,
  version: '1.0',
  pause: pauseToMenu,
  state: function () { return state; }
};
})();
