/* ============================================================
   ANGRY BIRDS — управление, переходы уровня, кнопки, запуск
   Экспорт: window.ABC
   ============================================================ */
(function () {
'use strict';

var G = window.ABG, R = window.ABR;
if (!G || !R) { console.error('ABG/ABR не загружены'); return; }

/* ---- мягкая зависимость от ui.js: без него игра всё равно идёт ---- */
var U = window.ABUI;
if (!U) {
  U = {
    show: function () { }, hide: function () { }, reveal: function () { },
    money: function () { }, renderSettings: function () { },
    syncHud: function () { }, syncScore: function () { },
    resetCounters: function () { G.score = 0; }
  };
  console.error('ui.js не загружен — интерфейс отключён');
}

/* ---- латаем расхождения имён между модулями ---- */
if (!G.hasAch && G.achDone) {
  G.hasAch = function (id) { return G.achDone(id); };
}
var ICONS = { gloves: '🧤', goggles: '🥽', helmet: '⛑', boots: '👟', bag: '🎒' };
if (G.ITEMS) {
  for (var q = 0; q < G.ITEMS.length; q++) {
    if (!G.ITEMS[q].icon) G.ITEMS[q].icon = ICONS[G.ITEMS[q].id] || '🎁';
  }
}

function $(id) { return document.getElementById(id); }
var dragging = false;

/* ---------------- переходы ---------------- */
function beginLevel(n) {
  G.startLevel(n);
  R.setCam(0);
  R.snap();
  dragging = false;
  U.resetCounters();
  U.show(null);
  U.syncHud();
  U.syncScore();
}

function goMenu() {
  G.state = 'menu';
  G.started = false;
  G.musicStop();
  U.show('menu');
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
  U.hide($('hud'));
  U.reveal($('ovWin'), 'flex');
}

function onLose() {
  G.state = 'lose';
  var lp = $('losePigs');
  if (lp) lp.textContent = G.alivePigs();
  U.hide($('hud'));
  U.reveal($('ovLose'), 'flex');
}

function pause() {
  if (G.state !== 'play') return;
  G.state = 'pause';
  U.reveal($('ovPause'), 'flex');
}

function resume() {
  U.hide($('ovPause'));
  if (G.state === 'pause') G.state = 'play';
}

function onBack() {
  if (G.state === 'win' || G.state === 'lose') { goMenu(); return true; }
  if (G.state === 'pause') { resume(); return true; }
  if (G.state === 'play') { pause(); return true; }
  var m = $('menu');
  var onMenu = !m || m.style.display !== 'none';
  if (!onMenu) { U.show('menu'); return true; }
  return false;
}

/* ---------------- ввод ---------------- */
function point(e) {
  if (e.touches && e.touches.length) return e.touches[0];
  if (e.changedTouches && e.changedTouches.length) return e.changedTouches[0];
  return e;
}

function onDown(e) {
  if (G.state !== 'play') return;
  var p = point(e);
  var w = R.toWorld(p.clientX, p.clientY);

  if (G.ac) G.ac();

  if (G.flying && !G.flying.used) {
    if (G.useAbility()) {
      if (e.cancelable) e.preventDefault();
      return;
    }
  }

  if (G.active && G.active.state === 'ready') {
    var dx = w.x - G.active.x, dy = w.y - G.active.y;
    if (Math.sqrt(dx * dx + dy * dy) < 200) {
      dragging = true;
      if (G.SFX.pull) G.SFX.pull();
      drag(p);
    }
  }
  if (e.cancelable && e.type === 'touchstart') e.preventDefault();
}

function drag(p) {
  var a = G.active;
  if (!a) return;
  var w = R.toWorld(p.clientX, p.clientY);
  var dx = w.x - G.SLING_X, dy = w.y - G.SLING_Y;
  var d = Math.sqrt(dx * dx + dy * dy);
  var maxPull = G.MAX_PULL * (G.has('gloves') ? 1.18 : 1);
  if (d > maxPull) { dx = dx / d * maxPull; dy = dy / d * maxPull; }
  a.x = G.SLING_X + dx;
  a.y = G.SLING_Y + dy;
}

function onMove(e) {
  if (!dragging || G.state !== 'play') return;
  drag(point(e));
  if (e.cancelable) e.preventDefault();
}

function onUp() {
  if (!dragging) return;
  dragging = false;
  if (G.shoot() && G.flying) R.follow(G.flying.x);
}

/* ---------------- кнопки ---------------- */
function bind() {
  function on(id, fn) { var el = $(id); if (el) el.addEventListener('click', fn); }
  function click() { if (G.SFX.click) G.SFX.click(); }

  on('btnPlay', function () { click(); U.show('levels'); });
  on('btnShop', function () { click(); U.show('shop'); });
  on('btnAch', function () { click(); U.show('ach'); });
  on('btnSettings', function () { click(); U.show('settings'); });
  on('btnLevelsBack', function () { click(); U.show('menu'); });
  on('btnShopBack', function () { click(); U.show('menu'); });
  on('btnAchBack', function () { click(); U.show('menu'); });
  on('btnSettingsBack', function () { click(); U.show('menu'); });

  on('swSound', function () {
    G.save.sound = !G.save.sound; G.store(); click(); U.renderSettings();
  });
  on('swMusic', function () {
    G.save.music = !G.save.music; G.store(); U.renderSettings();
    if (G.save.music) G.musicStart(); else G.musicStop();
  });
  on('swVibe', function () {
    G.save.vibe = !G.save.vibe; G.store(); G.vibe(25); U.renderSettings();
  });

  on('btnReset', function () {
    G.resetProgress();
    U.resetCounters();
    U.renderSettings();
    U.money();
    if (G.SFX.hit) G.SFX.hit();
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

/* ---------------- запуск ---------------- */
var started = false;
function init() {
  if (started) return true;
  if (!R.init()) return false;
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

  U.show('menu');
  U.money();
  started = true;
  return true;
}

window.ABC = {
  init: init,
  beginLevel: beginLevel,
  goMenu: goMenu,
  onWin: onWin,
  onLose: onLose,
  onBack: onBack,
  pause: pause,
  resume: resume
};

})();
