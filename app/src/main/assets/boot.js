/* ANGRY BIRDS — boot.js
   v12: запуск игры, физики и кнопок в одном месте.

   ЧТО БЫЛО СЛОМАНО (найдено по факту):
   1) ABC.init() не вызывался НИКОГДА — значит bind() в controls.js не
      выполнялся, и ни одна кнопка меню не получала обработчик.
   2) boot искал window.ABG2, которого не существует: физика лежит в
      самом ABG (engine2.js дописывает методы туда). Итог — G.physics()
      и G.checkEnd() не вызывались вообще: птица не летела, свиньи не
      падали, уровень не завершался.
   3) ui.js/controls.js возвращали null, если ABR не был готов в момент
      их выполнения — модули молча отключались.

   Экспорт: window.ABOOT, window.ABDiag
*/
(function () {
'use strict';

var G = window.ABG;
if (!G) { console.error('ABG не загружен — engine.js не сработал'); return; }

/* физика и логика живут в ABG; псевдоним нужен старым вызовам */
window.ABG2 = G;

var errs = window.__abErrs = [];
var panel = null, panelUntil = 0, debugOn = false;
var lastId = '', lastAct = 0, booted = false;

function pushErr(t) {
  errs.push(String(t).slice(0, 200));
  if (errs.length > 20) errs.shift();
  panelUntil = (window.performance ? performance.now() : Date.now()) + 6000;
}

window.addEventListener('error', function (e) {
  if (e && e.message) pushErr(String(e.filename || '?').split('/').pop() + ':' + (e.lineno || 0) + ' — ' + e.message);
  else if (e && e.target && e.target.src) pushErr('не загрузился: ' + String(e.target.src).split('/').pop());
}, true);
window.addEventListener('unhandledrejection', function (e) {
  pushErr('Promise: ' + ((e.reason && e.reason.message) || e.reason));
});

function $(id) { return document.getElementById(id); }
function canvasEl() { return $('cv') || document.querySelector('canvas'); }
function now() { return window.performance ? performance.now() : Date.now(); }

/* ---------------- мост имён ---------------- */
function bridge() {
  try {
    if (typeof G.hasAch !== 'function') {
      G.hasAch = (typeof G.achDone === 'function')
        ? function (id) { return G.achDone(id); }
        : function (id) { return ((G.save && G.save.ach) || []).indexOf(id) >= 0; };
    }
    if (typeof G.achDone !== 'function') G.achDone = G.hasAch;
    if (G.save && !G.save.ach) G.save.ach = [];
    if (typeof G.alivePigs !== 'function') G.alivePigs = function () {
      var n = 0, i; for (i = 0; i < (G.pigs || []).length; i++) if (!G.pigs[i].dead) n++; return n;
    };
    if (typeof G.starsTotal !== 'function') G.starsTotal = function () {
      var s = 0, k, st = (G.save && G.save.stars) || {};
      for (k in st) if (st.hasOwnProperty(k)) s += st[k];
      return s;
    };
    if (typeof G.maxUnlocked !== 'function') G.maxUnlocked = function () { return (G.save && G.save.unlocked) || 1; };
    if (typeof G.achCount !== 'function') G.achCount = function () { return ((G.save && G.save.ach) || []).length; };
    if (typeof G.levelsDone !== 'function') G.levelsDone = function () { return 0; };
    if (typeof G.threeStars !== 'function') G.threeStars = function () { return 0; };
    if (typeof G.checkAch !== 'function') G.checkAch = function () { };
    if (typeof G.store !== 'function') G.store = function () { };
    if (typeof G.physics !== 'function') G.physics = function () { };
    if (typeof G.checkEnd !== 'function') G.checkEnd = function () { return null; };
    if (typeof G.shoot !== 'function') G.shoot = function () { return false; };
    if (typeof G.nextBird !== 'function') G.nextBird = ensureBird;
    if (!G.ACH) G.ACH = [];
    if (!G.ITEMS) G.ITEMS = [];
    if (!G.BIRDS) G.BIRDS = { red: { r: 22, mass: 1, ability: 'none' } };
  } catch (e) { pushErr('мост: ' + e.message); }
}

/* ---------------- птица на рогатке ---------------- */
function ensureBird() {
  try {
    if (G.state !== 'play' || G.ended || G.paused) return;
    if (G.active || G.flying) return;
    if (!G.birdsLeft || !G.birdsLeft.length) return;
    var t = G.birdsLeft.shift();
    var B = (G.BIRDS && G.BIRDS[t]) || { r: 22, mass: 1, ability: 'none' };
    G.active = {
      type: t, x: G.SLING_X, y: G.SLING_Y, vx: 0, vy: 0,
      r: B.r, mass: B.mass, ability: B.ability, state: 'ready', used: false
    };
  } catch (e) { pushErr('птица: ' + e.message); }
}

/* ---------------- экраны ---------------- */
function showScreen(name) {
  if (window.ABUI && typeof window.ABUI.show === 'function') {
    try { window.ABUI.show(name); return; } catch (e) { pushErr('ABUI.show: ' + e.message); }
  }
  ['menu', 'levels', 'shop', 'ach', 'settings'].forEach(function (s) {
    var el = $(s); if (!el) return;
    el.style.display = (s === name) ? 'flex' : 'none';
  });
  var hud = $('hud'); if (hud) hud.style.display = name ? 'none' : 'block';
}

function levelUp(n) {
  n = Math.max(1, Math.min(G.TOTAL_LEVELS || 50, Math.floor(n) || 1));
  if (window.ABC && typeof window.ABC.beginLevel === 'function') {
    try { window.ABC.beginLevel(n); return; } catch (e) { pushErr('beginLevel: ' + e.message); }
  }
  if (typeof G.startLevel === 'function') G.startLevel(n);
  showScreen(null);
}

/* ---------------- страховка кнопок ----------------
   Выполняется, только если controls.init() не сработал. */
function fallbackBind() {
  if (window.__abBound) return true;
  window.__abBound = true;

  function act(id) {
    var t = now();
    if (id === lastId && t - lastAct < 400) return;   /* click и touchend по одной кнопке */
    lastId = id; lastAct = t;
    switch (id) {
      case 'btnPlay': showScreen('levels'); break;
      case 'btnShop': showScreen('shop'); break;
      case 'btnAch': showScreen('ach'); break;
      case 'btnSettings': showScreen('settings'); break;
      case 'btnLevelsBack': case 'btnShopBack': case 'btnAchBack': case 'btnSettingsBack':
        showScreen('menu'); break;
      case 'btnPause': if (window.ABC && ABC.pause) ABC.pause(); break;
      case 'btnResume': if (window.ABC && ABC.resume) ABC.resume(); break;
      case 'btnRestart': case 'btnReplay': case 'btnRetry': levelUp(G.level); break;
      case 'btnNext': levelUp((G.level || 1) + 1); break;
      case 'btnQuitP': case 'btnQuitW': case 'btnQuitL':
        if (window.ABC && ABC.goMenu) ABC.goMenu(); else showScreen('menu');
        break;
      case 'swSound': G.save.sound = !G.save.sound; G.store(); break;
      case 'swMusic': G.save.music = !G.save.music; G.store(); break;
      case 'swVibe': G.save.vibe = !G.save.vibe; G.store(); break;
      case 'btnReset': if (G.resetProgress) G.resetProgress(); break;
    }
  }

  function walk(e) {
    var t = e.target;
    while (t && t !== document.body) {
      if (t.id) { act(t.id); return; }
      t = t.parentNode;
    }
  }
  document.addEventListener('click', walk, true);
  document.addEventListener('touchend', walk, true);
  return true;
}

/* двойной тап по счётчику уровня — показать/скрыть панель */
function bindTaps() {
  var taps = 0, tt = 0;
  function onTap() {
    var t = now();
    if (t - tt > 420) taps = 0;
    taps++; tt = t;
    if (taps >= 2) { taps = 0; debugOn = !debugOn; }
  }
  ['hudLevel', 'hudScore', 'menuCoins'].forEach(function (id) {
    var el = $(id);
    if (el) el.addEventListener('click', onTap);
  });
}

/* ---------------- панель ---------------- */
function diagText() {
  var cv = canvasEl(), R = window.ABR;
  var L = [];
  L.push('v12 · engine' + (window.ABG ? '+' : '-') + ' physics' + (typeof G.physics === 'function' ? '+' : '-')
    + ' render' + (window.ABR ? '+' : '-') + ' ui' + (window.ABUI ? '+' : '-') + ' ctl' + (window.ABC ? '+' : '-'));
  L.push('canvas ' + (cv ? cv.width + 'x' + cv.height : 'нет') + ' · z' + ((R && R.getScale) ? R.getScale().toFixed(2) : '—')
    + ' · блоков ' + ((G.blocks || []).length) + ' · свиней ' + ((G.pigs || []).length)
    + ' · запас ' + ((G.birdsLeft || []).length));
  L.push('состояние ' + (G.state || '—') + ' · уровень ' + (G.level || 0)
    + ' · ошибок ' + errs.length + (errs.length ? ': ' + errs[errs.length - 1] : ''));
  return L.join('\n');
}

function drawPanel() {
  var show = debugOn || now() < panelUntil;
  if (!panel && document.body) {
    panel = document.createElement('div');
    panel.id = 'abDiag';
    panel.style.cssText = 'position:fixed;left:6px;right:6px;top:6px;z-index:9999;'
      + 'pointer-events:none;background:rgba(0,0,0,.6);color:#9ef;font:11px/1.4 monospace;'
      + 'padding:5px 7px;border-radius:8px;white-space:pre-wrap';
    document.body.appendChild(panel);
  }
  if (!panel) return;
  panel.style.display = show ? 'block' : 'none';
  if (show) panel.textContent = diagText();
}

/* ---------------- кадр ---------------- */
function frame() {
  var dt = 1 / 60;

  try { if (G.state === 'play' && !G.paused && !G.ended) G.physics(dt); }
  catch (e) { pushErr('физика: ' + e.message); }

  try { if (window.ABR && ABR.tick) ABR.tick(dt); } catch (e) { pushErr('tick: ' + e.message); }

  try {
    if (G.state === 'play' && !G.paused) {
      if (G.flying && window.ABR && ABR.follow) ABR.follow(G.flying.x);
      ensureBird();
      var res = G.checkEnd(dt);
      if (res === 'win' && window.ABC && ABC.onWin) ABC.onWin();
      if (res === 'lose' && window.ABC && ABC.onLose) ABC.onLose();
    }
  } catch (e) { pushErr('логика: ' + e.message); }

  try { if (window.ABR && ABR.draw) ABR.draw(); }
  catch (e) { pushErr('рендер: ' + e.message); }

  try { if (window.ABUI) { if (ABUI.syncHud) ABUI.syncHud(); if (ABUI.syncScore) ABUI.syncScore(); } }
  catch (e) { }

  drawPanel();
  window.requestAnimationFrame(frame);
}

/* ---------------- запуск ---------------- */
function start(tries) {
  tries = tries || 0;
  bridge();

  if (!canvasEl() || !window.ABR) {
    if (tries < 120) setTimeout(function () { start(tries + 1); }, 40);
    else pushErr('render.js не поднялся');
    return;
  }
  if (booted) return;
  bridge();

  var ok = false;
  if (window.ABC && typeof window.ABC.init === 'function') {
    try { ok = (window.ABC.init() === true); } catch (e) { pushErr('ABC.init: ' + e.message); }
  }
  if (!ok) {
    try { if (window.ABR.init) window.ABR.init(); } catch (e) { pushErr('ABR.init: ' + e.message); }
    try { if (window.ABUI && ABUI.show) ABUI.show('menu'); } catch (e) { }
    fallbackBind();
  }

  bindTaps();
  bridge();

  /* уровень строим заранее — чтобы поле было готово к нажатию «Играть» */
  if (!(G.blocks || []).length && typeof G.startLevel === 'function') {
    try { G.startLevel(1); G.state = 'menu'; } catch (e) { pushErr('startLevel: ' + e.message); }
  }

  showScreen('menu');
  ensureBird();
  booted = true;
  window.requestAnimationFrame(frame);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () { start(0); });
} else {
  start(0);
}

window.ABOOT = { build: 'v12', errs: errs, bird: ensureBird, fallbackBind: fallbackBind };
window.ABDiag = {
  show: function () { debugOn = true; }, hide: function () { debugOn = false; },
  text: diagText, build: 'v12'
};
})();
