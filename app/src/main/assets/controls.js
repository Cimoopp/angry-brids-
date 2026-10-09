/* ============================================================
   ANGRY BIRDS — управление, переходы, кнопки, запуск
   Экспорт: window.ABC

   Правки:
   • модуль теперь запускает себя сам (init) — раньше его никто не
     вызывал, и НИ ОДНА кнопка не была привязана;
   • захват рогатки принимает птицу и без поля state (страховка boot.js);
   • R.init() вызывается безопасно, даже если вернёт не true.
   ============================================================ */
window.ABC = (function () {
'use strict';
var G = window.ABG, R = window.ABR, U = window.ABUI;
if (!G || !R) { console.error('ABG или ABR не загружены'); return null; }

/* заглушка, если модуль интерфейса не поднялся */
var UIO = U || {
  show: function () {}, hide: function () {}, reveal: function () {},
  resetCounters: function () {}, money: function () {}, renderSettings: function () {},
  syncHud: function () {}, syncScore: function () {}
};

function $(id) { return document.getElementById(id); }
var dragging = false;

function setDrag(v) { dragging = v; G.dragging = v; }

/* ---------- переходы ---------- */
function beginLevel(n) {
  G.startLevel(n);
  if (R.setCam) R.setCam(0);
  if (R.snap) R.snap();
  setDrag(false);
  UIO.resetCounters();
  UIO.show(null);
  UIO.syncHud();
  UIO.syncScore();
}

function goMenu() {
  G.state = 'menu';
  G.started = false;
  if (G.musicStop) G.musicStop();
  UIO.show('menu');
  UIO.money();
}

function onWin() {
  G.state = 'win';
  var w = G.lastWin || { stars: 1, coins: 0, score: G.score };
  var st = $('winStars');
  if (st) {
    var html = '', i;
    for (i = 0; i < 3; i++) html += (i < w.stars) ? '<span>★</span>' : '<span class="off">☆</span>';
    st.innerHTML = html;
  }
  var a = $('winScore'); if (a) a.textContent = w.score;
  var b = $('winCoins'); if (b) b.textContent = w.coins;
  var nx = $('btnNext');
  if (nx) nx.style.display = (G.level < G.TOTAL_LEVELS) ? '' : 'none';
  UIO.hide($('hud'));
  UIO.reveal($('ovWin'), 'flex');
}

function onLose() {
  G.state = 'lose';
  var lp = $('losePigs');
  if (lp) lp.textContent = G.alivePigs ? G.alivePigs() : 0;
  UIO.hide($('hud'));
  UIO.reveal($('ovLose'), 'flex');
}

function pause() {
  if (G.state !== 'play') return;
  G.state = 'pause';
  UIO.reveal($('ovPause'), 'flex');
}

function resume() {
  UIO.hide($('ovPause'));
  if (G.state === 'pause') G.state = 'play';
}

function onBack() {
  if (G.state === 'win' || G.state === 'lose') { goMenu(); return true; }
  if (G.state === 'pause') { resume(); return true; }
  if (G.state === 'play') { pause(); return true; }
  var m = $('menu');
  var onMenu = !m || (m.style.display !== 'none');
  if (!onMenu) { UIO.show('menu'); return true; }
  return false;
}

/* ---------- касания ---------- */
function pt(e) {
  if (e.touches && e.touches.length) return e.touches[0];
  if (e.changedTouches && e.changedTouches.length) return e.changedTouches[0];
  return e;
}

function onDown(e) {
  if (G.state !== 'play') return;                 /* в меню касания не перехватываем */
  if (e.cancelable && e.type === 'touchstart') e.preventDefault();
  if (G.ac) G.ac();
  if (G.flying && !G.flying.used && G.useAbility) { if (G.useAbility()) return; }
  var p = pt(e);
  if (!R.toWorld) return;
  var w = R.toWorld(p.clientX, p.clientY);
  var a = G.active;
  /* птица из engine2 имеет state:'ready', страховочная из boot.js — тоже */
  if (a && (a.state === 'ready' || typeof a.state === 'undefined')) {
    var dx = w.x - a.x, dy = w.y - a.y;
    if (Math.sqrt(dx * dx + dy * dy) < 220) {
      setDrag(true);
      if (G.SFX && G.SFX.pull) G.SFX.pull();
      move(p);
    }
  }
}

function move(p) {
  var a = G.active;
  if (!a || !R.toWorld) return;
  var w = R.toWorld(p.clientX, p.clientY);
  var dx = w.x - G.SLING_X, dy = w.y - G.SLING_Y;
  var d = Math.sqrt(dx * dx + dy * dy);
  var maxPull = G.MAX_PULL * ((G.has && G.has('gloves')) ? 1.18 : 1);
  if (d > maxPull) { dx = dx / d * maxPull; dy = dy / d * maxPull; }
  a.x = G.SLING_X + dx;
  a.y = G.SLING_Y + dy;
}

function onMove(e) {
  if (!dragging || G.state !== 'play') return;
  move(pt(e));
  if (e.cancelable) e.preventDefault();
}

function onUp() {
  if (!dragging) return;
  setDrag(false);
  if (G.shoot && G.shoot() && G.flying && R.follow) R.follow(G.flying.x);
}

/* ---------- кнопки ---------- */
function bind() {
  function on(id, fn) {
    var el = $(id);
    if (!el) return;
    /* click + touchend с защитой от двойного срабатывания */
    var last = 0;
    function once(e) {
      var t = Date.now();
      if (t - last < 350) return;
      last = t;
      if (fn) fn(e);
    }
    el.addEventListener('click', once);
    el.addEventListener('touchend', function (e) { e.preventDefault(); once(e); }, false);
  }
  function tick() { if (G.SFX && G.SFX.click) G.SFX.click(); }

  on('btnPlay', function () { tick(); UIO.show('levels'); });
  on('btnShop', function () { tick(); UIO.show('shop'); });
  on('btnAch', function () { tick(); UIO.show('ach'); });
  on('btnSettings', function () { tick(); UIO.show('settings'); });
  on('btnLevelsBack', function () { tick(); UIO.show('menu'); });
  on('btnShopBack', function () { tick(); UIO.show('menu'); });
  on('btnAchBack', function () { tick(); UIO.show('menu'); });
  on('btnSettingsBack', function () { tick(); UIO.show('menu'); });

  on('swSound', function () { G.save.sound = !G.save.sound; G.store(); tick(); UIO.renderSettings(); });
  on('swMusic', function () {
    G.save.music = !G.save.music; G.store(); UIO.renderSettings();
    if (G.save.music) { if (G.musicStart) G.musicStart(); } else if (G.musicStop) G.musicStop();
  });
  on('swVibe', function () { G.save.vibe = !G.save.vibe; G.store(); if (G.vibe) G.vibe(25); UIO.renderSettings(); });

  on('btnReset', function () {
    if (G.resetProgress) G.resetProgress();
    UIO.resetCounters(); UIO.renderSettings(); UIO.money();
    if (G.SFX && G.SFX.hit) G.SFX.hit();
  });

  on('btnPause', pause);
  on('btnResume', resume);
  on('btnRestart', function () { resume(); beginLevel(G.level); });
  on('btnQuitP', function () { resume(); goMenu(); });

  on('btnNext', function () { beginLevel(Math.min(G.TOTAL_LEVELS, G.level + 1)); });
  on('btnReplay', function () { beginLevel(G.level); });
  on('btnQuitW', goMenu);

  on('btnRetry', function () { beginLevel(G.level); });
  on('btnQuitL', goMenu);
}

/* ---------- запуск ---------- */
var started = false;
function init() {
  if (started) return true;
  try {
    if (R.init) { var r = R.init(); if (r === false) return false; }
    bind();
    var cv = $('cv');
    if (cv) {
      cv.addEventListener('touchstart', onDown, { passive: false });
      cv.addEventListener('touchmove', onMove, { passive: false });
      cv.addEventListener('touchend', onUp, { passive: true });
      cv.addEventListener('touchcancel', onUp, { passive: true });
      cv.addEventListener('mousedown', onDown);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    UIO.show('menu');
    UIO.money();
    started = true;
    return true;
  } catch (e) {
    console.error('controls.init: ' + e.message);
    return false;
  }
}

/* самозапуск: модуль больше не ждёт, пока его кто-нибудь позовёт */
(function auto() {
  if (started) return;
  if (!init()) setTimeout(auto, 250);
})();

return {
  init: init, beginLevel: beginLevel, goMenu: goMenu,
  onWin: onWin, onLose: onLose, onBack: onBack,
  pause: pause, resume: resume
};
})();
