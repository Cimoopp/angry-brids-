'use strict';
/* Angry Birds — часть 2: ввод, кнопки, запуск.
   Подключается после game.js. */

let pointerId = null;

/* ===================== координаты ===================== */
function pos(e) {
  const r = cv.getBoundingClientRect();
  const k = 1 / SCALE;
  return { x: (e.clientX - r.left) * k + cam.x, y: (e.clientY - r.top) * k + camY() };
}

/* ===================== ввод ===================== */
function onDown(e) {
  audio();
  if (state === 'aim' && current) {
    const p = pos(e);
    const s = birdAtSling();
    if (Math.hypot(p.x - s.x, p.y - s.y) < 230) {
      pointerId = e.pointerId;
      drag = { x: p.x, y: p.y };
    }
  } else if (state === 'fly') {
    useAbility();
  }
}
function onMove(e) {
  if (drag === null || e.pointerId !== pointerId) return;
  const p = pos(e);
  const s = birdAtSling();
  let dx = p.x - s.x, dy = p.y - s.y;
  const d = Math.hypot(dx, dy), max = 150;
  if (d > max) { dx = dx / d * max; dy = dy / d * max; }
  drag.x = s.x + dx; drag.y = s.y + dy;
}
function onUp(e) {
  if (drag === null || e.pointerId !== pointerId) return;
  const s = birdAtSling();
  const dx = s.x - drag.x, dy = s.y - drag.y;
  const d = Math.hypot(dx, dy);
  drag = null; pointerId = null;
  if (d < 18) return;
  shoot(dx, dy);
}

/* ===================== экраны и пауза ===================== */
function goMenu() { showScreen('#menu'); updateCoins(); }
function togglePause() {
  if (state === 'aim' || state === 'fly') {
    $('#ovPause').classList.remove('hidden');
    state = 'pause';
    stopMusic();
  } else if (state === 'pause') {
    $('#ovPause').classList.add('hidden');
    state = current ? 'aim' : 'fly';
    startMusic();
  }
}

/* ===================== кнопки ===================== */
function bind() {
  const click = (id, fn) => { const e = $(id); if (e) e.addEventListener('click', fn); };

  click('#btnPlay', () => { sfx.tap(); showScreen('#levels'); });
  click('#btnShop', () => { sfx.tap(); showScreen('#shop'); });
  click('#btnAch', () => { sfx.tap(); showScreen('#ach'); });
  click('#btnSettings', () => { sfx.tap(); showScreen('#settings'); });

  click('#btnLevelsBack', goMenu);
  click('#btnShopBack', goMenu);
  click('#btnAchBack', goMenu);
  click('#btnSettingsBack', goMenu);

  click('#swSound', () => {
    save.settings.sound = !save.settings.sound; persist(); renderSettings();
    if (save.settings.sound) sfx.tap();
  });
  click('#swMusic', () => {
    save.settings.music = !save.settings.music; persist(); renderSettings();
    if (save.settings.music) startMusic(); else stopMusic();
  });
  click('#swVibe', () => {
    save.settings.vibe = !save.settings.vibe; persist(); renderSettings(); vib(30);
  });
  click('#btnReset', () => {
    save = defaultSave(); persist(); renderSettings(); updateCoins();
    tone(300, 0.3, 'sawtooth', 0.12);
  });

  click('#btnPause', togglePause);
  click('#btnResume', togglePause);
  click('#btnRestart', () => { hideOverlays(); startLevel(level); });
  click('#btnQuitP', goMenu);

  click('#btnNext', () => { hideOverlays(); startLevel(Math.min(50, level + 1)); });
  click('#btnReplay', () => { hideOverlays(); startLevel(level); });
  click('#btnQuitW', goMenu);

  click('#btnRetry', () => { hideOverlays(); startLevel(level); });
  click('#btnQuitL', goMenu);
}

/* ===================== системные кнопки Android ===================== */
window.onAndroidBack = function () {
  if (state === 'pause') { togglePause(); return; }
  if (state === 'aim' || state === 'fly') { togglePause(); return; }
  if (state === 'end') { goMenu(); return; }
  if (!$('#menu').classList.contains('hidden')) return;
  goMenu();
};
window.onAndroidPause = function () {
  if (state === 'aim' || state === 'fly') togglePause();
  stopMusic();
};

/* ===================== запуск ===================== */
function init() {
  cv = $('#cv');
  if (!cv) return;
  ctx = cv.getContext('2d');
  resize();

  clouds = [];
  for (let i = 0; i < 12; i++) {
    clouds.push({ x: Math.random() * 2600, y: 60 + Math.random() * 190, r: 32 + Math.random() * 44 });
  }

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 150));

  cv.addEventListener('pointerdown', onDown);
  cv.addEventListener('pointermove', onMove);
  cv.addEventListener('pointerup', onUp);
  cv.addEventListener('pointercancel', onUp);
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('touchstart', e => e.preventDefault(), { passive: false });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (state === 'aim' || state === 'fly') togglePause();
      stopMusic();
    }
  });

  bind();
  showScreen('#menu');
  requestAnimationFrame(frame);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
