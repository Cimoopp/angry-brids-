/* ============================================================
   ANGRY BIRDS — отрисовка на canvas. Экспорт: window.ABR
   ============================================================ */
window.ABR = (function () {
'use strict';
var G = window.ABG;
if (!G) { console.error('ABG не загружен'); return null; }

function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function rnd(a, b) { return a + Math.random() * (b - a); }

var cv = null, ctx = null, sc = 1, viewW = 0, camX = 0, camT = 0, clouds = [];
var W = 0, H = 0;

/* ---------- размеры ---------- */
function init() {
  cv = document.getElementById('cv');
  if (!cv) { console.error('нет canvas #cv'); return false; }
  ctx = cv.getContext('2d');
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 150); });
  resize();
  return true;
}

function resize() {
  if (!cv) return;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  sc = H / G.WORLD_H;
  viewW = W / sc;
  clouds = [];
  for (var i = 0; i < 10; i++) {
    clouds.push({ x: rnd(-300, G.WORLD_W + 300), y: rnd(30, 300), s: rnd(0.5, 1.5), v: rnd(4, 16) });
  }
}

function px(x) { return Math.round((x - camX) * sc); }
function py(y) { return Math.round(y * sc); }
function toWorld(cx, cy) { return { x: cx / sc + camX, y: cy / sc }; }

function follow(x) { camT = clamp(x - viewW * 0.42, 0, Math.max(0, G.WORLD_W - viewW)); }
function setCam(v) { camT = clamp(v, 0, Math.max(0, G.WORLD_W - viewW)); }
function snap() { camX = camT; }

function tick(dt) {
  camX += (camT - camX) * Math.min(1, dt * 4);
  camX = clamp(camX, 0, Math.max(0, G.WORLD_W - viewW));
  for (var i = 0; i < clouds.length; i++) {
    clouds[i].x += clouds[i].v * dt;
    if (clouds[i].x > G.WORLD_W + 320) clouds[i].x = -320;
  }
}

/* ---------- фон ---------- */
function sky() {
  var g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#4fa8e0'); g.addColorStop(0.55, '#a5dbf1'); g.addColorStop(1, '#e2f3f8');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

function cloudsDraw() {
  ctx.fillStyle = 'rgba(255,255,255,.78)';
  for (var i = 0; i < clouds.length; i++) {
    var c = clouds[i];
    var cx = (c.x - camX * 0.4) * sc, cy = py(c.y), r = 30 * c.s * sc;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 6.284);
    ctx.arc(cx + r * 0.9, cy + r * 0.15, r * 0.75, 0, 6.284);
    ctx.arc(cx - r * 0.9, cy + r * 0.2, r * 0.65, 0, 6.284);
    ctx.fill();
  }
}

function ground() {
  var gy = py(G.GROUND_Y);
  ctx.fillStyle = '#7fbf5a';
  ctx.beginPath();
  ctx.moveTo(0, gy);
  for (var i = 0; i < 14; i++) {
    var hx = i * (W / 14);
    ctx.quadraticCurveTo(hx + W / 28, gy - 44 * sc, hx + W / 14, gy - 8 * sc);
  }
  ctx.lineTo(W, gy); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();

  var g = ctx.createLinearGradient(0, gy, 0, H);
  g.addColorStop(0, '#8fce63'); g.addColorStop(0.16, '#6fae3f');
  g.addColorStop(0.18, '#7a5a35'); g.addColorStop(1, '#4a3620');
  ctx.fillStyle = g; ctx.fillRect(0, gy, W, H - gy);
}

