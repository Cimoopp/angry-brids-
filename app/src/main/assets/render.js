/* ============================================================
   ANGRY BIRDS — отрисовка на canvas. Экспорт: window.ABR
   ============================================================ */
(function () {
'use strict';

var G = window.ABG;
if (!G) { console.error('ABG не загружен'); return; }

function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function rnd(a, b) { return a + Math.random() * (b - a); }

var cv = null, ctx = null, scale = 1, viewW = 0, camX = 0, camTarget = 0, clouds = [];

function init() {
  cv = document.getElementById('cv');
  if (!cv) { console.error('нет canvas #cv'); return false; }
  ctx = cv.getContext('2d');
  resize();
  return true;
}

function resize() {
  if (!cv || !ctx) return;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var w = window.innerWidth, h = window.innerHeight;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  cv.style.width = w + 'px'; cv.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  scale = h / G.WORLD_H;
  viewW = w / scale;
  clouds = [];
  for (var i = 0; i < 9; i++) {
    clouds.push({ x: rnd(-200, G.WORLD_W + 200), y: rnd(40, 300), s: rnd(0.5, 1.4), v: rnd(4, 14) });
  }
}

function px(x) { return (x - camX) * scale; }
function py(y) { return y * scale; }
function setCam(x) { camTarget = clamp(x, 0, Math.max(0, G.WORLD_W - viewW)); }
function follow(x) { setCam(x - viewW * 0.42); }
function snap() { camX = camTarget; }
function toWorld(cx, cy) { return { x: cx / scale + camX, y: cy / scale }; }

function tick(dt) {
  camX += (camTarget - camX) * Math.min(1, dt * 4);
  camX = clamp(camX, 0, Math.max(0, G.WORLD_W - viewW));
  for (var i = 0; i < clouds.length; i++) {
    clouds[i].x += clouds[i].v * dt;
    if (clouds[i].x > G.WORLD_W + 280) clouds[i].x = -280;
  }
}

function sky(w, h) {
  var g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#4fa8e0'); g.addColorStop(0.55, '#a8dcf0'); g.addColorStop(1, '#e2f4fa');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}

function drawClouds() {
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  for (var i = 0; i < clouds.length; i++) {
    var c = clouds[i];
    var cx = (c.x - camX * 0.35) * scale, cy = py(c.y), r = 26 * c.s * scale;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 6.284);
    ctx.arc(cx + r * 0.95, cy + r * 0.15, r * 0.72, 0, 6.284);
    ctx.arc(cx - r * 0.95, cy + r * 0.2, r * 0.62, 0, 6.284);
    ctx.fill();
  }
}

function ground(w, h) {
  var gy = py(G.GROUND_Y);
  ctx.fillStyle = '#7fbf5a';
  ctx.beginPath();
  ctx.moveTo(0, gy);
  for (var i = 0; i <= 14; i++) {
    var hx = i * (w / 14);
    var hy = gy - 34 * scale * (0.35 + 0.65 * Math.abs(Math.sin(i * 1.27)));
    ctx.quadraticCurveTo(hx + w / 28, hy, hx + w / 14, gy - 8 * scale);
  }
  ctx.lineTo(w, gy); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();

  var g2 = ctx.createLinearGradient(0, gy, 0, h);
  g2.addColorStop(0, '#8fce63'); g2.addColorStop(0.16, '#6fae3f');
  g2.addColorStop(0.18, '#7a5a35'); g2.addColorStop(1, '#4a3620');
  ctx.fillStyle = g2; ctx.fillRect(0, gy, w, h - gy);
}

function sling(back) {
  var x = px(G.SLING_X), y = py(G.SLING_Y), gy = py(G.GROUND_Y);
  var wd = 13 * scale;
  if (back) {
    ctx.fillStyle = '#6f4520';
    ctx.fillRect(x - wd / 2, y, wd, gy - y);
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

function trail() {
  var a = G.active;
  if (!a) return;
  var vx = (G.SLING_X - a.x) * G.POWER, vy = (G.SLING_Y - a.y) * G.POWER;
  var x = a.x, y = a.y, t = 0.034;
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  for (var i = 0; i < 26; i++) {
    x += vx * t; y += vy * t; vy += G.GRAVITY * t;
    if (y > G.GROUND_Y || x > G.WORLD_W) break;
    ctx.beginPath();
    ctx.arc(px(x), py(y), Math.max(1.5, 3.4 * scale - i * 0.07 * scale), 0, 6.284);
    ctx.fill();
  }
}

function block(b) {
  if (b.dead) return;
  var m = G.MAT[b.m];
  var x = px(b.x - b.w / 2), y = py(b.y - b.h / 2);
  var w = b.w * scale, h = b.h * scale, i;
  ctx.fillStyle = m.edge; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = m.fill; ctx.fillRect(x + 2 * scale, y + 2 * scale, w - 4 * scale, h - 4 * scale);
  if (b.m === 'wood') {
    ctx.strokeStyle = 'rgba(90,60,20,.4)'; ctx.lineWidth = 1.6 * scale;
    for (i = 1; i < 3; i++) {
      ctx.beginPath();
      if (b.w > b.h) { ctx.moveTo(x + w * i / 3, y + 3 * scale); ctx.lineTo(x + w * i / 3, y + h - 3 * scale); }
      else { ctx.moveTo(x + 3 * scale, y + h * i / 3); ctx.lineTo(x + w - 3 * scale, y + h * i / 3); }
      ctx.stroke();
    }
  } else if (b.m === 'ice') {
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.2, y + h * 0.85);
    ctx.lineTo(x + w * 0.5, y + h * 0.3);
    ctx.lineTo(x + w * 0.75, y + h * 0.62);
    ctx.stroke();
  }
  var ratio = b.hp / b.max;
  if (ratio < 0.66) {
    ctx.strokeStyle = 'rgba(25,12,0,.72)'; ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.15, y + h * 0.18);
    ctx.lineTo(x + w * 0.45, y + h * 0.58);
    ctx.lineTo(x + w * 0.3, y + h * 0.9);
    if (ratio < 0.34) { ctx.moveTo(x + w * 0.62, y + h * 0.14); ctx.lineTo(x + w * 0.82, y + h * 0.56); }
    ctx.stroke();
  }
}

function pig(p) {
  if (p.dead) return;
  var x = px(p.x), y = py(p.y), r = p.r * scale;
  ctx.fillStyle = '#8ed14b';
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.284); ctx.fill();
  ctx.strokeStyle = '#5f8f2c'; ctx.lineWidth = 2 * scale; ctx.stroke();
  ctx.fillStyle = '#a8e063';
  ctx.beginPath(); ctx.arc(x - r * 0.26, y - r * 0.32, r * 0.22, 0, 6.284); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x - r * 0.34, y - r * 0.16, r * 0.2, 0, 6.284); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.34, y - r * 0.16, r * 0.2, 0, 6.284); ctx.fill();
  ctx.fillStyle = '#1b1b1b';
  ctx.beginPath(); ctx.arc(x - r * 0.31, y - r * 0.16, r * 0.09, 0, 6.284); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.31, y - r * 0.16, r * 0.09, 0, 6.284); ctx.fill();
  ctx.fillStyle = '#6fae2f';
  ctx.beginPath(); ctx.arc(x, y + r * 0.28, r * 0.26, 0, 6.284); ctx.fill();
  ctx.fillStyle = '#3f6b16';
  ctx.beginPath(); ctx.arc(x - r * 0.11, y + r * 0.28, r * 0.06, 0, 6.284); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.11, y + r * 0.28, r * 0.06, 0, 6.284); ctx.fill();
  if (p.hp < p.max * 0.85) {
    ctx.strokeStyle = 'rgba(180,40,40,.85)'; ctx.lineWidth = 2 * scale;
    ctx.beginPath(); ctx.moveTo(x - r * 0.6, y - r * 0.72); ctx.lineTo(x - r * 0.2, y - r * 0.95); ctx.stroke();
  }
}

