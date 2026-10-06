/* ============================================================
   ANGRY BIRDS — страховочные исправления (fix.js)
   Загружается ПОСЛЕДНИМ, поверх всех модулей.
   Гарантирует: скрытие экранов не зависит от CSS,
   панель исхода не вылезает до старта уровня,
   уровень не бывает пустым.
   ============================================================ */
(function () {
'use strict';

function $(id) { return document.getElementById(id); }

function hide(el) {
  if (!el) return;
  el.classList.add('hidden');
  el.style.display = 'none';
  el.style.visibility = 'hidden';
  el.style.pointerEvents = 'none';
}

function showEl(el) {
  if (!el) return;
  el.classList.remove('hidden');
  el.style.display = '';        // вернуть значение из CSS
  el.style.visibility = '';
  el.style.pointerEvents = '';
}

var SCREENS = ['menu', 'levels', 'shop', 'ach', 'settings'];
var OVERLAYS = ['ovPause', 'ovWin', 'ovLose'];

/* ---------- 1. Приводим страницу в порядок на старте ---------- */
function hideEveryOverlay() {
  var i;
  for (i = 0; i < OVERLAYS.length; i++) hide($(OVERLAYS[i]));
}

function showMenuOnly() {
  var i;
  hideEveryOverlay();
  hide($('hud'));
  for (i = 0; i < SCREENS.length; i++) {
    if (SCREENS[i] === 'menu') showEl($('menu'));
    else hide($(SCREENS[i]));
  }
}

/* ---------- 2. Сторож: гасит панель, если она вылезла не вовремя ---------- */
var G = window.ABG;
var openedByGame = false;   // true, только когда панель показал сам игровой цикл

setInterval(function () {
  if (!G) return;
  var menuVisible = $('menu') && $('menu').style.display !== 'none';
  if (G.state === 'menu' && menuVisible) {
    if (!openedByGame) hideEveryOverlay();
  }
  // В меню кнопка паузы и счётчик птиц не нужны
  if (G.state === 'menu') hide($('hud'));
}, 250);

/* ---------- 3. Патч checkEnd: не судить до начала уровня ---------- */
if (G && typeof G.checkEnd === 'function') {
  var origCheckEnd = G.checkEnd;

  G.checkEnd = function (dt) {
    // уровень не запущен — исхода нет
    if (G.state !== 'play') return null;
    if (G.levelStarted !== true) return null;

    var pigs = G.pigs || [];
    if (!pigs.length) return null;              // пустой уровень — не судим

    var alive = 0, i;
    for (i = 0; i < pigs.length; i++) if (!pigs[i].dead) alive++;
    if (alive === 0) {
      G.winT = (G.winT || 0) + dt;
      if (G.winT > 0.45) { G.winT = 0; return 'win'; }
      return null;
    }
    G.winT = 0;

    var birdsLeft = (G.active ? 1 : 0)
                  + (G.flying ? 1 : 0)
                  + ((G.birdsLeft && G.birdsLeft.length) || 0);
    if (birdsLeft > 0) return null;

    G.loseT = (G.loseT || 0) + dt;
    if (G.loseT > 0.9) { G.loseT = 0; return 'lose'; }
    return null;
  };
}

/* ---------- 4. Патч startLevel: сброс флагов и непустой уровень ---------- */
if (G && typeof G.startLevel === 'function') {
  var origStartLevel = G.startLevel;

  G.startLevel = function (n) {
    G.winT = 0;
    G.loseT = 0;
    G.ended = false;
    G.combo = 0;

    var res = origStartLevel.call(G, n);

    G.winT = 0;
    G.loseT = 0;
    G.ended = false;
    G.levelStarted = true;

    // Страховка: на уровне обязана быть хотя бы одна свинья
    if (!G.pigs || !G.pigs.length) {
      if (typeof G.makePig === 'function') {
        G.pigs = G.pigs || [];
        G.pigs.push(G.makePig(G.SLING_X + 620, G.GROUND_Y - 40, 40));
      }
    }
    // Страховка: и хотя бы одна птица
    if ((!G.birdsLeft || !G.birdsLeft.length) && !G.active) {
      G.birdsLeft = G.birdsLeft || [];
      G.birdsLeft.push('red');
    }
    return res;
  };
}

/* ---------- 5. Патч выхода панели, чтобы сторож знал о ней ---------- */
function wrapOverlayOpen(id) {
  var el = $(id);
  if (!el) return;
  // Помечаем момент, когда панель открывается по-настоящему:
  // следим за классом hidden и снимаем блокировку сторожа
  var obs = new MutationObserver(function () {
    if (!el.classList.contains('hidden') && el.style.display !== 'none') {
      openedByGame = true;
    }
  });
  obs.observe(el, { attributes: true, attributeFilter: ['class', 'style'] });
}
wrapOverlayOpen('ovWin');
wrapOverlayOpen('ovLose');
wrapOverlayOpen('ovPause');

/* ---------- 6. Возврат в меню и кнопка «назад» ---------- */
var UI = window.ABUI;
if (!UI) {
  window.ABUI = UI = {};
}
if (!UI.showMainMenu) {
  UI.showMainMenu = function () {
    var i;
    for (i = 0; i < SCREENS.length; i++) {
      if (SCREENS[i] === 'menu') showEl($('menu'));
      else hide($(SCREENS[i]));
    }
    hideEveryOverlay();
    hide($('hud'));
    if (G) G.state = 'menu';
  };
}

/* ---------- 7. Ограничиваем ширину панелей, чтобы рамки влезали ---------- */
function fitPanels() {
  var panels = document.querySelectorAll('.panel');
  var limit = Math.min(window.innerWidth * 0.92, 620);
  for (var i = 0; i < panels.length; i++) {
    panels[i].style.maxWidth = limit + 'px';
    panels[i].style.boxSizing = 'border-box';
    panels[i].style.overflow = 'hidden';
    var row = panels[i].querySelector('div[style*="display:flex"]');
    if (row) {
      row.style.display = 'flex';
      row.style.flexWrap = 'wrap';
      row.style.justifyContent = 'center';
      row.style.width = '100%';
      row.style.gap = '2vw';
    }
    var btns = panels[i].querySelectorAll('.btn');
    for (var k = 0; k < btns.length; k++) {
      btns[k].style.boxSizing = 'border-box';
      btns[k].style.maxWidth = '100%';
    }
  }
  document.documentElement.style.overflowX = 'hidden';
  document.body.style.overflowX = 'hidden';
}
window.addEventListener('resize', fitPanels);
window.addEventListener('orientationchange', function () { setTimeout(fitPanels, 120); });

/* ---------- 8. Старт ---------- */
function boot() {
  hideEveryOverlay();
  fitPanels();
  if (G && (G.state === undefined || G.state === 'play' || G.state === null)) {
    // Игра не должна считать себя в бою до нажатия «Играть»
    G.state = 'menu';
    G.levelStarted = false;
  }
  if (G) G.levelStarted = false;
  showMenuOnly();
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(boot, 30);
} else {
  window.addEventListener('load', function () { setTimeout(boot, 30); });
}
setTimeout(boot, 400);

/* Скрываем панели сразу, ещё до полной загрузки */
hideEveryOverlay();
for (var si = 0; si < SCREENS.length; si++) {
  if (SCREENS[si] !== 'menu') hide($(SCREENS[si]));
}
hide($('hud'));

})();
