/* ============================================================
   ANGRY BIRDS — графика (арт)
   Всё рисуется кодом: небо, холмы, трава, рогатка, птицы,
   свиньи, материалы с текстурами, частицы, эффекты.
   Экспорт: window.ABR
   ============================================================ */
window.ABR = (function () {
'use strict';
var G = window.ABG;
if (!G) { console.error('ABG не загружен'); return null; }

var cv = null, ctx = null, scale = 1, viewW = 0;
var camX = 0, camTarget = 0, shk = 0;
var clouds = [], hillsA = [], hillsB = [], tufts = [], fx = [];

function rnd(a, b) { return a + Math.random() * (b - a); }
function SX(x) { return (x - camX) * scale; }
function SY(y) { return y * scale; }

/* ---------------------------------------------------------- */
function init() {
  cv = document.getElementById('cv');
  if (!cv) { console.error('нет #cv'); return false; }
  ctx = cv.getContext('2d');
  build();
  resize();
  window.addEventListener('resize', resize);
  return true;
}

function build() {
  var i;
  for (i = 0; i < 10; i++) clouds.push({
    x: rnd(-200, G.WORLD_W + 300), y: rnd(40, 260),
    s: rnd(0.55, 1.5), v: rnd(5, 16)
  });
  for (i = 0; i <= 40; i++) {
    hillsA.push({ x: i * 110 + rnd(-24, 24), h: rnd(90, 190), w: rnd(150, 260) });
    hillsB.push({ x: i * 95, h: rnd(50, 110), w: rnd(120, 200) });
  }
  for (i = 0; i < 260; i++) tufts.push({ x: rnd(0, G.WORLD_W), k: rnd(0.5, 1.5), f: rnd(0, 6.28) });
}

function resize() {
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var w = window.innerWidth, h = window.innerHeight;
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);
  cv.style.width = w + 'px';
  cv.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  scale = h / G.WORLD_H;
  viewW = w / scale;
  clampCam();
}

function clampCam() {
  camTarget = Math.max(0, Math.min(camTarget, G.WORLD_W - viewW));
}

function toWorld(cx, cy) {
  return { x: cx / scale + camX, y: cy / scale };
}
function setCam(v) { camTarget = v; clampCam(); }
function snap() { camX = camTarget; }
function follow(x) { camTarget = x - viewW * 0.42; clampCam(); }
function shake(a) { shk = Math.max(shk, a); }

function tick(dt) {
  camX += (camTarget - camX) * Math.min(1, dt * 5.5);
  shk *= 0.88;
  if (shk < 0.4) shk = 0;
  var i;
  for (i = 0; i < clouds.length; i++) {
    clouds[i].x += clouds[i].v * dt;
    if (clouds[i].x > G.WORLD_W + 320) clouds[i].x = -320;
  }
  for (i = fx.length - 1; i >= 0; i--) {
    fx[i].t -= dt;
    fx[i].r += fx[i].grow * dt;
    if (fx[i].t <= 0) fx.splice(i, 1);
  }
}

function burst(x, y, kind) {
  var n = kind === 'boom' ? 3 : 1;
  for (var i = 0; i < n; i++) {
    fx.push({
      x: x + (i ? rnd(-18, 18) : 0), y: y + (i ? rnd(-18, 18) : 0),
      r: kind === 'boom' ? 12 : 8, grow: kind === 'boom' ? 190 : 70,
      t: kind === 'boom' ? 0.45 : 0.3, max: kind === 'boom' ? 0.45 : 0.3,
      kind: kind || 'hit'
    });
  }
}

/* ---------------- небо и фон ---------------- */
function drawSky() {
  var g = ctx.createLinearGradient(0, 0, 0, SY(G.GROUND_Y));
  g.addColorStop(0, '#1b3a6b');
  g.addColorStop(0.45, '#4f8fd0');
  g.addColorStop(1, '#bfe4f5');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cv.width, SY(G.GROUND_Y) + 2);

  // солнце
  var sx = SX(320), sy = SY(120);
  var sg = ctx.createRadialGradient(sx, sy, 8 * scale, sx, sy, 120 * scale);
  sg.addColorStop(0, 'rgba(255,246,200,.95)');
  sg.addColorStop(0.35, 'rgba(255,225,140,.42)');
  sg.addColorStop(1, 'rgba(255,220,120,0)');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.arc(sx, sy, 120 * scale, 0, 6.283);
  ctx.fill();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(sx, sy, 34 * scale, 0, 6.283);
  ctx.fill();
}

