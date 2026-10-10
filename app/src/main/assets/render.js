/* ============================================================
   ANGRY BIRDS — графика v13 «МУЛЬТИК + ЖИВОЕ НЕБО»
   Один файл, без внешних зависимостей. Экспорт: window.ABR

   ЧТО ИСПРАВЛЕНО И ДОБАВЛЕНО
   1) КАМЕРА. Раньше цель ставилась один раз при выстреле и не
      возвращалась: рогатка уезжала за кадр навсегда. Теперь автомат
      из трёх режимов: follow -> wait -> home. Домой камера едет
      плавно, с посадкой так, что видны и рогатка, и постройка.
   2) УПАВШАЯ ПТИЦА НЕ ИСЧЕЗАЕТ. Ход завершён — птица мягко садится
      и остаётся лежать на земле (дышит, глаз прикрыт), бледнеет
      постепенно. Прежняя позиция запоминается до того, как ядро
      уберёт объект.
   3) СЛЕДУЮЩАЯ ПТИЦА ПРЫГАЕТ НА РОГАТКУ по дуге, а не появляется
      рывком: подскок, надувание в воздухе, приседание при посадке.
   4) НЕБО. Три типа облаков: белые, серые, чёрные тучи. Если облако
      накрывает солнце — сцена темнеет: белое чуть, серое заметно,
      чёрное до сумерек. В чёрную тучу — вспышка молнии. Затемнение
      плавное, по всей сцене, включая землю, блоки и персонажей.
   5) МУЛЬТЯШНАЯ ГРАФИКА: тёмный контур по телам, плоские заливки
      в два слоя, блики, крупные глаза с искрой, лапки, крыло,
      хохолок, тени, трава, цветы, кусты, камни, дымка горизонта.
   6) АНИМАЦИИ: птицы в запасе прыгают, дышат и мигают; птица на
      рогатке дышит и приседает при натяжении; в полёте вращается и
      взмахивает крылом; свиньи дышат, шевелят ушами, мигают, потеют
      при уроне; при попадании — перья, щепки, осколки, дым, пыль,
      кольцо удара и лёгкая тряска кадра.

   Совместимость: ES5 (без стрелок, let/const, шаблонов) — работает
   в любом WebView. Публичный API прежний: init, resize, draw, tick,
   follow, setCam, snap, toWorld, shake, burst, rebuild.
   ============================================================ */
