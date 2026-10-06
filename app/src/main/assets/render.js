/* ANGRY BIRDS — слой отрисовки. Зависит от window.ABG, экспорт window.ABR */
(function () {
'use strict';
var G = window.ABG;
if (!G) { console.error('ABG не загружен'); return; }
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function rnd(a, b) { return a + Math.random() * (b - a); }

var cv = null, ctx = null, scale = 1, viewW = 0, camX = 0, camTarget = 0, clouds = [];

function resize() {
  if (!cv) return;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var w = window.innerWidth, h = window.innerHeight, i;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  cv.style.width = w + 'px'; cv.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  scale = h / G.WORLD_H; viewW = w / scale;
  if (!clouds.length) {
    for (i = 0; i < 9; i++) {
      clouds.push({ x: rnd(-200, G.WORLD_W + 200), y: rnd(40, 300), s: rnd(0.5, 1.4), v: rnd(4, 14) });
    }
  }
}
function px(x) { return (x - camX) * scale; }
function py(y) { return y * scale; }

function drawClouds() {
  ctx.fillStyle = 'rgba(255,255,255,.72)';
  for (var i = 0; i < clouds.length; i++) {
    var c = clouds[i], r = 26 * c.s * scale;
    var cx = px(c.x) - camX * 0.35 * scale, cy = py(c.y);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 6.284);
    ctx.arc(cx + r * 0.9, cy + r * 0.15, r * 0.75, 0, 6.284);
    ctx.arc(cx - r * 0.9, cy + r * 0.2, r * 0.65, 0, 6.284);
    ctx.fill();
  }
}

function drawGround(w, h) {
  var gy = py(G.GROUND_Y), i;
  ctx.fillStyle = '#7fbf5a';
  ctx.beginPath();
  ctx.moveTo(0, gy);
  for (i = 0; i <= 12; i++) {
    var hx = i * (w / 12), hxx = hx + w / 12;
    var hy = gy - 40 * scale * (0.4 + 0.6 * Math.abs(Math.sin(i * 1.3)));
    ctx.quadraticCurveTo(hx + w / 24, hy, hxx, gy - 10 * scale);
  }
  ctx.lineTo(w, gy); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();

  var gg = ctx.createLinearGradient(0, gy, 0, h);
  gg.addColorStop(0, '#8fce63'); gg.addColorStop(0.18, '#6fae3f');
  gg.addColorStop(0.2, '#7a5a35'); gg.addColorStop(1, '#4d3820');
  ctx.fillStyle = gg; ctx.fillRect(0, gy, w, h - gy);
}

function drawSling(back) {
  var x = px(G.SLING_X), y = py(G.SLING_Y), gy = py(G.GROUND_Y), wd = 13 * scale;
  if (back) {
    ctx.fillStyle = '#7a4b22';
    ctx.fillRect(x - wd / 2, y, wd, gy - y);
    ctx.fillRect(x - wd * 1.6, y - 6 * scale, wd, 26 * scale);
    return;
  }
  ctx.fillStyle = '#8a5a2b';
  ctx.fillRect(x - wd * 1.7, y - 12 * scale, wd, 30 * scale);
  ctx.fillRect(x + wd * 0.7, y - 12 * scale, wd, 30 * scale);
  if (G.active && G.active.state === 'ready') {
    ctx.strokeStyle = '#3b2412'; ctx.lineWidth = 6 * scale;
    ctx.beginPath();
    ctx.moveTo(x - wd * 1.3, y - 4 * scale);
    ctx.lineTo(px(G.active.x), py(G.active.y));
    ctx.lineTo(x + wd * 1.3, y - 4 * scale);
    ctx.stroke();
  }
}

function drawTrail() {
  var a = G.active; if (!a) return;
  var vx = (G.SLING_X - a.x) * G.POWER, vy = (G.SLING_Y - a.y) * G.POWER;
  var x = a.x, y = a.y, t = 0.033;
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  for (var i = 0; i < 26; i++) {
    x += vx * t; y += vy * t; vy += G.GRAVITY * t;
    if (y > G.GROUND_Y || x > G.WORLD_W) break;
    ctx.beginPath();
    ctx.arc(px(x), py(y), Math.max(1.5, (3.4 - i * 0.06) * scale), 0, 6.284);
    ctx.fill();
  }
}

function drawBlock(b) {
  if (b.dead) return;
  var m = G.MAT[b.m], i;
  var x = px(b.x - b.w / 2), y = py(b.y - b.h / 2), w = b.w * scale, h = b.h * scale;
  ctx.fillStyle = m.edge; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = m.fill; ctx.fillRect(x + 2 * scale, y + 2 * scale, w - 4 * scale, h - 4 * scale);
  if (b.m === 'wood') {
    ctx.strokeStyle = 'rgba(90,60,20,.45)'; ctx.lineWidth = 1.6 * scale;
    for (i = 1; i < 3; i++) {
      ctx.beginPath();
      if (b.w > b.h) { ctx.moveTo(x + w * i / 3, y + 3 * scale); ctx.lineTo(x + w * i / 3, y + h - 3 * scale); }
      else { ctx.moveTo(x + 3 * scale, y + h * i / 3); ctx.lineTo(x + w - 3 * scale, y + h * i / 3); }
      ctx.stroke();
    }
  } else if (b.m === 'ice') {
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.2, y + h * 0.85);
    ctx.lineTo(x + w * 0.5, y + h * 0.3);
    ctx.lineTo(x + w * 0.75, y + h * 0.6);
    ctx.stroke();
  }
  if (b.hp / b.max < 0.65) {
    ctx.strokeStyle = 'rgba(20,10,0,.7)'; ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.15, y + h * 0.2);
    ctx.lineTo(x + w * 0.45, y + h * 0.6);
    ctx.lineTo(x + w * 0.3, y + h * 0.9);
    if (b.hp / b.max < 0.35) { ctx.moveTo(x + w * 0.6, y + h * 0.15); ctx.lineTo(x + w * 0.8, y + h * 0.55); }
    ctx.stroke();
  }
}