function puff(x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 6.283);
  ctx.fill();
}

function drawClouds() {
  ctx.fillStyle = 'rgba(255,255,255,.86)';
  for (var i = 0; i < clouds.length; i++) {
    var c = clouds[i], s = c.s * scale;
    if (c.x < camX - 400 || c.x > camX + viewW + 400) continue;
    var x = SX(c.x), y = SY(c.y);
    ctx.beginPath();
    ctx.arc(x, y, 30 * s, 0, 6.283);
    ctx.arc(x + 34 * s, y + 8 * s, 24 * s, 0, 6.283);
    ctx.arc(x - 34 * s, y + 10 * s, 21 * s, 0, 6.283);
    ctx.arc(x + 8 * s, y - 20 * s, 22 * s, 0, 6.283);
    ctx.fill();
  }
}

function drawHills() {
  var i, arr = hillsB;
  ctx.fillStyle = '#5f9e63';
  for (i = 0; i < arr.length; i++) {
    var b = arr[i];
    if (b.x < camX - 320 || b.x > camX + viewW + 320) continue;
    ctx.beginPath();
    ctx.moveTo(SX(b.x - b.w / 2), SY(G.GROUND_Y));
    ctx.quadraticCurveTo(SX(b.x), SY(G.GROUND_Y - b.h), SX(b.x + b.w / 2), SY(G.GROUND_Y));
    ctx.fill();
  }
  ctx.fillStyle = '#3f7a4a';
  for (i = 0; i < hillsA.length; i++) {
    var a = hillsA[i];
    if (a.x < camX - 400 || a.x > camX + viewW + 400) continue;
    ctx.beginPath();
    ctx.moveTo(SX(a.x - a.w / 2), SY(G.GROUND_Y));
    ctx.quadraticCurveTo(SX(a.x), SY(G.GROUND_Y - a.h), SX(a.x + a.w / 2), SY(G.GROUND_Y));
    ctx.fill();
  }
}

function drawGround() {
  var y = SY(G.GROUND_Y);
  var g = ctx.createLinearGradient(0, y, 0, SY(G.WORLD_H));
  g.addColorStop(0, '#6cbf5a');
  g.addColorStop(0.12, '#4f9c45');
  g.addColorStop(0.4, '#8a5f34');
  g.addColorStop(1, '#5d3e20');
  ctx.fillStyle = g;
  ctx.fillRect(0, y, cv.width, cv.height - y);

  ctx.fillStyle = '#7ed36b';
  for (var i = 0; i < tufts.length; i++) {
    var t = tufts[i];
    if (t.x < camX - 20 || t.x > camX + viewW + 20) continue;
    var x = SX(t.x), hh = 9 * t.k * scale;
    ctx.beginPath();
    ctx.moveTo(x, y + 1);
    ctx.quadraticCurveTo(x + 4 * scale * t.k, y - hh, x + 8 * scale * t.k, y + 1);
    ctx.fill();
  }
}