window.ABR = (function () {
'use strict';
var G = window.ABG;
if (!G) { console.error('ABG не загружен'); return null; }

/* ---------- мост имён: срабатывает раньше ui.js ---------- */
try {
  if (typeof G.hasAch !== 'function' && typeof G.achDone === 'function') {
    G.hasAch = function (id) { return G.achDone(id); };
  }
  if (typeof G.achDone !== 'function' && typeof G.hasAch === 'function') {
    G.achDone = G.hasAch;
  }
} catch (e) { }

/* ---------- утилиты ---------- */
function $(id) { return document.getElementById(id); }
function rnd(a, b) { return a + Math.random() * (b - a); }
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function fin(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
function dist(x1, y1, x2, y2) { var a = x2 - x1, b = y2 - y1; return Math.sqrt(a * a + b * b); }
function seedGen(s) {
  return function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

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
  return 'rgb(' + clamp(Math.round(r[0] * k), 0, 255) + ',' +
    clamp(Math.round(r[1] * k), 0, 255) + ',' + clamp(Math.round(r[2] * k), 0, 255) + ')';
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
/* тёмный контур — за это и держится «мультяшность» */
function ink(k) { ctx.strokeStyle = 'rgba(46,32,24,' + (k === undefined ? 0.34 : k) + ')'; }
function inkW(w) { ctx.lineWidth = w; ctx.lineJoin = 'round'; }

/* ---------- кадр, камера, сцена ---------- */
var cv = null, ctx = null, dpr = 1;
var cssW = 0, cssH = 0, scale = 1, viewW = 0, viewH = 0;
var camX = 0, camT = 0, tx = 0, ty = 0, T = 0;
var shakeX = 0, shakeY = 0, shk = 0;
var mode = 'home', idle = 0;

var AREA_W = 1420, SHARE_LAND = 0.82, SHARE_PORT = 0.84;

/* облака и фон */
var cl = [], hillsFar = [], hillsMid = [], hillsNear = [], grass = [], flowers = [], bushes = [], pebbles = [];
var ambient = 1, ambT = 1, boltT = 0, bolt = 0, boltPath = null;

/* персонажи и эффекты */
var fx = [], ghosts = [], prevFly = null, lastLevel = -1;
var lastActive = null, hopT = 1, hopFrom = { x: 0, y: 0 };
var pigHp = [], blkHp = [], lastPop = { x: 0, y: 0 };

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
  var i, R = seedGen(1337);
  cl = []; grass = []; hillsFar = []; hillsMid = []; hillsNear = [];
  flowers = []; bushes = []; pebbles = [];

  /* облака: тон 0 — белое, 1 — серое, 2 — туча */
  for (i = 0; i < 16; i++) {
    var tone = i % 5 === 0 ? 2 : (i % 3 === 0 ? 1 : 0);
    cl.push({
      x: R() * 3000 - 300,
      y: 40 + R() * 240,
      s: 0.55 + R() * 1.15,
      v: 5 + R() * 13,
      tone: tone
    });
  }
  for (i = 0; i < 360; i++) {
    grass.push({ x: R() * 2600, h: 10 + R() * 18, p: R() * 6.28, d: R() < 0.5 });
  }
  for (i = 0; i < 70; i++) {
    flowers.push({ x: R() * 2600, c: R() < 0.5 ? '#ffd95e' : (R() < 0.5 ? '#ff8fa3' : '#f2f6ff'), p: R() * 6.28, s: 0.7 + R() * 0.7 });
  }
  for (i = 0; i < 34; i++) bushes.push({ x: R() * 2600, s: 0.7 + R() * 0.9, h: R() < 0.5 ? 2 : 3 });
  for (i = 0; i < 90; i++) pebbles.push({ x: R() * 2600, r: 1.5 + R() * 4, c: R() < 0.5 ? '#b9a288' : '#8d8378' });
  for (i = 0; i < 20; i++) hillsFar.push({ x: i * 170 + R() * 80 - 40, r: 130 + R() * 190 });
  for (i = 0; i < 16; i++) hillsMid.push({ x: i * 210 + R() * 90 - 45, r: 110 + R() * 150 });
  for (i = 0; i < 13; i++) hillsNear.push({ x: i * 250 + R() * 100 - 50, r: 90 + R() * 130 });
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

  var sW = cssW / AREA_W;
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
function maxCam() { return Math.max(0, fin(G.WORLD_W, 2100) - viewW); }
function snap() { camX = camT; layout(); }
function setCam(v) { camT = clamp(fin(v, 0), 0, maxCam()); camX = camT; layout(); }
function follow(x) { camT = clamp(fin(x, 0) - viewW * 0.42, 0, maxCam()); }
function homeCam() { return clamp(fin(G.SLING_X, 200) - viewW * 0.26, 0, maxCam()); }

function toWorld(cx, cy) {
  if (!cv) return { x: 0, y: 0 };
  var r = cv.getBoundingClientRect();
  return { x: ((cx - r.left) - tx - shakeX) / scale, y: ((cy - r.top) - ty - shakeY) / scale };
}
function shake(v) { shk = Math.min(20, (shk || 0) + (v || 0)); }

/* ============================================================
   КАМЕРА: follow -> wait -> home
   ============================================================ */
function camUpdate(dt) {
  var f = G.flying, home = homeCam();
  var vx = f ? fin(f.vx, 0) : 0, vy = f ? fin(f.vy, 0) : 0;
  var moving = !!f && !f.gone && (Math.abs(vx) + Math.abs(vy) > 1.5);

  if (moving) {
    mode = 'follow'; idle = 0;
    camT = clamp(fin(f.x, 0) - viewW * 0.42, 0, maxCam());
  } else if (mode === 'follow') {
    idle += dt;
    if (idle > 0.55) mode = 'home';       /* птица легла — едем назад */
  } else if (!f) {
    mode = 'home';
  }

  if (mode === 'home') camT += (home - camT) * Math.min(1, dt * 2.4);
  camX += (camT - camX) * Math.min(1, dt * 7);
  layout();
}

/* ============================================================
   СВЕТ: облака над солнцем затемняют сцену
   ============================================================ */
function sunScreen() { return { x: cssW * 0.83, y: cssH * 0.14, r: Math.min(cssW, cssH) * 0.055 }; }
function cloudScreen(c) {
  var par = (cssH > cssW) ? 0.16 : 0.26;
  return { x: c.x - camX * par, y: c.y, r: 34 * c.s };
}

function ambUpdate(dt) {
  var s = sunScreen(), i, A = 1, c, p, cover, tone, k;
  for (i = 0; i < cl.length; i++) {
    c = cl[i]; p = cloudScreen(c);
    if (p.x < -400 || p.x > cssW + 400) continue;
    var dy = Math.abs(p.y - s.y);
    if (dy > p.r * 1.9) continue;
    var dx = Math.abs(p.x - s.x);
    if (dx > p.r * 3.1) continue;
    cover = (1 - dx / (p.r * 3.1)) * (1 - dy / (p.r * 1.9));
    tone = c.tone === 2 ? 0.44 : (c.tone === 1 ? 0.24 : 0.10);
    k = 1 - cover * tone;
    if (k < A) A = k;
  }
  ambT = A;
  ambient += (ambT - ambient) * Math.min(1, dt * 2.0);

  /* молния — только когда тёмная туча на солнце */
  boltT -= dt;
  if (bolt > 0) bolt = Math.max(0, bolt - dt * 3.2);
  if (ambient < 0.72 && boltT <= 0) {
    boltT = rnd(4.5, 11);
    bolt = 0.85;
    boltPath = [];
    var bx = rnd(cssW * 0.15, cssW * 0.85), by = rnd(40, 150), y = by;
    boltPath.push({ x: bx, y: by });
    while (y < cssH * 0.45) { y += rnd(26, 58); boltPath.push({ x: bx + rnd(-26, 26), y: y }); }
  }
}

/* ============================================================
   ЧАСТИЦЫ
   ============================================================ */
function spawn(kind, x, y, opt) {
  opt = opt || {};
  fx.push({
    kind: kind, x: fin(x, 0), y: fin(y, 0),
    vx: fin(opt.vx, 0), vy: fin(opt.vy, 0),
    life: 1, decay: fin(opt.decay, 1.4),
    col: opt.col || '#ffffff', size: fin(opt.size, 4),
    rot: rnd(0, 6.28), spin: rnd(-6, 6), g: fin(opt.g, 900)
  });
}
function burst(x, y, col, big) {
  var i, n = big ? 20 : 11, a, sp;
  for (i = 0; i < n; i++) {
    a = rnd(0, 6.28); sp = rnd(70, big ? 380 : 250);
    spawn('spark', x, y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, col: col || '#ffd764', size: rnd(2, 5) });
  }
  fx.push({ kind: 'ring', x: fin(x, 0), y: fin(y, 0), life: 1, decay: 2.4, r: big ? 26 : 15, col: col || '#fff2b8' });
  for (i = 0; i < (big ? 8 : 4); i++) {
    spawn('smoke', x + rnd(-14, 14), y + rnd(-12, 12), { vx: rnd(-40, 40), vy: rnd(-70, -20), col: '#b9b2a6', size: rnd(12, 26), decay: 0.85, g: -30 });
  }
  shake(big ? 13 : 6);
}
function feathers(x, y, n) {
  var i;
  for (i = 0; i < (n || 5); i++) {
    spawn('feather', x + rnd(-10, 10), y + rnd(-10, 10), {
      vx: rnd(-90, 90), vy: rnd(-140, -30), col: i % 3 ? '#ffffff' : '#ffe9c9', size: rnd(4, 8), decay: 0.6, g: 120
    });
  }
}
function debris(x, y, mat) {
  var col = mat === 'ice' ? '#cfeeff' : (mat === 'stone' ? '#cfcfd6' : (mat === 'sand' ? '#e6d29a' : '#c98b45'));
  var i;
  for (i = 0; i < 8; i++) {
    spawn('chip', x + rnd(-8, 8), y + rnd(-8, 8), { vx: rnd(-160, 160), vy: rnd(-220, -40), col: col, size: rnd(3, 7), decay: 0.9 });
  }
}

/* ============================================================
   ФОН
   ============================================================ */
function sky() {
  var g = ctx.createLinearGradient(0, 0, 0, cssH);
  cs(g, 0, '#2f6fc4');
  cs(g, 0.45, '#63a8dd');
  cs(g, 0.78, '#a9d6ee');
  cs(g, 1, '#e8f0da');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cssW, cssH);
}

function sun() {
  var s = sunScreen();
  ctx.save();
  ctx.globalAlpha = clamp(0.30 + ambient * 0.70, 0, 1);
  var gl = ctx.createRadialGradient(s.x, s.y, s.r * 0.4, s.x, s.y, s.r * 7);
  cs(gl, 0, 'rgba(255,247,214,0.95)');
  cs(gl, 0.16, 'rgba(255,238,180,0.42)');
  cs(gl, 0.45, 'rgba(255,232,160,0.14)');
  cs(gl, 1, 'rgba(255,230,150,0)');
  ctx.fillStyle = gl;
  ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 7, 0, 6.2832); ctx.fill();

  /* bloom: тёплое свечение складывается со светом неба */
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.22 * ambient;
  var bg = ctx.createRadialGradient(s.x, s.y, s.r * 0.2, s.x, s.y, s.r * 3.4);
  cs(bg, 0, 'rgba(255,241,196,0.85)');
  cs(bg, 1, 'rgba(255,222,140,0)');
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 3.4, 0, 6.2832); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  var cg = ctx.createRadialGradient(s.x - s.r * 0.3, s.y - s.r * 0.3, s.r * 0.15, s.x, s.y, s.r);
  cs(cg, 0, '#fffdf2'); cs(cg, 0.6, '#ffeaa0'); cs(cg, 1, '#ffd873');
  ctx.fillStyle = cg;
  ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.2832); ctx.fill();
  ctx.restore();
}

function puff(x, y, r, tone) {
  var top = tone === 2 ? '#8e97a6' : (tone === 1 ? '#e2e8ee' : '#ffffff');
  var mid = tone === 2 ? '#6f7b8c' : (tone === 1 ? '#cfd8e2' : '#f4fbff');
  var bot = tone === 2 ? '#4c5566' : (tone === 1 ? '#a9b6c4' : '#cfe4f2');
  var g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.45, r * 0.15, x, y, r * 1.15);
  cs(g, 0, rgba(top, 0.99));
  cs(g, 0.62, rgba(mid, 0.95));
  cs(g, 1, rgba(bot, 0.78));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
}

