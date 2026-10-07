/* ============================================================
   ANGRY BIRDS — физика, столкновения, выстрел, способности,
   подсчёт результата уровня
   ============================================================ */
(function () {
'use strict';
var G = window.ABG;
if (!G) { console.error('engine.js не загружен'); return; }

var FIXED = 1 / 120;
var MAX_SUB = 4;

function cl(v, a, b) { return v < a ? a : (v > b ? b : v); }
function dist(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }

/* ---------- фабрики тел ---------- */
G.makeBlock = function (b) {
  var m = G.MAT[b.mat] || G.MAT.wood;
  return {
    x: b.x, y: b.y, w: b.w, h: b.h, vx: 0, vy: 0,
    mat: b.mat, hp: m.hp, max: m.hp, dead: false, rest: 0, hitT: 0
  };
};

G.makePig = function (p) {
  var hp = 55 + p.r * 3.4;
  return { x: p.x, y: p.y, r: p.r, vx: 0, vy: 0, hp: hp, max: hp, dead: false, still: 0, hitT: 0 };
};

function makeBird(type, x, y) {
  var B = G.BIRDS[type] || G.BIRDS.red;
  return {
    type: type, x: x, y: y, vx: 0, vy: 0, r: B.r, mass: B.mass,
    state: 'ready', used: false, still: 0, trail: [], hitT: 0
  };
}

/* ---------- осколки и счёт ---------- */
function burst(x, y, color, n) {
  for (var i = 0; i < n; i++) {
    var a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 260;
    G.parts.push({
      x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120,
      life: 0.5 + Math.random() * 0.6, max: 1.1, c: color, s: 2 + Math.random() * 5
    });
  }
}

function popup(x, y, txt) { G.pops.push({ x: x, y: y, t: 1.0, txt: txt }); }

function addScore(v, x, y) {
  G.score += v;
  if (txt(v)) popup(x, y, '+' + v);
}
function txt(v) { return v >= 100; }

/* ---------- физика ---------- */
G.physics = function (dt) {
  var steps = cl(Math.round(dt / FIXED), 1, MAX_SUB);
  var h = dt / steps;
  for (var s = 0; s < steps; s++) step(h);
};

function step(h) {
  var i, j, b, p;

  /* 1. интеграция блоков */
  for (i = 0; i < G.blocks.length; i++) {
    b = G.blocks[i];
    if (b.dead) continue;
    b.vy += G.GRAVITY * h;
    b.vx *= 0.997;
    b.x += b.vx * h;
    b.y += b.vy * h;
    if (b.hitT > 0) b.hitT -= h;
  }

  /* 2. интеграция свиней */
  for (i = 0; i < G.pigs.length; i++) {
    p = G.pigs[i];
    if (p.dead) continue;
    p.vy += G.GRAVITY * h;
    p.vx *= 0.997;
    p.x += p.vx * h;
    p.y += p.vy * h;
    if (p.hitT > 0) p.hitT -= h;
  }

  /* 3. птица и осколки-двойники */
  var flyers = [];
  if (G.flying) flyers.push(G.flying);
  for (i = 0; i < G.extraFlyers.length; i++) flyers.push(G.extraFlyers[i]);
  for (i = 0; i < flyers.length; i++) {
    var f = flyers[i];
    f.vy += G.GRAVITY * h;
    f.x += f.vx * h;
    f.y += f.vy * h;
    if (f.trail) {
      f.trail.push({ x: f.x, y: f.y });
      if (f.trail.length > 90) f.trail.shift();
    }
  }

  /* 4. земля */
  var gy = G.GROUND_Y;
  for (i = 0; i < G.blocks.length; i++) {
    b = G.blocks[i];
    if (b.dead) continue;
    var bottom = b.y + b.h * 0.5;
    if (bottom > gy) {
      var pen = bottom - gy;
      b.y -= pen;
      if (b.vy > 220) damageBlock(b, b.vy * 0.09);
      if (b.vy > 0) b.vy = -b.vy * 0.14;
      b.vx *= 0.72;
    }
  }
  for (i = 0; i < G.pigs.length; i++) {
    p = G.pigs[i];
    if (p.dead) continue;
    if (p.y + p.r > gy) {
      p.y = gy - p.r;
      if (p.vy > 380) damagePig(p, (p.vy - 380) * 0.10);
      if (p.vy > 0) p.vy = -p.vy * 0.22;
      p.vx *= 0.8;
    }
  }
  for (i = 0; i < flyers.length; i++) {
    var ff = flyers[i];
    if (ff.y + ff.r > gy) {
      ff.y = gy - ff.r;
      if (ff.vy > 260) {
        hitBlockArea(ff.x, ff.y + ff.r, 80, ff.vy * ff.mass * 0.16, ff);
      }
      if (ff.vy > 0) ff.vy = -ff.vy * (ff.type === 'black' ? 0.05 : 0.30);
      ff.vx *= 0.86;
    }
  }

  /* 5. блок ↔ блок */
  for (i = 0; i < G.blocks.length; i++) {
    b = G.blocks[i];
    if (b.dead) continue;
    for (j = i + 1; j < G.blocks.length; j++) {
      var o = G.blocks[j];
      if (o.dead) continue;
      resolveBox(b, o, h);
    }
  }

  /* 6. блок ↔ свинья */
  for (i = 0; i < G.blocks.length; i++) {
    b = G.blocks[i];
    if (b.dead) continue;
    for (j = 0; j < G.pigs.length; j++) {
      p = G.pigs[j];
      if (p.dead) continue;
      circleBox(p, b, h, 'pig');
    }
  }

  /* 7. птица ↔ блок, птица ↔ свинья */
  for (i = 0; i < flyers.length; i++) {
    var bird = flyers[i];
    for (j = 0; j < G.blocks.length; j++) {
      b = G.blocks[j];
      if (b.dead) continue;
      circleBox(bird, b, h, 'bird');
    }
    for (j = 0; j < G.pigs.length; j++) {
      p = G.pigs[j];
      if (p.dead) continue;
      var d = dist(bird.x, bird.y, p.x, p.y);
      var need = bird.r + p.r;
      if (d < need) {
        var nx = (bird.x - p.x) / (d || 1), ny = (bird.y - p.y) / (d || 1);
        var pen = need - d;
        bird.x += nx * pen * 0.35; bird.y += ny * pen * 0.35;
        p.x -= nx * pen * 0.65; p.y -= ny * pen * 0.65;
        var sp = Math.sqrt(bird.vx * bird.vx + bird.vy * bird.vy);
        damagePig(p, sp * bird.mass * 0.10 + 12);
        bird.vx *= 0.74; bird.vy *= 0.74;
        G.vibe(12);
        if (G.SFX.hit) G.SFX.hit();
      }
    }
  }

  /* 8. свиньи: скорость и покой */
  for (i = 0; i < G.pigs.length; i++) {
    p = G.pigs[i];
    if (p.dead) continue;
    var sp2 = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    if (sp2 > 900) damagePig(p, (sp2 - 900) * 0.06);
    if (sp2 < 8) { p.vx *= 0.6; p.vy *= 0.6; }
  }

  /* 9. чистка */
  for (i = G.pigs.length - 1; i >= 0; i--) if (G.pigs[i].dead) G.pigs.splice(i, 1);
  for (i = G.blocks.length - 1; i >= 0; i--) if (G.blocks[i].dead) G.blocks.splice(i, 1);
}

/* ---------- столкновения ---------- */
function resolveBox(a, b, h) {
  var ax = a.x, ay = a.y, aw = a.w * 0.5, ah = a.h * 0.5;
  var bx = b.x, by = b.y, bw = b.w * 0.5, bh = b.h * 0.5;
  var ox = (aw + bw) - Math.abs(ax - bx);
  var oy = (ah + bh) - Math.abs(ay - by);
  if (ox <= 0 || oy <= 0) return;

  var ma = G.MAT[a.mat].dens, mb = G.MAT[b.mat].dens;
  var total = ma + mb;

  if (ox < oy) {
    var sx = ax < bx ? -1 : 1;
    a.x -= sx * ox * (mb / total);
    b.x += sx * ox * (ma / total);
    var vx = (a.vx - b.vx) * 0.5;
    a.vx -= vx * (mb / total) * 1.4;
    b.vx += vx * (ma / total) * 1.4;
    var impactX = Math.abs(vx);
    if (impactX > 260) { damageBlock(a, impactX * 0.05 * mb); damageBlock(b, impactX * 0.05 * ma); }
  } else {
    var sy = ay < by ? -1 : 1;
    a.y -= sy * oy * (mb / total);
    b.y += sy * oy * (ma / total);
    var vy = (a.vy - b.vy) * 0.5;
    a.vy -= vy * (mb / total) * 1.2;
    b.vy += vy * (ma / total) * 1.2;
    var impactY = Math.abs(vy);
    if (impactY > 300) { damageBlock(a, impactY * 0.045 * mb); damageBlock(b, impactY * 0.045 * ma); }
  }
}

function circleBox(c, box, h, kind) {
  var hw = box.w * 0.5, hh = box.h * 0.5;
  var cx = cl(c.x, box.x - hw, box.x + hw);
  var cy = cl(c.y, box.y - hh, box.y + hh);
  var dx = c.x - cx, dy = c.y - cy;
  var d = Math.sqrt(dx * dx + dy * dy);
  if (d >= c.r) return;

  var nx, ny;
  if (d < 0.0001) {
    var l = Math.abs(c.x - (box.x - hw)), r2 = Math.abs((box.x + hw) - c.x);
    var t = Math.abs(c.y - (box.y - hh)), bo = Math.abs((box.y + hh) - c.y);
    var m = Math.min(l, r2, t, bo);
    nx = (m === l) ? -1 : (m === r2 ? 1 : 0);
    ny = (m === t) ? -1 : (m === bo ? 1 : 0);
    d = 0;
  } else { nx = dx / d; ny = dy / d; }

  var pen = c.r - d;
  c.x += nx * pen * 0.7; c.y += ny * pen * 0.7;
  box.x -= nx * pen * 0.3; box.y -= ny * pen * 0.3;

  var rvx = c.vx - box.vx, rvy = c.vy - box.vy;
  var vn = rvx * nx + rvy * ny;
  if (vn < 0) {
    var imp = -vn;
    c.vx += nx * imp * 0.75; c.vy += ny * imp * 0.75;
    box.vx -= nx * imp * 0.25; box.vy -= ny * imp * 0.25;
    if (kind === 'bird') {
      var power = imp * (c.mass || 1) * 0.11;
      damageBlock(box, power);
      if (G.SFX.hit && imp > 250) G.SFX.hit();
      if (imp > 420) G.vibe(10);
    } else {
      damageBlock(box, imp * 0.03);
    }
  }
}

function hitBlockArea(x, y, radius, power, bird) {
  for (var i = 0; i < G.blocks.length; i++) {
    var b = G.blocks[i];
    if (b.dead) continue;
    if (dist(x, y, b.x, b.y) < radius + Math.max(b.w, b.h) * 0.5) damageBlock(b, power);
  }
}

/* ---------- урон ---------- */
function damageBlock(b, amount) {
  if (b.dead || amount <= 0) return;
  b.hp -= amount;
  b.hitT = 0.12;
  if (b.hp > 0) return;

  b.dead = true;
  var m = G.MAT[b.mat] || G.MAT.wood;
  burst(b.x, b.y, m.fill, 10);
  addScore(60, b.x, b.y);
  G.bump(b.mat);
  if (G.SFX.crack) G.SFX.crack();
  hitBlockArea(b.x, b.y, 34, 18, null);
}

function damagePig(p, amount) {
  if (p.dead || amount <= 0) return;
  p.hp -= amount;
  p.hitT = 0.15;
  if (p.hp > 0) {
    if (G.SFX.pig && amount > 25) G.SFX.pig();
    return;
  }

  p.dead = true;
  burst(p.x, p.y, '#7ddc62', 14);
  burst(p.x, p.y, '#ffffff', 5);
  addScore(500, p.x, p.y - 30);
  G.save.coins += 15;
  G.bump('pigs');
  G.vibe(22);
  if (G.SFX.pig) G.SFX.pig();
}

/* ---------- выстрел ---------- */
G.nextBird = function () {
  if (G.flying) return;
  if (!G.birdsLeft.length) { G.active = null; return; }
  var type = G.birdsLeft[0];
  G.active = makeBird(type, G.SLING_X, G.SLING_Y);
  G.active.state = 'ready';
};

G.shoot = function () {
  var a = G.active;
  if (!a || a.state !== 'ready') return false;
  var dx = G.SLING_X - a.x, dy = G.SLING_Y - a.y;
  var pull = Math.sqrt(dx * dx + dy * dy);
  if (pull < 22) { a.x = G.SLING_X; a.y = G.SLING_Y; return false; }

  a.vx = dx * G.POWER;
  a.vy = dy * G.POWER;
  a.state = 'fly';
  a.trail = [];
  G.active = null;
  G.flying = a;
  G.birdsLeft.shift();
  if (G.SFX.shoot) G.SFX.shoot();
  G.vibe(14);
  return true;
};

G.ac = G.ac;

/* ---------- способности в полёте ---------- */
G.useAbility = function () {
  var f = G.flying;
  if (!f || f.used) return false;
  var type = f.type;
  f.used = true;

  if (type === 'yellow') {
    var s = Math.sqrt(f.vx * f.vx + f.vy * f.vy) || 1;
    var k = 1.85;
    f.vx *= k; f.vy *= k;
    for (var i = 0; i < 12; i++) {
      G.parts.push({ x: f.x, y: f.y, vx: -f.vx * 0.08 + (Math.random() - 0.5) * 80,
        vy: -f.vy * 0.08 + (Math.random() - 0.5) * 80, life: 0.35, max: 0.35, c: '#ffe680', s: 3 });
    }
    if (G.SFX.shoot) G.SFX.shoot();
    G.unlockAch('yellow');
  } else if (type === 'blue') {
    var ang = Math.atan2(f.vy, f.vx);
    for (var j = 1; j <= 2; j++) {
      var off = (j === 1 ? -0.24 : 0.24);
      var nx = Math.cos(ang + off), ny = Math.sin(ang + off);
      var sp = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
      G.extraFlyers.push({
        type: 'blue', x: f.x, y: f.y, vx: nx * sp, vy: ny * sp,
        r: f.r, mass: 0.45, state: 'fly', used: true, still: 0, trail: []
      });
    }
    G.unlockAch('blue');
  } else if (type === 'black') {
    explode(f.x, f.y, 165, 3.2);
    G.unlockAch('black');
    G.flying = null;
    G.nextBird();
  } else {
    return false;
  }
  return true;
};

function explode(x, y, radius, power) {
  var i, d;
  for (i = 0; i < G.blocks.length; i++) {
    var b = G.blocks[i];
    if (b.dead) continue;
    d = dist(x, y, b.x, b.y);
    if (d < radius) {
      damageBlock(b, 190 * (1 - d / radius) * power * 0.4);
      var ax = (b.x - x) / (d || 1), ay = (b.y - y) / (d || 1);
      b.vx += ax * 420; b.vy += ay * 420 - 90;
    }
  }
  for (i = 0; i < G.pigs.length; i++) {
    var p = G.pigs[i];
    if (p.dead) continue;
    d = dist(x, y, p.x, p.y);
    if (d < radius) {
      damagePig(p, 260 * (1 - d / radius) * power * 0.5);
      var px2 = (p.x - x) / (d || 1), py2 = (p.y - y) / (d || 1);
      p.vx += px2 * 520; p.vy += py2 * 520 - 120;
    }
  }
  burst(x, y, '#ffb347', 30);
  burst(x, y, '#ff5722', 20);
  burst(x, y, '#ffe082', 14);
  if (G.SFX.boom) G.SFX.boom();
  G.vibe([20, 40, 30]);
}

/* ---------- проверка исхода ---------- */
G.alivePigs = function () {
  var c = 0;
  for (var i = 0; i < G.pigs.length; i++) if (!G.pigs[i].dead) c++;
  return c;
};

G.aliveBirds = function () { return G.birdsLeft.length; };

G.checkEnd = function (dt) {
  if (G.state !== 'play') return null;

  var flying = !!G.flying || G.extraFlyers.length > 0;
  var pigs = G.alivePigs();
  var birds = G.birdsLeft.length;

  /* не судим, пока не сделан ни один выстрел */
  if (!G.ended && G.shots === 0 && !G.flying && !G.active && birds > 0) return null;

  if (pigs === 0) {
    G.winT += dt;
    if (G.winT > 0.45) { G.winT = 0; finishLevel(); return 'win'; }
    return null;
  }

  if (birds > 0 || flying) { G.loseT = 0; return null; }

  if (!flying && birds === 0) {
    G.loseT += dt;
    if (G.loseT > 0.9) { G.loseT = 0; return 'lose'; }
  }
  return null;
};

/* ---------- завершение уровня ---------- */
G.finishLevel = function () {
  if (G.ended) return G.lastWin;
  G.ended = true;

  var pigsKilled = 0;
  for (var i = 0; i < G.LEVELS[G.level - 1].pigs.length; i++) pigsKilled++;

  var left = G.birdsLeft.length;
  var stars = left >= 2 ? 3 : (left === 1 ? 2 : 1);

  var coins = 20 + pigsKilled * 15 + stars * 10;
  if (G.has('gold')) coins = Math.round(coins * 1.25);

  var prev = G.starsOf(G.level);
  if (stars > prev) G.save.stars[G.level] = stars;
  G.save.coins += coins;

  if (G.save.unlocked < G.level + 1) G.save.unlocked = Math.min(G.TOTAL_LEVELS, G.level + 1);
  G.store();

  /* достижения */
  G.unlockAch('first');
  if (G.levelsDone() >= 10) G.unlockAch('l10');
  if (G.levelsDone() >= 25) G.unlockAch('l25');
  if (G.levelsDone() >= 50) G.unlockAch('l50');
  if (G.starsTotal() >= 30) G.unlockAch('s30');
  if (G.starsTotal() >= 75) G.unlockAch('s75');
  if (G.starsTotal() >= 150) G.unlockAch('s150');
  if (stars === 3) G.unlockAch('three');
  if (left === 0) G.unlockAch('nobird');
  if (G.save.coins >= 1000) G.unlockAch('coins');

  G.lastWin = { stars: stars, coins: coins, score: G.score };
  G.state = 'win';
  if (G.SFX.win) G.SFX.win();
  return G.lastWin;
};

G.musicStart = G.musicStart || function () {};
G.musicStop = G.musicStop || function () {};
})();
