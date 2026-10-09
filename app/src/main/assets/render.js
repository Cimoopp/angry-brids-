/* ============================================================
   ANGRY BIRDS — графика v5

   ГЛАВНОЕ ИСПРАВЛЕНИЕ:
   массив облаков назывался `clouds` — так же, как функция clouds().
   Функция объявляется всплытием, а build() присваивал переменной
   пустой массив. В итоге в кадре `clouds is not a function`,
   кадр обрывался, и после неба с солнцем НИЧЕГО не рисовалось:
   ни облаков, ни земли, ни рогатки, ни свиней. Отсюда пустой экран.

   Теперь массив — `cl`, функция — `drawClouds()`.

   Ещё исправлено:
   • блоки: в ядре x,y — ЦЕНТР, графика считала их левым верхним углом
   • поле материала: `b.m` (было `b.mat`)
   • запас птиц — массив СТРОК ('red','yellow'), а не объектов
   • защита от NaN в координатах
   • мост имён hasAch/achDone выполняется до ui.js
   Экспорт: window.ABR
   ============================================================ */
window.ABR = (function () {
'use strict';
var G = window.ABG;
if (!G) { console.error('ABG не загружен'); return null; }

/* ---------- мост имён (срабатывает до загрузки ui.js) ---------- */
try {
  if (typeof G.hasAch !== 'function' && typeof G.achDone === 'function') {
    G.hasAch = function (id) { return G.achDone(id); };
  }
  if (typeof G.achDone !== 'function' && typeof G.hasAch === 'function') {
    G.achDone = G.hasAch;
  }
} catch (e) { }

function $(id) { return document.getElementById(id); }
function rnd(a, b) { return a + Math.random() * (b - a); }
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
/* защита от NaN: если число не посчиталось — берём запасное */
function fin(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }

/* ---------- безопасные цвета ---------- */
var HEX = /^#([0-9a-f]{6})$/i;
function rgb(c) {
  if (typeof c === 'string') {
    var m = HEX.exec(c.trim());
    if (m) { var n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
    var p = c.match(/(\d+)\D+(\d+)\D+(\d+)/);
    if (p) return [+p[1], +p[2], +p[3]];
  }
  return [150, 150, 150];
}
function shade(c, k) {
  var r = rgb(c);
  return 'rgb(' + clamp(Math.round(r[0] * k), 0, 255) + ',' + clamp(Math.round(r[1] * k), 0, 255) + ',' + clamp(Math.round(r[2] * k), 0, 255) + ')';
}
function rgba(c, a) {
  var r = rgb(c); a = clamp(a, 0, 1);
  return 'rgba(' + r[0] + ',' + r[1] + ',' + r[2] + ',' + a.toFixed(3) + ')';
}
function cs(g, o, c) {
  try { g.addColorStop(clamp(o, 0, 1), c); }
  catch (e) { try { g.addColorStop(clamp(o, 0, 1), '#9a9a9a'); } catch (e2) { } }
}
function rr(c, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/* ---------- кадр и камера ---------- */
var cv = null, ctx = null, dpr = 1;
var cssW = 0, cssH = 0, scale = 1, viewW = 0, viewH = 0;
var camX = 0, camT = 0, tx = 0, ty = 0;
var T = 0, shakeX = 0, shakeY = 0, shk = 0;
var cl = [], grass = [], hillsFar = [], hillsNear = [], fx = [];

/* зона боя, которую обязательно вписываем в экран */
var AREA_W = 1420;
var SHARE_LAND = 0.82, SHARE_PORT = 0.84;

function init() {
  cv = $('cv') || document.querySelector('canvas');
  if (!cv) { console.error('нет canvas #cv'); return false; }
  ctx = cv.getContext('2d');
  if (!ctx) { console.error('нет 2d-контекста'); return false; }
  build();
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 220); setTimeout(resize, 650); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) resize(); });
  return true;
}

function build() {
  cl = []; grass = []; hillsFar = []; hillsNear = [];
  var i;
  for (i = 0; i < 12; i++) cl.push({ x: rnd(-200, 2400), y: rnd(40, 250), s: rnd(0.6, 1.6), v: rnd(4, 14) });
  for (i = 0; i < 320; i++) grass.push({ x: rnd(0, 2300), h: rnd(10, 26), p: rnd(0, 6.28), d: Math.random() < 0.5 });
  for (i = 0; i < 18; i++) hillsFar.push({ x: i * 180 + rnd(-50, 50), r: rnd(120, 230) });
  for (i = 0; i < 14; i++) hillsNear.push({ x: i * 230 + rnd(-60, 60), r: rnd(90, 170) });
}

