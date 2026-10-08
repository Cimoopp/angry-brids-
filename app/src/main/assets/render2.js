/* ============================================================
   ANGRY BIRDS — графика, часть 2: блоки, свиньи, птицы,
   рогатка, прицел, осколки, очки. Дополняет render.js
   ============================================================ */
(function () {
'use strict';
var G = window.ABG, R = window.ABR;
if (!G || !R || !R.drawScene) { console.error('render.js не загружен'); return; }

function ctx() { return R.ctx(); }
function px(v) { return R.px(v); }
function py(v) { return R.py(v); }
function sc() { return R.scale(); }
function rnd(a, b) { return a + Math.random() * (b - a); }

/* ---------- материалы: цвета и текстуры ---------- */
var SKIN = {
  wood:  { a: '#d89b4e', b: '#a4692a', line: 'rgba(96,58,18,.55)', grain: '#c9853c' },
  ice:   { a: '#d6f4ff', b: '#8fd0ea', line: 'rgba(255,255,255,.75)', grain: '#b6e6f7' },
  stone: { a: '#cfcfd6', b: '#9a9aa4', line: 'rgba(92,92,104,.55)', grain: '#bdbdc6' },
  sand:  { a: '#efdc9e', b: '#c9ae63', line: 'rgba(158,130,64,.55)', grain: '#ddc684' }
};

function roundRect(c, x, y, w, h, r) {
  var rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  c.beginPath();
  c.moveTo(x + rr, y);
  c.lineTo(x + w - rr, y);
  c.quadraticCurveTo(x + w, y, x + w, y + rr);
  c.lineTo(x + w, y + h - rr);
  c.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  c.lineTo(x + rr, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - rr);
  c.lineTo(x, y + rr);
  c.quadraticCurveTo(x, y, x + rr, y);
  c.closePath();
}

/* ---------- блоки ---------- */
function drawBlock(b) {
  var c = ctx(), s = sc();
  var w = b.w * s, h = b.h * s;
  var x = px(b.x - b.w / 2), y = py(b.y - b.h / 2);
  var sk = SKIN[b.m] || SKIN.wood;

  c.save();
  c.globalAlpha = b.static ? 0.98 : 0.96;
  var g = c.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, sk.a);
  g.addColorStop(1, sk.b);
  c.fillStyle = g;
  roundRect(c, x, y, w, h, Math.min(w, h) * 0.18);
  c.fill();

  c.save();
  roundRect(c, x, y, w, h, Math.min(w, h) * 0.18);
  c.clip();
  c.strokeStyle = sk.line;
  c.lineWidth = Math.max(1, s * 1.4);
  var i, wood = (b.m === 'wood');
  for (i = 0; i < 6; i++) {
    c.beginPath();
    if (wood) {
      c.moveTo(x, y + h * (i + 0.5) / 6);
      c.bezierCurveTo(x + w * 0.3, y + h * (i + 0.35) / 6, x + w * 0.7, y + h * (i + 0.65) / 6, x + w, y + h * (i + 0.5) / 6);
    } else if (b.m === 'ice') {
      c.moveTo(x + w * i / 6, y);
      c.lineTo(x + w * (i + 0.7) / 6, y + h);
    } else {
      c.moveTo(x, y + h * (i + 0.5) / 5);
      c.lineTo(x + w, y + h * (i + 0.5) / 5);
    }
    c.stroke();
  }
  if (b.m === 'stone') {
    c.fillStyle = 'rgba(120,120,132,.45)';
    for (i = 0; i < 10; i++) {
      var ax = x + ((i * 37) % 100) / 100 * w;
      var ay = y + ((i * 61) % 100) / 100 * h;
      c.beginPath();
      c.arc(ax, ay, Math.max(1, s * 1.6), 0, 6.284);
      c.fill();
    }
  }
  c.restore();

  var dmg = 1 - Math.max(0, b.hp) / b.max;
  if (dmg > 0.12) {
    c.strokeStyle = 'rgba(30,18,8,' + (0.25 + dmg * 0.6).toFixed(2) + ')';
    c.lineWidth = Math.max(1, s * 1.5);
    c.beginPath();
    c.moveTo(x, y + h * 0.7);
    c.lineTo(x + w * 0.35, y + h * 0.45);
    c.lineTo(x + w * 0.55, y + h * 0.72);
    c.stroke();
    if (dmg > 0.55) {
      c.beginPath();
      c.moveTo(x + w * 0.55, y + h * 0.72);
      c.lineTo(x + w, y + h * 0.4);
      c.stroke();
    }
  }

  c.strokeStyle = 'rgba(0,0,0,.28)';
  c.lineWidth = Math.max(1, s * 1.2);
  roundRect(c, x, y, w, h, Math.min(w, h) * 0.18);
  c.stroke();
  c.restore();
}

/* ---------- свиньи ---------- */
function drawPig(p) {
  var c = ctx(), s = sc(), r = p.r * s;
  var x = px(p.x), y = py(p.y);

  c.save();
  c.fillStyle = 'rgba(0,0,0,.2)';
  c.beginPath();
  c.ellipse(x, py(G.GROUND_Y) + s * 4, r * 1.05, r * 0.3, 0, 0, 6.284);
  c.fill();

  c.fillStyle = '#7fc94a';
  c.beginPath();
  c.ellipse(x - r * 0.62, y - r * 0.72, r * 0.3, r * 0.34, -0.5, 0, 6.284);
  c.ellipse(x + r * 0.62, y - r * 0.72, r * 0.3, r * 0.34, 0.5, 0, 6.284);
  c.fill();

  var g = c.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.15, x, y, r * 1.15);
  g.addColorStop(0, '#b4ea74');
  g.addColorStop(0.55, '#83cc4c');
  g.addColorStop(1, '#4f9c33');
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, r, 0, 6.284);
  c.fill();

  c.fillStyle = '#9ad95f';
  c.beginPath();
  c.ellipse(x, y + r * 0.42, r * 0.46, r * 0.34, 0, 0, 6.284);
  c.fill();
  c.fillStyle = '#5ea63a';
  c.beginPath();
  c.arc(x - r * 0.17, y + r * 0.42, r * 0.09, 0, 6.284);
  c.arc(x + r * 0.17, y + r * 0.42, r * 0.09, 0, 6.284);
  c.fill();

  c.fillStyle = '#ffffff';
  c.beginPath();
  c.arc(x - r * 0.33, y - r * 0.22, r * 0.24, 0, 6.284);
  c.arc(x + r * 0.33, y - r * 0.22, r * 0.24, 0, 6.284);
  c.fill();
  c.fillStyle = '#1a1a22';
  c.beginPath();
  c.arc(x - r * 0.3, y - r * 0.2, r * 0.11, 0, 6.284);
  c.arc(x + r * 0.36, y - r * 0.2, r * 0.11, 0, 6.284);
  c.fill();

  c.strokeStyle = '#3f7a26';
  c.lineWidth = Math.max(1.4, s * 2);
  c.beginPath();
  c.moveTo(x - r * 0.62, y - r * 0.56);
  c.lineTo(x - r * 0.12, y - r * 0.36);
  c.moveTo(x + r * 0.62, y - r * 0.56);
  c.lineTo(x + r * 0.12, y - r * 0.36);
  c.stroke();

  var dmg = 1 - Math.max(0, p.hp) / p.max;
  if (dmg > 0.25) {
    c.strokeStyle = 'rgba(60,30,60,.45)';
    c.lineWidth = Math.max(1, s * 1.4);
    c.beginPath();
    c.moveTo(x + r * 0.5, y - r * 0.6);
    c.lineTo(x + r * 0.2, y - r * 0.1);
    c.stroke();
  }
  c.restore();
}

