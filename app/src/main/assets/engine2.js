/* ============================================================
   ANGRY BIRDS — физика и ход игры.
   Дополняет window.ABG, созданный в engine.js.
   ============================================================ */
(function () {
'use strict';
var G = window.ABG;
if (!G) { console.error('ABG не загружен — проверь порядок скриптов'); return; }

function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function rnd(a, b) { return a + Math.random() * (b - a); }

function pushParts(x, y, count, color) {
  for (var i = 0; i < count; i++) {
    G.parts.push({
      x: x, y: y, vx: rnd(-160, 160), vy: rnd(-200, 120),
      life: rnd(0.2, 0.6), c: color, s: rnd(3, 7)
    });
  }
}

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
    b.vx *= 0.999;
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
    G.addScore(G.MAT[b.m].sc);
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

function damagePig(p, d) {
  if (p.dead || d < 10) return;
  p.hp -= d;
  if (p.hp <= 0) {
    p.dead = true;
    G.save.kills++;
    G.addScore(5000);
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

G.damageBlock = damageBlock;
G.damagePig = damagePig;

G.physics = function (dt) {
  var sub = 4, h = dt / sub, i;
  for (i = 0; i < sub; i++) {
    integrate(h);
    groundCollide();
    collideAll();
  }
};

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
  G.loseTimer = 0;
  G.active = {
    type: G.birdsLeft.shift(), x: G.SLING_X, y: G.SLING_Y, r: 22,
    state: 'ready', used: false, mass: 8
  };
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
  G.shotsFired++;
  G.save.shots++;
  G.store();
  G.SFX.shot(); G.vibe(20);
  return true;
};

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
  var f = G.flying, k;
  if (!f || f.state !== 'fly' || f.used) return false;
  if (f.type === 'yellow') {
    f.vx *= 1.9; f.vy *= 1.9; f.used = true;
    G.SFX.shot();
    pushParts(f.x, f.y, 8, '#f5c542');
  } else if (f.type === 'blue') {
    f.used = true;
    for (k = -1; k <= 1; k += 2) {
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

G.checkEnd = function (dt) {
  var alive = G.alivePigs(), left, stars, prev, coins;

  if (alive === 0 && G.state === 'play') {
    G.state = 'win';
    left = (G.active ? 1 : 0) + G.birdsLeft.length;
    if (left > 0) G.addScore(left * 10000);
    if (G.shotsFired <= G.pigsAtStart) G.save.perfect++;
    stars = 1;
    if (G.score >= G.baseScore * 1.45) stars = 2;
    if (G.score >= G.baseScore * 2.0) stars = 3;
    prev = G.save.levels[G.level] | 0;
    if (stars > prev) G.save.levels[G.level] = stars;
    coins = 120 + stars * 60;
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
})();
