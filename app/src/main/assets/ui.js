/* ANGRY BIRDS — интерфейс, экраны и ввод. Экспорт window.AB */
(function () {
'use strict';
var G = window.ABG, R = window.ABR;
if (!G || !R) { console.error('ABG/ABR не загружены'); return; }
function $(s) { return document.querySelector(s); }
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

var screens = ['menu', 'levels', 'shop', 'ach', 'settings'];
var dragging = false, lastAlive = -1;

function showScreen(name) {
  var i, el;
  for (i = 0; i < screens.length; i++) {
    el = document.getElementById(screens[i]);
    if (el) el.classList.toggle('hidden', screens[i] !== name);
  }
  var h = $('#hud'); if (h) h.classList.toggle('hidden', !!name);
  if (name === 'levels') renderLevels();
  if (name === 'shop') renderShop();
  if (name === 'ach') renderAch();
  if (name === 'settings') renderSettings();
  refreshMoney();
}

function refreshMoney() {
  var set = function (id, v) { var el = $('#' + id); if (el) el.textContent = v; };
  set('menuCoins', G.save.coins);
  set('menuStars', G.starsTotal());
  set('levelsCoins', G.save.coins);
  set('shopCoins', G.save.coins);
  set('achDone', G.achCount());
  set('achTotal', G.ACH.length);
}

function renderLevels() {
  var grid = $('#levelsGrid'); if (!grid) return;
  var open = G.maxUnlocked(), html = '', i, k;
  for (i = 1; i <= G.TOTAL_LEVELS; i++) {
    var st = G.save.levels[i] | 0, isOpen = i <= open, stars = '';
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
      G.SFX.click(); beginLevel(n);
    });
  }
}

function renderShop() {
  var list = $('#shopList'); if (!list) return;
  var html = '', i;
  for (i = 0; i < G.ITEMS.length; i++) {
    var it = G.ITEMS[i], owned = !!G.save.items[it.id];
    html += '<div class="card ' + (owned ? 'done' : '') + '">' +
      '<div class="ico">' + it.ic + '</div>' +
      '<div class="txt"><div class="nm">' + it.t + '</div><div class="ds">' + it.d + '</div></div>' +
      '<button class="btn small ' + (owned ? 'ghost' : '') + '" data-item="' + it.id + '"' +
      (owned ? ' disabled' : '') + '>' + (owned ? 'Куплено' : '🪙 ' + it.p) + '</button></div>';
  }
  list.innerHTML = html;
  var btns = list.querySelectorAll('button[data-item]');
  for (i = 0; i < btns.length; i++) {
    btns[i].addEventListener('click', function () {
      if (G.buy(this.getAttribute('data-item')) !== 'ok') { G.SFX.hit(); return; }
      G.SFX.star(); renderShop(); refreshMoney();
    });
  }
}

function renderAch() {
  var list = $('#achList'); if (!list) return;
  var html = '', i;
  for (i = 0; i < G.ACH.length; i++) {
    var a = G.ACH[i], done = !!G.save.ach[a.id];
    html += '<div class="card ' + (done ? 'done' : '') + '">' +
      '<div class="ico">' + (done ? '🏆' : '🔒') + '</div>' +
      '<div class="txt"><div class="nm">' + a.n + '</div><div class="ds">' + a.d + '</div></div>' +
      '<div class="lvlpips">' + (done ? '+200 🪙' : '—') + '</div></div>';
  }
  list.innerHTML = html;
}

function renderSettings() {
  var a = $('#swSound'); if (a) a.classList.toggle('on', !!G.save.sound);
  var b = $('#swMusic'); if (b) b.classList.toggle('on', !!G.save.music);
  var c = $('#swVibe'); if (c) c.classList.toggle('on', !!G.save.vibe);
  var inf = $('#setInfo');
  if (inf) inf.textContent = 'Пройдено: ' + G.levelsDone() + '/50 · Звёзд: ' +
    G.starsTotal() + '/150 · Свиней: ' + G.save.kills;
}

function syncHud() {
  var hl = $('#hudLevel'); if (hl) hl.textContent = 'Уровень ' + G.level;
  var hp = $('#hudPigs'); if (hp) hp.textContent = '🐷 ' + G.alivePigs();
  var hb = $('#hudBirds');
  if (hb) {
    var html = '', i, list = [];
    if (G.active) list.push(G.active.type);
    for (i = 0; i < G.birdsLeft.length; i++) list.push(G.birdsLeft[i]);
    for (i = 0; i < list.length && i < 8; i++) html += '<div class="pip ' + list[i] + '"></div>';
    hb.innerHTML = html;
  }
}

function beginLevel(n) {
  G.startLevel(n);
  R.resetCam();
  dragging = false; lastAlive = -1;
  showScreen(null);
  ['ovPause', 'ovWin', 'ovLose'].forEach(function (id) {
    var el = $('#' + id); if (el) el.classList.add('hidden');
  });
  syncHud();
}

function goMenu() {
  G.state = 'menu';
  if (G.musicStop) G.musicStop();
  ['ovPause', 'ovWin', 'ovLose'].forEach(function (id) {
    var el = $('#' + id); if (el) el.classList.add('hidden');
  });
  showScreen('menu');
}

