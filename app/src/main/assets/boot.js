/* ANGRY BIRDS — boot.js
   Запуск, мост имён между модулями, ловля ошибок и диагностика на экране.
   Версия: v9-diag */
(function () {
'use strict';

var BUILD = 'v9-diag';
var G = window.ABG || (window.ABG = {});

/* ---------- сбор ошибок ---------- */
var errs = [];
window.__abErrs = errs;
function pushErr(t) { errs.push(String(t).slice(0, 200)); if (errs.length > 30) errs.shift(); }

window.addEventListener('error', function (e) {
  if (e && e.message) pushErr((e.filename || '?') + ':' + (e.lineno || 0) + ' — ' + e.message);
  else if (e && e.target && e.target.src) pushErr('не загрузился: ' + e.target.src.split('/').pop());
}, true);
window.addEventListener('unhandledrejection', function (e) {
  pushErr('Promise: ' + ((e.reason && e.reason.message) || e.reason));
});

/* ---------- мост имён ---------- */
function bridge() {
  var pairs = [
    ['hasAch', 'achDone'], ['achDone', 'hasAch'],
    ['saveAch', 'saveAchs'], ['loadAch', 'loadAchs'],
    ['getSnd', 'sound'], ['playSnd', 'playSound']
  ];
  for (var i = 0; i < pairs.length; i++) {
    var a = pairs[i][0], b = pairs[i][1];
    if (typeof G[a] !== 'function' && typeof G[b] === 'function') G[a] = G[b];
  }
  // достижения: приводим любую из форм хранения к объекту
  if (!G.achs || typeof G.achs !== 'object') G.achs = {};
  if (typeof G.hasAch !== 'function') {
    G.hasAch = function (id) { return !!G.achs[id]; };
  }
}

/* ---------- панель диагностики ---------- */
var panel = null, hidden = false;
function makePanel() {
  if (panel) return panel;
  panel = document.createElement('div');
  panel.id = 'abDiag';
  panel.style.cssText = [
    'position:fixed', 'left:6px', 'right:6px', 'bottom:6px', 'z-index:99999',
    'background:rgba(0,0,0,0.75)', 'color:#8ef', 'font:11px/1.45 monospace',
    'padding:6px 8px', 'border-radius:8px', 'white-space:pre-wrap',
    'max-height:38%;', 'overflow:hidden', 'pointer-events:none'
  ].join(';');
  document.body.appendChild(panel);
  return panel;
}
function num(v) { return (typeof v === 'number' && isFinite(v)) ? (Math.round(v * 100) / 100) : '—'; }

function diagText() {
  var cv = document.getElementById('game') || document.querySelector('canvas');
  var R = window.ABR, C = window.ABC, U = window.ABU;
  var L = [];
  L.push('сборка ' + BUILD + '  ·  модули: ' + [G ? 'engine' : '-', window.ABG2 ? 'engine2' : '-',
    R ? 'render' : '-', U ? 'ui' : '-', C ? 'controls' : '-'].join('/'));
  L.push('canvas: ' + (cv ? (cv.width + 'x' + cv.height + ' css ' + Math.round(cv.clientWidth) + 'x' + Math.round(cv.clientHeight)) : 'НЕТ'));
  L.push('рогатка R=' + num(G.SLING_X || (G.SLING && G.SLING.x)) + ' G=' + num(G.GROUND_Y || (G.GROUND && G.GROUND.y))
    + '  ·  мир ' + num(G.WORLD_W) + 'x' + num(G.WORLD_H));
  L.push('объекты: блоков ' + ((G.blocks || []).length) + ', свиней ' + ((G.pigs || []).length)
    + ', активная птица ' + (G.active ? 'есть' : 'НЕТ') + ', в запасе ' + num(G.birdsLeft || (G.left && G.left.length) || 0));
  if (R) {
    L.push('камера: z' + num(R.scale ? R.scale() : G.scale) + ' x' + num(R.camX ? R.camX() : G.camX)
      + ' y' + num(R.camY ? R.camY() : G.camY) + '  ·  уровень ' + num(G.level || 1));
  }
  L.push('состояние: ' + (G.state || G.mode || '—') + '  ·  пауза ' + (G.paused ? 'да' : 'нет'));
  L.push('ошибок: ' + errs.length + (errs.length ? ' — ' + errs[errs.length - 1] : ''));
  if (errs.length > 1) L.push('предыдущая: ' + errs[errs.length - 2]);
  return L.join('\n');
}

function drawPanel() {
  if (hidden) { if (panel) panel.style.display = 'none'; return; }
  var p = makePanel();
  p.style.display = 'block';
  p.textContent = diagText();
}

/* ---------- запуск ---------- */
function startLevelSafe() {
  try {
    if (typeof G.startLevel === 'function' && !G.level) G.startLevel(1);
  } catch (e) { pushErr('startLevel: ' + e.message); }
}

function loop() {
  try {
    var dt = 1 / 60;
    if (window.ABG2 && typeof window.ABG2.update === 'function' && !G.paused) window.ABG2.update(dt);
    if (window.ABR && typeof window.ABR.draw === 'function') window.ABR.draw();
    if (window.ABU && typeof window.ABU.update === 'function') {
      try { window.ABU.update(); } catch (e) { pushErr('ui.update: ' + e.message); }
    }
  } catch (e) {
    pushErr('кадр: ' + e.message);
  }
  drawPanel();
  window.requestAnimationFrame(loop);
}

function boot() {
  bridge();
  var tries = 0;
  (function wait() {
    tries++;
    bridge();
    var ok = !!document.getElementById('game') && !!window.ABR;
    if (ok || tries > 60) {
      startLevelSafe();
      makePanel();
      window.requestAnimationFrame(loop);
      // повторная проверка: если мир пуст — пробуем построить уровень снова
      setTimeout(function () {
        if (!(G.blocks || []).length) { try { G.startLevel && G.startLevel(1); } catch (e) { pushErr(e.message); } }
      }, 800);
      return;
    }
    setTimeout(wait, 50);
  })();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

window.ABDiag = { show: function () { hidden = false; }, hide: function () { hidden = true; }, text: diagText };
window.ABOOT = { build: BUILD, errs: errs };
})();