function oneCloud(c) {
  var p = cloudScreen(c);
  if (p.x < -460 || p.x > cssW + 460) return;
  var r = p.r, tn = c.tone;
  ctx.save();
  ctx.globalAlpha = 0.92;
  /* тень под облаком */
  ctx.fillStyle = rgba(c.tone === 2 ? '#2f3746' : '#b8d2e4', 0.42);
  ctx.beginPath(); ctx.ellipse(p.x, p.y + r * 0.9, r * 2.6, r * 0.5, 0, 0, 6.2832); ctx.fill();
  ctx.restore();

  ctx.save();
  ink(tn === 2 ? 0.4 : 0.14); inkW(2.4);
  puff(p.x - r * 1.28, p.y + r * 0.18, r * 0.94, tn);
  puff(p.x + r * 1.24, p.y + r * 0.24, r * 0.84, tn);
  puff(p.x - r * 0.36, p.y - r * 0.24, r * 1.12, tn);
  puff(p.x + r * 0.48, p.y + r * 0.04, r * 0.98, tn);
  puff(p.x, p.y + r * 0.42, r * 1.3, tn);
  ctx.restore();

  if (tn === 0) {   /* белое облако — светлая кромка */
    ctx.fillStyle = rgba('#ffffff', 0.5);
    ctx.beginPath(); ctx.ellipse(p.x - r * 0.5, p.y - r * 0.6, r * 0.8, r * 0.4, -0.3, 0, 6.2832); ctx.fill();
  } else if (tn === 2) {  /* туча — подсветка снизу */
    ctx.fillStyle = rgba('#c9b7a0', 0.22);
    ctx.beginPath(); ctx.ellipse(p.x, p.y + r * 0.95, r * 1.9, r * 0.34, 0, 0, 6.2832); ctx.fill();
  }
}

function drawClouds() { var i; for (i = 0; i < cl.length; i++) oneCloud(cl[i]); }

function boltDraw() {
  if (bolt <= 0 || !boltPath || boltPath.length < 2) return;
  ctx.save();
  ctx.globalAlpha = bolt;
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(boltPath[0].x, boltPath[0].y);
  for (var i = 1; i < boltPath.length; i++) ctx.lineTo(boltPath[i].x, boltPath[i].y);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(180,210,255,0.5)';
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.globalAlpha = bolt * 0.22;
  ctx.fillStyle = '#eaf3ff';
  ctx.fillRect(0, 0, cssW, cssH);
  ctx.restore();
}

function hillLine(list, baseY, colTop, colBot, par) {
  var i, x, y;
  var g = ctx.createLinearGradient(0, baseY - 150, 0, cssH);
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
  hillLine(hillsFar, horiz - 14, rgba('#9cc6e2', 0.9), rgba('#d3e6f1', 0.7), 0.07);
  hillLine(hillsMid, horiz - 6, rgba('#8fb9d0', 0.9), rgba('#bcdce9', 0.8), 0.15);
  hillLine(hillsNear, horiz + 4, rgba('#7fb46b', 0.95), rgba('#5d9a52', 0.92), 0.26);
  var hz = ctx.createLinearGradient(0, horiz - 150, 0, horiz + 30);
  cs(hz, 0, 'rgba(255,255,255,0)');
  cs(hz, 0.6, 'rgba(255,255,255,0.32)');
  cs(hz, 1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hz;
  ctx.fillRect(0, horiz - 150, cssW, 180);
}

/* ============================================================
   ЗЕМЛЯ И МЕЛОЧИ
   ============================================================ */
function ground() {
  var gy = fin(G.GROUND_Y, 600);
  var x0 = camX - 80, x1 = camX + viewW + 80;
  var g = ctx.createLinearGradient(0, gy, 0, gy + 200);
  cs(g, 0, '#94c95f'); cs(g, 0.10, '#7cb34e'); cs(g, 0.34, '#966d3e'); cs(g, 1, '#6a4824');
  ctx.fillStyle = g;
  ctx.fillRect(x0, gy, x1 - x0, 320);
  var t = ctx.createLinearGradient(0, gy - 9, 0, gy + 24);
  cs(t, 0, 'rgba(255,255,255,0.36)'); cs(t, 1, 'rgba(255,255,255,0)');
  ctx.fillStyle = t;
  ctx.fillRect(x0, gy - 9, x1 - x0, 33);
}

function inView(x) { return x > camX - 70 && x < camX + viewW + 70; }

function pebbleDraw() {
  var i, p, gy = fin(G.GROUND_Y, 600);
  ctx.fillStyle = rgba('#7c6a52', 0.5);
  for (i = 0; i < pebbles.length; i++) {
    p = pebbles[i];
    if (!inView(p.x)) continue;
    ctx.fillStyle = rgba(p.c, 0.55);
    ctx.beginPath(); ctx.ellipse(p.x, gy + 20 + (i % 5) * 9, p.r, p.r * 0.6, 0, 0, 6.2832); ctx.fill();
  }
}

function bushesDraw() {
  var i, b, gy = fin(G.GROUND_Y, 600), k, cx, r;
  for (i = 0; i < bushes.length; i++) {
    b = bushes[i];
    if (!inView(b.x)) continue;
    for (k = 0; k < b.h; k++) {
      cx = b.x + (k - (b.h - 1) / 2) * 26 * b.s;
      r = 22 * b.s * (k === Math.floor(b.h / 2) ? 1.15 : 0.95);
      var g = ctx.createRadialGradient(cx - r * 0.3, gy - r * 0.9, r * 0.2, cx, gy - r * 0.4, r * 1.2);
      cs(g, 0, '#7cc24f'); cs(g, 1, '#3f7a2c');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, gy - r * 0.5, r, 0, 6.2832); ctx.fill();
    }
  }
}

function grassDraw() {
  var i, x, gy = fin(G.GROUND_Y, 600), sway;
  for (i = 0; i < grass.length; i++) {
    x = grass[i].x;
    if (!inView(x)) continue;
    sway = Math.sin(T * 1.7 + grass[i].p) * 3.4;
    ctx.fillStyle = grass[i].d ? rgba('#4f8f36', 0.95) : rgba('#71b449', 0.95);
    ctx.beginPath();
    ctx.moveTo(x - 2.4, gy + 2);
    ctx.quadraticCurveTo(x + sway * 0.5, gy - grass[i].h * 0.55, x + sway, gy - grass[i].h);
    ctx.quadraticCurveTo(x + sway * 0.4, gy - grass[i].h * 0.5, x + 2.4, gy + 2);
    ctx.closePath();
    ctx.fill();
  }
  for (i = 0; i < flowers.length; i++) {
    x = flowers[i].x;
    if (!inView(x)) continue;
    var bob = Math.sin(T * 2 + flowers[i].p) * 2;
    ctx.strokeStyle = 'rgba(60,110,40,0.8)';
    ctx.lineWidth = 1.7;
    ctx.beginPath(); ctx.moveTo(x, gy + 2); ctx.lineTo(x + bob, gy - 14 * flowers[i].s); ctx.stroke();
    ctx.fillStyle = flowers[i].c;
    ctx.beginPath(); ctx.arc(x + bob, gy - 16 * flowers[i].s, 3.1 * flowers[i].s, 0, 6.2832); ctx.fill();
    ctx.fillStyle = rgba('#ffffff', 0.7);
    ctx.beginPath(); ctx.arc(x + bob - 0.8, gy - 16.9 * flowers[i].s, 1.1 * flowers[i].s, 0, 6.2832); ctx.fill();
  }
}

