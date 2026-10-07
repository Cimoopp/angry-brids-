/* ============================================================
   ANGRY BIRDS — экраны, списки, HUD
   Экспорт: window.ABUI (дополняется в controls.js)
   ============================================================ */
window.ABUI = (function () {
'use strict';
var G = window.ABG, R = window.ABR;
if (!G || !R) { console.error('ABG/ABR не загружены'); return null; }

var SCREENS = ['menu', 'levels', 'shop', 'ach', 'settings'];
var OVS = ['ovPause', 'ovWin', 'ovLose'];
var lastScore = -1, lastPigs = -1, lastLevel = -1;

function $(id) { return document.getElementById(id); }

function hide(el) {
  if (!el) return;
  el.classList.add('hidden');
  el.style.display = 'none';
  el.style.visibility = 'hidden';
}
function reveal(el, mode) {
  if (!el) return;
  el.classList.remove('hidden');
  el.style.visibility = 'visible';
  el.style.display = mode || 'flex';
}
function hideAllOv() { for (var i = 0; i < OVS.length; i++) hide($(OVS[i])); }

/* ---------- экраны ---------- */
function show(name) {
  var i, el;
  for (i = 0; i < SCREENS.length; i++) {
    el = $(SCREENS[i]);
    if (!el) continue;
    if (SCREENS[i] === name) reveal(el, 'flex'); else hide(el);
  }
  hideAllOv();
  if (name) hide($('hud')); else reveal($('hud'), 'block');

  if (name === 'levels') renderLevels();
  if (name === 'shop') renderShop();
  if (name === 'ach') renderAch();
  if (name === 'settings') renderSettings();
  if (name) money();
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
      if (n > G.maxUnlocked()) { if (G.SFX.hit) G.SFX.hit(); return; }
      if (G.SFX.click) G.SFX.click();
      if (window.ABUI.beginLevel) window.ABUI.beginLevel(n);
    });
  }
}

function renderShop() {
  var list = $('shopList');
  if (!list) return;
  var html = '', i;
  for (i = 0; i < G.ITEMS.length; i++) {
    var it = G.ITEMS[i], owned = G.has(it.id);
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
      var res = G.buy(this.getAttribute('data-item'));
      if (res !== 'ok') { if (G.SFX.hit) G.SFX.hit(); return; }
      if (G.SFX.star) G.SFX.star();
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
  var a = $('swSound'), b = $('swMusic'), c = $('swVibe');
  if (a) a.classList.toggle('on', !!G.save.sound);
  if (b) b.classList.toggle('on', !!G.save.music);
  if (c) c.classList.toggle('on', !!G.save.vibe);
  var inf = $('setInfo');
  if (inf) {
    inf.textContent = 'Пройдено: ' + G.levelsDone() + '/50 · Звёзд: ' + G.starsTotal() +
      '/150 · Свиней: ' + (G.save.kills || 0) + ' · Монет: ' + G.save.coins;
  }
}

/* ---------- HUD ---------- */
function syncHud() {
  var lv = $('hudLevel'), pg = $('hudPigs'), bd = $('hudBirds');
  if (lv && lastLevel !== G.level) { lv.textContent = 'Уровень ' + G.level; lastLevel = G.level; }
  var alive = G.alivePigs ? G.alivePigs() : 0;
  if (pg && lastPigs !== alive) { pg.textContent = '🐷 ' + alive; lastPigs = alive; }
  if (bd) {
    var html = '', list = [], i;
    if (G.active) list.push(G.active.type);
    for (i = 0; i < G.birdsLeft.length; i++) list.push(G.birdsLeft[i]);
    for (i = 0; i < list.length && i < 9; i++) html += '<div class="pip ' + list[i] + '"></div>';
    if (bd.innerHTML !== html) bd.innerHTML = html;
  }
}

function syncScore() {
  var el = $('hudScore');
  if (el && lastScore !== G.score) { el.textContent = G.score; lastScore = G.score; }
  if (G.state === 'play') {
    var w = $('ovWin'), l = $('ovLose');
    if (w && w.style.display !== 'none') hide(w);
    if (l && l.style.display !== 'none') hide(l);
  }
}

return {
  hide: hide, reveal: reveal, show: show, money: money,
  renderLevels: renderLevels, renderShop: renderShop,
  renderAch: renderAch, renderSettings: renderSettings,
  syncHud: syncHud, syncScore: syncScore,
  resetCounters: function () { lastScore = -1; lastPigs = -1; lastLevel = -1; }
};
})();
