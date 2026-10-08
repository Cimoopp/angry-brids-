/* ============================================================
   ANGRY BIRDS — физика и игровая логика.
   Дополняет engine.js: physics, shoot, способности, итоги
   ============================================================ */
(function () {
'use strict';
var G = window.ABG;
if (!G) { console.error('ABG не загружен'); return; }

var STEP = 1 / 120;
var MAX_SUB = 5;
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function rnd(a, b) { return a + Math.random() * (b - a); }

/* ---------- частицы и очки ---------- */
var PART = { wood: '#a4692a', ice: '#bfeaf8', stone: '#a8a8b2', sand: '#d8c078', pig: '#7fc94a', bird: '#ff6a5a' };

function addParts(x, y, kind, count, power) {
  var i;
  for (i = 0; i < count; i++) {
    G.parts.push({
      x: x + rnd(-8, 8), y: y + rnd(-8, 8),
      vx: rnd(-power, power), vy: rnd(-power, power * 0.4),
      r: rnd(4, 11), k: kind, rot: rnd(0, 6.3), life: rnd(0.45, 1.1)
    });
  }
  if (G.parts.length > 260) G.parts.splice(0, G.parts.length - 260);
}

function pop(x, y, txt, col) {
  G.pops.push({ x: x, y: y, txt: txt, t: 1, col: col || '#ffd34d' });
  if (G.pops.length > 24) G.pops.shift();
}

function addScore(n, x, y) {
  G.score += n;
  if (x !== undefined) pop(x, y, '+' + n);
}

/* ---------- урон ---------- */
function hurtBlock(b, dmg, kind) {
  if (b.dead) return;
  b.hp -= dmg;
  if (b.hp <= 0) {
    b.dead = true;
    b.hp = 0;
    addScore(200, b.x, b.y - b.h);
    addParts(b.x, b.y, b.m, 9, 150);
    if (G.stats) {
      if (b.m === 'wood') G.stats.wood++;
      else if (b.m === 'ice') G.stats.ice++;
      else if (b.m === 'stone') G.stats.stone++;
    }
    if (G.SFX.hit) G.SFX.hit();
    if (G.vibe) G.vibe(12);
  } else if (dmg > 4 && G.SFX.hit) {
    G.SFX.hit();
  }
}

function hurtPig(p, dmg) {
  if (p.dead) return;
  p.hp -= dmg;
  if (p.hp <= 0) {
    p.dead = true;
    p.hp = 0;
    addScore(1000, p.x, p.y - p.r);
    addParts(p.x, p.y, 'pig', 12, 190);
    if (G.stats) G.stats.pigs++;
    if (G.SFX.pig) G.SFX.pig();
    if (G.vibe) G.vibe(18);
  } else if (G.SFX.hit) {
    G.SFX.hit();
  }
}

/* ---------- столкновения ---------- */
function blockGround(b, h) {
  var half = b.h / 2;
  if (b.y + half > G.GROUND_Y) {
    var pen = b.y + half - G.GROUND_Y;
    b.y -= pen;
    var sp = Math.abs(b.vy);
    if (sp > 60) hurtBlock(b, sp * 0.045 * (G.MAT[b.m] ? G.MAT[b.m].dens : 1), 'ground');
    b.vy = -sp * 0.16;
    b.vx *= 0.72;
  }
  if (b.x - b.w / 2 < 0) { b.x = b.w / 2; b.vx = Math.abs(b.vx) * 0.3; }
  if (b.x + b.w / 2 > G.WORLD_W) { b.x = G.WORLD_W - b.w / 2; b.vx = -Math.abs(b.vx) * 0.3; }
}

function blockBlock(a, b) {
  var ax = a.x - a.w / 2, ay = a.y - a.h / 2;
  var bx = b.x - b.w / 2, by = b.y - b.h / 2;
  var ox = (a.w + b.w) / 2 - Math.abs(a.x - b.x);
  if (ox <= 0) return;
  var oy = (a.h + b.h) / 2 - Math.abs(a.y - b.y);
  if (oy <= 0) return;

  var ma = a.static ? Infinity : (G.MAT[a.m] ? G.MAT[a.m].dens : 1);
  var mb = b.static ? Infinity : (G.MAT[b.m] ? G.MAT[b.m].dens : 1);
  if (ma === Infinity && mb === Infinity) return;

  var rel = Math.abs((a.static ? 0 : a.vx) - (b.static ? 0 : b.vx)) +
            Math.abs((a.static ? 0 : a.vy) - (b.static ? 0 : b.vy));

  if (ox < oy) {
    var sgn = a.x < b.x ? -1 : 1;
    if (ma === Infinity) { b.x += sgn * ox; b.vx = a.vx * 0.3; }
    else if (mb === Infinity) { a.x -= sgn * ox; a.vx = b.vx * 0.3; }
    else {
      var ta = mb / (ma + mb), tb = ma / (ma + mb);
      a.x -= sgn * ox * ta; b.x += sgn * ox * tb;
      var av = a.vx, bv = b.vx;
      a.vx = bv * 0.6; b.vx = av * 0.6;
    }
  } else {
    var sgn2 = a.y < b.y ? -1 : 1;
    if (ma === Infinity) { b.y += sgn2 * oy; b.vy = 0; }
    else if (mb === Infinity) { a.y -= sgn2 * oy; a.vy = 0; }
    else {
      a.y -= sgn2 * oy * 0.5; b.y += sgn2 * oy * 0.5;
      var av2 = a.vy, bv2 = b.vy;
      a.vy = bv2 * 0.5; b.vy = av2 * 0.5;
    }
  }

  if (rel > 130) {
    hurtBlock(a, rel * 0.03, 'impact');
    hurtBlock(b, rel * 0.03, 'impact');
  }
}

function circleBlock(c, b, isBird) {
  var cx = clamp(c.x, b.x - b.w / 2, b.x + b.w / 2);
  var cy = clamp(c.y, b.y - b.h / 2, b.y + b.h / 2);
  var dx = c.x - cx, dy = c.y - cy;
  var d2 = dx * dx + dy * dy;
  if (d2 > c.r * c.r) return;

  var d = Math.sqrt(d2) || 0.001;
  var pen = c.r - d;
  var nx = dx / d, ny = dy / d;
  c.x += nx * pen;
  c.y += ny * pen;

  var speed = Math.sqrt((isBird ? c.vx * c.vx + c.vy * c.vy : c.vx * c.vx + c.vy * c.vy));
  var mass = isBird ? 1 : 0.7;
  var dmg = speed * 0.055 * mass;

  if (isBird) {
    hurtBlock(b, dmg * 1.15, 'bird');
    if (G.SFX.hit) G.SFX.hit();
  } else {
    hurtBlock(b, dmg, 'pig');
    hurtPig(c, speed * 0.035 * (G.MAT[b.m] ? G.MAT[b.m].dens : 1));
  }

  var dot = c.vx * nx + c.vy * ny;
  if (dot < 0) {
    c.vx -= 1.35 * dot * nx;
    c.vy -= 1.35 * dot * ny;
    c.vx *= 0.7;
    c.vy *= 0.7;
  }
}

function birdPig(bd, p) {
  var dx = bd.x - p.x, dy = bd.y - p.y;
  var rr = bd.r + p.r;
  var d2 = dx * dx + dy * dy;
  if (d2 > rr * rr) return;
  var d = Math.sqrt(d2) || 0.001;
  var nx = dx / d, ny = dy / d;
  var pen = rr - d;
  bd.x += nx * pen * 0.6;
  bd.y += ny * pen * 0.6;
  p.x -= nx * pen * 0.4;
  p.y -= ny * pen * 0.4;

  var sp = Math.sqrt(bd.vx * bd.vx + bd.vy * bd.vy);
  hurtPig(p, sp * 0.075 + 6);
  p.vx += nx * sp * 0.35;
  p.vy += ny * sp * 0.35 - 40;

  var dot = bd.vx * nx + bd.vy * ny;
  if (dot < 0) { bd.vx -= 1.1 * dot * nx; bd.vy -= 1.1 * dot * ny; bd.vx *= 0.86; bd.vy *= 0.86; }
}

/* ---------- шаг физики ---------- */
function step(h) {
  var i, j, b, p;

  for (i = 0; i < G.blocks.length; i++) {
    b = G.blocks[i];
    if (b.dead || b.static) continue;
    b.vy += G.GRAVITY * h;
    b.vx *= 0.995;
    b.x += b.vx * h;
    b.y += b.vy * h;
  }

  for (i = 0; i < G.pigs.length; i++) {
    p = G.pigs[i];
    if (p.dead) continue;
    p.vy += G.GRAVITY * h;
    p.vx *= 0.992;
    p.x += p.vx * h;
    p.y += p.vy * h;
    if (p.y + p.r > G.GROUND_Y) {
      p.y = G.GROUND_Y - p.r;
      var sp = Math.abs(p.vy);
      p.vy = -sp * 0.28;
      p.vx *= 0.7;
      if (sp > 260) hurtPig(p, (sp - 260) * 0.05);
    }
    if (p.x - p.r < 0) { p.x = p.r; p.vx = Math.abs(p.vx) * 0.4; }
    if (p.x + p.r > G.WORLD_W) { p.x = G.WORLD_W - p.r; p.vx = -Math.abs(p.vx) * 0.4; }
  }

  var flyers = [];
  if (G.flying && !G.flying.dead) flyers.push(G.flying);
  for (i = 0; i < G.extraFlyers.length; i++) flyers.push(G.extraFlyers[i]);

  for (i = 0; i < flyers.length; i++) {
    var f = flyers[i];
    f.vy += G.GRAVITY * h;
    f.x += f.vx * h;
    f.y += f.vy * h;
    f.rot = Math.atan2(f.vy, f.vx);
    if (f.trail) {
      if (!f.trailT) f.trailT = 0;
      f.trailT += h;
      if (f.trailT > 0.055) {
        f.trailT = 0;
        f.trail.push({ x: f.x, y: f.y });
        if (f.trail.length > 26) f.trail.shift();
      }
    }
    if (f.y + f.r > G.GROUND_Y) {
      f.y = G.GROUND_Y - f.r;
      var fs = Math.abs(f.vy);
      if (fs > 90) { addParts(f.x, G.GROUND_Y, 'bird', 3, 70); if (G.SFX.hit) G.SFX.hit(); }
      f.vy = -fs * 0.24;
      f.vx *= 0.72;
    }
    if (f.x < -60 || f.x > G.WORLD_W + 60) f.dead = true;
  }

  for (i = 0; i < G.blocks.length; i++) {
    b = G.blocks[i];
    if (b.dead || b.static) continue;
    blockGround(b, h);
  }

  for (i = 0; i < G.blocks.length; i++) {
    if (G.blocks[i].dead) continue;
    for (j = i + 1; j < G.blocks.length; j++) {
      if (G.blocks[j].dead) continue;
      blockBlock(G.blocks[i], G.blocks[j]);
    }
  }

  for (i = 0; i < G.pigs.length; i++) {
    p = G.pigs[i];
    if (p.dead) continue;
    for (j = 0; j < G.blocks.length; j++) {
      if (G.blocks[j].dead) continue;
      circleBlock(p, G.blocks[j], false);
    }
  }

  for (i = 0; i < flyers.length; i++) {
    var bd = flyers[i];
    if (bd.dead) continue;
    for (j = 0; j < G.blocks.length; j++) {
      if (G.blocks[j].dead) continue;
      circleBlock(bd, G.blocks[j], true);
    }
    for (j = 0; j < G.pigs.length; j++) {
      if (G.pigs[j].dead) continue;
      birdPig(bd, G.pigs[j]);
    }
    if (bd === G.flying && (bd.vx * bd.vx + bd.vy * bd.vy) < 900 &&
        bd.y + bd.r > G.GROUND_Y - 2) {
      bd.still = (bd.still || 0) + h;
    }
  }
}

G.physics = function (dt) {
  var n = clamp(Math.round(dt / STEP), 1, MAX_SUB);
  var h = dt / n, i;
  for (i = 0; i < n; i++) step(h);
};

/* ---------- выстрел и способности ---------- */
G.shoot = function () {
  var a = G.active;
  if (!a || a.state !== 'ready') return false;
  var dx = G.SLING_X - a.x, dy = G.SLING_Y - a.y;
  var pull = Math.sqrt(dx * dx + dy * dy);
  if (pull < 14) { a.x = G.SLING_X; a.y = G.SLING_Y; return false; }

  var gain = G.POWER / G.MAX_PULL;
  var mult = G.has('boots') ? 1.1 : 1;
  a.vx = dx * gain * mult;
  a.vy = dy * gain * mult;
  a.state = 'fly';
  a.trail = [];
  a.trailT = 0;
  G.flying = a;
  G.active = null;
  if (G.stats) G.stats.shots++;
  if (G.stats) G.stats.spentBirds++;
  if (G.SFX.boost) G.SFX.boost();
  G.vibe(15);
  return true;
};

G.nextBird = function () {
  if (G.flying) return false;
  if (G.birdsLeft.length) {
    G.active = G.birdsLeft.shift();
    G.active.x = G.SLING_X;
    G.active.y = G.SLING_Y;
    G.active.vx = 0;
    G.active.vy = 0;
    G.active.state = 'ready';
    G.active.used = false;
    return true;
  }
  G.active = null;
  return false;
};

G.useAbility = function () {
  var f = G.flying;
  if (!f || f.used) return false;
  var t = (G.BIRDS[f.type] || {}).ability;

  if (t === 'boost') {
    var sp = Math.sqrt(f.vx * f.vx + f.vy * f.vy) || 1;
    f.vx = f.vx / sp * (sp * 1.75 + 180);
    f.vy = f.vy / sp * (sp * 1.75 + 180);
    if (G.SFX.boost) G.SFX.boost();
  } else if (t === 'split') {
    var a2, i;
    for (i = -1; i <= 1; i += 2) {
      var nb = G.makeBird('blue', f.x + i * 12, f.y - 6);
      var ang = Math.atan2(f.vy, f.vx) + i * 0.26;
      var s2 = Math.sqrt(f.vx * f.vx + f.vy * f.vy) * 0.95;
      nb.vx = Math.cos(ang) * s2;
      nb.vy = Math.sin(ang) * s2;
      nb.state = 'fly';
      nb.used = true;
      G.extraFlyers.push(nb);
    }
    if (G.SFX.split) G.SFX.split();
  } else if (t === 'bomb') {
    var R = 170, dmg = 260, i2;
    addParts(f.x, f.y, 'bird', 22, 300);
    for (i2 = 0; i2 < G.blocks.length; i2++) {
      var b = G.blocks[i2];
      if (b.dead) continue;
      var dx = b.x - f.x, dy = b.y - f.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < R) hurtBlock(b, dmg * (1 - d / R), 'bomb');
    }
    for (i2 = 0; i2 < G.pigs.length; i2++) {
      var p = G.pigs[i2];
      if (p.dead) continue;
      var px2 = p.x - f.x, py2 = p.y - f.y;
      var dd = Math.sqrt(px2 * px2 + py2 * py2);
      if (dd < R * 1.15) hurtPig(p, dmg * 1.1 * (1 - dd / (R * 1.15)));
    }
    if (G.SFX.boom) G.SFX.boom();
    if (window.ABR && window.ABR.shake) window.ABR.shake(16);
    G.vibe(60);
    f.dead = true;
    G.flying = null;
    G.nextBird();
  } else {
    return false;
  }
  f.used = true;
  return true;
};

/* ---------- итоги ---------- */
G.alivePigs = function () {
  var c = 0, i;
  for (i = 0; i < G.pigs.length; i++) if (!G.pigs[i].dead) c++;
  return c;
};

G.checkEnd = function (dt) {
  if (!G.started || G.state !== 'play') return null;
  if (G.ended) return null;

  if (G.alivePigs() === 0) {
    G.winT += dt;
    G.loseT = 0;
    if (G.winT > 0.45) {
      G.ended = true;
      var left = G.birdsLeft.length + (G.active ? 1 : 0);
      var stars = 1 + (left >= 1 ? 1 : 0) + (left >= 2 ? 1 : 0);
      var coins = Math.floor(G.score / 100) + stars * 15;
      if (G.stats && G.stats.spentBirds <= 1) G.unlockAch('onebird');
      if (G.stats && G.stats.shots === 0) G.unlockAch('nopigs');
      G.onWin(stars, coins);
      if (G.SFX.win) G.SFX.win();
      return 'win';
    }
    return null;
  }

  if (!G.flying && !G.active && G.birdsLeft.length === 0) {
    G.loseT += dt;
    G.winT = 0;
    if (G.loseT > 0.9) {
      G.ended = true;
      if (G.SFX.lose) G.SFX.lose();
      return 'lose';
    }
    return null;
  }

  G.winT = 0;
  G.loseT = 0;
  return null;
};

})();
