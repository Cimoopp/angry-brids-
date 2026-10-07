/* ============================================================
   ANGRY BIRDS — интерфейс: экраны, HUD, списки, магазин
   Экспорт: window.ABUI
   ============================================================ */
window.ABUI = (function () {
'use strict';
var G = window.ABG;
if (!G) { console.error('ABG не загружен'); return null; }

var SCREENS = ['menu', 'levels', 'shop', 'ach', 'settings'];
var OVERS = ['ovPause', 'ovWin', 'ovLose'];

function $(id) { return document.getElementById(id); }

/* ---------- скрытие / показ ---------- */
function hide(el) {
  if (!el) return;
  el.classList.add('hidden');
  el.style.display = 'none';
  el.style.visibility = 'hidden';
}

function reveal(el, disp) {
  if (!el) return;
  el.classList.remove('hidden');
  el.style.visibility = 'visible';
  el.style.display = disp || 'flex';
}

function show(name) {
  var i, el;
  for (i = 0; i < SCREENS.length; i++) {
    el = $(SCREENS[i]);
    if (!el) continue;
    if (SCREENS[i] === name) reveal(el, 'flex');
    else hide(el);
  }
  for (i = 0; i < OVERS.length; i++) hide($(OVERS[i]));

  var hud = $('hud');
  if (hud) {
    if (name) hide(hud);
    else reveal(hud, 'block');
  }

  if (name === 'levels') renderLevels();
  if (name === 'shop') renderShop();
  if (name === 'ach') renderAch();
  if (name === 'settings') renderSettings();
  money();
}

/* ---------- монеты и звёзды ---------- */
function money() {
  var c = G.save.coins | 0;
  var st = G.starsTotal();
  var ids = ['menuCoins', 'levelsCoins', 'shopCoins'];
  for (var i = 0; i < ids.length; i++) {
    var el = $(ids[i]);
    if (el) el.textContent = c;
  }
  var ms = $('menuStars'); if (ms) ms.textContent = st;
  var a1 = $('achDone'); if (a1) a1.textContent = G.achCount();
  var a2 = $('achTotal'); if (a2) a2.textContent = G.ACH.length;
}

/* ---------- HUD ---------- */
function syncHud() {
  var l = $('hudLevel'); if (l) l.textContent = 'Уровень ' + G.level;
  var p = $('hudPigs'); if (p) p.textContent = '🐷 ' + G.alivePigs();
  syncScore();

  var box = $('hudBirds');
  if (!box) return;
  box.innerHTML = '';
  var order = [];
  if (G.active) order.push(G.active.type);
  for (var i = 0; i < G.birdsLeft.length; i++) order.push(G.birdsLeft[i]);
  for (var j = 0; j < order.length; j++) {
    var d = document.createElement('div');
    d.className = 'pip ' + order[j];
    var B = G.BIRDS[order[j]];
    if (B) {
      d.style.background = B.fill;
      d.style.borderColor = B.edge || 'rgba(0,0,0,.45)';
    }
    box.appendChild(d);
  }
}

function syncScore() {
  var s = $('hudScore');
  if (s) s.textContent = G.score | 0;
}

function resetCounters() {
  G.score = 0;
  syncScore();
  syncHud();
}

/* ---------- уровни ---------- */
function renderLevels() {
  var grid = $('levelsGrid');
  if (!grid) return;
  grid.innerHTML = '';
  var unlocked = G.save.unlocked | 0;
  if (unlocked < 1) unlocked = 1;
  var i;
  for (i = 1; i <= G.TOTAL_LEVELS; i++) {
    (function (n) {
      var d = document.createElement('div');
      var open = n <= unlocked;
      d.className = 'lvl ' + (open ? 'open' : 'locked');
      var num = document.createElement('div');
      num.textContent = n;
      d.appendChild(num);
      var st = document.createElement('div');
      st.className = 'st';
      var stars = G.starOf(n);
      st.textContent = open ? (stars ? '★'.repeat(stars) : '') : '🔒';
      d.appendChild(st);
      if (open) {
        d.addEventListener('click', function () {
          if (G.SFX.click) G.SFX.click();
          if (window.ABC) window.ABC.beginLevel(n);
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
  var ids = Object.keys(G.ITEMS), i;
  for (i = 0; i < ids.length; i++) {
    (function (id) {
      var it = G.ITEMS[id];
      var owned = G.has(id);
      var card = document.createElement('div');
      card.className = 'card' + (owned ? ' done' : '');

      var ico = document.createElement('div');
      ico.className = 'ico';
      ico.textContent = it.ico;
      card.appendChild(ico);

      var txt = document.createElement('div');
      txt.className = 'txt';
      var nm = document.createElement('div');
      nm.className = 'nm';
      nm.textContent = it.name;
      var ds = document.createElement('div');
      ds.className = 'ds';
      ds.textContent = it.desc;
      txt.appendChild(nm);
      txt.appendChild(ds);
      card.appendChild(txt);

      var btn = document.createElement('button');
      btn.className = 'btn small' + (owned ? ' ghost' : '');
      btn.textContent = owned ? 'Куплено' : (it.price + ' 🪙');
      btn.addEventListener('click', function () {
        if (G.SFX.click) G.SFX.click();
        var ok = G.buy(id);
        if (ok) {
          if (G.SFX.win) G.SFX.win();
          G.pop('🛒 ' + it.name, G.WORLD_W * 0.4, 180, '#8ef07a');
        } else if (!owned && G.save.coins < it.price) {
          if (G.SFX.hit) G.SFX.hit();
        }
        renderShop();
        money();
      });
      card.appendChild(btn);
      list.appendChild(card);
    })(ids[i]);
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
    var a = G.ACH[i];
    var done = !!G.save.ach[a.id];
    var card = document.createElement('div');
    card.className = 'card' + (done ? ' done' : '');

    var ico = document.createElement('div');
    ico.className = 'ico';
    ico.textContent = done ? a.ico : '🔒';
    card.appendChild(ico);

    var txt = document.createElement('div');
    txt.className = 'txt';
    var nm = document.createElement('div');
    nm.className = 'nm';
    nm.textContent = a.name;
    var ds = document.createElement('div');
    ds.className = 'ds';
    ds.textContent = a.desc;
    txt.appendChild(nm);
    txt.appendChild(ds);
    card.appendChild(txt);

    var mark = document.createElement('div');
    mark.className = 'lvlpips';
    mark.textContent = done ? '✔' : '';
    card.appendChild(mark);

    list.appendChild(card);
  }
  money();
}

/* ---------- настройки ---------- */
function renderSettings() {
  var pairs = [['swSound', 'sound'], ['swMusic', 'music'], ['swVibe', 'vibe']];
  for (var i = 0; i < pairs.length; i++) {
    var el = $(pairs[i][0]);
    if (!el) continue;
    if (G.save[pairs[i][1]]) el.classList.add('on');
    else el.classList.remove('on');
  }
  var info = $('setInfo');
  if (info) {
    info.textContent = 'Монет: ' + (G.save.coins | 0) + ' · Звёзд: ' + G.starsTotal() +
      '/' + (G.TOTAL_LEVELS * 3) + ' · Достижений: ' + G.achCount() + '/' + G.ACH.length +
      ' · Запусков: ' + (G.save.runs | 0);
  }
  money();
}

/* ---------- страховка при старте ---------- */
function hideAllAtStart() {
  var i;
  for (i = 0; i < SCREENS.length; i++) hide($(SCREENS[i]));
  for (i = 0; i < OVERS.length; i++) hide($(OVERS[i]));
  hide($('hud'));
}
hideAllAtStart();

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
  renderSettings: renderSettings,
  hideAllAtStart: hideAllAtStart
};
})();
