/* ============================================================
   ANGRY BIRDS — графика v3 «мультик»
   Мягкие градиенты, скруглённые формы, БЕЗ контуров объектов.
   Экспорт: window.ABR
   ============================================================ */
window.ABR = (function () {
'use strict';
var G = window.ABG;
if (!G) { console.error('ABG не загружен'); return null; }

function $(id) { return document.getElementById(id); }
function rnd(a, b) { return a + Math.random() * (b - a); }
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

/* ---------- безопасные цвета (не дают NaN) ---------- */
var HEX = /^#([0-9a-f]{6})$/i, RGBS = /^rgba?\(/i;
function rgb(c) {
  if (typeof c === 'string') {
    var m = HEX.exec(c.trim());
    if (m) { var n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
    if (RGBS.test(c)) {
      var p = c.match(/(\d{1,3})\D+(\d{1,3})\D+(\d{1,3})/);
      if (p) return [+p[1], +p[2], +p[3]];
    }
  }
  return [150, 150, 150];
}
function shade(c, k) {
  var r = rgb(c);
  return 'rgb(' + clamp(Math.round(r[0] * k), 0, 255) + ',' +
                  clamp(Math.round(r[1] * k), 0, 255) + ',' +
                  clamp(Math.round(r[2] * k), 0, 255) + ')';
}
function rgba(c, a) {
  var r = rgb(c); a = clamp(a, 0, 1);
  return 'rgba(' + r[0] + ',' + r[1] + ',' + r[2] + ',' + a.toFixed(3) + ')';
}
function cs(g, o, c) {
  try { g.addColorStop(clamp(o, 0, 1), c); }
  catch (e) { try { g.addColorStop(clamp(o, 0, 1), '#9aa4b2'); } catch (e2) {} }
}
function lin(x0, y0, x1, y1, stops) {
  var g = ctx.createLinearGradient(x0, y0, x1, y1), i;
  for (i = 0; i < stops.length; i++) cs(g, stops[i][0], stops[i][1]);
  return g;
}
function rad(x, y, rr, stops) {
  var g = ctx.createRadialGradient(x - rr * 0.3, y - rr * 0.4, rr * 0.1, x, y, rr), i;
  for (i = 0; i < stops.length; i++) cs(g, stops[i][0], stops[i][1]);
  return g;
}
/* скруглённый прямоугольник */
function rr(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
/* мягкая тень под объектом */
function blob(x, y, rx, ry, a) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(38,52,36,0.55)';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, 6.2832);
  ctx.fill();
  ctx.restore();
}

/* ---------- состояние камеры ---------- */
var cv = null, ctx = null, scale = 1, viewW = 0;
var camX = 0, camT = 0, T = 0, shX = 0, shY = 0, shA = 0;
var clouds = [], grass = [], hills = [];
var bursts = [];
var lastErr = '';

function init() {
  cv = $('cv');
  if (!cv) return false;
  ctx = cv.getContext('2d');
  if (!ctx) return false;
  ctx.imageSmoothingEnabled = true;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  build();
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 150); });
  return true;
}

function build() {
  clouds = []; grass = []; hills = [];
  var i;
  for (i = 0; i < 11; i++) clouds.push({ x: rnd(-300, G.WORLD_W + 300), y: rnd(40, 250), s: rnd(0.6, 1.6), v: rnd(4, 15) });
  for (i = 0; i < 240; i++) grass.push({ x: rnd(-100, G.WORLD_W + 100), h: rnd(9, 24), p: rnd(0, 6.28), c: rnd(0, 1) });
  for (i = 0; i < 18; i++) hills.push({ x: i * 160 + rnd(-50, 50), r: rnd(80, 190), d: rnd(0.25, 0.5) });
}

function resize() {
  if (!cv) return;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var w = window.innerWidth, h = window.innerHeight;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  cv.style.width = w + 'px'; cv.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  scale = h / G.WORLD_H;
  viewW = w / scale;
  snap();
}

function tick(dt) {
  T += dt;
  var i;
  for (i = 0; i < clouds.length; i++) {
    clouds[i].x += clouds[i].v * dt;
    if (clouds[i].x > G.WORLD_W + 400) clouds[i].x = -400;
  }
  if (shA > 0) { shA = Math.max(0, shA - dt * 2.6); }
  shX = Math.sin(T * 60) * shA * 12;
  shY = Math.cos(T * 47) * shA * 8;
  for (i = bursts.length - 1; i >= 0; i--) {
    bursts[i].t += dt;
    if (bursts[i].t > bursts[i].life) bursts.splice(i, 1);
  }
}

