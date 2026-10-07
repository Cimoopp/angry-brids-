/* ============================================================
   ANGRY BIRDS — физика, выстрел, способности, исход уровня
   Дополняет engine.js. Экспорт: window.ABE
   ============================================================ */
window.ABE = (function () {
'use strict';
var G = window.ABG;
if (!G) { console.error('ABG не загружен'); return null; }

var STEP = 1 / 60;
var acc = 0;

function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function rnd(a, b) { return a + Math.random() * (b - a); }

/* ---------- эффекты ---------- */
function part(x, y, c, n, sp, size) {
  for (var i = 0; i < n; i++) {
    if (G.parts.length > 220) break;
    G.parts.push({
      x: x, y: y,
      vx: rnd(-sp, sp), vy: rnd(-sp, sp * 0.4),
      c: c, s: size || rnd(3, 7), life: rnd(0.5, 1.1)
    });
  }
}
function pop(x, y, txt) {
  if (G.pops.length > 12) G.pops.shift();
  G.pops.push({ x: x, y: y, txt: txt, t: 1.4 });
}

/* ---------- урон ---------- */
function hurtBlock(b, dmg) {
  if (b.dead || b.static) return;
  b.hp -= dmg;
  if (b.hp <= 0) {
    b.dead = true;
    var m = G.MAT[b.m] || G.MAT.wood;
    part(b.x, b.y, m.fill, 12, 260, Math.max(3, Math.min(b.w, b.h) / 3));
    G.score += 40;
    G.vibe(12);
  }
}

function hurtPig(p, dmg) {
  if (p.dead) return;
  p.hp -= dmg;
  if (p.hp <= 0) {
    p.dead = true;
    part(p.x, p.y, '#8ed14b', 14, 260, 6);
    G.score += 5000;
    G.save.kills = (G.save.kills | 0) + 1;
    pop(p.x, p.y - 20, '+5000');
    if (G.SFX.pig) G.SFX.pig();
    G.vibe(30);
  }
}

/* ---------- взрыв ---------- */
G.explode = function (x, y, radius, power) {
  var i, dx, dy, d, k;
  part(x, y, '#ffcc55', 26, 420, 8);
  part(x, y, '#ff7a2d', 18, 300, 7);
  if (G.SFX.crack) G.SFX.crack();
  G.vibe(40);

  for (i = G.blocks.length - 1; i >= 0; i--) {
    var b = G.blocks[i];
    if (b.dead || b.static) continue;
    dx = b.x - x; dy = b.y - y;
    d = Math.sqrt(dx * dx + dy * dy);
    if (d < radius) {
      k = (1 - d / radius);
      b.vx += (dx / (d || 1)) * power * k;
      b.vy += (dy / (d || 1)) * power * k - power * k * 0.4;
      hurtBlock(b, 120 * k);
    }
  }
  for (i = G.pigs.length - 1; i >= 0; i--) {
    var p = G.pigs[i];
    if (p.dead) continue;
    dx = p.x - x; dy = p.y - y;
    d = Math.sqrt(dx * dx + dy * dy);
    if (d < radius) {
      k = 1 - d / radius;
      p.vx += (dx / (d || 1)) * power * k;
      p.vy += (dy / (d || 1)) * power * k - power * k * 0.5;
      hurtPig(p, 90 * k);
    }
  }
};

/* ---------- один шаг физики ---------- */
function resolveBlockBlock(a, b) {
  if (a.dead || b.dead) return;
  var ax = a.w / 2, ay = a.h / 2, bx = b.w / 2, by = b.h / 2;
  var dx = b.x - a.x, px = ax + bx - Math.abs(dx);
  if (px <= 0) return;
  var dy = b.y - a.y, py = ay + by - Math.abs(dy);
  if (py <= 0) return;

  var speed = Math.abs(b.vx - a.vx) + Math.abs(b.vy - a.vy);
  var ma = a.static ? 1e9 : Math.max(0.2, a.mass);
  var mb = b.static ? 1e9 : Math.max(0.2, b.mass);

  if (px < py) {
    var nx = dx > 0 ? 1 : -1;
    var w = nx * px * (ma / (ma + mb));
    b.x += w; a.x -= nx * px * (mb / (ma + mb));
    var pv = b.vx - a.vx;
    if (!b.static) b.vx -= pv * 0.6 * (ma / (ma + mb));
    if (!a.static) a.vx += pv * 0.6 * (mb / (ma + mb));
  } else {
    var ny = dy > 0 ? 1 : -1;
    b.y += ny * py * (ma / (ma + mb));
    a.y -= ny * py * (mb / (ma + mb));
    var qv = b.vy - a.vy;
    if (!b.static) b.vy -= qv * 0.6 * (ma / (ma + mb));
    if (!a.static) a.vy += qv * 0.6 * (mb / (ma + mb));
  }

  if (speed > 240) {
    hurtBlock(a, (speed - 240) / 22 * Math.max(0.4, ma < 1000 ? ma : 0.4));
    hurtBlock(b, (speed - 240) / 22 * Math.max(0.4, mb < 1000 ? mb : 0.4));
  }
}

function resolveCircleBlock(c) {
  var i;
  for (i = 0; i < G.blocks.length; i++) {
    var b = G.blocks[i];
    if (b.dead) continue;
    var hw = b.w / 2, hh = b.h / 2;
    var nx = clamp(c.x, b.x - hw, b.x + hw);
    var ny = clamp(c.y, b.y - hh, b.y + hh);
    var dx = c.x - nx, dy = c.y - ny;
    var d2 = dx * dx + dy * dy;
    if (d2 > c.r * c.r) continue;

    var d = Math.sqrt(d2);
    if (d < 0.001) { dx = 0; dy = -1; d = 1; }
    var ux = dx / d, uy = dy / d;
    var pen = c.r - d;
    c.x += ux * pen; c.y += uy * pen;

    var rvx = c.vx - b.vx, rvy = c.vy - b.vy;
    var vn = rvx * ux + rvy * uy;
    var speed = Math.sqrt(rvx * rvx + rvy * rvy);

    if (vn < 0) {
      var e = 0.35;
      if (!c.mass) { /* птица */ }
      c.vx -= (1 + e) * vn * ux * 0.75;
      c.vy -= (1 + e) * vn * uy * 0.75;
      if (!b.static) {
        b.vx += rvx * 0.12; b.vy += rvy * 0.12;
        b.vx = clamp(b.vx, -900, 900); b.vy = clamp(b.vy, -900, 900);
      }
    }
    if (speed > 200) hurtsBySpeed(c, speed, b);
  }
}

function hurtsBySpeed(c, speed, b) {
  var power = Math.max(0.5, c.mass || 1) * (speed - 200) / 16;
  if (b) hurtBlock(b, power);
  else hurtBlock(null, 0);
  if (c.type && G.SFX.hit) G.SFX.hit();
}

function resolveCircleCircle(c, p) {
  var dx = p.x - c.x, dy = p.y - c.y;
  var d = Math.sqrt(dx * dx + dy * dy);
  var rr = c.r + p.r;
  if (d > rr || d < 0.0001) return;
  var ux = dx / d, uy = dy / d;
  var pen = rr - d;
  p.x += ux * pen * 0.7; p.y += uy * pen * 0.7;
  c.x -= ux * pen * 0.3; c.y -= uy * pen * 0.3;

  var rvx = c.vx - p.vx, rvy = c.vy - p.vy;
  var vn = rvx * ux + rvy * uy;
  var speed = Math.sqrt(rvx * rvx + rvy * rvy);
  if (vn > 0) {
    var push = vn * 0.8;
    p.vx += ux * push * 1.4; p.vy += uy * push * 1.4;
    c.vx -= ux * push * 0.5; c.vy -= uy * push * 0.5;
  }
  if (speed > 170) hurtPig(p, (speed - 150) / 9 * Math.max(0.5, c.mass || 1));
}

function step(h) {
  var i;
  var damp = Math.pow(0.9, h * 60);

  /* блоки */
  for (i = 0; i < G.blocks.length; i++) {
    var b = G.blocks[i];
    if (b.dead || b.static) continue;
    b.vy += G.GRAVITY * h;
    b.x += b.vx * h; b.y += b.vy * h;
    b.vx *= damp; b.vy *= damp;
    if (b.y + b.h / 2 > G.GROUND_Y) {
      var hitV = b.vy;
      b.y = G.GROUND_Y - b.h / 2;
      if (hitV > 260) hurtBlock(b, (hitV - 260) / 14);
      b.vy = hitV > 90 ? -hitV * 0.18 : 0;
      b.vx *= 0.72;
    }
    if (b.x - b.w / 2 < 0) { b.x = b.w / 2; b.vx = Math.abs(b.vx) * 0.3; }
    if (b.x + b.w / 2 > G.WORLD_W) { b.x = G.WORLD_W - b.w / 2; b.vx = -Math.abs(b.vx) * 0.3; }
  }

  /* свиньи */
  for (i = 0; i < G.pigs.length; i++) {
    var p = G.pigs[i];
    if (p.dead) continue;
    p.vy += G.GRAVITY * h;
    p.x += p.vx * h; p.y += p.vy * h;
    p.vx *= Math.pow(0.94, h * 60); p.vy *= damp;
    if (p.y + p.r > G.GROUND_Y) {
      var pv = p.vy;
      p.y = G.GROUND_Y - p.r;
      if (pv > 320) hurtPig(p, (pv - 320) / 12);
      p.vy = pv > 90 ? -pv * 0.24 : 0;
      p.vx *= 0.7;
    }
    if (p.x - p.r < 0) { p.x = p.r; p.vx = Math.abs(p.vx) * 0.3; }
    if (p.x + p.r > G.WORLD_W) { p.x = G.WORLD_W - p.r; p.vx = -Math.abs(p.vx) * 0.3; }
    for (var j = i + 1; j < G.pigs.length; j++) resolveCircleCircle(p, G.pigs[j]);
  }

  /* блок-блок */
  for (i = 0; i < G.blocks.length; i++) {
    for (var k = i + 1; k < G.blocks.length; k++) resolveBlockBlock(G.blocks[i], G.blocks[k]);
  }

  /* летящие птицы */
  var flyers = [];
  if (G.flying) flyers.push(G.flying);
  for (i = 0; i < G.extraFlyers.length; i++) flyers.push(G.extraFlyers[i]);

  for (i = 0; i < flyers.length; i++) {
    var f = flyers[i];
    f.vy += G.GRAVITY * h;
    f.x += f.vx * h; f.y += f.vy * h;
    if (f.y + f.r > G.GROUND_Y) {
      f.y = G.GROUND_Y - f.r;
      f.vy = -Math.abs(f.vy) * 0.28;
      f.vx *= 0.76;
      if (Math.abs(f.vy) > 220 && G.SFX.hit) G.SFX.hit();
    }
    if (f.x - f.r < 0) { f.x = f.r; f.vx = Math.abs(f.vx) * 0.4; }
    if (f.x + f.r > G.WORLD_W) { f.x = G.WORLD_W - f.r; f.vx = -Math.abs(f.vx) * 0.4; }
    resolveCircleBlock(f);
    for (var m = 0; m < G.pigs.length; m++) {
      if (!G.pigs[m].dead) resolveCircleCircle(f, G.pigs[m]);
    }
  }
}

G.physics = function (dt) {
  acc += Math.min(dt, 0.05);
  var guard = 0;
  while (acc >= STEP && guard < 4) { step(STEP); acc -= STEP; guard++; }
  if (guard >= 4) acc = 0;

  /* уборка мёртвых блоков */
  for (var i = G.blocks.length - 1; i >= 0; i--) {
    if (G.blocks[i].dead && G.blocks[i].y > G.GROUND_Y + 60) G.blocks.splice(i, 1);
  }
};

/* ---------- выстрел ---------- */
G.shoot = function () {
  var a = G.active;
  if (!a || a.state !== 'ready') return false;
  var dx = a.x - G.SLING_X, dy = a.y - G.SLING_Y;
  if (dx * dx + dy * dy < 100) return false;

  var k = G.POWER * (G.has('gloves') ? 1.18 : 1);
  a.vx = -dx * k;
  a.vy = -dy * k;
  a.state = 'fly';
  G.flying = a;
  G.active = null;
  G.shots++;
  if (G.SFX.launch) G.SFX.launch();
  G.vibe(15);
  return true;
};

/* ---------- способности ---------- */
G.useAbility = function () {
  var f = G.flying;
  if (!f || f.used) return false;
  var type = f.type;

  if (type === 'yellow') {
    var sp = Math.sqrt(f.vx * f.vx + f.vy * f.vy) || 1;
    f.vx *= 1.75; f.vy *= 1.75;
    part(f.x, f.y, '#ffe07a', 10, 200, 5);
    G.save.boosts = (G.save.boosts | 0) + 1;
    G.store();
  } else if (type === 'blue') {
    var a = Math.atan2(f.vy, f.vx);
    for (var i = -1; i <= 1; i += 2) {
      var e = G.makeBird('blue', f.x, f.y);
      e.state = 'fly'; e.used = true;
      var ang = a + i * 0.22;
      var spd = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
      e.vx = Math.cos(ang) * spd;
      e.vy = Math.sin(ang) * spd;
      G.extraFlyers.push(e);
    }
    G.save.splits = (G.save.splits | 0) + 1;
    G.store();
    if (G.SFX.hit) G.SFX.hit();
  } else if (type === 'black') {
    G.explode(f.x, f.y, 210, 520);
    G.save.bombs = (G.save.bombs | 0) + 1;
    G.store();
    f.vx *= 0.2; f.vy *= 0.2;
  } else {
    return false;
  }

  f.used = true;
  return true;
};

/* ---------- следующая птица ---------- */
G.nextBird = function () {
  if (G.ended) return;
  G.spawnActive();
};

G.alivePigs = function () {
  var n = 0;
  for (var i = 0; i < G.pigs.length; i++) if (!G.pigs[i].dead) n++;
  return n;
};

/* ---------- исход ---------- */
G.checkEnd = function (dt) {
  if (!G.started || G.state !== 'play' || G.ended) return null;

  if (G.alivePigs() === 0) {
    G.winT += dt;
    if (G.winT > 0.45) { G.ended = true; return 'win'; }
    return null;
  }

  var birds = (G.active ? 1 : 0) + G.birdsLeft.length + (G.flying ? 1 : 0) + G.extraFlyers.length;
  if (birds === 0) {
    G.loseT += dt;
    if (G.loseT > 0.9) { G.ended = true; return 'lose'; }
  } else {
    G.loseT = 0;
  }
  return null;
};

/* ---------- награды и достижения ---------- */
function checkAchievements(oneShot) {
  var done = G.levelsDone(), stars = G.starsTotal(), kills = G.save.kills | 0;

  if (done >= 1) G.giveAch('lvl1');
  if (done >= 5) G.giveAch('lvl5');
  if (done >= 10) G.giveAch('lvl10');
  if (done >= 25) G.giveAch('lvl25');
  if (done >= 50) G.giveAch('lvl50');

  if (stars >= 15) G.giveAch('stars15');
  if (stars >= 60) G.giveAch('stars60');
  if (stars >= 150) G.giveAch('stars150');

  if (kills >= 10) G.giveAch('kills10');
  if (kills >= 50) G.giveAch('kills50');
  if (kills >= 200) G.giveAch('kills200');

  if (G.perfectCount() >= 5) G.giveAch('perfect5');
  if (G.save.coins >= 500) G.giveAch('coins500');
  if (G.save.coins >= 2000) G.giveAch('coins2000');

  if ((G.save.bombs | 0) >= 10) G.giveAch('bomb10');
  if ((G.save.splits | 0) >= 30) G.giveAch('split30');
  if ((G.save.boosts | 0) >= 30) G.giveAch('boost30');

  if (oneShot) G.giveAch('noshot');
}

G.finishLevel = function () {
  var left = (G.active ? 1 : 0) + G.birdsLeft.length;
  var stars = left >= 2 ? 3 : (left === 1 ? 2 : 1);

  var coins = 30 + stars * 20 + Math.round(G.score / 200);
  if (G.has('gift')) coins += 50;
  if (G.has('lucky')) coins *= 2;

  var prev = G.save.levels[G.level] | 0;
  if (stars > prev) G.save.levels[G.level] = stars;

  G.save.coins += coins;
  G.save.shots = (G.save.shots | 0) + G.shots;
  G.store();

  G.lastWin = { stars: stars, coins: coins, score: G.score };
  G.state = 'win';
  if (G.SFX.win) G.SFX.win();

  checkAchievements(G.shots === 1);
  return G.lastWin;
};

return G;
})();
