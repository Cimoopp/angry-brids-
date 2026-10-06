/* ============================================================
   ANGRY BIRDS — физика и игровая логика
   Работает поверх engine.js, использует его реальные имена:
   G.BIRD (не BIRDS), G.levelData(), G.deckFor(), G.MAT, G.SFX
   ============================================================ */
(function () {
'use strict';

var G = window.ABG;
if (!G) { console.error('ABG не загружен'); return; }

var FIXED = 1 / 120;
var MAX_SUB = 5;

function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

/* Мягкий вызов звука: если такого эффекта нет — берём похожий.
   ИСПРАВЛЕНИЕ: раньше вызывались несуществующие SFX.boost,
   SFX.split, SFX.breakBlock, SFX.pig, SFX.win — это был TypeError. */
var ALIAS = { boost: 'launch', split: 'pull', breakBlock: 'crack', pig: 'pop', win: 'star' };
function sfx(name) {
  if (!G.SFX) return;
  var f = G.SFX[name] || G.SFX[ALIAS[name]];
  if (typeof f === 'function') { try { f(); } catch (e) {} }
}

/* ИСПРАВЛЕНИЕ: раньше я перезаписывал G.ac и ломал AudioContext. */
var origAc = G.ac;
G.ac = function () {
  if (typeof origAc === 'function') { try { origAc(); } catch (e) {} }
  sfx('pull');
};

/* ИСПРАВЛЕНИЕ: engine.js отдаёт G.BIRD, а не G.BIRDS. */
function birdRadius(type) {
  var b = (G.BIRD && G.BIRD[type]) || (G.BIRD && G.BIRD.red);
  return b ? b.r : 20;
}

function makeBlock(cfg) {
  var m = G.MAT[cfg.m] || G.MAT.wood;
  return {
    x: cfg.x, y: cfg.y, w: cfg.w, h: cfg.h,
    vx: 0, vy: 0, m: cfg.m,
    hp: m.hp, max: m.hp, dead: false, still: 0
  };
}

function makePig(cfg) {
  var r = G.PIG_R || 27;
  return { x: cfg.x, y: cfg.y, r: r, vx: 0, vy: 0, hp: 100, max: 100, dead: false, still: 0 };
}

/* ---------- запуск уровня ---------- */
G.startLevel = function (n) {
  n = clamp(n | 0, 1, G.TOTAL_LEVELS);
  var data = G.levelData(n);
  var deck = G.deckFor(n);

  G.level = n;
  G.score = 0;
  G.shots = 0;
  G.ended = false;
  G.winT = 0;
  G.loseT = 0;
  G.lastWin = null;
  G.blocks = [];
  G.pigs = [];
  G.parts = [];
  G.pops = [];
  G.extraFlyers = [];
  G.flying = null;

  var i;
  for (i = 0; i < data.blocks.length; i++) G.blocks.push(makeBlock(data.blocks[i]));
  for (i = 0; i < data.pigs.length; i++) G.pigs.push(makePig(data.pigs[i]));

  var first = deck[0] || 'red';
  G.active = {
    type: first, x: G.SLING_X, y: G.SLING_Y,
    vx: 0, vy: 0, r: birdRadius(first),
    state: 'ready', used: false, still: 0
  };
  G.birdsLeft = deck.slice(1);
  G.deckTotal = deck.length;
  G.state = 'play';

  if (typeof G.checkAch === 'function') G.checkAch();
  return true;
};

/* ---------- прогресс за пройденный уровень ----------
   ИСПРАВЛЕНИЕ: раньше этого не было вовсе, поэтому звёзды,
   монеты и открытие следующего уровня не сохранялись. */
G.finishLevel = function () {
  var left = (G.active ? 1 : 0) + G.birdsLeft.length;
  var stars = left >= 2 ? 3 : (left === 1 ? 2 : 1);

  var coins = Math.round(G.score * 0.06) + stars * 30;
  if (G.save.items && G.save.items.pantry) coins = Math.round(coins * 1.25);

  var prev = G.save.levels[G.level] | 0;
  if (stars > prev) G.save.levels[G.level] = stars;
  G.save.coins += coins;
  G.save.wins = (G.save.wins | 0) + 1;
  G.store();

  G.lastWin = { stars: stars, coins: coins, score: G.score };
  if (typeof G.checkAch === 'function') G.checkAch();
  G.store();
  return G.lastWin;
};

/* ---------- производные ---------- */
G.alivePigs = function () {
  var c = 0, i;
  for (i = 0; i < G.pigs.length; i++) if (!G.pigs[i].dead) c++;
  return c;
};

G.nextBird = function () {
  if (!G.birdsLeft.length) { G.active = null; return; }
  var t = G.birdsLeft.shift();
  G.active = {
    type: t, x: G.SLING_X, y: G.SLING_Y, vx: 0, vy: 0,
    r: birdRadius(t), state: 'ready', used: false, still: 0
  };
};

G.shoot = function () {
  var a = G.active;
  if (!a || a.state !== 'ready') return false;
  var dx = G.SLING_X - a.x, dy = G.SLING_Y - a.y;
  if (Math.sqrt(dx * dx + dy * dy) < 22) { a.x = G.SLING_X; a.y = G.SLING_Y; return false; }

  a.vx = dx * G.POWER;
  a.vy = dy * G.POWER;
  a.state = 'fly';
  G.flying = a;
  G.active = null;
  G.shots++;
  G.save.shots = (G.save.shots | 0) + 1;
  sfx('launch');
  if (G.vibe) G.vibe(12);
  return true;
};

/* ---------- способности ---------- */
G.useAbility = function () {
  var f = G.flying;
  if (!f || f.used || f.state !== 'fly') return false;
  f.used = true;

  if (f.type === 'yellow') {
    var sp = Math.sqrt(f.vx * f.vx + f.vy * f.vy) || 1;
    var ns = sp * 2.1 + 260;
    f.vx = f.vx / sp * ns;
    f.vy = f.vy / sp * ns;
    sfx('boost');
    G.addPop(f.x, f.y, 'Вжух!');
  } else if (f.type === 'blue') {
    for (var k = -1; k <= 1; k += 2) {
      G.extraFlyers.push({
        type: 'blue', x: f.x, y: f.y,
        vx: f.vx * 0.96, vy: f.vy * 0.96 + k * 190,
        r: f.r, state: 'fly', used: true, still: 0
      });
    }
    sfx('split');
  } else if (f.type === 'black') {
    explode(f.x, f.y, 190, 320);
  } else {
    sfx('hit');
  }
  return true;
};

function explode(x, y, radius, power) {
  var i, b, p, d;
  for (i = 0; i < G.blocks.length; i++) {
    b = G.blocks[i];
    if (b.dead) continue;
    d = Math.hypot(b.x - x, b.y - y);
    if (d < radius) {
      b.hp -= power * (1 - d / radius);
      b.vx += (b.x - x) / (d + 1) * 320;
      b.vy += (b.y - y) / (d + 1) * 320 - 90;
      if (b.hp <= 0) killBlock(b);
    }
  }
  for (i = 0; i < G.pigs.length; i++) {
    p = G.pigs[i];
    if (p.dead) continue;
    d = Math.hypot(p.x - x, p.y - y);
    if (d < radius) {
      p.hp -= power * 1.5 * (1 - d / radius);
      if (p.hp <= 0) killPig(p);
    }
  }
  G.burst(x, y, 34, '#ffb03a', 420);
  if (G.vibe) G.vibe(70);
  sfx('boom');
}

function killBlock(b) {
  if (b.dead) return;
  b.dead = true;
  var m = G.MAT[b.m] || G.MAT.wood;
  for (var i = 0; i < 12; i++) {
    G.parts.push({
      x: b.x + (Math.random() - 0.5) * b.w,
      y: b.y + (Math.random() - 0.5) * b.h,
      vx: (Math.random() - 0.5) * 260, vy: -Math.random() * 260,
      s: 5 + Math.random() * 5, c: m.edge, life: 0.5 + Math.random() * 0.5
    });
  }
  G.score += 120;
  sfx('breakBlock');
}

function killPig(p) {
  if (p.dead) return;
  p.dead = true;
  G.burst(p.x, p.y, 16, '#8ed14b', 260);
  G.score += 500;
  G.addPop(p.x, p.y - 10, '+500');
  G.save.kills = (G.save.kills | 0) + 1;
  if (G.vibe) G.vibe(25);
  sfx('pig');
}

/* ---------- столкновения ---------- */
function circleVsRect(cx, cy, r, b) {
  var hw = b.w / 2, hh = b.h / 2;
  var nx = clamp(cx, b.x - hw, b.x + hw);
  var ny = clamp(cy, b.y - hh, b.y + hh);
  var dx = cx - nx, dy = cy - ny;
  var d2 = dx * dx + dy * dy;
  if (d2 > r * r) return null;
  var d = Math.sqrt(d2) || 0.0001;
  return { nx: dx / d, ny: dy / d, depth: r - d };
}

function step(h) {
  var i, j, b, p, o;

  for (i = 0; i < G.blocks.length; i++) {
    b = G.blocks[i];
    if (b.dead) continue;
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
    p.vx *= 0.997;
  }

  var flyers = [];
  if (G.flying) flyers.push(G.flying);
  for (i = 0; i < G.extraFlyers.length; i++) flyers.push(G.extraFlyers[i]);
  for (i = 0; i < flyers.length; i++) {
    var f = flyers[i];
    f.vy += G.GRAVITY * h;
    f.x += f.vx * h;
    f.y += f.vy * h;
    f.vx *= 0.9995;
  }

  /* блок — земля */
  for (i = 0; i < G.blocks.length; i++) {
    b = G.blocks[i];
    if (b.dead) continue;
    if (b.y + b.h / 2 > G.GROUND_Y) {
      b.y = G.GROUND_Y - b.h / 2;
      if (b.vy > 300) {
        b.hp -= (b.vy - 300) * 0.2;
        if (b.hp <= 0) killBlock(b);
      }
      b.vy = 0;
      b.vx *= 0.82;
    }
  }

  /* блок — блок */
  for (i = 0; i < G.blocks.length; i++) {
    b = G.blocks[i];
    if (b.dead) continue;
    for (j = i + 1; j < G.blocks.length; j++) {
      o = G.blocks[j];
      if (o.dead) continue;
      var dx = o.x - b.x, px2 = (b.w + o.w) / 2 - Math.abs(dx);
      if (px2 <= 0) continue;
      var dy = o.y - b.y, py2 = (b.h + o.h) / 2 - Math.abs(dy);
      if (py2 <= 0) continue;

      var mv = Math.min(px2, py2);
      var imp = Math.abs(b.vx - o.vx) + Math.abs(b.vy - o.vy);
      if (imp > 320) {
        b.hp -= imp * 0.05;
        o.hp -= imp * 0.05;
        if (b.hp <= 0) killBlock(b);
        if (o.hp <= 0) killBlock(o);
      }
      if (px2 < py2) {
        var sx = (dx >= 0 ? 1 : -1) * mv / 2;
        b.x -= sx; o.x += sx;
        b.vx = -b.vx * 0.3; o.vx = -o.vx * 0.3;
      } else {
        var sy = (dy >= 0 ? 1 : -1) * mv / 2;
        b.y -= sy; o.y += sy;
        b.vy = -b.vy * 0.2; o.vy = -o.vy * 0.2;
        if (b.vy > 0) b.vy = 0;
        if (o.vy > 0) o.vy = 0;
      }
    }
  }

  /* свиньи */
  for (i = 0; i < G.pigs.length; i++) {
    p = G.pigs[i];
    if (p.dead) continue;

    if (p.y + p.r > G.GROUND_Y) {
      p.y = G.GROUND_Y - p.r;
      if (p.vy > 560) { p.hp -= (p.vy - 560) * 0.5; if (p.hp <= 0) killPig(p); }
      p.vy = 0;
      p.vx *= 0.86;
    }

    for (j = 0; j < G.blocks.length; j++) {
      b = G.blocks[j];
      if (b.dead) continue;
      var c = circleVsRect(p.x, p.y, p.r, b);
      if (!c) continue;
      p.x -= c.nx * c.depth;
      p.y -= c.ny * c.depth;
      var rel = Math.abs(p.vx - b.vx) + Math.abs(p.vy - b.vy);
      if (rel > 320) { b.hp -= rel * 0.05; if (b.hp <= 0) killBlock(b); }
      if (rel > 620) { p.hp -= (rel - 620) * 0.32; if (p.hp <= 0) killPig(p); }
      p.vx = -p.vx * 0.28;
      p.vy = -p.vy * 0.28;
    }

    for (j = 0; j < flyers.length; j++) {
      var fb = flyers[j];
      var dd = Math.hypot(fb.x - p.x, fb.y - p.y);
      if (dd >= fb.r + p.r) continue;
      var push = fb.r + p.r - dd;
      var ux = (p.x - fb.x) / (dd || 1), uy = (p.y - fb.y) / (dd || 1);
      p.x += ux * push; p.y += uy * push;
      p.vx += ux * 240; p.vy += uy * 240 - 60;
      var e = Math.sqrt(fb.vx * fb.vx + fb.vy * fb.vy);
      p.hp -= (fb.type === 'black') ? 999 : Math.max(12, e * 0.24);
      if (p.hp <= 0) killPig(p);
      fb.vx *= 0.72; fb.vy *= 0.72;
      sfx('hit');
    }
  }

  /* птицы — блоки и земля */
  for (i = 0; i < flyers.length; i++) {
    var f2 = flyers[i];
    if (f2.y + f2.r > G.GROUND_Y) {
      f2.y = G.GROUND_Y - f2.r;
      f2.vy = -f2.vy * 0.25;
      f2.vx *= 0.7;
    }
    for (j = 0; j < G.blocks.length; j++) {
      b = G.blocks[j];
      if (b.dead) continue;
      var cc = circleVsRect(f2.x, f2.y, f2.r, b);
      if (!cc) continue;
      f2.x -= cc.nx * cc.depth;
      f2.y -= cc.ny * cc.depth;
      var sp = Math.sqrt(f2.vx * f2.vx + f2.vy * f2.vy);
      if (sp > 90) {
        b.hp -= sp * 0.12 * (f2.type === 'black' ? 1.6 : 1);
        b.vx += f2.vx * 0.12;
        b.vy += f2.vy * 0.12;
        if (b.hp <= 0) killBlock(b);
      }
      f2.vx *= 0.62; f2.vy *= 0.62;
      if (f2 === G.flying && !f2.used && f2.type === 'black') {
        explode(f2.x, f2.y, 170, 300);
        f2.used = true;
      }
      sfx('hit');
    }
  }
}

G.physics = function (dt) {
  var sub = clamp(Math.round(dt / FIXED), 1, MAX_SUB);
  var h = dt / sub;
  for (var s = 0; s < sub; s++) step(h);
};

/* ---------- конец уровня ---------- */
G.checkEnd = function (dt) {
  if (G.ended) return null;

  if (G.alivePigs() === 0) {
    G.winT += dt;
    if (G.winT > 0.75) {
      G.ended = true;
      G.state = 'over';
      G.finishLevel();
      sfx('win');
      return 'win';
    }
    return null;
  }

  if (!G.flying && !G.active && !G.birdsLeft.length) {
    G.loseT += dt;
    if (G.loseT > 0.65) {
      G.ended = true;
      G.state = 'over';
      return 'lose';
    }
  } else {
    G.loseT = 0;
  }
  return null;
};

})();
