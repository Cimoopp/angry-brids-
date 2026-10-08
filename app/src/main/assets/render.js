/* ============================================================
   ANGRY BIRDS — графика (window.ABR)
   Небо, солнце, облака, холмы, трава, текстуры материалов,
   птицы, свиньи, рогатка, прицел, осколки, тряска экрана.
   ============================================================ */
window.ABR = (function () {
'use strict';
var G = window.ABG;
if (!G) { console.error('ABG не загружен'); return null; }

function $(id) { return document.getElementById(id); }
function rnd(a, b) { return a + Math.random() * (b - a); }
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

var cv = null, ctx = null, scale = 1, viewW = 0, camX = 0, camT = 0;
var clouds = [], grass = [], hills = [], T = 0;
var shX = 0, shY = 0, shT = 0;

var BIRD_COLORS = {
  red:    { body: '#e8453c', dark: '#a82a24', belly: '#f7d9d6' },
  yellow: { body: '#f5c542', dark: '#c19416', belly: '#fdf0c4' },
  blue:   { body: '#4aa8e8', dark: '#2a6fa8', belly: '#d6ecfa' },
  black:  { body: '#3a3a44', dark: '#1e1e26', belly: '#8d8d99' }
};

/* ---------------- инициализация ---------------- */
function init() {
  cv = $('cv');
  if (!cv) { console.error('нет canvas #cv'); return false; }
  ctx = cv.getContext('2d');
  build();
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 180); });
  return true;
}

function build() {
  var i;
  clouds = []; grass = []; hills = [];
  for (i = 0; i < 11; i++) {
    clouds.push({ x: rnd(-300, G.WORLD_W + 300), y: rnd(48, 250), s: rnd(0.55, 1.5), v: rnd(5, 16) });
  }
  for (i = 0; i < 230; i++) {
    grass.push({ x: rnd(0, G.WORLD_W), h: rnd(9, 24), p: rnd(0, 6.28) });
  }
  for (i = 0; i < 18; i++) {
    hills.push({ x: i * 165 + rnd(-45, 45), r: rnd(95, 200) });
  }
}

function resize() {
  if (!cv) return;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var w = window.innerWidth, h = window.innerHeight;
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);
  cv.style.width = w + 'px';
  cv.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  scale = h / G.WORLD_H;
  viewW = w / scale;
  snap();
}

function toWorld(cx, cy) {
  var r = cv.getBoundingClientRect();
  return { x: camX + (cx - r.left) / scale, y: (cy - r.top) / scale };
}
function tick(dt) {
  T += dt;
  var i;
  for (i = 0; i < clouds.length; i++) {
    clouds[i].x += clouds[i].v * dt;
    if (clouds[i].x > G.WORLD_W + 340) clouds[i].x = -340;
  }
  if (shT > 0) {
    shT -= dt;
    var k = Math.max(0, shT) * 26;
    shX = rnd(-k, k); shY = rnd(-k, k);
  } else { shX = 0; shY = 0; }
}
function shake(power) { shT = Math.min(0.45, (power || 1) * 0.16); }

/* ---------------- камера ---------------- */
function follow(x) {
  camT = clamp(x - viewW * 0.40, 0, Math.max(0, G.WORLD_W - viewW));
  camX += (camT - camX) * 0.09;
}
function setCam(v) { camT = clamp(v, 0, Math.max(0, G.WORLD_W - viewW)); camX = camT; }
function snap() { camX = camT; }