function resize() {
  if (!cv) { if (!init()) return; }
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  cssW = Math.max(1, window.innerWidth);
  cssH = Math.max(1, window.innerHeight);
  cv.width = Math.round(cssW * dpr);
  cv.height = Math.round(cssH * dpr);
  cv.style.width = cssW + 'px';
  cv.style.height = cssH + 'px';
  cv.style.left = '0px';
  cv.style.top = '0px';

  /* авто-экран: вписываем и рогатку, и постройку */
  var need = AREA_W;
  var sW = cssW / need;
  var sH = cssH / (fin(G.GROUND_Y, 600) + 240);
  scale = clamp(Math.min(sW, sH), 0.18, 1.6);
  viewW = cssW / scale;
  viewH = cssH / scale;

  snap();
  ctx.imageSmoothingEnabled = true;
  if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
}

function layout() {
  var share = (cssH > cssW) ? SHARE_PORT : SHARE_LAND;
  ty = cssH * share - fin(G.GROUND_Y, 600) * scale;
  tx = -camX * scale;
}
function snap() { camX = camT; layout(); }
function setCam(v) { camT = clamp(fin(v, 0), 0, Math.max(0, fin(G.WORLD_W, 2100) - viewW)); camX = camT; layout(); }
function follow(x) { setCam(fin(x, 0) - viewW * 0.42); }

function toWorld(cx, cy) {
  if (!cv) return { x: 0, y: 0 };
  var r = cv.getBoundingClientRect();
  return { x: ((cx - r.left) - tx - shakeX) / scale, y: ((cy - r.top) - ty - shakeY) / scale };
}

function shake(v) { shk = Math.min(18, (shk || 0) + (v || 0)); }

function burst(x, y, color, size) {
  x = fin(x, 0); y = fin(y, 0);
  var n = clamp(size > 1 ? 18 : 11, 6, 22), i;
  for (i = 0; i < n; i++) {
    var a = rnd(0, 6.28), sp = rnd(60, 300);
    fx.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, col: color || '#ffd764', s: rnd(2, 5), kind: 'spark' });
  }
  fx.push({ x: x, y: y, life: 1, kind: 'ring', col: color || '#fff2b8', r: size > 1 ? 26 : 14 });
  shake(size > 1 ? 12 : 5);
}

function tick(dt) {
  T += dt;
  var i;
  for (i = 0; i < cl.length; i++) {
    cl[i].x += cl[i].v * dt;
    if (cl[i].x > 2600) cl[i].x = -300;
  }
  for (i = 0; i < fx.length; i++) {
    var p = fx[i];
    p.life -= dt * (p.kind === 'ring' ? 2.2 : 1.5);
    if (p.kind !== 'ring') { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt; }
    else { p.r += 190 * dt; }
  }
  for (i = fx.length - 1; i >= 0; i--) if (fx[i].life <= 0) fx.splice(i, 1);
  if (shk > 0) {
    shk = Math.max(0, shk - dt * 42);
    shakeX = rnd(-shk, shk); shakeY = rnd(-shk, shk);
  } else { shakeX = 0; shakeY = 0; }
  if (camT !== camX) { camX += (camT - camX) * Math.min(1, dt * 6); layout(); }
}

/* ---------- фон (экранные координаты) ---------- */
function sky() {
  var g = ctx.createLinearGradient(0, 0, 0, cssH);
  cs(g, 0, '#2f6fc4');
  cs(g, 0.45, '#63a8dd');
  cs(g, 0.78, '#a9d6ee');
  cs(g, 1, '#e6efd7');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cssW, cssH);
}

function sun() {
  var x = cssW * 0.83, y = cssH * 0.14, r = Math.min(cssW, cssH) * 0.055;
  var gl = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 7);
  cs(gl, 0, 'rgba(255,247,214,0.95)');
  cs(gl, 0.16, 'rgba(255,238,180,0.42)');
  cs(gl, 0.45, 'rgba(255,232,160,0.14)');
  cs(gl, 1, 'rgba(255,230,150,0)');
  ctx.fillStyle = gl;
  ctx.beginPath(); ctx.arc(x, y, r * 7, 0, 6.2832); ctx.fill();
  var cg = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.15, x, y, r);
  cs(cg, 0, '#fffdf2'); cs(cg, 0.6, '#ffeaa0'); cs(cg, 1, '#ffd873');
  ctx.fillStyle = cg;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
}

function puff(x, y, r, k) {
  var g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.45, r * 0.15, x, y, r * 1.15);
  cs(g, 0, rgba('#ffffff', 0.99 * k));
  cs(g, 0.62, rgba('#f4fbff', 0.95 * k));
  cs(g, 1, rgba('#cfe4f2', 0.72 * k));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
}

