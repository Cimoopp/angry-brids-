/* ============================================================
   ANGRY BIRDS — запуск, игровой цикл, мост к Android
   ============================================================ */
(function () {
'use strict';

var G = window.ABG, R = window.ABR, UI = window.ABUI;

function fatal(msg) {
  document.body.innerHTML =
    '<div style="position:fixed;inset:0;display:flex;align-items:center;' +
    'justify-content:center;padding:24px;font:16px sans-serif;color:#fff;' +
    'background:#0a0e1a;text-align:center;line-height:1.5">' + msg + '</div>';
}

/* Подключаем патч логики и вёрстки (fix.js) — он должен идти после модулей. */
(function loadFix() {
  var s = document.createElement('script');
  s.src = 'fix.js';
  s.onerror = function () { console.warn('fix.js не загрузился'); };
  document.head.appendChild(s);
})();

if (!G || !R || !UI) { fatal('Модули игры не загрузились. Проверь файлы в assets.'); return; }

var last = 0, started = false;

function frame(ts) {
  if (!last) last = ts;
  var dt = Math.min(0.033, ((ts - last) / 1000) || 0.016);
  last = ts;
  var i, p;

  if (G.state === 'play') {
    G.physics(dt);

    for (i = G.parts.length - 1; i >= 0; i--) {
      p = G.parts[i];
      p.vy += 900 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0 || p.y > G.GROUND_Y + 90) G.parts.splice(i, 1);
    }
    for (i = G.pops.length - 1; i >= 0; i--) {
      G.pops[i].t -= dt * 0.9;
      if (G.pops[i].t <= 0) G.pops.splice(i, 1);
    }

    if (G.flying) {
      var f = G.flying;
      var sp = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
      var onGround = f.y + f.r >= G.GROUND_Y - 1.5;
      if (sp < 45 && onGround) f.still = (f.still || 0) + dt;
      else f.still = 0;
      if (f.x < -90 || f.x > G.WORLD_W + 90 || f.y > G.GROUND_Y + 120 || f.still > 0.85) {
        G.flying = null;
        G.nextBird();
        UI.syncHud();
      } else {
        R.follow(f.x);
      }
    }

    for (i = G.extraFlyers.length - 1; i >= 0; i--) {
      var e = G.extraFlyers[i];
      var s2 = Math.sqrt(e.vx * e.vx + e.vy * e.vy);
      if (e.x < -90 || e.x > G.WORLD_W + 90 || e.y > G.GROUND_Y + 120 ||
          (s2 < 45 && e.y + e.r >= G.GROUND_Y - 1.5)) G.extraFlyers.splice(i, 1);
    }

    var res = G.checkEnd(dt);
    if (res === 'win') UI.onWin();
    else if (res === 'lose') UI.onLose();

    UI.syncScore();
  }

  R.tick(dt);
  R.draw();
  requestAnimationFrame(frame);
}

function start() {
  if (started) return;
  if (!UI.init()) { fatal('Не удалось запустить игру.'); return; }
  started = true;
  G.state = 'menu';
  R.setCam(0); R.snap();
  if (G.save && G.save.music) G.musicStart();
  requestAnimationFrame(frame);
}

/* ---------- мост для MainActivity.java ---------- */
window.onAndroidBack = function () {
  try { return UI.onBack(); } catch (e) { return false; }
};

window.onAndroidPause = function () {
  try { UI.pause(); } catch (e) { /* игнор */ }
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

/* ---------- блокируем лишние жесты ---------- */
document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
document.addEventListener('dblclick', function (e) { e.preventDefault(); });

/* ---------- старт ---------- */
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(start, 0);
} else {
  window.addEventListener('load', start);
}

})();
