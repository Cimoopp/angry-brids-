/* ============================================================
   ANGRY BIRDS — отрисовка на canvas
   Экспорт: window.ABR
   ============================================================ */
window.ABR = (function () {
'use strict';
var G = window.ABG;
if (!G) { console.error('ABG не загружен'); return null; }

var cv = null, ctx = null, scale = 1, viewW = 0, camX = 0, camTarget = 0;
var clouds = [], t = 0;

function rnd(a, b) { return a + Math.random() * (b - a); }

function init() {
  cv = document.getElementById('cv');
  if (!cv) { console.error('нет canvas #cv'); return false; }
  ctx = cv.getContext('2d');
  if (!ctx) return false;
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 120); });
  return true;
}

function resize() {
  if (!cv || !ctx) return;
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
  for (var i = 0; i < 9; i++) {
    clouds.push({ x: rnd(-200, G.WORLD_W + 200), y: rnd(30, 260),
                  s: rnd(0.55, 1.5), v: rnd(3, 12) });
  }
}

function toWorld(cx, cy) { return { x: cx / scale + camX, y: cy / scale }; }
function setCam(x) { camTarget = Math.max(0, Math.min(Math.max(0, G.WORLD_W - viewW), x)); }
function follow(x) { setCam(x - viewW * 0.42); }
function snap() { camX = camTarget; }

/* ---------- фон ---------- */
function sky() {
  var h = window.innerHeight;
  var g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#7fc4e8');
  g.addColorStop(0.55, '#bfe3f5');
  g.addColorStop(1, '#f2e2b8');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, window.innerWidth, h);
}

function hills() {
  ctx.fillStyle = '#8fc76e';
  ctx.beginPath();
  ctx.moveTo(-100, G.GROUND_Y);
  ctx.quadraticCurveTo(G.WORLD_W * 0.22, G.GROUND_Y - 190, G.WORLD_W * 0.48, G.GROUND_Y - 20);
  ctx.quadraticCurveTo(G.WORLD_W * 0.72, G.GROUND_Y - 230, G.WORLD_W + 200, G.GROUND_Y);
  ctx.closePath();
  ctx.fill();
}

function ground() {
  var g = ctx.createLinearGradient(0, G.GROUND_Y, 0, G.WORLD_H);
  g.addColorStop(0, '#7bbf58');
  g.addColorStop(0.18, '#5f9a42');
  g.addColorStop(1, '#3c6b2c');
  ctx.fillStyle = g;
  ctx.fillRect(-200, G.GROUND_Y, G.WORLD_W + 500, G.WORLD_H - G.GROUND_Y + 200);
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-200, G.GROUND_Y);
  ctx.lineTo(G.WORLD_W + 300, G.GROUND_Y);
  ctx.stroke();
}

/* ---------- рогатка ---------- */
function sling() {
  var sx = G.SLING_X, sy = G.SLING_Y;
  ctx.strokeStyle = '#6b4423';
  ctx.lineWidth = 13;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(sx - 4, G.GROUND_Y);
  ctx.lineTo(sx - 4, sy + 10);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(sx - 24, sy - 34);
  ctx.lineTo(sx - 2, sy + 6);
  ctx.lineTo(sx + 22, sy - 34);
  ctx.stroke();

  var a = G.active;
  var bx = a ? a.x : sx, by = a ? a.y : sy;
  ctx.strokeStyle = '#4a2f18';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(sx - 24, sy - 34); ctx.lineTo(bx, by); ctx.lineTo(sx + 22, sy - 34);
  ctx.stroke();
}

