/* ============================================================
   ANGRY BIRDS — физика, уровни, способности птиц
   Дополняет engine.js. Экспорт: G.startLevel / G.physics / G.shoot
   ============================================================ */
(function () {
'use strict';

var G = window.ABG;
if (!G) { console.error('ABG не загружен'); return; }

var FIX = 1 / 120;
var MAXSUB = 5;
var REST = 0.22;
var FRIC = 0.86;

function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function rnd(a, b) { return a + Math.random() * (b - a); }
function len(x, y) { return Math.sqrt(x * x + y * y); }

/* ---------- создание тел ---------- */
function block(x, y, w, h, mat, stat) {
  var m = G.MAT[mat];
  var b = {
    k: 'b', x: x, y: y, w: w, h: h, vx: 0, vy: 0, m: mat, static: !!stat,
    hp: m.hp, max: m.hp, dead: false, still: 0, tilt: 0
  };
  G.blocks.push(b);
  return b;
}

function pig(x, y, r) {
  var hp = Math.round(48 + r * 3.6);
  var p = { k: 'p', x: x, y: y, r: r, vx: 0, vy: 0, hp: hp, max: hp, dead: false, still: 0 };
  G.pigs.push(p);
  return p;
}

function bird(type, x, y) {
  var B = G.BIRDS[type];
  return { k: 'f', type: type, x: x, y: y, vx: 0, vy: 0, r: B.r, mass: B.mass,
           state: 'idle', used: false, dead: false, still: 0 };
}

/* ---------- генератор 50 уровней ---------- */
function buildLevel(n) {
  G.blocks = []; G.pigs = []; G.parts = []; G.pops = [];
  G.extraFlyers = [];
  var mats = ['wood', 'wood', 'wood', 'ice', 'stone'];
  var mat = mats[clamp(Math.floor((n - 1) / 10), 0, 4)];
  var mat2 = n > 30 ? 'stone' : (n > 15 ? 'ice' : 'wood');
  var pigs = clamp(1 + Math.floor((n - 1) / 6), 1, 7);
  var kind = (n - 1) % 6;
  var i, rows, cols;

  if (kind === 0) {                       // башня
    rows = 2 + Math.floor(pigs / 2);
    for (i = 0; i < rows; i++) {
      var by = G.GROUND_Y - 30 - i * 62;
      block(880, by, 22, 60, i % 3 === 2 ? mat2 : mat);
      block(965, by, 22, 60, i % 3 === 2 ? mat2 : mat);
      block(922, by - 31, 110, 18, i % 2 ? mat2 : mat);
    }
    for (i = 0; i < pigs; i++) pig(922, G.GROUND_Y - 28 - i * 68, 22);
  } else if (kind === 1) {                // домик
    block(860, G.GROUND_Y - 70, 20, 140, mat);
    block(1010, G.GROUND_Y - 70, 20, 140, mat);
    block(935, G.GROUND_Y - 152, 190, 20, mat2);
    for (i = 0; i < pigs; i++) pig(900 + (i % 3) * 45, G.GROUND_Y - 30 - Math.floor(i / 3) * 46, 20);
  } else if (kind === 2) {                // пирамида
    rows = 2 + Math.floor(pigs / 2);
    for (i = 0; i < rows; i++) {
      var w = 150 - i * 26, y = G.GROUND_Y - 32 - i * 62;
      block(935, y, w, 60, i % 2 ? mat : mat2);
    }
    for (i = 0; i < pigs; i++) pig(935, G.GROUND_Y - 28 - i * 66, 22);
  } else if (kind === 3) {                // мост
    block(830, G.GROUND_Y - 60, 22, 120, mat);
    block(1040, G.GROUND_Y - 60, 22, 120, mat);
    for (i = 0; i < 4; i++) block(870 + i * 52, G.GROUND_Y - 132, 50, 20, mat2);
    for (i = 0; i < pigs; i++) pig(870 + (i % 4) * 50, G.GROUND_Y - 30, 20);
  } else if (kind === 4) {                // две башни
    for (i = 0; i < 2; i++) {
      block(880, G.GROUND_Y - 45, 22, 90, mat);
      block(950, G.GROUND_Y - 45, 22, 90, mat);
      block(915, G.GROUND_Y - 100, 100, 18, mat2);
      if (i === 0) {
        for (var j = 0; j < pigs; j++) pig(915, G.GROUND_Y - 30 - j * 40, 18);
      } else {
        block(880 + 0, G.GROUND_Y - 150, 22, 80, mat);
        block(950, G.GROUND_Y - 150, 22, 80, mat);
        block(915, G.GROUND_Y - 200, 100, 18, mat2);
      }
    }
    pig(915, G.GROUND_Y - 230, 20);
  } else {                                // крепость
    cols = 3;
    for (i = 0; i < cols; i++) {
      block(850 + i * 80, G.GROUND_Y - 70, 24, 140, mat);
      block(850 + i * 80, G.GROUND_Y - 165, 24, 50, mat2);
    }
    block(930, G.GROUND_Y - 200, 240, 22, mat2);
    for (i = 0; i < pigs; i++) pig(870 + (i % 3) * 65, G.GROUND_Y - 30 - Math.floor(i / 3) * 48, 20);
  }

  /* земля как статичное тело */
  block(1150, G.GROUND_Y + 60, 2400, 120, 'stone', true);
  return pigs;
}

/* ---------- запуск уровня ---------- */
G.startLevel = function (n) {
  G.level = clamp(n, 1, G.TOTAL_LEVELS);
  G.score = 0; G.combo = 0; G.comboT = 0; G.winT = 0; G.loseT = 0;
  G.state = 'play'; G.ended = false; G.lastWin = null;
  G.extraFlyers = []; G.flying = null;
  buildLevel(G.level);
  var cnt = Math.min(3, 1 + Math.floor(G.level / 14));
  G.birdsLeft = [];
  for (var i = 0; i < cnt; i++) {
    var t = 'red';
    if (i === 1 && G.level >= 4) t = (G.save.items.blue ? 'blue' : 'yellow');
    if (i === 2 && G.level >= 12) t = 'black';
    G.birdsLeft.push(t);
  }
  G.nextBird();
  return true;
};

G.nextBird = function () {
  if (G.state !== 'play' && G.state !== 'idle') { /* продолжаем */ }
  if (G.birdsLeft.length === 0) { G.active = null; return false; }
  var t = G.birdsLeft.shift();
  var b = bird(t, G.SLING_X, G.SLING_Y - 6);
  b.state = 'ready';
  G.active = b;
  return true;
};

G.ac = function () { /* заглушка активации звука, переопределяется в engine.js */ };

G.shoot = function () {
  var a = G.active;
  if (!a || a.state !== 'ready') return false;
  var dx = G.SLING_X - a.x, dy = G.SLING_Y - a.y;
  if (len(dx, dy) < 12) return false;
  a.vx = dx * G.POWER;
  a.vy = dy * G.POWER;
  a.state = 'fly';
  a.x = G.SLING_X; a.y = G.SLING_Y;
  G.flying = a;
  G.active = null;
  G.SFX.launch();
  return true;
};

G.useAbility = function () {
  var f = G.flying;
  if (!f || f.used) return false;
  f.used = true;
  if (f.type === 'yellow') { f.vx *= 2.1; f.vy *= 1.25; G.SFX.hit(); }
  else if (f.type === 'blue') {
    for (var i = -1; i <= 1; i += 2) {
      var e = bird('blue', f.x, f.y);
      e.state = 'fly'; e.used = true; e.mass = 0.7;
      var ang = 0.42 * i, c = Math.cos(ang), s = Math.sin(ang);
      e.vx = f.vx * c - f.vy * s; e.vy = f.vx * s + f.vy * c;
      G.extraFlyers.push(e);
    }
    G.SFX.hit();
  } else if (f.type === 'black') {
    explode(f.x, f.y, 140, 320);
    f.dead = true; G.flying = null; G.nextBird();
  }
  return true;
};

function explode(x, y, rad, power) {
  var i, d, dx, dy;
  for (i = 0; i < 26; i++) {
    G.parts.push({ x: x, y: y, vx: rnd(-320, 320), vy: rnd(-380, 120),
                   s: rnd(4, 11), c: i % 3 === 0 ? '#ffcc33' : (i % 3 === 1 ? '#ff7a2f' : '#ffffff'),
                   life: rnd(0.35, 0.8) });
  }
  for (i = 0; i < G.blocks.length; i++) {
    var b = G.blocks[i]; if (b.dead) continue;
    dx = b.x - x; dy = b.y - y; d = len(dx, dy);
    if (d < rad + Math.max(b.w, b.h) * 0.5) {
      var f = power * (1 - d / (rad + 60));
      b.hp -= f * 0.5;
      if (!b.static) { b.vx += dx / (d || 1) * f * 0.55; b.vy += dy / (d || 1) * f * 0.55 - f * 0.2; }
      if (b.hp <= 0) killBlock(b, false);
    }
  }
  for (i = 0; i < G.pigs.length; i++) {
    var p = G.pigs[i]; if (p.dead) continue;
    dx = p.x - x; dy = p.y - y; d = len(dx, dy);
    if (d < rad + p.r) {
      var q = power * (1 - d / (rad + 60));
      p.hp -= q; p.vx += dx / (d || 1) * q * 0.5; p.vy += dy / (d || 1) * q * 0.5 - 60;
      if (p.hp <= 0) killPig(p);
    }
  }
  G.vibe(45);
}

function killBlock(b, silent) {
  if (b.dead) return;
  b.dead = true;
  G.score += 500;
  G.save.coins += 2;
  for (var i = 0; i < 10; i++) {
    G.parts.push({ x: b.x + rnd(-b.w / 2, b.w / 2), y: b.y + rnd(-b.h / 2, b.h / 2),
                   vx: rnd(-170, 170), vy: rnd(-260, 40), s: rnd(3, 8),
                   c: G.MAT[b.m].fill, life: rnd(0.4, 0.9) });
  }
  if (!silent) G.SFX.crash();
}

function killPig(p) {
  if (p.dead) return;
  p.dead = true;
  G.combo++; G.comboT = 1.1;
  var bonus = 1 + 0.25 * Math.max(0, G.combo - 1);
  var add = Math.round(5000 * bonus);
  G.score += add;
  G.save.coins += 25;
  G.save.kills = (G.save.kills || 0) + 1;
  G.pops.push({ x: p.x, y: p.y, txt: '+' + add, t: 1.2 });
  for (var i = 0; i < 16; i++) {
    G.parts.push({ x: p.x, y: p.y, vx: rnd(-230, 230), vy: rnd(-320, 60), s: rnd(3, 9),
                   c: i % 2 ? '#8ed14b' : '#d6f5a8', life: rnd(0.4, 0.9) });
  }
  G.SFX.pop();
  G.vibe(35);
}

/* ---------- физика ---------- */
function hitDamage(speed, mass) { return Math.max(0, (speed - 130) * mass * 0.07); }

function blockVsGround(b) {
  if (b.static) return;
  var half = b.h / 2;
  if (b.y + half > G.GROUND_Y) {
    b.y = G.GROUND_Y - half;
    var sp = Math.abs(b.vy);
    b.vy = -b.vy * REST;
    b.vx *= FRIC;
    if (sp > 210) { b.hp -= hitDamage(sp, 1.1); if (b.hp <= 0) killBlock(b); }
    if (Math.abs(b.vy) < 22) b.vy = 0;
  }
}

function pairBlocks(a, b) {
  if (a.dead || b.dead) return;
  if (a.static && b.static) return;
  var ox = (a.w + b.w) / 2 - Math.abs(a.x - b.x);
  var oy = (a.h + b.h) / 2 - Math.abs(a.y - b.y);
  if (ox <= 0 || oy <= 0) return;
  var rel = len(a.vx - b.vx, a.vy - b.vy);
  var aS = a.static ? 1e6 : 1, bS = b.static ? 1e6 : 1;
  var sum = aS + bS;
  if (ox < oy) {
    var sx = a.x < b.x ? -ox : ox;
    if (!a.static) { a.x += sx * (bS / sum); a.vx *= 0.5; }
    if (!b.static) { b.x -= sx * (aS / sum); b.vx *= 0.5; }
    if (!a.static) a.vx += (a.x < b.x ? -rel : rel) * 0.02;
  } else {
    var sy = a.y < b.y ? -oy : oy;
    if (!a.static) { a.y += sy * (bS / sum); a.vy *= 0.35; }
    if (!b.static) { b.y -= sy * (aS / sum); b.vy *= 0.35; }
    if (!a.static && Math.abs(a.vy) < 20) a.vy = 0;
    if (!b.static && Math.abs(b.vy) < 20) b.vy = 0;
  }
  if (rel > 240) {
    var d = hitDamage(rel, 1.0);
    a.hp -= d * 0.55; b.hp -= d * 0.55;
    if (a.hp <= 0) killBlock(a);
    if (b.hp <= 0) killBlock(b);
    if (rel > 420) G.SFX.crash();
  }
}

function ballVsBlock(o, b) {
  if (b.dead) return;
  var cx = clamp(o.x, b.x - b.w / 2, b.x + b.w / 2);
  var cy = clamp(o.y, b.y - b.h / 2, b.y + b.h / 2);
  var dx = o.x - cx, dy = o.y - cy;
  var d = len(dx, dy);
  if (d >= o.r) return;
  var nx = d > 0.01 ? dx / d : 0, ny = d > 0.01 ? dy / d : -1;
  var push = o.r - d;
  o.x += nx * push; o.y += ny * push;
  var vn = o.vx * nx + o.vy * ny;
  o.vx -= 1.35 * vn * nx; o.vy -= 1.35 * vn * ny;
  var sp = Math.abs(vn);
  var dmg = hitDamage(sp, o.k === 'f' ? o.mass * 1.6 : 0.7);
  if (dmg > 0) {
    b.hp -= dmg;
    if (!b.static) { b.vx += o.vx * 0.06; b.vy += o.vy * 0.05; }
    if (b.hp <= 0) killBlock(b);
    if (o.k === 'f' && sp > 380) G.SFX.hit();
  }
}

function ballVsPig(o, p) {
  if (p.dead) return;
  var dx = o.x - p.x, dy = o.y - p.y;
  var d = len(dx, dy), rr = o.r + p.r;
  if (d >= rr || d === 0) return;
  var nx = dx / d, ny = dy / d;
  o.x = p.x + nx * rr; o.y = p.y + ny * rr;
  var vn = o.vx * nx + o.vy * ny;
  o.vx -= 1.3 * vn * nx; o.vy -= 1.3 * vn * ny;
  p.vx -= o.vx * 0.22; p.vy -= o.vy * 0.16;
  var dmg = hitDamage(Math.abs(vn), o.k === 'f' ? o.mass * 1.9 : 0.8);
  p.hp -= dmg;
  if (p.hp <= 0) killPig(p);
}

function step(h) {
  var i, j, b, p, o;

  for (i = 0; i < G.blocks.length; i++) {
    b = G.blocks[i];
    if (b.static || b.dead) continue;
    b.vy += G.GRAVITY * h;
    b.x += b.vx * h; b.y += b.vy * h;
    b.vx *= 0.999;
  }
  for (i = 0; i < G.pigs.length; i++) {
    p = G.pigs[i];
    if (p.dead) continue;
    p.vy += G.GRAVITY * h;
    p.x += p.vx * h; p.y += p.vy * h;
    p.vx *= 0.995; p.vy *= 0.999;
    if (p.y + p.r > G.GROUND_Y) {
      p.y = G.GROUND_Y - p.r;
      var sp = Math.abs(p.vy);
      p.vy = -p.vy * 0.18;
      p.vx *= 0.8;
      if (sp > 420) { p.hp -= 22; if (p.hp <= 0) killPig(p); }
    }
  }

  for (i = 0; i < G.blocks.length; i++) blockVsGround(G.blocks[i]);

  for (i = 0; i < G.blocks.length; i++) {
    for (j = i + 1; j < G.blocks.length; j++) pairBlocks(G.blocks[i], G.blocks[j]);
  }

  var flyers = [];
  if (G.flying) flyers.push(G.flying);
  for (i = 0; i < G.extraFlyers.length; i++) flyers.push(G.extraFlyers[i]);

  for (i = 0; i < flyers.length; i++) {
    o = flyers[i];
    o.vy += G.GRAVITY * h;
    o.x += o.vx * h; o.y += o.vy * h;
    for (j = 0; j < G.blocks.length; j++) ballVsBlock(o, G.blocks[j]);
    for (j = 0; j < G.pigs.length; j++) ballVsPig(o, G.pigs[j]);
    if (o.y + o.r > G.GROUND_Y) {
      o.y = G.GROUND_Y - o.r;
      o.vy = -o.vy * 0.32;
      o.vx *= 0.82;
    }
  }

  for (i = 0; i < G.blocks.length; i++) {
    b = G.blocks[i];
    if (b.static || b.dead) continue;
    if (Math.abs(b.vx) < 6 && Math.abs(b.vy) < 6) { b.still += h; b.vx *= 0.9; b.vy *= 0.9; }
    else b.still = 0;
  }
  for (i = 0; i < G.pigs.length; i++) {
    p = G.pigs[i];
    if (p.dead) continue;
    if (Math.abs(p.vx) < 6 && Math.abs(p.vy) < 6) p.still += h; else p.still = 0;
  }
}

G.physics = function (dt) {
  var n = clamp(Math.ceil(dt / FIX), 1, MAXSUB);
  var h = dt / n;
  for (var i = 0; i < n; i++) step(h);
  if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) G.combo = 0; }
};

