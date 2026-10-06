/* ANGRY BIRDS — запуск, игровой цикл, связь с Android. Экспорт: window.AB */
(function () {
'use strict';
var G = window.ABG, R = window.ABR, U = window.ABU;
if (!G || !R || !U) { console.error('не все модули загружены'); return; }

var last = 0, lastAlive = -1, ready = false;

function tick(ts) {
  var dt = Math.min(0.033, ((ts - last) / 1000) || 0.016);
  last = ts;
  var i, p;

  if (G.state === 'play') {
    G.physics(dt);

    for (i = G.parts.length - 1; i >= 0; i--) {
      p = G.parts[i];
      p.vy += 950 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0 || p.y > G.GROUND_Y + 60) G.parts.splice(i, 1);
    }
    for (i = G.pops.length - 1; i >= 0; i--) {
      G.pops[i].t -= dt * 0.85;
      if (G.pops[i].t <= 0) G.pops.splice(i, 1);
    }

    if (G.flying) {
      var f = G.flying;
      var sp = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
      var off = f.x < -80 || f.x > G.WORLD_W + 80 || f.y > G.GROUND_Y + 100;
      if (sp < 45 && f.y + f.r >= G.GROUND_Y - 2) f.still = (f.still || 0) + dt;
      else f.still = 0;
      if (off || f.still > 0.9) { G.flying = null; G.nextBird(); }
      else R.follow(f.x, dt);
    }

    for (i = G.extraFlyers.length - 1; i >= 0; i--) {
      var eb = G.extraFlyers[i];
      var sp2 = Math.sqrt(eb.vx * eb.vx + eb.vy * eb.vy);
      if (eb.x < -80 || eb.x > G.WORLD_W + 80 || eb.y > G.GROUND_Y + 100 ||
          (sp2 < 45 && eb.y + eb.r >= G.GROUND_Y - 2)) G.extraFlyers.splice(i, 1);
    }

    var res = G.checkEnd(dt);
    if (res === 'win') U.onWin();
    else if (res === 'lose') U.onLose();

    var alive = G.alivePigs();
    if (alive !== lastAlive) { lastAlive = alive; U.syncHud(); }
  }

  R.updateClouds(dt);
  R.draw();

  var hs = document.getElementById('hudScore');
  if (hs) hs.textContent = G.score;

  requestAnimationFrame(tick);
}

/* ---------- хуки для Android ---------- */
window.onAndroidBack = function () {
  if (G.state === 'play') { U.pauseGame(); return true; }
  if (G.state === 'pause') { U.resumeGame(); return true; }
  if (G.state === 'menu') return false;
  U.goMenu();
  return true;
};

window.onAndroidPause = function () {
  if (G.state === 'play') U.pauseGame();
  G.musicStop();
};

window.onAndroidResume = function () {
  if (G.save.music && G.state === 'play') G.musicStart();
};

/* ---------- старт ---------- */
function boot() {
  if (ready) return;
  ready = true;
  if (!R.init()) { console.error('canvas не найден'); return; }
  U.init();
  last = performance.now();
  requestAnimationFrame(tick);
}

window.addEventListener('resize', function () { R.resize(); });
window.addEventListener('orientationchange', function () { setTimeout(function () { R.resize(); }, 250); });
document.addEventListener('visibilitychange', function () {
  if (document.hidden) window.onAndroidPause();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

window.AB = { boot: boot };
})();