function oneCloud(c, k) {
  var par = (cssH > cssW) ? 0.16 : 0.26;
  var x = c.x - camX * par, y = c.y, s = c.s;
  if (x < -420 || x > cssW + 420) return;
  var r = 34 * s;
  ctx.save();
  ctx.globalAlpha = 0.9 * k;
  ctx.fillStyle = rgba('#bcd6e6', 0.5);
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.85, r * 2.5, r * 0.55, 0, 0, 6.2832); ctx.fill();
  ctx.restore();
  puff(x - r * 1.25, y + r * 0.2, r * 0.92, k);
  puff(x + r * 1.2, y + r * 0.25, r * 0.82, k);
  puff(x - r * 0.35, y - r * 0.22, r * 1.1, k);
  puff(x + r * 0.45, y + r * 0.05, r * 0.95, k);
  puff(x, y + r * 0.42, r * 1.25, k);
}

function drawClouds() {
  var i;
  for (i = 0; i < cl.length; i++) oneCloud(cl[i], i % 3 === 0 ? 0.75 : 1);
}

function hillLine(list, baseY, colTop, colBot, par) {
  var i, x, y;
  var g = ctx.createLinearGradient(0, baseY - 140, 0, cssH);
  cs(g, 0, colTop); cs(g, 1, colBot);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-60, cssH);
  ctx.lineTo(-60, baseY);
  for (i = 0; i < list.length; i++) {
    x = list[i].x - camX * par;
    y = baseY - list[i].r * 0.5;
    ctx.quadraticCurveTo(x, y - list[i].r * 0.35, x + 130, baseY - list[i].r * 0.12);
  }
  ctx.lineTo(cssW + 60, baseY);
  ctx.lineTo(cssW + 60, cssH);
  ctx.closePath();
  ctx.fill();
}

function hills() {
  var horiz = ty + fin(G.GROUND_Y, 600) * scale;
  hillLine(hillsFar, horiz - 8, rgba('#8fbfe0', 0.85), rgba('#c9e2ef', 0.65), 0.10);
  hillLine(hillsNear, horiz + 4, rgba('#7fb46b', 0.95), rgba('#5d9a52', 0.9), 0.22);
  var hz = ctx.createLinearGradient(0, horiz - 130, 0, horiz + 26);
  cs(hz, 0, 'rgba(255,255,255,0)');
  cs(hz, 0.6, 'rgba(255,255,255,0.30)');
  cs(hz, 1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hz;
  ctx.fillRect(0, horiz - 130, cssW, 160);
}

/* ---------- мир ---------- */
function ground() {
  var gy = fin(G.GROUND_Y, 600);
  var x0 = camX - 80, x1 = camX + viewW + 80;
  var g = ctx.createLinearGradient(0, gy, 0, gy + 190);
  cs(g, 0, '#8fc45c'); cs(g, 0.12, '#78b04c'); cs(g, 0.35, '#936b3c'); cs(g, 1, '#6c4a26');
  ctx.fillStyle = g;
  ctx.fillRect(x0, gy, x1 - x0, 300);
  var t = ctx.createLinearGradient(0, gy - 8, 0, gy + 22);
  cs(t, 0, 'rgba(255,255,255,0.34)'); cs(t, 1, 'rgba(255,255,255,0)');
  ctx.fillStyle = t;
  ctx.fillRect(x0, gy - 8, x1 - x0, 30);
}

function grassBlades() {
  var i, g = grass, gy = fin(G.GROUND_Y, 600), sway, x;
  for (i = 0; i < g.length; i++) {
    x = g[i].x;
    if (x < camX - 60 || x > camX + viewW + 60) continue;
    sway = Math.sin(T * 1.6 + g[i].p) * 3.2;
    ctx.fillStyle = g[i].d ? rgba('#4f8f36', 0.95) : rgba('#6fb247', 0.95);
    ctx.beginPath();
    ctx.moveTo(x - 2.4, gy + 2);
    ctx.quadraticCurveTo(x + sway * 0.5, gy - g[i].h * 0.55, x + sway, gy - g[i].h);
    ctx.quadraticCurveTo(x + sway * 0.4, gy - g[i].h * 0.5, x + 2.4, gy + 2);
    ctx.closePath();
    ctx.fill();
  }
}

function softShadow(x, y, rw, rh, a) {
  x = fin(x, 0); y = fin(y, 0); rw = Math.max(1, fin(rw, 10)); rh = Math.max(1, fin(rh, 4));
  var g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rw, rh));
  cs(g, 0, rgba('#123c1e', a));
  cs(g, 1, rgba('#123c1e', 0));
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, rh / Math.max(rw, 1));
  ctx.translate(-x, -y);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, Math.max(rw, rh), 0, 6.2832); ctx.fill();
  ctx.restore();
}

