/* ============================================================
   ANGRY BIRDS — движок (логика, физика, уровни, прогресс)
   Не знает ничего о DOM: только числа, тела и правила.
   Экспорт: window.ABG
   ============================================================ */
window.ABG = (function () {
'use strict';

var G = {};

/* ---------- константы ---------- */
G.SAVE_KEY = 'ab_save_v1';
G.WORLD_W = 2600;
G.WORLD_H = 800;
G.GROUND_Y = 720;
G.SLING_X = 235;
G.SLING_Y = G.GROUND_Y - 205;
G.MAX_PULL = 135;
G.POWER = 11;
G.GRAVITY = 1500;
G.AIR = 0.9994;
G.TOTAL_LEVELS = 50;

function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function rnd(a, b) { return a + Math.random() * (b - a); }
G.clamp = clamp;

/* ---------- сохранение ---------- */
G.DEF = {
  levels: {}, coins: 0, items: {}, ach: {}, kills: 0, shots: 0,
  perfect: 0, spent: 0, sound: true, music: true, vibe: true
};
G.save = G.loadSave();

G.loadSave = function () {
  var s = null;
  try { s = JSON.parse(localStorage.getItem(G.SAVE_KEY) || 'null'); } catch (e) { s = null; }
  if (!s || typeof s !== 'object') s = {};
  for (var k in G.DEF) {
    if (!(k in s)) {
      s[k] = (G.DEF[k] && typeof G.DEF[k] === 'object') ? JSON.parse(JSON.stringify(G.DEF[k])) : G.DEF[k];
    }
  }
  if (!s.levels) s.levels = {};
  if (!s.items) s.items = {};
  if (!s.ach) s.ach = {};
  return s;
};
G.store = function () { try { localStorage.setItem(G.SAVE_KEY, JSON.stringify(G.save)); } catch (e) {} };
G.starsTotal = function () { var t = 0, k; for (k in G.save.levels) t += G.save.levels[k] | 0; return t; };
G.levelsDone = function () { var c = 0, k; for (k in G.save.levels) if ((G.save.levels[k] | 0) > 0) c++; return c; };
G.maxUnlocked = function () {
  var m = 1, k;
  for (k in G.save.levels) {
    var n = parseInt(k, 10);
    if ((G.save.levels[k] | 0) > 0 && n + 1 > m) m = n + 1;
  }
  return clamp(m, 1, G.TOTAL_LEVELS);
};
G.resetProgress = function () {
  G.save = JSON.parse(JSON.stringify(G.DEF));
  G.store();
};

/* ---------- звук ---------- */
var actx = null;
G.ac = function () {
  if (!actx) {
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; }
  }
  if (actx && actx.state === 'suspended') { try { actx.resume(); } catch (e) {} }
  return actx;
};
function tone(freq, dur, type, vol, slideTo) {
  if (!G.save.sound) return;
  var c = G.ac(); if (!c) return;
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
G.SFX = {
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
G.vibe = function (ms) {
  try { if (G.save.vibe && navigator.vibrate) navigator.vibrate(ms); } catch (e) {}
};
var musicTimer = null, musicStep = 0;
var MUSIC = [220, 277, 330, 392, 330, 277, 247, 294];
G.musicStart = function () {
  if (!G.save.music || musicTimer) return;
  if (!G.ac()) return;
  musicTimer = setInterval(function () {
    if (!G.save.music || !actx) return;
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
};
G.musicStop = function () { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } };

/* ---------- материалы ---------- */
G.MAT = {
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
G.pigsFor = function (n) { return clamp(1 + Math.floor(n / 8), 1, 7); };
G.birdsFor = function (n) { return clamp(3 + Math.floor(n / 10), 3, 7); };

/* ---------- генерация уровня ---------- */
G.buildLevel = function (n) {
  var blocks = [], slots = [];
  var kind = ['tower', 'house', 'pyramid', 'bridge', 'double', 'castle'][(n - 1) % 6];
  var floors = clamp(2 + Math.floor(n / 12), 2, 5);
  var cx = 1230, colW = 26, colH = 76, beamH = 22, span = 132;
  var f, yBase, by, i, count, bx;

  function addB(x, y, w, h, m) {
    blocks.push({
      x: x, y: y, w: w, h: h, m: m, hp: G.MAT[m].hp, max: G.MAT[m].hp,
      vx: 0, vy: 0, dead: false, box: true, mass: Math.max(0.7, w * h / 1400)
    });
  }
  function addSlot(x, y) { slots.push({ x: x, y: y }); }

  if (kind === 'tower') {
    for (f = 0; f < floors; f++) {
      yBase = G.GROUND_Y - f * (colH + beamH);
      addB(cx - span / 2 + colW / 2, yBase - colH / 2, colW, colH, matFor(n));
      addB(cx + span / 2 - colW / 2, yBase - colH / 2, colW, colH, matFor(n));
      by = yBase - colH - beamH / 2;
      addB(cx, by, span + colW, beamH, matFor(n));
      addSlot(cx, yBase - colH - beamH - 26);
    }
    addSlot(cx, G.GROUND_Y - 30);
  } else if (kind === 'house') {
    for (f = 0; f < floors; f++) {
      yBase = G.GROUND_Y - f * (colH + beamH);
      addB(cx - 78, yBase - colH / 2, 30, colH, matFor(n));
      addB(cx + 78, yBase - colH / 2, 30, colH, matFor(n));
      addB(cx, yBase - colH - beamH / 2, 200, beamH, matFor(n));
      addSlot(cx, yBase - colH + 4);
    }
    addSlot(cx, G.GROUND_Y - 30);
  } else if (kind === 'pyramid') {
    var rows = clamp(2 + Math.floor(n / 14), 2, 4), cube = 40;
    for (f = 0; f < rows; f++) {
      count = rows - f + 1;
      for (i = 0; i < count; i++) {
        bx = cx + (i - (count - 1) / 2) * (cube + 4);
        addB(bx, G.GROUND_Y - cube / 2 - f * (cube + 4), cube, cube, matFor(n));
      }
      addSlot(cx, G.GROUND_Y - cube * (f + 1) - 4 * f - 26);
    }
  } else if (kind === 'bridge') {
    addB(cx - 130, G.GROUND_Y - colH / 2, colW, colH, matFor(n));
    addB(cx, G.GROUND_Y - colH / 2, colW, colH, matFor(n));
    addB(cx + 130, G.GROUND_Y - colH / 2, colW, colH, matFor(n));
    addB(cx, G.GROUND_Y - colH - beamH / 2, 320, beamH, matFor(n));
    addSlot(cx - 65, G.GROUND_Y - colH - beamH - 26);
    addSlot(cx + 65, G.GROUND_Y - colH - beamH - 26);
    addSlot(cx, G.GROUND_Y - 30);
    for (f = 1; f < floors; f++) {
      yBase = G.GROUND_Y - colH - beamH;
      addB(cx - 60, yBase - colH / 2, colW, colH, matFor(n));
      addB(cx + 60, yBase - colH / 2, colW, colH, matFor(n));
      addB(cx, yBase - colH - beamH / 2, 150, beamH, matFor(n));
      addSlot(cx, yBase - colH + 4);
    }
  } else if (kind === 'double') {
    var towers = [cx - 150, cx + 150];
    for (i = 0; i < 2; i++) {
      for (f = 0; f < floors; f++) {
        yBase = G.GROUND_Y - f * (colH + beamH);
        addB(towers[i] - 40, yBase - colH / 2, colW, colH, matFor(n));
        addB(towers[i] + 40, yBase - colH / 2, colW, colH, matFor(n));
        addB(towers[i], yBase - colH - beamH / 2, 106, beamH, matFor(n));
        addSlot(towers[i], yBase - colH + 4);
      }
    }
    addB(cx, G.GROUND_Y - floors * (colH + beamH) - beamH / 2, 300, beamH, matFor(n));
    addSlot(cx, G.GROUND_Y - 30);
  } else {
    var side = [cx - 190, cx + 190];
    for (i = 0; i < 2; i++) {
      for (f = 0; f < floors + 1; f++) {
        yBase = G.GROUND_Y - f * (colH + beamH);
        addB(side[i] - 45, yBase - colH / 2, 30, colH, matFor(n));
        addB(side[i] + 45, yBase - colH / 2, 30, colH, matFor(n));
        addB(side[i], yBase - colH - beamH / 2, 120, beamH, matFor(n));
      }
      addSlot(side[i], G.GROUND_Y - colH - beamH - 26);
    }
    for (f = 0; f < floors; f++) {
      yBase = G.GROUND_Y - f * (colH + beamH);
      addB(cx - 60, yBase - colH / 2, 26, colH, matFor(n));
      addB(cx + 60, yBase - colH / 2, 26, colH, matFor(n));
      addB(cx, yBase - colH - beamH / 2, 146, beamH, matFor(n));
      addSlot(cx, yBase - colH + 4);
    }
  }

  var need = G.pigsFor(n), pigs = [];
  for (i = 0; i < need; i++) {
    var s = slots.length ? slots[i % slots.length] : { x: cx, y: G.GROUND_Y - 30 };
    var shift = Math.floor(i / Math.max(1, slots.length)) * 30;
    pigs.push({
      x: clamp(s.x + rnd(-5, 5) + shift, 900, G.WORLD_W - 120),
      y: s.y, r: 26, hp: 50, max: 50, vx: 0, vy: 0, dead: false, mass: 2.2
    });
  }
  return { blocks: blocks, pigs: pigs, kind: kind };
};

G.birdList = function (n) {
  var list = [], i, count = G.birdsFor(n);
  for (i = 0; i < count; i++) list.push('red');
  if (G.save.items.blue) list.push('blue');
  if (G.save.items.bomb) list.push('black');
  if (G.save.items.golden) list.push('yellow');
  if (G.save.items.extra) list.push('red');
  return list;
};

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
G.shotsFired = 0;
G.pigsAtStart = 0;
G.baseScore = 1;
G.loseTimer = 0;
G.lastWin = null;

function addScore(v) { G.score += v; }
G.addScore = addScore;

/* ---------- физика ---------- */
function bodies() {
  var arr = [], i;
  for (i = 0; i < G.blocks.length; i++) if (!G.blocks[i].dead) arr.push(G.blocks[i]);
  for (i = 0; i < G.pigs.length; i++) if (!G.pigs[i].dead) arr.push(G.pigs[i]);
  if (G.flying && G.flying.state === 'fly') arr.push(G.flying);
  for (i = 0; i < G.extraFlyers.length; i++) arr.push(G.extraFlyers[i]);
  return arr;
}

function integrate(h) {
  var i, b;
  for (i = 0; i < G.blocks.length; i++) {
    b = G.blocks[i]; if (b.dead) continue;
    b.vy += G.GRAVITY * h; b.x += b.vx * h; b.y += b.vy * h;
  }
  for (i = 0; i < G.pigs.length; i++) {
    b = G.pigs[i]; if (b.dead) continue;
    b.vy += G.GRAVITY * h; b.x += b.vx * h; b.y += b.vy * h;
  }
  if (G.flying && G.flying.state === 'fly') {
    b = G.flying;
    b.vy += G.GRAVITY * h; b.x += b.vx * h; b.y += b.vy * h;
    b.vx *= G.AIR; b.vy *= G.AIR;
  }
  for (i = 0; i < G.extraFlyers.length; i++) {
    b = G.extraFlyers[i];
    b.vy += G.GRAVITY * h; b.x += b.vx * h; b.y += b.vy * h;
    b.vx *= G.AIR; b.vy *= G.AIR;
  }
}

function groundCollide() {
  var i, b, pen, d;
  for (i = 0; i < G.blocks.length; i++) {
    b = G.blocks[i]; if (b.dead) continue;
    pen = (b.y + b.h / 2) - G.GROUND_Y;
    if (pen > 0) {
      b.y -= pen;
      if (b.vy > 0) {
        d = Math.abs(b.vy) * b.mass * 0.04;
        if (d > 6) damageBlock(b, d);
        b.vy = -b.vy * 0.18;
      }
      b.vx *= 0.72; b.vy *= 0.75;
    }
  }
  for (i = 0; i < G.pigs.length; i++) {
    b = G.pigs[i]; if (b.dead) continue;
    pen = (b.y + b.r) - G.GROUND_Y;
    if (pen > 0) {
      b.y -= pen;
      if (b.vy > 0) {
        d = Math.abs(b.vy) * b.mass * 0.05;
        if (d > 12) damagePig(b, d * 1.6);
        b.vy = -b.vy * 0.2;
      }
      b.vx *= 0.7; b.vy *= 0.8;
    }
  }
  if (G.flying && G.flying.state === 'fly' && G.flying.y + G.flying.r > G.GROUND_Y) {
    b = G.flying;
    b.y = G.GROUND_Y - b.r;
    if (Math.abs(b.vy) < 60) { b.vx *= 0.6; b.vy = 0; }
    else { b.vy = -b.vy * 0.28; b.vx *= 0.75; G.SFX.hit(); }
  }
  for (i = 0; i < G.extraFlyers.length; i++) {
    b = G.extraFlyers[i];
    if (b.y + b.r > G.GROUND_Y) { b.y = G.GROUND_Y - b.r; b.vx *= 0.6; b.vy = 0; }
  }
}

function circleBox(c, b) {
  var cx = clamp(c.x, b.x - b.w / 2, b.x + b.w / 2);
  var cy = clamp(c.y, b.y - b.h / 2, b.y + b.h / 2);
  var dx = c.x - cx, dy = c.y - cy, d = Math.sqrt(dx * dx + dy * dy);
  if (d > c.r) return null;
  var nx, ny, pen;
  if (d < 0.0001) {
    var ox = c.x - b.x, oy = c.y - b.y;
    if (Math.abs(ox) / (b.w / 2) > Math.abs(oy) / (b.h / 2)) { nx = ox > 0 ? 1 : -1; ny = 0; }
    else { nx = 0; ny = oy > 0 ? 1 : -1; }
    pen = c.r + Math.min(b.w, b.h) / 2;
  } else {
    nx = dx / d; ny = dy / d; pen = c.r - d;
  }
  return { nx: nx, ny: ny, pen: pen };
}

function resolvePair(c, b, n, pen) {
  var tot = c.mass + b.mass;
  c.x += n.nx * pen * (b.mass / tot);
  c.y += n.ny * pen * (b.mass / tot);
  b.x -= n.nx * pen * (c.mass / tot);
  b.y -= n.ny * pen * (c.mass / tot);
  var rvx = c.vx - b.vx, rvy = c.vy - b.vy;
  var vn = rvx * n.nx + rvy * n.ny;
  if (vn > 0) return 0;
  var j = -(1 + 0.22) * vn / (1 / c.mass + 1 / b.mass);
  c.vx += j * n.nx / c.mass; c.vy += j * n.ny / c.mass;
  b.vx -= j * n.nx / b.mass; b.vy -= j * n.ny / b.mass;
  return Math.abs(j);
}

function damageBlock(b, d) {
  if (b.dead || d < 6) return;
  b.hp -= d;
  if (b.hp <= 0) {
    b.dead = true;
    addScore(G.MAT[b.m].sc);
    if (G.SFX[G.MAT[b.m].sfx]) G.SFX[G.MAT[b.m].sfx]();
    for (var i = 0; i < 8; i++) {
      G.parts.push({
        x: b.x + rnd(-b.w / 2, b.w / 2), y: b.y + rnd(-b.h / 2, b.h / 2),
        vx: rnd(-160, 160), vy: rnd(-260, -40), life: rnd(0.4, 0.9),
        c: G.MAT[b.m].fill, s: rnd(3, 7)
      });
    }
  }
}
G.damageBlock = damageBlock;

function damagePig(p, d) {
  if (p.dead || d < 10) return;
  p.hp -= d;
  if (p.hp <= 0) {
    p.dead = true;
    G.save.kills++;
    addScore(5000);
    G.pops.push({ x: p.x, y: p.y, t: 1, txt: '+5000' });
    G.SFX.pig(); G.vibe(30);
    for (var i = 0; i < 10; i++) {
      G.parts.push({
        x: p.x, y: p.y, vx: rnd(-200, 200), vy: rnd(-300, -60),
        life: rnd(0.4, 1.0), c: i % 2 ? '#8ed14b' : '#6fae2f', s: rnd(3, 8)
      });
    }
  }
}
G.damagePig = damagePig;

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
  var vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (vn < 0) {
    var j = -(1 + 0.15) * vn / (1 / a.mass + 1 / b.mass);
    a.vx -= j * nx / a.mass; a.vy -= j * ny / a.mass;
    b.vx += j * nx / b.mass; b.vy += j * ny / b.mass;
    var dmg = Math.abs(j) * 0.02;
    if (dmg > 6) { damageBlock(a, dmg); damageBlock(b, dmg); }
  }
  a.vx *= 0.9; b.vx *= 0.9;
}

function collideAll() {
  var list = bodies(), i, j, a, b, imp, n, dx, dy, d, rr, circle, box, hit;
  for (i = 0; i < list.length; i++) {
    a = list[i];
    if (a.dead) continue;
    for (j = 0; j < list.length; j++) {
      b = list[j];
      if (b === a || b.dead) continue;
      if (a.box && b.box) continue;
      if (!a.box && !b.box) {
        dx = b.x - a.x; dy = b.y - a.y; d = Math.sqrt(dx * dx + dy * dy);
        rr = a.r + b.r;
        if (d < rr && d > 0.0001) {
          n = { nx: dx / d, ny: dy / d, pen: rr - d };
          imp = resolvePair(a, b, n, n.pen);
          if (imp > 5) {
            if (a.type === 'pig') damagePig(a, imp * 1.6);
            if (b.type === 'pig') damagePig(b, imp * 1.6);
            if (imp > 45) G.SFX.hit();
          }
        }
      } else {
        circle = a.box ? b : a;
        box = a.box ? a : b;
        hit = circleBox(circle, box);
        if (hit) {
          imp = resolvePair(circle, box, hit, hit.pen);
          if (imp > 4) {
            damageBlock(box, imp * 0.02);
            if (circle.type === 'pig') damagePig(circle, imp * 1.2);
          }
        }
      }
    }
  }
  for (i = 0; i < G.blocks.length; i++) {
    if (G.blocks[i].dead) continue;
    for (j = i + 1; j < G.blocks.length; j++) {
      if (G.blocks[j].dead) continue;
      boxBox(G.blocks[i], G.blocks[j]);
    }
  }
}

G.physics = function (dt) {
  var sub = 4, h = dt / sub, i;
  for (i = 0; i < sub; i++) {
    integrate(h);
    groundCollide();
    collideAll();
  }
};

/* ---------- ход игры ---------- */
G.startLevel = function (n) {
  G.level = n;
  var data = G.buildLevel(n);
  G.blocks = data.blocks;
  G.pigs = data.pigs;
  G.parts = []; G.pops = []; G.extraFlyers = [];
  G.score = 0;
  G.shotsFired = 0;
  G.pigsAtStart = G.pigs.length;
  G.baseScore = G.pigsAtStart * 5000 + G.blocks.length * 500;
  G.birdsLeft = G.birdList(n);
  G.flying = null;
  G.active = {
    type: G.birdsLeft.shift(), x: G.SLING_X, y: G.SLING_Y, r: 22,
    state: 'ready', used: false, mass: 8
  };
  G.loseTimer = 0;
  G.state = 'play';
  G.musicStart();
  G.store();
  return data;
};

G.shoot = function () {
  if (!G.active || G.active.state !== 'ready') return false;
  var dx = G.SLING_X - G.active.x, dy = G.SLING_Y - G.active.y;
  if (Math.sqrt(dx * dx + dy * dy) < 12) {
    G.active.x = G.SLING_X; G.active.y = G.SLING_Y;
    return false;
  }
  G.active.state = 'fly';
  G.active.vx = dx * G.POWER;
  G.active.vy = dy * G.POWER;
  G.flying = G.active;
  G.active = null;
  G.shotsFired++; G.save.shots++; G.store();
  G.SFX.shot(); G.vibe(20);
  return true;
};

function pushParts(x, y, count, color) {
  for (var i = 0; i < count; i++) {
    G.parts.push({
      x: x, y: y, vx: rnd(-160, 160), vy: rnd(-200, 120),
      life: rnd(0.2, 0.6), c: color, s: rnd(3, 7)
    });
  }
}

G.explode = function (x, y, radius, force) {
  var i, b, dx, dy, d, f;
  G.SFX.boom(); G.vibe(60);
  for (i = 0; i < 26; i++) {
    G.parts.push({
      x: x, y: y, vx: rnd(-420, 420), vy: rnd(-420, 200), life: rnd(0.3, 0.9),
      c: i % 3 === 0 ? '#ffd34d' : (i % 3 === 1 ? '#ff7a4d' : '#ffe9a8'), s: rnd(3, 9)
    });
  }
  for (i = 0; i < G.blocks.length; i++) {
    b = G.blocks[i]; if (b.dead) continue;
    dx = b.x - x; dy = b.y - y; d = Math.sqrt(dx * dx + dy * dy) || 1;
    if (d < radius) {
      f = (1 - d / radius) * force;
      b.vx += (dx / d) * f / b.mass * 0.35;
      b.vy += (dy / d) * f / b.mass * 0.35 - 30;
      damageBlock(b, f * 0.05);
    }
  }
  for (i = 0; i < G.pigs.length; i++) {
    b = G.pigs[i]; if (b.dead) continue;
    dx = b.x - x; dy = b.y - y; d = Math.sqrt(dx * dx + dy * dy) || 1;
    if (d < radius) {
      f = (1 - d / radius) * force;
      b.vx += (dx / d) * f / b.mass * 0.2;
      b.vy += (dy / d) * f / b.mass * 0.2 - 20;
      damagePig(b, f * 0.12);
    }
  }
};

G.useAbility = function () {
  var f = G.flying;
  if (!f || f.state !== 'fly' || f.used) return false;
  if (f.type === 'yellow') {
    f.vx *= 1.9; f.vy *= 1.9; f.used = true;
    G.SFX.shot();
    pushParts(f.x, f.y, 8, '#f5c542');
  } else if (f.type === 'blue') {
    f.used = true;
    for (var k = -1; k <= 1; k += 2) {
      G.extraFlyers.push({
        type: 'blue', x: f.x, y: f.y, r: 16, state: 'fly', used: true, mass: 4,
        vx: f.vx * 0.9, vy: f.vy + k * 220
      });
    }
    G.SFX.shot();
  } else if (f.type === 'black') {
    G.explode(f.x, f.y, 190, 2600);
    G.flying = null;
    G.nextBird();
  } else {
    return false;
  }
  return true;
};

G.nextBird = function () {
  if (G.birdsLeft.length) {
    G.active = {
      type: G.birdsLeft.shift(), x: G.SLING_X, y: G.SLING_Y, r: 22,
      state: 'ready', used: false, mass: 8
    };
  } else {
    G.active = null;
  }
};

G.alivePigs = function () {
  var n = 0, i;
  for (i = 0; i < G.pigs.length; i++) if (!G.pigs[i].dead) n++;
  return n;
};

/* Возвращает 'win', 'lose' или null */
G.checkEnd = function (dt) {
  var alive = G.alivePigs(), i;

  if (alive === 0 && G.state === 'play') {
    G.state = 'win';
    var left = (G.active ? 1 : 0) + G.birdsLeft.length;
    if (left > 0) addScore(left * 10000);
    if (G.shotsFired <= G.pigsAtStart) G.save.perfect++;
    var stars = 1;
    if (G.score >= G.baseScore * 1.45) stars = 2;
    if (G.score >= G.baseScore * 2.0) stars = 3;
    var prev = G.save.levels[G.level] | 0;
    if (stars > prev) G.save.levels[G.level] = stars;
    var coins = 120 + stars * 60;
    if (G.save.items.storage) coins = Math.round(coins * 1.25);
    G.save.coins += coins;
    G.store();
    G.checkAchievements();
    G.SFX.win();
    G.lastWin = { stars: stars, coins: coins, score: G.score };
    G.musicStop();
    return 'win';
  }

  var noAmmo = (G.active === null) && (G.flying === null) &&
               G.birdsLeft.length === 0 && G.extraFlyers.length === 0;
  if (G.state === 'play' && alive > 0 && noAmmo) {
    G.loseTimer += dt;
    if (G.loseTimer > 1.4) {
      G.state = 'lose';
      G.SFX.lose();
      G.musicStop();
      return 'lose';
    }
  } else {
    G.loseTimer = 0;
  }
  return null;
};

/* ---------- достижения ---------- */
G.ACH = [
  { id: 'a1',  n: 'Первый выстрел',     d: 'Запусти первую птицу',           f: function () { return G.save.shots >= 1; } },
  { id: 'a2',  n: 'Стрелок',            d: 'Сделай 10 выстрелов',            f: function () { return G.save.shots >= 10; } },
  { id: 'a3',  n: 'Снайпер',            d: 'Сделай 100 выстрелов',           f: function () { return G.save.shots >= 100; } },
  { id: 'a4',  n: 'Охотник',            d: 'Убей 10 свиней',                 f: function () { return G.save.kills >= 10; } },
  { id: 'a5',  n: 'Гроза свиней',       d: 'Убей 50 свиней',                 f: function () { return G.save.kills >= 50; } },
  { id: 'a6',  n: 'Мясник',             d: 'Убей 250 свиней',                f: function () { return G.save.kills >= 250; } },
  { id: 'a7',  n: 'Легенда',            d: 'Убей 1000 свиней',               f: function () { return G.save.kills >= 1000; } },
  { id: 'a8',  n: 'Начало',             d: 'Пройди уровень 1',               f: function () { return (G.save.levels[1] | 0) > 0; } },
  { id: 'a9',  n: 'Пятёрка',            d: 'Пройди 5 уровней',               f: function () { return G.levelsDone() >= 5; } },
  { id: 'a10', n: 'Десятка',            d: 'Пройди 10 уровней',              f: function () { return G.levelsDone() >= 10; } },
  { id: 'a11', n: 'Половина пути',      d: 'Пройди 25 уровней',              f: function () { return G.levelsDone() >= 25; } },
  { id: 'a12', n: 'Победитель',         d: 'Пройди все 50 уровней',          f: function () { return G.levelsDone() >= 50; } },
  { id: 'a13', n: 'Три звезды',         d: 'Получи 3 звезды на уровне',      f: function () { var k; for (k in G.save.levels) if (G.save.levels[k] === 3) return true; return false; } },
  { id: 'a14', n: '15 звёзд',           d: 'Собери 15 звёзд',                f: function () { return G.starsTotal() >= 15; } },
  { id: 'a15', n: '50 звёзд',           d: 'Собери 50 звёзд',                f: function () { return G.starsTotal() >= 50; } },
  { id: 'a16', n: '150 звёзд',          d: 'Собери все 150 звёзд',           f: function () { return G.starsTotal() >= 150; } },
  { id: 'a17', n: 'Без потерь',         d: 'Пройди уровень без потерь птиц', f: function () { return G.save.perfect >= 1; } },
  { id: 'a18', n: 'Мастер',             d: '10 уровней без потерь',          f: function () { return G.save.perfect >= 10; } },
  { id: 'a19', n: 'Богач',              d: 'Имей 2000 монет',                f: function () { return G.save.coins >= 2000; } },
  { id: 'a20', n: 'Покупатель',         d: 'Купи 3 предмета в магазине',     f: function () { var c = 0, k; for (k in G.save.items) c++; return c >= 3; } }
];

G.checkAchievements = function () {
  var got = 0, i, a, ok;
  for (i = 0; i < G.ACH.length; i++) {
    a = G.ACH[i];
    if (!G.save.ach[a.id]) {
      ok = false;
      try { ok = !!a.f(); } catch (e) { ok = false; }
      if (ok) { G.save.ach[a.id] = 1; G.save.coins += 200; got++; G.SFX.star(); }
    }
  }
  if (got) G.store();
  return got;
};

G.itemsOwned = function () { var c = 0, k; for (k in G.save.items) c++; return c; };
G.achCount = function () { var c = 0, k; for (k in G.save.ach) c++; return c; };

/* ---------- магазин ---------- */
G.ITEMS = [
  { id: 'blue',    ic: '🟦', t: 'Синяя птица',    d: '+1 синяя: в полёте делится на три',  p: 300 },
  { id: 'bomb',    ic: '⬛', t: 'Птица-бомба',    d: '+1 чёрная: взрывает постройки',      p: 500 },
  { id: 'golden',  ic: '🟨', t: 'Золотая птица',  d: '+1 жёлтая: ускоряется по тапу',      p: 800 },
  { id: 'extra',   ic: '🔴', t: 'Запасная птица', d: '+1 обычная птица на каждый уровень', p: 250 },
  { id: 'storage', ic: '📦', t: 'Кладовая',       d: '+25% монет за каждый уровень',       p: 400 }
];

G.buy = function (id) {
  var i, item = null;
  for (i = 0; i < G.ITEMS.length; i++) if (G.ITEMS[i].id === id) item = G.ITEMS[i];
  if (!item || G.save.items[id]) return 'owned';
  if (G.save.coins < item.p) return 'poor';
  G.save.coins -= item.p;
  G.save.items[id] = 1;
  G.save.spent += item.p;
  G.store();
  G.checkAchievements();
  return 'ok';
};

return G;
})();