function softShadow(x, y, rw, rh, a) {
  x = fin(x, 0); y = fin(y, 0);
  rw = Math.max(1, fin(rw, 10)); rh = Math.max(1, fin(rh, 4));
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

/* ============================================================
   БЛОКИ
   ============================================================ */
function blockColors(m) {
  if (m === 'ice') return ['#eefaff', '#a9dff2', '#6fb8d6'];
  if (m === 'stone') return ['#e2e2e8', '#b6b6c0', '#82828d'];
  if (m === 'sand') return ['#f5e7b4', '#dcc47e', '#a98d4c'];
  return ['#e3a95f', '#c3833f', '#84562a'];
}

function blockTexture(x, y, w, h, mat) {
  var k, sx, sy;
  if (mat === 'wood') {
    ctx.fillStyle = rgba('#8a5a28', 0.24);
    for (k = 1; k <= 3; k++) {
      rr(ctx, x + 3, y + h * k / 4 - 1, w - 6, Math.max(1.3, h * 0.028), 2);
      ctx.fill();
    }
    ctx.strokeStyle = rgba('#6b431c', 0.22);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + h * 0.24, w * 0.16, h * 0.07, 0, 0, 6.2832);
    ctx.stroke();
  } else if (mat === 'ice') {
    ctx.fillStyle = rgba('#ffffff', 0.36);
    ctx.beginPath();
    ctx.moveTo(x + w * 0.14, y + h * 0.92);
    ctx.lineTo(x + w * 0.44, y + h * 0.12);
    ctx.lineTo(x + w * 0.60, y + h * 0.12);
    ctx.lineTo(x + w * 0.32, y + h * 0.92);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba('#8fd0e8', 0.5);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.7, y + h * 0.1);
    ctx.lineTo(x + w * 0.52, y + h * 0.5);
    ctx.lineTo(x + w * 0.74, y + h * 0.9);
    ctx.stroke();
  } else if (mat === 'stone') {
    for (k = 0; k < 9; k++) {
      sx = x + 5 + ((k * 41) % Math.max(6, w - 10));
      sy = y + 6 + ((k * 57) % Math.max(6, h - 12));
      ctx.fillStyle = rgba('#6f6f7a', 0.2);
      ctx.beginPath(); ctx.arc(sx, sy, 1.5, 0, 6.2832); ctx.fill();
    }
  } else {
    ctx.fillStyle = rgba('#9a7c3c', 0.2);
    for (k = 1; k <= 4; k++) { rr(ctx, x + 2, y + h * k / 5, w - 4, 1.5, 1); ctx.fill(); }
  }
}

function blocks() {
  var i, b, col, x, y, w, h, r, dmg, mat, gy = fin(G.GROUND_Y, 600);
  for (i = 0; i < G.blocks.length; i++) {
    b = G.blocks[i];
    if (!b || b.dead) continue;
    w = fin(b.w, 28); h = fin(b.h, 62);
    r = Math.min(7, w * 0.3, h * 0.3);
    x = fin(b.x, 1200) - w / 2;              /* в ядре x,y — ЦЕНТР */
    y = fin(b.y, gy - h / 2) - h / 2;
    mat = b.m || b.mat;
    col = blockColors(mat);

    softShadow(x + w / 2 + 5, gy + 7, w * 0.72 + 6, 10, 0.2);

    var g = ctx.createLinearGradient(x, y, x + w * 0.35, y + h);
    cs(g, 0, shade(col[0], 1.06));
    cs(g, 0.42, col[1]);
    cs(g, 1, col[2]);
    ctx.fillStyle = g;
    rr(ctx, x - 0.5, y - 0.5, w + 1, h + 1, r);
    ctx.fill();
    ink(0.3); inkW(2.2); ctx.stroke();       /* мультяшный контур */

    var hl = ctx.createLinearGradient(0, y, 0, y + h * 0.34);
    cs(hl, 0, rgba('#ffffff', 0.5)); cs(hl, 1, rgba('#ffffff', 0));
    ctx.fillStyle = hl;
    rr(ctx, x + 1.6, y + 1, w - 3.2, h * 0.34, Math.min(6, h * 0.22));
    ctx.fill();

    blockTexture(x, y, w, h, mat);

    dmg = b.max ? 1 - clamp(fin(b.hp, 1) / b.max, 0, 1) : 0;
    if (dmg > 0.3) {
      ctx.strokeStyle = rgba('#4a3114', 0.42);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.46, y + 2);
      ctx.lineTo(x + w * 0.58, y + h * 0.4);
      ctx.lineTo(x + w * 0.44, y + h * 0.66);
      ctx.lineTo(x + w * 0.52, y + h - 2);
      ctx.stroke();
    }
    if (dmg > 0.66) {
      ctx.strokeStyle = rgba('#3f2a10', 0.4);
      ctx.beginPath();
      ctx.moveTo(x + w * 0.74, y + h * 0.16);
      ctx.lineTo(x + w * 0.84, y + h * 0.5);
      ctx.lineTo(x + w * 0.72, y + h * 0.84);
      ctx.stroke();
    }
  }
}

/* ============================================================
   СВИНЬИ
   ============================================================ */