function blockColors(m) {
  if (m === 'ice') return ['#e6f8ff', '#9fd9ef', '#6bb6d4'];
  if (m === 'stone') return ['#dcdce2', '#b0b0ba', '#84848f'];
  if (m === 'sand') return ['#f2e2ab', '#d9c078', '#ab8f4c'];
  return ['#e0a75c', '#c08340', '#8a5a28'];
}

function blocks() {
  var i, b, col, k, x, y, w, h, r, dmg, mat;
  var gy = fin(G.GROUND_Y, 600);
  for (i = 0; i < G.blocks.length; i++) {
    b = G.blocks[i];
    if (!b || b.dead) continue;
    /* в ядре x,y — центр блока */
    w = fin(b.w, 28); h = fin(b.h, 62); r = Math.min(7, w * 0.3, h * 0.3);
    x = fin(b.x, 1200) - w / 2;
    y = fin(b.y, gy - h / 2) - h / 2;
    mat = b.m || b.mat;
    col = blockColors(mat);

    softShadow(x + w / 2 + 4, gy + 6, w * 0.7 + 6, 10, 0.2);

    var g = ctx.createLinearGradient(x, y, x + w * 0.35, y + h);
    cs(g, 0, shade(col[0], 1.06));
    cs(g, 0.42, col[1]);
    cs(g, 1, col[2]);
    ctx.fillStyle = g;
    rr(ctx, x - 0.5, y - 0.5, w + 1, h + 1, r);
    ctx.fill();

    var hl = ctx.createLinearGradient(0, y, 0, y + h * 0.34);
    cs(hl, 0, rgba('#ffffff', 0.45));
    cs(hl, 1, rgba('#ffffff', 0));
    ctx.fillStyle = hl;
    rr(ctx, x + 1.5, y + 1, w - 3, h * 0.34, Math.min(6, h * 0.22));
    ctx.fill();

    if (mat === 'wood') {
      ctx.fillStyle = rgba('#8a5a28', 0.26);
      for (k = 1; k <= 2; k++) {
        rr(ctx, x + 3, y + h * k / 3, w - 6, Math.max(1.4, h * 0.035), 2);
        ctx.fill();
      }
    } else if (mat === 'ice') {
      ctx.fillStyle = rgba('#ffffff', 0.34);
      ctx.beginPath();
      ctx.moveTo(x + w * 0.16, y + h * 0.9);
      ctx.lineTo(x + w * 0.42, y + h * 0.14);
      ctx.lineTo(x + w * 0.58, y + h * 0.14);
      ctx.lineTo(x + w * 0.32, y + h * 0.9);
      ctx.closePath(); ctx.fill();
    } else if (mat === 'stone') {
      ctx.fillStyle = rgba('#6f6f7a', 0.22);
      var s2, sx, sy;
      for (s2 = 0; s2 < 7; s2++) {
        sx = x + 5 + (s2 * 37 % Math.max(6, w - 10));
        sy = y + 6 + (s2 * 53 % Math.max(6, h - 12));
        ctx.beginPath(); ctx.arc(sx, sy, 1.5, 0, 6.2832); ctx.fill();
      }
    } else {
      ctx.fillStyle = rgba('#9a7c3c', 0.20);
      var l2;
      for (l2 = 1; l2 <= 3; l2++) {
        rr(ctx, x + 2, y + h * l2 / 4, w - 4, 1.6, 1);
        ctx.fill();
      }
    }

    dmg = b.max ? 1 - clamp(fin(b.hp, 1) / b.max, 0, 1) : 0;
    if (dmg > 0.34) {
      ctx.fillStyle = rgba('#5a3d1e', 0.34);
      ctx.beginPath();
      ctx.moveTo(x + w * 0.42, y + 2);
      ctx.lineTo(x + w * 0.56, y + h * 0.44);
      ctx.lineTo(x + w * 0.44, y + h * 0.72);
      ctx.lineTo(x + w * 0.5, y + h - 2);
      ctx.lineTo(x + w * 0.47, y + h - 2);
      ctx.lineTo(x + w * 0.38, y + h * 0.7);
      ctx.lineTo(x + w * 0.5, y + h * 0.42);
      ctx.lineTo(x + w * 0.36, y + 2);
      ctx.closePath(); ctx.fill();
    }
    if (dmg > 0.68) {
      ctx.fillStyle = rgba('#4a3114', 0.30);
      ctx.beginPath();
      ctx.moveTo(x + w * 0.7, y + h * 0.2);
      ctx.lineTo(x + w * 0.82, y + h * 0.5);
      ctx.lineTo(x + w * 0.72, y + h * 0.8);
      ctx.lineTo(x + w * 0.78, y + h * 0.5);
      ctx.closePath(); ctx.fill();
    }
  }
}