/* ---------- объекты ---------- */
function sling(back) {
  var x = px(G.SLING_X), y = py(G.SLING_Y), gy = py(G.GROUND_Y), wd = 14 * sc;
  if (back) {
    ctx.fillStyle = '#7a4b22';
    ctx.fillRect(x - wd / 2, y, wd, gy - y);
    return;
  }
  ctx.fillStyle = '#8a5a2b';
  ctx.fillRect(x - wd * 1.8, y - 14 * sc, wd, 34 * sc);
  ctx.fillRect(x + wd * 0.8, y - 14 * sc, wd, 34 * sc);
  var a = G.active;
  if (a && a.state === 'ready') {
    var dx = a.x - G.SLING_X, dy = a.y - G.SLING_Y;
    if (dx * dx + dy * dy > 9) {
      ctx.strokeStyle = '#3b2412'; ctx.lineWidth = 7 * sc;
      ctx.beginPath();
      ctx.moveTo(x - wd * 1.4, y - 6 * sc);
      ctx.lineTo(px(a.x), py(a.y));
      ctx.lineTo(x + wd * 1.4, y - 6 * sc);
      ctx.stroke();
    }
  }
}

function trail() {
  var a = G.active;
  if (!a || a.state !== 'ready') return;
  var dx = a.x - G.SLING_X, dy = a.y - G.SLING_Y;
  if (dx * dx + dy * dy < 64) return;
  var vx = -dx * G.POWER, vy = -dy * G.POWER;
  var x = a.x, y = a.y;
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  for (var i = 0; i < 30; i++) {
    x += vx * 0.033; y += vy * 0.033; vy += G.GRAVITY * 0.033;
    if (y > G.GROUND_Y || x > G.WORLD_W + 200) break;
    ctx.beginPath();
    ctx.arc(px(x), py(y), Math.max(1.6, (3.6 - i * 0.07) * sc), 0, 6.284);
    ctx.fill();
  }
}

function block(b) {
  if (b.dead) return;
  var m = G.MAT[b.m] || G.MAT.wood;
  var x = px(b.x - b.w / 2), y = py(b.y - b.h / 2);
  var w = Math.max(2, b.w * sc), h = Math.max(2, b.h * sc), i;
  ctx.fillStyle = m.edge; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = m.fill; ctx.fillRect(x + 2 * sc, y + 2 * sc, Math.max(1, w - 4 * sc), Math.max(1, h - 4 * sc));
  if (b.m === 'wood' || b.m === 'sand') {
    ctx.strokeStyle = 'rgba(90,60,20,.4)'; ctx.lineWidth = Math.max(1, 1.6 * sc);
    for (i = 1; i < 3; i++) {
      ctx.beginPath();
      if (b.w > b.h) { ctx.moveTo(x + w * i / 3, y + 3 * sc); ctx.lineTo(x + w * i / 3, y + h - 3 * sc); }
      else { ctx.moveTo(x + 3 * sc, y + h * i / 3); ctx.lineTo(x + w - 3 * sc, y + h * i / 3); }
      ctx.stroke();
    }
  }
  if (b.hp < b.max * 0.65) {
    ctx.strokeStyle = 'rgba(25,12,0,.7)'; ctx.lineWidth = Math.max(1, 2 * sc);
    ctx.beginPath();
    ctx.moveTo(x + w * 0.15, y + h * 0.2);
    ctx.lineTo(x + w * 0.45, y + h * 0.6);
    ctx.lineTo(x + w * 0.3, y + h * 0.9);
    if (b.hp < b.max * 0.35) { ctx.moveTo(x + w * 0.6, y + h * 0.15); ctx.lineTo(x + w * 0.8, y + h * 0.55); }
    ctx.stroke();
  }
}

function pig(p) {
  if (p.dead) return;
  var x = px(p.x), y = py(p.y), r = Math.max(3, p.r * sc);
  ctx.fillStyle = '#8ed14b';
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.284); ctx.fill();
  ctx.strokeStyle = '#5f8f2c'; ctx.lineWidth = Math.max(1, 2 * sc); ctx.stroke();
  ctx.fillStyle = '#a8e063';
  ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.3, r * 0.22, 0, 6.284); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x - r * 0.34, y - r * 0.16, r * 0.21, 0, 6.284); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.34, y - r * 0.16, r * 0.21, 0, 6.284); ctx.fill();
  ctx.fillStyle = '#1b1b1b';
  ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.16, r * 0.1, 0, 6.284); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.3, y - r * 0.16, r * 0.1, 0, 6.284); ctx.fill();
  ctx.fillStyle = '#6fae2f';
  ctx.beginPath(); ctx.arc(x, y + r * 0.3, r * 0.27, 0, 6.284); ctx.fill();
  ctx.fillStyle = '#3f6b16';
  ctx.beginPath(); ctx.arc(x - r * 0.11, y + r * 0.3, r * 0.06, 0, 6.284); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.11, y + r * 0.3, r * 0.06, 0, 6.284); ctx.fill();
}

