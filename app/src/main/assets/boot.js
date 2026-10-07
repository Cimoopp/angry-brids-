/* ============================================================
   ANGRY BIRDS — запуск, игровой цикл, мост к Android
   Требует: engine.js, engine2.js, render.js, ui.js, controls.js
   ============================================================ */
(function () {
'use strict';

var G = window.ABG, R = window.ABR, U = window.ABUI, C = window.ABC;

function fatal(msg) {
  var d = document.createElement('div');
  d.style.cssText = 'position:fixed;inset:0;z-index:999;display:flex;align-items:center;' +
    'justify-content:center;padding:24px;background:#0a0e1a;color:#fff;' +
    'font:15px/1.6 sans-serif;text-align:center;white-space:pre-wrap';
  d.textContent = msg;
  document.body.appendChild(d);
}

if (!G || !R || !U || !C) {
  fatal('Игра не запустилась.\n\n' +
    'engine.js — ' + (G ? 'ок' : 'НЕ загружен') + '\n' +
    'render.js — ' + (R ? 'ок' : 'НЕ загружен') + '\n' +
    'ui.js — ' + (U ? 'ок' : 'НЕ загружен') + '\n' +
    'controls.js — ' + (C ? 'ок' : 'НЕ загружен') + '\n\n' +
    'Все файлы должны лежать в app/src/main/assets/');
  return;
}

var last = 0, hudT = 0, started = false;

/* ---------- частицы и всплывающие очки ---------- */
function effects(dt) {
  var i, p;
  for (i = G.parts.length - 1; i >= 0; i--) {
    p = G.parts[i];
    p.vy += 900 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0 || p.y > G.GROUND_Y + 140) G.parts.splice(i, 1);
  }
  for (i = G.pops.length - 1; i >= 0; i--) {
    G.pops[i].t -= dt;
    if (G.pops[i].t <= 0) G.pops.splice(i, 1);
  }
}

/* ---------- полёт и камера ---------- */
function flyers(dt) {
  var f = G.flying;
  if (f) {
    var sp = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
    var onGround = f.y + f.r >= G.GROUND_Y - 2;
    if (onGround && sp < 60) f.still = (f.still || 0) + dt;
    else f.still = 0;

    if (f.x < -140 || f.x > G.WORLD_W + 140 || f.y > G.GROUND_Y + 180 || f.still > 0.7) {
      G.nextBird();
      U.syncHud();
      R.setCam(G.SLING_X - 80);
    } else {
      R.follow(f.x);
    }
  } else {
    R.setCam(G.SLING_X - 80);
  }

  var i, e, sp2;
  for (i = G.extraFlyers.length - 1; i >= 0; i--) {
    e = G.extraFlyers[i];
    sp2 = Math.sqrt(e.vx * e.vx + e.vy * e.vy);
    if (e.x < -140 || e.x > G.WORLD_W + 140 || e.y > G.GROUND_Y + 180 ||
        (e.y + e.r >= G.GROUND_Y - 2 && sp2 < 60)) {
      G.extraFlyers.splice(i, 1);
    }
  }
}

/* ---------- кадр ---------- */
function frame(ts) {
  if (!last) last = ts;
  var dt = (ts - last) / 1000;
  last = ts;
  if (!(dt > 0)) dt = 0.016;
  if (dt > 0.033) dt = 0.033;

  if (G.state === 'play') {
    G.physics(dt);
    effects(dt);
    flyers(dt);

    var res = G.checkEnd(dt);
    if (res === 'win') C.onWin();
    else if (res === 'lose') C.onLose();

    hudT += dt;
    if (hudT > 0.2) {
      hudT = 0;
      U.syncScore();
      U.syncHud();
    }
  }

  R.tick(dt);
  R.draw();
  requestAnimationFrame(frame);
}

/* ---------- запуск ---------- */
function start() {
  if (started) return;
  if (!C.init()) {
    fatal('Не удалось запустить игру: canvas недоступен.');
    return;
  }
  started = true;
  if (G.save.music) G.musicStart();
  requestAnimationFrame(frame);
}

/* ---------- мост для MainActivity.java ---------- */
window.onAndroidBack = function () {
  try { return C.onBack(); } catch (e) { return false; }
};

window.onAndroidPause = function () {
  try { C.pause(); } catch (e) { /* игнор */ }
  G.musicStop();
  return true;
};

window.onAndroidResume = function () {
  if (G.save.music) G.musicStart();
  return true;
};

document.addEventListener('visibilitychange', function () {
  if (document.hidden) window.onAndroidPause();
  else window.onAndroidResume();
});

document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', function () { setTimeout(start, 0); });
} else {
  setTimeout(start, 0);
}
})();
