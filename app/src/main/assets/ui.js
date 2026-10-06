/* ============================================================
   ANGRY BIRDS — экраны, кнопки, ввод. Экспорт: window.ABUI
   ============================================================ */
(function () {
'use strict';

var G = window.ABG, R = window.ABR;
if (!G || !R) { console.error('нет ABG/ABR'); return; }

function $(s) { return document.querySelector(s); }
function byId(id) { return document.getElementById(id); }
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

var SCREENS = ['menu', 'levels', 'shop', 'ach', 'settings'];
var OVS = ['ovPause', 'ovWin', 'ovLose'];
var dragging = false;

function set(id, v) { var e = byId(id); if (e) e.textContent = v; }
function hideOv() {
  for (var i = 0; i < OVS.length; i++) {
    var e = byId(OVS[i]);
    if (e) e.classList.add('hidden');
  }
}
function hud(show) {
  var h = byId('hud');
  if (h) h.classList.toggle('hidden', !show);
}

function showScreen(name) {
  var i, el;
  for (i = 0; i < SCREENS.length; i++) {
    el = byId(SCREENS[i]);
    if (el) el.classList.toggle('hidden', SCREENS[i] !== name);
  }
  if (name) {
    hud(false);
    if (name === 'levels') renderLevels();
    if (name === 'shop') renderShop();
    if (name === 'ach') renderAch();
    if (name === 'settings') renderSettings();
  }
  money();
}

function money() {
  set('menuCoins', G.save.coins);
  set('menuStars', G.starsTotal());
  set('levelsCoins', G.save.coins);
  set('shopCoins', G.save.coins);
  set('achDone', G.achCount());
  set('achTotal', G.ACH.length);
}

/* ---------- экраны ---------- */
function renderLevels() {
  var grid = byId('levelsGrid');
  if (!grid) return;
  var open = G.maxUnlocked(), html = '', i, k;
  for (i = 1; i <= G.TOTAL_LEVELS; i++) {
    var st = G.save.levels[i] | 0;
    var isOpen = i <= open, stars = '';
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
  var list = byId('shopList');
  if (!list) return;
  var html = '', i;
  for (i = 0; i < G.ITEMS.length; i++) {
    var it = G.ITEMS[i], owned = !!G.save.items[it.id];
    html += '<div class="card ' + (owned ? 'done' : '') + '">' +
      '<div class="ico">' + it.ic + '</div>' +
      '<div class="txt"><div class="nm">' + it.t + '</div>' +
      '<div class="ds">' + it.d + '</div></div>' +
      '<button class="btn small' + (owned ? ' ghost' : '') + '" data-item="' + it.id + '"' +
      (owned ? ' disabled' : '') + '>' + (owned ? 'Куплено' : '🪙 ' + it.p) + '</button></div>';
  }
  list.innerHTML = html;
  var btns = list.querySelectorAll('button[data-item]');
  for (i = 0; i < btns.length; i++) {
    btns[i].addEventListener('click', function () {
      var res = G.buy(this.getAttribute('data-item'));
      if (res !== 'ok') { G.SFX.hit(); return; }
      G.SFX.star(); renderShop(); money();
    });
  }
}

function renderAch() {
  var list = byId('achList');
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
  var a = byId('swSound'), b = byId('swMusic'), c = byId('swVibe');
  if (a) a.classList.toggle('on', !!G.save.sound);
  if (b) b.classList.toggle('on', !!G.save.music);
  if (c) c.classList.toggle('on', !!G.save.vibe);
  var inf = byId('setInfo');
  if (inf) inf.textContent = 'Пройдено: ' + G.levelsDone() + '/50 · Звёзд: ' +
    G.starsTotal() + '/150 · Свиней: ' + G.save.kills;
}

function syncHud() {
  set('hudLevel', 'Уровень ' + G.level);
  set('hudPigs', '🐷 ' + G.alivePigs());
  var hb = byId('hudBirds');
  if (hb) {
    var list = [], i, html = '';
    if (G.active) list.push(G.active.type);
    for (i = 0; i < G.birdsLeft.length; i++) list.push(G.birdsLeft[i]);
    for (i = 0; i < list.length && i < 8; i++) html += '<div class="pip ' + list[i] + '"></div>';
    hb.innerHTML = html;
  }
}
function syncScore() { set('hudScore', G.score); }

/* ---------- уровни ---------- */
function beginLevel(n) {
  G.startLevel(n);
  R.setCam(0); R.snap();
  dragging = false;
  hideOv();
  showScreen(null);
  hud(true);
  syncHud(); syncScore();
}

function goMenu() {
  G.state = 'menu';
  G.musicStop();
  dragging = false;
  hideOv();
  hud(false);
  showScreen('menu');
}

function onWin() {
  var w = G.lastWin || { stars: 1, coins: 50, score: G.score };
  var el = byId('winStars'), html = '', i;
  for (i = 0; i < 3; i++) html += (i < w.stars) ? '<span>★</span>' : '<span class="off">☆</span>';
  if (el) el.innerHTML = html;
  set('winScore', w.score);
  set('winCoins', w.coins);
  var nb = byId('btnNext');
  if (nb) nb.style.display = (G.level < G.TOTAL_LEVELS) ? '' : 'none';
  hud(false);
  var ov = byId('ovWin');
  if (ov) ov.classList.remove('hidden');
  money();
}

function onLose() {
  set('losePigs', G.alivePigs());
  hud(false);
  var ov = byId('ovLose');
  if (ov) ov.classList.remove('hidden');
  money();
}

function pause() {
  if (G.state !== 'play') return false;
  G.state = 'pause';
  var ov = byId('ovPause');
  if (ov) ov.classList.remove('hidden');
  return true;
}
function resume() {
  var ov = byId('ovPause');
  if (ov) ov.classList.add('hidden');
  if (G.state === 'pause') G.state = 'play';
}

/* ---------- ввод ---------- */
function onDown(cx, cy) {
  if (G.state !== 'play') return;
  G.ac();
  var pt = R.toWorld(cx, cy);
  if (G.flying && G.flying.state === 'fly' && !G.flying.used) { G.useAbility(); return; }
  if (G.active && G.active.state === 'ready') {
    var dx = pt.x - G.active.x, dy = pt.y - G.active.y;
    if (Math.sqrt(dx * dx + dy * dy) < 190) {
      dragging = true;
      G.SFX.pull();
      drag(pt);
    }
  }
}

function drag(pt) {
  var a = G.active;
  if (!a) return;
  var dx = pt.x - G.SLING_X, dy = pt.y - G.SLING_Y;
  var d = Math.sqrt(dx * dx + dy * dy);
  var mx = G.MAX_PULL, my = G.MAX_PULL * 0.85;
  if (dx > mx) dx = mx; if (dx < -mx) dx = -mx;
  if (dy > my) dy = my; if (dy < -my) dy = -my;
  a.x = G.SLING_X + dx;
  a.y = G.SLING_Y + dy;
}

function onUp() {
  if (!dragging) return;
  dragging = false;
  if (G.shoot() && G.flying) R.follow(G.flying.x);
}

function bindInput() {
  var el = byId('cv');
  if (!el) return;
  el.addEventListener('touchstart', function (e) {
    if (e.touches.length) onDown(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  el.addEventListener('touchmove', function (e) {
    if (dragging && e.touches.length) { drag(R.toWorld(e.touches[0].clientX, e.touches[0].clientY)); if (e.cancelable) e.preventDefault(); }
  }, { passive: false });
  el.addEventListener('touchend', function () { onUp(); });
  el.addEventListener('touchcancel', function () { dragging = false; onUp(); });

  el.addEventListener('mousedown', function (e) { onDown(e.clientX, e.clientY); });
  window.addEventListener('mousemove', function (e) { if (dragging) drag(R.toWorld(e.clientX, e.clientY)); });
  window.addEventListener('mouseup', function () { onUp(); });
}

/* ---------- кнопки ---------- */
function bindButtons() {
  var i;
  function on(id, fn) { var e = byId(id); if (e) e.addEventListener('click', fn); }

  on('btnPlay', function () { G.SFX.click(); showScreen('levels'); });
  on('btnShop', function () { G.SFX.click(); showScreen('shop'); });
  on('btnAch', function () { G.SFX.click(); showScreen('ach'); });
  on('btnSettings', function () { G.SFX.click(); showScreen('settings'); });
  on('btnLevelsBack', function () { G.SFX.click(); showScreen('menu'); });
  on('btnShopBack', function () { G.SFX.click(); showScreen('menu'); });
  on('btnAchBack', function () { G.SFX.click(); showScreen('menu'); });
  on('btnSettingsBack', function () { G.SFX.click(); showScreen('menu'); });

  on('swSound', function () { G.save.sound = !G.save.sound; G.store(); G.SFX.click(); renderSettings(); });
  on('swMusic', function () {
    G.save.music = !G.save.music; G.store(); renderSettings();
    if (G.save.music) G.musicStart(); else G.musicStop();
  });
  on('swVibe', function () { G.save.vibe = !G.save.vibe; G.store(); G.vibe(20); renderSettings(); });
  on('btnReset', function () {
    if (!confirm('Сбросить весь прогресс, монеты и достижения?')) return;
    G.resetProgress(); renderSettings(); money();
  });

  on('btnPause', function () { G.SFX.click(); pause(); });
  on('btnResume', function () { G.SFX.click(); resume(); });
  on('btnRestart', function () { G.SFX.click(); resume(); beginLevel(G.level); });
  on('btnQuitP', function () { G.SFX.click(); resume(); goMenu(); });

  on('btnNext', function () { G.SFX.click(); beginLevel(clamp(G.level + 1, 1, G.TOTAL_LEVELS)); });
  on('btnReplay', function () { G.SFX.click(); beginLevel(G.level); });
  on('btnQuitW', function () { G.SFX.click(); goMenu(); });
  on('btnRetry', function () { G.SFX.click(); beginLevel(G.level); });
  on('btnQuitL', function () { G.SFX.click(); goMenu(); });

  var letters = document.querySelectorAll('.btn, .lvl');
  for (i = 0; i < letters.length; i++) {
    letters[i].addEventListener('touchstart', function () { this.style.transform = 'scale(.97)'; }, { passive: true });
    letters[i].addEventListener('touchend', function () { this.style.transform = ''; });
  }
}

/* ---------- запуск ---------- */
function init() {
  if (!R.init()) return false;
  bindButtons();
  bindInput();
  window.addEventListener('resize', function () { R.resize(); });
  window.addEventListener('orientationchange', function () { setTimeout(function () { R.resize(); }, 250); });
  G.state = 'menu';
  showScreen('menu');
  return true;
}

/* ---------- кнопка «Назад» на Android ---------- */
function onBack() {
  if (G.state === 'play') { pause(); return true; }
  if (G.state === 'pause') { resume(); return true; }
  if (G.state === 'over') { goMenu(); return true; }
  var open = false, i;
  for (i = 0; i < SCREENS.length; i++) {
    var el = byId(SCREENS[i]);
    if (el && !el.classList.contains('hidden') && SCREENS[i] !== 'menu') { open = true; }
  }
  if (open) { showScreen('menu'); return true; }
  return false;
}

window.ABUI = {
  init: init, beginLevel: beginLevel, goMenu: goMenu, onWin: onWin, onLose: onLose,
  pause: pause, resume: resume, syncHud: syncHud, syncScore: syncScore,
  isDragging: function () { return dragging; }, onBack: onBack, money: money
};

})();
