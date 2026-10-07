/* ============================================================
   ANGRY BIRDS — запуск, игровой цикл, мост к Android
   ============================================================ */
(function () {
'use strict';

var G = window.ABG, R = window.ABR, U = window.ABUI, C = window.ABC;

function fatal(msg) {
  document.body.innerHTML =
    '<div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;' +
    'padding:24px;font:16px/1.5 sans-serif;color:#fff;background:#0a0e1a;text-align:center">' +
    msg + '</div>';
}

if (!G || !R || !U || !C) {
  fatal('Модули игры не загрузились.<br>Проверь файлы в assets.');
  return;
}

var last = 0, started = false;

function frame(ts) {
  if (!last) last = ts;
  var dt = Math.min(0.033, ((ts - last) / 1000) || 0.016);
  last = ts;
  var i, p;

  if (G.state === 'play') {
    if (G.physics) G.physics(dt);

    /* осколки */
    for (i = G.parts.length - 1; i >= 0; i--) {
      p = G.parts[i];
      p.vy += 900 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0 || p.y > G.GROUND_Y + 90) G.parts.splice(i, 1);
    }

    /* всплывающие числа */
    for (i = G.pops.length - 1; i >= 0; i--) {
      G.pops[i].t -= dt * 0.9;
      if (G.pops[i].t <= 0) G.pops.splice(i, 1);
    }

    /* летящая птица */
    if (G.flying) {
      var f = G.flying;
      var sp = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
      var onGround = f.y + f.r >= G.GROUND_Y - 2;
      if (sp < 45 && onGround) f.still += dt; else f.still = 0;

      if (f.x < -90 || f.x > G.WORLD_W + 90 || f.y > G.GROUND_Y + 130 || f.still > 0.8) {
        G.flying = null;
        G.nextBird();
        U.syncHud();
      } else {
        R.follow(f.x);
      }
    }

    /* осколки от деления синей птицы */
    for (i = G.extraFlyers.length - 1; i >= 0; i--) {
      var e = G.extraFlyers[i];
      var s2 = Math.sqrt(e.vx * e.vx + e.vy * e.vy);
      if (e.x < -90 || e.x > G.WORLD_W + 90 || e.y > G.GROUND_Y + 130 ||
          (s2 < 45 && e.y + e.r >= G.GROUND_Y - 2)) G.extraFlyers.splice(i, 1);
    }

    var res = G.checkEnd(dt);
    if (res === 'win') C.onWin();
    else if (res === 'lose') C.onLose();

    U.syncScore();
    U.syncHud();
  }

  R.tick(dt);
  R.draw();
  requestAnimationFrame(frame);
}

function start() {
  if (started) return;
  if (!C.init()) { fatal('Не удалось запустить игру.'); return; }
  started = true;
  R.setCam(0);
  R.snap();
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
  if (G.save.music && G.state !== 'play') G.musicStart();
  return true;
};

document.addEventListener('visibilitychange', function () {
  if (document.hidden) window.onAndroidPause();
  else window.onAndroidResume();
});

document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
document.addEventListener('dblclick', function (e) { e.preventDefault(); });

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(start, 0);
} else {
  window.addEventListener('load', start);
}

})();