/* ---------------- фон ---------------- */
function sky(w, h) {
  var g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#123055');
  g.addColorStop(0.34, '#2b6b9e');
  g.addColorStop(0.66, '#7fb8d8');
  g.addColorStop(1, '#e8dcb0');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function sun(w, h) {
  var sx = w * 0.80, sy = h * 0.15;
  var g = ctx.createRadialGradient(sx, sy, 4, sx, sy, h * 0.30);
  g.addColorStop(0, 'rgba(255,246,190,0.95)');
  g.addColorStop(0.25, 'rgba(255,226,140,0.42)');
  g.addColorStop(1, 'rgba(255,220,120,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(sx, sy, h * 0.30, 0, 6.2832); ctx.fill();
  ctx.fillStyle = 'rgba(255,252,225,0.95)';
  ctx.beginPath(); ctx.arc(sx, sy, h * 0.045, 0, 6.2832); ctx.fill();
}

function drawCloud(c) {
  var x = c.x, y = c.y, s = c.s;
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.beginPath();
  ctx.arc(x, y, 26 * s, 0, 6.2832);
  ctx.arc(x + 30 * s, y - 10 * s, 32 * s, 0, 6.2832);
  ctx.arc(x + 68 * s, y + 2 * s, 24 * s, 0, 6.2832);
  ctx.arc(x + 34 * s, y + 14 * s, 26 * s, 0, 6.2832);
  ctx.fill();
  ctx.fillStyle = 'rgba(190,215,235,0.55)';
  ctx.beginPath();
  ctx.arc(x + 34 * s, y + 20 * s, 22 * s, 0, 6.2832);
  ctx.fill();
}

function hillsRow(par, colTop, colBot, base, minR) {
  var off = camX * par;
  ctx.save();
  ctx.translate(-off, 0);
  var i, hh;
  for (i = 0; i < hills.length; i++) {
    hh = hills[i];
    if (hh.r < minR) continue;
    var g = ctx.createLinearGradient(0, base - hh.r, 0, base);
    g.addColorStop(0, colTop);
    g.addColorStop(1, colBot);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(hh.x - hh.r, base);
    ctx.quadraticCurveTo(hh.x, base - hh.r * 1.15, hh.x + hh.r, base);
    ctx.fill();
  }
  ctx.restore();
}

function ground() {
  var gy = G.GROUND_Y;
  var g = ctx.createLinearGradient(0, gy, 0, G.WORLD_H);
  g.addColorStop(0, '#7fc04a');
  g.addColorStop(0.10, '#5da135');
  g.addColorStop(0.22, '#8a6a3c');
  g.addColorStop(1, '#4a3520');
  ctx.fillStyle = g;
  ctx.fillRect(camX - 60, gy, viewW + 120, G.WORLD_H - gy + 60);

  ctx.strokeStyle = 'rgba(40,70,20,0.45)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(camX - 60, gy + 1.5);
  ctx.lineTo(camX + viewW + 60, gy + 1.5);
  ctx.stroke();
}

function grassRow() {
  var gy = G.GROUND_Y, i, b, sw;
  ctx.strokeStyle = 'rgba(120,190,70,0.85)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (i = 0; i < grass.length; i++) {
    b = grass[i];
    if (b.x < camX - 30 || b.x > camX + viewW + 30) continue;
    sw = Math.sin(T * 2.1 + b.p) * 4;
    ctx.beginPath();
    ctx.moveTo(b.x, gy + 2);
    ctx.quadraticCurveTo(b.x + sw * 0.5, gy - b.h * 0.6, b.x + sw, gy - b.h);
    ctx.stroke();
  }
}

/* ---------------- материалы ---------------- */
function texture(m, x, y, w, h) {
  var i;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (m === 'wood') {
    ctx.strokeStyle = 'rgba(120,75,25,0.45)';
    ctx.lineWidth = 2;
    for (i = 0; i < 4; i++) {
      var yy = y + (i + 1) * h / 5;
      ctx.beginPath();
      ctx.moveTo(x, yy);
      ctx.bezierCurveTo(x + w * 0.3, yy - 3, x + w * 0.7, yy + 3, x + w, yy);
      ctx.stroke();
    }
  } else if (m === 'ice') {
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 3;
    for (i = -2; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * w / 3, y + h);
      ctx.lineTo(x + i * w / 3 + w * 0.5, y);
      ctx.stroke();
    }
  } else if (m === 'stone') {
    ctx.fillStyle = 'rgba(90,90,100,0.35)';
    for (i = 0; i < 12; i++) {
      ctx.beginPath();
      ctx.arc(x + rnd(4, w - 4), y + rnd(4, h - 4), rnd(1.5, 3.4), 0, 6.2832);
      ctx.fill();
    }
  } else if (m === 'sand') {
    ctx.strokeStyle = 'rgba(150,125,70,0.4)';
    ctx.lineWidth = 2;
    for (i = 1; i < 6; i++) {
      var yy2 = y + i * h / 6;
      ctx.beginPath(); ctx.moveTo(x, yy2); ctx.lineTo(x + w, yy2); ctx.stroke();
    }
  }
  ctx.restore();
}

