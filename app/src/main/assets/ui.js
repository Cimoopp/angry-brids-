/* ============================================================
   ANGRY BIRDS — экраны, списки, HUD. Экспорт: window.ABUI
   ============================================================ */
window.ABUI = (function () {
'use strict';
var G = window.ABG;
if (!G) { console.error('ABG не загружен'); return null; }

function $(id) { return document.getElementById(id); }
var SCREENS = ['menu', 'levels', 'shop', 'ach', 'settings'];
var OVS = ['ovPause', 'ovWin', 'ovLose'];
var lastPigs = -1;

function hide(el) { if (el) el.style.display = 'none'; }
function showEl(el, d) { if (el) el.style.display = d || 'flex'; }

function hideAll() {
  var i;
  for (i = 0; i < SCREENS.length; i++) hide($(SCREENS[i]));
  for (i = 0; i < OVS.length; i++) hide($(OVS[i]));
}

function show(name) {
  hideAll();
  if (name) {
    showEl($(name), 'flex');
    hide($('hud'));
    if (name === 'levels') renderLevels();
    if (name === 'shop') renderShop();
    if (name === 'ach') renderAch();
    if (name === 'settings') renderSettings();
  } else {
    showEl($('hud'), 'block');
  }
  money();
}

function reveal(el, d) { showEl(el, d || 'flex'); }

/* ---------- цифры ---------- */
function setText(id, v) { var el = $(id); if (el) el.textContent = v; }

function money() {
  setText('menuCoins', G.save.coins);
  setText('menuStars', G.starsTotal());
  setText('levelsCoins', G.save.coins);
  setText('shopCoins', G.save.coins);
  setText('achDone', G.achCount());
  setText('achTotal', G.ACH.length);
}

function syncHud() {
  setText('hudLevel', 'Уровень ' + G.level);
  setText('hudPigs', '🐷 ' + G.alivePigs());
  var hb = $('hudBirds');
  if (hb) {
    var list = [], i, html = '';
    if (G.active) list.push(G.active.type);
    for (i = 0; i < G.birdsLeft.length; i++) list.push(G.birdsLeft[i]);
    for (i = 0; i < list.length && i < 9; i++) html += '<div class="pip ' + list[i] + '"></div>';
    hb.innerHTML = html;
  }
  lastPigs = G.alivePigs();
}

function syncScore() { setText('hudScore', G.score); }

function resetCounters() {
  lastPigs = -1;
  setText('hudScore', 0);
}

/* ---------- уровни ---------- */
function renderLevels() {
  var grid = $('levelsGrid');
  if (!grid) return;
  var open = G.maxUnlocked(), html = '', i, k;
  for (i = 1; i <= G.TOTAL_LEVELS; i++) {
    var st = (G.save.levels && G.save.levels[i]) | 0;
    var isOpen = i <= open, stars = '';
    for (k = 0; k < 3; k++) stars += (k < st ? '★' : '·');
    html += '<div class="lvl ' + (isOpen ? 'open' : 'locked') + '" data-lvl="' + i + '">' +
            (isOpen ? i : '🔒') + '<div class="st">' + (isOpen ? stars : '') + '</div></div>';
  }
  grid.innerHTML = html;
  var cells = grid.querySelectorAll('.lvl');
  for (i = 0; i < cells.length; i++) {
    cells[i].addEventListener('click', function () {
      var n = parseInt(this.getAttribute('data-lvl'), 10);
      var u = window.ABC;
      if (n > G.maxUnlocked()) { if (G.SFX.hit) G.SFX.hit(); return; }
      if (G.SFX.click) G.SFX.click();
      if (u && u.beginLevel) u.beginLevel(n);
    });
  }
}

/* ---------- магазин ---------- */
function renderShop() {
  var list = $('shopList');
  if (!list) return;
  var html = '', i;
  for (i = 0; i < G.ITEMS.length; i++) {
    var it = G.ITEMS[i], owned = !!(G.save.items && G.save.items[it.id]);
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

/* ---------- достижения ---------- */
function renderAch() {
  var list = $('achList');
  if (!list) return;
  var html = '', i;
  for (i = 0; i < G.ACH.length; i++) {
    var a = G.ACH[i], done = !!(G.save.ach && G.save.ach[a.id]);
    html += '<div class="card ' + (done ? 'done' : '') + '">' +
      '<div class="ico">' + (done ? '🏆' : '🔒') + '</div>' +
      '<div class="txt"><div class="nm">' + a.n + '</div>' +
      '<div class="ds">' + a.d + '</div></div>' +
      '<div class="lvlpips">' + (done ? 'получено' : '—') + '</div></div>';
  }
  list.innerHTML = html;
}

/* ---------- настройки ---------- */
function renderSettings() {
  var a = $('swSound'); if (a) a.classList.toggle('on', !!G.save.sound);
  var b = $('swMusic'); if (b) b.classList.toggle('on', !!G.save.music);
  var c = $('swVibe'); if (c) c.classList.toggle('on', !!G.save.vibe);
  setText('setInfo', 'Пройдено: ' + G.levelsDone() + '/' + G.TOTAL_LEVELS +
    ' · Звёзд: ' + G.starsTotal() + '/' + (G.TOTAL_LEVELS * 3) +
    ' · Свиней: ' + G.save.kills);
}

return {
  show: show, hide: hide, showEl: showEl, hideAll: hideAll, reveal: reveal,
  money: money, syncHud: syncHud, syncScore: syncScore, resetCounters: resetCounters,
  renderLevels: renderLevels, renderShop: renderShop, renderAch: renderAch,
  renderSettings: renderSettings,
  getLastPigs: function () { return lastPigs; }
};
})();
