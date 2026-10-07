/* ============================================================
   ANGRY BIRDS — отрисовка на canvas. Экспорт: window.ABR
   ============================================================ */
window.ABR = (function () {
'use strict';
var G = window.ABG;
if (!G) { console.error('engine.js не загружен'); return null; }

function cl(v, a, b) { return v < a ? a : (v > b ? b : v); }
function rnd(a, b) { return a + Math.random() * (b - a); }

var cv = null, ctx = null;
var scale = 1, viewW = 0, camX = 0, camTarget = 0, time = 0;
var clouds = [], hills = [];

function init() {
  cv = document.getElementById('cv');
  if (!cv) { console.error('нет холста #cv'); return false; }
  ctx = cv.getContext('2d');
  resize();
  window.addEventListener('resize', function () { resize(); });
  window.addEventListener('orientationchange', function () { setTimeout(resize, 150); });
  return true;
}

function resize() {
  if (!cv) return;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var w = window.innerWidth, h = window.innerHeight;
  cv.width = Math.max(1, Math.round(w * dpr));
  cv.height = Math.max(1, Math.round(h * dpr));
  cv.style.width = w + 'px';
  cv.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  scale = h / G.WORLD_H;
  viewW = w / scale;

  clouds = [];
  for (var i = 0; i < 10; i++) {
    clouds.push({ x: rnd(-300, G.WORLD_W + 300), y: rnd(40, 300), s: rnd(0.55, 1.5), v: rnd(5, 18) });
  }
  hills = [];
  for (var j = 0; j < 26; j++) {
    hills.push({ x: j * 260 + rnd(-60, 60), r: rnd(110, 230), c: j % 2 ? '#1b2c46' : '#16243a' });
  }
  setCam(camX * scale);
  snap();
}

function px(x) { return (x - camX) * scale; }
function py(y) { return y * scale; }
function toWorld(clientX, clientY) {
  return { x: clientX / scale + camX, y: clientY / scale };
}

function setCam(v) { camTarget = cl(v, 0, Math.max(0, G.WORLD_W - viewW)); }
function snap() { camX = camTarget; }
function follow(x) { setCam(x - viewW * 0.38); }
function getCamX() { return camX; }

function tick(dt) {
  time += dt;
  camX += (camTarget - camX) * Math.min(1, dt * 5);
  if (Math.abs(camTarget - camX) < 0.5) camX = camTarget;
  for (var i = 0; i < clouds.length; i++) {
    clouds[i].x += clouds[i].v * dt;
    if (clouds[i].x > G.WORLD_W + 380) clouds[i].x = -380;
  }
}

/* ---------- фон ---------- */
function drawSky() {
  var h = G.WORLD_H;
  var g = ctx.createLinearGradient(0, 0, 0, h);
  if (G.level % 3 === 0) {
    g.addColorStop(0, '#12203a'); g.addColorStop(0.55, '#2a3f63'); g.addColorStop(1, '#4a5f80');
  } else if (G.level % 3 === 1) {
    g.addColorStop(0, '#5aa9e6'); g.addColorStop(0.6, '#9fd3f2'); g.addColorStop(1, '#e3f4fb');
  } else {
    g.addColorStop(0, '#f5a623'); g.addColorStop(0.5, '#ffd88a'); g.addColorStop(1, '#ffeccc');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, viewW, h);

  /* солнце */
  ctx.fillStyle = (G.level % 3 === 0) ? 'rgba(240,245,255,.85)' : 'rgba(255,235,150,.95)';
  ctx.beginPath(); ctx.arc(viewW * 0.82, h * 0.16, 46, 0, Math.PI * 2); ctx.fill();

  /* облака */
  for (var i = 0; i < clouds.length; i++) {
    var c = clouds[i];
    var x = px(c.x), y = py(c.y);
    if (x < -400 || x > viewW * scale + 400) continue;
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.beginPath();
    ctx.arc(x, y, 34 * c.s, 0, Math.PI * 2);
    ctx.arc(x + 40 * c.s, y + 8 * c.s, 27 * c.s, 0, Math.PI * 2);
    ctx.arc(x - 38 * c.s, y + 10 * c.s, 24 * c.s, 0, Math.PI * 2);
    ctx.arc(x + 8 * c.s, y - 20 * c.s, 26 * c.s, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHills() {
  for (var i = 0; i < hills.length; i++) {
    var h = hills[i];
    var x = px(h.x);
    if (x < -400 || x > viewW + 400) continue;
    ctx.fillStyle = h.c;
    ctx.beginPath();
    ctx.arc(x, py(G.GROUND_Y) + 40, h.r * scale, Math.PI, Math.PI * 2);
    ctx.fill();
  }
}

function drawGround() {
  var y = py(G.GROUND_Y);
  var g = ctx.createLinearGradient(0, y, 0, py(G.WORLD_H));
  g.addColorStop(0, '#7ec850');
  g.addColorStop(0.16, '#5aa832');
  g.addColorStop(0.2, '#8a6a3d');
  g.addColorStop(1, '#4a3520');
  ctx.fillStyle = g;
  ctx.fillRect(0, y, viewW, py(G.WORLD_H) - y + 4);

  ctx.strokeStyle = 'rgba(38,72,20,.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (var x = 0; x < viewW; x += 22) {
    var gx = x + 8;
    ctx.moveTo(gx, y + 2);
    ctx.lineTo(gx - 5, y - 12 - (gx % 7) * 2);
  }
  ctx.stroke();
}

/* ---------- рогатка ---------- */
function drawSlingBack() {
  var x = px(G.SLING_X), y = py(G.SLING_Y);
  ctx.strokeStyle = '#6b4526';
  ctx.lineWidth = 13 * scale * 1.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 4, py(G.GROUND_Y));
  ctx.lineTo(x - 4, y + 24);
  ctx.stroke();
}

function drawSlingFront() {
  var x = px(G.SLING_X), y = py(G.SLING_Y);
  ctx.strokeStyle = '#7d5230';
  ctx.lineWidth = 12 * scale * 1.4;
  ctx.beginPath();
  ctx.moveTo(x - 4, y + 34);
  ctx.lineTo(x + 18, y - 22);
  ctx.moveTo(x - 4, y + 34);
  ctx.lineTo(x - 30, y - 18);
  ctx.stroke();
}

function rubber(a) {
  var x = px(G.SLING_X), y = py(G.SLING_Y);
  var ax = px(a.x), ay = py(a.y);
  ctx.strokeStyle = '#3b2412';
  ctx.lineWidth = 7 * scale * 1.3;
  ctx.beginPath();
  ctx.moveTo(x + 16 * scale, y - 20 * scale);
  ctx.lineTo(ax, ay);
  ctx.lineTo(x - 28 * scale, y - 16 * scale);
  ctx.stroke();
}

/* ---------- прицел ---------- */
function drawAim(a) {
  var vx = (G.SLING_X - a.x) * G.POWER;
  var vy = (G.SLING_Y - a.y) * G.POWER;
  if (Math.abs(vx) + Math.abs(vy) < 90) return;
  var x = a.x, y = a.y, dt = 0.055;
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  for (var i = 0; i < 13; i++) {
    x += vx * dt; y += vy * dt;
    vy += G.GRAVITY * dt;
    if (y > G.GROUND_Y) break;
    ctx.beginPath();
    ctx.arc(px(x), py(y), Math.max(1.6, 4.4 - i * 0.22) * scale, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,255,255,.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px(a.x), py(a.y));
  ctx.lineTo(px(G.SLING_X), py(G.SLING_Y));
  ctx.stroke();
}

/* ---------- блоки ---------- */
function drawBlocks() {
  for (var i = 0; i < G.blocks.length; i++) {
    var b = G.blocks[i];
    if (b.dead) continue;
    var m = G.MAT[b.mat] || G.MAT.wood;
    var w = b.w * scale, h = b.h * scale;
    var x = px(b.x - b.w * 0.5), y = py(b.y - b.h * 0.5);
    if (x + w < -60 || x > viewW + 60) continue;

    var hpRatio = cl(b.hp / b.max, 0, 1);
    ctx.fillStyle = m.fill;
    ctx.globalAlpha = 0.55 + hpRatio * 0.45;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;

    ctx.strokeStyle = m.edge;
    ctx.lineWidth = Math.max(1.5, 2.4 * scale);
    ctx.strokeRect(x, y, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,.22)';
    ctx.lineWidth = Math.max(1, 1.6 * scale);
    ctx.beginPath();
    ctx.moveTo(x + w * 0.2, y + h * 0.15);
    ctx.lineTo(x + w * 0.8, y + h * 0.15);
    ctx.stroke();

    if (hpRatio < 1) {
      ctx.strokeStyle = 'rgba(0,0,0,.35)';
      ctx.lineWidth = Math.max(1, 1.4 * scale);
      ctx.beginPath();
      ctx.moveTo(x + w * 0.2, y + h * 0.45);
      ctx.lineTo(x + w * 0.5, y + h * 0.72);
      ctx.lineTo(x + w * 0.78, y + h * 0.4);
      ctx.stroke();
    }
    if (b.hitT > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + (b.hitT * 2.2) + ')';
      ctx.fillRect(x, y, w, h);
    }
  }
}

/* ---------- свиньи ---------- */
function drawPigs() {
  for (var i = 0; i < G.pigs.length; i++) {
    var p = G.pigs[i];
    if (p.dead) continue;
    var x = px(p.x), y = py(p.y), r = p.r * scale;
    if (x + r < -60 || x - r > viewW + 60) continue;

    var hpRatio = cl(p.hp / p.max, 0, 1);
    ctx.fillStyle = '#7ddc62';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = '#4e9b3a';
    ctx.lineWidth = Math.max(1.4, 2 * scale);
    ctx.stroke();

    ctx.fillStyle = '#4e9b3a';
    ctx.beginPath(); ctx.arc(x, y + r * 0.1, r * 0.42, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#2f5f24';
    ctx.beginPath();
    ctx.arc(x - r * 0.32, y - r * 0.3, r * 0.12, 0, Math.PI * 2);
    ctx.arc(x + r * 0.32, y - r * 0.3, r * 0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#3f7f30';
    ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.75, r * 0.22, 0, Math.PI * 2);
    ctx.arc(x + r * 0.3, y - r * 0.75, r * 0.22, 0, Math.PI * 2);
    ctx.fill();

    if (hpRatio < 0.6) {
      ctx.strokeStyle = 'rgba(60,30,10,.5)';
      ctx.lineWidth = Math.max(1, 1.5 * scale);
      ctx.beginPath();
      ctx.moveTo(x - r * 0.5, y + r * 0.3);
      ctx.lineTo(x - r * 0.1, y + r * 0.55);
      ctx.stroke();
    }
    if (p.hitT > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + (p.hitT * 2.2) + ')';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
  }
}

/* ---------- птицы ---------- */
function drawBird(b, x, y, r, alpha) {
  var B = G.BIRDS[b.type] || G.BIRDS.red;
  ctx.globalAlpha = alpha == null ? 1 : alpha;

  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.95, r * 0.9, r * 0.28, 0, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = B.fill;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = B.belly;
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.35, r * 0.62, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.32, 0, Math.PI * 2);
  ctx.arc(x + r * 0.32, y - r * 0.28, r * 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(x - r * 0.24, y - r * 0.3, r * 0.14, 0, Math.PI * 2);
  ctx.arc(x + r * 0.36, y - r * 0.28, r * 0.13, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f5a623';
  ctx.beginPath();
  ctx.moveTo(x + r * 0.5, y + r * 0.1);
  ctx.lineTo(x + r * 1.28, y + r * 0.34);
  ctx.lineTo(x + r * 0.5, y + r * 0.52);
  ctx.closePath();
  ctx.fill();

  if (b.state === 'fly') {
    ctx.strokeStyle = B.fill;
    ctx.lineWidth = Math.max(2, r * 0.28);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.9, y - r * 0.1);
    ctx.lineTo(x - r * 1.7, y - r * 0.9);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawTrail(b) {
  if (!b.trail || b.trail.length < 3) return;
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  for (var i = 0; i < b.trail.length; i += 2) {
    var p = b.trail[i];
    ctx.beginPath();
    ctx.arc(px(p.x), py(p.y), Math.max(1.2, (i / b.trail.length) * 4.5) * scale, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ---------- осколки и надписи ---------- */
function drawParts() {
  for (var i = 0; i < G.parts.length; i++) {
    var p = G.parts[i];
    var a = cl(p.life / (p.max || 1), 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.c;
    ctx.fillRect(px(p.x), py(p.y), p.s * scale, p.s * scale);
  }
  ctx.globalAlpha = 1;
}

function drawPops() {
  var font = Math.round(30 * scale);
  ctx.font = '900 ' + font + 'px sans-serif';
  ctx.textAlign = 'center';
  for (var i = 0; i < G.pops.length; i++) {
    var p = G.pops[i];
    ctx.globalAlpha = cl(p.t, 0, 1);
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = 'rgba(0,0,0,.55)';
    ctx.lineWidth = Math.max(2, 4 * scale);
    var ty = py(p.y - (1 - p.t) * 60);
    ctx.strokeText(p.txt, px(p.x), ty);
    ctx.fillText(p.txt, px(p.x), ty);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

/* ---------- общий кадр ---------- */
function draw() {
  if (!ctx) return;
  drawSky();
  drawHills();
  drawGround();
  drawSlingBack();

  if (G.active && G.active.state === 'ready') {
    rubber(G.active);
    drawAim(G.active);
  }

  drawBlocks();
  drawPigs();

  if (G.flying) { drawTrail(G.flying); }
  for (var i = 0; i < G.extraFlyers.length; i++) drawTrail(G.extraFlyers[i]);

  drawSlingFront();
  if (G.active) drawBird(G.active, px(G.active.x), py(G.active.y), G.active.r * scale);
  if (G.flying) drawBird(G.flying, px(G.flying.x), py(G.flying.y), G.flying.r * scale);
  for (var j = 0; j < G.extraFlyers.length; j++) {
    var ef = G.extraFlyers[j];
    drawBird(ef, px(ef.x), py(ef.y), ef.r * scale);
  }

  drawParts();
  drawPops();
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
  px: px,
  py: py,
  getCamX: getCamX,
  getScale: function () { return scale; }
};
})();
