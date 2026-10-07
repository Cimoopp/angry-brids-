/* ============================================================
   ANGRY BIRDS — физика и правила уровня
   Дополняет engine.js: G.physics, G.shoot, G.useAbility,
   G.checkEnd, G.finishLevel
   ============================================================ */
(function () {
'use strict';
var G = window.ABG;
if (!G) { console.error('ABG не загружен'); return; }

var H = 1 / 120;
var DMG = 0.09;      /* урон = скорость удара * DMG * массу */
var MIN_HIT = 190;   /* ниже этой скорости удары безвредны */

function len(x, y) { return Math.sqrt(x * x + y * y); }

/* ---------- интеграция ---------- */
function integrate(h) {
  var i, b, p, f;
  for (i = 0; i < G.blocks.length; i++) {
    b = G.blocks[i];
    if (b.static) continue;
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
    p.vx *= 0.998;
  }
  var flyers = [];
  if (G.flying && !G.flying.dead) flyers.push(G.flying);
  for (i = 0; i < G.extraFlyers.length; i++) flyers.push(G.extraFlyers[i]);
  for (i = 0; i < flyers.length; i++) {
    f = flyers[i];
    f.vy += G.GRAVITY * h;
    f.x += f.vx * h;
    f.y += f.vy * h;
  }
  G._flyers = flyers;
}

/* ---------- земля ---------- */
function ground(h) {
  var i, b, p, f, flyers = G._flyers || [];
  for (i = 0; i < G.blocks.length; i++) {
    b = G.blocks[i];
    var bot = b.y + b.h / 2;
    if (bot > G.GROUND_Y) {
      b.y = G.GROUND_Y - b.h / 2;
      if (b.vy > 260) G.burst(b.x, G.GROUND_Y - 6, G.MAT[b.mat].fill, 4);
      b.vy = 0;
      b.vx *= 0.7;
      b.slp = 0.25;
    }
  }
  for (i = 0; i < G.pigs.length; i++) {
    p = G.pigs[i];
    if (p.dead) continue;
    if (p.y + p.r > G.GROUND_Y) {
      p.y = G.GROUND_Y - p.r;
      if (p.vy > 420) hurtPig(p, p.vy * 0.07, p.x, p.y);
      p.vy = p.vy > 0 ? -p.vy * 0.25 : p.vy;
      p.vx *= 0.8;
    }
  }
  for (i = 0; i < flyers.length; i++) {
    f = flyers[i];
    if (f.y + f.r > G.GROUND_Y) {
      f.y = G.GROUND_Y - f.r;
      f.vy = f.vy > 0 ? -f.vy * 0.3 : f.vy;
      f.vx *= 0.75;
      f.ground = true;
    }
  }
}

/* ---------- блок против блока ---------- */
function blocksVsBlocks() {
  var list = G.blocks, i, j, a, b;
  for (i = 0; i < list.length; i++) {
    a = list[i];
    if (a.dead) continue;
    for (j = i + 1; j < list.length; j++) {
      b = list[j];
      if (b.dead) continue;
      if (a.static && b.static) continue;
      var dx = b.x - a.x, dy = b.y - a.y;
      var ox = (a.w + b.w) / 2 - Math.abs(dx);
      var oy = (a.h + b.h) / 2 - Math.abs(dy);
      if (ox <= 0 || oy <= 0) continue;

      var rel = len(a.vx - b.vx, a.vy - b.vy);
      var ma = a.static ? Infinity : G.MAT[a.mat].dens;
      var mb = b.static ? Infinity : G.MAT[b.mat].dens;
      var total = (isFinite(ma) ? ma : 0) + (isFinite(mb) ? mb : 0);

      if (ox < oy) {
        var pushX = ox * (dx < 0 ? -1 : 1) / 2;
        if (!a.static) a.x -= pushX;
        if (!b.static) b.x += pushX;
        var vx = (isFinite(total) && total > 0)
          ? (a.vx * (isFinite(ma) ? ma : 0) + b.vx * (isFinite(mb) ? mb : 0)) / total : 0;
        if (!a.static) a.vx = vx;
        if (!b.static) b.vx = vx;
      } else {
        var pushY = oy * (dy < 0 ? -1 : 1) / 2;
        if (!a.static) a.y -= pushY;
        if (!b.static) b.y += pushY;
        var vy = (isFinite(total) && total > 0)
          ? (a.vy * (isFinite(ma) ? ma : 0) + b.vy * (isFinite(mb) ? mb : 0)) / total : 0;
        if (!a.static) a.vy = vy;
        if (!b.static) b.vy = vy;
      }

      if (rel > MIN_HIT) {
        hurtBlock(a, rel * DMG * (isFinite(mb) ? mb : 1.8) * 0.6);
        hurtBlock(b, rel * DMG * (isFinite(ma) ? ma : 1.8) * 0.6);
      }
    }
  }
}

/* ---------- круг против блока ---------- */
function circlesVsBlocks() {
  var flyers = G._flyers || [], i, j, f, b, p, list;
  var circles = [];
  for (i = 0; i < flyers.length; i++) circles.push({ c: flyers[i], bird: true });
  for (i = 0; i < G.pigs.length; i++) if (!G.pigs[i].dead) circles.push({ c: G.pigs[i], pig: true });

  for (i = 0; i < circles.length; i++) {
    var it = circles[i];
    var c = it.c;
    for (j = 0; j < G.blocks.length; j++) {
      b = G.blocks[j];
      if (b.dead) continue;
      var cx = Math.max(b.x - b.w / 2, Math.min(c.x, b.x + b.w / 2));
      var cy = Math.max(b.y - b.h / 2, Math.min(c.y, b.y + b.h / 2));
      var dx = c.x - cx, dy = c.y - cy;
      var d = len(dx, dy);
      if (d > c.r) continue;
      if (d < 0.001) { dx = 0; dy = -1; d = 0.001; }
      var nx = dx / d, ny = dy / d;
      var push = c.r - d;
      c.x += nx * push;
      c.y += ny * push;

      var rel = len(c.vx - b.vx, c.vy - b.vy);
      var mass = b.static ? 2.4 : G.MAT[b.mat].dens;
      if (rel > MIN_HIT) {
        if (it.bird) {
          var mult = it.c.type === 'black' ? 1.5 : (it.c.type === 'yellow' ? 1.25 : 1);
          hurtBlock(b, rel * DMG * c.mass * mass * mult);
          if (G.SFX.hit) G.SFX.hit();
          G.vibe(12);
          if (G.save.vibe) { /* вибро уже вызвано */ }
        } else {
          hurtBlock(b, rel * DMG * 0.7);
          hurtPig(c, rel * 0.05, c.x, c.y);
        }
      }

      if (b.static) {
        if (nx < 0) c.vx = Math.abs(c.vx) * 0.35;
        else if (nx > 0) c.vx = -Math.abs(c.vx) * 0.35;
        c.vy *= 0.6;
      } else {
        var bounce = it.bird ? 0.42 : 0.3;
        var dot = c.vx * nx + c.vy * ny;
        c.vx -= (1 + bounce) * dot * nx;
        c.vy -= (1 + bounce) * dot * ny;
        b.vx -= nx * rel * 0.05 / Math.max(0.4, mass);
        b.vy -= ny * rel * 0.05 / Math.max(0.4, mass);
        b.slp = 0;
      }
    }
  }

  /* птица против свиньи */
  for (i = 0; i < flyers.length; i++) {
    f = flyers[i];
    for (j = 0; j < G.pigs.length; j++) {
      p = G.pigs[j];
      if (p.dead) continue;
      var ddx = p.x - f.x, ddy = p.y - f.y;
      var dist = len(ddx, ddy);
      if (dist > p.r + f.r || dist < 0.001) continue;
      var rel2 = len(f.vx - p.vx, f.vy - p.vy);
      p.vx += f.vx * 0.5;
      p.vy += f.vy * 0.5 - 40;
      hurtPig(p, rel2 * DMG * f.mass * 1.4, p.x, p.y);
      f.vx *= 0.55;
      f.vy *= 0.55;
    }
  }
}

/* ---------- урон ---------- */
function hurtBlock(b, dmg) {
  if (b.static || b.dead || !(dmg > 0)) return;
  b.hp -= dmg;
  if (b.hp <= 0) {
    b.dead = true;
    G.burst(b.x, b.y, G.MAT[b.mat].fill, 14);
    G.score += 200;
    if (G.SFX.break) G.SFX.break();
    G.save.coins = (G.save.coins | 0) + 3;
  }
}

function hurtPig(p, dmg, x, y) {
  if (p.dead) return;
  p.hp -= dmg;
  if (p.hp <= 0) {
    p.dead = true;
    G.score += 500;
    G.save.pigs = (G.save.pigs | 0) + 1;
    G.save.coins = (G.save.coins | 0) + 8;
    G.burst(x, y, '#7ddc6b', 16);
    G.pop('+500', x, y - 40, '#8ef07a');
    if (G.SFX.pop) G.SFX.pop();
    G.vibe(25);
    G.store();
  }
}

/* ---------- шаг ---------- */
function step(h) {
  integrate(h);
  circlesVsBlocks();
  blocksVsBlocks();
  ground(h);

  var i;
  for (i = G.blocks.length - 1; i >= 0; i--) if (G.blocks[i].dead) G.blocks.splice(i, 1);
  for (i = G.pigs.length - 1; i >= 0; i--) if (G.pigs[i].dead) G.pigs.splice(i, 1);
}

G.physics = function (dt) {
  var steps = Math.max(1, Math.min(4, Math.ceil(dt / H)));
  var h = dt / steps;
  for (var s = 0; s < steps; s++) step(h);
};

/* ---------- выстрел ---------- */
G.shoot = function () {
  var a = G.active;
  if (!a || a.state !== 'ready' || G.flying) return false;
  var dx = G.SLING_X - a.x, dy = G.SLING_Y - a.y;
  var pull = len(dx, dy);
  if (pull < 14) { a.x = G.SLING_X; a.y = G.SLING_Y; return false; }
  var k = G.POWER * 1.6 * (G.has('slingshot') ? 1.1 : 1);
  a.vx = dx * k;
  a.vy = dy * k;
  a.state = 'fly';
  a.ground = false;
  G.flying = a;
  G.active = null;
  if (G.SFX.bird) G.SFX.bird();
  return true;
};

/* ---------- способности ---------- */
G.useAbility = function () {
  var f = G.flying;
  if (!f || f.used) return false;
  var b = G.BIRDS[f.type];
  f.used = true;

  if (b.ability === 'boost') {
    var sp = len(f.vx, f.vy) || 1;
    var mult = 1.8;
    f.vx = f.vx / sp * sp * mult;
    f.vy = f.vy / sp * sp * mult;
    if (G.SFX.boost) G.SFX.boost();
    G.giveAch('yellow');
  } else if (b.ability === 'split') {
    var ang = Math.atan2(f.vy, f.vx);
    for (var s = -1; s <= 1; s += 2) {
      var a2 = ang + s * 0.28;
      var sp2 = len(f.vx, f.vy);
      G.extraFlyers.push({
        type: 'blue', x: f.x, y: f.y, r: f.r, mass: f.mass, used: true,
        vx: Math.cos(a2) * sp2, vy: Math.sin(a2) * sp2, ground: false
      });
    }
    if (G.SFX.split) G.SFX.split();
    G.giveAch('blue');
  } else if (b.ability === 'bomb') {
    explode(f.x, f.y, 165);
    G.giveAch('black');
  } else {
    return false;
  }
  G.vibe(20);
  return true;
};

function explode(x, y, radius) {
  var i, d;
  for (i = G.blocks.length - 1; i >= 0; i--) {
    var b = G.blocks[i];
    if (b.static) continue;
    d = len(b.x - x, b.y - y);
    if (d < radius) hurtBlock(b, 260 * (1 - d / radius));
  }
  for (i = 0; i < G.pigs.length; i++) {
    var p = G.pigs[i];
    if (p.dead) continue;
    d = len(p.x - x, p.y - y);
    if (d < radius) hurtPig(p, 240 * (1 - d / radius), p.x, p.y);
  }
  G.burst(x, y, '#ffb347', 30);
  G.burst(x, y, '#ff6a4d', 18);
  if (G.SFX.boom) G.SFX.boom();
  G.vibe(60);
}
G.explode = explode;

/* ---------- следующая птица ---------- */
G.nextBird = function () {
  G.flying = null;
  if (G.active) return;
  if (G.birdsLeft.length) {
    G.active = G.newBird();
  } else {
    G.active = null;
  }
};

/* ---------- конец уровня ---------- */
G.checkEnd = function (dt) {
  if (!G.started || G.ended || G.state !== 'play') return null;

  if (G.alivePigs() === 0) {
    G.winT += dt;
    if (G.winT > 0.45) { G.ended = true; G.finishLevel(); return 'win'; }
    return null;
  }

  var busy = !!G.flying || !!G.active || G.extraFlyers.length > 0;
  if (!busy) {
    G.loseT += dt;
    if (G.loseT > 0.9) { G.ended = true; if (G.SFX.lose) G.SFX.lose(); return 'lose'; }
  } else {
    G.loseT = 0;
  }
  return null;
};

G.finishLevel = function () {
  var left = (G.active ? 1 : 0) + G.birdsLeft.length;
  var stars = 1;
  if (left >= 2) stars = 2;
  if (left >= 3) stars = 3;
  if (G.level === 1 && stars < 2) stars = 2;

  var coins = 20 + stars * 10 + Math.floor(G.score / 200);
  var prev = G.save.stars[G.level] | 0;
  if (stars > prev) G.save.stars[G.level] = stars;
  G.save.coins = (G.save.coins | 0) + coins;
  G.lastWin = { stars: stars, coins: coins, score: G.score };
  G.unlockNext();
  G.checkAch();
  G.store();
  if (G.SFX.win) G.SFX.win();
  return G.lastWin;
};
})();
