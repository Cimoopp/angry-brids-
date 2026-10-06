/* ANGRY BIRDS — физика, столкновения, выстрел, способности, конец уровня.
   Дополняет window.ABG */
(function () {
'use strict';
var G = window.ABG;
if (!G) { console.error('нет ABG'); return; }

function len(x, y) { return Math.sqrt(x * x + y * y); }
function dmgMul(type) { return (G.BIRD[type] && G.BIRD[type].dmg) || 1; }

/* ---------- разрушение ---------- */
function destroyBlock(b) {
  if (b.dead) return;
  b.dead = true;
  b.fall = false;
  G.score += 500;
  G.save.coins += G.MAT[b.m].coins;
  G.burst(b.x, b.y, 10, G.MAT[b.m].fill, 240);
  G.SFX.crack();
  G.vibe(10);
}

function damageBlock(b, dmg) {
  if (b.dead) return;
  b.hp -= dmg;
  if (b.hp <= 0) destroyBlock(b);
}

function killPig(p) {
  if (p.dead) return;
  p.dead = true;
  G.score += 5000;
  G.save.kills = (G.save.kills || 0) + 1;
  G.save.coins += 120;
  G.addPop(p.x, p.y - 26, '+5000');
  G.burst(p.x, p.y, 14, '#8ed14b', 280);
  G.SFX.pop();
  G.vibe(22);
}

function explode(x, y, radius, dmg) {
  var i, d;
  G.SFX.boom();
  G.vibe(40);
  G.burst(x, y, 26, '#ffcc55', 460);
  for (i = 0; i < G.blocks.length; i++) {
    var b = G.blocks[i];
    if (b.dead) continue;
    d = len(x - b.x, y - b.y);
    if (d < radius + Math.max(b.w, b.h) / 2) {
      damageBlock(b, dmg * Math.max(0.25, 1 - d / radius));
    }
  }
  for (i = 0; i < G.pigs.length; i++) {
    var p = G.pigs[i];
    if (p.dead) continue;
    if (len(x - p.x, y - p.y) < radius) killPig(p);
  }
}

G.explode = explode;

/* ---------- опора блоков ---------- */
function supported(b) {
  if (b.y + b.h / 2 >= G.GROUND_Y - 10) return true;
  for (var i = 0; i < G.blocks.length; i++) {
    var o = G.blocks[i];
    if (o === b || o.dead) continue;
    var overlapX = Math.abs(o.x - b.x) < (o.w + b.w) / 2 - 4;
    var top = o.y - o.h / 2, base = b.y + b.h / 2;
    if (overlapX && Math.abs(top - base) < 10) return true;
  }
  return false;
}

/* ---------- выстрел и птицы ---------- */
G.shoot = function () {
  var a = G.active;
  if (!a || a.state !== 'ready') return false;
  var dx = G.SLING_X - a.x, dy = G.SLING_Y - a.y;
  if (len(dx, dy) < 16) { a.x = G.SLING_X; a.y = G.SLING_Y; return false; }
  G.flying = { type: a.type, x: a.x, y: a.y, r: a.r,
               vx: dx * G.POWER, vy: dy * G.POWER,
               state: 'fly', used: false, still: 0 };
  G.active = null;
  G.save.shots = (G.save.shots || 0) + 1;
  G.SFX.launch();
  G.vibe(16);
  G.store();
  return true;
};

G.nextBird = function () {
  G.flying = null;
  if (!G.birdsLeft.length) return;
  var t = G.birdsLeft.shift();
  G.active = { type: t, x: G.SLING_X, y: G.SLING_Y, r: G.BIRD[t].r,
               state: 'ready', used: false, vx: 0, vy: 0 };
};

G.useAbility = function () {
  var b = G.flying;
  if (!b || b.used) return;
  if (b.type === 'yellow') {
    b.vx *= 1.85; b.vy *= 1.85; b.used = true;
    G.SFX.launch();
  } else if (b.type === 'blue') {
    b.used = true;
    var ang, c, s, i;
    for (i = 0; i < 2; i++) {
      ang = (i === 0 ? -0.34 : 0.34);
      c = Math.cos(ang); s = Math.sin(ang);
      G.extraFlyers.push({ type: 'blue', x: b.x, y: b.y, r: 14,
                           vx: b.vx * c - b.vy * s, vy: b.vx * s + b.vy * c,
                           state: 'fly', used: true, still: 0 });
    }
    G.SFX.pull();
  } else if (b.type === 'black') {
    b.used = true;
    explode(b.x, b.y, 200, 280);
    G.flying = null;
    G.nextBird();
  } else {
    b.used = true;
    G.SFX.pull();
  }
};

/* ---------- столкновения ---------- */
function hitWorld(b) {
  var i, speed = len(b.vx, b.vy);

  if (b.y + b.r > G.GROUND_Y) {
    b.y = G.GROUND_Y - b.r;
    b.vy = -Math.abs(b.vy) * 0.34;
    b.vx *= 0.74;
    if (speed > 280) { G.SFX.hit(); G.burst(b.x, b.y + b.r, 5, '#c9a06a', 150); }
  }
  if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx) * 0.4; }
  if (b.x + b.r > G.WORLD_W) { b.x = G.WORLD_W - b.r; b.vx = -Math.abs(b.vx) * 0.4; }

  for (i = 0; i < G.blocks.length; i++) {
    var bl = G.blocks[i];
    if (bl.dead) continue;
    var nx = Math.max(bl.x - bl.w / 2, Math.min(b.x, bl.x + bl.w / 2));
    var ny = Math.max(bl.y - bl.h / 2, Math.min(b.y, bl.y + bl.h / 2));
    var dx = b.x - nx, dy = b.y - ny, d = len(dx, dy);
    if (d < b.r) {
      damageBlock(bl, Math.max(9, speed * 0.17) * dmgMul(b.type));
      var n = d || 1;
      b.vx = (dx / n) * speed * 0.36;
      b.vy = (dy / n) * speed * 0.36;
      if (b.type === 'black' && !b.used) {
        b.used = true;
        explode(b.x, b.y, 190, 250);
        G.flying = null;
        G.nextBird();
        return;
      }
    }
  }

  for (i = 0; i < G.pigs.length; i++) {
    var p = G.pigs[i];
    if (p.dead) continue;
    if (len(b.x - p.x, b.y - p.y) < b.r + p.r) {
      if (speed > 130 || b.type === 'ram') {
        killPig(p);
        b.vx *= 0.55; b.vy *= 0.55;
      }
    }
  }
}

