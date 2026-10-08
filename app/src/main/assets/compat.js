/* ============================================================
   ANGRY BIRDS — слой совместимости.
   Чинит расхождения имён полей между engine2.js и render.js,
   не даёт одной ошибке отрисовки убить весь кадр и показывает
   настоящий текст ошибки вместо «Script error.».
   Подключается последним, перед boot.js.
   ============================================================ */
(function () {
'use strict';

var G = window.ABG, R = window.ABR;
if (!G) { console.error('ABG не загружен'); return; }

/* ---------- 1. Материалы: достраиваем недостающие поля ---------- */
var MAT = G.MAT || (G.MAT = {});
Object.keys(MAT).forEach(function (k) {
  var m = MAT[k];
  if (!m) return;
  if (m.fill === undefined) m.fill = m.color || m.c || '#c98b3d';
  if (m.edge === undefined) m.edge = m.stroke || m.line || '#8a5a22';
  if (m.hp === undefined)   m.hp   = m.health || 70;
  if (m.dens === undefined) m.dens = m.density || 1;
  if (m.sound === undefined) m.sound = k;
});
if (!MAT.wood) MAT.wood = { fill: '#c98b3d', edge: '#8a5a22', hp: 70, dens: 1, sound: 'wood' };

function matOf(b) {
  var key = b.mat || b.m || b.kind || b.material || b.type || 'wood';
  return MAT[key] || MAT.wood;
}
G.matOf = matOf;

/* ---------- 2. Имена полей у тел ---------- */
function normBlock(b) {
  if (!b) return b;
  if (!b.mat) b.mat = b.m || b.kind || b.material || 'wood';
  if (!b.m)   b.m   = b.mat;
  var mm = matOf(b);
  if (b.w === undefined) b.w = b.width || (b.hw ? b.hw * 2 : 44);
  if (b.h === undefined) b.h = b.height || (b.hh ? b.hh * 2 : 44);
  b.width = b.w; b.height = b.h;
  b.hw = b.w / 2; b.hh = b.h / 2;
  if (b.hp === undefined) b.hp = mm.hp;
  if (b.max === undefined) b.max = b.maxHp || b.hpMax || b.hp;
  b.maxHp = b.max;
  if (b.static === undefined) b.static = !!b.fixed;
  if (b.dead === undefined) b.dead = false;
  if (b.rot === undefined) b.rot = b.angle || 0;
  if (b.vx === undefined) b.vx = 0;
  if (b.vy === undefined) b.vy = 0;
  if (b.slp === undefined) b.slp = 0;
  return b;
}

function normPig(p) {
  if (!p) return p;
  if (p.r === undefined) p.r = p.radius || 22;
  p.radius = p.r;
  if (p.hp === undefined) p.hp = 100;
  if (p.max === undefined) p.max = p.maxHp || p.hpMax || p.hp;
  p.maxHp = p.max;
  if (p.dead === undefined) p.dead = false;
  if (p.still === undefined) p.still = 0;
  if (p.vx === undefined) p.vx = 0;
  if (p.vy === undefined) p.vy = 0;
  return p;
}

function normBird(b) {
  if (!b) return b;
  if (b.r === undefined) b.r = b.radius || 22;
  b.radius = b.r;
  if (b.type === undefined) b.type = b.kind || 'red';
  if (b.used === undefined) b.used = false;
  if (b.state === undefined) b.state = 'idle';
  if (b.vx === undefined) b.vx = 0;
  if (b.vy === undefined) b.vy = 0;
  return b;
}

G.normLevel = function () {
  var i;
  var bl = G.blocks || [], pg = G.pigs || [], br = G.birdsLeft || [];
  for (i = 0; i < bl.length; i++) normBlock(bl[i]);
  for (i = 0; i < pg.length; i++) normPig(pg[i]);
  for (i = 0; i < br.length; i++) normBird(br[i]);
  if (G.active) normBird(G.active);
  if (G.flying) normBird(G.flying);
  for (i = 0; i < (G.extraFlyers || []).length; i++) normBird(G.extraFlyers[i]);
};

/* ---------- 3. Уровень нормализуем сразу после постройки ---------- */
if (typeof G.startLevel === 'function') {
  var realStart = G.startLevel;
  G.startLevel = function (n) {
    var r = realStart.call(G, n);
    try { G.normLevel(); } catch (e) { report('normLevel', e); }
    return r;
  };
}
if (typeof G.nextBird === 'function') {
  var realNext = G.nextBird;
  G.nextBird = function () {
    var r = realNext.call(G);
    try { G.normLevel(); } catch (e) { report('normLevel', e); }
    return r;
  };
}

/* ---------- 4. Полоса ошибок ---------- */
var bar = null;
function report(where, e) {
  var msg = (e && (e.message || e.reason || e)) || 'неизвестная ошибка';
  var line = (e && (e.lineno || e.lineNumber)) || 0;
  var txt = 'Ошибка [' + where + ']: ' + msg + (line ? ' — строка ' + line : '');
  if (!bar) {
    bar = document.getElementById('errbar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'errbar';
      bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9999;' +
        'background:#8b1d1d;color:#fff;font:12px/1.35 monospace;padding:8px 10px;' +
        'max-height:26%;overflow:auto;white-space:pre-wrap';
      document.body.appendChild(bar);
    }
  }
  bar.textContent = txt;
  bar.style.display = 'block';
  console.error(txt, e);
}
window.ABERR = report;

window.addEventListener('error', function (e) {
  report('window', e.error || e.message);
});

/* ---------- 5. Отрисовку и физику оборачиваем: одна ошибка не убивает кадр ---------- */
if (R && typeof R.draw === 'function') {
  var realDraw = R.draw;
  var shown = false;
  R.draw = function () {
    try {
      realDraw.call(R);
      if (shown && bar) { bar.style.display = 'none'; shown = false; }
    } catch (e) {
      if (!shown) { report('render', e); shown = true; }
    }
  };
}
if (G && typeof G.physics === 'function') {
  var realPhys = G.physics;
  var shownP = false;
  G.physics = function (dt) {
    try { return realPhys.call(G, dt); }
    catch (e) { if (!shownP) { report('physics', e); shownP = true; } return null; }
  };
}

})();
