/* ============================================================
   ANGRY BIRDS — отрисовка на canvas
   Экспорт: window.ABR
   ============================================================ */
window.ABR = (function () {
'use strict';
var G = window.ABG;
if (!G) { console.error('ABG не загружен'); return null; }

function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function rnd(a, b) { return a + Math.random() * (b - a); }

var cv = null, ctx = null;
var sc = 1, viewW = 0, camX = 0, camT = 0;
var W = 1, H = 1, time = 0, clouds = [];

function init() {
  cv = document.getElementById('cv');
  if (!cv) { console.error('нет canvas #cv'); return false; }
  ctx = cv.getContext('2d');
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 180); });
  resize();
  return true;
}

function resize() {
  if (!cv) return;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * dpr);
  cv.height = Math.round(H * dpr);
  cv.style.width = W + 'px';
  cv.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  sc = H / G.WORLD_H;
  viewW = W / sc;
  clouds = [];
  var i;
  for (i = 0; i < 11; i++) {
    clouds.push({ x: rnd(-260, G.WORLD_W + 260), y: rnd(24, 300), s: rnd(0.5, 1.6), v: rnd(5, 16) });
  }
}

function px(x) { return Math.round((x - camX) * sc); }
function py(y) { return Math.round(y * sc); }
function toWorld(cx, cy) { return { x: camX + cx / sc, y: cy / sc }; }

function setCam(v) { camT = clamp(v, 0, Math.max(0, G.WORLD_W - viewW)); }
function snap() { camX = camT; }
function follow(x) { camT = clamp(x - viewW * 0.44, 0, Math.max(0, G.WORLD_W - viewW)); }

function tick(dt) {
  time += dt;
  var i, soft = G.has('smooth') ? 3.2 : 5.5;
  for (i = 0; i < clouds.length; i++) {
    clouds[i].x += clouds[i].v * dt;
    if (clouds[i].x > G.WORLD_W + 300) clouds[i].x = -300;
  }
  if (!G.flying) {
    var target = (G.active && G.active.state === 'ready') ? G.active.x - viewW * 0.1 : 0;
    if (G.started && G.state === 'play') setCam(clamp(target, 0, G.WORLD_W));
  }
  camX += (camT - camX) * Math.min(1, dt * soft);
}

/* ---------- фон ---------- */
function sky() {
  var g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#5fc4f2');
  g.addColorStop(0.45, '#9fe0f7');
  g.addColorStop(0.78, '#d8f2c9');
  g.addColorStop(1, '#a7d97f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  /* солнце */
  var sx = px(320) , sy = py(120);
  var sg = ctx.createRadialGradient(sx, sy, 4, sx, sy, 110 * sc);
  sg.addColorStop(0, 'rgba(255,246,190,.95)');
  sg.addColorStop(1, 'rgba(255,246,190,0)');
  ctx.fillStyle = sg;
  ctx.beginPath(); ctx.arc(sx, sy, 110 * sc, 0, 6.2832); ctx.fill();
}

function cloudShape(c) {
  var x = px(c.x), y = py(c.y), s = c.s * 34 * sc;
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.beginPath();
  ctx.arc(x, y, s * 0.62, 0, 6.2832);
  ctx.arc(x + s * 0.6, y + s * 0.12, s * 0.48, 0, 6.2832);
  ctx.arc(x - s * 0.62, y + s * 0.16, s * 0.42, 0, 6.2832);
  ctx.arc(x + s * 0.1, y - s * 0.36, s * 0.44, 0, 6.2832);
  ctx.fill();
}

function hills() {
  var i, x, w;
  for (i = 0; i < 6; i++) {
    x = px(-100 + i * 420);
    w = 320 * sc;
    ctx.fillStyle = i % 2 ? 'rgba(120,190,110,.55)' : 'rgba(96,170,96,.5)';
    ctx.beginPath();
    ctx.moveTo(x - w * 0.5, py(G.GROUND_Y));
    ctx.quadraticCurveTo(x, py(G.GROUND_Y) - 150 * sc, x + w * 0.5, py(G.GROUND_Y));
    ctx.fill();
  }
}

function ground() {
  var gy = py(G.GROUND_Y);
  var g = ctx.createLinearGradient(0, gy, 0, H);
  g.addColorStop(0, '#8bc34a');
  g.addColorStop(0.18, '#6aa832');
  g.addColorStop(1, '#4a2f14');
  ctx.fillStyle = g;
  ctx.fillRect(0, gy, W, H - gy);
  ctx.fillStyle = 'rgba(60,120,40,.55)';
  ctx.fillRect(0, gy, W, 3 * sc);
}

/* ---------- тела ---------- */
function drawBlock(b) {
  var x = px(b.x - b.w / 2), y = py(b.y - b.h / 2);
  var w = b.w * sc, h = b.h * sc;
  var m = G.MAT[b.m] || G.MAT.wood;
  var dmg = 1 - clamp(b.hp / b.max, 0, 1);

  ctx.fillStyle = m.fill;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,255,255,.22)';
  ctx.fillRect(x, y, w, Math.max(2, h * 0.16));
  ctx.strokeStyle = m.edge;
  ctx.lineWidth = Math.max(1, 2 * sc);
  ctx.strokeRect(x, y, w, h);

  if (b.m === 'ice') {
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.fillRect(x + w * 0.18, y + h * 0.2, w * 0.16, h * 0.6);
  }
  if (b.m === 'stone') {
    ctx.fillStyle = 'rgba(0,0,0,.14)';
    ctx.fillRect(x + w * 0.2, y + h * 0.35, w * 0.22, h * 0.3);
  }
  if (dmg > 0.25) {
    ctx.strokeStyle = 'rgba(30,20,10,' + (0.25 + dmg * 0.5) + ')';
    ctx.lineWidth = Math.max(1, 1.6 * sc);
    ctx.beginPath();
    ctx.moveTo(x + w * 0.3, y + h * 0.2);
    ctx.lineTo(x + w * 0.5, y + h * 0.55);
    ctx.lineTo(x + w * 0.36, y + h * 0.85);
    ctx.stroke();
  }
}

