/* ============================================================
   ANGRY BIRDS — уровни, физика, столкновения, исход уровня
   Дополняет engine.js. Экспорт: функции на window.ABG
   ============================================================ */
(function () {
'use strict';
var G = window.ABG;
if (!G) { console.error('ABG не загружен'); return; }

function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function seed(n) {
  var s = n >>> 0;
  return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function aabb(a, b) {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2;
}

function block(x, y, w, h, mat) {
  var m = G.MAT[mat] || G.MAT.wood;
  var hp = m.hp * (0.9 + w * h / 2600);
  return { x: x, y: y, w: w, h: h, vx: 0, vy: 0, m: mat,
           hp: hp, max: hp, dead: false, rest: false, mass: m.dens * w * h / 1400 };
}
function pig(x, y, r) {
  var hp = 55 + r * 2.6;
  return { x: x, y: y, r: r, vx: 0, vy: 0, hp: hp, max: hp, dead: false };
}
function bird(type, x, y) {
  var B = G.BIRDS[type] || G.BIRDS.red;
  return { type: type, x: x, y: y, vx: 0, vy: 0, r: B.r, mass: B.mass,
           state: 'ready', used: false, still: 0 };
}

/* ---------- построение уровня ---------- */
G.startLevel = function (n) {
  n = clamp(n | 0, 1, G.TOTAL_LEVELS);
  G.level = n;
  G.score = 0;
  G.ended = false;
  G.winT = 0;
  G.loseT = 0;
  G.shots = 0;
  G.kills = 0;
  G.lastWin = null;
  G.blocks = [];
  G.pigs = [];
  G.parts = [];
  G.pops = [];
  G.extraFlyers = [];
  G.birdsLeft = [];
  G.active = null;
  G.flying = null;
  G.started = true;
  G.state = 'play';

  var r = seed(n * 7919 + 41);
  var mats = ['wood', 'ice', 'stone', 'sand'];
  var pigs = G.pigPips(n);
  var cols = 2 + Math.min(3, Math.floor(n / 9));
  var base = 960;

  var c, f, x, y, bh, bw, mat, floors;
  for (c = 0; c < cols; c++) {
    x = base + c * 165 + Math.floor(r() * 34);
    floors = 2 + Math.floor(r() * 2) + Math.floor(n / 14);
    for (f = 0; f < floors; f++) {
      mat = mats[(n + c + f) % mats.length];
      bh = 26; bw = 78;
      y = G.GROUND_Y - (f + 1) * (bh + 5);
      G.blocks.push(block(x, y, bw, bh, mat));
      if (f > 0) {
        G.blocks.push(block(x - 46, y + 4, 18, bh + 6, mat));
        G.blocks.push(block(x + 46, y + 4, 18, bh + 6, mat));
      }
    }
    /* крыша */
    G.blocks.push(block(x, G.GROUND_Y - (floors + 1) * 31 + 12, 96, 20, 'stone'));
  }

  /* свиньи: между башнями и на крышах */
  var placed = 0, i;
  for (i = 0; i < pigs; i++) {
    var col = i % cols;
    var px = base + col * 165 + 82;
    var py = G.GROUND_Y - 22 - Math.floor(i / cols) * 62;
    var pr = 18 + (i % 3) * 4;
    if (py < 120) py = 200;
    G.pigs.push(pig(px, py, pr));
    placed++;
  }
  if (placed === 0) G.pigs.push(pig(base + 80, G.GROUND_Y - 24, 22));

  /* набор птиц */
  var set = ['red', 'red', 'yellow'];
  if (n >= 4) set.push('black');
  if (n >= 6) set.push('blue');
  if (n >= 9) set = ['red', 'yellow', 'blue', 'black', 'red'];
  if (n >= 16) set = ['yellow', 'blue', 'black', 'blue', 'red', 'black'];
  if (G.has('bomb') && set.indexOf('black') < 0) set.push('black');
  if (G.has('extra')) set.push('red');
  G.birdsLeft = set.slice();

  G.active = bird(G.birdsLeft.shift(), G.SLING_X, G.SLING_Y);
};

G.nextBird = function () {
  if (G.flying) { G.flying = null; }
  if (G.birdsLeft.length) {
    G.active = bird(G.birdsLeft.shift(), G.SLING_X, G.SLING_Y);
  } else {
    G.active = null;
  }
};

G.alivePigs = function () {
  var c = 0, i;
  for (i = 0; i < G.pigs.length; i++) if (!G.pigs[i].dead) c++;
  return c;
};

G.shoot = function () {
  var a = G.active;
  if (!a || G.flying) return false;
  var dx = G.SLING_X - a.x;
  var dy = G.SLING_Y - a.y;
  var pull = Math.sqrt(dx * dx + dy * dy);
  if (pull < 16) return false;
  var k = G.POWER * (G.has('gloves') ? 1.18 : 1.0);
  if (G.has('feather')) k *= 1.06;
  a.vx = dx / pull * pull * k * 0.16 + dx * k * 0.9;
  a.vy = dy / pull * pull * k * 0.16 + dy * k * 0.9;
  a.state = 'fly';
  a.still = 0;
  G.flying = a;
  G.active = null;
  G.shots++;
  G.save.stats.shots = (G.save.stats.shots || 0) + 1;
  G.SFX.shoot();
  G.checkAch();
  return true;
};

/* ---------- способности ---------- */
G.useAbility = function () {
  var f = G.flying;
  if (!f || f.used) return false;
  f.used = true;
  var kind = (G.BIRDS[f.type] || {}).ability || 'none';
  var i, s;
  if (kind === 'boost') {
    var sp = Math.sqrt(f.vx * f.vx + f.vy * f.vy) || 1;
    f.vx = f.vx / sp * (sp * 1.9 + 220);
    f.vy = f.vy / sp * (sp * 1.9 + 220) * 0.55;
    G.save.stats.boosts = (G.save.stats.boosts || 0) + 1;
    G.SFX.shoot();
  } else if (kind === 'split') {
    for (i = -1; i <= 1; i += 2) {
      s = bird('blue', f.x, f.y);
      s.state = 'fly'; s.used = true;
      s.vx = f.vx * 0.92 + i * 110;
      s.vy = f.vy - 150;
      G.extraFlyers.push(s);
    }
    G.save.stats.splits = (G.save.stats.splits || 0) + 1;
    G.SFX.pig();
  } else if (kind === 'bomb') {
    G.explode(f.x, f.y, 120, 150);
    G.save.stats.bombs = (G.save.stats.bombs || 0) + 1;
    G.SFX.bomb();
    G.flying = null;
    G.nextBird();
    return true;
  } else {
    return false;
  }
  G.checkAch();
  return true;
};

G.explode = function (x, y, radius, power) {
  var i, b, p, e, dx, dy, d, f;
  for (i = 0; i < G.blocks.length; i++) {
    b = G.blocks[i];
    if (b.dead) continue;
    dx = b.x - x; dy = b.y - y;
    d = Math.sqrt(dx * dx + dy * dy);
    if (d < radius + Math.max(b.w, b.h) * 0.5) {
      f = (1 - d / (radius + 40)) * power;
      G.damageBlock(b, f, dx / (d || 1) * 120, dy / (d || 1) * 120);
    }
  }
  for (i = 0; i < G.pigs.length; i++) {
    p = G.pigs[i];
    if (p.dead) continue;
    dx = p.x - x; dy = p.y - y;
    d = Math.sqrt(dx * dx + dy * dy);
    if (d < radius + p.r) G.damagePig(p, (1 - d / (radius + 40)) * power * 1.5);
  }
  for (i = 0; i < 26; i++) {
    var ang = Math.random() * 6.283, sp = 130 + Math.random() * 260;
    G.parts.push({ x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 120,
                   r: 3 + Math.random() * 5, life: 0.5 + Math.random() * 0.5,
                   col: Math.random() < 0.5 ? '#ffb648' : '#ff6a2b' });
  }
  G.pops.push({ x: x, y: y, t: 1.2, col: '#ffd34d', txt: '💥' });
};

/* ---------- урон ---------- */
G.damageBlock = function (b, dmg, vx, vy) {
  if (b.dead) return;
  b.hp -= dmg;
  if (vx) { b.vx += vx * 0.02; b.vy += vy * 0.02; }
  if (b.hp <= 0) {
    b.dead = true;
    G.score += 120;
    G.kills = G.kills;
    G.save.stats.blocks = (G.save.stats.blocks || 0) + 1;
    G.SFX.brk();
    var i, m = G.MAT[b.m] || G.MAT.wood;
    for (i = 0; i < 9; i++) {
      G.parts.push({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 260,
                     vy: -Math.random() * 220, r: 3 + Math.random() * 4,
                     life: 0.4 + Math.random() * 0.5, col: m.fill });
    }
  }
};

G.damagePig = function (p, dmg) {
  if (p.dead) return;
  p.hp -= dmg;
  if (p.hp <= 0) {
    p.dead = true;
    G.score += 500;
    G.kills++;
    G.save.stats.kills = (G.save.stats.kills || 0) + 1;
    G.SFX.pig();
    G.pops.push({ x: p.x, y: p.y - 10, t: 1.0, col: '#8ef58e', txt: '+500' });
    var i;
    for (i = 0; i < 10; i++) {
      G.parts.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 240,
                     vy: -Math.random() * 200, r: 3 + Math.random() * 4,
                     life: 0.4 + Math.random() * 0.5, col: '#7ed957' });
    }
    G.checkAch();
  }
};

/* ---------- физика ---------- */
function step(h) {
  var i, j, b, p, f;
  var bodies = [];
  for (i = 0; i < G.blocks.length; i++) if (!G.blocks[i].dead) bodies.push(G.blocks[i]);
  if (G.flying) bodies.push(G.flying);
  for (i = 0; i < G.extraFlyers.length; i++) bodies.push(G.extraFlyers[i]);
  for (i = 0; i < G.pigs.length; i++) if (!G.pigs[i].dead) bodies.push(G.pigs[i]);

  /* интеграция */
  for (i = 0; i < bodies.length; i++) {
    b = bodies[i];
    b.vy += G.GRAVITY * h;
    b.x += b.vx * h;
    b.y += b.vy * h;
    b.vx *= 0.999;
    b.vy *= 0.999;
  }

  /* земля */
  for (i = 0; i < bodies.length; i++) {
    b = bodies[i];
    var half = (b.r !== undefined) ? b.r : b.h / 2;
    if (b.y + half > G.GROUND_Y) {
      var impact = Math.abs(b.vy);
      b.y = G.GROUND_Y - half;
      b.vy *= -0.28;
      b.vx *= 0.72;
      if (impact > 260) {
        if (b.r !== undefined && isPig(b)) G.damagePig(b, (impact - 260) / 12);
        else if (b.r !== undefined) { /* птица — без урона себе */ }
        else G.damageBlock(b, (impact - 260) / 9, 0, 0);
        G.SFX.thud();
      }
    }
  }

  /* столкновения */
  for (i = 0; i < bodies.length; i++) {
    for (j = i + 1; j < bodies.length; j++) {
      var A = bodies[i], B = bodies[j];
      var ar = (A.r !== undefined) ? A.r : null, br = (B.r !== undefined) ? B.r : null;
      var rel = Math.abs(A.vx - B.vx) + Math.abs(A.vy - B.vy);

      if (ar && br) {
        var dx = B.x - A.x, dy = B.y - A.y, d = Math.sqrt(dx * dx + dy * dy);
        var mind = ar + br;
        if (d < mind && d > 0.001) {
          var nx = dx / d, ny = dy / d, ov = (mind - d) / 2;
          A.x -= nx * ov; A.y -= ny * ov; B.x += nx * ov; B.y += ny * ov;
          var p1 = A.vx * nx + A.vy * ny, p2 = B.vx * nx + B.vy * ny;
          A.vx += (p2 - p1) * nx * 0.6; A.vy += (p2 - p1) * ny * 0.6;
          B.vx += (p1 - p2) * nx * 0.6; B.vy += (p1 - p2) * ny * 0.6;
          if (rel > 200) { if (isPig(A)) G.damagePig(A, rel / 14); if (isPig(B)) G.damagePig(B, rel / 14); }
        }
      } else if (ar || br) {
        var cir = ar ? A : B, box = ar ? B : A;
        var cx = clamp(cir.x, box.x - box.w / 2, box.x + box.w / 2);
        var cy = clamp(cir.y, box.y - box.h / 2, box.y + box.h / 2);
        var ddx = cir.x - cx, ddy = cir.y - cy, dd = Math.sqrt(ddx * ddx + ddy * ddy);
        if (dd < cir.r) {
          var n2 = dd > 0.001 ? { x: ddx / dd, y: ddy / dd } : { x: 0, y: -1 };
          cir.x += n2.x * (cir.r - dd);
          cir.y += n2.y * (cir.r - dd);
          var imp = Math.abs(cir.vx * n2.x + cir.vy * n2.y);
          cir.vx *= -0.35 * n2.x + cir.vx * 0.5;
          cir.vy *= -0.35 * n2.y + cir.vy * 0.5;
          if (imp > 120) {
            G.damageBlock(box, imp / 10 * (cir.mass || 0.4), -n2.x * 90, -n2.y * 90);
            if (isPig(cir)) G.damagePig(cir, imp / 18);
            G.SFX.hit();
          }
        }
      } else {
        if (!aabb(A, B)) continue;
        var ox = (A.w + B.w) / 2 - Math.abs(B.x - A.x);
        var oy = (A.h + B.h) / 2 - Math.abs(B.y - A.y);
        var mA = A.mass || 1, mB = B.mass || 1, tot = mA + mB;
        if (ox < oy) {
          var s = B.x > A.x ? 1 : -1;
          A.x -= s * ox * (mB / tot); B.x += s * ox * (mA / tot);
        } else {
          var s2 = B.y > A.y ? 1 : -1;
          A.y -= s2 * oy * (mB / tot); B.y += s2 * oy * (mA / tot);
        }
        if (rel > 150) {
          G.damageBlock(A, rel / 22 * (mB / tot), 0, 0);
          G.damageBlock(B, rel / 22 * (mA / tot), 0, 0);
          if (rel > 320) G.SFX.hit();
        }
      }
    }
  }

  /* отдых — останавливаем дрожание */
  for (i = 0; i < bodies.length; i++) {
    b = bodies[i];
    if (Math.abs(b.vx) < 8 && Math.abs(b.vy) < 8 && b.y + ((b.r !== undefined) ? b.r : b.h / 2) > G.GROUND_Y - 3) {
      b.vx = 0; b.vy = 0;
    }
    if (b.x < -200) b.x = -200;
  }
}

function isPig(o) { return o && o.r !== undefined && G.pigs.indexOf(o) >= 0; }

G.physics = function (dt) {
  dt = Math.min(dt, 0.033);
  var steps = Math.max(1, Math.min(4, Math.ceil(dt / 0.008)));
  var h = dt / steps, s;
  for (s = 0; s < steps; s++) step(h);

  var i;
  for (i = G.pigs.length - 1; i >= 0; i--) if (G.pigs[i].dead) G.pigs.splice(i, 1);
  for (i = G.blocks.length - 1; i >= 0; i--) if (G.blocks[i].dead) G.blocks.splice(i, 1);
};

/* ---------- исход уровня ---------- */
G.checkEnd = function (dt) {
  if (G.state !== 'play' || !G.started) return null;
  dt = dt || 0.016;

  /* победа: свиней не осталось */
  if (G.alivePigs() === 0) {
    G.winT += dt;
    if (G.winT >= 0.45) { G.finishLevel(); return 'win'; }
    return null;
  }
  G.winT = 0;

  /* поражение: птиц больше нет */
  var noMore = (!G.active && !G.flying && G.extraFlyers.length === 0 && G.birdsLeft.length === 0);
  if (noMore) {
    var moving = G.flying && (Math.abs(G.flying.vx) + Math.abs(G.flying.vy) > 40);
    if (!moving) {
      G.loseT += dt;
      if (G.loseT >= 0.9) return 'lose';
    } else {
      G.loseT = 0;
    }
  } else {
    G.loseT = 0;
  }
  return null;
};

G.finishLevel = function () {
  if (G.ended) return;
  G.ended = true;
  G.state = 'win';

  var used = G.pigs.length;
  var birdsLeft = G.birdsLeft.length + (G.active ? 1 : 0);
  var stars = 1;
  if (birdsLeft >= 2) stars = 2;
  if (birdsLeft >= 3) stars = 3;
  if (birdsLeft === G.birdsLeft.length && G.birdsLeft.length > 0) stars = 3;

  var coins = 20 + stars * 15 + Math.floor(G.score / 400);
  if (G.has('gold')) coins = Math.round(coins * 1.25);

  var before = G.save.stars[G.level] || 0;
  G.setStars(G.level, stars);
  G.save.coins = (G.save.coins || 0) + coins;

  var s = G.save.stats;
  s.wins = (s.wins || 0) + 1;
  if (birdsLeft > 0) s.noloss = (s.noloss || 0) + 1;
  G.store();
  G.checkAch();

  G.lastWin = { stars: stars, coins: coins, score: G.score, better: stars > before };
  G.SFX.win();
  G.vibrate(40);
};
})();
