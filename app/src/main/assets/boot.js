/* Точка входа: запускает движок после загрузки страницы. */
(function () {
  'use strict';

  function showError(msg) {
    var el = document.createElement('pre');
    el.style.cssText = 'position:fixed;left:10px;right:10px;top:10px;z-index:999;' +
      'color:#ff9090;font:12px monospace;white-space:pre-wrap;background:rgba(0,0,0,.7);padding:8px;border-radius:8px';
    el.textContent = msg;
    document.body.appendChild(el);
  }

  function boot() {
    try {
      if (window.AB && typeof window.AB.start === 'function') {
        window.AB.start();
      } else {
        showError('Движок не загрузился: game.js не выполнился.');
      }
    } catch (e) {
      showError('Ошибка запуска: ' + (e && e.message ? e.message : e));
    }
  }

  /* Android сворачивает приложение — ставим игру на паузу */
  window.onAndroidPause = function () {
    try {
      if (window.AB && typeof window.AB.state === 'function' && window.AB.state() === 'play') {
        var b = document.getElementById('btnPause');
        if (b) b.click();
      }
    } catch (e) {}
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
