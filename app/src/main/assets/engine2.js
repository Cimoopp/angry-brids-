/* ============================================================
   ANGRY BIRDS — физика и игровая логика
   Дополняет engine.js. Экспорт: дописывает методы в window.ABG
   ============================================================ */
(function () {
'use strict';
var G = window.ABG;
if (!G) { console.error('ABG не загружен'); return; }
var R = window.ABR;

/* подгонка баланса: сила выстрела и гравитация */
G.GRAVITY = 1400;
G.POWER = 11.5;

var H = 1 / 120;

function rnd(a, b) { return a + Math.random() * (b - a); }
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function len(x, y) { return Math.sqrt(x * x + y * y); }

/* ---------------- частицы и очки ---------------- */
function debrisColor(m) {
  return m === 'ice' ? '#bfeaff' : m === 'stone' ? '#c9c9cf'
       : m === 'sand' ? '#e8d49b' : '#c98b3d';
}

function debris(x, y, m, n) {
  var col = m === 'pig' ? '#7ec45c' : debrisColor(m);
  for (var i = 0; i < (n || 8); i++) {
    G.parts.push({
      x: x, y: y,
      vx: rnd(-260, 260), vy: rnd(-420, -40),
      life: rnd(0.45, 1.1), color: col, size: rnd(2, 5)
    });
  }
}

function pop(x, y, val) {
  G.pops.push({
    x: x, y: y, t: 1, text: '+' + val,
    color: val >= 5000 ? '#ff6b5e' : '#ffd34d'
  });
}

G.alivePigs = function () {
  var n = 0;
  for (var i = 0; i < G.pigs.length; i++) if (!G.pigs[i].dead) n++;
  return n;
};

/* ---------------- урон ---------------- */
function hurtBlock(b, dmg) {
  if (b.dead || dmg <= 0) return;
  b.hp -= dmg;
  if (b.hp <= 0) {
    b.dead = true;
    G.stats.breaks++;
    G.score += 500;
    debris(b.x, b.y, b.m, 10);
    if (G.SFX.hit) G.SFX.hit();
    G.checkAch();
  }
}

function hurtPig(p, dmg) {
  if (p.dead || dmg <= 0) return;
  p.hp -= dmg;
  if (p.hp <= 0) {
    p.dead = true;
    G.stats.kills++;
    G.score += 5000;
    pop(p.x, p.y - p.r, 5000);
    debris(p.x, p.y, 'pig', 14);
    if (G.SFX.pig) G.SFX.pig();
    G.vibe(45);
    G.checkAch();
  }
}

/* ---------------- взрыв ---------------- */
G.explode = function (x, y, rad, k) {
  k = k || 1;
  var i, d, f;
  for (i = 0; i < G.blocks.length; i++) {
    var b = G.blocks[i];
    if (b.dead) continue;
    d = len(b.x - x, b.y - y);
    if (d < rad + 20) {
      f = 1 - d / (rad + 20);
      b.vx += (b.x - x) / (d + 1) * 620 * f * k;
      b.vy += (b.y - y) / (d + 1) * 620 * f * k - 120 * f;
      hurtBlock(b, 95 * f * k);
    }
  }
  for (i = 0; i < G.pigs.length; i++) {
    var p = G.pigs[i];
    if (p.dead) continue;
    d = len(p.x - x, p.y - y);
    if (d < rad + p.r) {
      f = 1 - d / (rad + p.r);
      p.vx += (p.x - x) / (d + 1) * 700 * f * k;
      p.vy += (p.y - y) / (d + 1) * 700 * f * k - 150 * f;
      hurtPig(p, 120 * f * k);
    }
  }
  debris(x, y, 'stone', 18);
  if (G.SFX.boom) G.SFX.boom();
  if (R && R.shake) R.shake(9 * k);
  if (R && R.burst) R.burst(x, y, 'boom');
};

/* ---------------- птицы ---------------- */
G.nextBird = function () {
  if (G.ended || G.flying) return;
  if (!G.birdsLeft.length) { G.active = null; return; }
  var t = G.birdsLeft.shift();
  var B = G.BIRDS[t] || G.BIRDS.red;
  G.active = {
    type: t, x: G.SLING_X, y: G.SLING_Y,
    vx: 0, vy: 0, r: B.r, mass: B.mass, ability: B.ability,
    state: 'ready', used: false, hp: 100, still: 0
  };
};

G.shoot = function () {
  var a = G.active;
  if (!a || a.state !== 'ready') return false;
  var dx = a.x - G.SLING_X, dy = a.y - G.SLING_Y;
  var d = len(dx, dy);
  if (d < 10) return false;

  var pw = G.POWER * (G.has('boots') ? 1.10 : 1);
  a.vx = -dx * pw;
  a.vy = -dy * pw;
  a.state = 'fly';
  G.flying = a;
  G.active = null;
  G.shots++;
  G.stats.shots++;
  G.checkAch();
  if (R && R.burst) R.burst(a.x, a.y, 'hit');
  return true;
};

G.useAbility = function () {
  var f = G.flying;
  if (!f || f.used) return false;
  if (f.ability === 'none') return false;

  if (f.ability === 'boost') {
    var sp = len(f.vx, f.vy) || 200;
    f.vx = f.vx / sp * Math.max(sp * 2.1, 1500);
    f.vy = f.vy / sp * Math.max(sp * 2.1, 1500) - 40;
    if (G.SFX.boost) G.SFX.boost();
    if (R && R.burst) R.burst(f.x, f.y, 'hit');
  } else if (f.ability === 'split') {
    var ang = Math.atan2(f.vy, f.vx);
    var sp2 = len(f.vx, f.vy) || 300;
    var offs = [-0.28, 0.28], i;
    for (i = 0; i < offs.length; i++) {
      var aa = ang + offs[i];
      G.extraFlyers.push({
        type: f.type, x: f.x, y: f.y,
        vx: Math.cos(aa) * sp2, vy: Math.sin(aa) * sp2,
        r: f.r, mass: f.mass, used: true, ability: 'none'
      });
    }
    if (G.SFX.split) G.SFX.split();
  } else if (f.ability === 'bomb') {
    G.stats.bombs++;
    G.explode(f.x, f.y, 150, 1.35);
    f.used = true;
    f.state = 'done';
    G.flying = null;
    G.nextBird();
    if (window.ABUI) window.ABUI.syncHud();
    G.checkAch();
    return true;
  }

  f.used = true;
  G.checkAch();
  return true;
};

/* ---------------- коллизии ---------------- */
function resolveBlocks(a, b) {
  var ax1 = a.x - a.w / 2, ax2 = a.x + a.w / 2;
  var ay1 = a.y - a.h / 2, ay2 = a.y + a.h / 2;
  var bx1 = b.x - b.w / 2, bx2 = b.x + b.w / 2;
  var by1 = b.y - b.h / 2, by2 = b.y + b.h / 2;

  var ox = Math.min(ax2, bx2) - Math.max(ax1, bx1);
  var oy = Math.min(ay2, by2) - Math.max(ay1, by1);
  if (ox <= 0 || oy <= 0) return;

  var mA = (G.MAT[a.m] && G.MAT[a.m].dens) || 1;
  var mB = (G.MAT[b.m] && G.MAT[b.m].dens) || 1;
  var tot = mA + mB;

  var impact = len(a.vx - b.vx, a.vy - b.vy);

  if (ox < oy) {
    var sa = ox * (mB / tot), sb = ox * (mA / tot);
    if (a.x < b.x) { a.x -= sa; b.x += sb; } else { a.x += sa; b.x -= sb; }
    var vx = (a.vx * mA + b.vx * mB) / tot;
    a.vx = a.vx * 0.5 + vx * 0.5;
    b.vx = b.vx * 0.5 + vx * 0.5;
  } else {
    var sa2 = oy * (mB / tot), sb2 = oy * (mA / tot);
    if (a.y < b.y) { a.y -= sa2; b.y += sb2; } else { a.y += sa2; b.y -= sb2; }
    var vy = (a.vy * mA + b.vy * mB) / tot;
    a.vy = a.vy * 0.4 + vy * 0.6;
    b.vy = b.vy * 0.4 + vy * 0.6;
  }

  if (impact > 220) {
    hurtBlock(a, (impact - 220) * 0.06);
    hurtBlock(b, (impact - 220) * 0.06);
    if (impact > 460 && G.SFX.hit) G.SFX.hit();
  }
}

function hitBlockByCircle(c, b, isBird) {
  var hw = b.w / 2, hh = b.h / 2;
  var px = clamp(c.x, b.x - hw, b.x + hw);
  var py = clamp(c.y, b.y - hh, b.y + hh);
  var dx = c.x - px, dy = c.y - py;
  var d = len(dx, dy);
  if (d >= c.r) return false;

  var nx, ny, pen;
  if (d < 0.001) {
    nx = 0; ny = -1; pen = c.r;
  } else {
    nx = dx / d; ny = dy / d; pen = c.r - d;
  }

  var speed = len(c.vx, c.vy);
  c.x += nx * pen;
  c.y += ny * pen;

  var dot = c.vx * nx + c.vy * ny;
  c.vx -= dot * nx * 1.35;
  c.vy -= dot * ny * 1.35;

  var dens = (G.MAT[b.m] && G.MAT[b.m].dens) || 1;
  if (isBird) {
    var m = c.mass || 1;
    b.vx -= nx * speed * 0.34 * m / dens;
    b.vy -= ny * speed * 0.34 * m / dens;
    if (speed > 260) hurtBlock(b, (speed - 260) * 0.09 * m / dens);
  } else {
    if (speed > 300) hurtBlock(b, (speed - 300) * 0.03);
  }
  return true;
}

function hitPigByCircle(c, p, isBird) {
  var dx = c.x - p.x, dy = c.y - p.y;
  var d = len(dx, dy);
  var min = c.r + p.r;
  if (d >= min) return false;
  var nx, ny;
  if (d < 0.001) { nx = 0; ny = -1; d = 0.001; } else { nx = dx / d; ny = dy / d; }

  var pen = min - d;
  c.x += nx * pen * 0.6;
  c.y += ny * pen * 0.6;
  p.x -= nx * pen * 0.4;
  p.y -= ny * pen * 0.4;

  var speed = len(c.vx, c.vy);
  var by = isBird ? speed * (c.mass || 1) : speed;
  p.vx -= nx * by * 0.35;
  p.vy -= ny * by * 0.35;
  if (by > 210) hurtPig(p, (by - 210) * 0.20);
  return true;
}

/* ---------------- шаг физики ---------------- */
function integrate(list, h, isBird) {
  for (var i = 0; i < list.length; i++) {
    var c = list[i];
    if (c.dead) continue;
    c.vy += G.GRAVITY * h;
    c.x += c.vx * h;
    c.y += c.vy * h;
    c.vx *= 0.999;
    if (c.x < c.r) { c.x = c.r; c.vx = Math.abs(c.vx) * 0.4; }
    if (c.x > G.WORLD_W - c.r) { c.x = G.WORLD_W - c.r; c.vx = -Math.abs(c.vx) * 0.4; }

    if (c.y + c.r > G.GROUND_Y) {
      c.y = G.GROUND_Y - c.r;
      if (isBird && c.vy > 200) {
        if (G.SFX.hit) G.SFX.hit();
        if (R && R.burst) R.burst(c.x, G.GROUND_Y, 'hit');
      }
      c.vy = c.vy > 0 ? -c.vy * 0.22 : c.vy;
      c.vx *= 0.72;
    }
  }
}

function step(h) {
  var i, j, b;

  /* блоки: свободное падение */
  for (i = 0; i < G.blocks.length; i++) {
    b = G.blocks[i];
    if (b.dead) continue;
    b.vy += G.GRAVITY * h;
    b.x += b.vx * h;
    b.y += b.vy * h;
    b.vx *= 0.992;

    if (b.y + b.h / 2 > G.GROUND_Y) {
      b.y = G.GROUND_Y - b.h / 2;
      if (b.vy > 250) hurtBlock(b, (b.vy - 250) * 0.05);
      b.vy = 0;
      b.vx *= 0.66;
    }
    if (b.x - b.w / 2 < 0) { b.x = b.w / 2; b.vx = Math.abs(b.vx) * 0.3; }
    if (b.x + b.w / 2 > G.WORLD_W) { b.x = G.WORLD_W - b.w / 2; b.vx = -Math.abs(b.vx) * 0.3; }
  }

  /* блоки между собой */
  for (i = 0; i < G.blocks.length; i++) {
    if (G.blocks[i].dead) continue;
    for (j = i + 1; j < G.blocks.length; j++) {
      if (G.blocks[j].dead) continue;
      resolveBlocks(G.blocks[i], G.blocks[j]);
    }
  }

  /* свиньи */
  integrate(G.pigs, h, false);

  /* птицы */
  if (G.flying) integrate([G.flying], h, true);
  integrate(G.extraFlyers, h, true);

  /* контакты птиц со свиньями и блоками */
  var flyers = [];
  if (G.flying) flyers.push(G.flying);
  for (i = 0; i < G.extraFlyers.length; i++) flyers.push(G.extraFlyers[i]);

  for (i = 0; i < flyers.length; i++) {
    var c = flyers[i];
    for (j = 0; j < G.pigs.length; j++) {
      if (!G.pigs[j].dead) hitPigByCircle(c, G.pigs[j], true);
    }
    for (j = 0; j < G.blocks.length; j++) {
      if (!G.blocks[j].dead) hitBlockByCircle(c, G.blocks[j], true);
    }
  }

  /* свиньи о блоки и друг о друга */
  for (i = 0; i < G.pigs.length; i++) {
    var p = G.pigs[i];
    if (p.dead) continue;
    for (j = 0; j < G.blocks.length; j++) {
      if (!G.blocks[j].dead) hitBlockByCircle(p, G.blocks[j], false);
    }
    for (j = i + 1; j < G.pigs.length; j++) {
      if (G.pigs[j].dead) continue;
      var dx = p.x - G.pigs[j].x, dy = p.y - G.pigs[j].y;
      var d = len(dx, dy), min = p.r + G.pigs[j].r;
      if (d > 0.001 && d < min) {
        var nx = dx / d, ny = dy / d, pen = (min - d) / 2;
        p.x += nx * pen; p.y += ny * pen;
        G.pigs[j].x -= nx * pen; G.pigs[j].y -= ny * pen;
        if (len(p.vx, p.vy) > 300) hurtPig(p, 20);
      }
    }
  }
}

G.physics = function (dt) {
  var steps = Math.max(1, Math.min(4, Math.round(dt / H)));
  var h = dt / steps;
  for (var s = 0; s < steps; s++) step(h);
};

/* ---------------- исход уровня ---------------- */
G.checkEnd = function (dt) {
  if (!G.started || G.ended) return null;

  if (G.alivePigs() === 0) {
    G.winT += dt;
    if (G.winT >= 0.45) {
      G.finishLevel();
      G.ended = true;
      G.state = 'win';
      if (G.SFX.win) G.SFX.win();
      return 'win';
    }
    return null;
  }

  var pending = G.birdsLeft.length + (G.active ? 1 : 0) + (G.flying ? 1 : 0) + G.extraFlyers.length;
  if (pending === 0) {
    G.loseT += dt;
    if (G.loseT >= 1.1) {
      G.ended = true;
      G.state = 'lose';
      if (G.SFX.lose) G.SFX.lose();
      return 'lose';
    }
  } else {
    G.loseT = 0;
  }
  return null;
};

})();
