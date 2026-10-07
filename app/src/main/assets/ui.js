/* ============================================================
   ANGRY BIRDS — экраны, списки, HUD
   Экспорт: window.ABUI
   ============================================================ */
window.ABUI = (function () {
'use strict';
var G = window.ABG, R = window.ABR;
if (!G) { console.error('ABG не загружен'); return null; }

var SCREENS = ['menu', 'levels', 'shop', 'ach', 'settings'];
var OVS = ['ovPause', 'ovWin', 'ovLose'];

function $(id) { return document.getElementById(id); }

function hide(el) { if (el) { el.classList.add('hidden'); el.style.display = 'none'; } }
function reveal(el, mode) {
  if (!el) return;
  el.classList.remove('hidden');
  el.style.display = mode || 'flex';
}

function show(name) {
  var i, el;
  for (i = 0; i < SCREENS.length; i++) {
    el = $(SCREENS[i]);
    if (!el) continue;
    if (SCREENS[i] === name) { el.classList.remove('hidden'); el.style.display = 'flex'; }
    else hide(el);
  }
  for (i = 0; i < OVS.length; i++) hide($(OVS[i]));
  var hud = $('hud');
  if (hud) {
    if (name === null) { hud.classList.remove('hidden'); hud.style.display = 'block'; }
    else hide(hud);
  }
  if (name === 'levels') renderLevels();
  if (name === 'shop') renderShop();
  if (name === 'ach') renderAch();
  if (name === 'settings') renderSettings();
  money();
}

function money() {
  var c = G.save.coins || 0, st = G.totalStars();
  var i, ids = ['menuCoins', 'levelsCoins', 'shopCoins'];
  for (i = 0; i < ids.length; i++) { var e = $(ids[i]); if (e) e.textContent = c; }
  var ms = $('menuStars'); if (ms) ms.textContent = st;
  var ad = $('achDone'); if (ad) ad.textContent = G.achCount();
  var at = $('achTotal'); if (at) at.textContent = G.ACH.length;
}

function syncHud() {
  var l = $('hudLevel'); if (l) l.textContent = 'Уровень ' + G.level;
  var p = $('hudPigs'); if (p) p.textContent = '🐷 ' + G.alivePigs();
  var box = $('hudBirds');
  if (!box) return;
  var list = G.birdsLeft.slice();
  if (G.active) list.unshift(G.active.type);
  box.innerHTML = '';
  var i, d;
  for (i = 0; i < list.length; i++) {
    d = document.createElement('div');
    d.className = 'pip ' + (list[i] === 'red' ? 'red' : list[i] === 'yellow' ? 'yellow' : list[i] === 'blue' ? 'blue' : 'black');
    box.appendChild(d);
  }
}

function syncScore() {
  var s = $('hudScore'); if (s) s.textContent = G.score;
  var p = $('hudPigs'); if (p) p.textContent = '🐷 ' + G.alivePigs();
}

function resetCounters() {
  var s = $('hudScore'); if (s) s.textContent = '0';
  syncHud();
}

/* ---------- уровни ---------- */
function renderLevels() {
  var grid = $('levelsGrid');
  if (!grid) return;
  var max = G.maxUnlocked(), i, n = G.TOTAL_LEVELS;
  grid.innerHTML = '';
  for (i = 1; i <= n; i++) {
    (function (lvl) {
      var d = document.createElement('div');
      var open = lvl <= max;
      d.className = 'lvl ' + (open ? 'open' : 'locked');
      var st = G.stars(lvl);
      var stars = st ? '★'.repeat(st) : (open ? '☆' : '🔒');
      d.innerHTML = '<span>' + lvl + '</span><span class="st">' + stars + '</span>';
      if (open) {
        d.addEventListener('click', function () {
          if (G.SFX.click) G.SFX.click();
          if (window.ABC) window.ABC.beginLevel(lvl);
        });
      }
      grid.appendChild(d);
    })(i);
  }
  money();
}

/* ---------- магазин ---------- */
function renderShop() {
  var list = $('shopList');
  if (!list) return;
  list.innerHTML = '';
  var i;
  for (i = 0; i < G.ITEMS.length; i++) {
    (function (it) {
      var owned = G.has(it.id);
      var d = document.createElement('div');
      d.className = 'card' + (owned ? ' done' : '');
      d.innerHTML = '<div class="ico">' + it.ico + '</div>' +
        '<div class="txt"><div class="nm">' + it.name + '</div><div class="ds">' + it.desc + '</div></div>';
      var b = document.createElement('button');
      b.className = owned ? 'btn ghost small' : 'btn small';
      b.textContent = owned ? 'Куплено' : '🪙 ' + it.price;
      if (!owned) {
        b.addEventListener('click', function () {
          if (G.buy(it.id)) {
            if (G.SFX.coin) G.SFX.coin();
            renderShop();
            money();
          } else {
            if (G.SFX.hit) G.SFX.hit();
            b.textContent = 'Не хватает';
            setTimeout(function () { b.textContent = '🪙 ' + it.price; }, 900);
          }
        });
      }
      d.appendChild(b);
      list.appendChild(d);
    })(G.ITEMS[i]);
  }
  money();
}

/* ---------- достижения ---------- */
function renderAch() {
  var list = $('achList');
  if (!list) return;
  list.innerHTML = '';
  var i;
  for (i = 0; i < G.ACH.length; i++) {
    var a = G.ACH[i], got = !!G.save.ach[a.id];
    var d = document.createElement('div');
    d.className = 'card' + (got ? ' done' : '');
    d.style.opacity = got ? '1' : '.62';
    d.innerHTML = '<div class="ico">' + (got ? a.ico : '🔒') + '</div>' +
      '<div class="txt"><div class="nm">' + a.name + '</div><div class="ds">' + a.desc + '</div></div>' +
      '<div class="lvlpips">' + (got ? '✓' : '') + '</div>';
    list.appendChild(d);
  }
  money();
}

/* ---------- настройки ---------- */
function renderSettings() {
  var map = [['swSound', 'sound'], ['swMusic', 'music'], ['swVibe', 'vibe']];
  var i, el;
  for (i = 0; i < map.length; i++) {
    el = $(map[i][0]);
    if (el) el.classList.toggle('on', !!G.save[map[i][1]]);
  }
  var info = $('setInfo');
  if (info) {
    info.textContent = 'Уровней пройдено: ' + G.doneLevels() + '/' + G.TOTAL_LEVELS +
      ' · Звёзд: ' + G.totalStars() + ' · Достижений: ' + G.achCount() + '/' + G.ACH.length;
  }
}

/* ---------- старт отображения ---------- */
function boot() {
  var i;
  for (i = 0; i < OVS.length; i++) hide($(OVS[i]));
  show('menu');
  money();
}

return {
  show: show,
  hide: hide,
  reveal: reveal,
  boot: boot,
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