function bird(b) {
  var x = px(b.x), y = py(b.y), r = Math.max(3, b.r * sc);
  var col = '#e8453c', dark = '#a8261f', belly = '#ffd9d6';
  if (b.type === 'yellow') { col = '#f5c542'; dark = '#c9962a'; belly = '#fff0c2'; }
  else if (b.type === 'blue') { col = '#4aa8e8'; dark = '#2a6fa8'; belly = '#d6ecff'; }
  else if (b.type === 'black') { col = '#3a3a44'; dark = '#20202a'; belly = '#5a5a68'; }
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.284); ctx.fill();
  ctx.strokeStyle = dark; ctx.lineWidth = Math.max(1, 2 * sc); ctx.stroke();
  ctx.fillStyle = belly;
  ctx.beginPath(); ctx.arc(x, y + r * 0.42, r * 0.5, 0, 6.284); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.28, r * 0.29, 0, 6.284); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.3, y - r * 0.28, r * 0.29, 0, 6.284); ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.26, r * 0.12, 0, 6.284); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.25, y - r * 0.26, r * 0.12, 0, 6.284); ctx.fill();
  ctx.strokeStyle = dark; ctx.lineWidth = Math.max(1.5, 3.4 * sc);
  ctx.beginPath();
  ctx.moveTo(x - r * 0.64, y - r * 0.7); ctx.lineTo(x - r * 0.06, y - r * 0.44);
  ctx.moveTo(x + r * 0.64, y - r * 0.7); ctx.lineTo(x + r * 0.06, y - r * 0.44);
  ctx.stroke();
  ctx.fillStyle = '#f2a93b';
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.06);
  ctx.lineTo(x + r * 0.66, y + r * 0.24);
  ctx.lineTo(x, y + r * 0.44);
  ctx.closePath(); ctx.fill();
}

/* ---------- кадр ---------- */
function draw() {
  if (!ctx) return;
  var i;
  sky();
  cloudsDraw();
  ground();
  sling(true);

  for (i = 0; i < G.blocks.length; i++) block(G.blocks[i]);
  for (i = 0; i < G.pigs.length; i++) pig(G.pigs[i]);
  if (G.flying) bird(G.flying);
  for (i = 0; i < G.extraFlyers.length; i++) bird(G.extraFlyers[i]);
  if (G.active && G.active.state === 'ready') { trail(); bird(G.active); }

  sling(false);

  for (i = 0; i < G.parts.length; i++) {
    var p = G.parts[i];
    ctx.fillStyle = p.c;
    ctx.fillRect(px(p.x), py(p.y), Math.max(1, p.s * sc), Math.max(1, p.s * sc));
  }

  ctx.textAlign = 'center';
  for (i = 0; i < G.pops.length; i++) {
    var q = G.pops[i];
    ctx.globalAlpha = clamp(q.t, 0, 1);
    ctx.font = 'bold ' + Math.round(30 * sc) + 'px sans-serif';
    var ty = py(q.y) - (1 - q.t) * 70 * sc, tx = px(q.x);
    ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = Math.max(2, 4 * sc);
    ctx.strokeText(q.txt, tx, ty);
    ctx.fillStyle = '#fff';
    ctx.fillText(q.txt, tx, ty);
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'left';
}

return {
  init: init, resize: resize, draw: draw, tick: tick,
  px: px, py: py, toWorld: toWorld,
  follow: follow, setCam: setCam, snap: snap,
  getScale: function () { return sc; },
  getCamX: function () { return camX; }
};
})();