function pig(p, idx) {
  if (!p || p.dead || p.gone) return;
  var r = Math.max(4, fin(p.r, 24)), x = fin(p.x, 1200), y = fin(p.y, 560);
  var hurt = p.max ? 1 - clamp(fin(p.hp, 1) / p.max, 0, 1) : 0;
  var ph = T * 2.2 + idx * 1.3;
  var br = 1 + Math.sin(ph) * 0.032;                 /* дыхание */
  var wob = Math.sin(ph * 0.6) * 0.05;               /* покачивание */
  var gy = fin(G.GROUND_Y, 600);
  var blink = ((T * 0.6 + idx * 0.41) % 3.4) < 0.09; /* мигание */
  var ear = Math.sin(ph * 1.7) * 0.16;               /* уши */

  softShadow(x + 3, gy + 7, r * 1.18 * br, r * 0.36, 0.22);

  ctx.save();
  ctx.translate(x, y + Math.sin(ph * 0.8) * 1.6);
  ctx.rotate(wob * 0.25);
  ctx.scale(br, 2 - br);

  /* уши */
  ctx.fillStyle = shade('#8ecb45', 0.84);
  ctx.save(); ctx.translate(-r * 0.72, -r * 0.72); ctx.rotate(-0.6 + ear);
  ctx.beginPath(); ctx.ellipse(0, 0, r * 0.32, r * 0.24, 0, 0, 6.2832); ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(r * 0.72, -r * 0.72); ctx.rotate(0.6 - ear);
  ctx.beginPath(); ctx.ellipse(0, 0, r * 0.32, r * 0.24, 0, 0, 6.2832); ctx.fill(); ctx.restore();

  /* тело */
  var g = ctx.createRadialGradient(-r * 0.34, -r * 0.42, r * 0.16, 0, 0, r * 1.24);
  cs(g, 0, hurt > 0.5 ? '#d4ec93' : '#bdee7f');
  cs(g, 0.55, hurt > 0.5 ? '#abd469' : '#91d24c');
  cs(g, 1, '#5f9a2f');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.2832); ctx.fill();
  ink(0.34); inkW(2.6); ctx.stroke();

  /* блик и второй слой тени — плоская «мультяшная» подача */
  ctx.fillStyle = rgba('#ffffff', 0.34);
  ctx.beginPath(); ctx.ellipse(-r * 0.36, -r * 0.44, r * 0.34, r * 0.22, -0.5, 0, 6.2832); ctx.fill();
  ctx.fillStyle = rgba('#3f6a1c', 0.16);
  ctx.beginPath(); ctx.ellipse(r * 0.18, r * 0.5, r * 0.62, r * 0.28, 0.2, 0, 6.2832); ctx.fill();

  /* пятачок */
  var pg = ctx.createRadialGradient(0, r * 0.1, r * 0.06, 0, r * 0.22, r * 0.42);
  cs(pg, 0, '#aee06b'); cs(pg, 1, '#77ab3a');
  ctx.fillStyle = pg;
  ctx.beginPath(); ctx.ellipse(0, r * 0.22, r * 0.34, r * 0.27, 0, 0, 6.2832); ctx.fill();
  ink(0.28); inkW(1.8); ctx.stroke();
  ctx.fillStyle = rgba('#3f6a1c', 0.75);
  ctx.beginPath(); ctx.ellipse(-r * 0.12, r * 0.22, r * 0.075, r * 0.10, 0, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.ellipse(r * 0.12, r * 0.22, r * 0.075, r * 0.10, 0, 0, 6.2832); ctx.fill();

  /* глаза */
  var ex = r * 0.36, ey = -r * 0.22, er = r * 0.19;
  if (blink) {
    ctx.strokeStyle = '#2c2c34';
    ctx.lineWidth = Math.max(1.4, r * 0.07);
    ctx.beginPath();
    ctx.moveTo(-ex - er * 0.7, ey); ctx.lineTo(-ex + er * 0.7, ey);
    ctx.moveTo(ex - er * 0.7, ey); ctx.lineTo(ex + er * 0.7, ey);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-ex, ey, er, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.arc(ex, ey, er, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#2c2c34';
    var punch = hurt > 0.5 ? 0.62 : 0.48;
    ctx.beginPath(); ctx.arc(-ex + er * 0.18, ey + er * 0.1, er * punch, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.arc(ex + er * 0.18, ey + er * 0.1, er * punch, 0, 6.2832); ctx.fill();
    ctx.fillStyle = rgba('#ffffff', 0.95);
    ctx.beginPath(); ctx.arc(-ex + er * 0.38, ey - er * 0.18, er * 0.16, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.arc(ex + er * 0.38, ey - er * 0.18, er * 0.16, 0, 6.2832); ctx.fill();
  }

  /* брови */
  ctx.fillStyle = rgba('#4d7a24', 0.88);
  rr(ctx, -ex - er * 0.9, ey - er * (hurt > 0.5 ? 1.9 : 1.7), er * 1.8, er * 0.5, er * 0.25); ctx.fill();
  rr(ctx, ex - er * 0.9, ey - er * (hurt > 0.5 ? 1.9 : 1.7), er * 1.8, er * 0.5, er * 0.25); ctx.fill();

  if (hurt > 0.4) {   /* дрожь, румянец и пот */
    ctx.fillStyle = rgba('#9c3b3b', 0.3);
    ctx.beginPath(); ctx.arc(r * 0.62, r * 0.12, r * 0.16, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.arc(-r * 0.62, r * 0.12, r * 0.16, 0, 6.2832); ctx.fill();
    ctx.fillStyle = rgba('#8fdcff', 0.85);
    ctx.beginPath(); ctx.ellipse(r * 0.74, -r * 0.3 + Math.sin(T * 6) * 2, r * 0.07, r * 0.1, 0, 0, 6.2832); ctx.fill();
  }
  if (hurt > 0.66) {  /* белая полоска ужаса */
    ctx.fillStyle = '#ffffff';
    rr(ctx, -r * 0.3, -r * 0.06, r * 0.6, r * 0.16, r * 0.06); ctx.fill();
  }
  ctx.restore();
}

/* ============================================================
   ПТИЦЫ
   ============================================================ */
function birdColors(t) {
  if (t === 'yellow') return ['#ffe894', '#f5c33b', '#bd8d18'];
  if (t === 'blue') return ['#b0e2ff', '#54abe8', '#2a6ea8'];
  if (t === 'black') return ['#767682', '#414150', '#20202a'];
  if (t === 'white') return ['#ffffff', '#e6e6ee', '#b3b3c0'];
  return ['#ffa198', '#e8453c', '#a82a24'];
}

/* тело птицы. squash/r — сжатие, flap — взмах крыла, blink — прикрытый глаз */
function birdBody(x, y, r, type, ang, opt) {
  opt = opt || {};
  var sq = fin(opt.sq, 1), bl = !!opt.blink, eyeMood = fin(opt.mood, 0);
  x = fin(x, 0); y = fin(y, 0); r = Math.max(4, fin(r, 22));
  var col = birdColors(type);

  ctx.save();
  ctx.translate(x, y);
  if (ang && isFinite(ang)) ctx.rotate(ang);
  ctx.scale(1 / sq, sq);

  /* хвост */
  ctx.fillStyle = shade(col[2], 1.08);
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, -r * 0.12);
  ctx.quadraticCurveTo(-r * 1.7, -r * 0.66, -r * 2.05, -r * 0.02);
  ctx.quadraticCurveTo(-r * 1.55, r * 0.14, -r * 0.7, r * 0.18);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = rgba('#000000', 0.14);
  ctx.beginPath();
  ctx.moveTo(-r * 0.95, -r * 0.06);
  ctx.quadraticCurveTo(-r * 1.5, -r * 0.2, -r * 1.95, -r * 0.02);
  ctx.quadraticCurveTo(-r * 1.5, r * 0.06, -r * 0.95, r * 0.08);
  ctx.closePath(); ctx.fill();

  /* крыло: при полёте взмахивает */
  var flapA = fin(opt.flap, 0);
  ctx.save();
  ctx.translate(-r * 0.1, -r * 0.1);
  ctx.rotate(flapA);
  var wg = ctx.createLinearGradient(-r, -r * 0.4, r * 0.4, r * 0.5);
  cs(wg, 0, shade(col[1], 1.06)); cs(wg, 1, col[2]);
  ctx.fillStyle = wg;
  ctx.beginPath();
  ctx.moveTo(-r * 0.2, -r * 0.1);
  ctx.quadraticCurveTo(-r * 1.25, -r * 0.7, -r * 1.55, r * 0.06);
  ctx.quadraticCurveTo(-r * 0.85, r * 0.32, -r * 0.2, r * 0.18);
  ctx.closePath(); ctx.fill();
  ink(0.26); inkW(1.9); ctx.stroke();
  ctx.restore();

  /* тело */
  var g = ctx.createRadialGradient(-r * 0.36, -r * 0.42, r * 0.14, 0, 0, r * 1.26);
  cs(g, 0, col[0]); cs(g, 0.55, col[1]); cs(g, 1, col[2]);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.2832); ctx.fill();
  ink(0.34); inkW(2.6); ctx.stroke();

  /* низ — светлый «живот» */
  var bg = ctx.createRadialGradient(r * 0.05, r * 0.4, r * 0.08, r * 0.05, r * 0.42, r * 0.68);
  cs(bg, 0, rgba('#ffffff', 0.76)); cs(bg, 1, rgba('#ffffff', 0));
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.ellipse(r * 0.05, r * 0.42, r * 0.62, r * 0.44, 0, 0, 6.2832); ctx.fill();

  /* хохолок: подрагивает */
  ctx.fillStyle = shade(col[1], 1.06);
  var wig = Math.sin(T * 6 + r) * 0.12;
  ctx.save();
  ctx.translate(-r * 0.05, -r * 0.9); ctx.rotate(wig);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-r * 0.1, -r * 0.7, r * 0.44, -r * 0.32);
  ctx.quadraticCurveTo(r * 0.14, -r * 0.2, r * 0.2, 0);
  ctx.closePath(); ctx.fill();
  ctx.restore();

  /* клюв */
  var kg = ctx.createLinearGradient(r * 0.6, -r * 0.2, r * 1.5, r * 0.3);
  cs(kg, 0, '#ffd35c'); cs(kg, 1, '#e8961c');
  ctx.fillStyle = kg;
  ctx.beginPath();
  ctx.moveTo(r * 0.58, -r * 0.16);
  ctx.quadraticCurveTo(r * 1.5, -r * 0.24, r * 1.52, r * 0.02);
  ctx.quadraticCurveTo(r * 1.1, r * 0.2, r * 0.58, r * 0.24);
  ctx.closePath(); ctx.fill();
  ink(0.3); inkW(1.8); ctx.stroke();
  ctx.fillStyle = rgba('#b46a10', 0.5);
  ctx.beginPath();
  ctx.moveTo(r * 0.6, r * 0.04);
  ctx.quadraticCurveTo(r * 1.1, r * 0.06, r * 1.5, r * 0.02);
  ctx.quadraticCurveTo(r * 1.1, r * 0.2, r * 0.6, r * 0.22);
  ctx.closePath(); ctx.fill();

  /* глаз */
  var ex = r * 0.36, ey = -r * 0.3 + eyeMood * r * 0.06, er = r * 0.3;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(ex, ey, er, 0, 6.2832); ctx.fill();
  ink(0.26); inkW(1.7); ctx.stroke();
  if (bl) {
    ctx.fillStyle = shade(col[1], 0.95);
    ctx.beginPath(); ctx.arc(ex, ey, er * 0.98, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = 'rgba(46,32,24,0.7)';
    ctx.lineWidth = Math.max(1.4, r * 0.07);
    ctx.beginPath(); ctx.moveTo(ex - er * 0.8, ey); ctx.lineTo(ex + er * 0.8, ey); ctx.stroke();
  } else {
    var ig = ctx.createRadialGradient(ex + er * 0.2, ey, er * 0.1, ex, ey, er * 0.62);
    cs(ig, 0, '#4a4a56'); cs(ig, 1, '#1c1c22');
    ctx.fillStyle = ig;
    ctx.beginPath(); ctx.arc(ex + er * 0.16, ey + er * 0.06, er * 0.6, 0, 6.2832); ctx.fill();
    ctx.fillStyle = rgba('#ffffff', 0.95);
    ctx.beginPath(); ctx.arc(ex + er * 0.4, ey - er * 0.28, er * 0.22, 0, 6.2832); ctx.fill();
  }

  /* брови: при натяжении хмурятся */
  ctx.fillStyle = rgba('#2a2a30', 0.9);
  ctx.save();
  ctx.translate(ex + er * 0.05, ey - er * (1.28 - eyeMood * 0.12));
  ctx.rotate(-0.42 - eyeMood * 0.3);
  rr(ctx, -er * 1.1, -er * 0.3, er * 2.1, er * 0.62, er * 0.31); ctx.fill();
  ctx.restore();

  /* лапки */
  if (opt.legs) {
    ctx.strokeStyle = '#c8842c';
    ctx.lineWidth = Math.max(1.6, r * 0.11);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.18, r * 0.86); ctx.lineTo(-r * 0.22, r * 1.2);
    ctx.moveTo(r * 0.18, r * 0.86); ctx.lineTo(r * 0.22, r * 1.2);
    ctx.stroke();
  }

  if (type === 'black') {   /* фитиль и искра */
    var f = 0.55 + Math.abs(Math.sin(T * 11)) * 0.45;
    ctx.fillStyle = '#4a4a52';
    rr(ctx, -r * 0.14, -r * 1.36, r * 0.1, r * 0.44, r * 0.05); ctx.fill();
    var fg = ctx.createRadialGradient(-r * 0.09, -r * 1.5, 0, -r * 0.09, -r * 1.5, r * 0.5);
    cs(fg, 0, rgba('#fff3b0', f)); cs(fg, 1, rgba('#ff8a1a', 0));
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.arc(-r * 0.09, -r * 1.5, r * 0.5, 0, 6.2832); ctx.fill();
  }
  ctx.restore();
}

function birds() {
  var i, b, t, x, y, r, ang, gy = fin(G.GROUND_Y, 600);
  var SX = fin(G.SLING_X, 200), SY = fin(G.SLING_Y, 452);

  /* запас: в ядре это массив СТРОК ('red', 'yellow'…) — прыгают на месте */
  var lazy = G.birdsLeft || [];
  for (i = 0; i < lazy.length; i++) {
    b = lazy[i];
    if (!b) continue;
    t = (typeof b === 'string') ? b : (b.type || 'red');
    r = ((G.BIRDS && G.BIRDS[t]) ? G.BIRDS[t].r : 22) * 0.9;
    var ph = T * 2.6 + i * 1.15;
    var jump = Math.abs(Math.sin(ph));
    var land = jump < 0.18 ? (0.18 - jump) * 0.7 : 0;
    x = SX - 78 - i * 48;
    y = gy - r - 5 - jump * 12 + land * 12;
    softShadow(x + 2, gy + 7, r * (1.05 - jump * 0.15), r * 0.3, 0.18);
    birdBody(x, y, r, t, 0, {
      sq: 1 + (land > 0 ? -0.12 : jump * 0.06),
      blink: ((T * 0.5 + i * 0.7) % 3.1) < 0.08,
      legs: true,
      flap: Math.sin(ph) * 0.08
    });
  }

  /* птица на рогатке: дышит, при натяжении приседает */
  if (G.active && typeof G.active === 'object') {
    var a = G.active;
    var ax = fin(a.x, SX), ay = fin(a.y, SY);
    var pull = clamp(dist(ax, ay, SX, SY) / Math.max(1, fin(G.MAX_PULL, 115)), 0, 1);
    var breathe = 1 + Math.sin(T * 3.4) * 0.03;
    var crouch = 1 - pull * 0.14;
    ang = Math.atan2(SY - ay, SX - ax) * 0.5 * pull;
    var hop = hopT < 1 ? hopT : 1;

    if (hop < 1) {
      /* НОВАЯ ПТИЦА ПРЫГАЕТ НА РОГАТКУ по дуге */
      var hx = SX + (hopFrom.x - SX) * (1 - hop);
      var hy = SY + (hopFrom.y - SY) * (1 - hop) - Math.sin(hop * Math.PI) * 92;
      var hs = 1 + Math.sin(hop * Math.PI) * 0.14;
      softShadow(hx + 2, gy + 8, r * 1.1, r * 0.3, 0.12);
      birdBody(hx, hy, fin(a.r, 22) * hs, a.type || 'red', -0.5 + hop * 0.6, {
        sq: hs, legs: true,
        blink: false, mood: 1
      });
    } else {
      softShadow(ax + 2, gy + 8, fin(a.r, 22) * 1.2, fin(a.r, 22) * 0.32, 0.2);
      birdBody(ax, ay, fin(a.r, 22) * breathe, a.type || 'red', ang, {
        sq: crouch, legs: true, mood: pull * 2,
        blink: ((T * 0.55) % 3.7) < 0.07,
        flap: pull * 0.3
      });
    }
  }

  /* летящие */
  var list = [], k;
  if (G.flying && !G.flying.gone) list.push(G.flying);
  for (k = 0; k < (G.extraFlyers || []).length; k++) {
    if (G.extraFlyers[k] && !G.extraFlyers[k].gone) list.push(G.extraFlyers[k]);
  }
  for (k = 0; k < list.length; k++) {
    b = list[k];
    var sp = Math.sqrt(fin(b.vx, 0) * fin(b.vx, 0) + fin(b.vy, 0) * fin(b.vy, 0));
    ang = Math.atan2(fin(b.vy, 0), fin(b.vx, 0)) * 0.7;
    if (fin(b.y, 0) < gy - 4) softShadow(fin(b.x, 0) + 4, gy + 7, fin(b.r, 22) * 1.4, fin(b.r, 22) * 0.3, 0.16);
    birdBody(b.x, b.y, fin(b.r, 22) * (1 + Math.min(0.16, sp / 4200)), b.type || 'red', ang, {
      sq: 1 - Math.min(0.12, sp / 5200),
      flap: Math.sin(T * (8 + Math.min(14, sp / 90))) * Math.min(0.75, 0.18 + sp / 1500),
      mood: 2, blink: false
    });
    /* на большой скорости роняет перья */
    if (sp > 900 && Math.random() < 0.25) {
      spawn('feather', fin(b.x, 0), fin(b.y, 0), {
        vx: rnd(-50, 50), vy: rnd(-40, 30), col: '#ffffff', size: rnd(3, 6), decay: 0.65, g: 140
      });
    }
  }

  /* УПАВШИЕ ПТИЦЫ: лежат на земле, не исчезают */
  for (k = 0; k < ghosts.length; k++) {
    var gh = ghosts[k];
    var fade = gh.t > 4.2 ? clamp(1 - (gh.t - 4.2) / 1.6, 0, 1) : 1;
    ctx.save();
    ctx.globalAlpha = 0.9 * fade;
    var bob = Math.sin(T * 2 + k) * 1.2;
    softShadow(gh.x + 2, gy + 7, gh.r * 1.25, gh.r * 0.34, 0.17);
    birdBody(gh.x, gh.y + bob, gh.r, gh.type, 1.35, { sq: 1.06, blink: true, legs: true, mood: -1 });
    ctx.restore();
  }
}

/* ============================================================
   РОГАТКА И ПРИЦЕЛ
   ============================================================ */
function slingPost() {
  var bx = fin(G.SLING_X, 200), by = fin(G.SLING_Y, 452), gy = fin(G.GROUND_Y, 600);
  ctx.fillStyle = rgba('#123c1e', 0.22);
  ctx.beginPath(); ctx.ellipse(bx + 6, gy + 8, 26, 9, 0, 0, 6.2832); ctx.fill();

  var g = ctx.createLinearGradient(bx - 12, by, bx + 14, gy);
  cs(g, 0, '#b8823f'); cs(g, 0.45, '#8a5a28'); cs(g, 1, '#5f3d18');
  ctx.lineCap = 'round';
  ctx.strokeStyle = g;
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(bx, gy);
  ctx.quadraticCurveTo(bx - 3, by + 60, bx, by);
  ctx.stroke();
  ink(0.26); inkW(2.2); ctx.stroke();

  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(bx, by + 4);
  ctx.quadraticCurveTo(bx - 26, by - 22, bx - 27, by - 36);
  ctx.moveTo(bx, by + 4);
  ctx.quadraticCurveTo(bx + 26, by - 20, bx + 27, by - 34);
  ctx.stroke();

  ctx.fillStyle = rgba('#ffffff', 0.16);
  ctx.beginPath(); ctx.ellipse(bx - 4, by + 92, 4, 46, 0.02, 0, 6.2832); ctx.fill();
}

function slingBands() {
  var a = G.active;
  if (!a || typeof a !== 'object' || hopT < 1) return;
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
  if (!a || typeof a !== 'object' || hopT < 1) return;
  var bx = fin(G.SLING_X, 200), by = fin(G.SLING_Y, 452);
  var dx = fin(a.x, bx) - bx, dy = fin(a.y, by) - by;
  if (dist(0, 0, dx, dy) < 8) return;
  var pw = fin(G.POWER, 7.3), gr = fin(G.GRAVITY, 1400);
  var vx = -dx * pw, vy = -dy * pw;
  var count = (G.has && G.has('goggles')) ? 34 : 18;
  var X = fin(a.x, bx), Y = fin(a.y, by), dt = 0.045, i;
  for (i = 0; i < count; i++) {
    var k = 1 - i / count;
    ctx.fillStyle = rgba('#ffffff', (0.06 + k * 0.5) * clamp(0.5 + ambient * 0.5, 0, 1));
    ctx.beginPath();
    ctx.arc(X, Y, 2.4 + k * 2.2, 0, 6.2832);
    ctx.fill();
    vy += gr * dt; X += vx * dt; Y += vy * dt;
    if (Y > fin(G.GROUND_Y, 600)) break;
  }
}

function trail() {
  var b = G.flying;
  if (!b || !b.trail || b.trail.length < 2) return;
  var i, n = b.trail.length;
  for (i = 1; i < n; i++) {
    var k = i / n;
    ctx.fillStyle = rgba('#ffffff', 0.05 + k * 0.32);
    ctx.beginPath();
    ctx.arc(fin(b.trail[i].x, 0), fin(b.trail[i].y, 0), 1.2 + k * 2.6, 0, 6.2832);
    ctx.fill();
  }
}

/* ============================================================
   ЭФФЕКТЫ И ОЧКИ
   ============================================================ */
function drawFx() {
  var i, p, k, t;
  /* частицы из ядра */
  for (i = 0; i < (G.parts || []).length; i++) {
    p = G.parts[i];
    if (!p || p.life <= 0) continue;
    k = clamp(p.life, 0, 1);
    ctx.fillStyle = rgba(p.color || '#c9a06a', 0.25 + k * 0.7);
    ctx.beginPath();
    ctx.arc(fin(p.x, 0), fin(p.y, 0), fin(p.size, 3) * (0.5 + k * 0.6), 0, 6.2832);
    ctx.fill();
  }
  /* свои частицы */
  for (i = 0; i < fx.length; i++) {
    p = fx[i];
    t = clamp(p.life, 0, 1);
    if (p.kind === 'ring') {
      ctx.strokeStyle = rgba(p.col, 0.5 * t);
      ctx.lineWidth = 9 * t;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.stroke();
      ctx.fillStyle = rgba('#fff6dd', 0.14 * t);
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.7, 0, 6.2832); ctx.fill();
    } else if (p.kind === 'smoke') {
      var sg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * (1.6 - t * 0.6));
      cs(sg, 0, rgba(p.col, 0.4 * t)); cs(sg, 1, rgba(p.col, 0));
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.6 - t * 0.6), 0, 6.2832); ctx.fill();
    } else if (p.kind === 'feather') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot + T * 2);
      ctx.fillStyle = rgba(p.col, 0.35 + t * 0.6);
      ctx.beginPath(); ctx.ellipse(0, 0, p.size * 1.5, p.size * 0.6, 0, 0, 6.2832); ctx.fill();
      ctx.restore();
    } else {
      var gg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.4);
      cs(gg, 0, rgba(p.col, 0.9 * t)); cs(gg, 1, rgba(p.col, 0));
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 2.4, 0, 6.2832); ctx.fill();
    }
  }
}