/* ---------------- материалы ---------------- */
function blockBody(b) {
  var x = SX(b.x - b.w / 2), y = SY(b.y - b.h / 2);
  var w = b.w * scale, h = b.h * scale, m = b.m;
  var g, edge, dark;

  if (m === 'ice') {
    g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, 'rgba(214,246,255,.95)');
    g.addColorStop(0.5, 'rgba(150,214,240,.9)');
    g.addColorStop(1, 'rgba(196,238,255,.95)');
    edge = '#79bcd8';
    ctx.strokeStyle = 'rgba(255,255,255,.75)';
    ctx.lineWidth = 2.5 * scale;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.18, y + h * 0.82);
    ctx.lineTo(x + w * 0.6, y + h * 0.2);
    ctx.moveTo(x + w * 0.42, y + h * 0.9);
    ctx.lineTo(x + w * 0.86, y + h * 0.34);
    ctx.stroke();
  } else if (m === 'stone') {
    g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, '#d6d6da');
    g.addColorStop(1, '#9a9aa2');
    edge = '#74747c';
    ctx.fillStyle = 'rgba(90,90,98,.35)';
    var n;
    for (n = 0; n < 7; n++) {
      var px = x + ((n * 37) % Math.max(1, w - 8)) + 4;
      var py = y + ((n * 53) % Math.max(1, h - 8)) + 4;
      ctx.beginPath();
      ctx.arc(px, py, 2.4 * scale, 0, 6.283);
      ctx.fill();
    }
  } else if (m === 'sand') {
    g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, '#f0dda4');
    g.addColorStop(1, '#cbb275');
    edge = '#a68f57';
    ctx.strokeStyle = 'rgba(150,125,75,.4)';
    ctx.lineWidth = 1.5 * scale;
    var k;
    for (k = 1; k < 4; k++) {
      ctx.beginPath();
      ctx.moveTo(x + 2, y + h * k / 4);
      ctx.lineTo(x + w - 2, y + h * k / 4);
      ctx.stroke();
    }
  } else {
    g = ctx.createLinearGradient(x, y, x + w * 0.4, y + h);
    g.addColorStop(0, '#e0a665');
    g.addColorStop(0.5, '#c88c42');
    g.addColorStop(1, '#a86f2e');
    edge = '#8a5a22';
    ctx.strokeStyle = 'rgba(120,76,26,.45)';
    ctx.lineWidth = 1.4 * scale;
    var q;
    for (q = 1; q < 4; q++) {
      ctx.beginPath();
      ctx.moveTo(x + w * q / 4, y + 3);
      ctx.lineTo(x + w * q / 4, y + h - 3);
      ctx.stroke();
    }
  }

  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = edge;
  ctx.lineWidth = Math.max(1.6, 2.6 * scale);
  ctx.strokeRect(x, y, w, h);

  // трещины по мере урона
  var dmg = 1 - (b.hp / b.max);
  if (dmg > 0.25) {
    ctx.strokeStyle = 'rgba(40,26,10,' + Math.min(0.7, dmg) + ')';
    ctx.lineWidth = Math.max(1, 1.8 * scale);
    ctx.beginPath();
    ctx.moveTo(x + w * 0.2, y + h * 0.1);
    ctx.lineTo(x + w * 0.45, y + h * 0.45);
    ctx.lineTo(x + w * 0.3, y + h * 0.7);
    if (dmg > 0.55) {
      ctx.moveTo(x + w * 0.75, y + h * 0.15);
      ctx.lineTo(x + w * 0.6, y + h * 0.55);
      ctx.lineTo(x + w * 0.82, y + h * 0.85);
    }
    ctx.stroke();
  }
}

function drawBlocks() {
  for (var i = 0; i < G.blocks.length; i++) {
    var b = G.blocks[i];
    if (b.dead) continue;
    if (b.x < camX - 200 || b.x > camX + viewW + 200) continue;
    blockBody(b);
  }
}

/* ---------------- свиньи и птицы ---------------- */
function pigShadow(x, r) {
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ctx.beginPath();
  ctx.ellipse(SX(x), SY(G.GROUND_Y) + 2, r * 0.9 * scale, r * 0.26 * scale, 0, 0, 6.283);
  ctx.fill();
}