function drawPig(p) {
  if (p.dead) return;
  var x = px(p.x), y = py(p.y), r = p.r * scale;
  ctx.fillStyle = '#8ed14b'; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.284); ctx.fill();
  ctx.strokeStyle = '#5f8f2c'; ctx.lineWidth = 2 * scale; ctx.stroke();
  ctx.fillStyle = '#a8e063'; ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.3, r * 0.22, 0, 6.284); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x - r * 0.34, y - r * 0.18, r * 0.2, 0, 6.284); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.34, y - r * 0.18, r * 0.2, 0, 6.284); ctx.fill();
  ctx.fillStyle = '#1b1b1b';
  ctx.beginPath(); ctx.arc(x - r * 0.31, y - r * 0.18, r * 0.09, 0, 6.284); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.31, y - r * 0.18, r * 0.09, 0, 6.284); ctx.fill();
  ctx.fillStyle = '#6fae2f'; ctx.beginPath(); ctx.arc(x, y + r * 0.28, r * 0.26, 0, 6.284); ctx.fill();
  ctx.fillStyle = '#3f6b16';
  ctx.beginPath(); ctx.arc(x - r * 0.11, y + r * 0.28, r * 0.06, 0, 6.284); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.11, y + r * 0.28, r * 0.06, 0, 6.284); ctx.fill();
  if (p.hp < p.max * 0.85) {
    ctx.strokeStyle = 'rgba(180,40,40,.8)'; ctx.lineWidth = 2 * scale;
    ctx.beginPath(); ctx.moveTo(x - r * 0.6, y - r * 0.7); ctx.lineTo(x - r * 0.2, y - r * 0.95); ctx.stroke();
  }
}

