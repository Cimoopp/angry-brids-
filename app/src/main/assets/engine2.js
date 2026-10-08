/* ============================================================
   ANGRY BIRDS — ФИЗИКА И ИГРОВАЯ ЛОГИКА
   тела, столкновения, урон, способности, конец уровня.
   Дополняет engine.js.  Экспорт: window.ABG (дополняется)
   ============================================================ */
(function () {
'use strict';
var G = window.ABG;
if (!G) { console.error('ABG не загружен'); return; }

var SUB = 1 / 120, MAXSUB = 4;
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function len(x, y) { return Math.sqrt(x * x + y * y); }

/* ---------------- создание тел ---------------- */
function mkBlock(b) {
  var m = G.MAT[b.mat] || G.MAT.wood;
  var hp = m.hp * (1 + G.level * 0.02);
  return { x: b.X, y: b.Y, w: b.W, h: b.H, vx: 0, vy: 0, mat: b.mat,
           stat: b.stat, hp: hp, max: hp, dead: false, rest: 0 };
}
function mkPig(p) {
  var hp = 55 + p.r * 3.4 + G.level * 3;
  return { x: p.x, y: p.y, r: p.r, vx: 0, vy: 0, hp: hp, max: hp, dead: false,
           still: 0, blink: 0 };
}
function mkBird(type) {
  var B = G.BIRDS[type] || G.BIRDS.red;
  return { type: type, x: G.SLING_X, y: G.SLING_Y, vx: 0, vy: 0, r: B.r,
           mass: B.mass, state: 'ready', used: false, dead: false,
           hp: B.hp * (G.has('helmet') ? 1.2 : 1), fly: 0, rot: 0 };
}

/* ---------------- постройка уровня ---------------- */
var baseStart = G.startLevel;
G.startLevel = function (n) {
  var L = baseStart.call(G, n);
  G.blocks = []; for (var i = 0; i < L.blocks.length; i++) G.blocks.push(mkBlock(L.blocks[i]));
  G.pigs = [];   for (var j = 0; j < L.pigs.length; j++)   G.pigs.push(mkPig(L.pigs[j]));
  G.birdsLeft = L.birds.slice();
  G.active = G.birdsLeft.length ? mkBird(G.birdsLeft.shift()) : null;
  G.flying = null; G.extraFlyers = []; G.parts = []; G.pops = [];
  return L;
};

/* ---------------- частицы и очки ---------------- */
function part(x, y, col, n, force) {
  for (var i = 0; i < (n || 8); i++) {
    var a = Math.random() * Math.PI * 2, s = (0.4 + Math.random()) * (force || 220);
    G.parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 90,
                   r: 2 + Math.random() * 4, col: col, life: 0.6 + Math.random() * 0.5 });
  }
}
function pop(x, y, txt, col) {
  G.pops.push({ x: x, y: y, t: 1, txt: txt, col: col || '#ffe066' });
}
G.addScore = function (v, x, y, txt, col) {
  G.score += v; G.save.total = (G.save.total || 0) + v;
  if (x !== undefined) pop(x, y, txt || ('+' + v), col);
};
G.part = part;
G.pop = pop;

/* ---------------- птица и выстрел ---------------- */
G.shoot = function () {
  var a = G.active;
  if (!a || a.state !== 'ready') return false;
  var dx = G.SLING_X - a.x, dy = G.SLING_Y - a.y;
  var d = len(dx, dy);
  if (d < 12) {                             // слабое натяжение — возврат
    a.x = G.SLING_X; a.y = G.SLING_Y; return false;
  }
  var pw = G.POWER * (G.has('boots') ? 1.1 : 1);
  a.vx = dx * pw; a.vy = dy * pw;
  a.state = 'fly'; a.fly = 0;
  G.flying = a; G.active = null;
  G.stats.shots++;
  G.unlockAch('a1');
  if (G.SFX.hit) G.SFX.hit();
  G.vibe(18);
  return true;
};

G.nextBird = function () {
  if (G.flying || G.active) return;
  if (G.birdsLeft.length) {
    G.active = mkBird(G.birdsLeft.shift());
  }
};

