/* ============================================================================
   patch.js — финальный слой Angry Birds (v14)
   Подключён ПОСЛЕДНИМ в index.html, поэтому перекрывает все прежние модули.
   Отвечает за: смену хода, камеру (слежение + возврат), тени облаков на земле,
   свет и дымку. Работает поверх любых версий engine/render/controls.
   ========================================================================== */
(function () {
  'use strict';

  var G = window.ABG || window.Game || window.G;
  if (!G) return;

  var P = window.PATCH = {
    ver: 'v14',
    mode: 'home',
    cool: 0,
    hop: 0,
    hopFrom: { x: 0, y: 0 },
    camX: 0,
    note: '',
    clouds: []
  };

  function fin(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function arr(a, b) { return (a && a.length !== undefined) ? a : (b || []); }

  function queue()  { return arr(G.queue, G.birdQueue); }
  function active() { return G.active || G.bird || null; }
  function slingX() { return fin(G.SLING_X, fin(G.R, 200)); }
  function slingY() { return fin(G.SLING_Y, fin(G.GROUND_Y, 600) - 150); }
  function groundY(){ return fin(G.GROUND_Y, fin(G.G, 600)); }
  function viewW()  { return fin(G.viewW, fin(window.innerWidth, 800)); }
  function zoom()   { return fin(G.zoom, fin(window.ABR && ABR.zoom, 1)); }

  function speedOf(b) {
    if (!b) return 0;
    if (typeof b.vx === 'number' && typeof b.vy === 'number') {
      return Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    }
    if (typeof b.sp === 'number') return Math.abs(b.sp);
    if (typeof b.lvx === 'number') return Math.abs(b.lvx);
    return 0;
  }
  function isFlying(b) {
    if (!b) return false;
    if (b.fly || b.launched || b.flying) return true;
    return speedOf(b) > 1.5;
  }

  /* --- камера: пишем во все возможные места, чтобы её читал любой модуль --- */
  function setCam(x) {
    P.camX = x;
    if (G.cam && typeof G.cam === 'object') { G.cam.x = x; G.cam.t = x; }
    if (window.ABR) {
      ABR.camX = x; ABR.camT = x;
    }
    G.camX = x; G.camT = x;
  }

  function homeX() {
    // рогатка слева, постройка справа — целиться можно сразу
    return slingX() - viewW() * 0.26;
  }

  function placeOnSling(b) {
    P.hopFrom.x = b.x; P.hopFrom.y = b.y;
    b.x = slingX();
    b.y = slingY() - 14;
    b.fly = false; b.launched = false; b.flying = false;
    if (typeof b.vx === 'number') { b.vx = 0; b.vy = 0; }
    P.hop = 0;
  }

  P.update = function (dt) {
    dt = Math.min(0.05, fin(dt, 0.016));

    var a = active();
    var q = queue();
    var flying = isFlying(a);

    /* --- ход: новая птица встаёт сама, без участия других модулей --- */
    if (!a && q.length) {
      P.cool -= dt;
      if (P.cool <= 0) {
        var nb = q.shift();
        if (typeof nb === 'string') { nb = { type: nb }; q.__made = true; }
        G.active = nb; G.bird = nb;
        placeOnSling(nb);
        P.note = 'вышла: ' + (nb.type || '?');
      }
    }

    /* --- птица улетела: держим паузу перед следующей --- */
    if (a && flying) { P.fly = true; P.cool = 0.8; }
    if (a && P.fly && !flying) { P.fly = false; P.cool = Math.max(P.cool, 0.5); }

    /* --- прыжок на рогатку --- */
    if (a && P.hop < 1) {
      P.hop = Math.min(1, P.hop + dt * 3.0);
      var t = P.hop;
      a.x = slingX() + (P.hopFrom.x - slingX()) * (1 - t);
      a.y = slingY() + (P.hopFrom.y - slingY()) * (1 - t) - Math.sin(t * Math.PI) * 88;
      a.sc = 1 + Math.sin(t * Math.PI) * 0.13;
    }

    /* --- камера: режим считается заново каждый кадр, сбить его нельзя --- */
    var wantFollow = a && isFlying(a);
    P.mode = wantFollow ? 'follow' : 'home';
    var target = wantFollow ? a.x - viewW() * 0.42 : homeX();
    var cx = fin(P.camX, target);
    cx += (target - cx) * Math.min(1, dt * (wantFollow ? 6.0 : 3.0));
    setCam(cx);

    /* --- облака: свой список, если ядро не отдаёт --- */
    var src = arr(G.clouds, G.cloud);
    if (src.length) {
      P.clouds = src;
    } else if (!P.clouds.length) {
      for (var i = 0; i < 9; i++) {
        P.clouds.push({
          x: -300 + i * 420,
          y: 40 + (i % 3) * 62,
          w: 150 + (i % 4) * 46,
          vx: 6 + (i % 3) * 4,
          tone: i % 5 === 0 ? 2 : (i % 3 === 0 ? 1 : 0)
        });
      }
    }
    for (var k = 0; k < P.clouds.length; k++) {
      var o = P.clouds[k];
      o.x += fin(o.vx, 8) * dt;
      if (o.x > 2600) o.x = -420;
    }
  };

  /* ---------------- тени облаков НА ЗЕМЛЕ ---------------- */
  function drawCloudShadows(ctx) {
    if (!ctx) return;
    var gy = groundY();
    var z = zoom();
    var o2s = function (wx) { return (wx - fin(P.camX, 0)) * z; };

    ctx.save();
    ctx.globalCompositeOperation = 'multiply';

    for (var i = 0; i < P.clouds.length; i++) {
      var o = P.clouds[i];
      // тень на земле: смещена по солнцу, а не под облаком
      var cx = o2s(o.x + o.w * 0.55 + o.y * 0.9);
      var cy = gy * z + 18 * z;
      var rx = o.w * 1.15 * z;
      var ry = (18 + o.w * 0.10) * z;
      if (rx < 6) continue;

      var tone = o.tone === 2 ? 0.34 : o.tone === 1 ? 0.22 : 0.13;
      var fade = 1 - Math.max(0, Math.min(1, (o.y - 30) / 520));
      var al = tone * fade * fin(G.ambient, 1);
      if (al <= 0.01) continue;

      var g = ctx.createRadialGradient(cx, cy, ry * 0.15, cx, cy, rx);
      g.addColorStop(0, 'rgba(28,38,58,' + al.toFixed(3) + ')');
      g.addColorStop(0.6, 'rgba(28,38,58,' + (al * 0.45).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(28,38,58,0)');

      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /* ---------------- пульс-подсказка у рогатки ---------------- */
  function drawHint(ctx, t) {
    if (!ctx || active() === null || queue().length === 0) return;
    var z = zoom();
    var cx = (slingX() - fin(P.camX, 0)) * z;
    var cy = (slingY() - fin(P.camX, 0) * 0) * z - 40 * z;
    var pulse = 0.5 + 0.5 * Math.sin(t * 3.0);
    ctx.save();
    ctx.globalAlpha = 0.18 + pulse * 0.22;
    ctx.strokeStyle = '#ffe27a';
    ctx.lineWidth = 3 * z;
    ctx.beginPath();
    ctx.arc(cx, cy, (34 + pulse * 10) * z, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  /* ---------------- виньетка и дымка горизонта ---------------- */
  function drawAtmo(ctx) {
    if (!ctx) return;
    var w = fin(ctx.canvas && ctx.canvas.width, viewW());
    var h = fin(ctx.canvas && ctx.canvas.height, 600);
    var amb = fin(G.ambient, 1);

    var g = ctx.createRadialGradient(w * 0.5, h * 0.48, Math.min(w, h) * 0.42,
                                     w * 0.5, h * 0.48, Math.max(w, h) * 0.78);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(3,7,16,' + (0.28 + (1 - amb) * 0.22).toFixed(3) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    var hz = ctx.createLinearGradient(0, groundY() * zoom() - 90, 0, groundY() * zoom() + 20);
    hz.addColorStop(0, 'rgba(255,238,196,0)');
    hz.addColorStop(1, 'rgba(255,238,196,' + (0.16 * amb).toFixed(3) + ')');
    ctx.fillStyle = hz;
    ctx.fillRect(0, groundY() * zoom() - 90, w, 110);
  }

  /* ---------------- встраиваемся в отрисовку ---------------- */
  function findCtx() {
    if (window.ABR && ABR.ctx) return ABR.ctx;
    var c = document.getElementById('cv');
    return c && c.getContext ? c.getContext('2d') : null;
  }

  if (window.ABR && typeof ABR.draw === 'function') {
    var _draw = ABR.draw;
    ABR.draw = function () {
      var r = _draw.apply(this, arguments);
      var ctx = findCtx();
      try { drawCloudShadows(ctx); } catch (e) {}
      try { drawHint(ctx, P.t); } catch (e) {}
      try { drawAtmo(ctx); } catch (e) {}
      return r;
    };
  }
  // старый автоповорот камеры обезврежен
  if (window.ABR) { ABR.follow = function (x) { if (x !== undefined) P.camWant = x; }; }

  /* ---------------- свой независимый цикл ---------------- */
  var last = 0;
  function loop(ts) {
    var t = (ts || 0) / 1000;
    var dt = last ? (t - last) : 0.016;
    last = t;
    P.t += dt;
    try { P.update(dt); } catch (e) { P.note = 'err: ' + (e && e.message ? e.message : e); }
    try {
      var p = G.panel;
      if (p && p.text !== undefined) {
        p.text = 'ход: ' + (active() ? (active().type || 'bird') : '—') +
                 ' · очередь ' + queue().length +
                 ' · простой ' + Math.max(0, P.cool).toFixed(2) +
                 ' · камера ' + P.mode + ' · ' + P.ver;
      }
    } catch (e) {}
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  window.PATCH = P;
})();