function pig(p) {
  if (!p || p.dead) return;
  var r = Math.max(4, fin(p.r, 24)), x = fin(p.x, 1200), y = fin(p.y, 560);
  var hurt = p.max ? 1 - clamp(fin(p.hp, 1) / p.max, 0, 1) : 0;
  softShadow(x + 3, fin(G.GROUND_Y, 600) + 6, r * 1.15, r * 0.35, 0.22);

  ctx.fillStyle = shade('#8ecb45', 0.86);
  ctx.beginPath(); ctx.ellipse(x - r * 0.72, y - r * 0.72, r * 0.3, r * 0.24, -0.6, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + r * 0.72, y - r * 0.72, r * 0.3, r * 0.24, 0.6, 0, 6.2832); ctx.fill();

  var g = ctx.createRadialGradient(x - r * 0.34, y - r * 0.42, r * 0.16, x, y, r * 1.24);
  cs(g, 0, hurt > 0.5 ? '#cfe98c' : '#b9e97a');
  cs(g, 0.55, hurt > 0.5 ? '#a6cf62' : '#8ecd48');
  cs(g, 1, '#5f9a2f');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();

  ctx.fillStyle = rgba('#ffffff', 0.34);
  ctx.beginPath(); ctx.ellipse(x - r * 0.36, y - r * 0.44, r * 0.34, r * 0.22, -0.5, 0, 6.2832); ctx.fill();

  var pg = ctx.createRadialGradient(x, y + r * 0.16, r * 0.06, x, y + r * 0.22, r * 0.42);
  cs(pg, 0, '#a8dc63'); cs(pg, 1, '#77ab3a');
  ctx.fillStyle = pg;
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.22, r * 0.34, r * 0.27, 0, 0, 6.2832); ctx.fill();
  ctx.fillStyle = rgba('#3f6a1c', 0.72);
  ctx.beginPath(); ctx.ellipse(x - r * 0.12, y + r * 0.22, r * 0.075, r * 0.10, 0, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + r * 0.12, y + r * 0.22, r * 0.075, r * 0.10, 0, 0, 6.2832); ctx.fill();

  var ex = r * 0.36, ey = -r * 0.22, er = r * 0.19;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(x - ex, y + ey, er, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.arc(x + ex, y + ey, er, 0, 6.2832); ctx.fill();
  ctx.fillStyle = '#2c2c34';
  ctx.beginPath(); ctx.arc(x - ex + er * 0.18, y + ey + er * 0.1, er * 0.48, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.arc(x + ex + er * 0.18, y + ey + er * 0.1, er * 0.48, 0, 6.2832); ctx.fill();
  ctx.fillStyle = rgba('#ffffff', 0.92);
  ctx.beginPath(); ctx.arc(x - ex + er * 0.34, y + ey - er * 0.16, er * 0.16, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.arc(x + ex + er * 0.34, y + ey - er * 0.16, er * 0.16, 0, 6.2832); ctx.fill();

  ctx.fillStyle = rgba('#4d7a24', 0.85);
  rr(ctx, x - ex - er * 0.85, y + ey - er * 1.7, er * 1.7, er * 0.5, er * 0.25); ctx.fill();
  rr(ctx, x + ex - er * 0.85, y + ey - er * 1.7, er * 1.7, er * 0.5, er * 0.25); ctx.fill();

  if (hurt > 0.45) {
    ctx.fillStyle = rgba('#9c3b3b', 0.32);
    ctx.beginPath(); ctx.arc(x + r * 0.62, y + r * 0.1, r * 0.16, 0, 6.2832); ctx.fill();
  }
  if (hurt > 0.65) {
    ctx.fillStyle = '#ffffff';
    rr(ctx, x - r * 0.3, y - r * 0.05, r * 0.6, r * 0.16, r * 0.06);
    ctx.fill();
  }
}

function birdColors(t) {
  if (t === 'yellow') return ['#ffe487', '#f5c33b', '#c1901a'];
  if (t === 'blue') return ['#a5dcff', '#4fa8e8', '#2a6ea8'];
  if (t === 'black') return ['#6a6a76', '#3c3c48', '#20202a'];
  return ['#ff9a8f', '#e8453c', '#a82a24'];
}

function birdBody(x, y, r, type, ang) {
  x = fin(x, 0); y = fin(y, 0); r = Math.max(4, fin(r, 22));
  var col = birdColors(type);
  ctx.save();
  ctx.translate(x, y);
  if (ang && isFinite(ang)) ctx.rotate(ang);

  ctx.fillStyle = shade(col[2], 1.05);
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, -r * 0.12);
  ctx.quadraticCurveTo(-r * 1.65, -r * 0.62, -r * 1.95, -r * 0.06);
  ctx.quadraticCurveTo(-r * 1.5, r * 0.1, -r * 0.7, r * 0.16);
  ctx.closePath(); ctx.fill();

  var g = ctx.createRadialGradient(-r * 0.36, -r * 0.42, r * 0.14, 0, 0, r * 1.26);
  cs(g, 0, col[0]); cs(g, 0.55, col[1]); cs(g, 1, col[2]);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.2832); ctx.fill();

  var bg = ctx.createRadialGradient(r * 0.05, r * 0.42, r * 0.08, r * 0.05, r * 0.42, r * 0.66);
  cs(bg, 0, rgba('#ffffff', 0.72)); cs(bg, 1, rgba('#ffffff', 0));
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.ellipse(r * 0.05, r * 0.42, r * 0.6, r * 0.42, 0, 0, 6.2832); ctx.fill();

  ctx.fillStyle = shade(col[1], 1.05);
  ctx.beginPath();
  ctx.moveTo(-r * 0.1, -r * 0.92);
  ctx.quadraticCurveTo(-r * 0.05, -r * 1.6, r * 0.42, -r * 1.2);
  ctx.quadraticCurveTo(r * 0.12, -r * 1.05, r * 0.18, -r * 0.86);
  ctx.closePath(); ctx.fill();

  var kg = ctx.createLinearGradient(r * 0.6, -r * 0.2, r * 1.5, r * 0.3);
  cs(kg, 0, '#ffd35c'); cs(kg, 1, '#e8961c');
  ctx.fillStyle = kg;
  ctx.beginPath();
  ctx.moveTo(r * 0.58, -r * 0.16);
  ctx.quadraticCurveTo(r * 1.5, -r * 0.24, r * 1.52, r * 0.02);
  ctx.quadraticCurveTo(r * 1.1, r * 0.2, r * 0.58, r * 0.24);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = rgba('#b46a10', 0.55);
  ctx.beginPath();
  ctx.moveTo(r * 0.6, r * 0.04);
  ctx.quadraticCurveTo(r * 1.1, r * 0.06, r * 1.5, r * 0.02);
  ctx.quadraticCurveTo(r * 1.1, r * 0.2, r * 0.6, r * 0.22);
  ctx.closePath(); ctx.fill();

  var ex = r * 0.36, ey = -r * 0.3, er = r * 0.3;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(ex, ey, er, 0, 6.2832); ctx.fill();
  var ig = ctx.createRadialGradient(ex + er * 0.2, ey, er * 0.1, ex, ey, er * 0.62);
  cs(ig, 0, '#4a4a56'); cs(ig, 1, '#1c1c22');
  ctx.fillStyle = ig;
  ctx.beginPath(); ctx.arc(ex + er * 0.16, ey + er * 0.06, er * 0.6, 0, 6.2832); ctx.fill();
  ctx.fillStyle = rgba('#ffffff', 0.95);
  ctx.beginPath(); ctx.arc(ex + er * 0.4, ey - er * 0.28, er * 0.22, 0, 6.2832); ctx.fill();

  ctx.fillStyle = rgba('#2a2a30', 0.9);
  ctx.save();
  ctx.translate(ex + er * 0.05, ey - er * 1.28);
  ctx.rotate(-0.42);
  rr(ctx, -er * 1.1, -er * 0.3, er * 2.1, er * 0.62, er * 0.31); ctx.fill();
  ctx.restore();

  if (type === 'black') {
    var f = 0.55 + Math.abs(Math.sin(T * 11)) * 0.45;
    var fg = ctx.createRadialGradient(-r * 0.05, -r * 1.5, 0, -r * 0.05, -r * 1.5, r * 0.5);
    cs(fg, 0, rgba('#fff3b0', f)); cs(fg, 1, rgba('#ff8a1a', 0));
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.arc(-r * 0.05, -r * 1.5, r * 0.5, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#4a4a52';
    rr(ctx, -r * 0.14, -r * 1.34, r * 0.1, r * 0.42, r * 0.05);
    ctx.fill();
  }
  ctx.restore();
}

function birds() {
  var i, b, t, x, y, r, ang, gy = fin(G.GROUND_Y, 600);
  var R0 = (G.SLING_X === undefined ? 200 : G.SLING_X);

  /* запас: в ядре это массив СТРОК ('red', 'yellow'…) */
  for (i = 0; i < (G.birdsLeft || []).length; i++) {
    b = G.birdsLeft[i];
    if (!b) continue;
    if (typeof b === 'string') {
      t = b;
      r = ((G.BIRDS && G.BIRDS[t]) ? G.BIRDS[t].r : 22) * 0.9;
      x = R0 - 76 - i * 46; y = gy - r - 4;
      softShadow(x + 2, gy + 6, r * 1.1, r * 0.3, 0.18);
      birdBody(x, y, r, t, 0);
      continue;
    }
    if (b.state === 'gone') continue;
    if (G.active && b === G.active) continue;
    x = fin(b.x, R0 - 76 - i * 46); y = fin(b.y, gy - 26); r = fin(b.r, 22) * 0.9;
    softShadow(x + 2, gy + 6, r * 1.1, r * 0.3, 0.18);
    birdBody(x, y, r, b.type || 'red', 0);
  }

  /* птица на рогатке */
  if (G.active && typeof G.active === 'object') {
    var a = G.active;
    var dx = fin(a.x, fin(G.SLING_X, 200)) - fin(G.SLING_X, 200);
    var dy = fin(a.y, fin(G.SLING_Y, 452)) - fin(G.SLING_Y, 452);
    ang = Math.atan2(-dy, -dx) * 0.5;
    softShadow(fin(a.x, fin(G.SLING_X, 200)) + 2, gy + 8, fin(a.r, 22) * 1.2, fin(a.r, 22) * 0.32, 0.2);
    birdBody(a.x, a.y, fin(a.r, 22), a.type || 'red', ang);
  }

  /* летящие */
  var list = [], k;
  if (G.flying && !G.flying.gone) list.push(G.flying);
  for (k = 0; k < (G.extraFlyers || []).length; k++) if (G.extraFlyers[k] && !G.extraFlyers[k].gone) list.push(G.extraFlyers[k]);
  for (k = 0; k < list.length; k++) {
    b = list[k];
    ang = Math.atan2(fin(b.vy, 0), fin(b.vx, 0)) * 0.7;
    if (fin(b.y, 0) < gy - 4) softShadow(fin(b.x, 0) + 4, gy + 6, fin(b.r, 22) * 1.4, fin(b.r, 22) * 0.3, 0.16);
    birdBody(b.x, b.y, fin(b.r, 22), b.type || 'red', ang);
  }
}

function slingPost() {
  var bx = fin(G.SLING_X, 200), by = fin(G.SLING_Y, 452), gy = fin(G.GROUND_Y, 600);
  ctx.fillStyle = rgba('#123c1e', 0.22);
  ctx.beginPath(); ctx.ellipse(bx + 6, gy + 8, 26, 9, 0, 0, 6.2832); ctx.fill();

  var g = ctx.createLinearGradient(bx - 12, by, bx + 14, gy);
  cs(g, 0, '#b07a3c'); cs(g, 0.45, '#8a5a28'); cs(g, 1, '#5f3d18');
  ctx.lineCap = 'round';
  ctx.strokeStyle = g;
  ctx.lineWidth = 17;
  ctx.beginPath();
  ctx.moveTo(bx, gy);
  ctx.quadraticCurveTo(bx - 3, by + 60, bx, by);
  ctx.stroke();

  ctx.lineWidth = 13;
  ctx.beginPath();
  ctx.moveTo(bx, by + 4);
  ctx.quadraticCurveTo(bx - 26, by - 22, bx - 27, by - 36);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bx, by + 4);
  ctx.quadraticCurveTo(bx + 26, by - 20, bx + 27, by - 34);
  ctx.stroke();

  ctx.fillStyle = rgba('#ffffff', 0.16);
  ctx.beginPath(); ctx.ellipse(bx - 4, by + 90, 4, 46, 0.02, 0, 6.2832); ctx.fill();
}