function block(b) {
  var M = G.MAT[b.m] || G.MAT.wood;
  var x = b.x - b.w / 2, y = b.y - b.h / 2;
  var g = ctx.createLinearGradient(x, y, x, y + b.h);
  g.addColorStop(0, M.fill);
  g.addColorStop(1, M.edge);

  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.fillRect(x + 4, y + 6, b.w, b.h);

  ctx.fillStyle = g;
  ctx.fillRect(x, y, b.w, b.h);
  texture(b.m, x, y, b.w, b.h);

  ctx.strokeStyle = 'rgba(0,0,0,0.42)';
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 1.5, y + 1.5, b.w - 3, b.h - 3);
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 3, y + 2);
  ctx.lineTo(x + b.w - 3, y + 2);
  ctx.stroke();

  var k = b.hp / Math.max(1, b.max);
  if (k < 0.67) {
    ctx.strokeStyle = 'rgba(30,20,10,0.62)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + b.w * 0.30, y);
    ctx.lineTo(x + b.w * 0.44, y + b.h * 0.55);
    ctx.lineTo(x + b.w * 0.32, y + b.h);
    if (k < 0.34) {
      ctx.moveTo(x + b.w * 0.70, y);
      ctx.lineTo(x + b.w * 0.60, y + b.h * 0.42);
      ctx.lineTo(x + b.w * 0.78, y + b.h);
    }
    ctx.stroke();
  }
}

/* ---------------- свиньи и птицы ---------------- */
function pig(p) {
  var x = p.x, y = p.y, r = p.r, i;
  ctx.fillStyle = 'rgba(0,0,0,0.20)';
  ctx.beginPath();
  ctx.ellipse(x, G.GROUND_Y + 3, r * 1.05, r * 0.30, 0, 0, 6.2832);
  ctx.fill();

  var g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.2, x, y, r * 1.15);
  g.addColorStop(0, '#b6e86b');
  g.addColorStop(0.6, '#79bf3c');
  g.addColorStop(1, '#4e8c22');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();

  ctx.fillStyle = '#6db12f';
  ctx.beginPath(); ctx.arc(x - r * 0.72, y - r * 0.62, r * 0.30, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.72, y - r * 0.62, r * 0.30, 0, 6.2832); ctx.fill();

  ctx.fillStyle = '#8ccf4a';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.26, r * 0.52, r * 0.38, 0, 0, 6.2832);
  ctx.fill();
  ctx.fillStyle = '#4a7d1c';
  ctx.beginPath(); ctx.ellipse(x - r * 0.20, y + r * 0.26, r * 0.09, r * 0.13, 0, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + r * 0.20, y + r * 0.26, r * 0.09, r * 0.13, 0, 0, 6.2832); ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x - r * 0.34, y - r * 0.30, r * 0.27, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.34, y - r * 0.30, r * 0.27, 0, 6.2832); ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.arc(x - r * 0.30, y - r * 0.30, r * 0.13, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.38, y - r * 0.30, r * 0.13, 0, 6.2832); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x - r * 0.26, y - r * 0.35, r * 0.05, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.42, y - r * 0.35, r * 0.05, 0, 6.2832); ctx.fill();

  ctx.strokeStyle = '#3b6a15';
  ctx.lineWidth = Math.max(2, r * 0.13);
  ctx.beginPath();
  ctx.moveTo(x - r * 0.60, y - r * 0.62); ctx.lineTo(x - r * 0.12, y - r * 0.46);
  ctx.moveTo(x + r * 0.60, y - r * 0.62); ctx.lineTo(x + r * 0.18, y - r * 0.46);
  ctx.stroke();

  var k = p.hp / Math.max(1, p.max);
  if (k < 0.6) {
    ctx.strokeStyle = 'rgba(60,30,10,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + r * 0.55, y - r * 0.72, r * 0.22, 0.4, 2.4);
    ctx.stroke();
    for (i = 0; i < 3; i++) { ctx.fillStyle = '#fff'; ctx.fillRect(x + r * 0.58 + i * 4, y + r * 0.05, 3, 4); }
  }
}