function bird(b) {
  var x = px(b.x), y = py(b.y), r = b.r * scale;
  var col = '#e8453c', dark = '#a8261f', belly = '#ffd9d6';
  if (b.type === 'yellow') { col = '#f5c542'; dark = '#c9962a'; belly = '#fff0c2'; }
  else if (b.type === 'blue') { col = '#4aa8e8'; dark = '#2a6fa8'; belly = '#d6ecff'; }
  else if (b.type === 'black') { col = '#3a3a44'; dark = '#20202a'; belly = '#5a5a68'; }
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.284); ctx.fill();
  ctx.strokeStyle = dark; ctx.lineWidth = 2 * scale; ctx.stroke();
  ctx.fillStyle = belly;
  ctx.beginPath(); ctx.arc(x, y + r * 0.4, r * 0.48, 0, 6.284); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.28, r * 0.28, 0, 6.284); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.3, y - r * 0.28, r * 0.28, 0, 6.284); ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.arc(x - r * 0.26, y - r * 0.26, r * 0.12, 0, 6.284); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.26, y - r * 0.26, r * 0.12, 0, 6.284); ctx.fill();
  ctx.strokeStyle = dark; ctx.lineWidth = 3.2 * scale;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.62, y - r * 0.7); ctx.lineTo(x - r * 0.06, y - r * 0.44);
  ctx.moveTo(x + r * 0.62, y - r * 0.7); ctx.lineTo(x + r * 0.06, y - r * 0.44);
  ctx.stroke();
  ctx.fillStyle = '#f2a93b';
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.04);
  ctx.lineTo(x + r * 0.62, y + r * 0.22);
  ctx.lineTo(x, y + r * 0.44);
  ctx.closePath(); ctx.fill();
}