/* ---------- конец уровня ---------- */
G.alivePigs = function () {
  var c = 0;
  for (var i = 0; i < G.pigs.length; i++) if (!G.pigs[i].dead) c++;
  return c;
};

G.settle = function () {
  var i;
  for (i = 0; i < G.blocks.length; i++) {
    var b = G.blocks[i];
    if (!b.static && !b.dead && b.still < 0.35) return false;
  }
  for (i = 0; i < G.pigs.length; i++) {
    if (!G.pigs[i].dead && G.pigs[i].still < 0.35) return false;
  }
  if (G.flying && G.flying.state === 'fly') return false;
  if (G.extraFlyers.length) return false;
  return true;
};

G.checkEnd = function (dt) {
  if (G.ended) return null;

  if (G.alivePigs() === 0) {
    G.winT += dt;
    if (G.winT > 0.9) {
      G.ended = true;
      return G.finishLevel();
    }
    return null;
  }

  if (!G.active && !G.flying && G.birdsLeft.length === 0 && G.settle()) {
    G.loseT += dt;
    if (G.loseT > 0.7) {
      G.ended = true; G.state = 'over';
      return 'lose';
    }
  } else G.loseT = 0;

  return null;
};

G.finishLevel = function () {
  var i, stars;
  for (i = 0; i < G.birdsLeft.length; i++) G.score += 10000;
  G.save.coins += 50;
  stars = G.score >= 42000 ? 3 : (G.score >= 26000 ? 2 : 1);
  var prev = G.save.levels[G.level] | 0;
  if (stars > prev) G.save.levels[G.level] = stars;
  if (G.level >= G.maxUnlocked() && G.level < G.TOTAL_LEVELS) {
    G.save.unlocked = Math.max(G.save.unlocked | 0, G.level + 1);
  }
  G.save.best[G.level] = Math.max(G.save.best[G.level] | 0, G.score);
  G.lastWin = { stars: stars, coins: 50, score: G.score, level: G.level };
  G.checkAchievements();
  G.store();
  G.state = 'over';
  G.musicStop();
  G.SFX.win();
  return 'win';
};

})();