function drawPig(p) {
  var x = SX(p.x), y = SY(p.y), r = p.r * scale;
  var hurt = p.hp / p.max;
  pigShadow(p.x, p.r);

  // уши
  ctx.fillStyle = '#77c257';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.62, y - r * 0.72, r * 0.26, r * 0.34, -0.5, 0, 6.283);
  ctx.ellipse(x + r * 0.62, y - r * 0.72, r * 0.26, r * 0.34, 0.5, 0, 6.283);
  ctx.fill();

  // голова
  var g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.42, r * 0.2, x, y, r * 1.1);
  g.addColorStop(0, hurt > 0.5 ? '#a8e07d' : '#94cf6d');
  g.addColorStop(1, hurt > 0.5 ? '#5aa63f' : '#4a8b34');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 6.283);
  ctx.fill();
  ctx.strokeStyle = '#3c7229';
  ctx.lineWidth = Math.max(1.4, 2 * scale);
  ctx.stroke();

  // пятачок
  ctx.fillStyle = '#7ed45c';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.24, r * 0.42, r * 0.31, 0, 0, 6.283);
  ctx.fill();
  ctx.strokeStyle = '#3c7229';
  ctx.lineWidth = Math.max(1, 1.5 * scale);
  ctx.stroke();
  ctx.fillStyle = '#2f6a22';
  ctx.beginPath();
  ctx.arc(x - r * 0.15, y + r * 0.24, r * 0.075, 0, 6.283);
  ctx.arc(x + r * 0.15, y + r * 0.24, r * 0.075, 0, 6.283);
  ctx.fill();

  // глаза
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x - r * 0.34, y - r * 0.28, r * 0.24, 0, 6.283);
  ctx.arc(x + r * 0.34, y - r * 0.28, r * 0.24, 0, 6.283);
  ctx.fill();
  ctx.fillStyle = '#1b2a12';
  ctx.beginPath();
  ctx.arc(x - r * 0.31, y - r * 0.27, r * 0.11, 0, 6.283);
  ctx.arc(x + r * 0.37, y - r * 0.27, r * 0.11, 0, 6.283);
  ctx.fill();

  // злые брови
  ctx.strokeStyle = '#2f5c1d';
  ctx.lineWidth = Math.max(1.4, 2.4 * scale);
  ctx.beginPath();
  ctx.moveTo(x - r * 0.6, y - r * 0.62);
  ctx.lineTo(x - r * 0.14, y - r * 0.44);
  ctx.moveTo(x + r * 0.6, y - r * 0.62);
  ctx.lineTo(x + r * 0.14, y - r * 0.44);
  ctx.stroke();
}

function birdColors(type) {
  switch (type) {
    case 'yellow': return ['#ffe066', '#e0a800', '#8a6400'];
    case 'blue': return ['#7fd2ff', '#2d86c9', '#1a5a8c'];
    case 'black': return ['#5a5a66', '#22222a', '#000000'];
    default: return ['#ff6b5e', '#c62828', '#8a1414'];
  }
}

