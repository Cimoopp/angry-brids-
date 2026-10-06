/* ANGRY BIRDS — запуск, игровой цикл, связь с Android */
(function () {
'use strict';
var G = window.ABG, R = window.ABR, UI = window.AB;
if (!G || !R || !UI) { console.error('Модули игры не загружены'); return; }

var last = 0, over = false;

function step(dt) {
  var i, p;

  G.physics(dt);

  for (i = G.parts.length - 1; i >= 0; i--) {
    p = G.parts[i];
    p.vy += 900 * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0 || p.y > G.GROUND_Y + 40) G.parts.splice(i, 1);
  }
  for (i = G.pops.length - 1; i >= 0; i--) {
    G.pops[i].t -= dt * 0.9;
    if (G.pops[i].t <= 0) G.pops.splice(i, 1);
  }

  if (G.flying && G.flying.state === 'fly') {
    var f = G.flying, sp = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
    if (sp < 40 && f.y + f.r >= G.GROUND_Y - 1) f.still = (f.still || 0) + dt;
    else f.still = 0;
    if (f.x < -80 || f.x > G.WORLD_W + 80 || f.y > G.GROUND_Y + 80 || f.still > 0.9) {
      G.flying = null;
      G.nextBird();
    } else {
      R.setTarget(f.x - R.viewW * 0.42);
    }
  }

  for (i = G.extraFlyers.length - 1; i >= 0; i--) {
    var eb = G.extraFlyers[i], sp2 = Math.sqrt(eb.vx * eb.vx + eb.vy * eb.vy);
    if (eb.x < -80 || eb.x > G.WORLD_W + 80 || eb.y > G.GROUND_Y + 80 ||
        (sp2 < 40 && eb.y + eb.r >= G.GROUND_Y - 1)) G.extraFlyers.splice(i, 1);
  }
}

function frame(ts) {
  var dt = Math.min(0.033, ((ts - last) / 1000) || 0.016);
  last = ts;

  if (G.state === 'play') {
    step(dt);

    var alive = G.alivePigs();
    if (alive !== UI.lastAlive) { UI.lastAlive = alive; UI.syncHud(); }

    var res = G.checkEnd(dt);
    if (res === 'win' && !over) { over = true; UI.onWin(); }
    else if (res === 'lose' && !over) { over = true; UI.onLose(); }
  } else {
    over = false;
  }

  R.cameraUpdate(dt);
  R.cloudStep(dt);
  R.draw();

  var hs = document.getElementById('hudScore');
  if (hs) hs.textContent = G.score;

  requestAnimationFrame(frame);
}

function start() {
  UI.init();
  last = performance.now();
  requestAnimationFrame(frame);
}

/* вызовы из MainActivity */
window.onAndroidBack = function () {
  try { return !!UI.onBack(); } catch (e) { return false; }
};
window.onAndroidPause = function () {
  if (G.musicStop) G.musicStop();
  if (G.state === 'play') { G.state = 'pause'; var ov = document.getElementById('ovPause'); if (ov) ov.classList.remove('hidden'); }
};
window.onAndroidResume = function () {
  if (G.save && G.save.music && G.musicStart) G.musicStart();
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
})();