function drawBird(b) {
  var x = px(b.x), y = py(b.y), r = b.r * scale;
  var col = '#e8453c', dark = '#a8261f', belly = '#ffd9d6';
  if (b.type === 'yellow') { col = '#f5c542'; dark = '#c9962a'; belly = '#fff0c2'; }
  else if (b.type === 'blue') { col = '#4aa8e8'; dark = '#2a6fa8'; belly = '#d6ecff'; }
  else if (b.type === 'black') { col = '#3a3a44'; dark = '#20202a'; belly = '#5a5a68'; }
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.284); ctx.fill();
  ctx.strokeStyle = dark; ctx.lineWidth = 2 * scale; ctx.stroke();
  ctx.fillStyle = belly; ctx.beginPath(); ctx.arc(x, y + r * 0.4, r * 0.5, 0, 6.284); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.28, r * 0.28, 0, 6.284); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.3, y - r * 0.28, r * 0.28, 0, 6.284); ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.arc(x - r * 0.26, y - r * 0.26, r * 0.12, 0, 6.284); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.26, y - r * 0.26, r * 0.12, 0, 6.284); ctx.fill();
  ctx.strokeStyle = dark; ctx.lineWidth = 3.2 * scale;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.62, y - r * 0.68); ctx.lineTo(x - r * 0.06, y - r * 0.42);
  ctx.moveTo(x + r * 0.62, y - r * 0.68); ctx.lineTo(x + r * 0.06, y - r * 0.42);
  ctx.stroke();
  ctx.fillStyle = '#f2a93b';
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.05); ctx.lineTo(x + r * 0.62, y + r * 0.22); ctx.lineTo(x, y + r * 0.42);
  ctx.closePath(); ctx.fill();
}

function draw() {
  if (!ctx) return;
  var w = window.innerWidth, h = window.innerHeight, i, p;
  var g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#5fb6e8'); g.addColorStop(0.55, '#a8dcf0'); g.addColorStop(1, '#dff2f7');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

  drawClouds();
  drawGround(w, h);
  drawSling(true);
  for (i = 0; i < G.blocks.length; i++) drawBlock(G.blocks[i]);
  for (i = 0; i < G.pigs.length; i++) drawPig(G.pigs[i]);
  if (G.flying) drawBird(G.flying);
  for (i = 0; i < G.extraFlyers.length; i++) drawBird(G.extraFlyers[i]);
  if (G.active && G.active.state === 'ready') drawBird(G.active);
  drawSling(false);
  if (G.dragging && G.active && G.active.state === 'ready') drawTrail();

  for (i = 0; i < G.parts.length; i++) {
    p = G.parts[i];
    ctx.fillStyle = p.c;
    ctx.fillRect(px(p.x), py(p.y), p.s * scale, p.s * scale);
  }
  ctx.textAlign = 'center';
  for (i = 0; i < G.pops.length; i++) {
    p = G.pops[i];
    ctx.globalAlpha = clamp(p.t, 0, 1);
    ctx.font = 'bold ' + Math.round(28 * scale) + 'px sans-serif';
    ctx.lineWidth = 4 * scale; ctx.strokeStyle = 'rgba(0,0,0,.55)';
    var ty = py(p.y) - (1 - p.t) * 60 * scale;
    ctx.strokeText(p.txt, px(p.x), ty);
    ctx.fillStyle = '#fff'; ctx.fillText(p.txt, px(p.x), ty);
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'left';
}

function cameraUpdate(dt) {
  camX += (camTarget - camX) * Math.min(1, dt * 4);
  camX = clamp(camX, 0, Math.max(0, G.WORLD_W - viewW));
}
function setTarget(x) { camTarget = clamp(x, 0, Math.max(0, G.WORLD_W - viewW)); }
function resetCam() { camX = 0; camTarget = 0; }
function cloudStep(dt) {
  for (var i = 0; i < clouds.length; i++) {
    clouds[i].x += clouds[i].v * dt;
    if (clouds[i].x > G.WORLD_W + 260) clouds[i].x = -260;
  }
}

window.ABR = {
  init: function (canvas) { cv = canvas; ctx = canvas.getContext('2d'); resize(); },
  resize: resize, draw: draw, px: px, py: py,
  cameraUpdate: cameraUpdate, setTarget: setTarget, resetCam: resetCam, cloudStep: cloudStep,
  get scale() { return scale; }, get viewW() { return viewW; }, get camX() { return camX; }
};
})();
