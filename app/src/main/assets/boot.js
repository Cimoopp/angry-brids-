/* ============================================================
   ANGRY BIRDS — игровой цикл, запуск, мост к Android
   Экспорт: ни одного. Работает как точка входа.
   ============================================================ */
(function () {
'use strict';

var G = window.ABG, R = window.ABR, U = window.ABUI, C = window.ABC;

function fatal(msg) {
  document.body.innerHTML =
    '<div style="position:fixed;inset:0;display:flex;align-items:center;' +
    'justify-content:center;padding:24px;font:16px sans-serif;color:#fff;' +
    'background:#0a0e1a;text-align:center;line-height:1.6;z-index:999">' + msg + '</div>';
}

var problems = [];
if (!G) problems.push('engine.js');
if (!window.ABG || !window.ABG.physics) problems.push('engine2.js');
if (!R) problems.push('render.js');
if (!U) problems.push('ui.js');
if (!C) problems.push('controls.js');

if (problems.length) {
  fatal('Не загрузились модули: <b>' + problems.join(', ') + '</b>.<br><br>' +
        'Проверь, что эти файлы лежат в app/src/main/assets и подключены в index.html.');
  return;
}

var last = 0, started = false;

function stepParticles(dt) {
  var i, p;
  for (i = G.parts.length - 1; i >= 0; i--) {
    p = G.parts[i];
    p.vy += 900 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0 || p.y > G.GROUND_Y + 120) G.parts.splice(i, 1);
  }
  for (i = G.pops.length - 1; i >= 0; i--) {
    G.pops[i].t -= dt * 0.85;
    if (G.pops[i].t <= 0) G.pops.splice(i, 1);
  }
}

function stepFlying(dt) {
  var f = G.flying;
  if (!f) return;
  var sp = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
  var onGround = f.y + f.r >= G.GROUND_Y - 2;
  if (sp < 50 && onGround) f.still = (f.still || 0) + dt;
  else f.still = 0;

  if (f.x < -100 || f.x > G.WORLD_W + 100 || f.y > G.GROUND_Y + 150 || f.still > 0.7) {
    G.flying = null;
    G.nextBird();
    U.syncHud();
  } else {
    R.follow(f.x);
  }
}

function stepExtra(dt) {
  var i, e, sp;
  for (i = G.extraFlyers.length - 1; i >= 0; i--) {
    e = G.extraFlyers[i];
    sp = Math.sqrt(e.vx * e.vx + e.vy * e.vy);
    if (e.x < -100 || e.x > G.WORLD_W + 100 || e.y > G.GROUND_Y + 150 ||
        (sp < 50 && e.y + e.r >= G.GROUND_Y - 2)) {
      G.extraFlyers.splice(i, 1);
    }
  }
}

function frame(ts) {
  if (!last) last = ts;
  var dt = Math.min(0.033, ((ts - last) / 1000) || 0.016);
  last = ts;

  if (G.state === 'play') {
    if (G.physics) G.physics(dt);
    stepParticles(dt);
    stepFlying(dt);
    stepExtra(dt);

    var res = G.checkEnd ? G.checkEnd(dt) : null;
    if (res === 'win') C.onWin();
    else if (res === 'lose') C.onLose();

    U.syncHud();
    U.syncScore();
  }

  R.tick(dt);
  R.draw();
  requestAnimationFrame(frame);
}

function start() {
  if (started) return;
  if (!C.init()) {
    fatal('Не удалось запустить игру: canvas #cv не найден.');
    return;
  }
  started = true;
  C.goMenu();
  requestAnimationFrame(frame);
}

/* ---------- вызовы из MainActivity.java ---------- */
window.onAndroidBack = function () {
  try { return !!C.onBack(); } catch (e) { return false; }
};
window.onAndroidPause = function () {
  try { C.pause(); } catch (e) { /* игнор */ }
  try { G.musicStop(); } catch (e) { /* игнор */ }
  return true;
};
window.onAndroidResume = function () {
  try {
    if (G.save && G.save.music && G.state !== 'play') G.musicStart();
  } catch (e) { /* игнор */ }
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