G.alivePigs = function () {
  var c = 0; for (var i = 0; i < G.pigs.length; i++) if (!G.pigs[i].dead) c++;
  return c;
};

/* ---------------- способности ---------------- */
G.useAbility = function () {
  var f = G.flying;
  if (!f || f.used) return false;
  var t = G.BIRDS[f.type].ability;
  if (t === 'none') return false;
  f.used = true;

  if (t === 'boost') {
    var s = len(f.vx, f.vy) || 1;
    f.vx = f.vx / s * Math.max(s * 1.75, 900);
    f.vy = f.vy / s * Math.max(s * 1.75, 900);
    G.stats.boosts++;
    if (G.SFX.boost) G.SFX.boost();
    part(f.x, f.y, '#ffe066', 10, 180);
    if (G.stats.boosts >= 10) G.unlockAch('a15');
  } else if (t === 'split') {
    for (var i = -1; i <= 1; i += 2) {
      var b = mkBird('blue');
      var ang = Math.atan2(f.vy, f.vx) + i * 0.22;
      var sp = len(f.vx, f.vy) || 700;
      b.x = f.x; b.y = f.y; b.state = 'fly';
      b.vx = Math.cos(ang) * sp; b.vy = Math.sin(ang) * sp;
      G.extraFlyers.push(b);
    }
    G.stats.splits++;
    if (G.SFX.split) G.SFX.split();
    if (G.stats.splits >= 10) G.unlockAch('a14');
  } else if (t === 'bomb') {
    explode(f.x, f.y, 165, 260);
    G.stats.bombs++;
    if (G.stats.bombs >= 10) G.unlockAch('a13');
    f.dead = true;
    G.flying = null;
    G.nextBird();
  }
  return true;
};

function explode(x, y, R, power) {
  if (G.SFX.boom) G.SFX.boom();
  G.vibe(60);
  part(x, y, '#ff9b3d', 26, 420);
  part(x, y, '#fff2b0', 14, 300);
  G.pops.push({ x: x, y: y, t: 1.2, txt: 'БУМ!', col: '#ff7b3d', big: true });

  var i, d;
  for (i = 0; i < G.blocks.length; i++) {
    var b = G.blocks[i]; if (b.dead) continue;
    d = Math.hypot(b.x + b.w / 2 - x, b.y + b.h / 2 - y);
    if (d < R) hitBlock(b, power * (1 - d / R) * 2.2, 0, -1);
  }
  for (i = 0; i < G.pigs.length; i++) {
    var p = G.pigs[i]; if (p.dead) continue;
    d = Math.hypot(p.x - x, p.y - y);
    if (d < R) killPig(p, 1.6);
  }
}
G.explode = explode;

/* ---------------- урон ---------------- */
function hitBlock(b, dmg, nx, ny) {
  if (b.dead || b.stat) return;
  b.hp -= dmg;
  if (nx) { b.vx += nx * dmg * 1.6; b.vy += ny * dmg * 1.6; }
  if (b.hp <= 0) {
    b.dead = true;
    var m = G.MAT[b.mat];
    var col = b.mat === 'ice' ? '#bfeaff' : (b.mat === 'stone' ? '#c9c9cf' : (b.mat === 'sand' ? '#e6d49a' : '#c98b3d'));
    part(b.x + b.w / 2, b.y + b.h / 2, col, 10, 200);
    G.stats.breaks++;
    G.addScore(100, b.x + b.w / 2, b.y, '+100');
    if (b.mat === 'ice' && G.SFX.ice) G.SFX.ice();
    else if (b.mat === 'stone' && G.SFX.stone) G.SFX.stone();
    else if (G.SFX.wood) G.SFX.wood();
    if (G.stats.breaks >= 100) G.unlockAch('a9');
  }
}
function killPig(p, force) {
  if (p.dead) return;
  p.dead = true;
  part(p.x, p.y, '#9ddc6a', 12, 220);
  G.stats.kills++;
  G.addScore(1000, p.x, p.y, '+1000', '#9ddc6a');
  if (G.SFX.pig) G.SFX.pig();
  G.vibe(30);
  if (G.stats.kills >= 25) G.unlockAch('a8');
}

