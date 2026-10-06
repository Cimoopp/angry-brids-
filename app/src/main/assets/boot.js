/* ============================================================
   ANGRY BIRDS — запуск, игровой цикл, связь с Android
   Зависит от window.ABG, window.ABR, window.AB
   ============================================================ */
(function () {
'use strict';
var G = window.ABG, R = window.ABR, UI = window.AB;
if (!G || !R || !UI) { console.error('Модули не загружены'); return; }

var lastTs = 0, lastAlive = -1, winLock = false;

function step(dt) {
  var i, p;

  if (G.state === 'play') {
    G.physics(dt);

    // частицы
    for (i = G.parts.length - 1; i >= 0; i--) {
      p = G.parts[i];
      p.vy += 900 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0 || p.y > G.GROUND_Y + 40) G.parts.splice(i, 1);
    }

    // всплывающие очки
    for (i = G.pops.length - 1; i >= 0; i--) {
      G.pops[i].t -= dt * 0.9;
      if (G.pops[i].t <= 0) G.pops.splice(i, 1);
    }

    // улетевшая птица
    if (G.flying && G.flying.state === 'fly') {
      var f = G.flying;
      var sp = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
      var gone = f.x < -60 || f.x > G.WORLD_W + 60 || f.y > G.GROUND_Y + 80;
      if (sp < 40 && f.y + f.r >= G.GROUND_Y - 1) f.still = (f.still || 0) + dt;
      else f.still = 0;
      if (gone || f.still > 0.9) { G.flying = null; G.nextBird(); }
      else R.follow(f.x, dt);
    }

    // осколки от синей птицы
    for (i = G.extraFlyers.length - 1; i >= 0; i--) {
      var eb = G.extraFlyers[i];
      var sp2 = Math.sqrt(eb.vx * eb.vx + eb.vy * eb.vy);
      if (eb.x < -60 || eb.x > G.WORLD_W + 60 || eb.y > G.GROUND_Y + 80 ||
          (sp2 < 40 && eb.y + eb.r >= G.GROUND_Y - 1)) G.extraFlyers.splice(i, 1);
    }

    if (!winLock) {
      var res = G.checkEnd(dt);
      if (res === 'win') { winLock = true; UI.onWin(); }
      else if (res === 'lose') { winLock = true; UI.onLose(); }
    }

    var alive = G.alivePigs();
    if (alive !== lastAlive) { lastAlive = alive; UI.syncHud(); }
  }

  R.updateClouds(dt);
}

function frame(ts) {
  var dt = (ts - lastTs) / 1000;
  if (!isFinite(dt) || dt <= 0) dt = 0.016;
  if (dt > 0.033) dt = 0.033;
  lastTs = ts;

  step(dt);
  R.draw();

  var hs = document.getElementById('hudScore');
  if (hs) hs.textContent = G.score;

  requestAnimationFrame(frame);
}

function startLevelReset() {
  winLock = false;
  lastAlive = -1;
}

// сброс блокировки при старте уровня
var origBegin = UI.beginLevel;
UI.beginLevel = function (n) { startLevelReset(); origBegin(n); };

UI.init();
requestAnimationFrame(function (ts) { lastTs = ts; frame(ts); });

/* ---- вызовы из MainActivity ---- */
window.onAndroidBack = function () {
  try { return !!UI.onBack(); } catch (e) { return false; }
};
window.onAndroidPause = function () {
  try { UI.pauseGame(); } catch (e) { /* игнор */ }
};
window.onAndroidResume = function () { /* цикл продолжает идти сам */ };
})();
