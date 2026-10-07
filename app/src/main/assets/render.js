/* ============================================================
   ANGRY BIRDS — отрисовка на canvas
   Экспорт: window.ABR
   ============================================================ */
window.ABR = (function () {
'use strict';
var G = window.ABG;

function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function rnd(a, b) { return a + Math.random() * (b - a); }

var cv = null, ctx = null, scale = 1, viewW = 0, viewH = 0;
var camX = 0, camTarget = 0, clouds = [], t0 = 0;

function init() {
  cv = document.getElementById('cv');
  if (!cv) { console.error('нет canvas #cv'); return false; }
  ctx = cv.getContext('2d');
  if (!ctx) return false;
  resize();
  return true;
}

function resize() {
  if (!cv || !ctx) return;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var w = window.innerWidth, h = window.innerHeight;
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);
  cv.style.width = w + 'px';
  cv.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  scale = h / G.WORLD_H;
  viewW = w / scale;
  viewH = h / scale;
  buildClouds();
}

function buildClouds() {
  clouds = [];
  for (var i = 0; i < 9; i++) {
    clouds.push({ x: rnd(-300, G.WORLD_W + 300), y: rnd(40, 300),
                  s: rnd(0.55, 1.45), v: rnd(4, 16) });
  }
}

function px(x) { return (x - camX) * scale; }
function py(y) { return y * scale; }

function toWorld(cx, cy) {
  return { x: cx / scale + camX, y: cy / scale };
}

function setCam(v) { camTarget = clamp(v, 0, Math.max(0, G.WORLD_W - viewW)); }
function snap() { camX = camTarget; }
function follow(x) { setCam(x - viewW * 0.42); }
function getScale() { return scale; }
function getCamX() { return camX; }
function getViewW() { return viewW; }

/* ---------- фон ---------- */
function sky(w, h) {
  var g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#4fa8dd');
  g.addColorStop(0.5, '#9fd6ef');
  g.addColorStop(1, '#e4f4f8');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawClouds() {
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  for (var i = 0; i < clouds.length; i++) {
    var c = clouds[i];
    var cx = px(c.x) - camX * 0.3 * scale;
    var cy = py(c.y), r = 30 * c.s * scale;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 6.2832);
    ctx.arc(cx + r * 0.9, cy + r * 0.15, r * 0.75, 0, 6.2832);
    ctx.arc(cx - r * 0.95, cy + r * 0.2, r * 0.62, 0, 6.2832);
    ctx.fill();
  }
}

function ground(w, h) {
  var gy = py(G.GROUND_Y), i;
  ctx.fillStyle = '#6fae3f';
  ctx.beginPath();
  ctx.moveTo(0, gy + 2);
  for (i = 0; i <= 10; i++) {
    var hx = i * (w / 10);
    ctx.quadraticCurveTo(hx + w / 20, gy - 34 * scale, hx + w / 10, gy);
  }
  ctx.lineTo(w, gy); ctx.lineTo(w, h); ctx.lineTo(0, h);
  ctx.closePath(); ctx.fill();

  var gg = ctx.createLinearGradient(0, gy, 0, h);
  gg.addColorStop(0, '#8fce63');
  gg.addColorStop(0.16, '#5f9a34');
  gg.addColorStop(0.18, '#7c5c36');
  gg.addColorStop(1, '#412f1b');
  ctx.fillStyle = gg;
  ctx.fillRect(0, gy, w, h - gy);
}

/* ---------- рогатка ---------- */
function slingBack() {
  var x = px(G.SLING_X), y = py(G.SLING_Y), gy = py(G.GROUND_Y);
  var wd = 14 * scale;
  ctx.fillStyle = '#6f4320';
  ctx.fillRect(x - wd / 2, y, wd, gy - y);
  ctx.fillStyle = '#7d4c25';
  ctx.fillRect(x - wd * 1.5, y - 8 * scale, wd, 30 * scale);
}

function slingFront() {
  var x = px(G.SLING_X), y = py(G.SLING_Y);
  var wd = 14 * scale;
  ctx.fillStyle = '#8a5a2b';
  ctx.fillRect(x - wd * 1.75, y - 14 * scale, wd, 34 * scale);
  ctx.fillRect(x + wd * 0.75, y - 14 * scale, wd, 34 * scale);
  if (G.active && G.active.state === 'ready') {
    ctx.strokeStyle = '#3b2412';
    ctx.lineWidth = 7 * scale;
    ctx.beginPath();
    ctx.moveTo(x - wd * 1.3, y - 6 * scale);
    ctx.lineTo(px(G.active.x), py(G.active.y));
    ctx.lineTo(x + wd * 1.3, y - 6 * scale);
    ctx.stroke();
  }
}

function trail() {
  var a = G.active;
  if (!a) return;
  var vx = (G.SLING_X - a.x) * G.POWER, vy = (G.SLING_Y - a.y) * G.POWER;
  var x = a.x, y = a.y, t = 0.033, i;
  for (i = 0; i < 30; i++) {
    x += vx * t; y += vy * t; vy += G.GRAVITY * t;
    if (y > G.GROUND_Y || x > G.WORLD_W) break;
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    ctx.beginPath();
    ctx.arc(px(x), py(y), Math.max(1.4, 3.6 * scale - i * 0.07 * scale), 0, 6.2832);
    ctx.fill();
  }
}

/* ---------- объекты ---------- */
function block(b) {
  var m = G.MAT[b.mat] || G.MAT.wood;
  var x = px(b.x - b.w / 2), y = py(b.y - b.h / 2);
  var w = b.w * scale, h = b.h * scale, i;
  ctx.fillStyle = m.edge;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = m.fill;
  ctx.fillRect(x + 2 * scale, y + 2 * scale, w - 4 * scale, h - 4 * scale);

  if (b.mat === 'wood') {
    ctx.strokeStyle = 'rgba(90,60,20,.4)';
    ctx.lineWidth = 1.6 * scale;
    for (i = 1; i < 3; i++) {
      ctx.beginPath();
      if (b.w > b.h) { ctx.moveTo(x + w * i / 3, y + 3 * scale); ctx.lineTo(x + w * i / 3, y + h - 3 * scale); }
      else { ctx.moveTo(x + 3 * scale, y + h * i / 3); ctx.lineTo(x + w - 3 * scale, y + h * i / 3); }
      ctx.stroke();
    }
  } else if (b.mat === 'ice') {
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.2, y + h * 0.85);
    ctx.lineTo(x + w * 0.5, y + h * 0.3);
    ctx.lineTo(x + w * 0.78, y + h * 0.62);
    ctx.stroke();
  }

  if (b.hp / b.max < 0.7) {
    ctx.strokeStyle = 'rgba(30,15,0,.7)';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.15, y + h * 0.2);
    ctx.lineTo(x + w * 0.45, y + h * 0.6);
    ctx.lineTo(x + w * 0.3, y + h * 0.92);
    ctx.stroke();
  }
}

