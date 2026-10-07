/* ============================================================
   ANGRY BIRDS — запуск, игровой цикл, мост к Android
   ============================================================ */
(function () {
'use strict';

var G = window.ABG, R = window.ABR, U = window.ABUI, C = window.ABC;

function fatal(msg) {
  document.body.innerHTML =
    '<div style="position:fixed;inset:0;display:flex;align-items:center;' +
    'justify-content:center;padding:24px;font:16px/1.5 sans-serif;color:#fff;' +
    'background:#0a0e1a;text-align:center">' + msg + '</div>';
}

if (!G || !R || !U || !C) {
  fatal('Модули игры не загрузились.<br><br>Проверь, что в assets лежат:<br>' +
        'engine.js · engine2.js · render.js · ui.js · controls.js · boot.js');
  return;
}

/* ---------- счётчик выстрелов + сброс уровня ---------- */
G.shots = 0;

var origStart = G.startLevel;
G.startLevel = function (n) {
  var res = origStart.call(G, n);
  G.shots = 0;
  G.ended = false;
  G.winT = 0;
  G.loseT = 0;
  G.state = 'play';
  return res;
};

var origShoot = G.shoot;
G.shoot = function () {
  var ok = origShoot.apply(G, arguments);
  if (ok) G.shots++;
  return ok;
};

/* ---------- игровой цикл ---------- */
var last = 0, running = false;
var hudCache = { pigs: -1, birds: -1, score: -1 };

function frame(ts) {
  if (!last) last = ts;
  var dt = Math.min(0.033, ((ts - last) / 1000) || 0.016);
  last = ts;

  if (G.state === 'play') {
    G.physics(dt);

    /* осколки */
    for (var i = G.parts.length - 1; i >= 0; i--) {
      var p = G.parts[i];
      p.vy += 900 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0 || p.y > G.GROUND_Y + 120) G.parts.splice(i, 1);
    }
    for (var k = G.pops.length - 1; k >= 0; k--) {
      G.pops[k].t -= dt * 0.9;
      if (G.pops[k].t <= 0) G.pops.splice(k, 1);
    }

    /* приземлившаяся птица */
    if (G.flying) {
      var f = G.flying;
      var sp = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
      var grounded = f.y + f.r >= G.GROUND_Y - 2;
      f.still = (sp < 50 && grounded) ? f.still + dt : 0;
      if (f.x < -100 || f.x > G.WORLD_W + 100 || f.y > G.GROUND_Y + 140 || f.still > 0.7) {
        G.flying = null;
        G.nextBird();
        hudCache.birds = -1;
      } else {
        R.follow(f.x);
      }
    }

    /* осколки синей птицы */
    for (var j = G.extraFlyers.length - 1; j >= 0; j--) {
      var e = G.extraFlyers[j];
      var s2 = Math.sqrt(e.vx * e.vx + e.vy * e.vy);
      if (e.x < -100 || e.x > G.WORLD_W + 100 || e.y > G.GROUND_Y + 140 ||
          (s2 < 50 && e.y + e.r >= G.GROUND_Y - 2)) G.extraFlyers.splice(j, 1);
    }

    /* обновляем HUD только при изменениях */
    var pigs = G.alivePigs(), birds = G.birdsLeft.length + (G.active ? 1 : 0);
    if (pigs !== hudCache.pigs || birds !== hudCache.birds || G.score !== hudCache.score) {
      hudCache.pigs = pigs; hudCache.birds = birds; hudCache.score = G.score;
      U.syncHud();
    }

    var res = G.checkEnd(dt);
    if (res === 'win') C.onWin();
    else if (res === 'lose') C.onLose();
  }

  R.tick(dt);
  R.draw();
  requestAnimationFrame(frame);
}

/* ---------- запуск ---------- */
function start() {
  if (running) return;
  if (!C.init()) { fatal('Не удалось запустить игру.'); return; }
  running = true;

  var wrap = document.getElementById('wrap');
  if (wrap) wrap.style.display = 'flex';

  R.setCam(0);
  R.snap();

  var hud = document.getElementById('hud');
  if (hud) hud.style.display = 'none';

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
  if (G.save && G.save.music && G.state !== 'play') G.musicStart();
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