function drawBird(b, isActive) {
  var C = birdColors(b.type);
  var x = SX(b.x), y = SY(b.y), r = b.r * scale;
  var ang = 0;
  if (b.vx || b.vy) ang = Math.atan2(b.vy, b.vx);

  // след
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang * 0.35);

  // хвост
  ctx.fillStyle = C[2];
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, -r * 0.2);
  ctx.lineTo(-r * 1.7, -r * 0.75);
  ctx.lineTo(-r * 1.55, 0);
  ctx.lineTo(-r * 1.7, r * 0.7);
  ctx.closePath();
  ctx.fill();

  // тело
  var g = ctx.createRadialGradient(-r * 0.3, -r * 0.42, r * 0.15, 0, 0, r * 1.15);
  g.addColorStop(0, C[0]);
  g.addColorStop(0.65, C[1]);
  g.addColorStop(1, C[2]);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, 6.283);
  ctx.fill();
  ctx.strokeStyle = C[2];
  ctx.lineWidth = Math.max(1.4, 2 * scale);
  ctx.stroke();

  // живот
  ctx.fillStyle = 'rgba(255,250,235,.9)';
  ctx.beginPath();
  ctx.ellipse(r * 0.1, r * 0.45, r * 0.42, r * 0.3, 0, 0, 6.283);
  ctx.fill();

  // клюв
  ctx.fillStyle = '#ffb300';
  ctx.beginPath();
  ctx.moveTo(r * 0.72, -r * 0.06);
  ctx.lineTo(r * 1.36, r * 0.14);
  ctx.lineTo(r * 0.72, r * 0.34);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#c98a00';
  ctx.lineWidth = Math.max(1, 1.4 * scale);
  ctx.stroke();

  // глаз
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(r * 0.34, -r * 0.34, r * 0.34, 0, 6.283);
  ctx.fill();
  ctx.fillStyle = '#101820';
  ctx.beginPath();
  ctx.arc(r * 0.42, -r * 0.33, r * 0.15, 0, 6.283);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.beginPath();
  ctx.arc(r * 0.48, -r * 0.4, r * 0.06, 0, 6.283);
  ctx.fill();

  // бровь
  ctx.strokeStyle = C[2];
  ctx.lineWidth = Math.max(1.6, 2.6 * scale);
  ctx.beginPath();
  ctx.moveTo(r * 0.04, -r * 0.72);
  ctx.lineTo(r * 0.7, -r * 0.5);
  ctx.stroke();

  // фитиль у чёрной
  if (b.type === 'black') {
    ctx.strokeStyle = '#a08a5a';
    ctx.lineWidth = Math.max(1.4, 2 * scale);
    ctx.beginPath();
    ctx.moveTo(-r * 0.1, -r * 0.95);
    ctx.quadraticCurveTo(r * 0.12, -r * 1.35, -r * 0.06, -r * 1.6);
    ctx.stroke();
    ctx.fillStyle = '#ff9b30';
    ctx.beginPath();
    ctx.arc(-r * 0.06, -r * 1.66, r * 0.17, 0, 6.283);
    ctx.fill();
  }
  ctx.restore();

  // индикатор способности
  if (isActive && b.ability && b.ability !== 'none' && b.state === 'ready') {
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.font = 'bold ' + Math.max(10, 12 * scale) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TAP', x, SY(b.y) - b.r * scale - 8 * scale);
  }
}

/* ---------------- рогатка ---------------- */
function drawSlingBack() {
  var bx = SX(G.SLING_X), by = SY(G.SLING_Y);
  ctx.strokeStyle = '#6b4423';
  ctx.lineCap = 'round';
  ctx.lineWidth = 12 * scale;
  ctx.beginPath();
  ctx.moveTo(bx, SY(G.GROUND_Y));
  ctx.lineTo(bx, by);
  ctx.stroke();

  ctx.strokeStyle = '#8a5a2b';
  ctx.lineWidth = 10 * scale;
  ctx.beginPath();
  ctx.moveTo(bx - 26 * scale, by - 6 * scale);
  ctx.lineTo(bx, by + 8 * scale);
  ctx.moveTo(bx + 26 * scale, by - 6 * scale);
  ctx.lineTo(bx, by + 8 * scale);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(60,36,16,.6)';
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.moveTo(bx - 24 * scale, by - 4 * scale);
  ctx.lineTo(bx, by + 6 * scale);
  ctx.moveTo(bx + 24 * scale, by - 4 * scale);
  ctx.lineTo(bx, by + 6 * scale);
  ctx.stroke();
}

function drawSlingFront() {
  var a = G.active;
  var ax = a ? SX(a.x) : SX(G.SLING_X);
  var ay = a ? SY(a.y) : SY(G.SLING_Y);
  var bx = SX(G.SLING_X), by = SY(G.SLING_Y);
  ctx.strokeStyle = '#4a2f14';
  ctx.lineWidth = 6 * scale;
  ctx.beginPath();
  ctx.moveTo(bx - 26 * scale, by - 6 * scale);
  ctx.lineTo(ax, ay);
  ctx.lineTo(bx + 26 * scale, by - 6 * scale);
  ctx.stroke();
}

