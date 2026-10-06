/* ============================================================
   ANGRY BIRDS — патч логики и вёрстки
   Подключается последним, переопределяет checkEnd и CSS.
   ============================================================ */
(function () {
'use strict';

var G = window.ABG;
if (!G) { console.error('ABG не загружен — патч не применён'); return; }

/* ---------- 1. Вёрстка под горизонтальный экран ---------- */
(function css() {
  var st = document.createElement('style');
  st.textContent = [
    '.panel{max-width:min(94vw,640px);width:auto;padding:24px 28px;gap:14px;}',
    '.panel > div{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;width:100%;}',
    '.panel .btn{flex:1 1 140px;min-width:0;}',
    '.btn{min-width:min(32vw,180px);padding:12px 18px;font-size:clamp(14px,2.1vh,19px);}',
    '.btn.small{padding:8px 14px;font-size:clamp(12px,1.7vh,16px);}',
    '.title{font-size:clamp(26px,6vh,54px);}',
    '.subtitle{font-size:clamp(11px,1.8vh,15px);letter-spacing:.18em;}',
    '.stars{font-size:clamp(24px,5.6vh,44px);height:auto;letter-spacing:.3em;}',
    '.hline{font-size:clamp(13px,2.1vh,19px);gap:14px;flex-wrap:wrap;justify-content:center;}',
    '.screen{gap:clamp(8px,1.5vh,16px);padding:16px 14px;}',
    '.coinbox{font-size:clamp(13px,2vh,18px);padding:6px 14px;}',
    '.card{padding:10px 14px;gap:12px;}',
    '.card .ico{width:46px;height:46px;font-size:22px;}',
    '.card .nm{font-size:clamp(14px,2vh,18px);}',
    '.card .ds{font-size:clamp(11px,1.6vh,14px);}',
    '.rows{max-width:min(78vw,420px);}',
    '.sw{padding:12px 16px;font-size:clamp(14px,2vh,18px);}',
    '.sw .dot{width:48px;height:24px;}',
    '.sw .dot i{width:18px;height:18px;}',
    '.sw.on .dot i{left:26px;}',
    '.grid{grid-template-columns:repeat(10,minmax(0,1fr));gap:6px;max-width:min(92vw,760px);}',
    '.lvl{font-size:clamp(12px,1.9vh,17px);border-radius:9px;}',
    '.lvl .st{font-size:clamp(8px,1.2vh,11px);}',
    '.list{max-height:56vh;gap:8px;max-width:min(92vw,720px);}',
    '.chip{padding:6px 12px;font-size:clamp(12px,1.9vh,17px);}',
    '#btnPause{padding:6px 14px;font-size:clamp(14px,2.1vh,19px);}',
    '.pip{width:26px;height:26px;}',
    '@media (orientation:landscape){.lvl{border-radius:8px;}}'
  ].join('\n');
  document.head.appendChild(st);
})();

/* ---------- 2. Логика конца уровня ---------- */
var inLevel = false;

function pigsAlive() {
  try { return G.alivePigs(); } catch (e) { return 1; }
}
function birdsLeft() {
  var n = (G.birdsLeft ? G.birdsLeft.length : 0);
  if (G.active) n += 1;
  return n;
}

/* Уровень без свиней — это ошибка генерации: добавляем свинью. */
function ensurePig() {
  if (pigsAlive() > 0) return;
  if (!G.pigs) G.pigs = [];
  var x = (G.WORLD_W || 2400) - 420;
  G.pigs.push({
    x: x, y: (G.GROUND_Y || 620) - 32, r: 32,
    vx: 0, vy: 0, hp: 100, max: 100, dead: false, still: 0
  });
  console.log('[fix] на уровне не было свиней — добавлена одна');
}

var origStart = G.startLevel;
G.startLevel = function (n) {
  inLevel = true;
  G.ended = false;
  G.winT = 0;
  G.loseT = 0;
  var res;
  try { res = origStart ? origStart.apply(G, arguments) : null; } catch (e) { console.error(e); }
  G.ended = false;
  G.winT = 0;
  G.loseT = 0;
  ensurePig();
  return res;
};

G.checkEnd = function (dt) {
  // Никаких вердиктов вне активного уровня.
  if (!inLevel) return null;
  if (G.state === 'menu') { inLevel = false; return null; }
  if (G.state !== 'play') return null;

  // 1) Все свиньи уничтожены — ПОБЕДА.
  if (pigsAlive() === 0) {
    G.winT = (G.winT || 0) + dt;
    if (G.winT >= 0.45) { inLevel = false; return 'win'; }
    return null;
  }
  G.winT = 0;

  // 2) Птицы ещё есть (на рогатке, в полёте или в очереди) — ждём.
  if (G.flying || birdsLeft() > 0) { G.loseT = 0; return null; }

  // 3) Птицы кончились, а свиньи живы — ПОРАЖЕНИЕ.
  G.loseT = (G.loseT || 0) + dt;
  if (G.loseT >= 0.9) { inLevel = false; return 'lose'; }
  return null;
};

/* Сброс при выходе в меню, если UI выставляет state напрямую. */
var origMenu = G.goMenu;
if (typeof origMenu === 'function') {
  G.goMenu = function () {
    inLevel = false;
    return origMenu.apply(G, arguments);
  };
}

window.ABFIX = { inLevel: function () { return inLevel; }, ensurePig: ensurePig };
console.log('[fix] патч логики загружен');
})();