/* ---------- птицы ---------- */
var FEATHER = {
  red:    { a: '#ff6a5a', b: '#c1231b', belly: '#ffe3d2' },
  yellow: { a: '#ffdc55', b: '#e0a119', belly: '#fff4c9' },
  blue:   { a: '#6fc8f5', b: '#2a72b8', belly: '#e6f6ff' },
  black:  { a: '#5a5a66', b: '#16161d', belly: '#8b8b96' }
};

function drawBirdAt(b, isActive) {
  var c = ctx(), s = sc(), r = b.r * s;
  var x = px(b.x), y = py(b.y);
  var f = FEATHER[b.type] || FEATHER.red;

  c.save();
  c.fillStyle = 'rgba(0,0,0,.18)';
  c.beginPath();
  c.ellipse(x, py(G.GROUND_Y) + s * 4, r * 1.1, r * 0.3, 0, 0, 6.284);
  c.fill();

  c.fillStyle = f.b;
  c.beginPath();
  c.moveTo(x + r * 0.55, y - r * 0.1);
  c.lineTo(x + r * 1.45, y - r * 0.65);
  c.lineTo(x + r * 1.5, y + r * 0.1);
  c.lineTo(x + r * 0.6, y + r * 0.35);
  c.closePath();
  c.fill();

  var g = c.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.12, x, y, r * 1.2);
  g.addColorStop(0, f.a);
  g.addColorStop(0.6, f.a);
  g.addColorStop(1, f.b);
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, r, 0, 6.284);
  c.fill();

  c.fillStyle = f.belly;
  c.beginPath();
  c.ellipse(x + r * 0.05, y + r * 0.42, r * 0.5, r * 0.34, 0, 0, 6.284);
  c.fill();

  c.fillStyle = '#ffffff';
  c.beginPath();
  c.arc(x - r * 0.26, y - r * 0.26, r * 0.28, 0, 6.284);
  c.arc(x + r * 0.28, y - r * 0.26, r * 0.28, 0, 6.284);
  c.fill();
  c.fillStyle = '#15151c';
  c.beginPath();
  c.arc(x - r * 0.22, y - r * 0.24, r * 0.13, 0, 6.284);
  c.arc(x + r * 0.32, y - r * 0.24, r * 0.13, 0, 6.284);
  c.fill();

  c.strokeStyle = 'rgba(20,20,28,.85)';
  c.lineWidth = Math.max(1.6, s * 2.4);
  c.beginPath();
  c.moveTo(x - r * 0.58, y - r * 0.66);
  c.lineTo(x - r * 0.06, y - r * 0.44);
  c.moveTo(x + r * 0.58, y - r * 0.66);
  c.lineTo(x + r * 0.06, y - r * 0.44);
  c.stroke();

  c.fillStyle = '#f4a623';
  c.beginPath();
  c.moveTo(x + r * 0.02, y - r * 0.02);
  c.lineTo(x + r * 0.74, y + r * 0.16);
  c.lineTo(x + r * 0.02, y + r * 0.34);
  c.closePath();
  c.fill();

  if (b.type === 'black' && !b.used) {
    c.strokeStyle = '#ff8a3d';
    c.lineWidth = Math.max(1.4, s * 2);
    c.beginPath();
    c.moveTo(x, y - r * 1.05);
    c.quadraticCurveTo(x + r * 0.3, y - r * 1.5, x - r * 0.1, y - r * 1.75);
    c.stroke();
    c.fillStyle = '#ffe066';
    c.beginPath();
    c.arc(x - r * 0.1, y - r * 1.8, r * 0.16 * (1 + Math.sin(performance.now() / 90) * 0.25), 0, 6.284);
    c.fill();
  }

  if (isActive && b.state === 'ready') {
    c.strokeStyle = 'rgba(255,255,255,' + (0.22 + 0.16 * Math.sin(performance.now() / 260)).toFixed(2) + ')';
    c.lineWidth = Math.max(1.5, s * 2);
    c.beginPath();
    c.arc(x, y, r * 1.35, 0, 6.284);
    c.stroke();
  }
  c.restore();
}

