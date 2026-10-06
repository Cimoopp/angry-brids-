/* ============================================================
   ANGRY BIRDS — физика и игровая логика
   Дополняет engine.js: уровни, столкновения, выстрел, способности
   ============================================================ */
(function () {
'use strict';

var G = window.ABG;
if (!G) { console.error('ABG не загружен'); return; }

var FIXED = 1 / 120;
var MAX_SUB = 5;

function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

/* Материалы: если engine.js их не задал — берём запасные. */
var MAT = G.MAT || {
  wood:  { hp: 120, fill: '#c1873f', edge: '#8a5a25', mass: 1.0 },
  ice:   { hp: 70,  fill: '#a8e0f5', edge: '#6fb8dd', mass: 0.8 },
  stone: { hp: 260, fill: '#9aa3ad', edge: '#6c757e', mass: 1.7 }
};
G.MAT = MAT;

/* ---------- уровни: генератор на 50 штук ---------- */
var LEVELS = [];
(function buildLevels() {
  var mats = ['wood', 'ice', 'stone'];
  for (var n = 1; n <= 50; n++) {
    var pigs = 1 + Math.floor((n - 1) / 12);
    if (pigs > 5) pigs = 5;
    var birds = clamp(2 + Math.floor(n / 14), 2, 6);
    var towers = 1 + (n > 8 ? 1 : 0) + (n > 22 ? 1 : 0) + (n > 36 ? 1 : 0);
    var rows = 1 + Math.floor((n - 1) / 18);
    if (rows > 3) rows = 3;
    var list = [];
    for (var t = 0; t < towers; t++) {
      var bx = 900 + t * 230;
      for (var r = 0; r < rows; r++) {
        var mat = mats[(n + r + t) % 3];
        if (r % 2 === 0) {
          list.push({ x: bx + 46, y: G.GROUND_Y - 20 - r * 62, w: 92, h: 34, m: mat });
          list.push({ x: bx - 46, y: G.GROUND_Y - 20 - r * 62, w: 92, h: 34, m: mat, stat: true });
        } else {
          list.push({ x: bx, y: G.GROUND_Y - 20 - r * 62, w: 120, h: 30, m: mat });
        }
      }
    }
    var plist = [];
    for (var p = 0; p < pigs; p++) {
      plist.push({ x: 990 + p * 215 + (p % 2) * 40, y: G.GROUND_Y - 46 });
    }
    var btypes = ['red', 'yellow', 'blue', 'black'];
    var blist = [];
    for (var b = 0; b < birds; b++) blist.push(btypes[(n + b) % 4]);
    LEVELS.push({ blocks: list, pigs: plist, birds: blist });
  }
})();

function makeBlock(cfg) {
  var m = MAT[cfg.m] || MAT.wood;
  return {
    x: cfg.x, y: cfg.y, w: cfg.w, h: cfg.h,
    vx: 0, vy: 0, m: cfg.m, static: !!cfg.stat,
    hp: m.hp, max: m.hp, dead: false, still: 0, hit: 0
  };
}

function makePig(cfg) {
  var r = 22;
  var hp = Math.round(55 + r * 1.6);
  return { x: cfg.x, y: cfg.y, r: r, vx: 0, vy: 0, hp: hp, max: hp, dead: false, still: 0 };
}

/* ---------- запуск уровня ---------- */
G.startLevel = function (n) {
  n = clamp(n | 0, 1, 50);
  var L = LEVELS[n - 1];
  G.level = n;
  G.ended = false;
  G.winT = 0;
  G.loseT = 0;
  G.score = 0;
  G.shots = 0;
  G.extraFlyers = [];
  G.parts = [];
  G.pops = [];
  G.flying = null;
  G.blocks = [];
  G.pigs = [];
  G.birdsLeft = [];
  var i;
  for (i = 0; i < L.blocks.length; i++) G.blocks.push(makeBlock(L.blocks[i]));
  for (i = 0; i < L.pigs.length; i++) G.pigs.push(makePig(L.pigs[i]));
  for (i = 0; i < L.birds.length; i++) G.birdsLeft.push(L.birds[i]);
  G.active = {
    type: G.birdsLeft.shift(),
    x: G.SLING_X, y: G.SLING_Y,
    vx: 0, vy: 0,
    r: (G.BIRDS && G.BIRDS.red ? G.BIRDS.red.r : 17),
    state: 'ready', used: false
  };
  G.state = 'play';
  return true;
};

/* ---------- вспомогательное ---------- */
G.alivePigs = function () {
  var c = 0, i;
  for (i = 0; i < G.pigs.length; i++) if (!G.pigs[i].dead) c++;
  return c;
};

G.nextBird = function () {
  if (G.birdsLeft.length === 0) { G.active = null; return; }
  var t = G.birdsLeft.shift();
  G.active = {
    type: t, x: G.SLING_X, y: G.SLING_Y, vx: 0, vy: 0,
    r: (G.BIRDS && G.BIRDS[t] ? G.BIRDS[t].r : 17),
    state: 'ready', used: false
  };
};

G.ac = function () {
  if (G.save && G.save.sound !== false && G.SFX && G.SFX.pull) G.SFX.pull();
};

G.shoot = function () {
  var a = G.active;
  if (!a || a.state !== 'ready') return false;
  var dx = G.SLING_X - a.x, dy = G.SLING_Y - a.y;
  var d = Math.sqrt(dx * dx + dy * dy);
  if (d < 22) { a.x = G.SLING_X; a.y = G.SLING_Y; return false; }
  a.vx = dx * G.POWER;
  a.vy = dy * G.POWER;
  a.state = 'fly';
  G.flying = a;
  G.active = null;
  G.shots++;
  if (G.save && G.save.sound !== false && G.SFX && G.SFX.launch) G.SFX.launch();
  if (G.vibe) G.vibe(12);
  return true;
};

/* ---------- способности ---------- */
G.useAbility = function () {
  var f = G.flying;
  if (!f || f.used || f.state !== 'fly') return false;
  f.used = true;

  if (f.type === 'yellow') {
    var sp = Math.sqrt(f.vx * f.vx + f.vy * f.vy) || 1;
    f.vx = f.vx / sp * (sp * 2.1 + 260);
    f.vy = f.vy / sp * (sp * 2.1 + 260);
    if (G.SFX && G.SFX.boost) G.SFX.boost();
    G.pops.push({ x: f.x, y: f.y, txt: 'Вжух!', t: 1 });
  } else if (f.type === 'blue') {
    var ang = Math.atan2(f.vy, f.vx);
    for (var k = -1; k <= 1; k += 2) {
      G.extraFlyers.push({
        type: 'blue', x: f.x, y: f.y,
        vx: f.vx * 0.96, vy: f.vy * 0.96 + k * 190,
        r: f.r, state: 'fly', used: true, still: 0
      });
    }
    if (G.SFX && G.SFX.split) G.SFX.split();
  } else if (f.type === 'black') {
    explode(f.x, f.y, 190, 320);
  } else {
    if (G.SFX && G.SFX.hit) G.SFX.hit();
  }
  return true;
};

function explode(x, y, radius, power) {
  var i, b, d, k;
  for (i = 0; i < G.blocks.length; i++) {
    b = G.blocks[i];
    if (b.dead) continue;
    d = Math.hypot(b.x - x, b.y - y);
    if (d < radius) {
      b.hp -= power * (1 - d / radius);
      b.vx += (b.x - x) / (d + 1) * 320;
      b.vy += (b.y - y) / (d + 1) * 320 - 90;
      if (b.hp <= 0) killBlock(b);
    }
  }
  for (i = 0; i < G.pigs.length; i++) {
    var p = G.pigs[i];
    if (p.dead) continue;
    d = Math.hypot(p.x - x, p.y - y);
    if (d < radius) {
      p.hp -= power * 1.5 * (1 - d / radius);
      if (p.hp <= 0) killPig(p);
    }
  }
  for (i = 0; i < 34; i++) {
    var a = Math.random() * 6.284, v = 120 + Math.random() * 420;
    G.parts.push({
      x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120,
      s: 5 + Math.random() * 7, c: (Math.random() < 0.5 ? '#ffb03a' : '#ff5722'),
      life: 0.5 + Math.random() * 0.5
    });
  }
  if (G.vibe) G.vibe(70);
  if (G.SFX && G.SFX.boom) G.SFX.boom();
}

function killBlock(b) {
  if (b.dead) return;
  b.dead = true;
  var i;
  for (i = 0; i < 12; i++) {
    G.parts.push({
      x: b.x + (Math.random() - 0.5) * b.w, y: b.y + (Math.random() - 0.5) * b.h,
      vx: (Math.random() - 0.5) * 260, vy: -Math.random() * 260,
      s: 5 + Math.random() * 5, c: MAT[b.m].edge, life: 0.5 + Math.random() * 0.5
    });
  }
  G.score += 120;
  if (G.SFX && G.SFX.breakBlock) G.SFX.breakBlock();
}

function killPig(p) {
  if (p.dead) return;
  p.dead = true;
  var i;
  for (i = 0; i < 16; i++) {
    var a = Math.random() * 6.284, v = 90 + Math.random() * 260;
    G.parts.push({
      x: p.x, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      s: 5 + Math.random() * 6, c: '#8ed14b', life: 0.5 + Math.random() * 0.4
    });
  }
  G.score += 500;
  G.pops.push({ x: p.x, y: p.y - 10, txt: '+500', t: 1 });
  if (G.save) G.save.kills = (G.save.kills | 0) + 1;
  if (G.vibe) G.vibe(25);
  if (G.SFX && G.SFX.pig) G.SFX.pig();
}

/* ---------- столкновения ---------- */
function circleVsRect(cx, cy, r, b) {
  var hw = b.w / 2, hh = b.h / 2;
  var nx = clamp(cx, b.x - hw, b.x + hw);
  var ny = clamp(cy, b.y - hh, b.y + hh);
  var dx = cx - nx, dy = cy - ny;
  var d2 = dx * dx + dy * dy;
  if (d2 > r * r) return null;
  var d = Math.sqrt(d2) || 0.0001;
  return { nx: dx / d, ny: dy / d, depth: r - d };
}

function step(h) {
  var i, j, b, p;

  /* интеграция */
  for (i = 0; i < G.blocks.length; i++) {
    b = G.blocks[i];
    if (b.dead || b.static) continue;
    b.vy += G.GRAVITY * h;
    b.x += b.vx * h;
    b.y += b.vy * h;
    b.vx *= 0.999;
  }
  for (i = 0; i < G.pigs.length; i++) {
    p = G.pigs[i];
    if (p.dead) continue;
    p.vy += G.GRAVITY * h;
    p.x += p.vx * h;
    p.y += p.vy * h;
    p.vx *= 0.997;
  }

  var flyers = [];
  if (G.flying) flyers.push(G.flying);
  for (i = 0; i < G.extraFlyers.length; i++) flyers.push(G.extraFlyers[i]);
  for (i = 0; i < flyers.length; i++) {
    var f = flyers[i];
    f.vy += G.GRAVITY * h;
    f.x += f.vx * h;
    f.y += f.vy * h;
    f.vx *= 0.9995;
  }

  /* блок ↔ земля */
  for (i = 0; i < G.blocks.length; i++) {
    b = G.blocks[i];
    if (b.dead || b.static) continue;
    if (b.y + b.h / 2 > G.GROUND_Y) {
      b.y = G.GROUND_Y - b.h / 2;
      if (b.vy > 260) {
        b.hp -= (b.vy - 260) * 0.22;
        b.vx *= 0.6;
        if (b.hp <= 0) killBlock(b);
      }
      b.vy = 0;
      b.vx *= 0.82;
    }
  }

  /* блок ↔ блок */
  for (i = 0; i < G.blocks.length; i++) {
    b = G.blocks[i];
    if (b.dead) continue;
    for (j = i + 1; j < G.blocks.length; j++) {
      var o = G.blocks[j];
      if (o.dead || (b.static && o.static)) continue;
      var dx = o.x - b.x, px2 = (b.w + o.w) / 2 - Math.abs(dx);
      if (px2 <= 0) continue;
      var dy = o.y - b.y, py2 = (b.h + o.h) / 2 - Math.abs(dy);
      if (py2 <= 0) continue;
      var mv = Math.min(px2, py2);
      var imp = Math.abs(b.vx - o.vx) + Math.abs(b.vy - o.vy);
      if (imp > 300) {
        b.hp -= imp * 0.055;
        o.hp -= imp * 0.055;
        if (b.hp <= 0) killBlock(b);
        if (o.hp <= 0) killBlock(o);
      }
      if (b.static) {
        o.x -= Math.sign(dx || 1) * mv;
        o.vx = -o.vx * 0.25;
      } else if (o.static) {
        b.x += Math.sign(dx || 1) * mv;
        b.vx = -b.vx * 0.25;
      } else if (px2 < py2) {
        var s2 = Math.sign(dx || 1) * mv / 2;
        b.x -= s2; o.x += s2;
        b.vx = -b.vx * 0.3; o.vx = -o.vx * 0.3;
      } else {
        var s3 = Math.sign(dy || 1) * mv / 2;
        b.y -= s3; o.y += s3;
        b.vy = -b.vy * 0.2; o.vy = -o.vy * 0.2;
        if (b.vy > 0) b.vy = 0;
        if (o.vy > 0) o.vy = 0;
      }
    }
  }

  /* свиньи: земля, блоки, птицы */
  for (i = 0; i < G.pigs.length; i++) {
    p = G.pigs[i];
    if (p.dead) continue;
    if (p.y + p.r > G.GROUND_Y) {
      p.y = G.GROUND_Y - p.r;
      if (p.vy > 520) { p.hp -= (p.vy - 520) * 0.5; if (p.hp <= 0) killPig(p); }
      p.vy = 0;
      p.vx *= 0.86;
    }
    for (j = 0; j < G.blocks.length; j++) {
      b = G.blocks[j];
      if (b.dead) continue;
      var c = circleVsRect(p.x, p.y, p.r, b);
      if (!c) continue;
      p.x -= c.nx * c.depth;
      p.y -= c.ny * c.depth;
      var rel = Math.abs(p.vx - b.vx) + Math.abs(p.vy - b.vy);
      if (rel > 300) { b.hp -= rel * 0.05; if (b.hp <= 0) killBlock(b); }
      if (rel > 600) { p.hp -= (rel - 600) * 0.35; if (p.hp <= 0) killPig(p); }
      p.vx = -p.vx * 0.28;
      p.vy = -p.vy * 0.28;
    }
    for (j = 0; j < flyers.length; j++) {
      var fb = flyers[j];
      var dd = Math.hypot(fb.x - p.x, fb.y - p.y);
      if (dd < fb.r + p.r) {
        var push = (fb.r + p.r - dd);
        var ux = (p.x - fb.x) / (dd || 1), uy = (p.y - fb.y) / (dd || 1);
        p.x += ux * push; p.y += uy * push;
        p.vx += ux * 240; p.vy += uy * 240 - 60;
        var e = Math.abs(fb.vx) + Math.abs(fb.vy);
        if (fb.type === 'black') p.hp -= 999; else p.hp -= Math.max(12, e * 0.24);
        if (p.hp <= 0) killPig(p);
        fb.vx *= 0.72; fb.vy *= 0.72;
        if (G.SFX && G.SFX.hit) G.SFX.hit();
      }
    }
  }

  /* птицы ↔ блоки, земля */
  for (i = 0; i < flyers.length; i++) {
    var f2 = flyers[i];
    if (f2.y + f2.r > G.GROUND_Y) {
      f2.y = G.GROUND_Y - f2.r;
      f2.vy = -f2.vy * 0.25;
      f2.vx *= 0.7;
    }
    for (j = 0; j < G.blocks.length; j++) {
      b = G.blocks[j];
      if (b.dead) continue;
      var cc = circleVsRect(f2.x, f2.y, f2.r, b);
      if (!cc) continue;
      f2.x -= cc.nx * cc.depth;
      f2.y -= cc.ny * cc.depth;
      var sp = Math.sqrt(f2.vx * f2.vx + f2.vy * f2.vy);
      if (sp > 90) {
        var mult = (f2.type === 'black') ? 1.6 : 1;
        b.hp -= sp * 0.16 * mult;
        b.vx += f2.vx * 0.12;
        b.vy += f2.vy * 0.12;
        if (b.hp <= 0) killBlock(b);
      }
      f2.vx *= 0.62; f2.vy *= 0.62;
      if (f2 === G.flying && !f2.used && f2.type === 'black') { explode(f2.x, f2.y, 170, 300); f2.used = true; }
      if (G.SFX && G.SFX.hit) G.SFX.hit();
    }
  }
}

G.physics = function (dt) {
  var sub = clamp(Math.round(dt / FIXED), 1, MAX_SUB);
  var h = dt / sub;
  for (var s = 0; s < sub; s++) step(h);
};

/* ---------- конец уровня ---------- */
G.checkEnd = function (dt) {
  if (G.ended) return null;

  if (G.alivePigs() === 0) {
    G.winT += dt;
    if (G.winT > 0.75) {
      G.ended = true;
      G.state = 'over';
      if (G.finishLevel) G.finishLevel();
      else G.lastWin = { stars: 3, coins: 100, score: G.score };
      if (G.SFX && G.SFX.win) G.SFX.win();
      return 'win';
    }
    return null;
  }

  if (!G.flying && !G.active && G.birdsLeft.length === 0) {
    G.loseT += dt;
    if (G.loseT > 0.65) {
      G.ended = true;
      G.state = 'over';
      return 'lose';
    }
  } else {
    G.loseT = 0;
  }
  return null;
};

})();