function pig(p) {
  var x = px(p.x), y = py(p.y), r = p.r * scale;
  ctx.fillStyle = '#8ed14b';
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
  ctx.strokeStyle = '#5f8f2c'; ctx.lineWidth = 2 * scale; ctx.stroke();

  ctx.fillStyle = '#a8e063';
  ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.34, r * 0.32, 0, 6.2832); ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x - r * 0.34, y - r * 0.2, r * 0.21, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.34, y - r * 0.2, r * 0.21, 0, 6.2832); ctx.fill();
  ctx.fillStyle = '#141414';
  ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.2, r * 0.09, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.3, y - r * 0.2, r * 0.09, 0, 6.2832); ctx.fill();

  ctx.fillStyle = '#79bb39';
  ctx.beginPath(); ctx.arc(x, y + r * 0.3, r * 0.28, 0, 6.2832); ctx.fill();
  ctx.fillStyle = '#3f6b16';
  ctx.beginPath(); ctx.arc(x - r * 0.11, y + r * 0.3, r * 0.065, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.11, y + r * 0.3, r * 0.065, 0, 6.2832); ctx.fill();

  if (p.hp < p.max * 0.8) {
    ctx.strokeStyle = 'rgba(190,40,40,.85)';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.62, y - r * 0.72);
    ctx.lineTo(x - r * 0.22, y - r * 0.98);
    ctx.stroke();
  }
}