/* ---------- рогатка ---------- */
function drawSling(front) {
  var c = ctx(), s = sc();
  var bx = px(G.SLING_X), by = py(G.GROUND_Y);
  var ty = py(G.SLING_Y);
  if (!front) {
    var g = c.createLinearGradient(bx - 9 * s, 0, bx + 9 * s, 0);
    g.addColorStop(0, '#6b4522');
    g.addColorStop(0.45, '#9a6a33');
    g.addColorStop(1, '#4f3117');
    c.fillStyle = g;
    roundRect(c, bx - 9 * s, ty + 26 * s, 18 * s, by - ty - 26 * s, 6 * s);
    c.fill();
    c.strokeStyle = '#3a2410';
    c.lineWidth = Math.max(1, s * 1.6);
    roundRect(c, bx - 9 * s, ty + 26 * s, 18 * s, by - ty - 26 * s, 6 * s);
    c.stroke();

    c.strokeStyle = '#7a5228';
    c.lineWidth = Math.max(3, s * 7);
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(bx, ty + 34 * s);
    c.lineTo(bx - 15 * s, ty - 6 * s);
    c.moveTo(bx, ty + 34 * s);
    c.lineTo(bx + 15 * s, ty - 6 * s);
    c.stroke();
    c.lineCap = 'butt';
    return;
  }

  var a = G.active;
  c.save();
  c.strokeStyle = '#3d2412';
  c.lineWidth = Math.max(2, s * 5);
  c.lineCap = 'round';
  if (a && (a.state === 'ready' || a.state === 'aim')) {
    var ax = px(a.x), ay = py(a.y);
    c.beginPath();
    c.moveTo(bx - 15 * s, ty - 6 * s);
    c.lineTo(ax - a.r * 0.5 * s, ay);
    c.stroke();
    c.beginPath();
    c.moveTo(bx + 15 * s, ty - 6 * s);
    c.lineTo(ax + a.r * 0.5 * s, ay);
    c.stroke();
  }
  c.restore();
}