/* ---------------- столкновения ---------------- */
function hitCircleBox(c, b, dmgK) {
  var cx = clamp(c.x, b.x, b.x + b.w), cy = clamp(c.y, b.y, b.y + b.h);
  var dx = c.x - cx, dy = c.y - cy;
  var d = len(dx, dy);
  if (d >= c.r) return false;
  var nx, ny;
  if (d < 0.001) {
    nx = 0; ny = -1;
    c.y = b.y - c.r;
  } else {
    nx = dx / d; ny = dy / d;
    var push = c.r - d;
    c.x += nx * push; c.y += ny * push;
  }
  var rel = Math.abs(c.vx * nx + c.vy * ny) + Math.abs(b.vx * nx + b.vy * ny);
  c.vx *= 0.62; c.vy *= 0.62;
  b.vx -= nx * rel * 0.16; b.vy -= ny * rel * 0.16;
  if (dmgK && rel > 90) hitBlock(b, rel * dmgK * (c.mass || 1) / 4, nx, ny);
  return true;
}
function hitBoxBox(a, b) {
  var ox = (a.w + b.w) / 2 - Math.abs((a.x + a.w / 2) - (b.x + b.w / 2));
  if (ox <= 0) return false;
  var oy = (a.h + b.h) / 2 - Math.abs((a.y + a.h / 2) - (b.y + b.h / 2));
  if (oy <= 0) return false;
  if (ox < oy) { a.x -= Math.sign(a.x - b.x) * ox * 0.5; b.x += Math.sign(a.x - b.x) * ox * 0.5; }
  else         { a.y -= Math.sign(a.y - b.y) * oy * 0.5; b.y += Math.sign(a.y - b.y) * oy * 0.5; }
  return true;
}

/* ---------------- шаг физики ---------------- */
function step(dt) {
  var i, j, b, p;

  /* блоки */
  for (i = 0; i < G.blocks.length; i++) {
    b = G.blocks[i]; if (b.dead) continue;
    b.vy += G.GRAVITY * dt;
    b.vx *= 0.995; b.vy *= 0.995;
    b.x += b.vx * dt; b.y += b.vy * dt;

    if (b.y + b.h > G.GROUND_Y) {              // земля
      b.y = G.GROUND_Y - b.h;
      if (b.vy > 120) hitBlock(b, (b.vy - 120) * 0.22, 0, -1);
      b.vy = 0; b.vx *= 0.82;
    }
    if (b.x < 0) { b.x = 0; b.vx = 0; }
  }

  /* блок ↔ блок */
  for (i = 0; i < G.blocks.length; i++) {
    var a = G.blocks[i]; if (a.dead) continue;
    for (j = i + 1; j < G.blocks.length; j++) {
      b = G.blocks[j]; if (b.dead) continue;
      if (hitBoxBox(a, b)) {
        var rel = Math.abs(a.vx - b.vx) + Math.abs(a.vy - b.vy);
        if (rel > 70) {
          hitBlock(a, rel * 0.035, 0, 0);
          hitBlock(b, rel * 0.035, 0, 0);
        }
      }
    }
  }

  /* птицы */
  var all = [];
  if (G.flying) all.push(G.flying);
  for (i = 0; i < G.extraFlyers.length; i++) all.push(G.extraFlyers[i]);

  for (i = 0; i < all.length; i++) {
    var f = all[i]; if (f.dead) continue;
    f.vy += G.GRAVITY * dt;
    f.x += f.vx * dt; f.y += f.vy * dt;
    f.rot = Math.atan2(f.vy, f.vx);
    f.fly += dt;

    for (j = 0; j < G.blocks.length; j++) {
      b = G.blocks[j]; if (b.dead) continue;
      hitCircleBox(f, b, 1.0);
    }
    for (j = 0; j < G.pigs.length; j++) {
      p = G.pigs[j]; if (p.dead) continue;
      var dx = f.x - p.x, dy = f.y - p.y, d = len(dx, dy);
      if (d < f.r + p.r) {
        var sp = len(f.vx, f.vy);
        if (sp > 200) killPig(p, 1);
        else if (sp > 90) { p.hp -= sp * 0.35; if (p.hp <= 0) killPig(p, 1); }
        var nx = (dx / (d || 1)), ny = (dy / (d || 1));
        var push = f.r + p.r - d;
        f.x += nx * push; f.y += ny * push;
        f.vx *= 0.55; f.vy *= 0.55;
      }
    }
    if (f.y + f.r > G.GROUND_Y) {
      f.y = G.GROUND_Y - f.r;
      if (f.vy > 260) f.vx *= 0.5;
      f.vy = -f.vy * 0.28;
      f.vx *= 0.7;
      if (Math.abs(f.vx) < 40) f.vx = 0;
    }
  }

  /* свиньи */
  for (i = 0; i < G.pigs.length; i++) {
    p = G.pigs[i]; if (p.dead) continue;
    p.vy += G.GRAVITY * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 0.94; p.vy *= 0.94;

    if (p.y + p.r > G.GROUND_Y) {
      p.y = G.GROUND_Y - p.r;
      if (p.vy > 220) { p.hp -= (p.vy - 220) * 0.3; if (p.hp <= 0) { killPig(p, 1); continue; } }
      p.vy = 0;
    }
    for (j = 0; j < G.blocks.length; j++) {
      b = G.blocks[j]; if (b.dead) continue;
      hitCircleBox(p, b, 0);
    }
    if (p.hp <= 0) killPig(p, 1);
  }

  /* убираем мёртвых и упавших */
  for (i = G.blocks.length - 1; i >= 0; i--) {
    b = G.blocks[i];
    if (b.dead || b.y > G.GROUND_Y + 400) G.blocks.splice(i, 1);
  }
  for (i = G.pigs.length - 1; i >= 0; i--) if (G.pigs[i].dead) G.pigs.splice(i, 1);
}

