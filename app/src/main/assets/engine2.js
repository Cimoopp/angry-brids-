/* ============================================================
   ANGRY BIRDS — уровни, физика, игровая логика
   Дополняет engine.js. Экспорт через window.ABG
   ============================================================ */
(function () {
'use strict';
var G = window.ABG;
if (!G) { console.error('ABG не загружен'); return; }

/* ---------- утилиты ---------- */
function makeSeed(n) {
  var s = (n * 9301 + 49297) % 233280;
  return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}
function bw(b) { return b.w != null ? b.w : b.r * 2; }
function bh(b) { return b.h != null ? b.h : b.r * 2; }
function isBird(b) { return !!b.type; }

function mkBlock(x, y, w, h, mat) {
  var m = G.MAT[mat] || G.MAT.wood;
  return { x: x, y: y, w: w, h: h, vx: 0, vy: 0, mat: mat, static: false,
           hp: m.hp, max: m.hp, dead: false };
}
function mkPig(x, y, r) {
  var hp = Math.round(45 + r * 2.6);
  return { x: x, y: y, r: r, vx: 0, vy: 0, hp: hp, max: hp, dead: false };
}

/* ---------- эффекты ---------- */
G.burst = function (x, y, color, n) {
  for (var i = 0; i < n; i++) {
    G.parts.push({
      x: x, y: y,
      vx: (Math.random() - 0.5) * 460,
      vy: -Math.random() * 400 - 40,
      s: 4 + Math.random() * 5, c: color,
      life: 0.6 + Math.random() * 0.5
    });
  }
};
G.popText = function (x, y, txt) { G.pops.push({ x: x, y: y, txt: txt, t: 1 }); };

G.addScore = function (v, x, y) {
  if (G.has('lucky')) v = Math.round(v * 1.15);
  G.score += v;
  if (x != null) G.popText(x, y, '+' + v);
};

/* ---------- генерация 50 уровней ---------- */
G.buildLevel = function (n) {
  var R = makeSeed(n * 137 + 11);
  var blocks = [], pigs = [], birds = [], i, f, t;
  var kinds = ['wood', 'ice', 'sand', 'stone'];
  var towers = Math.min(5, 1 + Math.floor((n - 1) / 11));
  var baseX = 1020 + Math.min(360, n * 7);

  for (t = 0; t < towers; t++) {
    var cx = baseX + t * 185;
    var floors = 2 + Math.min(3, Math.floor(n / 10)) + (R() > 0.6 ? 1 : 0);
    var mat = kinds[Math.min(3, Math.floor(R() * (1 + n / 18)))];
    var fh = 74, cw = 26, pw = 104;
    for (f = 0; f < floors; f++) {
      var cy = G.GROUND_Y - 12 - (f + 0.5) * fh;
      blocks.push(mkBlock(cx - pw / 2 + cw / 2, cy, cw, fh, mat));
      blocks.push(mkBlock(cx + pw / 2 - cw / 2, cy, cw, fh, mat));
      blocks.push(mkBlock(cx, cy - fh / 2 - 2, pw + 22, 20, mat));
      if (f === 0 || R() > 0.45) pigs.push(mkPig(cx, cy - 6, 17 + Math.floor(R() * 6)));
    }
  }

  blocks.push(mkBlock(baseX - 120, G.GROUND_Y - 32, 130, 22, 'wood'));
  blocks.push(mkBlock(baseX - 120, G.GROUND_Y - 60, 130, 22, 'wood'));

  var pool = ['red', 'red', 'yellow'];
  if (n >= 4) pool.push('blue');
  if (n >= 7) pool.push('black');
  if (n >= 12) pool.push('yellow');
  var count = Math.max(3, 5 - Math.floor(n / 15));
  for (i = 0; i < count; i++) birds.push(pool[Math.floor(R() * pool.length)]);
  if (G.has('yellowu')) birds.push('yellow');
  if (G.has('blueu')) birds.push('blue');
  if (G.has('blacku')) birds.push('black');
  if (G.has('redplus')) birds.push('red');

  if (!pigs.length) pigs.push(mkPig(baseX, G.GROUND_Y - 22, 20));
  return { blocks: blocks, pigs: pigs, birds: birds };
};

/* ---------- уровень ---------- */
G.startLevel = function (n) {
  G.level = Math.max(1, Math.min(G.TOTAL_LEVELS, n | 0));
  G.score = 0;
  G.killed = 0;
  G.shots = 0;
  G.blocks = [];
  G.pigs = [];
  G.parts = [];
  G.pops = [];
  G.extraFlyers = [];
  G.birdsLeft = [];
  G.active = null;
  G.flying = null;
  G.started = true;
  G.ended = false;
  G.winT = 0;
  G.loseT = 0;
  G.lastWin = null;

  var L = G.buildLevel(G.level);
  G.blocks = L.blocks;
  G.pigs = L.pigs;
  G.birdsLeft = L.birds.slice();
  G.state = 'play';
  G.nextBird();
};

G.nextBird = function () {
  G.active = null;
  if (!G.birdsLeft.length) return false;
  var type = G.birdsLeft.shift();
  var B = G.BIRDS[type] || G.BIRDS.red;
  G.active = { x: G.SLING_X, y: G.SLING_Y, vx: 0, vy: 0, r: B.r, type: type,
               mass: B.mass, state: 'ready', used: false, still: 0 };
  return true;
};

G.alivePigs = function () {
  var c = 0, i;
  for (i = 0; i < G.pigs.length; i++) if (!G.pigs[i].dead) c++;
  return c;
};

/* ---------- выстрел ---------- */
G.shoot = function () {
  if (!G.active || G.active.state !== 'ready') return false;
  var dx = G.SLING_X - G.active.x;
  var dy = G.SLING_Y - G.active.y;
  if (Math.sqrt(dx * dx + dy * dy) < 16) {
    G.active.x = G.SLING_X;
    G.active.y = G.SLING_Y;
    return false;
  }
  var pw = G.POWER * (G.has('gloves') ? 1.18 : 1);
  var b = G.active;
  b.vx = dx * pw;
  b.vy = dy * pw;
  b.state = 'fly';
  G.flying = b;
  G.active = null;
  G.shots++;
  if (G.SFX && G.SFX.pull) G.SFX.pull();
  G.vibe(15);
  return true;
};

G.useAbility = function () {
  var b = G.flying;
  if (!b || b.used) return false;
  var ab = (G.BIRDS[b.type] || {}).ability;
  if (!ab || ab === 'none') return false;
  b.used = true;
  var i;
  if (ab === 'boost') {
    b.vx *= 2.0; b.vy = b.vy * 2.0 - 120;
    if (G.SFX && G.SFX.boost) G.SFX.boost();
    G.unlockAch('boost');
  } else if (ab === 'split') {
    for (i = -1; i <= 1; i += 2) {
      G.extraFlyers.push({ x: b.x, y: b.y + i * 12, vx: b.vx * 0.92, vy: b.vy * 0.92 + i * 190,
                           r: G.BIRDS.blue.r, type: 'blue', mass: G.BIRDS.blue.mass, used: true });
    }
    if (G.SFX && G.SFX.split) G.SFX.split();
    G.unlockAch('split');
  } else if (ab === 'bomb') {
    G.explode(b.x, b.y, 165, 340);
    b.vx *= 0.15; b.vy = 0;
    if (G.SFX && G.SFX.bomb) G.SFX.bomb();
    G.unlockAch('bomb');
  }
  return true;
};

/* ---------- урон и разрушение ---------- */
function hurt(b, dmg, fromBird) {
  if (b.dead || b.static) return;
  if (fromBird && G.has('strong')) dmg *= 1.25;
  b.hp -= dmg;
  if (b.hp > 0) return;
  b.dead = true;
  if (isBird(b)) return;
  if (b.w == null) {
    G.killed++;
    G.addScore(500, b.x, b.y);
    G.burst(b.x, b.y, '#8ed14b', 14);
    if (G.SFX && G.SFX.pig) G.SFX.pig();
    G.vibe(20);
  } else {
    G.addScore(150, b.x, b.y);
    G.burst(b.x, b.y, (G.MAT[b.mat] || G.MAT.wood).fill, 10);
    if (G.SFX && G.SFX.brk) G.SFX.brk();
  }
}

G.explode = function (x, y, radius, power) {
  var list = [], i, b, dx, dy, d, k;
  for (i = 0; i < G.blocks.length; i++) list.push(G.blocks[i]);
  for (i = 0; i < G.pigs.length; i++) list.push(G.pigs[i]);
  for (i = 0; i < list.length; i++) {
    b = list[i];
    if (b.dead) continue;
    dx = b.x - x; dy = b.y - y;
    d = Math.sqrt(dx * dx + dy * dy) || 1;
    if (d > radius) continue;
    k = 1 - d / radius;
    b.vx += (dx / d) * power * k;
    b.vy += (dy / d) * power * k - 120 * k;
    hurt(b, 140 * k, true);
  }
  G.burst(x, y, '#ffb347', 26);
  G.popText(x, y, '💥');
};

/* ---------- столкновения ---------- */
function collide(a, b) {
  if (a.dead || b.dead || (a.static && b.static)) return;
  var aw = bw(a) / 2, ah = bh(a) / 2, cw = bw(b) / 2, ch = bh(b) / 2;
  var dx = b.x - a.x, dy = b.y - a.y;
  var ox = aw + cw - Math.abs(dx);
  var oy = ah + ch - Math.abs(dy);
  if (ox <= 0 || oy <= 0) return;

  var as = !!a.static, bs = !!b.static, rel, s;
  if (ox < oy) {
    rel = Math.abs((a.vx || 0) - (b.vx || 0));
    s = (dx < 0 ? -1 : 1) * ox;
    if (bs) { a.x -= s; a.vx *= 0.5; }
    else if (as) { b.x += s; b.vx *= 0.5; }
    else { a.x -= s / 2; b.x += s / 2; a.vx *= 0.6; b.vx *= 0.6; }
  } else {
    rel = Math.abs((a.vy || 0) - (b.vy || 0));
    s = (dy < 0 ? -1 : 1) * oy;
    if (bs) { a.y -= s; a.vy *= 0.4; }
    else if (as) { b.y += s; b.vy *= 0.4; }
    else { a.y -= s / 2; b.y += s / 2; a.vy *= 0.5; b.vy *= 0.5; }
  }

  if (rel > 240) {
    var bird = isBird(a) || isBird(b);
    var dmg = rel * 0.05;
    if (!a.static) hurt(a, dmg * (isBird(a) ? 1.7 : 1), bird);
    if (!b.static) hurt(b, dmg * (isBird(b) ? 1.7 : 1), bird);
  }
}

function land(b) {
  var bottom = b.y + bh(b) / 2;
  if (bottom <= G.GROUND_Y) return;
  var v = b.vy;
  b.y -= (bottom - G.GROUND_Y);
  if (isBird(b)) {
    if (v > 260) { G.burst(b.x, b.y + b.r, '#e6d9b8', 6); G.vibe(12); }
    b.vy = 0;
    b.vx *= 0.985;
  } else {
    if (v > 230) hurt(b, v * 0.055, false);
    b.vy = 0;
    b.vx *= 0.86;
  }
}

function step(h) {
  var i, j, arr = [], b;

  for (i = 0; i < G.blocks.length; i++) {
    b = G.blocks[i];
    if (b.dead) continue;
    b.vy += G.GRAVITY * h;
    b.x += b.vx * h;
    b.y += b.vy * h;
    arr.push(b);
  }
  for (i = 0; i < G.pigs.length; i++) {
    b = G.pigs[i];
    if (b.dead) continue;
    b.vy += G.GRAVITY * h;
    b.x += b.vx * h;
    b.y += b.vy * h;
    arr.push(b);
  }
  if (G.flying) { arr.push(G.flying); }
  for (i = 0; i < G.extraFlyers.length; i++) arr.push(G.extraFlyers[i]);

  for (i = 0; i < arr.length; i++) land(arr[i]);

  for (i = 0; i < arr.length; i++) {
    for (j = i + 1; j < arr.length; j++) {
      if (arr[i].type && arr[j].type) continue;   // птицы между собой не сталкиваются
      collide(arr[i], arr[j]);
    }
  }

  for (i = 0; i < arr.length; i++) {
    b = arr[i];
    if (b.static) continue;
    if (Math.abs(b.vx) < 6) b.vx = 0;
    if (Math.abs(b.vy) < 6) b.vy = 0;
    if (b.vx) b.vx *= 0.998;
  }
}

G.physics = function (dt) {
  var steps = Math.max(1, Math.min(5, Math.round(dt / (1 / 120))));
  var h = dt / steps;
  for (var s = 0; s < steps; s++) step(h);
};

/* ---------- конец уровня ---------- */
G.finishLevel = function () {
  var left = G.birdsLeft.length + (G.active ? 1 : 0);
  var stars = left >= 2 ? 3 : (left === 1 ? 2 : 1);
  var coins = 20 + stars * 15 + Math.floor(G.score / 200);
  if (G.has('magnet')) coins = Math.round(coins * 1.25);

  if ((G.save.levels[G.level] | 0) < stars) G.save.levels[G.level] = stars;
  G.save.coins += coins;
  G.save.kills = (G.save.kills || 0) + G.killed;
  G.earned += coins;
  G.store();
  G.checkAch();
  if (stars === 3) G.unlockAch('three');
  if (G.shots === 1) G.unlockAch('nohit');
  if (G.shots > 0) G.unlockAch('allbird');

  G.lastWin = { stars: stars, coins: coins, score: G.score };
  if (G.SFX && G.SFX.win) G.SFX.win();
};

G.checkEnd = function (dt) {
  if (!G.started || G.ended || G.state !== 'play') return null;

  if (G.alivePigs() === 0) {
    G.winT += dt;
    if (G.winT > 0.45) {
      G.ended = true;
      G.finishLevel();
      return 'win';
    }
    return null;
  }

  var busy = !!G.flying || !!G.active || G.extraFlyers.length > 0;
  if (!busy && G.birdsLeft.length === 0) {
    G.loseT += dt;
    if (G.loseT > 0.8) {
      G.ended = true;
      if (G.SFX && G.SFX.lose) G.SFX.lose();
      return 'lose';
    }
  } else {
    G.loseT = 0;
  }
  return null;
};

})();
