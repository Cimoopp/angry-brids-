/* ============================================================
   ANGRY BIRDS — экраны, кнопки, ввод, HUD
   Экспорт: window.ABUI
   ============================================================ */
(function () {
'use strict';

var G = window.ABG, R = window.ABR;
if (!G || !R) { console.error('ABG/ABR не загружены'); return; }

function $(id) { return document.getElementById(id); }
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

var SCREENS = ['menu', 'levels', 'shop', 'ach', 'settings'];
var OVS = ['ovPause', 'ovWin', 'ovLose'];
var dragging = false;

/* ---------- экраны ---------- */
function show(name) {
  var i, el;
  for (i = 0; i < SCREENS.length; i++) {
    el = $(SCREENS[i]);
    if (el) el.classList.toggle('hidden', SCREENS[i] !== name);
  }
  for (i = 0; i < OVS.length; i++) {
    el = $(OVS[i]);
    if (el) el.classList.add('hidden');
  }
  var hud = $('hud');
  if (hud) hud.classList.toggle('hidden', !!name);

  if (name === 'levels') renderLevels();
  if (name === 'shop') renderShop();
  if (name === 'ach') renderAch();
  if (name === 'settings') renderSettings();
  money();
}

function money() {
  function set(id, v) { var el = $(id); if (el) el.textContent = v; }
  set('menuCoins', G.save.coins);
  set('menuStars', G.starsTotal());
  set('levelsCoins', G.save.coins);
  set('shopCoins', G.save.coins);
  set('achDone', G.achCount());
  set('achTotal', G.ACH.length);
}

function renderLevels() {
  var grid = $('levelsGrid');
  if (!grid) return;
  var open = G.maxUnlocked(), html = '', i, k;
  for (i = 1; i <= G.TOTAL_LEVELS; i++) {
    var st = G.save.levels[i] | 0;
    var isOpen = i <= open;
    var stars = '';
    for (k = 0; k < 3; k++) stars += (k < st ? '★' : '·');
    html += '<div class="lvl ' + (isOpen ? 'open' : 'locked') + '" data-lvl="' + i + '">' +
      (isOpen ? i : '🔒') + '<div class="st">' + (isOpen ? stars : '') + '</div></div>';
  }
  grid.innerHTML = html;
  var cells = grid.querySelectorAll('.lvl');
  for (i = 0; i < cells.length; i++) {
    cells[i].addEventListener('click', function () {
      var n = parseInt(this.getAttribute('data-lvl'), 10);
      if (n > G.maxUnlocked()) { G.SFX.hit(); return; }
      G.SFX.click();
      beginLevel(n);
    });
  }
}

function renderShop() {
  var list = $('shopList');
  if (!list) return;
  var html = '', i;
  for (i = 0; i < G.ITEMS.length; i++) {
    var it = G.ITEMS[i], owned = !!G.save.items[it.id];
    html += '<div class="card ' + (owned ? 'done' : '') + '">' +
      '<div class="ico">' + it.ic + '</div>' +
      '<div class="txt"><div class="nm">' + it.t + '</div>' +
      '<div class="ds">' + it.d + '</div></div>' +
      '<button class="btn small ' + (owned ? 'ghost' : '') + '" data-item="' + it.id + '"' +
      (owned ? ' disabled' : '') + '>' + (owned ? 'Куплено' : '🪙 ' + it.p) + '</button></div>';
  }
  list.innerHTML = html;
  var btns = list.querySelectorAll('button[data-item]');
  for (i = 0; i < btns.length; i++) {
    btns[i].addEventListener('click', function () {
      var id = this.getAttribute('data-item');
      if (G.buy(id) !== 'ok') { G.SFX.hit(); return; }
      G.SFX.star();
      renderShop();
      money();
    });
  }
}

function renderAch() {
  var list = $('achList');
  if (!list) return;
  var html = '', i;
  for (i = 0; i < G.ACH.length; i++) {
    var a = G.ACH[i], done = !!G.save.ach[a.id];
    html += '<div class="card ' + (done ? 'done' : '') + '">' +
      '<div class="ico">' + (done ? '🏆' : '🔒') + '</div>' +
      '<div class="txt"><div class="nm">' + a.n + '</div>' +
      '<div class="ds">' + a.d + '</div></div>' +
      '<div class="lvlpips">' + (done ? '+200 🪙' : '—') + '</div></div>';
  }
  list.innerHTML = html;
}

function renderSettings() {
  var a = $('swSound'); if (a) a.classList.toggle('on', !!G.save.sound);
  var b = $('swMusic'); if (b) b.classList.toggle('on', !!G.save.music);
  var c = $('swVibe'); if (c) c.classList.toggle('on', !!G.save.vibe);
  var inf = $('setInfo');
  if (inf) {
    inf.textContent = 'Пройдено: ' + G.levelsDone() + '/50 · Звёзд: ' +
      G.starsTotal() + '/150 · Свиней: ' + G.save.kills;
  }
}

/* ---------- HUD ---------- */
function syncHud() {
  var hl = $('hudLevel');
  if (hl) hl.textContent = 'Уровень ' + G.level;
  var hp = $('hudPigs');
  if (hp) hp.textContent = '🐷 ' + G.alivePigs();
  var hb = $('hudBirds');
  if (hb) {
    var html = '', i, listNow = [];
    if (G.active) listNow.push(G.active.type);
    for (i = 0; i < G.birdsLeft.length; i++) listNow.push(G.birdsLeft[i]);
    for (i = 0; i < listNow.length && i < 8; i++) {
      html += '<div class="pip ' + listNow[i] + '"></div>';
    }
    hb.innerHTML = html;
  }
}

function syncScore() {
  var hs = $('hudScore');
  if (hs) hs.textContent = G.score;
}

/* ---------- переходы ---------- */
function beginLevel(n) {
  G.startLevel(n);
  dragging = false;
  G.ended = false;
  R.setCam(0);
  R.snap();
  show(null);
  var hud = $('hud');
  if (hud) hud.classList.remove('hidden');
  syncHud();
  syncScore();
}

function goMenu() {
  G.state = 'menu';
  G.musicStop();
  dragging = false;
  show('menu');
}

function onWin() {
  var w = G.lastWin || { stars: 1, coins: 0, score: G.score };
  var stars = '';
  for (var i = 0; i < 3; i++) {
    stars += (i < w.stars) ? '<span>★</span>' : '<span class="off">☆</span>';
  }
  var el = $('winStars');
  if (el) el.innerHTML = stars;
  var s1 = $('winScore'); if (s1) s1.textContent = w.score;
  var s2 = $('winCoins'); if (s2) s2.textContent = w.coins;
  var nb = $('btnNext');
  if (nb) nb.style.display = (G.level < G.TOTAL_LEVELS) ? '' : 'none';
  var hud = $('hud'); if (hud) hud.classList.add('hidden');
  var ov = $('ovWin'); if (ov) ov.classList.remove('hidden');
}

function onLose() {
  var lp = $('losePigs');
  if (lp) lp.textContent = G.alivePigs();
  var hud = $('hud'); if (hud) hud.classList.add('hidden');
  var ov = $('ovLose'); if (ov) ov.classList.remove('hidden');
}

function pause() {
  if (G.state !== 'play') return;
  G.state = 'pause';
  dragging = false;
  var ov = $('ovPause');
  if (ov) ov.classList.remove('hidden');
}

function resume() {
  var ov = $('ovPause');
  if (ov) ov.classList.add('hidden');
  if (G.state === 'pause') G.state = 'play';
}

/* Кнопка «назад» на Android: true — игра обработала сама. */
function onBack() {
  if (!$('menu').classList.contains('hidden')) return false;

  var openOv = null;
  for (var i = 0; i < OVS.length; i++) {
    var el = $(OVS[i]);
    if (el && !el.classList.contains('hidden')) { openOv = OVS[i]; break; }
  }
  if (openOv === 'ovPause') { resume(); return true; }
  if (openOv === 'ovWin') { goMenu(); return true; }
  if (openOv === 'ovLose') { goMenu(); return true; }

  if (G.state === 'play' || G.state === 'pause') { pause(); return true; }
  goMenu();
  return true;
}

/* ---------- ввод ---------- */
function toWorld(cx, cy) {
  var s = R.getScale();
  return { x: cx / s + R.getCamX(), y: cy / s };
}

function onDown(e) {
  if (G.state !== 'play') return;
  var pt = toWorld(e.clientX, e.clientY);
  G.ac();

  if (G.flying && !G.flying.used) { G.useAbility(); return; }
  if (G.active && G.active.state === 'ready') {
    var dx = pt.x - G.active.x, dy = pt.y - G.active.y;
    if (Math.sqrt(dx * dx + dy * dy) < 190) {
      dragging = true;
      G.SFX.pull();
      moveDrag(pt);
    }
  }
}

function moveDrag(pt) {
  var a = G.active;
  if (!a) return;
  var dx = pt.x - G.SLING_X, dy = pt.y - G.SLING_Y;
  var d = Math.sqrt(dx * dx + dy * dy);
  if (d > G.MAX_PULL) { dx = dx / d * G.MAX_PULL; dy = dy / d * G.MAX_PULL; }
  a.x = G.SLING_X + dx;
  a.y = G.SLING_Y + dy;
}

function onMove(e) {
  if (!dragging || G.state !== 'play') return;
  moveDrag(toWorld(e.clientX, e.clientY));
  if (e.cancelable) e.preventDefault();
}

function onUp() {
  if (!dragging) return;
  dragging = false;
  if (G.shoot() && G.flying) R.follow(G.flying.x);
  syncHud();
}

function addInput() {
  var cv = $('cv');
  if (!cv) return;
  if (window.PointerEvent) {
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointercancel', onUp);
  } else {
    cv.addEventListener('touchstart', onDown, { passive: true });
    cv.addEventListener('touchmove', onMove, { passive: false });
    cv.addEventListener('touchend', onUp);
    cv.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }
}

/* ---------- кнопки ---------- */
function bind() {
  function on(id, fn) { var el = $(id); if (el) el.addEventListener('click', fn); }

  on('btnPlay', function () { G.SFX.click(); show('levels'); });
  on('btnShop', function () { G.SFX.click(); show('shop'); });
  on('btnAch', function () { G.SFX.click(); show('ach'); });
  on('btnSettings', function () { G.SFX.click(); show('settings'); });
  on('btnLevelsBack', function () { G.SFX.click(); show('menu'); });
  on('btnShopBack', function () { G.SFX.click(); show('menu'); });
  on('btnAchBack', function () { G.SFX.click(); show('menu'); });
  on('btnSettingsBack', function () { G.SFX.click(); show('menu'); });

  on('swSound', function () {
    G.save.sound = !G.save.sound; G.store(); G.SFX.click(); renderSettings();
  });
  on('swMusic', function () {
    G.save.music = !G.save.music; G.store(); renderSettings();
    if (G.save.music) G.musicStart(); else G.musicStop();
  });
  on('swVibe', function () {
    G.save.vibe = !G.save.vibe; G.store(); G.vibe(20); renderSettings();
  });

  on('btnReset', function () {
    G.resetProgress();
    renderSettings(); money(); G.SFX.hit();
  });

  on('btnPause', pause);
  on('btnResume', resume);
  on('btnRestart', function () { resume(); beginLevel(G.level); });
  on('btnQuitP', function () { resume(); goMenu(); });

  on('btnNext', function () { beginLevel(clamp(G.level + 1, 1, G.TOTAL_LEVELS)); });
  on('btnReplay', function () { beginLevel(G.level); });
  on('btnQuitW', goMenu);
  on('btnRetry', function () { beginLevel(G.level); });
  on('btnQuitL', goMenu);
}

/* ---------- запуск ---------- */
function init() {
  if (!R.init()) return false;
  bind();
  addInput();
  show('menu');
  window.addEventListener('resize', function () { R.resize(); });
  window.addEventListener('orientationchange', function () {
    setTimeout(function () { R.resize(); }, 220);
  });
  return true;
}

window.ABUI = {
  init: init,
  show: show,
  beginLevel: beginLevel,
  goMenu: goMenu,
  onWin: onWin,
  onLose: onLose,
  pause: pause,
  resume: resume,
  onBack: onBack,
  syncHud: syncHud,
  syncScore: syncScore
};

})();