function bird(b, onSling) {
  var C = BIRD_COLORS[b.type] || BIRD_COLORS.red;
  var x = b.x, y = b.y, r = b.r;

  if (onSling) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(x, G.GROUND_Y + 3, r * 0.95, r * 0.26, 0, 0, 6.2832);
    ctx.fill();
  }

  ctx.fillStyle = C.dark;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.85, y - r * 0.15);
  ctx.lineTo(x - r * 1.75, y - r * 0.75);
  ctx.lineTo(x - r * 1.55, y + r * 0.30);
  ctx.closePath();
  ctx.fill();

  var g = ctx.createRadialGradient(x - r * 0.32, y - r * 0.38, r * 0.18, x, y, r * 1.2);
  g.addColorStop(0, C.belly);
  g.addColorStop(0.42, C.body);
  g.addColorStop(1, C.dark);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();

  ctx.fillStyle = C.dark;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.12, y - r * 0.92);
  ctx.lineTo(x + r * 0.16, y - r * 1.62);
  ctx.lineTo(x + r * 0.42, y - r * 0.80);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x + r * 0.20, y - r * 0.26, r * 0.34, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.68, y - r * 0.26, r * 0.24, 0, 6.2832); ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.arc(x + r * 0.26, y - r * 0.26, r * 0.15, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.68, y - r * 0.26, r * 0.13, 0, 6.2832); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x + r * 0.31, y - r * 0.32, r * 0.06, 0, 6.2832); ctx.fill();

  ctx.fillStyle = '#f7a218';
  ctx.beginPath();
  ctx.moveTo(x + r * 0.88, y - r * 0.16);
  ctx.lineTo(x + r * 1.70, y + r * 0.06);
  ctx.lineTo(x + r * 0.86, y + r * 0.30);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c8800d';
  ctx.beginPath();
  ctx.moveTo(x + r * 0.90, y + r * 0.12);
  ctx.lineTo(x + r * 1.68, y + r * 0.08);
  ctx.lineTo(x + r * 0.88, y + r * 0.30);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#1c1c22';
  ctx.lineWidth = Math.max(2, r * 0.16);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + r * 0.06, y - r * 0.70);
  ctx.lineTo(x + r * 0.62, y - r * 0.44);
  ctx.stroke();

  if (b.type === 'black' && b.fuse) {
    ctx.fillStyle = 'rgba(255,190,60,0.95)';
    ctx.beginPath(); ctx.arc(x + r * 0.16, y - r * 1.62, r * 0.16, 0, 6.2832); ctx.fill();
  }
}

