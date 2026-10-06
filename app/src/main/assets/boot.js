/* ============================================================
   ANGRY BIRDS — точка входа. Связывает engine + render + ui,
   ведёт игровой цикл и обрабатывает касания.
   Экспорт для MainActivity: window.AB, window.onAndroidBack,
   window.onAndroidPause
   ============================================================ */
(function () {
'use strict';

var G = window.ABG, R = window.ABR, U = window.ABUI;
var cv = null, ctx = null, dpr = 1, w = 0, h = 0, scale = 1, viewW = 0;
var camX = 0, camTarget = 0, clouds = [], drag = false, dragPt = false;
var last = 0, hudTick = 0, lastAlive = -1;
var state = 'menu';

function $(s) { return document.querySelector(s); }
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

function showError(msg) {
  var el = document.createElement('pre');
  el.style.cssText = 'position:fixed;left:12px;right:12px;top:12px;z-index:999;color:#ff9a9a;' +
    'font:13px monospace;white-space:pre-wrap;background:rgba(0,0,0,.75);padding:10px;border-radius:10px';
  el.textContent = 'Ошибка: ' + msg;
  document.body.appendChild(el);
}

function makeClouds() {
  clouds = [];
  for (var i = 0; i < 10; i++) {
    clouds.push({
      x: Math.random() * (G.WORLD_W + 400) - 200,
      y: 70 + Math.random() * 230,
      s: 22 + Math.random() * 30
    });
  }
}

function resize() {
  if (!cv) return;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  w = window.innerWidth; h = window.innerHeight;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  cv.style.width = w + 'px'; cv.style.height = h + 'px';
  scale = h / G.WORLD_H;
  viewW = w / scale;
}

/* ---------- переходы состояния ---------- */
function startLevel(n) {
  G.startLevel(n);
  state = 'play';
  camX = 0; camTarget = 0; drag = false; dragPt = false;
  lastAlive = -1;
  U.play();
}
function pauseGame() {
  if (state !== 'play') return;
  state = 'pause';
  U.pause();
}
function resumeGame() {
  if (state !== 'pause') return;
  state = 'play';
  U.play();
}
function goMenu() {
  state = 'menu';
  G.musicStop();
  U.menu();
}

/* ---------- ввод ---------- */
function toWorld(cx, cy) { return { x: camX + cx / scale, y: cy / scale }; }

function onDown(e) {
  if (state !== 'play') return;
  var t = e, pt;
  if (e.touches && e.touches.length) t = e.touches[0];
  pt = toWorld(t.clientX, t.clientY);
  G.ac();
  if (G.flying && G.flying.state === 'fly' && !G.flying.used) {
    if (G.useAbility()) return;
  }
  if (G.active && G.active.state === 'ready') {
    var dx = pt.x - G.active.x, dy = pt.y - G.active.y;
    if (Math.sqrt(dx * dx + dy * dy) < 170) {
      drag = true; dragPt = true;
      G.SFX.pull();
      moveDrag(pt);
    }
  }
  if (e.cancelable) e.preventDefault();
}

function moveDrag(pt) {
  var a = G.active;
  if (!a) return;
  var dx = pt.x - G.SLING_X, dy = pt.y - G.SLING_Y;
  var d = Math.sqrt(dx * dx + dy * dy);
  if (d > G.MAX_PULL) { dx = dx / d * G.MAX_PULL; dy = dy / d * G.MAX_PULL; }
  a.x = G.SLING_X + dx;
  a.y = G.SLING_Y + dy;
}

function onMove(e) {
  if (!drag || state !== 'play') return;
  var t = e;
  if (e.touches && e.touches.length) t = e.touches[0];
  moveDrag(toWorld(t.clientX, t.clientY));
  if (e.cancelable) e.preventDefault();
}

function onUp() {
  if (!drag) return;
  drag = false; dragPt = false;
  if (G.shoot()) camTarget = clamp(G.flying.x - viewW * 0.42, 0, Math.max(0, G.WORLD_W - viewW));
}

function bindInput() {
  var el = document.getElementById('cv') || document.body;
  el.addEventListener('pointerdown', onDown, { passive: false });
  el.addEventListener('pointermove', onMove, { passive: false });
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
  el.addEventListener('touchstart', onDown, { passive: false });
  el.addEventListener('touchmove', onMove, { passive: false });
  el.addEventListener('touchend', onUp);
  el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
}

/* ---------- цикл ---------- */
function step(dt) {
  var i, p, f, sp, res;

  G.physics(dt);

  for (i = G.parts.length - 1; i >= 0; i--) {
    p = G.parts[i];
    p.vy += 1100 * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0 || p.y > G.GROUND_Y + 60) G.parts.splice(i, 1);
  }
  for (i = G.pops.length - 1; i >= 0; i--) {
    G.pops[i].t -= dt * 0.85;
    if (G.pops[i].t <= 0) G.pops.splice(i, 1);
  }

  if (G.flying && G.flying.state === 'fly') {
    f = G.flying;
    sp = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
    if (sp < 45 && f.y + f.r >= G.GROUND_Y - 2) f.still = (f.still || 0) + dt;
    else f.still = 0;
    if (f.x < -80 || f.x > G.WORLD_W + 80 || f.y > G.GROUND_Y + 90 || f.still > 0.9) {
      G.flying = null; G.nextBird();
    } else {
      camTarget = clamp(f.x - viewW * 0.42, 0, Math.max(0, G.WORLD_W - viewW));
    }
  }
  for (i = G.extraFlyers.length - 1; i >= 0; i--) {
    f = G.extraFlyers[i];
    sp = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
    if (f.x < -80 || f.x > G.WORLD_W + 80 || f.y > G.GROUND_Y + 90 ||
        (sp < 45 && f.y + f.r >= G.GROUND_Y - 2)) G.extraFlyers.splice(i, 1);
  }

  res = G.checkEnd(dt);
  if (res === 'win') {
    state = 'win';
    U.win(G.lastWin || { stars: 1, coins: 0, score: G.score });
  } else if (res === 'lose') {
    state = 'lose';
    U.lose(G.alivePigs());
  }
}

function frame(ts) {
  var dt = (ts - last) / 1000;
  if (!isFinite(dt) || dt < 0) dt = 0.016;
  if (dt > 0.033) dt = 0.033;
  last = ts;
  var i;

  if (state === 'play') {
    step(dt);
    var alive = G.alivePigs();
    hudTick++;
    if (alive !== lastAlive || hudTick > 6) { lastAlive = alive; hudTick = 0; U.hud(); }
  }

  if (!G.flying && state !== 'play') camTarget = camX;
  if (!G.flying) camTarget = clamp(camTarget, 0, Math.max(0, G.WORLD_W - viewW));
  camX += (camTarget - camX) * Math.min(1, dt * 4);
  camX = clamp(camX, 0, Math.max(0, G.WORLD_W - viewW));

  for (i = 0; i < clouds.length; i++) {
    clouds[i].x += 6 * dt * (1 + i % 3);
    if (clouds[i].x > G.WORLD_W + 300) clouds[i].x = -300;
  }

  R.draw(ctx, { dpr: dpr, w: w, h: h, camX: camX, scale: scale, clouds: clouds, drag: dragPt });
  requestAnimationFrame(frame);
}

/* ---------- запуск ---------- */
function boot() {
  cv = document.getElementById('cv');
  if (!cv) { showError('не найден canvas'); return; }
  ctx = cv.getContext('2d');
  if (!ctx) { showError('canvas 2D недоступен'); return; }

  resize();
  makeClouds();
  bindInput();

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 250); });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) window.onAndroidPause();
  });

  U.init({
    level: startLevel,
    menu: goMenu,
    pause: pauseGame,
    resume: resumeGame,
    restart: function () { startLevel(G.level); },
    next: function () { startLevel(clamp(G.level + 1, 1, G.TOTAL_LEVELS)); }
  });

  if (G.save.music) G.musicStart();
  last = performance.now();
  requestAnimationFrame(frame);
}

window.AB = {
  start: boot,
  state: function () { return state; },
  level: function () { return G.level; }
};

window.onAndroidBack = function () {
  if (state === 'play') { pauseGame(); return true; }
  if (state === 'pause' || state === 'win' || state === 'lose') { goMenu(); return true; }
  var open = ['levels', 'shop', 'ach', 'settings'], i, el;
  for (i = 0; i < open.length; i++) {
    el = document.getElementById(open[i]);
    if (el && !el.classList.contains('hidden')) { U.show('menu'); return true; }
  }
  return false;
};

window.onAndroidPause = function () {
  if (state === 'play') pauseGame();
};

window.addEventListener('error', function (e) {
  showError((e && e.message) ? e.message : 'неизвестная ошибка');
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
})();