function slingBands() {
  var a = G.active;
  if (!a || typeof a !== 'object') return;
  var bx = fin(G.SLING_X, 200), by = fin(G.SLING_Y, 452);
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#4a3020';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(bx + 26, by - 34);
  ctx.lineTo(fin(a.x, bx), fin(a.y, by));
  ctx.stroke();
  ctx.strokeStyle = '#5c3c26';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(bx - 27, by - 36);
  ctx.lineTo(fin(a.x, bx), fin(a.y, by));
  ctx.stroke();
}

function aimDots() {
  var a = G.active;
  if (!a || typeof a !== 'object') return;
  var bx = fin(G.SLING_X, 200), by = fin(G.SLING_Y, 452);
  var dx = fin(a.x, bx) - bx, dy = fin(a.y, by) - by;
  if (Math.sqrt(dx * dx + dy * dy) < 8) return;
  var pw = fin(G.POWER, 7.3), gr = fin(G.GRAVITY, 1400);
  var vx = -dx * pw, vy = -dy * pw;
  var count = (G.has && G.has('goggles')) ? 34 : 18;
  var X = fin(a.x, bx), Y = fin(a.y, by), dt = 0.045, i;
  for (i = 0; i < count; i++) {
    var k = 1 - i / count;
    ctx.fillStyle = rgba('#ffffff', 0.06 + k * 0.5);
    ctx.beginPath();
    ctx.arc(X, Y, 2.4 + k * 2.2, 0, 6.2832);
    ctx.fill();
    vy += gr * dt;
    X += vx * dt;
    Y += vy * dt;
    if (Y > fin(G.GROUND_Y, 600)) break;
  }
}

