/* ============================================================
   ANGRY BIRDS — экраны, списки, HUD
   Экспорт: window.ABUI
   ============================================================ */
window.ABUI = (function () {
'use strict';
var G = window.ABG;
if (!G) { console.error('ABG не загружен'); return null; }

var SCREENS = ['menu', 'levels', 'shop', 'ach', 'settings'];
var OVS = ['ovPause', 'ovWin', 'ovLose'];

function $(id) { return document.getElementById(id); }

function hide(el) {
  if (!el) return;
  el.classList.add('hidden');
  el.style.display = 'none';
}
function reveal(el, disp) {
  if (!el) return;
  el.classList.remove('hidden');
  el.style.display = disp || 'block';
}

function show(name) {
  var i, el;
  for (i = 0; i < SCREENS.length; i++) hide($(SCREENS[i]));
  for (i = 0; i < OVS.length; i++) hide($(OVS[i]));

  if (name) {
    el = $(name);
    if (el) reveal(el, 'flex');
    hide($('hud'));
  }

  if (name === 'levels') renderLevels();
  if (name === 'shop') renderShop();
  if (name === 'ach') renderAch();
  if (name === 'settings') renderSettings();
  money();
}

/* ---------------- уровни ---------------- */
function renderLevels() {
  var box = $('levelsGrid');
  if (!box) return;
  var max = G.maxUnlocked();
  var html = '', n, s, i;
  for (n = 1; n <= G.TOTAL_LEVELS; n++) {
    s = G.starsOf(n);
    var open = n <= max;
    html += '<div class="lvl ' + (open ? 'open' : 'locked') + '" data-lvl="' + n + '">';
    html += '<div>' + n + '</div>';
    var st = '';
    if (open) {
      for (i = 0; i < 3; i++) st += (i < s ? '★' : '☆');
    }
    html += '<div class="st">' + st + '</div></div>';
  }
  box.innerHTML = html;

  var cells = box.querySelectorAll('.lvl');
  for (i = 0; i < cells.length; i++) {
    cells[i].addEventListener('click', function () {
      var t = parseInt(this.getAttribute('data-lvl'), 10);
      if (this.className.indexOf('locked') >= 0) {
        if (G.SFX.hit) G.SFX.hit();
        return;
      }
      if (G.SFX.click) G.SFX.click();
      if (window.ABC) window.ABC.beginLevel(t);
    });
  }
}

/* ---------------- магазин ---------------- */
function renderShop() {
  var box = $('shopList');
  if (!box) return;
  var html = '', i;
  for (i = 0; i < G.ITEMS.length; i++) {
    var it = G.ITEMS[i];
    var own = G.has(it.id);
    html += '<div class="card' + (own ? ' done' : '') + '">' +
      '<div class="ico">' + (own ? '✅' : '🎁') + '</div>' +
      '<div class="txt"><div class="nm">' + it.name + '</div>' +
      '<div class="ds">' + it.desc + '</div></div>' +
      (own
        ? '<div class="lvlpips">куплено</div>'
        : '<button class="btn small" data-buy="' + it.id + '">🪙 ' + it.price + '</button>') +
      '</div>';
  }
  box.innerHTML = html;

  var btns = box.querySelectorAll('[data-buy]');
  for (i = 0; i < btns.length; i++) {
    btns[i].addEventListener('click', function () {
      var id = this.getAttribute('data-buy');
      var ok = G.buy(id);
      if (G.SFX[ok ? 'win' : 'hit']) G.SFX[ok ? 'win' : 'hit']();
      renderShop();
      money();
    });
  }
}

/* ---------------- достижения ---------------- */
function renderAch() {
  var box = $('achList');
  if (!box) return;
  var total = $('achTotal');
  if (total) total.textContent = G.ACH.length;
  var html = '', i;
  for (i = 0; i < G.ACH.length; i++) {
    var a = G.ACH[i];
    var done = G.achDone(a.id);
    html += '<div class="card' + (done ? ' done' : '') + '">' +
      '<div class="ico">' + (done ? '🏆' : '🔒') + '</div>' +
      '<div class="txt"><div class="nm">' + a.name + '</div>' +
      '<div class="ds">' + a.desc + '</div></div></div>';
  }
  box.innerHTML = html;
}

/* ---------------- настройки ---------------- */
function sw(id, on) {
  var el = $(id);
  if (!el) return;
  el.className = 'sw' + (on ? ' on' : '');
}
function renderSettings() {
  sw('swSound', !!G.save.sound);
  sw('swMusic', !!G.save.music);
  sw('swVibe', !!G.save.vibe);
  var info = $('setInfo');
  if (info) {
    info.innerHTML = 'Angry Birds 1.0<br>Уровней пройдено: ' + G.levelsDone() +
      ' · Звёзд: ' + G.starsTotal() + '/150<br>Достижений: ' + G.achCount() + '/' + G.ACH.length;
  }
}

/* ---------------- счётчики ---------------- */
function money() {
  var el;
  el = $('menuCoins'); if (el) el.textContent = G.save.coins;
  el = $('menuStars'); if (el) el.textContent = G.starsTotal();
  el = $('levelsCoins'); if (el) el.textContent = G.save.coins;
  el = $('shopCoins'); if (el) el.textContent = G.save.coins;
  el = $('achDone'); if (el) el.textContent = G.achCount();
  el = $('achTotal'); if (el) el.textContent = G.ACH.length;
}

var hudStars = '';
function syncHud() {
  var hud = $('hud');
  if (!hud) return;
  if (!G.started || G.state === 'menu') { hide(hud); return; }
  reveal(hud, 'block');

  var lv = $('hudLevel');
  if (lv) lv.textContent = 'Уровень ' + G.level;

  var pg = $('hudPigs');
  if (pg) pg.textContent = '🐷 ' + G.alivePigs();

  var box = $('hudBirds');
  if (box) {
    var html = '';
    if (G.active) {
      html += '<div class="pip ' + col(G.active.type) + '" title="на рогатке"></div>';
    }
    for (var i = 0; i < G.birdsLeft.length; i++) {
      html += '<div class="pip ' + col(G.birdsLeft[i]) + '"></div>';
    }
    box.innerHTML = html;
  }
}
function col(t) {
  return t === 'yellow' ? 'yellow' : t === 'blue' ? 'blue' : t === 'black' ? 'black' : 'red';
}

function syncScore() {
  var el = $('hudScore');
  if (el) el.textContent = G.score;
}

function resetCounters() {
  syncHud();
  syncScore();
  money();
}

return {
  show: show, hide: hide, reveal: reveal,
  renderLevels: renderLevels, renderShop: renderShop, renderAch: renderAch,
  renderSettings: renderSettings, money: money,
  syncHud: syncHud, syncScore: syncScore, resetCounters: resetCounters
};
})();
