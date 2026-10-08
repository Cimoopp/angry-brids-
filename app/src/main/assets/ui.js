/* ============================================================
   ANGRY BIRDS — экраны интерфейса (window.ABUI)
   Меню, выбор уровня, магазин, достижения, настройки, HUD
   ============================================================ */
window.ABUI = (function () {
'use strict';
var G = window.ABG, R = window.ABR;
if (!G || !R) { console.error('ABG/ABR не загружены'); return null; }

function $(id) { return document.getElementById(id); }
var CUR = null;

function hide(el) { if (!el) return; el.style.display = 'none'; el.classList.add('hidden'); }
function reveal(el, d) { if (!el) return; el.style.display = d || 'flex'; el.classList.remove('hidden'); }

function show(name) {
  CUR = name;
  ['menu', 'levels', 'shop', 'ach', 'settings'].forEach(function (s) {
    var el = $(s);
    if (!el) return;
    if (s === name) reveal(el, 'flex'); else hide(el);
  });
  ['ovPause', 'ovWin', 'ovLose'].forEach(function (s) { hide($(s)); });
  var hud = $('hud');
  if (name) hide(hud); else reveal(hud, 'block');
  if (name === 'levels') renderLevels();
  if (name === 'shop') renderShop();
  if (name === 'ach') renderAch();
  if (name === 'settings') renderSettings();
  money();
}

/* ---------------- монеты и звёзды ---------------- */
function money() {
  var c = G.save.coins || 0;
  var st = G.starsTotal();
  ['menuCoins', 'levelsCoins', 'shopCoins'].forEach(function (id) {
    var el = $(id); if (el) el.textContent = c;
  });
  var ms = $('menuStars'); if (ms) ms.textContent = st;
  var ad = $('achDone'); if (ad) ad.textContent = G.achCount();
  var at = $('achTotal'); if (at) at.textContent = G.ACH.length;
}

/* ---------------- HUD ---------------- */
function resetCounters() { G.score = 0; syncScore(); }

function syncScore() {
  var s = $('hudScore'); if (s) s.textContent = G.score;
}

function syncHud() {
  var lv = $('hudLevel'); if (lv) lv.textContent = 'Уровень ' + G.level;
  var pg = $('hudPigs'); if (pg) pg.textContent = '🐷 ' + G.alivePigs();
  var box = $('hudBirds');
  if (!box) return;
  box.innerHTML = '';
  var i, list = G.birdsLeft || [];
  for (i = 0; i < list.length; i++) {
    var t = (typeof list[i] === 'string') ? list[i] : (list[i] && list[i].type) || 'red';
    var d = document.createElement('div');
    d.className = 'pip ' + t;
    box.appendChild(d);
  }
  if (G.active) {
    var a = document.createElement('div');
    a.className = 'pip ' + (G.active.type || 'red');
    box.appendChild(a);
  }
}

/* ---------------- выбор уровня ---------------- */
function renderLevels() {
  var grid = $('levelsGrid');
  if (!grid) return;
  grid.innerHTML = '';
  var unlocked = G.maxUnlocked();
  var i;
  for (i = 1; i <= G.TOTAL_LEVELS; i++) {
    (function (n) {
      var d = document.createElement('div');
      var open = n <= unlocked;
      d.className = 'lvl ' + (open ? 'open' : 'locked');
      var st = G.starsOf(n);
      var stars = '';
      var k;
      for (k = 0; k < 3; k++) stars += (k < st) ? '★' : '·';
      d.innerHTML = '<div>' + n + '</div><div class="st">' + (open ? stars : '🔒') + '</div>';
      if (open) {
        d.addEventListener('click', function () {
          if (G.SFX.click) G.SFX.click();
          window.ABC.beginLevel(n);
        });
      }
      grid.appendChild(d);
    })(i);
  }
  money();
}

/* ---------------- магазин ---------------- */
function renderShop() {
  var list = $('shopList');
  if (!list) return;
  list.innerHTML = '';
  G.ITEMS.forEach(function (it) {
    var owned = G.has(it.id);
    var card = document.createElement('div');
    card.className = 'card' + (owned ? ' done' : '');
    card.innerHTML =
      '<div class="ico">' + (it.icon || '🎁') + '</div>' +
      '<div class="txt"><div class="nm">' + it.name + '</div>' +
      '<div class="ds">' + it.desc + '</div></div>' +
      '<button class="btn small ' + (owned ? 'ghost' : 'alt') + '">' +
      (owned ? 'Куплено' : (it.price + ' 🪙')) + '</button>';
    var btn = card.querySelector('button');
    btn.addEventListener('click', function () {
      if (owned) return;
      if (G.buy(it.id)) { if (G.SFX.coin) G.SFX.coin(); renderShop(); }
      else { if (G.SFX.hit) G.SFX.hit(); btn.textContent = 'Мало монет'; }
    });
    list.appendChild(card);
  });
  money();
}

/* ---------------- достижения ---------------- */
function renderAch() {
  var list = $('achList');
  if (!list) return;
  list.innerHTML = '';
  G.ACH.forEach(function (a) {
    var done = G.hasAch(a.id);
    var card = document.createElement('div');
    card.className = 'card' + (done ? ' done' : '');
    card.innerHTML =
      '<div class="ico">' + (done ? '🏆' : '🔒') + '</div>' +
      '<div class="txt"><div class="nm">' + a.name + '</div>' +
      '<div class="ds">' + a.desc + '</div></div>' +
      '<div class="lvlpips">' + (done ? 'получено' : '—') + '</div>';
    list.appendChild(card);
  });
  money();
}

/* ---------------- настройки ---------------- */
function renderSettings() {
  var map = { swSound: 'sound', swMusic: 'music', swVibe: 'vibe' };
  Object.keys(map).forEach(function (id) {
    var el = $(id);
    if (!el) return;
    el.classList.toggle('on', !!G.save[map[id]]);
  });
  var info = $('setInfo');
  if (info) {
    info.textContent = 'Пройдено уровней: ' + G.levelsDone() + '/' + G.TOTAL_LEVELS +
      ' · звёзд: ' + G.starsTotal() + '/' + (G.TOTAL_LEVELS * 3) +
      ' · достижений: ' + G.achCount() + '/' + G.ACH.length;
  }
}

return {
  show: show,
  hide: hide,
  reveal: reveal,
  money: money,
  resetCounters: resetCounters,
  syncHud: syncHud,
  syncScore: syncScore,
  renderLevels: renderLevels,
  renderShop: renderShop,
  renderAch: renderAch,
  renderSettings: renderSettings,
  get current() { return CUR; }
};
})();