G.physics = function (dt) {
  if (!G.started) return;
  var n = clamp(Math.round(dt / SUB), 1, MAXSUB);
  var h = dt / n;
  for (var s = 0; s < n; s++) step(h);
};

/* ---------------- конец уровня ---------------- */
G.finishLevel = function () {
  var left = G.birdsLeft.length + (G.active ? 1 : 0) + (G.flying ? 1 : 0);
  var stars = left >= 2 ? 3 : (left === 1 ? 2 : 1);
  var coins = 30 + stars * 25 + Math.floor(G.score / 400);

  var best = G.starsOf(G.level);
  if (stars > best) G.save.stars[G.level] = stars;
  else if (!best) G.save.stars[G.level] = stars;

  G.save.coins += coins;
  if (G.level + 1 > (G.save.unlocked || 1)) G.save.unlocked = Math.min(G.TOTAL_LEVELS, G.level + 1);
  G.store();

  if (stars === 3) G.unlockAch('a3');
  G.unlockAch('a2');
  if (G.levelsDone() >= 5)  G.unlockAch('a4');
  if (G.levelsDone() >= 10) G.unlockAch('a5');
  if (G.levelsDone() >= 25) G.unlockAch('a6');
  if (G.levelsDone() >= 50) G.unlockAch('a7');
  if (coins && G.save.coins >= 1000) G.unlockAch('a16');
  G.stats.winStreak = (G.stats.winStreak || 0) + 1;
  if (G.stats.winStreak >= 3) G.unlockAch('a19');
  if (left >= 3) G.unlockAch('a12');
  if (G.save.total >= 50000) G.unlockAch('a20');

  G.lastWin = { stars: stars, coins: coins, score: G.score };
  if (G.SFX.win) G.SFX.win();
  return G.lastWin;
};

G.checkEnd = function (dt) {
  if (!G.started || G.state !== 'play') return null;

  if (G.alivePigs() === 0) {
    G.winT += dt;
    if (G.winT > 0.45) return 'win';
    return null;
  }
  G.winT = 0;

  var busy = G.flying || G.active || G.extraFlyers.length;
  if (!busy) {
    G.loseT += dt;
    if (G.loseT > 0.9) return 'lose';
  } else {
    G.loseT = 0;
  }
  return null;
};

})();