/* ---------------- рогатка ---------------- */
function sling(behind) {
  var sx = G.SLING_X, sy = G.SLING_Y, gy = G.GROUND_Y;
  ctx.save();
  if (behind) {
    var g = ctx.createLinearGradient(sx - 12, gy, sx + 12, gy);
    g.addColorStop(0, '#5a3a1d');
    g.addColorStop(0.45, '#8b5a2b');
    g.addColorStop(1, '#4a2f16');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(sx - 9, sy + 18, 18, gy - sy - 14, 6) : ctx.rect(sx - 9, sy + 18, 18, gy - sy - 14);
    ctx.fill();

    ctx.strokeStyle = '#6b4423';
    ctx.lineWidth = 13;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx, sy + 26); ctx.lineTo(sx - 26, sy - 22);
    ctx.moveTo(sx, sy + 26); ctx.lineTo(sx + 26, sy - 22);
    ctx.stroke();

    var band = ctx.createLinearGradient(0, sy - 20, 0, sy + 20);
    band.addColorStop(0, '#3b2413');
    band.addColorStop(1, '#7a4a24');
    ctx.strokeStyle = band;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(sx - 26, sy - 22);
    ctx.lineTo(sx + 26, sy - 22);
    ctx.stroke();
  } else {
    var a = G.active;
    if (a && a.state === 'ready') {
      var dx2 = a.x - G.SLING_X, dy2 = a.y - G.SLING_Y;
      ctx.strokeStyle = '#5a3a1d';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(sx - 26, sy - 22); ctx.lineTo(a.x - a.r * 0.5, a.y);
      ctx.moveTo(sx + 26, sy - 22); ctx.lineTo(a.x + a.r * 0.5, a.y);
      ctx.stroke();
      if (dx2 < 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.beginPath();
        ctx.ellipse(sx, G.GROUND_Y + 3, 22, 6, 0, 0, 6.2832);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

/* ---------------- вспомогательные эффекты ---------------- */
function aim() {
  var a = G.active;
  if (!a || a.state !== 'ready') return;
  var dx = G.SLING_X - a.x, dy = G.SLING_Y - a.y;
  if (dx * dx + dy * dy < 90) return;
  var power = G.POWER / 42;
  var vx = dx * power, vy = dy * power;
  var ox = a.x, oy = a.y;
  var steps = G.has && G.has('goggles') ? 30 : 18;
  var i;
  for (i = 1; i <= steps; i++) {
    var t = i * 0.075;
    var px = ox + vx * t * 42;
    var py = oy + vy * t * 42 + 0.5 * G.GRAVITY * t * t * 0.62;
    if (py > G.GROUND_Y) break;
    var al = 1 - i / (steps + 4);
    ctx.fillStyle = 'rgba(255,255,255,' + (0.30 + al * 0.7) + ')';
    ctx.beginPath();
    ctx.arc(px, py, 3.4 - i * 0.05, 0, 6.2832);
    ctx.fill();
  }
}

function trail() {
  var f = G.flying;
  if (!f || !f.trace) return;
  var i;
  for (i = 0; i < f.trace.length; i++) {
    var t = f.trace[i];
    ctx.fillStyle = 'rgba(255,255,255,' + (0.10 + (i / f.trace.length) * 0.34) + ')';
    ctx.beginPath();
    ctx.arc(t.x, t.y, 2.6, 0, 6.2832);
    ctx.fill();
  }
}

function parts() {
  var i, p;
  for (i = 0; i < G.parts.length; i++) {
    p = G.parts[i];
    ctx.save();
    ctx.globalAlpha = clamp(p.life * 2, 0, 1);
    ctx.fillStyle = p.color;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.y * 0.05);
    ctx.fillRect(-p.size * 0.5, -p.size * 0.5, p.size, p.size);
    ctx.restore();
  }
}

function pops() {
  var i, p;
  ctx.textAlign = 'center';
  for (i = 0; i < G.pops.length; i++) {
    p = G.pops[i];
    ctx.save();
    ctx.globalAlpha = clamp(p.t, 0, 1);
    ctx.font = '900 26px sans-serif';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.strokeText(p.text, p.x, p.y);
    ctx.fillStyle = p.color || '#ffe066';
    ctx.fillText(p.text, p.x, p.y);
    ctx.restore();
  }
  ctx.textAlign = 'left';
}

/* ---------------- главная отрисовка ---------------- */
function draw() {
  if (!ctx) return;
  var w = window.innerWidth, h = window.innerHeight;
  var i;

  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(shX, shY);

  sky(w, h);
  sun(w, h);
  for (i = 0; i < clouds.length; i++) drawCloud(clouds[i]);
  hillsRow(0.18, '#5f8fb8', '#3d6a90', G.GROUND_Y + 6, 150);
  hillsRow(0.36, '#4e8f5f', '#2f6640', G.GROUND_Y + 4, 0);

  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-camX, 0);

  ground();
  grassRow();
  sling(true);

  for (i = 0; i < G.blocks.length; i++) if (!G.blocks[i].dead) block(G.blocks[i]);
  for (i = 0; i < G.pigs.length; i++) if (!G.pigs[i].dead) pig(G.pigs[i]);
  for (i = 0; i < G.birdsLeft.length; i++) {
    var b = G.birdsLeft[i];
    if (b && b.x !== undefined && b.onGround && !b.launched) bird(b, true);
  }
  if (G.active && G.active.state === 'ready') bird(G.active, true);
  trail();
  if (G.flying) { G.flying.onSling = false; bird(G.flying, false); }
  for (i = 0; i < G.extraFlyers.length; i++) bird(G.extraFlyers[i], false);

  sling(false);
  aim();
  parts();
  pops();

  ctx.restore();
  ctx.restore();
}

return {
  init: init,
  resize: resize,
  draw: draw,
  tick: tick,
  follow: follow,
  setCam: setCam,
  snap: snap,
  toWorld: toWorld,
  shake: shake,
  get scale() { return scale; },
  get camX() { return camX; }
};
})();