function drawPig(p) {
  var x = px(p.x), y = py(p.y), r = p.r * sc;
  var hurt = 1 - clamp(p.hp / p.max, 0, 1);
  ctx.fillStyle = hurt > 0.4 ? '#8fd177' : '#7ed957';
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
  ctx.strokeStyle = '#4e9a35';
  ctx.lineWidth = Math.max(1, 2 * sc);
  ctx.stroke();

  /* уши */
  ctx.fillStyle = '#6ec44b';
  ctx.beginPath(); ctx.arc(x - r * 0.62, y - r * 0.72, r * 0.26, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.62, y - r * 0.72, r * 0.26, 0, 6.2832); ctx.fill();

  /* пятачок */
  ctx.fillStyle = '#63b541';
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.22, r * 0.44, r * 0.34, 0, 0, 6.2832); ctx.fill();
  ctx.fillStyle = '#3f7d29';
  ctx.beginPath(); ctx.arc(x - r * 0.16, y + r * 0.22, r * 0.09, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.16, y + r * 0.22, r * 0.09, 0, 6.2832); ctx.fill();

  /* глаза */
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x - r * 0.34, y - r * 0.24, r * 0.26, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.34, y - r * 0.24, r * 0.26, 0, 6.2832); ctx.fill();
  ctx.fillStyle = '#1b1b1b';
  ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.22, r * 0.12, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.38, y - r * 0.22, r * 0.12, 0, 6.2832); ctx.fill();

  if (hurt > 0.55) {
    ctx.strokeStyle = 'rgba(120,40,20,.6)';
    ctx.beginPath(); ctx.moveTo(x - r * 0.7, y - r * 0.1); ctx.lineTo(x - r * 0.3, y + r * 0.5); ctx.stroke();
  }
}

function birdColors(type) {
  if (type === 'yellow') return { body: '#f5c542', dark: '#c79a17', belly: '#ffe89a' };
  if (type === 'blue') return { body: '#4aa8e8', dark: '#2b7ab5', belly: '#bfe4ff' };
  if (type === 'black') return { body: '#3a3a44', dark: '#1d1d24', belly: '#585864' };
  return { body: '#e8453c', dark: '#b3261f', belly: '#ffd9c9' };
}

function drawBird(b) {
  var x = px(b.x), y = py(b.y), r = b.r * sc;
  var c = birdColors(b.type);
  var ang = (b.state === 'fly') ? Math.atan2(b.vy, b.vx) : 0;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);

  ctx.fillStyle = c.body;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.2832); ctx.fill();
  ctx.strokeStyle = c.dark; ctx.lineWidth = Math.max(1, 2 * sc); ctx.stroke();

  ctx.fillStyle = c.belly;
  ctx.beginPath(); ctx.ellipse(-r * 0.1, r * 0.34, r * 0.6, r * 0.42, 0, 0, 6.2832); ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(r * 0.28, -r * 0.32, r * 0.32, 0, 6.2832); ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.arc(r * 0.36, -r * 0.32, r * 0.14, 0, 6.2832); ctx.fill();

  ctx.fillStyle = '#ffb020';
  ctx.beginPath();
  ctx.moveTo(r * 0.72, -r * 0.02);
  ctx.lineTo(r * 1.34, r * 0.16);
  ctx.lineTo(r * 0.72, r * 0.34);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = c.dark;
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, -r * 0.55);
  ctx.lineTo(-r * 1.15, -r * 0.95);
  ctx.lineTo(-r * 0.72, -r * 0.1);
  ctx.closePath(); ctx.fill();

  ctx.restore();
}

