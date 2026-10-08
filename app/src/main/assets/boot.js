/* ============================================================
   ANGRY BIRDS — игровой цикл, запуск, мост к Android
   ============================================================ */
(function () {
'use strict';

/* Показываем ошибку прямо на экране — иначе на телефоне не видно, что упало */
window.onerror = function (msg, src, line) {
  try {
    var d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#7a1414;' +
      'color:#fff;font:12px/1.45 monospace;padding:8px 10px;max-height:42%;overflow:auto';
    d.textContent = 'Ошибка: ' + msg + ' — ' + String(src || '').split('/').pop() + ':' + line;
    document.body.appendChild(d);
  } catch (e) { /* игнор */ }
  return false;
};

var G = window.ABG, R = window.ABR, U = window.ABUI, C = window.ABC;

function fatal(msg) {
  document.body.innerHTML =
    '<div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;' +
    'padding:24px;font:16px/1.5 sans-serif;color:#fff;background:#0a0e1a;text-align:center">' +
    msg + '</div>';
}

var miss = [];
if (!G) miss.push('engine.js');
if (!R) miss.push('render.js');
if (!U) miss.push('ui.js');
if (!C) miss.push('controls.js');
if (miss.length) {
  fatal('Не загрузились модули: ' + miss.join(', ') + '. Проверь папку assets внутри APK.');
  return;
}

var last = 0, started = false;

function loop(ts) {
  if (!last) last = ts;
  var dt = Math.min(0.034, ((ts - last) / 1000) || 0.016);
  last = ts;
  var i, p;

  if (G.state === 'play') {
    G.physics(dt);

    for (i = G.parts.length - 1; i >= 0; i--) {
      p = G.parts[i];
      p.vy += 900 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.life <= 0 || p.y > G.GROUND_Y + 140) G.parts.splice(i, 1);
    }
    for (i = G.pops.length - 1; i >= 0; i--) {
      p = G.pops[i];
      p.t -= dt * 0.9; p.y -= 28 * dt;
      if (p.t <= 0) G.pops.splice(i, 1);
    }

    if (G.flying) {
      var f = G.flying;
      if (!f.trace) f.trace = [];
      f.trace.push({ x: f.x, y: f.y });
      if (f.trace.length > 26) f.trace.shift();
      var sp = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
      var gnd = f.y + f.r >= G.GROUND_Y - 2;
      if (sp < 45 && gnd) f.still = (f.still || 0) + dt; else f.still = 0;
      if (f.x < -120 || f.x > G.WORLD_W + 120 || f.y > G.GROUND_Y + 160 || f.still > 0.8) {
        G.flying = null;
        G.nextBird();
        U.syncHud();
      } else {
        R.follow(f.x);
      }
    }

    for (i = G.extraFlyers.length - 1; i >= 0; i--) {
      var e = G.extraFlyers[i];
      var s2 = Math.sqrt(e.vx * e.vx + e.vy * e.vy);
      if (e.x < -120 || e.x > G.WORLD_W + 120 || e.y > G.GROUND_Y + 160 ||
          (s2 < 45 && e.y + e.r >= G.GROUND_Y - 2)) {
        G.extraFlyers.splice(i, 1);
      }
    }

    var res = G.checkEnd(dt);
    if (res === 'win') C.onWin();
    else if (res === 'lose') C.onLose();
    U.syncScore();
  }

  R.tick(dt);
  R.draw();
  requestAnimationFrame(loop);
}

function start() {
  if (started) return;
  if (!C.init()) return;
  started = true;
  if (G.save && G.save.music) G.musicStart();
  requestAnimationFrame(loop);
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
  if (G.save && G.save.music && G.state !== 'play') G.musicStart();
  return true;
};

document.addEventListener('visibilitychange', function () {
  if (document.hidden) window.onAndroidPause();
  else window.onAndroidResume();
});

document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 0); });
} else {
  setTimeout(start, 0);
}

})();
