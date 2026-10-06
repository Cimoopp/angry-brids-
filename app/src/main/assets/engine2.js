/* ============================================================
   ANGRY BIRDS — физика и игровая механика
   Зависит от window.ABG. Дополняет его.
   ============================================================ */
(function () {
'use strict';
var G = window.ABG;
if (!G) { console.error('ABG не загружен'); return; }

function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function birdBox(b) { return { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 }; }
function blockBox(b) { return { x: b.x - b.w / 2, y: b.y - b.h / 2, w: b.w, h: b.h }; }

/* ---------- построение уровня ---------- */
function block(x, y, w, h, m) {
  var mt = G.MAT[m];
  G.blocks.push({ x: x, y: y, w: w, h: h, m: m, hp: mt.hp, max: mt.hp, vy: 0, dead: false, fall: false });
}
function pig(x, y) {
  G.pigs.push({ x: x, y: y, r: 24, hp: 60, max: 60, vy: 0, dead: false });
}

G.buildLevel = function (cfg) {
  var baseX = 1180, gy = G.GROUND_Y, m = cfg.mat, i;
  var t = cfg.type;

  if (t === 0) {                       // башня
    for (i = 0; i < 5; i++) block(baseX, gy - 40 - i * 80, 30, 80, m);
    for (i = 0; i < 4; i++) block(baseX + 90, gy - 40 - i * 80, 30, 80, m);
    block(baseX + 45, gy - 220, 120, 24, 'wood');
    block(baseX + 45, gy - 140, 120, 24, 'wood');
    pig(baseX + 45, gy - 40);
    if (cfg.pigs > 1) pig(baseX + 45, gy - 180);
    if (cfg.pigs > 2) pig(baseX + 45, gy - 300);
  } else if (t === 1) {                // дом
    block(baseX - 90, gy - 40, 30, 80, m);
    block(baseX + 90, gy - 40, 30, 80, m);
    block(baseX, gy - 85, 210, 26, m);
    for (i = 0; i < 3; i++) block(baseX - 60 + i * 60, gy - 130, 24, 60, 'ice');
    block(baseX, gy - 165, 200, 24, m);
    pig(baseX, gy - 40);
    if (cfg.pigs > 1) pig(baseX - 55, gy - 130);
    if (cfg.pigs > 2) pig(baseX + 55, gy - 230);
    if (cfg.pigs > 3) pig(baseX, gy - 300);
  } else if (t === 2) {                // пирамида
    for (i = 0; i < 4; i++) block(baseX, gy - 40 - i * 78, 28, 78, m);
    for (i = 0; i < 3; i++) block(baseX + 70, gy - 40 - i * 78, 28, 78, m);
    for (i = 0; i < 2; i++) block(baseX + 140, gy - 40 - i * 78, 28, 78, m);
    block(baseX + 70, gy - 200, 180, 24, m);
    block(baseX + 70, gy - 280, 120, 24, m);
    pig(baseX + 35, gy - 40);
    if (cfg.pigs > 1) pig(baseX + 105, gy - 40);
    if (cfg.pigs > 2) pig(baseX + 70, gy - 160);
    if (cfg.pigs > 3) pig(baseX + 70, gy - 250);
  } else if (t === 3) {                // мост
    block(baseX - 140, gy - 40, 30, 80, m);
    block(baseX + 140, gy - 40, 30, 80, m);
    block(baseX, gy - 40, 30, 80, 'ice');
    for (i = 0; i < 5; i++) block(baseX - 120 + i * 60, gy - 90, 46, 22, 'wood');
    pig(baseX - 70, gy - 40);
    if (cfg.pigs > 1) pig(baseX + 70, gy - 40);
    if (cfg.pigs > 2) pig(baseX, gy - 120);
    if (cfg.pigs > 3) pig(baseX - 200, gy - 40);
  } else if (t === 4) {                // двойная башня
    for (i = 0; i < 3; i++) {
      block(baseX - 70, gy - 40 - i * 80, 28, 80, m);
      block(baseX, gy - 40 - i * 80, 28, 80, m);
      block(baseX + 90, gy - 40 - i * 80, 28, 80, 'ice');
    }
    block(baseX - 35, gy - 280, 140, 24, m);
    block(baseX + 90, gy - 280, 60, 24, m);
    pig(baseX - 35, gy - 40);
    if (cfg.pigs > 1) pig(baseX - 35, gy - 120);
    if (cfg.pigs > 2) pig(baseX + 90, gy - 40);
    if (cfg.pigs > 3) pig(baseX + 90, gy - 200);
    if (cfg.pigs > 4) pig(baseX - 35, gy - 310);
  } else {                             // крепость
    for (i = 0; i < 4; i++) {
      block(baseX - 150, gy - 40 - i * 70, 26, 70, 'stone');
      block(baseX + 150, gy - 40 - i * 70, 26, 70, 'stone');
    }
    for (i = 0; i < 3; i++) block(baseX - 90 + i * 90, gy - 320, 26, 70, m);
    block(baseX, gy - 100, 320, 24, m);
    block(baseX, gy - 180, 300, 24, m);
    block(baseX, gy - 260, 280, 24, m);
    pig(baseX, gy - 40);
    if (cfg.pigs > 1) pig(baseX - 100, gy - 40);
    if (cfg.pigs > 2) pig(baseX + 100, gy - 40);
    if (cfg.pigs > 3) pig(baseX, gy - 130);
    if (cfg.pigs > 5) pig(baseX, gy - 210);
    if (cfg.pigs > 6) pig(baseX - 100, gy - 355);
  }

  G.spawnBird();
};

/* ---------- птицы ---------- */
G.spawnBird = function () {
  if (!G.birdsLeft.length && !G.flying) return;
  var type = G.birdsLeft.shift() || 'red';
  var info = G.BIRD[type];
  G.active = {
    type: type, x: G.SLING_X, y: G.SLING_Y, r: info.r,
    vx: 0, vy: 0, state: 'ready', used: false, dmg: info.dmg, mat: info.mat
  };
};

G.shoot = function () {
  if (!G.active || G.active.state !== 'ready') return false;
  var a = G.active;
  var dx = G.SLING_X - a.x, dy = G.SLING_Y - a.y;
  var d = Math.sqrt(dx * dx + dy * dy);
  if (d < 12) { a.x = G.SLING_X; a.y = G.SLING_Y; return false; }
  a.vx = dx * G.POWER;
  a.vy = dy * G.POWER;
  a.state = 'fly';
  G.flying = a;
  G.active = null;
  G.SFX.launch();
  return true;
};

G.nextBird = function () {
  if (G.birdsLeft.length) G.spawnBird();
  else G.active = null;
};

G.useAbility = function () {
  var b = G.flying;
  if (!b || b.used) return;
  b.used = true;
  if (b.type === 'yellow') {                       // ускорение
    b.vx *= 1.85; b.vy *= 1.85;
    G.burst(b.x, b.y, '#ffe08a', 10);
    G.SFX.boom();
  } else if (b.type === 'blue') {                  // раскол на три
    var ang = Math.atan2(b.vy, b.vx), sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy) * 0.85;
    for (var i = -1; i <= 1; i += 2) {
      G.extraFlyers.push({
        type: 'blue', x: b.x, y: b.y, r: 14,
        vx: Math.cos(ang + i * 0.28) * sp,
        vy: Math.sin(ang + i * 0.28) * sp,
        state: 'fly', used: true, dmg: 0.6, mat: 0.8
      });
    }
    G.SFX.pop();
  } else {                                          // взрыв
    explode(b.x, b.y, 190, 130);
  }
};

function explode(x, y, radius, power) {
  G.burst(x, y, '#ffb347', 32);
  G.SFX.boom();
  G.vibe(60);
  var i, d;
  for (i = 0; i < G.blocks.length; i++) {
    var bl = G.blocks[i];
    if (bl.dead) continue;
    d = Math.hypot(bl.x - x, bl.y - y);
    if (d < radius) damageBlock(bl, 90 * (1 - d / radius), (bl.x - x) / (d || 1));
  }
  for (i = 0; i < G.pigs.length; i++) {
    var p = G.pigs[i];
    if (p.dead) continue;
    d = Math.hypot(p.x - x, p.y - y);
    if (d < radius) killPig(p);
  }
}
G.explode = explode;

/* ---------- урон ---------- */
function damageBlock(b, dmg, dir) {
  if (b.dead) return;
  var m = G.MAT[b.m];
  b.hp -= dmg / m.dens;
  if (b.hp <= 0) {
    b.dead = true;
    G.blocks_broken = (G.blocks_broken || 0) + 1;
    G.score += 500;
    G.save.blocks++;
    G.save.coins += 5;
    G.spawnPops(b.x, b.y, '+500');
    var col = b.m === 'ice' ? '#cfeeff' : (b.m === 'stone' ? '#b9c2cc' : '#d8a86a');
    G.burst(b.x, b.y, col, 12);
    G.SFX.hit();
  }
}

function killPig(p) {
  if (p.dead) return;
  p.dead = true;
  G.score += 5000;
  G.save.kills++;
  G.save.coins += 50;
  G.spawnPops(p.x, p.y, '+5000');
  G.burst(p.x, p.y, '#8ed14b', 18);
  G.SFX.pop();
  G.vibe(35);
}

/* ---------- физика ---------- */
var pigCombo = 0;

G.physics = function (dt) {
  var i, j, b;

  // птица
  var flyers = [];
  if (G.flying) flyers.push(G.flying);
  for (i = 0; i < G.extraFlyers.length; i++) flyers.push(G.extraFlyers[i]);

  for (i = 0; i < flyers.length; i++) {
    b = flyers[i];
    b.vy += G.GRAVITY * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    // земля
    if (b.y + b.r > G.GROUND_Y) {
      b.y = G.GROUND_Y - b.r;
      b.vy *= -0.35;
      b.vx *= 0.72;
      if (Math.abs(b.vy) < 40) b.vy = 0;
    }
    if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx) * 0.5; }

    // блоки
    var bb = birdBox(b);
    for (j = 0; j < G.blocks.length; j++) {
      var bl = G.blocks[j];
      if (bl.dead) continue;
      var bx = blockBox(bl);
      if (overlap(bb, bx)) {
        var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        var dmg = sp * 0.22 * b.dmg;
        damageBlock(bl, dmg, b.vx > 0 ? 1 : -1);
        if (b.type === 'black' || G.save.items.bomb) explode(b.x, b.y, 140, 90);
        // отскок
        if (b.vx > 0) { b.x = bx.x - b.r; b.vx *= -0.28; }
        else { b.x = bx.x + bx.w + b.r; b.vx *= -0.28; }
        if (b.type === 'yellow' && !b.used) { b.vy *= -0.2; }
        else b.vy *= 0.35;
        break;
      }
    }

    // свиньи
    for (j = 0; j < G.pigs.length; j++) {
      var p = G.pigs[j];
      if (p.dead) continue;
      var dx = b.x - p.x, dy = b.y - p.y;
      var d2 = Math.sqrt(dx * dx + dy * dy);
      if (d2 < b.r + p.r) {
        var sp2 = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        if (sp2 > 220) {
          killPig(p);
          pigCombo++;
          b.vx *= 0.6; b.vy *= 0.7;
        } else {
          p.hp -= sp2 * 0.1;
          if (p.hp <= 0) killPig(p);
        }
      }
    }
  }

  // свиньи: падение
  for (i = 0; i < G.pigs.length; i++) {
    var pg = G.pigs[i];
    if (pg.dead) continue;
    pg.vy += G.GRAVITY * dt;
    pg.y += pg.vy * dt;

    var support = G.GROUND_Y - pg.r;
    for (j = 0; j < G.blocks.length; j++) {
      var blk = G.blocks[j];
      if (blk.dead) continue;
      var top = blk.y - blk.h / 2;
      if (pg.x > blk.x - blk.w / 2 - pg.r * 0.6 && pg.x < blk.x + blk.w / 2 + pg.r * 0.6 &&
          pg.y + pg.r > top && pg.y + pg.r < top + 40 && pg.y + pg.r < support + pg.r) {
        if (top - pg.r < support) support = top - pg.r;
      }
    }
    if (pg.y > support) {
      var impact = pg.vy;
      pg.y = support;
      pg.vy = 0;
      if (impact > 700) killPig(pg);
      else if (impact > 380) { pg.hp -= (impact - 380) * 0.12; if (pg.hp <= 0) killPig(pg); }
    }
  }

  // блоки без опоры — падают
  for (i = 0; i < G.blocks.length; i++) {
    var bd = G.blocks[i];
    if (bd.dead) continue;
    var bot = bd.y + bd.h / 2;
    var stand = (bot >= G.GROUND_Y - 2);
    if (!stand) {
      for (j = 0; j < G.blocks.length; j++) {
        if (i === j) continue;
        var other = G.blocks[j];
        if (other.dead) continue;
        var otop = other.y - other.h / 2;
        var ol = other.x - other.w / 2, or = other.x + other.w / 2;
        if (Math.abs(bot - otop) < 6 && bd.x + bd.w / 2 > ol + 2 && bd.x - bd.w / 2 < or - 2) { stand = true; break; }
      }
    }
    if (!stand) {
      bd.vy += G.GRAVITY * dt;
      bd.y += bd.vy * dt;
      if (bd.y + bd.h / 2 > G.GROUND_Y) { bd.y = G.GROUND_Y - bd.h / 2; bd.vy = 0; }
    } else {
      bd.vy = 0;
    }
  }
};

/* ---------- конец уровня ---------- */
var loseTimer = 0;

G.checkEnd = function (dt) {
  if (G.alivePigs() === 0) {
    var stars = 1;
    if (G.score >= 25000) stars = 2;
    if (G.score >= 45000 || (G.pigs.length && G.birdsLeft.length >= 1)) stars = 3;
    var coins = Math.round(G.score / 100) + stars * 50;
    if (G.save.items.pantry) coins = Math.round(coins * 1.25);
    var prev = G.save.levels[G.level] | 0;
    if (stars > prev) G.save.levels[G.level] = stars;
    G.save.coins += coins;
    G.save.earned += coins;
    G.save.stars = G.starsTotal();
    G.store();
    G.checkAch();
    G.lastWin = { stars: stars, coins: coins, score: G.score };
    G.state = 'done';
    return 'win';
  }
  if (!G.active && !G.flying && !G.birdsLeft.length && !G.extraFlyers.length) {
    loseTimer += dt;
    if (loseTimer > 1.2) { loseTimer = 0; G.state = 'done'; return 'lose'; }
  } else {
    loseTimer = 0;
  }
  return null;
};
})();
