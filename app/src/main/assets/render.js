/* ============================================================
   ANGRY BIRDS — рендер мира. Экспорт: window.ABR
   Рисует состояние движка (window.ABG) на канвасе.
   ============================================================ */
window.ABR = (function () {
'use strict';

var G = window.ABG;
var CIR = 6.2832;

function sky(ctx, w, h) {
  var g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#4fb0e5');
  g.addColorStop(0.6, '#a9dcf1');
  g.addColorStop(1, '#e6f5f9');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}

function sun(ctx, w) {
  ctx.fillStyle = 'rgba(255,236,150,.9)';
  ctx.beginPath(); ctx.arc(w * 0.82, 70, 46, 0, CIR); ctx.fill();
  ctx.fillStyle = 'rgba(255,240,180,.35)';
  ctx.beginPath(); ctx.arc(w * 0.82, 70, 70, 0, CIR); ctx.fill();
}

function clouds(ctx, list, camX) {
  ctx.fillStyle = 'rgba(255,255,255,.78)';
  for (var i = 0; i < list.length; i++) {
    var c = list[i], x = c.x - camX * 0.72, y = c.y, r = c.s;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, CIR);
    ctx.arc(x + r * 0.95, y + r * 0.15, r * 0.72, 0, CIR);
    ctx.arc(x - r * 0.95, y + r * 0.2, r * 0.62, 0, CIR);
    ctx.fill();
  }
}

function ground(ctx) {
  var gy = G.GROUND_Y, W = G.WORLD_W, i, x;
  ctx.fillStyle = '#6b4c2a';
  ctx.fillRect(-200, gy, W + 400, 260);
  ctx.fillStyle = '#7ec24f';
  ctx.beginPath();
  ctx.moveTo(-200, gy + 2);
  for (i = 0; i <= 18; i++) {
    x = -200 + i * ((W + 400) / 18);
    ctx.quadraticCurveTo(x + 70, gy - 40 - (i % 3) * 10, x + 140, gy - 8);
  }
  ctx.lineTo(W + 200, gy + 2);
  ctx.lineTo(W + 200, gy + 26);
  ctx.lineTo(-200, gy + 26);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.14)';
  ctx.fillRect(-200, gy + 24, W + 400, 8);
}

function sling(ctx) {
  var x = G.SLING_X, y = G.SLING_Y, gy = G.GROUND_Y;
  ctx.fillStyle = '#7a4b22';
  ctx.fillRect(x - 9, y - 6, 18, gy - y + 6);
  ctx.fillStyle = '#8a5a2b';
  ctx.fillRect(x - 26, y - 26, 12, 40);
  ctx.fillRect(x + 14, y - 26, 12, 40);
  if (G.active && G.active.state === 'ready') {
    ctx.strokeStyle = '#3b2412';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(x - 20, y - 16);
    ctx.lineTo(G.active.x, G.active.y);
    ctx.lineTo(x + 20, y - 16);
    ctx.stroke();
  }
}

function trail(ctx) {
  var a = G.active;
  if (!a) return;
  var vx = (G.SLING_X - a.x) * G.POWER, vy = (G.SLING_Y - a.y) * G.POWER;
  var x = a.x, y = a.y, t = 0.035;
  for (var i = 0; i < 24; i++) {
    x += vx * t; y += vy * t; vy += G.GRAVITY * t;
    if (y > G.GROUND_Y || x > G.WORLD_W) break;
    ctx.fillStyle = 'rgba(255,255,255,' + (0.8 - i * 0.028).toFixed(3) + ')';
    ctx.beginPath(); ctx.arc(x, y, Math.max(3, 9 - i * 0.25), 0, CIR); ctx.fill();
  }
}

function block(ctx, b) {
  if (b.dead) return;
  var m = G.MAT[b.m], x = b.x - b.w / 2, y = b.y - b.h / 2, i;
  ctx.fillStyle = m.edge; ctx.fillRect(x, y, b.w, b.h);
  ctx.fillStyle = m.fill; ctx.fillRect(x + 3, y + 3, b.w - 6, b.h - 6);
  if (b.m === 'wood') {
    ctx.strokeStyle = 'rgba(90,60,20,.45)'; ctx.lineWidth = 3;
    for (i = 1; i < 3; i++) {
      ctx.beginPath();
      if (b.w > b.h) { ctx.moveTo(x + b.w * i / 3, y + 5); ctx.lineTo(x + b.w * i / 3, y + b.h - 5); }
      else { ctx.moveTo(x + 5, y + b.h * i / 3); ctx.lineTo(x + b.w - 5, y + b.h * i / 3); }
      ctx.stroke();
    }
  } else if (b.m === 'ice') {
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + b.w * 0.2, y + b.h * 0.85);
    ctx.lineTo(x + b.w * 0.5, y + b.h * 0.28);
    ctx.lineTo(x + b.w * 0.78, y + b.h * 0.62);
    ctx.stroke();
  }
  if (b.hp < b.max * 0.65) {
    ctx.strokeStyle = 'rgba(25,12,0,.72)'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + b.w * 0.15, y + b.h * 0.18);
    ctx.lineTo(x + b.w * 0.45, y + b.h * 0.58);
    ctx.lineTo(x + b.w * 0.3, y + b.h * 0.9);
    if (b.hp < b.max * 0.35) {
      ctx.moveTo(x + b.w * 0.62, y + b.h * 0.14);
      ctx.lineTo(x + b.w * 0.82, y + b.h * 0.55);
    }
    ctx.stroke();
  }
}