function drawPops() {
  var i, p, k, r, px, py;
  var hx = fin(G.SLING_X, 200), hy = fin(G.SLING_Y, 452);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (i = 0; i < (G.pops || []).length; i++) {
    p = G.pops[i];
    if (!p || p.life <= 0) continue;
    k = clamp(p.life, 0, 1);
    px = fin(p.x, 0) || lastPop.x || hx + 300;
    py = fin(p.y, 0) || lastPop.y || hy - 120;
    /* подъём текста */
    py -= (1 - k) * 26;
    r = rgb(p.color || '#ffe07a');
    ctx.font = 'bold ' + Math.round(20 + k * 10) + 'px sans-serif';
    ctx.fillStyle = 'rgba(40,28,10,' + (0.38 * k) + ')';
    ctx.fillText(p.text || '', px + 2, py + 2);
    ctx.fillStyle = rgba(p.color || '#ffe07a', 0.2 + k * 0.8);
    ctx.fillText(p.text || '', px, py);
  }
  ctx.restore();
}

/* ============================================================
   НАБЛЮДЕНИЕ ЗА СОБЫТИЯМИ МИРА
   ============================================================ */
function watchWorld(dt) {
  var i, p, b, old;

  /* старт нового уровня — чистим следы прошлого */
  if (G.level !== lastLevel) {
    lastLevel = G.level;
    ghosts = []; fx = []; pigHp = []; blkHp = [];
    lastActive = null; hopT = 1; mode = 'home'; camT = homeCam();
  }

  /* прыжок новой птицы на рогатку */
  var a = G.active;
  if (a && a !== lastActive) {
    hopT = 0;
    hopFrom = { x: fin(G.SLING_X, 200) - 120, y: fin(G.GROUND_Y, 600) - 46 };
    lastActive = a;
  }
  if (hopT < 1) hopT = Math.min(1, hopT + dt * 3.0);

  /* упавшая птица — запоминаем ДО того, как ядро её уберёт */
  var f = G.flying;
  if (prevFly && f !== prevFly && !prevFly.gone) {
    var fellY = Math.min(fin(prevFly.y, 0), fin(G.GROUND_Y, 600) - fin(prevFly.r, 22) * 0.5);
    ghosts.push({ x: fin(prevFly.x, 0), y: fellY, r: fin(prevFly.r, 22), type: prevFly.type || 'red', t: 0 });
    feathers(fin(prevFly.x, 0), fellY, 6);
    spawn('smoke', fin(prevFly.x, 0), fellY + 6, { vx: rnd(-30, 30), vy: rnd(-40, -10), col: '#cabfa8', size: 14, decay: 1.0, g: -20 });
  }
  prevFly = f;
  for (i = 0; i < ghosts.length; i++) ghosts[i].t += dt;
  for (i = ghosts.length - 1; i >= 0; i--) if (ghosts[i].t > 5.8) ghosts.splice(i, 1);

  /* попадания по свиньям */
  for (i = 0; i < G.pigs.length; i++) {
    p = G.pigs[i];
    if (!p) continue;
    old = pigHp[i];
    if (old !== undefined && fin(p.hp, 0) < old) {
      lastPop = { x: fin(p.x, 0), y: fin(p.y, 0) - 30 };
      if (p.dead || p.gone) {
        burst(p.x, p.y, '#8ecb45', true);
        feathers(p.x, p.y, 7);
        spawn('smoke', p.x, p.y - 8, { vx: rnd(-20, 20), vy: -60, col: '#9fd06a', size: 20, decay: 0.9, g: -40 });
      } else {
        burst(p.x, p.y, '#c9ee8a', false);
      }
    }
    pigHp[i] = fin(p.hp, 0);
  }

  /* попадания по блокам */
  for (i = 0; i < G.blocks.length; i++) {
    b = G.blocks[i];
    if (!b) continue;
    old = blkHp[i];
    if (old !== undefined && fin(b.hp, 0) < old) {
      lastPop = { x: fin(b.x, 0), y: fin(b.y, 0) - 40 };
      debris(b.x, b.y, b.m || b.mat);
      if (b.dead) burst(b.x, b.y, b.m === 'ice' ? '#cfeeff' : '#e0c08a', true);
    }
    blkHp[i] = fin(b.hp, 0);
  }
}