function trail() {
  var b = G.flying;
  if (!b || !b.trail || b.trail.length < 2) return;
  var i, n = b.trail.length;
  for (i = 1; i < n; i++) {
    var k = i / n;
    ctx.fillStyle = rgba('#ffffff', 0.05 + k * 0.34);
    ctx.beginPath();
    ctx.arc(fin(b.trail[i].x, 0), fin(b.trail[i].y, 0), 1.2 + k * 2.6, 0, 6.2832);
    ctx.fill();
  }
}

function effects() {
  var i, p, k;
  for (i = 0; i < (G.parts || []).length; i++) {
    p = G.parts[i];
    if (!p || p.life <= 0) continue;
    k = clamp(p.life, 0, 1);
    ctx.fillStyle = rgba(p.color || '#c9a06a', 0.25 + k * 0.7);
    ctx.beginPath();
    ctx.arc(fin(p.x, 0), fin(p.y, 0), fin(p.size, 3) * (0.5 + k * 0.6), 0, 6.2832);
    ctx.fill();
  }
  for (i = 0; i < fx.length; i++) {
    p = fx[i];
    var t = clamp(p.life, 0, 1);
    if (p.kind === 'ring') {
      ctx.strokeStyle = rgba(p.col, 0.5 * t);
      ctx.lineWidth = 9 * t;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.stroke();
      ctx.fillStyle = rgba('#fff6dd', 0.16 * t);
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.7, 0, 6.2832); ctx.fill();
    } else {
      var gg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s * 2.4);
      cs(gg, 0, rgba(p.col, 0.9 * t)); cs(gg, 1, rgba(p.col, 0));
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.s * 2.4, 0, 6.2832); ctx.fill();
    }
  }
}