/* ---------- траектория ---------- */
function aim() {
  var a = G.active;
  if (!a || a.state !== 'ready') return;
  var dx = G.SLING_X - a.x, dy = G.SLING_Y - a.y;
  var pull = Math.sqrt(dx * dx + dy * dy);
  if (pull < 14) return;
  var k = G.POWER * 1.6 * (G.has('slingshot') ? 1.1 : 1);
  var vx = dx * k, vy = dy * k;
  var x = a.x, y = a.y, h = 0.055;
  var count = G.has('radar') ? 34 : 22;
  for (var i = 0; i < count; i++) {
    vy += G.GRAVITY * h;
    x += vx * h;
    y += vy * h;
    if (y > G.GROUND_Y || x > G.WORLD_W + 100) break;
    ctx.fillStyle = 'rgba(255,255,255,' + (0.75 - i * 0.018) + ')';
    ctx.beginPath();
    ctx.arc(x, y, Math.max(2.5, 6 - i * 0.13), 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ---------- блоки ---------- */
function blocks() {
  var i, b, M;
  for (i = 0; i < G.blocks.length; i++) {
    b = G.blocks[i];
    M = G.MAT[b.mat];
    var x = b.x - b.w / 2, y = b.y - b.h / 2;
    ctx.fillStyle = M.fill;
    ctx.fillRect(x, y, b.w, b.h);
    ctx.strokeStyle = M.edge;
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 1.5, y + 1.5, b.w - 3, b.h - 3);
    if (b.mat === 'wood') {
      ctx.strokeStyle = 'rgba(120,80,30,.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 5, y + b.h * 0.33); ctx.lineTo(x + b.w - 5, y + b.h * 0.33);
      ctx.moveTo(x + 5, y + b.h * 0.66); ctx.lineTo(x + b.w - 5, y + b.h * 0.66);
      ctx.stroke();
    } else if (b.mat === 'ice') {
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      ctx.fillRect(x + 4, y + 4, Math.max(4, b.w * 0.22), Math.max(4, b.h - 8));
    } else if (b.mat === 'stone') {
      ctx.fillStyle = 'rgba(0,0,0,.12)';
      ctx.fillRect(x + 4, y + 4, b.w - 8, 5);
    }
    if (b.hp < b.max * 0.5) {
      ctx.strokeStyle = 'rgba(0,0,0,.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + b.w * 0.3, y + 3);
      ctx.lineTo(x + b.w * 0.45, y + b.h * 0.5);
      ctx.lineTo(x + b.w * 0.35, y + b.h - 3);
      ctx.stroke();
    }
  }
}

/* ---------- свиньи ---------- */
function pigs() {
  var i, p;
  for (i = 0; i < G.pigs.length; i++) {
    p = G.pigs[i];
    ctx.fillStyle = '#7ddc6b';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4fae42';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(p.x - p.r * 0.34, p.y - p.r * 0.22, p.r * 0.28, 0, Math.PI * 2);
    ctx.arc(p.x + p.r * 0.34, p.y - p.r * 0.22, p.r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#22331f';
    ctx.beginPath();
    ctx.arc(p.x - p.r * 0.3, p.y - p.r * 0.2, p.r * 0.13, 0, Math.PI * 2);
    ctx.arc(p.x + p.r * 0.38, p.y - p.r * 0.2, p.r * 0.13, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#5cc44d';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + p.r * 0.35, p.r * 0.42, p.r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2f6b28';
    ctx.beginPath();
    ctx.arc(p.x - p.r * 0.14, p.y + p.r * 0.35, p.r * 0.09, 0, Math.PI * 2);
    ctx.arc(p.x + p.r * 0.14, p.y + p.r * 0.35, p.r * 0.09, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ---------- птицы ---------- */
function drawBird(f) {
  if (!f) return;
  var B = G.BIRDS[f.type] || G.BIRDS.red;
  ctx.fillStyle = B.fill;
  ctx.beginPath();
  ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.35)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = B.belly;
  ctx.beginPath();
  ctx.arc(f.x, f.y + f.r * 0.35, f.r * 0.55, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(f.x + f.r * 0.28, f.y - f.r * 0.28, f.r * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1b1b1b';
  ctx.beginPath();
  ctx.arc(f.x + f.r * 0.34, f.y - f.r * 0.26, f.r * 0.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f5a623';
  ctx.beginPath();
  ctx.moveTo(f.x + f.r * 0.95, f.y);
  ctx.lineTo(f.x + f.r * 1.7, f.y + f.r * 0.22);
  ctx.lineTo(f.x + f.r * 0.95, f.y + f.r * 0.5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(0,0,0,.4)';
  ctx.beginPath();
  ctx.moveTo(f.x - f.r * 0.2, f.y - f.r * 1.3);
  ctx.lineTo(f.x + f.r * 0.15, f.y - f.r * 1.75);
  ctx.lineTo(f.x + f.r * 0.5, f.y - f.r * 1.2);
  ctx.closePath();
  ctx.fill();

  if (f.used) return;
  var B2 = G.BIRDS[f.type];
  if (B2 && B2.ability !== 'none' && f.state === 'fly') {
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('👆', f.x, f.y - f.r - 16);
  }
}

function birds() {
  var i;
  for (i = 0; i < G.extraFlyers.length; i++) drawBird(G.extraFlyers[i]);
  drawBird(G.flying);
  drawBird(G.active);
}

/* ---------- частицы и очки ---------- */
function effects() {
  var i, p;
  for (i = 0; i < G.parts.length; i++) {
    p = G.parts[i];
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.4));
    ctx.fillStyle = p.col;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  for (i = 0; i < G.pops.length; i++) {
    p = G.pops[i];
    ctx.globalAlpha = Math.max(0, p.t / p.life);
    ctx.font = 'bold 34px sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.fillText(p.text, p.x + 2, p.y - 30 + 2);
    ctx.fillStyle = p.col;
    ctx.fillText(p.text, p.x, p.y - 30);
  }
  ctx.globalAlpha = 1;
}

/* ---------- кадр ---------- */
function tick(dt) {
  t += dt;
  var i;
  for (i = 0; i < clouds.length; i++) {
    var c = clouds[i];
    c.x += c.v * dt;
    if (c.x > G.WORLD_W + 300) c.x = -300;
  }
  if (window.innerWidth / scale < 1) resize();
}

function draw() {
  if (!ctx) return;
  camX += (camTarget - camX) * 0.12;
  sky();

  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-camX, 0);

  hills();
  ground();

  var i;
  for (i = 0; i < clouds.length; i++) {
    var c = clouds[i];
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 34 * c.s, 0, Math.PI * 2);
    ctx.arc(c.x + 32 * c.s, c.y + 6 * c.s, 26 * c.s, 0, Math.PI * 2);
    ctx.arc(c.x - 30 * c.s, c.y + 8 * c.s, 24 * c.s, 0, Math.PI * 2);
    ctx.fill();
  }

  sling();
  blocks();
  pigs();
  birds();
  aim();
  effects();

  ctx.restore();
}

return {
  init: init,
  resize: resize,
  tick: tick,
  draw: draw,
  toWorld: toWorld,
  setCam: setCam,
  follow: follow,
  snap: snap
};
})();
