/* ANGRY BIRDS — boot.js
   Запуск, мост имён, страховка птицы на рогатке, диагностика на экране.
   Версия: v10-diag  */
(function () {
'use strict';

var BUILD = 'v10-diag';
var G = window.ABG || (window.ABG = {});

/* ---------- сбор ошибок ---------- */
var errs = [];
window.__abErrs = errs;
function pushErr(t) { errs.push(String(t).slice(0, 220)); if (errs.length > 30) errs.shift(); }

window.addEventListener('error', function (e) {
  if (e && e.message) pushErr((e.filename || '?').split('/').pop() + ':' + (e.lineno || 0) + ' — ' + e.message);
  else if (e && e.target && e.target.src) pushErr('не загрузился: ' + String(e.target.src).split('/').pop());
}, true);
window.addEventListener('unhandledrejection', function (e) {
  pushErr('Promise: ' + ((e.reason && e.reason.message) || e.reason));
});

/* ---------- canvas: в index.html он называется cv ---------- */
function canvas() {
  return document.getElementById('game') || document.getElementById('cv') ||
         document.querySelector('canvas');
}

/* ---------- мост имён между модулями ---------- */
function bridge() {
  // достижения: в engine.js метод называется achDone, а интерфейс звал hasAch
  if (typeof G.hasAch !== 'function') {
    if (typeof G.achDone === 'function') G.hasAch = function (id) { return G.achDone(id); };
    else {
      if (!G.save) G.save = {};
      if (!G.save.ach) G.save.ach = [];
      G.hasAch = function (id) { return G.save.ach.indexOf(id) >= 0; };
    }
  }
  if (typeof G.achDone !== 'function' && typeof G.hasAch === 'function') G.achDone = G.hasAch;
  if (!G.save.achs && G.save) G.save.achs = (G.save.ach || []).reduce(function (o, k) { o[k] = 1; return o; }, {});
  // звук
  if (typeof G.playSound !== 'function' && G.SFX && typeof G.SFX.click === 'function') {
    G.playSound = function () { };
  }
}

/* ---------- страховка: птица на рогатке ---------- */
function makeBird(type) {
  var B = (G.BIRDS && G.BIRDS[type]) || { r: 22, mass: 1 };
  return {
    x: (typeof G.SLING_X === 'number' ? G.SLING_X : 200),
    y: (typeof G.SLING_Y === 'number' ? G.SLING_Y : 452),
    r: B.r || 22, type: type || 'red',
    vx: 0, vy: 0, used: false, dx: 0, dy: 0, pulled: false
  };
}
function ensureBird() {
  try {
    if (G.state !== 'play' || G.ended || G.paused) return;
    if (G.active || G.flying) return;
    if (!G.birdsLeft || !G.birdsLeft.length) return;
    var t = G.birdsLeft.shift();
    G.active = makeBird(t);
    if (G.SFX && G.SFX.pull) { /* тихо, без звука при появлении */ }
  } catch (e) { pushErr('ensureBird: ' + e.message); }
}
// ставимся на место, только если движок сам не определил nextBird
if (typeof G.nextBird !== 'function') {
  G.nextBird = function () { ensureBird(); };
}

/* ---------- панель диагностики ---------- */
var panel = null, hidden = false;
function makePanel() {
  if (panel) return panel;
  panel = document.createElement('div');
  panel.id = 'abDiag';
  panel.style.cssText = [
    'position:fixed', 'left:6px', 'right:6px', 'bottom:6px', 'z-index:99999',
    'background:rgba(0,0,0,0.78)', 'color:#8ef', 'font:11px/1.45 monospace',
    'padding:6px 8px', 'border-radius:8px', 'white-space:pre-wrap',
    'max-height:40%;', 'overflow:hidden'
  ].join(';');
  panel.addEventListener('click', function () { hidden = true; panel.style.display = 'none'; });
  document.body.appendChild(panel);
  return panel;
}
function num(v) { return (typeof v === 'number' && isFinite(v)) ? (Math.round(v * 100) / 100) : '—'; }

function diagText() {
  var cv = canvas(), R = window.ABR;
  var L = [];
  L.push('сборка ' + BUILD + '  ·  модули: engine' + (window.ABG ? '+' : '-')
    + ' engine2' + (window.ABG2 ? '+' : '-') + ' render' + (window.ABR ? '+' : '-')
    + ' ui' + (window.ABU ? '+' : '-') + ' controls' + (window.ABC ? '+' : '-'));
  L.push('canvas: ' + (cv ? ('#' + cv.id + ' ' + cv.width + 'x' + cv.height + ' css ' +
    Math.round(cv.clientWidth) + 'x' + Math.round(cv.clientHeight)) : 'НЕ НАЙДЕН'));
  L.push('R=' + num(G.SLING_X) + ' G=' + num(G.GROUND_Y) + ' мир ' + num(G.WORLD_W) + 'x' + num(G.WORLD_H));
  L.push('блоков ' + ((G.blocks || []).length) + ' · свиней ' + ((G.pigs || []).length)
    + ' · активная ' + (G.active ? G.active.type : 'НЕТ')
    + ' · запас ' + ((G.birdsLeft || []).length));
  if (R) L.push('камера z' + num(R.getScale ? R.getScale() : G.scale)
    + ' x' + num(R.getCamX ? R.getCamX() : G.camX)
    + ' y' + num(R.getCamY ? R.getCamY() : G.camY));
  L.push('состояние ' + (G.state || '—') + ' · пауза ' + (G.paused ? 'да' : 'нет')
    + ' · уровень ' + num(G.level));
  L.push('ошибок ' + errs.length + (errs.length ? ': ' + errs[errs.length - 1] : ''));
  if (errs.length > 1) L.push('ранее: ' + errs[errs.length - 2]);
  L.push('(тап по панели — скрыть)');
  return L.join('\n');
}

function drawPanel() {
  if (hidden || (G.state !== 'play' && G.state !== 'level')) {
    if (panel) panel.style.display = 'none';
    return;
  }
  var p = makePanel();
  p.style.display = 'block';
  p.textContent = diagText();
}

/* ---------- цикл ---------- */
function loop() {
  try {
    ensureBird();
    var dt = 1 / 60;
    if (window.ABG2 && typeof window.ABG2.update === 'function' && !G.paused) window.ABG2.update(dt);
  } catch (e) { pushErr('физика: ' + e.message); }

  try {
    if (window.ABR && typeof window.ABR.draw === 'function') window.ABR.draw();
  } catch (e) { pushErr('рендер: ' + e.message); }

  try {
    if (window.ABU && typeof window.ABU.update === 'function') window.ABU.update();
  } catch (e) { pushErr('ui.update: ' + e.message); }

  drawPanel();
  window.requestAnimationFrame(loop);
}

/* ---------- запуск ---------- */
function boot() {
  bridge();
  var tries = 0;
  (function wait() {
    tries++;
    bridge();
    if ((canvas() && window.ABR) || tries > 80) {
      try { makePanel(); } catch (e) { }
      window.requestAnimationFrame(loop);
      setTimeout(function () {
        bridge();
        if (!(G.blocks || []).length) {
          try { if (G.startLevel) G.startLevel(1); } catch (e) { pushErr('startLevel: ' + e.message); }
        }
        ensureBird();
      }, 700);
      return;
    }
    setTimeout(wait, 50);
  })();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

window.ABDiag = { show: function () { hidden = false; }, hide: function () { hidden = true; }, text: diagText, build: BUILD };
window.ABOOT = { build: BUILD, errs: errs, canvas: canvas, bird: ensureBird };
})();
