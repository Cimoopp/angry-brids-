/* ANGRY BIRDS — экраны, кнопки, ввод. Экспорт: window.ABU */
(function () {
'use strict';
var G = window.ABG, R = window.ABR;
if (!G || !R) { console.error('нужны ABG и ABR'); return; }

function $(s) { return document.querySelector(s); }
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function setText(id, v) { var el = $('#' + id); if (el) el.textContent = v; }

var SCREENS = ['menu', 'levels', 'shop', 'ach', 'settings'];
var OVERLAYS = ['ovPause', 'ovWin', 'ovLose'];
var dragging = false;

/* ---------- экраны ---------- */
function hideOverlays() {
  OVERLAYS.forEach(function (id) { var el = $('#' + id); if (el) el.classList.add('hidden'); });
}

function refreshMoney() {
  setText('menuCoins', G.save.coins);
  setText('menuStars', G.starsTotal());
  setText('levelsCoins', G.save.coins);
  setText('shopCoins', G.save.coins);
  setText('achDone', G.achCount());
  setText('achTotal', G.ACH.length);
}

function showScreen(name) {
  SCREENS.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', id !== name);
  });
  var hud = $('#hud');
  if (hud) hud.classList.toggle('hidden', !!name);
  if (name === 'levels') renderLevels();
  if (name === 'shop') renderShop();
  if (name === 'ach') renderAch();
  if (name === 'settings') renderSettings();
  refreshMoney();
}

function renderLevels() {
  var grid = $('#levelsGrid');
  if (!grid) return;
  var open = G.maxUnlocked(), html = '', i, k;
  for (i = 1; i <= G.TOTAL_LEVELS; i++) {
    var st = G.save.levels[i] | 0, isOpen = i <= open, stars = '';
    for (k = 0; k < 3; k++) stars += (k < st ? '★' : '·');
    html += '<div class="lvl ' + (isOpen ? 'open' : 'locked') + '" data-lvl="' + i + '">' +
            (isOpen ? i : '🔒') +
            '<div class="st">' + (isOpen ? stars : '') + '</div></div>';
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
  var list = $('#shopList');
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
      if (G.buy(this.getAttribute('data-item')) !== 'ok') { G.SFX.hit(); return; }
      G.SFX.star();
      renderShop();
      refreshMoney();
    });
  }
}

function renderAch() {
  var list = $('#achList');
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
  var a = $('#swSound'); if (a) a.classList.toggle('on', !!G.save.sound);
  var b = $('#swMusic'); if (b) b.classList.toggle('on', !!G.save.music);
  var c = $('#swVibe'); if (c) c.classList.toggle('on', !!G.save.vibe);
  var inf = $('#setInfo');
  if (inf) {
    inf.textContent = 'Пройдено: ' + G.levelsDone() + '/50 · Звёзд: ' +
      G.starsTotal() + '/150 · Свиней: ' + G.save.kills;
  }
}

function syncHud() {
  setText('hudLevel', 'Уровень ' + G.level);
  setText('hudPigs', '🐷 ' + G.alivePigs());
  var hb = $('#hudBirds');
  if (!hb) return;
  var list = [], i, html = '';
  if (G.active) list.push(G.active.type);
  for (i = 0; i < G.birdsLeft.length; i++) list.push(G.birdsLeft[i]);
  for (i = 0; i < list.length && i < 8; i++) html += '<div class="pip ' + list[i] + '"></div>';
  hb.innerHTML = html;
}

/* ---------- поток игры ---------- */
function beginLevel(n) {
  G.startLevel(n);
  R.setCam(0);
  R.snapCam();
  dragging = false;
  R.setDragging(false);
  hideOverlays();
  showScreen(null);
  syncHud();
}

function goMenu() {
  G.state = 'menu';
  G.musicStop();
  hideOverlays();
  showScreen('menu');
}

function onWin() {
  var w = G.lastWin || { stars: 1, coins: 0, score: G.score };
  var stars = $('#winStars');
  if (stars) {
    var html = '', i;
    for (i = 0; i < 3; i++) html += (i < w.stars) ? '<span>★</span>' : '<span class="off">☆</span>';
    stars.innerHTML = html;
  }
  setText('winScore', w.score);
  setText('winCoins', w.coins);
  var nb = $('#btnNext');
  if (nb) nb.style.display = (G.level < G.TOTAL_LEVELS) ? '' : 'none';
  var ov = $('#ovWin'); if (ov) ov.classList.remove('hidden');
  var hud = $('#hud'); if (hud) hud.classList.add('hidden');
}

