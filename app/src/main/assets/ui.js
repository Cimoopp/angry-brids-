/* ============================================================
   ANGRY BIRDS — интерфейс. Экспорт: window.ABUI
   Экраны, HUD, магазин, достижения, настройки, оверлеи.
   ============================================================ */
window.ABUI = (function () {
'use strict';

var G = window.ABG;
var H = {};
var SCREENS = ['menu', 'levels', 'shop', 'ach', 'settings'];
var OVS = ['ovPause', 'ovWin', 'ovLose'];

function $(s) { return document.querySelector(s); }
function set(id, v) { var e = $('#' + id); if (e) e.textContent = v; }
function ov(id, on) { var e = $('#' + id); if (e) e.classList.toggle('hidden', !on); }

function show(name) {
  var i, el;
  for (i = 0; i < SCREENS.length; i++) {
    el = document.getElementById(SCREENS[i]);
    if (el) el.classList.toggle('hidden', SCREENS[i] !== name);
  }
  if (name) {
    ov('hud', false);
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

function renderLevels() {
  var grid = $('#levelsGrid'); if (!grid) return;
  var open = G.maxUnlocked(), html = '', i, k, st, stars, cls, label;
  for (i = 1; i <= G.TOTAL_LEVELS; i++) {
    st = G.save.levels[i] | 0;
    stars = '';
    for (k = 0; k < 3; k++) stars += (k < st ? '★' : '·');
    if (i <= open) { cls = 'lvl open'; label = '' + i; }
    else { cls = 'lvl locked'; label = '🔒'; stars = ''; }
    html += '<div class="' + cls + '" data-lvl="' + i + '">' + label +
            '<div class="st">' + stars + '</div></div>';
  }
  grid.innerHTML = html;
  var cells = grid.querySelectorAll('.lvl');
  for (i = 0; i < cells.length; i++) {
    cells[i].addEventListener('click', function () {
      var n = parseInt(this.getAttribute('data-lvl'), 10);
      if (n > G.maxUnlocked()) { G.SFX.hit(); return; }
      G.SFX.click();
      if (H.level) H.level(n);
    });
  }
}

function renderShop() {
  var list = $('#shopList'); if (!list) return;
  var html = '', i, it, owned;
  for (i = 0; i < G.ITEMS.length; i++) {
    it = G.ITEMS[i];
    owned = !!G.save.items[it.id];
    html += '<div class="card' + (owned ? ' done' : '') + '">' +
      '<div class="ico">' + it.ic + '</div>' +
      '<div class="txt"><div class="nm">' + it.t + '</div>' +
      '<div class="ds">' + it.d + '</div></div>' +
      '<button class="btn small' + (owned ? ' ghost' : '') + '" data-item="' + it.id + '">' +
      (owned ? 'Куплено' : '🪙 ' + it.p) + '</button></div>';
  }
  list.innerHTML = html;
  var btns = list.querySelectorAll('button[data-item]');
  for (i = 0; i < btns.length; i++) {
    btns[i].addEventListener('click', function () {
      var id = this.getAttribute('data-item');
      var res = G.buy(id);
      if (res === 'ok') { G.SFX.star(); renderShop(); money(); }
      else G.SFX.hit();
    });
  }
}

function renderAch() {
  var list = $('#achList'); if (!list) return;
  var html = '', i, a, done;
  for (i = 0; i < G.ACH.length; i++) {
    a = G.ACH[i];
    done = !!G.save.ach[a.id];
    html += '<div class="card' + (done ? ' done' : '') + '">' +
      '<div class="ico">' + (done ? '🏆' : '🔒') + '</div>' +
      '<div class="txt"><div class="nm">' + a.n + '</div>' +
      '<div class="ds">' + a.d + '</div></div>' +
      '<div class="lvlpips">' + (done ? '+200 🪙' : '—') + '</div></div>';
  }
  list.innerHTML = html;
  money();
}

function renderSettings() {
  var a = $('#swSound'), b = $('#swMusic'), c = $('#swVibe');
  if (a) a.classList.toggle('on', !!G.save.sound);
  if (b) b.classList.toggle('on', !!G.save.music);
  if (c) c.classList.toggle('on', !!G.save.vibe);
  var inf = $('#setInfo');
  if (inf) {
    inf.textContent = 'Пройдено уровней: ' + G.levelsDone() + '/50 · Звёзд: ' +
      G.starsTotal() + '/150 · Свиней побеждено: ' + G.save.kills;
  }
}

function hud() {
  set('hudLevel', 'Уровень ' + G.level);
  set('hudScore', G.score);
  set('hudPigs', '🐷 ' + G.alivePigs());
  var el = $('#hudBirds');
  if (!el) return;
  var listNow = [], i, html = '';
  if (G.active) listNow.push(G.active.type);
  for (i = 0; i < G.birdsLeft.length; i++) listNow.push(G.birdsLeft[i]);
  for (i = 0; i < listNow.length && i < 8; i++) {
    html += '<div class="pip ' + listNow[i] + '"></div>';
  }
  el.innerHTML = html;
}

function win(w) {
  var stars = '', i;
  for (i = 0; i < 3; i++) {
    stars += (i < w.stars) ? '<span>★</span>' : '<span class="off">☆</span>';
  }
  var ws = $('#winStars'); if (ws) ws.innerHTML = stars;
  set('winScore', w.score);
  set('winCoins', w.coins);
  var nb = $('#btnNext');
  if (nb) nb.style.display = (G.level < G.TOTAL_LEVELS) ? '' : 'none';
  ov('hud', false);
  ov('ovPause', false);
  ov('ovLose', false);
  ov('ovWin', true);
}

function lose(n) {
  set('losePigs', n);
  ov('hud', false);
  ov('ovPause', false);
  ov('ovWin', false);
  ov('ovLose', true);
}

function play() {
  ov('ovPause', false);
  ov('ovWin', false);
  ov('ovLose', false);
  ov('hud', true);
  hud();
}

function menu() {
  ov('ovPause', false);
  ov('ovWin', false);
  ov('ovLose', false);
  show('menu');
}

function pause() {
  ov('ovPause', true);
}

function bind() {
  function on(id, fn) { var e = $('#' + id); if (e) e.addEventListener('click', fn); }

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
    G.save.vibe = !G.save.vibe; G.store(); G.vibe(30); renderSettings();
  });
  on('btnReset', function () {
    G.resetProgress();
    renderSettings(); money(); hud(); G.SFX.hit();
  });

  on('btnPause', function () { if (H.pause) H.pause(); });
  on('btnResume', function () { if (H.resume) H.resume(); });
  on('btnRestart', function () { if (H.restart) H.restart(); });
  on('btnQuitP', function () { if (H.menu) H.menu(); });
  on('btnNext', function () { if (H.next) H.next(); });
  on('btnReplay', function () { if (H.restart) H.restart(); });
  on('btnQuitW', function () { if (H.menu) H.menu(); });
  on('btnRetry', function () { if (H.restart) H.restart(); });
  on('btnQuitL', function () { if (H.menu) H.menu(); });
}

function init(hooks) {
  H = hooks || {};
  bind();
  show('menu');
}

return {
  init: init, show: show, money: money, hud: hud, win: win, lose: lose,
  play: play, menu: menu, pause: pause, renderLevels: renderLevels
};
})();