/* ---------- главный шаг физики ---------- */
G.physics = function (dt) {
  var i, b, e, bl;

  if (G.flying) {
    b = G.flying;
    b.vy += G.GRAVITY * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    hitWorld(b);
  }

  for (i = 0; i < G.extraFlyers.length; i++) {
    e = G.extraFlyers[i];
    e.vy += G.GRAVITY * dt;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    hitWorld(e);
  }

  for (i = 0; i < G.blocks.length; i++) {
    bl = G.blocks[i];
    if (bl.dead) continue;
    if (!supported(bl)) {
      bl.fall = true;
      bl.vy += G.GRAVITY * dt;
      bl.y += bl.vy * dt;
      if (bl.y + bl.h / 2 > G.GROUND_Y - 8) {
        bl.y = G.GROUND_Y - 8 - bl.h / 2;
        if (bl.vy > 700) damageBlock(bl, (bl.vy - 700) * 0.15);
        bl.vy = 0;
        bl.fall = false;
      } else {
        for (var k = 0; k < G.blocks.length; k++) {
          var o = G.blocks[k];
          if (o === bl || o.dead) continue;
          var overlapX = Math.abs(o.x - bl.x) < (o.w + bl.w) / 2 - 4;
          var top = o.y - o.h / 2;
          if (overlapX && Math.abs(top - (bl.y + bl.h / 2)) < 12 && bl.vy > 0) {
            bl.y = top - bl.h / 2;
            if (bl.vy > 750) damageBlock(o, (bl.vy - 750) * 0.12);
            if (bl.vy > 800) damageBlock(bl, (bl.vy - 800) * 0.1);
            bl.vy = 0;
            bl.fall = false;
          }
        }
      }
      if (bl.fall) {
        for (var j = 0; j < G.pigs.length; j++) {
          var p = G.pigs[j];
          if (p.dead) continue;
          if (Math.abs(p.x - bl.x) < bl.w / 2 + p.r * 0.7 &&
              Math.abs(p.y - (bl.y + bl.h / 2)) < 26) killPig(p);
        }
      }
    }
  }
};

/* ---------- конец уровня ---------- */
G.checkEnd = function () {
  if (G.alivePigs() === 0) {
    var bonus = (G.birdsLeft.length + (G.active ? 1 : 0)) * 10000;
    if (bonus) { G.score += bonus; G.addPop(G.SLING_X + 220, 320, '+' + bonus); }
    var stars = G.score >= 48000 ? 3 : (G.score >= 30000 ? 2 : 1);
    var coins = Math.round((300 + G.level * 20 + stars * 150) *
                           (G.save.items.pantry ? 1.25 : 1));
    G.save.coins += coins;
    G.save.wins = (G.save.wins || 0) + 1;
    if ((G.save.levels[G.level] | 0) < stars) G.save.levels[G.level] = stars;
    G.lastWin = { stars: stars, coins: coins, score: G.score };
    G.checkAch();
    G.store();
    G.state = 'won';
    return 'win';
  }
  if (!G.active && !G.flying && !G.extraFlyers.length && !G.birdsLeft.length) {
    G.state = 'lost';
    G.checkAch();
    G.store();
    return 'lose';
  }
  return null;
};
})();