function shake(v) { shA = clamp((v || 12) / 12, 0, 1.6); }
function burst(x, y, color, big) {
  bursts.push({ x: x, y: y, t: 0, life: big ? 0.55 : 0.32, r: big ? 90 : 42, c: color || '#ffd45e' });
}
function follow(x) {
  var want = x - viewW * 0.34;
  camT = clamp(want, 0, Math.max(0, G.WORLD_W - viewW));
}
function setCam(v) { camT = camX = clamp(v || 0, 0, Math.max(0, G.WORLD_W - viewW)); }
function snap() { camX = camT; }
function toWorld(cx, cy) {
  var r = cv && cv.getBoundingClientRect ? cv.getBoundingClientRect() : { left: 0, top: 0 };
  return { x: camX + (cx - r.left) / scale, y: (cy - r.top) / scale };
}

/* ---------- фон ---------- */
function sky() {
  var h = G.WORLD_H;
  ctx.fillStyle = lin(0, 0, 0, G.GROUND_Y, [
    [0.00, '#2f8fe0'],
    [0.45, '#79c4f2'],
    [0.78, '#bfe6f7'],
    [1.00, '#ffe8bd']
  ]);
  ctx.fillRect(0, 0, viewW + 2, G.GROUND_Y + 2);
}
function sun() {
  var sx = G.WORLD_W - 420, sy = 150;
  var g = ctx.createRadialGradient(sx, sy, 8, sx, sy, 240);
  cs(g, 0.00, 'rgba(255,248,214,0.95)');
  cs(g, 0.16, 'rgba(255,241,190,0.60)');
  cs(g, 0.45, 'rgba(255,236,170,0.18)');
  cs(g, 1.00, 'rgba(255,236,170,0.00)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(sx, sy, 240, 0, 6.2832); ctx.fill();
  ctx.fillStyle = rad(sx, sy, 44, [[0, '#fffdf2'], [0.7, '#fff3c4'], [1, '#ffe08a']]);
  ctx.beginPath(); ctx.arc(sx, sy, 44, 0, 6.2832); ctx.fill();
}
function cloud(c) {
  var s = c.s, y = c.y, x = c.x;
  ctx.save();
  ctx.globalAlpha = 0.94;
  ctx.fillStyle = rad(x, y, 70 * s, [[0, '#ffffff'], [0.6, '#f6fbff'], [1, '#dcecfa']]);
  ctx.beginPath();
  ctx.arc(x, y, 34 * s, 0, 6.2832);
  ctx.arc(x + 32 * s, y + 6 * s, 26 * s, 0, 6.2832);
  ctx.arc(x - 34 * s, y + 8 * s, 24 * s, 0, 6.2832);
  ctx.arc(x + 8 * s, y - 20 * s, 26 * s, 0, 6.2832);
  ctx.fill();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#c9e2f6';
  ctx.beginPath();
  ctx.ellipse(x, y + 26 * s, 52 * s, 10 * s, 0, 0, 6.2832);
  ctx.fill();
  ctx.restore();
}
function hillLayer(par, k, col) {
  var off = camX * par, i, y = G.GROUND_Y + 6;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(-200, y + 40);
  for (i = 0; i < hills.length; i++) {
    var hx = hills[i].x - off, hr = hills[i].r * k;
    ctx.quadraticCurveTo(hx, y - hr, hx + 160, y + 4);
  }
  ctx.lineTo(G.WORLD_W + 600, y + 60);
  ctx.lineTo(-200, y + 60);
  ctx.closePath();
  ctx.fill();
}
function ground() {
  var y = G.GROUND_Y;
  ctx.fillStyle = lin(0, y, 0, G.WORLD_H, [
    [0.00, '#7cc94b'],
    [0.10, '#63b23a'],
    [0.30, '#6b4a25'],
    [1.00, '#54381c']
  ]);
  ctx.fillRect(-200, y, viewW + 500, G.WORLD_H - y + 20);
  /* полоса травы */
  ctx.fillStyle = lin(0, y - 6, 0, y + 14, [[0, '#9aelz7' .length ? '#9ad95c' : '#9ad95c'], [1, '#4e9130']]);
  ctx.beginPath();
  ctx.moveTo(-200, y + 6);
  for (var x = -200; x < G.WORLD_W + 500; x += 40) ctx.quadraticCurveTo(x + 20, y - 8, x + 40, y + 4);
  ctx.lineTo(G.WORLD_W + 500, y + 16);
  ctx.lineTo(-200, y + 16);
  ctx.closePath();
  ctx.fill();
}
function grassBlades() {
  var y = G.GROUND_Y + 2, i;
  for (i = 0; i < grass.length; i++) {
    var g = grass[i], x = g.x;
    if (x < camX - 60 || x > camX + viewW + 60) continue;
    var sway = Math.sin(T * 2.2 + g.p) * 3.2;
    ctx.strokeStyle = g.c > 0.5 ? 'rgba(150,220,90,0.95)' : 'rgba(104,180,60,0.95)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y + 6);
    ctx.quadraticCurveTo(x + sway * 0.5, y - g.h * 0.6, x + sway, y - g.h);
    ctx.stroke();
  }
}

/* ---------- рогатка ---------- */
function slingBack() {
  var x = G.SLING_X, y = G.SLING_Y;
  ctx.save();
  ctx.strokeStyle = lin(x, y - 120, x, y + 60, [[0, '#a86a34'], [1, '#6f4320']]);
  ctx.lineWidth = 18;
  ctx.beginPath(); ctx.moveTo(x, y + 150); ctx.lineTo(x, y - 40); ctx.stroke();
  ctx.lineWidth = 15;
  ctx.beginPath(); ctx.moveTo(x, y - 30); ctx.quadraticCurveTo(x - 22, y - 90, x - 26, y - 118); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y - 30); ctx.quadraticCurveTo(x + 22, y - 90, x + 26, y - 118); ctx.stroke();
  ctx.restore();
}
function slingBands(bx, by) {
  var x = G.SLING_X, y = G.SLING_Y;
  ctx.save();
  ctx.strokeStyle = '#4a2c17';
  ctx.lineWidth = 9;
  ctx.beginPath(); ctx.moveTo(x - 26, y - 112); ctx.lineTo(bx, by); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 26, y - 112); ctx.lineTo(bx, by); ctx.stroke();
  ctx.restore();
}

