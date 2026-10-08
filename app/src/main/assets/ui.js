/* ============================================================
   ANGRY BIRDS — интерфейс: экраны, магазин, достижения, HUD
   Экспорт: window.ABUI
   ============================================================ */
window.ABUI = (function () {
'use strict';
var G = window.ABG;
if (!G) { console.error('ABG не загружен'); return null; }

var SCREENS = ['menu', 'levels', 'shop', 'ach', 'settings'];
var OVERLAYS = ['ovPause', 'ovWin', 'ovLose'];

function $(id) { return document.getElementById(id); }

function hide(el) { if (el) { el.style.display = 'none'; el.classList.add('hidden'); } }
function reveal(el, mode) {
  if (!el) return;
  el.classList.remove('hidden');
  el.style.display = mode || 'flex';
}

/* ---------- переключение экранов ---------- */
function show(name) {
  var i, el;
  for (i = 0; i < SCREENS.length; i++) {
    el = $(SCREENS[i]);
    if (!el) continue;
    if (SCREENS[i] === name) reveal(el, 'flex');
    else hide(el);
  }
  for (i = 0; i < OVERLAYS.length; i++) hide($(OVERLAYS[i]));

  var hud = $('hud');
  if (!name) reveal(hud, 'block');
  else hide(hud);

  if (name === 'levels') renderLevels();
  else if (name === 'shop') renderShop();
  else if (name === 'ach') renderAch();
  else if (name === 'settings') renderSettings();
  money();
}

/* ---------- деньги и звёзды ---------- */
function money() {
  var ids = ['menuCoins', 'levelsCoins', 'shopCoins'];
  var i, el;
  for (i = 0; i < ids.length; i++) {
    el = $(ids[i]);
    if (el) el.textContent = G.coins();
  }
  el = $('menuStars');
  if (el) el.textContent = G.starsTotal();
  el = $('achDone');
  if (el) el.textContent = G.achCount();
  el = $('achTotal');
  if (el) el.textContent = G.ACH.length;
}

/* ---------- уровни ---------- */
function renderLevels() {
  var grid = $('levelsGrid');
  if (!grid) return;
  var open = G.maxUnlocked();
  var html = '', n, st, i;
  for (n = 1; n <= G.TOTAL_LEVELS; n++) {
    st = G.starsOf(n);
    var pip = '';
    for (i = 0; i < 3; i++) pip += (i < st) ? '★' : '·';
    var cls = (n <= open) ? 'lvl open' : 'lvl locked';
    html += '<div class="' + cls + '" data-lvl="' + n + '">' + n +
            '<div class="st">' + pip + '</div></div>';
  }
  grid.innerHTML = html;

  var items = grid.querySelectorAll('.lvl');
  var k;
  for (k = 0; k < items.length; k++) {
    items[k].addEventListener('click', function () {
      var n2 = parseInt(this.getAttribute('data-lvl'), 10);
      if (n2 > G.maxUnlocked()) { if (G.SFX.hit) G.SFX.hit(); return; }
      if (G.SFX.click) G.SFX.click();
      if (window.ABC && window.ABC.beginLevel) window.ABC.beginLevel(n2);
    });
  }
}

/* ---------- магазин ---------- */
function renderShop() {
  var box = $('shopList');
  if (!box) return;
  var html = '', i, it, own;
  for (i = 0; i < G.ITEMS.length; i++) {
    it = G.ITEMS[i];
    own = G.has(it.id);
    html += '<div class="card' + (own ? ' done' : '') + '" data-item="' + it.id + '">' +
            '<div class="ico">' + it.icon + '</div>' +
            '<div class="txt"><div class="nm">' + it.name + '</div>' +
            '<div class="ds">' + it.desc + '</div></div>' +
            '<button class="btn small' + (own ? ' ghost' : ' alt') + '" style="min-width:0">' +
            (own ? 'Куплено' : '🪙 ' + it.price) + '</button></div>';
  }
  box.innerHTML = html;

  var cards = box.querySelectorAll('.card');
  var k;
  for (k = 0; k < cards.length; k++) {
    cards[k].addEventListener('click', function () {
      var id = this.getAttribute('data-item');
      if (G.has(id)) return;
      if (G.buy(id)) {
        if (G.SFX.coin) G.SFX.coin();
        renderShop();
      } else if (G.SFX.hit) G.SFX.hit();
      money();
    });
  }
}

/* ---------- достижения ---------- */
function renderAch() {
  var box = $('achList');
  if (!box) return;
  var html = '', i, a, done;
  for (i = 0; i < G.ACH.length; i++) {
    a = G.ACH[i];
    done = G.save.ach.indexOf(a.id) >= 0;
    html += '<div class="card' + (done ? ' done' : '') + '">' +
            '<div class="ico">' + (done ? '🏆' : '🔒') + '</div>' +
            '<div class="txt"><div class="nm">' + a.name + '</div>' +
            '<div class="ds">' + a.desc + '</div></div>' +
            '<div class="lvlpips">' + (done ? 'выполнено' : '🪙 ' + a.reward) + '</div></div>';
  }
  box.innerHTML = html;
}

/* ---------- настройки ---------- */
function renderSettings() {
  setSw('swSound', G.save.sound);
  setSw('swMusic', G.save.music);
  setSw('swVibe', G.save.vibe);
  var el = $('setInfo');
  if (el) {
    el.innerHTML = 'Angry Birds 1.1<br>Уровней пройдено: ' + G.levelsDone() +
                   ' · Звёзд: ' + G.starsTotal() + '/150' +
                   '<br>Монет: 🪙 ' + G.coins();
  }
}

function setSw(id, on) {
  var el = $(id);
  if (!el) return;
  if (on) el.classList.add('on');
  else el.classList.remove('on');
}

/* ---------- HUD ---------- */
function resetCounters() {
  var el = $('hudLevel');
  if (el) el.textContent = 'Уровень ' + G.level;
  var sc2 = $('hudScore');
  if (sc2) sc2.textContent = '0';
}

function syncScore() {
  var el = $('hudScore');
  if (el) el.textContent = G.score;
  var p = $('hudPigs');
  if (p) p.textContent = '🐷 ' + G.alivePigs();
}

function syncHud() {
  var box = $('hudBirds');
  if (!box) return;
  var html = '', i, b;
  for (i = 0; i < G.birdsLeft.length; i++) {
    b = G.birdsLeft[i];
    html += '<div class="pip ' + (b.type === 'red' ? 'red' : b.type === 'yellow' ? 'yellow' : b.type === 'blue' ? 'blue' : 'black') + '"></div>';
  }
  box.innerHTML = html;
  resetCounters();
  syncScore();
}

return {
  show: show,
  hide: hide,
  reveal: reveal,
  resetCounters: resetCounters,
  money: money,
  syncHud: syncHud,
  syncScore: syncScore,
  renderLevels: renderLevels,
  renderShop: renderShop,
  renderAch: renderAch,
  renderSettings: renderSettings
};
})();