function onWin() {
  var w = G.lastWin || { stars: 1, coins: 0, score: G.score };
  var st = $('#winStars');
  if (st) {
    var html = '', i;
    for (i = 0; i < 3; i++) html += (i < w.stars) ? '<span>★</span>' : '<span class="off">☆</span>';
    st.innerHTML = html;
  }
  var set = function (id, v) { var el = $('#' + id); if (el) el.textContent = v; };
  set('winScore', w.score); set('winCoins', w.coins);
  var nb = $('#btnNext'); if (nb) nb.style.display = (G.level < G.TOTAL_LEVELS) ? '' : 'none';
  var ov = $('#ovWin'); if (ov) ov.classList.remove('hidden');
  var h = $('#hud'); if (h) h.classList.add('hidden');
}

function onLose() {
  var lp = $('#losePigs'); if (lp) lp.textContent = G.alivePigs();
  var ov = $('#ovLose'); if (ov) ov.classList.remove('hidden');
  var h = $('#hud'); if (h) h.classList.add('hidden');
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

function toWorld(cx, cy) { return { x: cx / R.scale + R.camX, y: cy / R.scale }; }

function onDown(e) {
  if (G.state !== 'play') return;
  var t = (e.touches && e.touches.length) ? e.touches[0] : e;
  var pt = toWorld(t.clientX, t.clientY);
  if (G.flying && G.flying.state === 'fly' && !G.flying.used) { G.useAbility(); return; }
  if (G.active && G.active.state === 'ready') {
    var dx = pt.x - G.active.x, dy = pt.y - G.active.y;
    if (Math.sqrt(dx * dx + dy * dy) < 170) { dragging = true; G.dragging = true; G.SFX.pull(); onMove(e); }
  }
}
function onMove(e) {
  if (!dragging || G.state !== 'play') return;
  if (e.cancelable) e.preventDefault();
  var t = (e.touches && e.touches.length) ? e.touches[0] : e;
  var pt = toWorld(t.clientX, t.clientY);
  var dx = pt.x - G.SLING_X, dy = pt.y - G.SLING_Y;
  var d = Math.sqrt(dx * dx + dy * dy);
  if (d > G.MAX_PULL) { dx = dx / d * G.MAX_PULL; dy = dy / d * G.MAX_PULL; }
  G.active.x = G.SLING_X + dx;
  G.active.y = G.SLING_Y + dy;
}
function onUp() {
  if (!dragging) return;
  dragging = false; G.dragging = false;
  if (G.shoot() && G.flying) R.setTarget(G.flying.x - R.viewW * 0.42);
}

function onBack() {
  if (G.state === 'pause') { resumeGame(); return true; }
  if (G.state === 'play') { pauseGame(); return true; }
  var active = null, i;
  for (i = 0; i < screens.length; i++) {
    var el = document.getElementById(screens[i]);
    if (el && !el.classList.contains('hidden') && screens[i] !== 'menu') active = screens[i];
  }
  if (active) { showScreen('menu'); return true; }
  return false;
}

function bind() {
  function on(id, fn) { var el = $('#' + id); if (el) el.addEventListener('click', fn); }
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
    if (G.save.music && G.musicStart) G.musicStart();
    else if (G.musicStop) G.musicStop();
  });
  on('swVibe', function () { G.save.vibe = !G.save.vibe; G.store(); G.vibe(20); renderSettings(); });
  on('btnReset', function () { G.resetProgress(); renderSettings(); refreshMoney(); G.SFX.hit(); });
  on('btnPause', pauseGame);
  on('btnResume', resumeGame);
  on('btnRestart', function () { resumeGame(); beginLevel(G.level); });
  on('btnQuitP', function () { resumeGame(); goMenu(); });
  on('btnNext', function () { beginLevel(clamp(G.level + 1, 1, G.TOTAL_LEVELS)); });
  on('btnReplay', function () { beginLevel(G.level); });
  on('btnQuitW', goMenu);
  on('btnRetry', function () { beginLevel(G.level); });
  on('btnQuitL', goMenu);

  var cv = $('#cv');
  cv.addEventListener('touchstart', onDown, { passive: true });
  cv.addEventListener('touchmove', onMove, { passive: false });
  cv.addEventListener('touchend', onUp, { passive: true });
  cv.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  window.addEventListener('resize', function () { R.resize(); });
  window.addEventListener('orientationchange', function () { setTimeout(function () { R.resize(); }, 250); });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (G.musicStop) G.musicStop(); if (G.state === 'play') pauseGame(); }
    else if (G.save.music && G.musicStart && G.state === 'play') G.musicStart();
  });
}

function init() {
  var cv = $('#cv');
  R.init(cv);
  bind();
  G.state = 'menu';
  showScreen('menu');
  G.SFX.click();
}

window.AB = { init: init, beginLevel: beginLevel, goMenu: goMenu, onWin: onWin, onLose: onLose, onBack: onBack, syncHud: syncHud, get lastAlive() { return lastAlive; }, set lastAlive(v) { lastAlive = v; } };
})();