/* ---------- блоки ---------- */
function blockTex(b) {
  var m = b.mat || 'wood';
  if (m === 'wood')  return { a: '#d59a4d', b: '#a86a28' };
  if (m === 'ice')   return { a: '#cdefff', b: '#7fc4e6' };
  if (m === 'stone') return { a: '#cfcfd6', b: '#8b8b96' };
  return { a: '#e8d69a', b: '#bda765' };
}
function drawBlock(b) {
  var t = blockTex(b), w = b.w, h = b.h, x = b.x - w / 2, y = b.y - h / 2;
  var ratio = clamp(b.hp / Math.max(1, b.maxHp), 0, 1);
  if (b.onGround !== false) blob(b.x, b.y + h / 2 + 4, w * 0.52, 6, 0.32);
  ctx.fillStyle = lin(x, y, x + w * 0.4, y + h, [
    [0, shade(t.a, 1.12)], [0.5, t.a], [1, t.b]
  ]);
  rr(x, y, w, h, Math.min(10, Math.min(w, h) * 0.28));
  ctx.fill();
  /* верхний блик без контура */
  ctx.save();
  ctx.globalAlpha = b.mat === 'ice' ? 0.75 : 0.4;
  ctx.fillStyle = lin(x, y, x, y + h * 0.5, [[0, '#ffffff'], [1, rgba('#ffffff', 0)]]);
  rr(x + w * 0.08, y + h * 0.07, w * 0.84, h * 0.34, Math.min(8, h * 0.2));
  ctx.fill();
  ctx.restore();
  /* слои/прожилки/крапины */
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = shade(t.b, 0.72);
  ctx.lineWidth = 2;
  if (b.mat === 'wood') {
    for (var i = 1; i < 3; i++) {
      var yy = y + h * i / 3;
      ctx.beginPath(); ctx.moveTo(x + 4, yy); ctx.quadraticCurveTo(x + w / 2, yy - 5, x + w - 4, yy + 3); ctx.stroke();
    }
  } else if (b.mat === 'ice') {
    ctx.beginPath(); ctx.moveTo(x + w * 0.2, y + h * 0.9); ctx.lineTo(x + w * 0.55, y + h * 0.1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w * 0.5, y + h * 0.95); ctx.lineTo(x + w * 0.85, y + h * 0.2); ctx.stroke();
  } else {
    for (var j = 0; j < 7; j++) {
      ctx.beginPath();
      ctx.arc(x + rnd(6, w - 6), y + rnd(6, h - 6), rnd(1.5, 3.4), 0, 6.2832);
      ctx.fillStyle = shade(t.b, 0.65);
      ctx.fill();
    }
  }
  ctx.restore();
  /* трещины по урону */
  if (ratio < 0.7) {
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = shade(t.b, 0.55);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.3, y + h * 0.1); ctx.lineTo(x + w * 0.45, y + h * 0.5); ctx.lineTo(x + w * 0.32, y + h * 0.92);
    ctx.stroke();
    if (ratio < 0.35) {
      ctx.beginPath();
      ctx.moveTo(x + w * 0.8, y + h * 0.15); ctx.lineTo(x + w * 0.62, y + h * 0.55); ctx.lineTo(x + w * 0.78, y + h * 0.88);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/* ---------- свинья ---------- */
function drawPig(p) {
  var r = p.r || 26, ratio = clamp(p.hp / Math.max(1, p.maxHp), 0, 1);
  var hurt = 1 - ratio;
  blob(p.x, p.y + r + 4, r * 1.05, r * 0.34, 0.3);
  /* тело */
  ctx.fillStyle = rad(p.x - r * 0.2, p.y - r * 0.3, r * 1.25, [
    [0, '#c8f08a'], [0.55, '#8fd04a'], [1, shade('#6fae33', 0.86 - hurt * 0.15)]
  ]);
  ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.2832); ctx.fill();
  /* уши */
  ctx.fillStyle = shade('#7cbb3c', 0.94);
  ctx.beginPath(); ctx.ellipse(p.x - r * 0.62, p.y - r * 0.72, r * 0.26, r * 0.2, -0.5, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.ellipse(p.x + r * 0.62, p.y - r * 0.72, r * 0.26, r * 0.2, 0.5, 0, 6.2832); ctx.fill();
  /* пятачок */
  ctx.fillStyle = rad(p.x, p.y + r * 0.18, r * 0.52, [[0, '#b6e878'], [1, '#7fbf44']]);
  ctx.beginPath(); ctx.ellipse(p.x, p.y + r * 0.22, r * 0.42, r * 0.33, 0, 0, 6.2832); ctx.fill();
  ctx.fillStyle = 'rgba(70,110,40,0.6)';
  ctx.beginPath(); ctx.ellipse(p.x - r * 0.14, p.y + r * 0.22, r * 0.07, r * 0.1, 0, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.ellipse(p.x + r * 0.14, p.y + r * 0.22, r * 0.07, r * 0.1, 0, 0, 6.2832); ctx.fill();
  /* глаза */
  var ex = r * 0.34, ey = -r * 0.3;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(p.x - ex, p.y + ey, r * 0.2, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.arc(p.x + ex, p.y + ey, r * 0.2, 0, 6.2832); ctx.fill();
  ctx.fillStyle = '#26303a';
  ctx.beginPath(); ctx.arc(p.x - ex + r * 0.04, p.y + ey + r * 0.03, r * 0.1, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.arc(p.x + ex + r * 0.04, p.y + ey + r * 0.03, r * 0.1, 0, 6.2832); ctx.fill();
  /* брови */
  ctx.strokeStyle = 'rgba(60,90,35,0.85)';
  ctx.lineWidth = Math.max(2, r * 0.11);
  ctx.beginPath(); ctx.moveTo(p.x - ex - r * 0.2, p.y + ey - r * 0.22); ctx.lineTo(p.x - ex + r * 0.16, p.y + ey - r * 0.12); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(p.x + ex + r * 0.2, p.y + ey - r * 0.22); ctx.lineTo(p.x + ex - r * 0.16, p.y + ey - r * 0.12); ctx.stroke();
  /* зубы при уроне */
  if (hurt > 0.35) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(p.x - r * 0.2, p.y + r * 0.5); ctx.lineTo(p.x - r * 0.05, p.y + r * 0.68); ctx.lineTo(p.x + r * 0.1, p.y + r * 0.5); ctx.fill();
  }
}

/* ---------- птицы ---------- */
var BCOL = {
  red:    ['#ff8472', '#e23b2c'],
  yellow: ['#ffe07a', '#e9a91b'],
  blue:   ['#8fdcff', '#2d8fe0'],
  black:  ['#6a6f7d', '#23262e']
};
function drawBird(b, onSling) {
  var type = b.type || 'red';
  var r = b.r || 22, c = BCOL[type] || BCOL.red;
  var ang = 0;
  if (b.vx !== undefined && b.vy !== undefined && (b.vx || b.vy)) ang = Math.atan2(b.vy, b.vx);
  if (onSling) ang = 0;
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(clamp(ang, -1.2, 1.2));
  if (!onSling) blob(0, r + 6, r * 0.95, r * 0.3, 0.22);
  /* хвост */
  ctx.fillStyle = shade(c[1], 0.92);
  ctx.beginPath();
  ctx.moveTo(-r * 0.75, -r * 0.25);
  ctx.lineTo(-r * 1.5, -r * 0.55);
  ctx.lineTo(-r * 1.45, r * 0.32);
  ctx.closePath(); ctx.fill();
  /* тело */
  ctx.fillStyle = rad(-r * 0.25, -r * 0.35, r * 1.35, [
    [0, shade(c[0], 1.08)], [0.5, c[0]], [1, c[1]]
  ]);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.2832); ctx.fill();
  /* живот */
  ctx.fillStyle = 'rgba(255,248,226,0.9)';
  ctx.beginPath(); ctx.ellipse(r * 0.06, r * 0.4, r * 0.52, r * 0.38, 0, 0, 6.2832); ctx.fill();
  /* клюв */
  ctx.fillStyle = lin(r * 0.5, -r * 0.1, r * 1.2, r * 0.4, [[0, '#ffd257'], [1, '#e58b16']]);
  ctx.beginPath();
  ctx.moveTo(r * 0.58, -r * 0.12);
  ctx.lineTo(r * 1.24, r * 0.1);
  ctx.lineTo(r * 0.6, r * 0.36);
  ctx.closePath(); ctx.fill();
  /* глаз */
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(r * 0.3, -r * 0.32, r * 0.28, 0, 6.2832); ctx.fill();
  ctx.fillStyle = '#23303a';
  ctx.beginPath(); ctx.arc(r * 0.36, -r * 0.31, r * 0.13, 0, 6.2832); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath(); ctx.arc(r * 0.4, -r * 0.37, r * 0.05, 0, 6.2832); ctx.fill();
  /* бровь */
  ctx.strokeStyle = shade(c[1], 0.7);
  ctx.lineWidth = Math.max(2, r * 0.13);
  ctx.beginPath();
  ctx.moveTo(r * 0.08, -r * 0.68);
  ctx.lineTo(r * 0.62, -r * 0.52);
  ctx.stroke();
  /* хохолок */
  ctx.fillStyle = shade(c[1], 0.85);
  ctx.beginPath(); ctx.ellipse(-r * 0.1, -r * 0.98, r * 0.16, r * 0.34, -0.25, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.ellipse(r * 0.2, -r * 1.0, r * 0.13, r * 0.28, 0.2, 0, 6.2832); ctx.fill();
  /* фитиль у чёрной */
  if (type === 'black') {
    ctx.strokeStyle = '#8a6a4a';
    ctx.lineWidth = Math.max(2, r * 0.12);
    ctx.beginPath(); ctx.moveTo(0, -r * 1.05); ctx.lineTo(0, -r * 1.5); ctx.stroke();
    var f = 0.75 + Math.sin(T * 22) * 0.25;
    ctx.fillStyle = rad(0, -r * 1.62, r * 0.42 * f, [[0, '#fff6c0'], [0.5, '#ffb02e'], [1, 'rgba(255,90,0,0)']]);
    ctx.beginPath(); ctx.arc(0, -r * 1.62, r * 0.42 * f, 0, 6.2832); ctx.fill();
  }
  ctx.restore();
}

/* ---------- прицел, след, частицы ---------- */
function aim() {
  var a = G.active;
  if (!a || a.state !== 'ready' || !G.dragging) return;
  var vx = (G.SLING_X - a.x) * G.POWER * 0.02;
  var vy = (G.SLING_Y - a.y) * G.POWER * 0.02;
  var x = a.x, y = a.y, dt = 0.055, long = G.has && G.has('goggles');
  var n = long ? 34 : 20, i;
  for (i = 0; i < n; i++) {
    vy += G.GRAVITY * dt * dt;
    x += vx * dt * 60; y += vy * dt * 60;
    if (y > G.GROUND_Y) break;
    var al = (1 - i / n) * 0.75;
    ctx.fillStyle = 'rgba(255,255,255,' + al.toFixed(2) + ')';
    ctx.beginPath(); ctx.arc(x, y, long ? 5 : 4, 0, 6.2832); ctx.fill();
  }
}
function trail(t) {
  if (!t || t.length < 2) return;
  ctx.save();
  for (var i = 1; i < t.length; i++) {
    var al = (i / t.length) * 0.5;
    ctx.fillStyle = 'rgba(255,255,255,' + al.toFixed(2) + ')';
    ctx.beginPath(); ctx.arc(t[i].x, t[i].y, 4, 0, 6.2832); ctx.fill();
  }
  ctx.restore();
}
function parts(list) {
  var i, p;
  for (i = 0; i < list.length; i++) {
    p = list[i];
    var al = clamp(p.life / Math.max(0.01, p.maxLife), 0, 1);
    ctx.fillStyle = rgba(p.color || '#c98b3d', al);
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size || 4, 0, 6.2832); ctx.fill();
  }
}
function pops(list) {
  var i;
  for (i = 0; i < list.length; i++) {
    var p = list[i];
    if (!p.text) continue;
    var al = clamp(1 - p.t / Math.max(0.01, p.life || 1), 0, 1);
    ctx.save();
    ctx.globalAlpha = al;
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = p.color || '#ffe98a';
    ctx.fillText(p.text, p.x, p.y - p.t * 45);
    ctx.restore();
  }
}
function drawBursts() {
  var i;
  for (i = 0; i < bursts.length; i++) {
    var b = bursts[i], k = b.t / b.life, r = b.r * (0.35 + k * 0.9);
    ctx.save();
    ctx.globalAlpha = clamp(1 - k, 0, 1);
    ctx.strokeStyle = b.c;
    ctx.lineWidth = 6 * (1 - k) + 2;
    ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, 6.2832); ctx.stroke();
    ctx.fillStyle = rgba(b.c, 0.35 * (1 - k));
    ctx.beginPath(); ctx.arc(b.x, b.y, r * 0.7, 0, 6.2832); ctx.fill();
    ctx.restore();
  }
}

/* ---------- кадр ---------- */
function draw() {
  if (!ctx) return;
  camX += (camT - camX) * 0.12;
  try {
    ctx.clearRect(0, 0, viewW + 4, G.WORLD_H);
    ctx.save();
    ctx.translate(shX, shY);
    ctx.save();
    ctx.translate(-camX, 0);
    sky(); sun();
    var i;
    for (i = 0; i < clouds.length; i++) cloud(clouds[i]);
    hillLayer(0.22, 0.72, '#8fc46a');
    hillLayer(0.45, 0.95, '#6fae4a');
    ground(); grassBlades();
    ctx.restore();

    ctx.save();
    ctx.translate(-camX, 0);
    slingBack();
    var waiting = G.birdsLeft || [];
    for (i = 0; i < waiting.length; i++) {
      var wb = waiting[i];
      if (!wb) continue;
      drawBird({ type: wb.type || 'red', r: (wb.r || 20) * 0.85, x: G.SLING_X - 96 - i * 44, y: G.GROUND_Y - 14, vx: 0, vy: 0 }, true);
    }
    var blocks = G.blocks || [];
    for (i = 0; i < blocks.length; i++) if (!blocks[i].dead) drawBlock(blocks[i]);
    var pigs = G.pigs || [];
    for (i = 0; i < pigs.length; i++) if (!pigs[i].dead) drawPig(pigs[i]);
    if (G.active && G.active.state === 'ready') {
      slingBands(G.active.x, G.active.y);
      drawBird(G.active, true);
    }
    trail(G.trail);
    parts(G.parts || []);
    var fly = (G.flying ? [G.flying] : []).concat(G.extraFlyers || []);
    for (i = 0; i < fly.length; i++) if (fly[i] && !fly[i].dead) drawBird(fly[i], false);
    pops(G.pops || []);
    aim();
    drawBursts();
    ctx.restore();
    ctx.restore();
  } catch (e) {
    if (lastErr !== String(e.message)) {
      lastErr = String(e.message);
      window.__errs = window.__errs || [];
      window.__errs.push({ m: 'render: ' + e.message, s: 'render.js', l: 0 });
      if (window.__showErr) window.__showErr('render: ' + e.message);
    }
  }
}

return {
  init: init, resize: resize, draw: draw, tick: tick,
  follow: follow, setCam: setCam, snap: snap, toWorld: toWorld,
  shake: shake, burst: burst
};
})();
