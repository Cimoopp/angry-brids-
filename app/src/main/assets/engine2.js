/* ============================================================
   ANGRY BIRDS — физика, столкновения, урон, способности,
   исход уровня. Дополняет engine.js. Экспорт: дополняет window.ABG
   ============================================================ */
(function () {
'use strict';
var G = window.ABG;
if (!G) { console.error('ABG не загружен — engine.js должен идти первым'); return; }

var SUB = 0.008;   /* фиксированный шаг физики, с */

function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function len(x, y) { return Math.sqrt(x * x + y * y); }

/* ---------------- частицы и всплывашки ---------------- */
G.burst = function (x, y, n, color, spd) {
  var i;
  for (i = 0; i < n; i++) {
    var a = Math.random() * Math.PI * 2, v = (spd || 220) * (0.4 + Math.random() * 0.8);
    G.parts.push({
      x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 90,
      r: 2 + Math.random() * 4, life: 0.5 + Math.random() * 0.6,
      max: 1.1, color: color || '#ffffff'
    });
  }
};

G.pop = function (x, y, text, color) {
  G.pops.push({ x: x, y: y, t: 1, text: text, color: color || '#ffd34d' });
};

/* ---------------- урон ---------------- */
function damage(tgt, amount, isPig, px, py) {
  if (tgt.dead) return;
  tgt.hp -= amount;
  if (isPig) tgt.blink = 0.25;
  if (tgt.hp <= 0) {
    tgt.dead = true;
    G.kills += isPig ? 1 : 0;
    if (isPig) {
      G.save.kills = (G.save.kills || 0) + 1;
      G.score += 5000;
      G.combo++;
      G.burst(tgt.x, tgt.y, 20, '#8fd35a', 260);
      G.pop(tgt.x, tgt.y - 20, '+' + 5000);
      G.SFX.pig();
      G.vibe(30);
    } else {
      var mt = G.MAT[tgt.m] || G.MAT.wood;
      G.score += 500;
      G.burst(tgt.x + tgt.w / 2, tgt.y + tgt.h / 2, 12, mt.fill, 200);
      if (tgt.m === 'ice') G.SFX.ice();
      else if (tgt.m === 'stone') G.SFX.stone();
      else G.SFX.wood();
    }
  }
}

/* ---------------- геометрия ---------------- */
function boxOf(t) { return { l: t.x, r: t.x + t.w, tp: t.y, b: t.y + t.h }; }

function circleBox(cx, cy, cr, b) {
  var nx = clamp(cx, b.x, b.x + b.w);
  var ny = clamp(cy, b.y, b.y + b.h);
  var dx = cx - nx, dy = cy - ny;
  return { hit: dx * dx + dy * dy < cr * cr, nx: nx, ny: ny, dx: dx, dy: dy };
}

/* ---------------- столкновения ---------------- */
function blockVsGround(b, h) {
  if (b.static || b.dead) return;
  var gy = G.GROUND_Y;
  if (b.y + b.h > gy) {
    var over = (b.y + b.h) - gy;
    b.y -= over;
    if (b.vy > 60) damage(b, Math.min(28, b.vy * 0.05), false);
    b.vy = -b.vy * 0.18;
    b.vx *= 0.82;
    if (Math.abs(b.vy) < 12) b.vy = 0;
  }
  if (b.x < 0) { b.x = 0; b.vx = Math.abs(b.vx) * 0.3; }
}

function blockVsBlock(a, b) {
  if (a.dead || b.dead) return;
  if (a.static && b.static) return;
  var ox = (a.w + b.w) / 2 - Math.abs((a.x + a.w / 2) - (b.x + b.w / 2));
  if (ox <= 0) return;
  var oy = (a.h + b.h) / 2 - Math.abs((a.y + a.h / 2) - (b.y + b.h / 2));
  if (oy <= 0) return;

  var relV = Math.abs(a.vy - b.vy) + Math.abs(a.vx - b.vx);
  if (ox < oy) {
    /* расталкиваем по горизонтали */
    if (!a.static && !b.static) {
      a.x += (a.x < b.x ? -ox / 2 : ox / 2);
      b.x += (b.x < a.x ? -ox / 2 : ox / 2);
    } else if (!a.static) a.x += (a.x < b.x ? -ox : ox);
    else b.x += (b.x < a.x ? -ox : ox);
  } else {
    if (!a.static && !b.static) {
      a.y += (a.y < b.y ? -oy / 2 : oy / 2);
      b.y += (b.y < a.y ? -oy / 2 : oy / 2);
      var m = (a.vy + b.vy) / 2;
      a.vy = b.vy = m * 0.2;
    } else if (!a.static) {
      a.y += (a.y < b.y ? -oy : oy);
      a.vy = b.vy * 0.2;
    } else {
      b.y += (b.y < a.y ? -oy : oy);
      b.vy = a.vy * 0.2;
    }
  }
  if (relV > 220) {
    damage(a, relV * 0.045, false);
    damage(b, relV * 0.045, false);
  }
}

function pigVsGround(p) {
  if (p.dead) return;
  var gy = G.GROUND_Y;
  if (p.y + p.r > gy) {
    p.y = gy - p.r;
    if (p.vy > 260) damage(p, p.vy * 0.08, true, p.x, p.y);
    p.vy = -p.vy * 0.22;
    p.vx *= 0.8;
    if (Math.abs(p.vy) < 14) p.vy = 0;
  }
}

function pigVsBlock(p, b) {
  if (p.dead || b.dead) return;
  var c = circleBox(p.x, p.y, p.r, b);
  if (!c.hit) return;
  var d = len(c.dx, c.dy) || 0.001;
  var push = p.r - d;
  var nx = c.dx / d, ny = c.dy / d;
  if (d < 0.001) { nx = 0; ny = -1; }
  p.x += nx * push; p.y += ny * push;
  var rel = Math.abs(p.vx) + Math.abs(p.vy);
  if (rel > 200) damage(p, rel * 0.05, true, p.x, p.y);
  p.vx *= 0.55; p.vy *= 0.55;
}

function flyerVsBlock(f, b) {
  if (b.dead) return false;
  var c = circleBox(f.x, f.y, f.r, b);
  if (!c.hit) return false;
  var d = len(c.dx, c.dy) || 0.001;
  var nx = c.dx / d, ny = c.dy / d;
  f.x += nx * (f.r - d);
  f.y += ny * (f.r - d);

  var sp = len(f.vx, f.vy);
  var power = sp * 0.055 * (f.mass || 1);
  if (G.has('feather')) power *= 1.2;
  damage(b, power, false);
  var mt = G.MAT[b.m] || G.MAT.wood;
  if (mt.den > 1.2) power *= 0.45;
  f.vx = (f.vx * 0.35) - nx * sp * 0.25 * (2 - mt.den);
  f.vy = (f.vy * 0.35) - ny * sp * 0.25 * (2 - mt.den);
  f.spin = (f.spin || 0) + (Math.random() - 0.5) * 6;
  G.SFX.hit();
  G.vibe(15);
  return true;
}

function flyerVsPig(f, p) {
  if (p.dead) return false;
  var dx = f.x - p.x, dy = f.y - p.y;
  var rr = f.r + p.r;
  if (dx * dx + dy * dy > rr * rr) return false;
  var d = len(dx, dy) || 0.001;
  f.x += (dx / d) * (rr - d);
  f.y += (dy / d) * (rr - d);
  var sp = len(f.vx, f.vy);
  var dmg = (f.dmg || 30) * (0.6 + sp / 900) * 0.9;
  if (G.has('feather')) dmg *= 1.2;
  damage(p, dmg, true, p.x, p.y);
  f.vx *= 0.55; f.vy *= 0.55;
  return true;
}

/* ---------------- способности ---------------- */
G.useAbility = function () {
  var f = G.flying;
  if (!f || f.used) return false;
  var B = G.BIRDS[f.type] || G.BIRDS.red;
  f.used = true;

  if (B.ability === 'boost') {
    var sp = len(f.vx, f.vy) || 1;
    var k = 2.1;
    f.vx = (f.vx / sp) * sp * k;
    f.vy = (f.vy / sp) * sp * k;
    if (len(f.vx, f.vy) < 400) { f.vx = 700; f.vy = -180; }
    G.SFX.boost();
    G.burst(f.x, f.y, 10, '#ffe08a', 200);
    return true;
  }

  if (B.ability === 'split') {
    var i;
    for (i = -1; i <= 1; i += 2) {
      G.extraFlyers.push({
        type: 'blue', x: f.x, y: f.y,
        vx: f.vx * 0.94 + i * 120, vy: f.vy * 0.9 - i * 60,
        r: 15, rot: 0, spin: 0, dmg: 20, mass: 0.6, color: '#4aa8e8', used: true
      });
    }
    f.r = 15;
    G.SFX.split();
    return true;
  }

  if (B.ability === 'bomb') {
    G.explode(f.x, f.y, 130, 120);
    f.dead = true;
    G.flying = null;
    G.nextBird();
    return true;
  }
  return false;
};

G.explode = function (x, y, radius, power) {
  var i, d, dx, dy;
  G.SFX.bomb();
  G.vibe(60);
  G.burst(x, y, 34, '#ffb347', 420);
  G.burst(x, y, 18, '#ff5f1f', 320);

  for (i = 0; i < G.blocks.length; i++) {
    var b = G.blocks[i];
    if (b.dead) continue;
    dx = (b.x + b.w / 2) - x; dy = (b.y + b.h / 2) - y;
    d = len(dx, dy);
    if (d < radius) {
      damage(b, power * (1 - d / radius), false);
      b.vx += (dx / (d || 1)) * 260;
      b.vy += (dy / (d || 1)) * 260 - 90;
    }
  }
  for (i = 0; i < G.pigs.length; i++) {
    var p = G.pigs[i];
    if (p.dead) continue;
    dx = p.x - x; dy = p.y - y; d = len(dx, dy);
    if (d < radius + p.r) {
      damage(p, power * 1.5 * (1 - d / (radius + p.r)), true, p.x, p.y);
      p.vx += (dx / (d || 1)) * 320;
      p.vy += (dy / (d || 1)) * 320 - 140;
    }
  }
};

/* ---------------- выстрел ---------------- */
G.shoot = function () {
  var a = G.active;
  if (!a || a.state !== 'ready') return false;
  var dx = G.SLING_X - a.x, dy = G.SLING_Y - a.y;
  var d = len(dx, dy);
  if (d < 14) { a.x = G.SLING_X; a.y = G.SLING_Y; return false; }

  var spd = d * G.POWER * (G.has('gloves') ? 1.18 : 1);
  a.state = 'fly';
  a.vx = (dx / d) * spd;
  a.vy = (dy / d) * spd;
  if (G.has('wind')) a.vx += 45;
  a.spin = 6;
  G.flying = a;
  G.active = null;
  G.shots++;
  G.save.shots = (G.save.shots || 0) + 1;
  G.SFX.shoot();
  G.vibe(20);
  return true;
};

/* ---------------- шаг физики ---------------- */
function step(h) {
  var g = G.GRAVITY, i, j;

  /* летящая птица */
  var flyers = [];
  if (G.flying) flyers.push(G.flying);
  for (i = 0; i < G.extraFlyers.length; i++) flyers.push(G.extraFlyers[i]);
  for (i = 0; i < flyers.length; i++) {
    var f = flyers[i];
    f.vy += g * h;
    f.x += f.vx * h;
    f.y += f.vy * h;
    f.rot = (f.rot || 0) + (f.spin || 0) * h;
  }

  /* свободные блоки */
  for (i = 0; i < G.blocks.length; i++) {
    var b = G.blocks[i];
    if (b.dead || b.static) continue;
    b.vy += g * h;
    b.x += b.vx * h;
    b.y += b.vy * h;
    b.vx *= 0.999;
  }

  /* свиньи */
  for (i = 0; i < G.pigs.length; i++) {
    var p = G.pigs[i];
    if (p.dead) continue;
    p.vy += g * h;
    p.x += p.vx * h;
    p.y += p.vy * h;
    p.vx *= 0.998;
    if (p.blink > 0) p.blink -= h;
  }

  /* земля */
  for (i = 0; i < G.blocks.length; i++) blockVsGround(G.blocks[i], h);
  for (i = 0; i < G.pigs.length; i++) pigVsGround(G.pigs[i]);

  /* блок-блок */
  var n = G.blocks.length;
  for (i = 0; i < n; i++) {
    if (G.blocks[i].dead) continue;
    for (j = 0; j < n; j++) {
      if (i === j || G.blocks[j].dead) continue;
      blockVsBlock(G.blocks[i], G.blocks[j]);
    }
  }

  /* птица-блок, птица-свинья */
  for (i = 0; i < flyers.length; i++) {
    var fl = flyers[i];
    var spent = false;
    for (j = 0; j < G.blocks.length; j++) {
      if (G.blocks[j].dead) continue;
      if (flyerVsBlock(fl, G.blocks[j])) spent = true;
    }
    for (j = 0; j < G.pigs.length; j++) {
      if (G.pigs[j].dead) continue;
      if (flyerVsPig(fl, G.pigs[j])) spent = true;
    }
    if (spent && fl.type === 'black' && !fl.used) {
      fl.used = true;
      G.explode(fl.x, fl.y, 120, 110);
      if (G.flying === fl) { G.flying = null; G.nextBird(); }
    }
  }

  /* свинья-блок */
  for (i = 0; i < G.pigs.length; i++) {
    if (G.pigs[i].dead) continue;
    for (j = 0; j < G.blocks.length; j++) {
      if (G.blocks[j].dead) continue;
      pigVsBlock(G.pigs[i], G.blocks[j]);
    }
  }
}

/* ---------------- очистка ---------------- */
function cleanup() {
  var i;
  for (i = G.blocks.length - 1; i >= 0; i--) if (G.blocks[i].dead) G.blocks.splice(i, 1);
  for (i = G.pigs.length - 1; i >= 0; i--) if (G.pigs[i].dead) G.pigs.splice(i, 1);
  for (i = G.extraFlyers.length - 1; i >= 0; i--) {
    var e = G.extraFlyers[i];
    if (e.dead || e.x < -120 || e.x > G.WORLD_W + 120 || e.y > G.GROUND_Y + 140) G.extraFlyers.splice(i, 1);
  }
}

G.physics = function (dt) {
  if (G.state !== 'play') return;
  var h = Math.min(dt || 0.016, 0.04);
  var steps = Math.max(1, Math.round(h / SUB));
  var sub = h / steps, i;
  for (i = 0; i < steps; i++) step(sub);
  cleanup();
  G.t += h;
};

/* ---------------- исход уровня ---------------- */
G.finishLevel = function () {
  var stars;
  var left = G.birdsLeft.length + (G.flying ? 1 : 0);
  if (left >= 3) stars = 3;
  else if (left === 2) stars = 2;
  else stars = 1;

  var coins = 60 + stars * 30 + Math.floor(G.score / 600);
  if (G.has('magnet'))  coins = Math.round(coins * 1.15);
  if (G.has('helmet'))  coins = Math.round(coins * 1.3);

  var prev = G.save.stars[G.level] || 0;
  if (stars > prev) G.save.stars[G.level] = stars;
  if (stars === 3) G.save.perfect = (G.save.perfect || 0) + 1;
  if (left >= 3)   G.save.oneBird = (G.save.oneBird || 0) + 1;

  G.save.coins += coins;
  if (G.level >= G.save.maxLevel) G.save.maxLevel = Math.min(G.TOTAL_LEVELS, G.level + 1);
  G.store();
  G.checkAch();

  G.lastWin = { stars: stars, coins: coins, score: G.score };
  return G.lastWin;
};

G.checkEnd = function (dt) {
  if (G.state !== 'play' || !G.started) return null;

  var pigs = G.alivePigs();

  if (pigs === 0) {
    G.winT += dt;
    if (G.winT > 0.45) { G.started = false; G.finishLevel(); return 'win'; }
    return null;
  }

  var flying = !!G.flying;
  var extra = G.extraFlyers.length > 0;
  var waiting = G.active && G.active.state === 'ready';
  if (flying || extra || waiting) { G.loseT = 0; return null; }

  if (G.birdsLeft.length === 0 && !G.active && !G.flying) {
    G.loseT += dt;
    if (G.loseT > 0.9) { G.started = false; return 'lose'; }
  }
  return null;
};

})();
