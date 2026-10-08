/* ============================================================
   ANGRY BIRDS — графика. Экспорт: window.ABR
   Часть 1: сцена (небо, солнце, облака, холмы, земля)
   ============================================================ */
window.ABR = (function () {
'use strict';
var G = window.ABG;
if (!G) { console.error('ABG не загружен'); return null; }

function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function rnd(a, b) { return a + Math.random() * (b - a); }

var cv = null, ctx = null;
var scale = 1, viewW = 0, camX = 0, camTarget = 0;
var clouds = [], time = 0, shakeT = 0, shakeA = 0, shakeX = 0, shakeY = 0;
var stars = [];

/* ---------- жизненный цикл ---------- */
function init() {
  cv = document.getElementById('cv');
  if (!cv) { console.error('нет canvas #cv'); return false; }
  ctx = cv.getContext('2d', { alpha: false });
  if (!ctx) { console.error('нет 2d-контекста'); return false; }
  buildClouds();
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 120); });
  return true;
}

function buildClouds() {
  clouds = [];
  var i;
  for (i = 0; i < 10; i++) {
    clouds.push({
      x: rnd(-200, G.WORLD_W + 200),
      y: rnd(40, 260),
      s: rnd(0.55, 1.35),
      v: rnd(5, 16)
    });
  }
  stars = [];
  for (i = 0; i < 40; i++) {
    stars.push({ x: rnd(0, 1), y: rnd(0, 0.38), r: rnd(0.6, 1.6), a: rnd(0.25, 0.85) });
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
  setCam(camTarget);
  snap();
}

/* ---------- камера ---------- */
function setCam(v) { camTarget = clamp(v, 0, Math.max(0, G.WORLD_W - viewW)); }
function snap() { camX = camTarget; }
function follow(x) { setCam(x - viewW * 0.42); }
function px(x) { return (x - camX) * scale; }
function py(y) { return y * scale; }
function toWorld(clientX, clientY) { return { x: clientX / scale + camX, y: clientY / scale }; }
function shake(a) { shakeA = Math.max(shakeA, a); shakeT = 0.28; }

/* ---------- шаг ---------- */
function tick(dt) {
  time += dt;
  var i;
  for (i = 0; i < clouds.length; i++) {
    clouds[i].x += clouds[i].v * dt;
    if (clouds[i].x > G.WORLD_W + 320) clouds[i].x = -320;
  }
  camX += (camTarget - camX) * Math.min(1, dt * 4.5);
  if (shakeT > 0) {
    shakeT -= dt;
    var k = Math.max(0, shakeT / 0.28);
    shakeX = rnd(-1, 1) * shakeA * k;
    shakeY = rnd(-1, 1) * shakeA * k;
  } else { shakeX = 0; shakeY = 0; shakeA = 0; }
}

/* ---------- фон ---------- */
function drawSky() {
  var w = viewW, h = G.WORLD_H;
  var g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#081226');
  g.addColorStop(0.35, '#1b3c73');
  g.addColorStop(0.68, '#4f8ec9');
  g.addColorStop(1, '#a9d7ef');
  ctx.fillStyle = g;
  ctx.fillRect(camX - 40, -40, w + 80, h + 80);

  var i, s;
  ctx.save();
  for (i = 0; i < stars.length; i++) {
    s = stars[i];
    ctx.globalAlpha = s.a * (0.55 + 0.45 * Math.sin(time * 1.4 + i));
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(camX + s.x * w, s.y * h, s.r, 0, 6.284);
    ctx.fill();
  }
  ctx.restore();

  var sx = camX + w * 0.78, sy = h * 0.19;
  var halo = ctx.createRadialGradient(sx, sy, 6, sx, sy, 190);
  halo.addColorStop(0, 'rgba(255,236,170,.95)');
  halo.addColorStop(0.28, 'rgba(255,226,140,.42)');
  halo.addColorStop(1, 'rgba(255,220,120,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(sx, sy, 190, 0, 6.284);
  ctx.fill();
  ctx.fillStyle = '#fff6cf';
  ctx.beginPath();
  ctx.arc(sx, sy, 42, 0, 6.284);
  ctx.fill();
}

function puff(x, y, r, s) {
  var g = ctx.createRadialGradient(x - r * 0.25, y - r * 0.35, r * 0.15, x, y, r);
  g.addColorStop(0, 'rgba(255,255,255,.97)');
  g.addColorStop(0.55, 'rgba(233,242,255,.92)');
  g.addColorStop(1, 'rgba(190,208,232,.62)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * s, 0, 6.284);
  ctx.fill();
}

function drawClouds() {
  var i, c, x, y, s;
  for (i = 0; i < clouds.length; i++) {
    c = clouds[i];
    x = c.x; y = c.y; s = c.s;
    ctx.globalAlpha = 0.92;
    puff(x, y, 42 * s, 1);
    puff(x + 44 * s, y + 6 * s, 32 * s, 1);
    puff(x - 46 * s, y + 9 * s, 27 * s, 1);
    puff(x + 14 * s, y - 20 * s, 30 * s, 1);
    ctx.globalAlpha = 1;
  }
}

function drawHill(baseY, amp, color, off, freq) {
  var x, y, first = true;
  ctx.beginPath();
  for (x = camX - 60; x <= camX + viewW + 60; x += 22) {
    y = baseY - Math.sin((x / freq) + off) * amp - Math.cos(x / (freq * 0.45) + off) * amp * 0.3;
    if (first) { ctx.moveTo(px(x), py(y)); first = false; }
    else ctx.lineTo(px(x), py(y));
  }
  ctx.lineTo(px(camX + viewW + 60), py(G.WORLD_H + 40));
  ctx.lineTo(px(camX - 60), py(G.WORLD_H + 40));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawGround() {
  var gy = G.GROUND_Y, x0 = camX - 60, wid = viewW + 120;
  var g = ctx.createLinearGradient(0, py(gy), 0, py(G.WORLD_H + 40));
  g.addColorStop(0, '#6cbf4a');
  g.addColorStop(0.18, '#4f9c39');
  g.addColorStop(0.55, '#7a5230');
  g.addColorStop(1, '#4c3220');
  ctx.fillStyle = g;
  ctx.fillRect(px(x0), py(gy), wid * scale, (G.WORLD_H - gy + 60) * scale);

  ctx.strokeStyle = 'rgba(35,90,25,.55)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(px(x0), py(gy));
  ctx.lineTo(px(x0 + wid), py(gy));
  ctx.stroke();

  var x = Math.floor(x0 / 18) * 18, h, sway;
  ctx.strokeStyle = 'rgba(46,112,32,.62)';
  ctx.lineWidth = 2;
  for (; x < x0 + wid; x += 18) {
    h = 12 + ((x * 37) % 11);
    sway = Math.sin(time * 1.1 + x * 0.02) * 3.2;
    ctx.beginPath();
    ctx.moveTo(px(x), py(gy));
    ctx.quadraticCurveTo(px(x + sway * 0.6), py(gy - h * 0.6), px(x + sway), py(gy - h));
    ctx.stroke();
  }
}

function drawScene() {
  drawSky();
  drawClouds();
  drawHill(G.GROUND_Y - 95, 34, '#2b4f7a', 0.9, 420);
  drawHill(G.GROUND_Y - 42, 22, '#39713f', 2.3, 300);
  drawGround();
}

return {
  init: init,
  resize: resize,
  tick: tick,
  px: px, py: py,
  toWorld: toWorld,
  follow: follow,
  setCam: setCam,
  snap: snap,
  shake: shake,
  drawScene: drawScene,
  ctx: function () { return ctx; },
  scale: function () { return scale; },
  camX: function () { return camX; },
  shakeOffset: function () { return { x: shakeX, y: shakeY }; }
};
})();