/* ---------- рогатка ---------- */
function sling(front) {
  var bx = px(G.SLING_X), by = py(G.SLING_Y);
  var gy = py(G.GROUND_Y);
  var w = 13 * sc;

  if (front) {
    ctx.fillStyle = '#6b4a2a';
    ctx.fillRect(bx - w, by - 6 * sc, w * 2, gy - by + 6 * sc);
    ctx.fillStyle = '#8a6038';
    ctx.fillRect(bx - w, by - 6 * sc, w * 0.7, gy - by + 6 * sc);
    /* рогатина */
    ctx.strokeStyle = '#5a3d22';
    ctx.lineWidth = 11 * sc;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(bx, by + 6 * sc); ctx.lineTo(bx - 30 * sc, by - 44 * sc); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx, by + 6 * sc); ctx.lineTo(bx + 30 * sc, by - 44 * sc); ctx.stroke();
  }
}

function bands() {
  var a = G.active;
  if (!a || a.state !== 'ready') return;
  var ax = px(a.x), ay = py(a.y);
  var lx = px(G.SLING_X - 30), ly = py(G.SLING_Y - 44);
  var rx = px(G.SLING_X + 30), ry = py(G.SLING_Y - 44);
  ctx.strokeStyle = '#3b2415';
  ctx.lineWidth = 7 * sc;
  ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(ax, ay); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(ax, ay); ctx.stroke();

  /* точка схода */
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.beginPath(); ctx.arc(ax, ay, 3.2 * sc, 0, 6.2832); ctx.fill();
}

function predict() {
  var a = G.active;
  if (!a || a.state !== 'ready') return;
  var dx = G.SLING_X - a.x, dy = G.SLING_Y - a.y;
  var pull = Math.sqrt(dx * dx + dy * dy);
  if (pull < 18) return;
  var k = G.POWER * (G.has('gloves') ? 1.18 : 1.0);
  if (G.has('feather')) k *= 1.06;
  var vx = dx * k, vy = dy * k;
  var x = a.x, y = a.y, t = 0, i;
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  for (i = 0; i < 44; i++) {
    t += 0.028;
    x = a.x + vx * t;
    y = a.y + vy * t + 0.5 * G.GRAVITY * t * t;
    if (y > G.GROUND_Y) break;
    if (i % 2 === 0) {
      ctx.beginPath();
      ctx.arc(px(x), py(y), Math.max(1.4, 2.6 * sc), 0, 6.2832);
      ctx.fill();
    }
  }
}

/* ---------- эффекты ---------- */
function drawParts() {
  var i, p;
  for (i = 0; i < G.parts.length; i++) {
    p = G.parts[i];
    ctx.globalAlpha = clamp(p.life * 1.6, 0, 1);
    ctx.fillStyle = p.col;
    ctx.beginPath(); ctx.arc(px(p.x), py(p.y), p.r * sc, 0, 6.2832); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPops() {
  var i, p;
  ctx.textAlign = 'center';
  for (i = 0; i < G.pops.length; i++) {
    p = G.pops[i];
    ctx.globalAlpha = clamp(p.t, 0, 1);
    ctx.fillStyle = p.col;
    ctx.font = 'bold ' + Math.round(30 * sc) + 'px sans-serif';
    ctx.fillText(p.txt, px(p.x), py(p.y) - (1 - p.t) * 42 * sc);
  }
  ctx.globalAlpha = 1;
}

/* ---------- главная функция ---------- */
function draw() {
  if (!ctx) return;
  ctx.clearRect(0, 0, W, H);
  sky();

  var i;
  for (i = 0; i < clouds.length; i++) cloudShape(clouds[i]);
  hills();
  ground();
  sling(false);

  for (i = 0; i < G.blocks.length; i++) drawBlock(G.blocks[i]);
  for (i = 0; i < G.pigs.length; i++) drawPig(G.pigs[i]);

  for (i = 0; i < G.extraFlyers.length; i++) drawBird(G.extraFlyers[i]);
  if (G.flying) drawBird(G.flying);
  if (G.active) drawBird(G.active);

  drawParts();
  predict();
  sling(true);
  bands();
  drawPops();
}

return {
  init: init,
  resize: resize,
  tick: tick,
  draw: draw,
  setCam: setCam,
  snap: snap,
  follow: follow,
  toWorld: toWorld,
  px: px,
  py: py
};
})();