function pops() {
  var i, p, k, r;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (i = 0; i < (G.pops || []).length; i++) {
    p = G.pops[i];
    if (!p || p.life <= 0) continue;
    k = clamp(p.life, 0, 1);
    r = rgb(p.color || '#ffe07a');
    ctx.font = 'bold ' + Math.round(20 + k * 8) + 'px sans-serif';
    ctx.fillStyle = 'rgba(' + Math.round(r[0] * 0.45) + ',' + Math.round(r[1] * 0.35) + ',' + Math.round(r[2] * 0.2) + ',' + (0.35 * k) + ')';
    ctx.fillText(p.text || '', fin(p.x, 0) + 2, fin(p.y, 0) + 2);
    ctx.fillStyle = rgba(p.color || '#ffe07a', 0.25 + k * 0.75);
    ctx.fillText(p.text || '', fin(p.x, 0), fin(p.y, 0));
  }
  ctx.restore();
}

/* ---------- кадр ---------- */
function draw() {
  if (!cv) { if (!init()) return; }
  if (!cssW || !cssH) resize();
  try {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, cssW, cssH);
    sky();
    sun();
    drawClouds();
    hills();
    ctx.save();
    ctx.translate(tx + shakeX, ty + shakeY);
    ctx.scale(scale, scale);
    ground();
    grassBlades();
    slingPost();
    slingBands();
    blocks();
    var i;
    for (i = 0; i < (G.pigs || []).length; i++) pig(G.pigs[i]);
    birds();
    trail();
    aimDots();
    effects();
    pops();
    ctx.restore();
  } catch (e) {
    console.error('draw: ' + ((e && e.message) || e));
  }
}

return {
  init: init, resize: resize, draw: draw, tick: tick,
  follow: follow, setCam: setCam, snap: snap, toWorld: toWorld,
  shake: shake, burst: burst, rebuild: build,
  getScale: function () { return scale; },
  getCamX: function () { return camX; },
  getCamY: function () { return ty; }
};
})();