function bird(b) {
  var x = px(b.x), y = py(b.y), r = b.r * scale;
  var col = '#e8453c', dark = '#a8261f', belly = '#ffdcd9';
  if (b.type === 'yellow') { col = '#f5c542'; dark = '#c9962a'; belly = '#fff2c8'; }
  else if (b.type === 'blue') { col = '#4aa8e8'; dark = '#2a6fa8'; belly = '#d8ecff'; }
  else if (b.type === 'black') { col = '#3a3a44'; dark = '#1e1e26'; belly = '#5c5c6a'; }

  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
  ctx.strokeStyle = dark; ctx.lineWidth = 2 * scale; ctx.stroke();

  ctx.fillStyle = belly;
  ctx.beginPath(); ctx.arc(x, y + r * 0.42, r * 0.52, 0, 6.2832); ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.26, r * 0.29, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.3, y - r * 0.26, r * 0.29, 0, 6.2832); ctx.fill();
  ctx.fillStyle = '#101010';
  ctx.beginPath(); ctx.arc(x - r * 0.26, y - r * 0.24, r * 0.12, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.26, y - r * 0.24, r * 0.12, 0, 6.2832); ctx.fill();

  ctx.strokeStyle = dark;
  ctx.lineWidth = 3.2 * scale;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.64, y - r * 0.66);
  ctx.lineTo(x - r * 0.07, y - r * 0.44);
  ctx.moveTo(x + r * 0.64, y - r * 0.66);
  ctx.lineTo(x + r * 0.07, y - r * 0.44);
  ctx.stroke();

  ctx.fillStyle = '#f2a93b';
  ctx.beginPath();
  ctx.moveTo(x + r * 0.1, y + r * 0.08);
  ctx.lineTo(x + r * 0.72, y + r * 0.24);
  ctx.lineTo(x + r * 0.1, y + r * 0.42);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.95, y - r * 0.62);
  ctx.lineTo(x - r * 0.62, y - r * 0.34);
  ctx.lineTo(x - r * 0.96, y - r * 0.06);
  ctx.closePath(); ctx.fill();
}

/* ---------- кадр ---------- */
function draw() {
  if (!ctx) return;
  var w = window.innerWidth, h = window.innerHeight, i;
  sky(w, h);
  drawClouds();
  ground(w, h);
  slingBack();

  for (i = 0; i < G.blocks.length; i++) if (!G.blocks[i].dead) block(G.blocks[i]);
  for (i = 0; i < G.pigs.length; i++) if (!G.pigs[i].dead) pig(G.pigs[i]);
  if (G.flying) bird(G.flying);
  for (i = 0; i < G.extraFlyers.length; i++) bird(G.extraFlyers[i]);
  if (G.active && G.active.state === 'ready') { trail(); bird(G.active); }

  slingFront();

  for (i = 0; i < G.parts.length; i++) {
    var p = G.parts[i];
    ctx.fillStyle = p.c;
    ctx.globalAlpha = clamp(p.life, 0, 1);
    ctx.fillRect(px(p.x), py(p.y), p.s * scale, p.s * scale);
  }
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  for (i = 0; i < G.pops.length; i++) {
    var q = G.pops[i];
    ctx.globalAlpha = clamp(q.t, 0, 1);
    ctx.font = 'bold ' + Math.round(30 * scale) + 'px sans-serif';
    var ty = py(q.y) - (1 - q.t) * 70 * scale;
    ctx.strokeStyle = 'rgba(0,0,0,.6)';
    ctx.lineWidth = 4 * scale;
    ctx.strokeText(q.txt, px(q.x), ty);
    ctx.fillStyle = '#fff';
    ctx.fillText(q.txt, px(q.x), ty);
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'left';
}

function tick(dt) {
  var i;
  for (i = 0; i < clouds.length; i++) {
    clouds[i].x += clouds[i].v * dt;
    if (clouds[i].x > G.WORLD_W + 320) clouds[i].x = -320;
  }
  camX += (camTarget - camX) * Math.min(1, dt * 4);
  camX = clamp(camX, 0, Math.max(0, G.WORLD_W - viewW));
}

window.addEventListener('resize', function () { resize(); });
window.addEventListener('orientationchange', function () { setTimeout(resize, 250); });

return {
  init: init, resize: resize, draw: draw, tick: tick,
  follow: follow, setCam: setCam, snap: snap,
  px: px, py: py, toWorld: toWorld,
  getScale: getScale, getCamX: getCamX, getViewW: getViewW
};
})();