function onLose() {
  setText('losePigs', G.alivePigs());
  var ov = $('#ovLose'); if (ov) ov.classList.remove('hidden');
  var hud = $('#hud'); if (hud) hud.classList.add('hidden');
}

function pauseGame() {
  if (G.state !== 'play') return;
  G.state = 'pause';
  var ov = $('#ovPause'); if (ov) ov.classList.remove('hidden');
}

function resumeGame() {
  var ov = $('#ovPause'); if (ov) ov.classList.add('hidden');
  if (G.state === 'pause') G.state = 'play';
}

/* ---------- ввод ---------- */
function down(e) {
  if (G.state !== 'play') return;
  var t = (e.touches && e.touches.length) ? e.touches[0] : e;
  var pt = R.toWorld(t.clientX, t.clientY);
  G.ac();
  if (G.flying && !G.flying.used) { G.useAbility(); return; }
  if (G.active && G.active.state === 'ready') {
    var dx = pt.x - G.active.x, dy = pt.y - G.active.y;
    if (Math.sqrt(dx * dx + dy * dy) < 180) {
      dragging = true;
      R.setDragging(true);
      G.SFX.pull();
      move(pt);
    }
  }
}

function move(pt) {
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
  var t = (e.touches && e.touches.length) ? e.touches[0] : e;
  move(R.toWorld(t.clientX, t.clientY));
  if (e.cancelable) e.preventDefault();
}

function up() {
  if (!dragging) return;
  dragging = false;
  R.setDragging(false);
  if (G.shoot()) R.setCam(G.flying.x - R.getViewW() * 0.42);
}

function bindInput() {
  var cv = document.getElementById('cv');
  if (!cv) return;
  cv.addEventListener('touchstart', down, { passive: true });
  cv.addEventListener('touchmove', onMove, { passive: false });
  cv.addEventListener('touchend', up, { passive: true });
  cv.addEventListener('mousedown', down);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', up);
}

/* ---------- кнопки ---------- */
function bindButtons() {
  function on(id, fn) { var el = $('#' + id); if (el) el.addEventListener('click', fn); }

  on('btnPlay', function () { G.SFX.click(); showScreen('levels'); });
  on('btnShop', function () { G.SFX.click(); showScreen('shop'); });
  on('btnAch', function () { G.SFX.click(); showScreen('ach'); });
  on('btnSettings', function () { G.SFX.click(); showScreen('settings'); });
  on('btnLevelsBack', function () { G.SFX.click(); showScreen('menu'); });
  on('btnShopBack', function () { G.SFX.click(); showScreen('menu'); });
  on('btnAchBack', function () { G.SFX.click(); showScreen('menu'); });
  on('btnSettingsBack', function () { G.SFX.click(); showScreen('menu'); });

  on('swSound', function () {
    G.save.sound = !G.save.sound; G.store(); G.SFX.click(); renderSettings();
  });
  on('swMusic', function () {
    G.save.music = !G.save.music; G.store(); renderSettings();
    if (G.save.music) G.musicStart(); else G.musicStop();
  });
  on('swVibe', function () {
    G.save.vibe = !G.save.vibe; G.store(); G.vibe(25); renderSettings();
  });

  on('btnReset', function () {
    G.resetProgress();
    renderSettings();
    refreshMoney();
    G.SFX.hit();
  });

  on('btnPause', pauseGame);
  on('btnResume', resumeGame);
  on('btnRestart', function () { resumeGame(); beginLevel(G.level); });
  on('btnQuitP', function () { resumeGame(); goMenu(); });

  on('btnNext', function () { beginLevel(clamp(G.level + 1, 1, G.TOTAL_LEVELS)); });
  on('btnReplay', function () { beginLevel(G.level); });
  on('btnQuitW', goMenu);
  on('btnRetry', function () { beginLevel(G.level); });
  on('btnQuitL', goMenu);
}

function init() {
  bindButtons();
  bindInput();
  goMenu();
  refreshMoney();
}

window.ABU = {
  init: init,
  showScreen: showScreen,
  beginLevel: beginLevel,
  goMenu: goMenu,
  onWin: onWin,
  onLose: onLose,
  pauseGame: pauseGame,
  resumeGame: resumeGame,
  syncHud: syncHud,
  refreshMoney: refreshMoney,
  isPlaying: function () { return G.state === 'play'; },
  isOverlayOpen: function () { return G.state !== 'play'; }
};
})();