/* ---------- прицел ---------- */
function drawAim() {
  var a = G.active;
  if (!a || a.state !== 'ready' || G.flying) return;
  var c = ctx(), s = sc();
  var dx = G.SLING_X - a.x, dy = G.SLING_Y - a.y;
  var pull = Math.sqrt(dx * dx + dy * dy);
  if (pull < 12) return;
  var vx = dx * G.POWER / G.MAX_PULL, vy = dy * G.POWER / G.MAX_PULL;
  var steps = G.has('goggles') ? 42 : 26;
  var n, t, x, y;
  c.save();
  for (n = 1; n <= steps; n++) {
    t = n * 0.055;
    x = a.x + vx * t * 60;
    y = a.y + vy * t * 60 + 0.5 * G.GRAVITY * t * t * 60 * 0.055;
    if (y > G.GROUND_Y) break;
    c.globalAlpha = Math.max(0.08, 0.72 - n / steps * 0.6);
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(px(x), py(y), Math.max(1.2, s * (2.6 - n / steps * 1.4)), 0, 6.284);
    c.fill();
  }
  c.restore();

  var gx = px(G.SLING_X), gy = py(G.SLING_Y);
  c.save();
  c.globalAlpha = 0.35;
  c.strokeStyle = '#ffd34d';
  c.lineWidth = Math.max(2, s * 3);
  c.beginPath();
  c.moveTo(gx, gy);
  c.lineTo(px(a.x), py(a.y));
  c.stroke();
  c.restore();
}

/* ---------- осколки и очки ---------- */
var PART_COLOR = { wood: '#a4692a', ice: '#bfeaf8', stone: '#a8a8b2', sand: '#d8c078', pig: '#7fc94a', bird: '#ff6a5a' };

function drawParts() {
  var c = ctx(), s = sc(), i, p;
  c.save();
  for (i = 0; i < G.parts.length; i++) {
    p = G.parts[i];
    c.globalAlpha = Math.max(0, Math.min(1, p.life * 1.6));
    c.fillStyle = PART_COLOR[p.k] || '#ffffff';
    c.save();
    c.translate(px(p.x), py(p.y));
    c.rotate(p.rot || 0);
    c.fillRect(-p.r * s / 2, -p.r * s / 2, p.r * s, p.r * s);
    c.restore();
  }
  c.restore();
}

function drawPops() {
  var c = ctx(), s = sc(), i, p;
  c.save();
  c.textAlign = 'center';
  for (i = 0; i < G.pops.length; i++) {
    p = G.pops[i];
    c.globalAlpha = Math.max(0, Math.min(1, p.t));
    c.font = '900 ' + Math.max(14, 26 * s) + 'px -apple-system, Roboto, sans-serif';
    c.lineWidth = Math.max(2, s * 4);
    c.strokeStyle = 'rgba(0,0,0,.6)';
    c.strokeText(p.txt, px(p.x), py(p.y) - (1 - p.t) * 60 * s);
    c.fillStyle = p.col || '#ffd34d';
    c.fillText(p.txt, px(p.x), py(p.y) - (1 - p.t) * 60 * s);
  }
  c.restore();
}

function drawTrail() {
  var f = G.flying;
  if (!f || !f.trail || f.trail.length < 2) return;
  var c = ctx(), s = sc(), i;
  c.save();
  c.strokeStyle = 'rgba(255,255,255,.35)';
  c.lineWidth = Math.max(1.5, s * 2.4);
  c.setLineDash([6 * s, 7 * s]);
  c.beginPath();
  c.moveTo(px(f.trail[0].x), py(f.trail[0].y));
  for (i = 1; i < f.trail.length; i++) c.lineTo(px(f.trail[i].x), py(f.trail[i].y));
  c.stroke();
  c.restore();
}

/* ---------- сборка кадра ---------- */
R.draw = function () {
  var c = ctx();
  if (!c) return;
  c.setTransform(1, 0, 0, 1, 0, 0);
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.setTransform(dpr, 0, 0, dpr, 0, 0);

  R.drawScene();

  var off = R.shakeOffset();
  c.save();
  c.translate(off.x, off.y);

  drawSling(false);

  var i;
  for (i = 0; i < G.blocks.length; i++) if (!G.blocks[i].dead) drawBlock(G.blocks[i]);
  for (i = 0; i < G.pigs.length; i++) if (!G.pigs[i].dead) drawPig(G.pigs[i]);

  drawTrail();
  if (G.flying) drawBirdAt(G.flying, true);
  for (i = 0; i < G.extraFlyers.length; i++) drawBirdAt(G.extraFlyers[i], false);
  for (i = 0; i < G.birdsLeft.length; i++) drawBirdAt(G.birdsLeft[i], false);
  if (G.active) drawBirdAt(G.active, true);

  drawSling(true);
  drawAim();
  drawParts();
  drawPops();
  c.restore();
};

})();
