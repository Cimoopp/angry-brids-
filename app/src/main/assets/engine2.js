/* ============================================================
   ANGRY BIRDS — физика и игровая логика
   Работает поверх объектов, созданных в engine.js:
     G.blocks  { x, y, w, h, m, hp, max, dead, vy, fall }
     G.pigs    { x, y, r, hp, max, dead }
     G.active  { type, x, y, r, state, used, vx, vy }
     G.flying  — та же структура, что active
   Экспорт: G.physics / G.shoot / G.useAbility / G.checkEnd
   ============================================================ */
(function () {
'use strict';

var G = window.ABG;
if (!G) { console.error('ABG не загружен'); return; }

var SUB = 4;
var REST = 0.24;
var MASS = { red: 1.0, yellow: 0.9, blue: 0.7, black: 1.25, ram: 1.7 };

function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function rnd(a, b) { return a + Math.random() * (b - a); }
function len(x, y) { return Math.sqrt(x * x + y * y); }
function dmg(speed, mass) { return Math.max(0, (speed - 120) * mass * 0.075); }

/* ---------- разрушение ---------- */
function killBlock(b, quiet) {
  if (b.dead) return;
  b.dead = true;
  G.score += 500;
  G.save.coins += G.MAT[b.m].coins;
  G.burst(b.x, b.y, 12, G.MAT[b.m].fill, 260);
  if (!quiet && G.SFX && G.SFX.crack) G.SFX.crack();
  dropSupport(b);
}

function killPig(p) {
  if (p.dead) return;
  p.dead = true;
  var add = 5000 + Math.floor(Math.random() * 500);
  G.score += add;
  G.save.coins += 25;
  G.save.kills = (G.save.kills | 0) + 1;
  G.addPop(p.x, p.y, '+' + add);
  G.burst(p.x, p.y, 18, '#8ed14b', 320);
  if (G.SFX && G.SFX.pop) G.SFX.pop();
  G.vibe(35);
}

/* после разрушения блока — проверяем, не осталось ли что-то в воздухе */
function dropSupport(gone) {
  var i, j, b, s, sup;
  for (i = 0; i < G.blocks.length; i++) {
    b = G.blocks[i];
    if (b.dead || b.fall) continue;
    if (b.y + b.h / 2 >= G.GROUND_Y - 3) continue;
    sup = false;
    for (j = 0; j < G.blocks.length; j++) {
      s = G.blocks[j];
      if (s === b || s.dead) continue;
      var overlapX = (b.w + s.w) / 2 - Math.abs(b.x - s.x);
      var touchY = Math.abs((b.y + b.h / 2) - (s.y - s.h / 2));
      if (overlapX > 2 && touchY < 7) { sup = true; break; }
    }
    if (!sup) b.fall = true;
  }
  for (i = 0; i < G.pigs.length; i++) {
    var p = G.pigs[i];
    if (p.dead) continue;
    if (p.y + p.r >= G.GROUND_Y - 3) continue;
    sup = false;
    for (j = 0; j < G.blocks.length; j++) {
      s = G.blocks[j];
      if (s.dead) continue;
      if (Math.abs(p.x - s.x) < (p.r + s.w / 2) &&
          Math.abs((p.y + p.r) - (s.y - s.h / 2)) < 7) { sup = true; break; }
    }
    if (!sup) p.fall = true;
  }
}

/* ---------- столкновения ---------- */
function ballBlock(o, b) {
  if (b.dead) return;
  var cx = clamp(o.x, b.x - b.w / 2, b.x + b.w / 2);
  var cy = clamp(o.y, b.y - b.h / 2, b.y + b.h / 2);
  var dx = o.x - cx, dy = o.y - cy, d = len(dx, dy);
  if (d >= o.r) return;

  var nx = d > 0.01 ? dx / d : 0, ny = d > 0.01 ? dy / d : -1;
  o.x = cx + nx * o.r; o.y = cy + ny * o.r;
  var vn = o.vx * nx + o.vy * ny;
  o.vx -= 1.4 * vn * nx; o.vy -= 1.4 * vn * ny;

  var sp = Math.abs(vn);
  var d2 = dmg(sp, (MASS[o.type] || 1) * 1.5);
  if (d2 > 0) {
    b.hp -= d2;
    if (b.hp <= 0) killBlock(b);
    if (sp > 420 && G.SFX && G.SFX.hit) G.SFX.hit();
  }
}

function ballPig(o, p) {
  if (p.dead) return;
  var dx = o.x - p.x, dy = o.y - p.y, d = len(dx, dy), rr = o.r + p.r;
  if (d >= rr || d < 0.001) return;
  var nx = dx / d, ny = dy / d;
  o.x = p.x + nx * rr; o.y = p.y + ny * rr;
  var vn = o.vx * nx + o.vy * ny;
  o.vx -= 1.3 * vn * nx; o.vy -= 1.3 * vn * ny;
  p.hp -= dmg(Math.abs(vn), (MASS[o.type] || 1) * 1.9);
  if (p.hp <= 0) killPig(p);
}

/* птица задела свинью, лежащую на блоке — блок тоже получает удар */
function swarmDamage(x, y, power) {
  var i, dx, dy, d;
  for (i = 0; i < G.blocks.length; i++) {
    var b = G.blocks[i];
    if (b.dead) continue;
    dx = b.x - x; dy = b.y - y; d = len(dx, dy);
    if (d < 120 + Math.max(b.w, b.h) * 0.4) {
      b.hp -= power * (1 - d / 180) * 0.6;
      if (!b.fall && b.y + b.h / 2 < G.GROUND_Y - 3) b.fall = true;
      if (b.hp <= 0) killBlock(b);
    }
  }
  for (i = 0; i < G.pigs.length; i++) {
    var p = G.pigs[i];
    if (p.dead) continue;
    dx = p.x - x; dy = p.y - y; d = len(dx, dy);
    if (d < 120 + p.r) {
      p.hp -= power * (1 - d / 180);
      p.vy -= 90;
      p.fall = true;
      if (p.hp <= 0) killPig(p);
    }
  }
}

function explode(x, y) {
  G.burst(x, y, 30, '#ff9b2f', 420);
  G.burst(x, y, 14, '#fff1c2', 300);
  swarmDamage(x, y, 190);
  if (G.SFX && G.SFX.boom) G.SFX.boom();
  G.vibe(60);
}

/* ---------- шаг физики ---------- */
function step(h) {
  var i, j, b, p, o;

  /* падающие блоки */
  for (i = 0; i < G.blocks.length; i++) {
    b = G.blocks[i];
    if (b.dead || !b.fall) continue;
    b.vy = (b.vy || 0) + G.GRAVITY * h;
    b.y += b.vy * h;
    if (b.y + b.h / 2 >= G.GROUND_Y) {
      b.y = G.GROUND_Y - b.h / 2;
      var sp = Math.abs(b.vy);
      b.vy = 0; b.fall = false;
      if (sp > 260) { b.hp -= dmg(sp, 1.2); if (b.hp <= 0) killBlock(b, true); }
    }
    for (j = 0; j < G.blocks.length; j++) {
      var s = G.blocks[j];
      if (s === b || s.dead) continue;
      var ox = (b.w + s.w) / 2 - Math.abs(b.x - s.x);
      var oy = (b.h + s.h) / 2 - Math.abs(b.y - s.y);
      if (ox <= 0 || oy <= 0) continue;
      if (b.y < s.y) { b.y = s.y - s.h / 2 - b.h / 2; }
      else { b.y = s.y + s.h / 2 + b.h / 2; }
      var rel = Math.abs(b.vy);
      b.vy = 0; b.fall = false;
      if (rel > 300) {
        b.hp -= dmg(rel, 1.0); s.hp -= dmg(rel, 1.0);
        if (b.hp <= 0) killBlock(b, true);
        if (s.hp <= 0) killBlock(s, true);
      }
      break;
    }
  }

  /* свиньи */
  for (i = 0; i < G.pigs.length; i++) {
    p = G.pigs[i];
    if (p.dead) continue;
    if (p.fall) {
      p.vy = (p.vy || 0) + G.GRAVITY * h;
      p.y += p.vy * h;
    } else if (Math.abs(p.vy || 0) > 1) {
      p.y += p.vy * h;
      p.vy = (p.vy || 0) * 0.9;
    }
    if (p.y + p.r >= G.GROUND_Y) {
      p.y = G.GROUND_Y - p.r;
      var sp2 = Math.abs(p.vy || 0);
      p.vy = 0; p.fall = false;
      if (sp2 > 380) { p.hp -= 26; if (p.hp <= 0) killPig(p); }
      continue;
    }
    for (j = 0; j < G.blocks.length; j++) {
      var bs = G.blocks[j];
      if (bs.dead) continue;
      var top = bs.y - bs.h / 2;
      if (p.y + p.r >= top && p.y + p.r <= top + 26 &&
          Math.abs(p.x - bs.x) < (p.r + bs.w / 2) * 0.9) {
        p.y = top - p.r;
        var s3 = Math.abs(p.vy || 0);
        p.vy = 0; p.fall = false;
        if (s3 > 380) { p.hp -= 24; if (p.hp <= 0) killPig(p); }
        break;
      }
    }
  }

  /* летящие птицы */
  var flyers = [];
  if (G.flying) flyers.push(G.flying);
  for (i = 0; i < G.extraFlyers.length; i++) flyers.push(G.extraFlyers[i]);

  for (i = 0; i < flyers.length; i++) {
    o = flyers[i];
    o.vy += G.GRAVITY * h;
    o.x += o.vx * h; o.y += o.vy * h;
    for (j = 0; j < G.blocks.length; j++) ballBlock(o, G.blocks[j]);
    for (j = 0; j < G.pigs.length; j++) ballPig(o, G.pigs[j]);
    if (o.y + o.r > G.GROUND_Y) {
      o.y = G.GROUND_Y - o.r;
      o.vy = -o.vy * 0.3;
      o.vx *= 0.8;
    }
  }
}

G.physics = function (dt) {
  var n = clamp(Math.ceil(dt / 0.008), 1, SUB);
  var h = dt / n, i;
  for (i = 0; i < n; i++) step(h);

  /* долгий покой: подросшие трещины у слабых блоков */
  for (i = 0; i < G.blocks.length; i++) {
    var b = G.blocks[i];
    if (b.dead || b.fall) continue;
    var ratio = b.hp / b.max;
    if (ratio < 0.3 && b.y + b.h / 2 >= G.GROUND_Y - 3) { b.hp -= dt * 6; if (b.hp <= 0) killBlock(b, true); }
  }
};

/* ---------- выстрел ---------- */
G.shoot = function () {
  var a = G.active;
  if (!a || a.state !== 'ready') return false;
  var dx = G.SLING_X - a.x, dy = G.SLING_Y - a.y;
  var d = len(dx, dy);
  if (d < 14) return false;
  a.vx = dx * G.POWER;
  a.vy = dy * G.POWER;
  a.x = G.SLING_X; a.y = G.SLING_Y;
  a.state = 'fly';
  a.used = false;
  a.type2 = a.type;
  G.flying = a;
  G.active = null;
  G.save.shots = (G.save.shots | 0) + 1;
  if (G.SFX && G.SFX.launch) G.SFX.launch();
  return true;
};

G.useAbility = function () {
  var f = G.flying;
  if (!f || f.used) return false;
  f.used = true;

  if (f.type === 'yellow') {
    f.vx *= 2.2; f.vy *= 1.15;
    if (G.SFX && G.SFX.hit) G.SFX.hit();
  } else if (f.type === 'blue') {
    var i, e, ang, c, s;
    for (i = -1; i <= 1; i += 2) {
      ang = 0.4 * i; c = Math.cos(ang); s = Math.sin(ang);
      e = { type: 'blue', x: f.x, y: f.y, r: G.BIRD.blue.r, state: 'fly', used: true,
            vx: f.vx * c - f.vy * s, vy: f.vx * s + f.vy * c };
      G.extraFlyers.push(e);
    }
    if (G.SFX && G.SFX.hit) G.SFX.hit();
  } else if (f.type === 'black') {
    explode(f.x, f.y);
    f.dead = true;
    G.flying = null;
    G.nextBird();
  } else if (f.type === 'ram') {
    f.vx *= 1.35; f.vy *= 1.15;
    swarmDamage(f.x, f.y, 110);
  }
  return true;
};

/* ---------- следующая птица ---------- */
G.nextBird = function () {
  if (!G.birdsLeft.length) { G.active = null; return false; }
  var t = G.birdsLeft.shift();
  G.active = { type: t, x: G.SLING_X, y: G.SLING_Y, r: G.BIRD[t].r,
               state: 'ready', used: false, vx: 0, vy: 0 };
  return true;
};

/* ---------- конец уровня ---------- */
G.settle = function () {
  var i;
  if (G.flying) return false;
  if (G.extraFlyers.length) return false;
  for (i = 0; i < G.blocks.length; i++) {
    var b = G.blocks[i];
    if (!b.dead && b.fall) return false;
  }
  for (i = 0; i < G.pigs.length; i++) {
    var p = G.pigs[i];
    if (!p.dead && p.fall) return false;
  }
  return true;
};

G.checkEnd = function (dt) {
  if (G.ended) return null;
  G.winT = G.winT || 0; G.loseT = G.loseT || 0;

  if (G.alivePigs() === 0) {
    G.winT += dt;
    if (G.winT > 0.9) { G.ended = true; return G.finishLevel(); }
    return null;
  }

  if (!G.active && !G.flying && !G.birdsLeft.length && G.settle()) {
    G.loseT += dt;
    if (G.loseT > 0.7) { G.ended = true; G.state = 'over'; return 'lose'; }
  } else {
    G.loseT = 0;
  }
  return null;
};

G.finishLevel = function () {
  var i, stars;
  for (i = 0; i < G.birdsLeft.length; i++) G.score += 10000;

  var coins = 50;
  if (G.save.items.pantry) coins = Math.round(coins * 1.25);
  G.save.coins += coins;

  stars = G.score >= 42000 ? 3 : (G.score >= 26000 ? 2 : 1);
  var prev = G.save.levels[G.level] | 0;
  if (stars > prev) G.save.levels[G.level] = stars;
  if (!G.save.best) G.save.best = {};
  G.save.best[G.level] = Math.max(G.save.best[G.level] | 0, G.score);
  G.save.wins = (G.save.wins | 0) + 1;

  G.lastWin = { stars: stars, coins: coins, score: G.score, level: G.level };
  G.state = 'over';
  G.musicStop();
  if (G.checkAch) G.checkAch();
  G.store();
  if (G.SFX && G.SFX.star) G.SFX.star();
  return 'win';
};

})();