/* ---------------- частицы и эффекты ---------------- */
function drawParticles() {
  for (var i = 0; i < G.parts.length; i++) {
    var p = G.parts[i];
    if (p.x < camX - 80 || p.x > camX + viewW + 80) continue;
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.6));
    ctx.fillStyle = p.color || '#c98b3d';
    ctx.beginPath();
    ctx.arc(SX(p.x), SY(p.y), Math.max(1, (p.size || 3) * scale), 0, 6.283);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPops() {
  for (var i = 0; i < G.pops.length; i++) {
    var p = G.pops[i];
    ctx.globalAlpha = Math.max(0, Math.min(1, p.t));
    ctx.fillStyle = p.color || '#ffd34d';
    ctx.strokeStyle = 'rgba(0,0,0,.55)';
    ctx.lineWidth = Math.max(2, 3 * scale);
    ctx.font = 'bold ' + Math.max(14, 22 * scale) + 'px sans-serif';
    ctx.textAlign = 'center';
    var tx = SX(p.x), ty = SY(p.y) - (1 - p.t) * 40 * scale;
    ctx.strokeText(p.text, tx, ty);
    ctx.fillText(p.text, tx, ty);
  }
  ctx.globalAlpha = 1;
}

function drawFx() {
  for (var i = 0; i < fx.length; i++) {
    var f = fx[i], k = f.t / f.max;
    ctx.globalAlpha = k * 0.85;
    if (f.kind === 'boom') {
      var g = ctx.createRadialGradient(SX(f.x), SY(f.y), f.r * scale * 0.2, SX(f.x), SY(f.y), f.r * scale);
      g.addColorStop(0, 'rgba(255,245,190,.95)');
      g.addColorStop(0.5, 'rgba(255,150,50,.6)');
      g.addColorStop(1, 'rgba(180,60,20,0)');
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = 'rgba(255,255,255,.6)';
    }
    ctx.beginPath();
    ctx.arc(SX(f.x), SY(f.y), f.r * scale, 0, 6.283);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/* ---------------- прицел и след ---------------- */
function drawTrail() {
  var a = G.active;
  if (!a || !G.started) return;
  var dx = a.x - G.SLING_X, dy = a.y - G.SLING_Y;
  if (Math.sqrt(dx * dx + dy * dy) < 8) return;

  var long = G.has && G.has('goggles');
  var vx = -dx * G.POWER, vy = -dy * G.POWER;
  var x = a.x, y = a.y, dt = 0.05, i;
  var steps = long ? 46 : 26;

  ctx.fillStyle = 'rgba(255,255,255,.75)';
  for (i = 0; i < steps; i++) {
    x += vx * dt;
    y += vy * dt;
    vy += G.GRAVITY * dt;
    if (y > G.GROUND_Y) break;
    if (i % (long ? 3 : 4) === 0) {
      ctx.globalAlpha = 0.85 * (1 - i / steps);
      ctx.beginPath();
      ctx.arc(SX(x), SY(y), Math.max(1.4, 3 * scale), 0, 6.283);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

/* ---------------- общая отрисовка ---------------- */
function draw() {
  if (!ctx) return;
  ctx.save();
  if (shk > 0.4) ctx.translate(rnd(-shk, shk) * scale, rnd(-shk, shk) * scale);

  drawSky();
  ctx.save();
  ctx.translate(0, 0);
  drawClouds();
  drawHills();
  ctx.restore();
  drawGround();

  drawSlingBack();
  drawBlocks();

  var i;
  for (i = 0; i < G.pigs.length; i++) if (!G.pigs[i].dead) drawPig(G.pigs[i]);
  for (i = 0; i < G.extraFlyers.length; i++) drawBird(G.extraFlyers[i], false);
  if (G.flying) drawBird(G.flying, false);

  drawTrail();
  if (G.active) drawBird(G.active, true);

  drawSlingFront();
  drawParticles();
  drawFx();
  drawPops();

  ctx.restore();
}

return {
  init: init, resize: resize, draw: draw, tick: tick,
  follow: follow, setCam: setCam, snap: snap, shake: shake, burst: burst,
  toWorld: toWorld, getScale: function () { return scale; },
  getCamX: function () { return camX; }, getViewW: function () { return viewW; }
};
})();