function pig(ctx, p) {
  if (p.dead) return;
  var r = p.r;
  ctx.fillStyle = '#8ed14b';
  ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, CIR); ctx.fill();
  ctx.strokeStyle = '#5f8f2c'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#a8e063';
  ctx.beginPath(); ctx.arc(p.x - r * 0.3, p.y - r * 0.34, r * 0.3, 0, CIR); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(p.x - r * 0.34, p.y - r * 0.16, r * 0.22, 0, CIR); ctx.fill();
  ctx.beginPath(); ctx.arc(p.x + r * 0.34, p.y - r * 0.16, r * 0.22, 0, CIR); ctx.fill();
  ctx.fillStyle = '#1b1b1b';
  ctx.beginPath(); ctx.arc(p.x - r * 0.31, p.y - r * 0.16, r * 0.1, 0, CIR); ctx.fill();
  ctx.beginPath(); ctx.arc(p.x + r * 0.31, p.y - r * 0.16, r * 0.1, 0, CIR); ctx.fill();
  ctx.fillStyle = '#6fae2f';
  ctx.beginPath(); ctx.arc(p.x, p.y + r * 0.3, r * 0.28, 0, CIR); ctx.fill();
  ctx.fillStyle = '#3f6b16';
  ctx.beginPath(); ctx.arc(p.x - r * 0.11, p.y + r * 0.3, r * 0.07, 0, CIR); ctx.fill();
  ctx.beginPath(); ctx.arc(p.x + r * 0.11, p.y + r * 0.3, r * 0.07, 0, CIR); ctx.fill();
  if (p.hp < p.max * 0.8) {
    ctx.strokeStyle = 'rgba(185,45,45,.85)'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p.x - r * 0.62, p.y - r * 0.72);
    ctx.lineTo(p.x - r * 0.18, p.y - r * 0.95);
    ctx.stroke();
  }
}

function bird(ctx, b) {
  var r = b.r, col = '#e8453c', dark = '#a8261f', belly = '#ffd9d6';
  if (b.type === 'yellow') { col = '#f5c542'; dark = '#c9962a'; belly = '#fff0c2'; }
  else if (b.type === 'blue') { col = '#4aa8e8'; dark = '#2a6fa8'; belly = '#d6ecff'; }
  else if (b.type === 'black') { col = '#3a3a44'; dark = '#20202a'; belly = '#5a5a68'; }
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, CIR); ctx.fill();
  ctx.strokeStyle = dark; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = belly;
  ctx.beginPath(); ctx.arc(b.x, b.y + r * 0.38, r * 0.5, 0, CIR); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(b.x - r * 0.3, b.y - r * 0.28, r * 0.29, 0, CIR); ctx.fill();
  ctx.beginPath(); ctx.arc(b.x + r * 0.3, b.y - r * 0.28, r * 0.29, 0, CIR); ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.arc(b.x - r * 0.26, b.y - r * 0.26, r * 0.13, 0, CIR); ctx.fill();
  ctx.beginPath(); ctx.arc(b.x + r * 0.26, b.y - r * 0.26, r * 0.13, 0, CIR); ctx.fill();
  ctx.strokeStyle = dark; ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(b.x - r * 0.66, b.y - r * 0.72); ctx.lineTo(b.x - r * 0.05, b.y - r * 0.44);
  ctx.moveTo(b.x + r * 0.66, b.y - r * 0.72); ctx.lineTo(b.x + r * 0.05, b.y - r * 0.44);
  ctx.stroke();
  ctx.fillStyle = '#f2a93b';
  ctx.beginPath();
  ctx.moveTo(b.x, b.y + r * 0.02);
  ctx.lineTo(b.x + r * 0.66, b.y + r * 0.2);
  ctx.lineTo(b.x, b.y + r * 0.44);
  ctx.closePath(); ctx.fill();
}

function particles(ctx) {
  var i, p;
  for (i = 0; i < G.parts.length; i++) {
    p = G.parts[i];
    ctx.fillStyle = p.c;
    ctx.fillRect(p.x, p.y, p.s, p.s);
  }
}

function pops(ctx) {
  var i, p;
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  for (i = 0; i < G.pops.length; i++) {
    p = G.pops[i];
    ctx.globalAlpha = Math.max(0, Math.min(1, p.t));
    ctx.font = '900 40px sans-serif';
    var y = p.y - (1 - p.t) * 90;
    ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,.55)';
    ctx.strokeText(p.txt, p.x, y);
    ctx.fillStyle = '#fff9d6';
    ctx.fillText(p.txt, p.x, y);
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'left';
}

/* opts: {dpr, w, h, camX, scale, clouds, drag} */
function draw(ctx, o) {
  var i;
  ctx.setTransform(o.dpr, 0, 0, o.dpr, 0, 0);
  sky(ctx, o.w, o.h);
  sun(ctx, o.w);
  clouds(ctx, o.clouds, o.camX);

  ctx.setTransform(o.dpr * o.scale, 0, 0, o.dpr * o.scale, -o.camX * o.scale * o.dpr, 0);
  ground(ctx);
  for (i = 0; i < G.blocks.length; i++) block(ctx, G.blocks[i]);
  for (i = 0; i < G.pigs.length; i++) pig(ctx, G.pigs[i]);
  sling(ctx);
  if (G.active && G.active.state === 'ready') bird(ctx, G.active);
  if (G.flying && G.flying.state === 'fly') bird(ctx, G.flying);
  for (i = 0; i < G.extraFlyers.length; i++) bird(ctx, G.extraFlyers[i]);
  if (o.drag && G.active && G.active.state === 'ready') trail(ctx);
  particles(ctx);
  pops(ctx);

  ctx.setTransform(o.dpr, 0, 0, o.dpr, 0, 0);
}

return { draw: draw, CIR: CIR };
})();