function fx() {
  var i, p;
  for (i = 0; i < G.parts.length; i++) {
    p = G.parts[i];
    ctx.globalAlpha = clamp(p.life * 1.4, 0, 1);
    ctx.fillStyle = p.c;
    ctx.fillRect(px(p.x), py(p.y), p.s * scale, p.s * scale);
  }
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  for (i = 0; i < G.pops.length; i++) {
    var q = G.pops[i];
    var ty = py(q.y) - (1.2 - q.t) * 55 * scale;
    ctx.globalAlpha = clamp(q.t, 0, 1);
    ctx.font = 'bold ' + Math.round(28 * scale) + 'px sans-serif';
    ctx.lineWidth = 4 * scale; ctx.strokeStyle = 'rgba(0,0,0,.6)';
    ctx.strokeText(q.txt, px(q.x), ty);
    ctx.fillStyle = '#fff';
    ctx.fillText(q.txt, px(q.x), ty);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

function draw() {
  if (!ctx) return;
  var w = window.innerWidth, h = window.innerHeight, i;
  sky(w, h);
  drawClouds();
  ground(w, h);
  sling(true);
  for (i = 0; i < G.blocks.length; i++) {
    if (G.blocks[i].static) continue;
    block(G.blocks[i]);
  }
  for (i = 0; i < G.pigs.length; i++) pig(G.pigs[i]);
  if (G.flying) bird(G.flying);
  for (i = 0; i < G.extraFlyers.length; i++) bird(G.extraFlyers[i]);
  if (G.active && G.active.state === 'ready') bird(G.active);
  sling(false);
  if (G.active && G.active.state === 'ready' && window.ABUI && window.ABUI.isDragging()) trail();
  fx();
}

window.ABR = {
  init: init, resize: resize, draw: draw, tick: tick,
  px: px, py: py, follow: follow, setCam: setCam, snap: snap,
  toWorld: toWorld,
  getCamX: function () { return camX; },
  getScale: function () { return scale; },
  getViewW: function () { return viewW; }
};

})();
