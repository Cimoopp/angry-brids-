/* ============================================================
   ANGRY BIRDS — экраны, список уровней, магазин, достижения,
   настройки, HUD. Экспорт: window.ABUI
   ============================================================ */
window.ABUI = (function () {
'use strict';
var G = window.ABG;
if (!G) { console.error('engine.js не загружен'); return null; }

var SCREENS = ['menu', 'levels', 'shop', 'ach', 'settings'];
var OVS = ['ovPause', 'ovWin', 'ovLose'];
var totalPigs = 0;

function $(id) { return document.getElementById(id); }

/* ---------- показать / скрыть ---------- */
function hide(el) {
  if (!el) return;
  el.classList.add('hidden');
  el.style.display = 'none';
  el.style.visibility = 'hidden';
}

function reveal(el, display) {
  if (!el) return;
  el.classList.remove('hidden');
  el.style.visibility = 'visible';
  el.style.display = display || 'flex';
}

/* name = null → игровой режим (HUD видно), иначе открыт экран */
function show(name) {
  var i, el;
  for (i = 0; i < SCREENS.length; i++) {
    el = $(SCREENS[i]);
    if (SCREENS[i] === name) reveal(el, 'flex');
    else hide(el);
  }
  for (i = 0; i < OVS.length; i++) hide($(OVS[i]));

  var hud = $('hud');
  if (name) hide(hud); else reveal(hud, 'block');

  if (name === 'levels') renderLevels();
  if (name === 'shop') renderShop();
  if (name === 'ach') renderAch();
  if (name === 'settings') renderSettings();
  money();
}

/* ---------- деньги и звёзды ---------- */
function money() {
  var set = function (id, v) { var el = $(id); if (el) el.textContent = v; };
  set('menuCoins', G.save.coins);
  set('menuStars', G.starsTotal());
  set('levelsCoins', G.save.coins);
  set('shopCoins', G.save.coins);
  set('achDone', G.achCount());
  set('achTotal', G.ACH.length);
  var info = $('setInfo');
  if (info) {
    info.textContent = 'Пройдено уровней: ' + G.levelsDone() + '/' + G.TOTAL_LEVELS +
      ' · Звёзд: ' + G.starsTotal() + '/' + G.MAX_STARS + ' · Монет: ' + G.save.coins;
  }
}

/* ---------- HUD ---------- */
function syncScore() {
  var el = $('hudScore');
  if (el) el.textContent = G.score;
}

function syncHud() {
  var lv = $('hudLevel');
  if (lv) lv.textContent = 'Уровень ' + G.level;
  var pg = $('hudPigs');
  if (pg) pg.textContent = '🐷 ' + G.alivePigs();
  syncScore();

  var wrap = $('hudBirds');
  if (!wrap) return;
  var list = G.birdsLeft.slice();
  if (G.active) list.unshift(G.active.type);
  var html = '';
  for (var i = 0; i < list.length; i++) {
    var type = list[i];
    var cls = 'pip ' + (type === 'red' ? 'red' : type === 'yellow' ? 'yellow' : type === 'blue' ? 'blue' : 'black');
    html += '<span class="' + cls + '"></span>';
  }
  wrap.innerHTML = html;
}

function resetCounters() {
  var L = G.LEVELS[G.level - 1];
  totalPigs = L ? L.pigs.length : 0;
}

/* ---------- уровни ---------- */
function renderLevels() {
  var grid = $('levelsGrid');
  if (!grid) return;
  var html = '', i;
  var unlocked = G.maxUnlocked();
  for (i = 1; i <= G.TOTAL_LEVELS; i++) {
    var stars = G.starsOf(i);
    var open = i <= unlocked;
    var mark = stars === 3 ? '★★★' : stars === 2 ? '★★☆' : stars === 1 ? '★☆☆' : '';
    html += '<div class="lvl ' + (open ? 'open' : 'locked') + '" data-lvl="' + i + '">' +
      i + '<span class="st">' + (open ? mark : '🔒') + '</span></div>';
  }
  grid.innerHTML = html;

  var tiles = grid.querySelectorAll('.lvl');
  for (i = 0; i < tiles.length; i++) {
    tiles[i].addEventListener('click', function () {
      var n = parseInt(this.getAttribute('data-lvl'), 10);
      if (n > G.maxUnlocked()) {
        if (G.SFX.hit) G.SFX.hit();
        return;
      }
      if (G.SFX.click) G.SFX.click();
      if (window.ABC) window.ABC.beginLevel(n);
    });
  }
}

/* ---------- магазин ---------- */
function renderShop() {
  var list = $('shopList');
  if (!list) return;
  var html = '', i;
  for (i = 0; i < G.ITEMS.length; i++) {
    var it = G.ITEMS[i];
    var bought = G.has(it.id);
    var label = bought ? 'Куплено' : ('🪙 ' + it.cost);
    html += '<div class="card ' + (bought ? 'done' : '') + '">' +
      '<div class="ico">' + it.icon + '</div>' +
      '<div class="txt"><div class="nm">' + it.name + '</div>' +
      '<div class="ds">' + it.desc + '</div></div>' +
      '<button class="btn small' + (bought ? ' ghost' : '') + '" data-item="' + it.id + '">' + label + '</button>' +
      '</div>';
  }
  list.innerHTML = html;

  var btns = list.querySelectorAll('button[data-item]');
  for (i = 0; i < btns.length; i++) {
    btns[i].addEventListener('click', function () {
      var id = this.getAttribute('data-item');
      if (G.has(id)) return;
      if (G.buy(id)) {
        if (G.SFX.win) G.SFX.win();
        G.unlockAch('shop1');
        var all = true, k;
        for (k = 0; k < G.ITEMS.length; k++) if (!G.has(G.ITEMS[k].id)) all = false;
        if (all) G.unlockAch('shop4');
      } else {
        if (G.SFX.hit) G.SFX.hit();
      }
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
    var a = G.ACH[i];
    var done = !!G.save.ach[a.id];
    html += '<div class="card ' + (done ? 'done' : '') + '">' +
      '<div class="ico">' + (done ? a.icon : '🔒') + '</div>' +
      '<div class="txt"><div class="nm">' + a.name + '</div>' +
      '<div class="ds">' + a.desc + '</div></div>' +
      '<div class="lvlpips">' + (done ? '✓' : '') + '</div>' +
      '</div>';
  }
  list.innerHTML = html;
}

/* ---------- настройки ---------- */
function renderSettings() {
  var map = [['swSound', 'sound'], ['swMusic', 'music'], ['swVibe', 'vibe']];
  for (var i = 0; i < map.length; i++) {
    var el = $(map[i][0]);
    if (!el) continue;
    if (G.save[map[i][1]]) el.classList.add('on');
    else el.classList.remove('on');
  }
  money();
}

return {
  show: show,
  hide: hide,
  reveal: reveal,
  money: money,
  syncHud: syncHud,
  syncScore: syncScore,
  resetCounters: resetCounters,
  renderLevels: renderLevels,
  renderShop: renderShop,
  renderAch: renderAch,
  renderSettings: renderSettings
};
})();