/* ============================================================
   СЛОИ КАДРА
   ============================================================ */
function tick(dt) {
  dt = clamp(fin(dt, 0.016), 0, 0.05);
  T += dt;
  var i, p;

  for (i = 0; i < cl.length; i++) {
    cl[i].x += cl[i].v * dt;
    if (cl[i].x > 3200) cl[i].x = -400;
  }
  ambUpdate(dt);
  watchWorld(dt);

  for (i = 0; i < fx.length; i++) {
    p = fx[i];
    p.life -= dt * p.decay;
    if (p.kind === 'ring') p.r = fin(p.r, 14) + 200 * dt;
    else if (p.kind !== 'smoke') { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.vx *= 0.99; }
    else { p.x += p.vx * dt; p.y += p.vy * dt; p.size = fin(p.size, 14) + 14 * dt; }
  }
  for (i = fx.length - 1; i >= 0; i--) if (fx[i].life <= 0) fx.splice(i, 1);

  if (shk > 0) {
    shk = Math.max(0, shk - dt * 44);
    shakeX = rnd(-shk, shk); shakeY = rnd(-shk, shk);
  } else { shakeX = 0; shakeY = 0; }

  camUpdate(dt);
}

function vignette() {
  var g = ctx.createRadialGradient(cssW * 0.5, cssH * 0.48, Math.min(cssW, cssH) * 0.34, cssW * 0.5, cssH * 0.5, Math.max(cssW, cssH) * 0.78);
  cs(g, 0, 'rgba(0,0,0,0)');
  cs(g, 1, 'rgba(10,16,30,0.24)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cssW, cssH);
}

function darkness() {
  var d = clamp(1 - ambient, 0, 1);
  if (d <= 0.001) return;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgb(' + Math.round(255 - d * 120) + ',' + Math.round(255 - d * 110) + ',' + Math.round(255 - d * 80) + ')';
  ctx.fillRect(0, 0, cssW, cssH);
  ctx.restore();
  ctx.fillStyle = 'rgba(24,34,66,' + (d * 0.3) + ')';
  ctx.fillRect(0, 0, cssW, cssH);
}

/* ---------- главный кадр ---------- */
function draw() {
  if (!cv) { if (!init()) return; }
  if (!cssW || !cssH) resize();
  try {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, cssW, cssH);

    sky();
    sun();
    drawClouds();
    hills();
    boltDraw();

    ctx.save();
    ctx.translate(tx + shakeX, ty + shakeY);
    ctx.scale(scale, scale);
    ground();
    pebbleDraw();
    bushesDraw();
    grassDraw();
    slingPost();
    slingBands();
    blocks();
    var i;
    for (i = 0; i < (G.pigs || []).length; i++) pig(G.pigs[i], i);
    birds();
    trail();
    aimDots();
    drawFx();
    drawPops();
    ctx.restore();

    vignette();
    darkness();
  } catch (e) {
    console.error('draw: ' + ((e && e.message) || e));
  }
}

/* строка диагностики для отладочной панели */
function info() {
  return {
    scale: scale, camX: camX, mode: mode, ambient: ambient,
    clouds: cl.length, ghosts: ghosts.length, fx: fx.length,
    blocks: (G.blocks || []).length, pigs: (G.pigs || []).length
  };
}

return {
  init: init, resize: resize, draw: draw, tick: tick,
  follow: follow, setCam: setCam, snap: snap, toWorld: toWorld,
  shake: shake, burst: burst, feathers: feathers, rebuild: build,
  info: info,
  getScale: function () { return scale; },
  getCamX: function () { return camX; },
  getCamY: function () { return ty; },
  getAmbient: function () { return ambient; }
};
})();
