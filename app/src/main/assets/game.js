(function () {
'use strict';

/* ===================== утилиты ===================== */
const $ = s => document.querySelector(s);
const clamp = (v, a, b) => (v < a ? a : (v > b ? b : v));
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* ===================== сохранение ===================== */
const SAVE_KEY = 'angry_birds_save_v1';
function defaultSave() {
  return {
    coins: 120, unlocked: 1, stars: {},
    items: { blue: 0, black: 0, gold: 0, power: 0, rich: 0 },
    ach: {}, settings: { sound: true, music: true, vibe: true },
    stats: { shots: 0, kills: 0, levels: 0, three: 0, starsTotal: 0, blocks: 0, perfect: 0, bestCombo: 0, purchases: 0 }
  };
}
function loadSave() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') || {}; } catch (e) { s = {}; }
  const d = defaultSave();
  const o = Object.assign({}, d, s);
  o.items = Object.assign({}, d.items, s.items || {});
  o.settings = Object.assign({}, d.settings, s.settings || {});
  o.stats = Object.assign({}, d.stats, s.stats || {});
  o.stars = s.stars || {};
  o.ach = s.ach || {};
  return o;
}
let save = loadSave();
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { } }
function totalStars() { let t = 0; for (const k in save.stars) t += save.stars[k] | 0; return t; }
function achDone() { let t = 0; for (const k in save.ach) if (save.ach[k]) t++; return t; }

/* ===================== звук ===================== */
let actx = null;
function audio() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; } }
  if (actx && actx.state === 'suspended') { try { actx.resume(); } catch (e) { } }
  return actx;
}
function tone(freq, dur, type, vol, slide) {
  if (!save.settings.sound) return;
  const a = audio(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(freq, a.currentTime);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), a.currentTime + dur);
  g.gain.setValueAtTime(0.0001, a.currentTime);
  g.gain.exponentialRampToValueAtTime(vol || 0.14, a.currentTime + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.connect(g); g.connect(a.destination);
  o.start(); o.stop(a.currentTime + dur + 0.03);
}
function noise(dur, vol) {
  if (!save.settings.sound) return;
  const a = audio(); if (!a) return;
  const n = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = a.createBufferSource(); src.buffer = buf;
  const g = a.createGain(); g.gain.value = vol || 0.18;
  src.connect(g); g.connect(a.destination); src.start();
}
const sfx = {
  shoot: () => tone(520, 0.14, 'triangle', 0.15, 0.5),
  hit: () => { noise(0.08, 0.16); tone(180, 0.08, 'square', 0.07, 0.6); },
  brk: () => noise(0.16, 0.2),
  pig: () => { tone(720, 0.1, 'square', 0.13, 0.45); tone(430, 0.16, 'sawtooth', 0.08, 0.5); },
  boom: () => { noise(0.45, 0.32); tone(90, 0.4, 'sawtooth', 0.18, 0.3); },
  win: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.28, 'triangle', 0.15), i * 110)),
  lose: () => [420, 330, 260].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'sawtooth', 0.13), i * 130)),
  buy: () => [660, 880, 1320].forEach((f, i) => setTimeout(() => tone(f, 0.15, 'square', 0.11), i * 70)),
  tap: () => tone(880, 0.05, 'square', 0.06)
};
function vib(ms) { if (save.settings.vibe && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { } } }

let musicTimer = null, musicStep = 0;
const MUS = [0, 4, 7, 12, 7, 4, 0, -5];
function startMusic() {
  stopMusic();
  if (!save.settings.music) return;
  if (!audio()) return;
  musicTimer = setInterval(() => {
    if (!save.settings.music) return;
    const f = 196 * Math.pow(2, MUS[musicStep % MUS.length] / 12);
    musicStep++;
    tone(f, 0.55, 'sine', 0.035);
    if (musicStep % 4 === 0) tone(f / 2, 0.8, 'triangle', 0.025);
  }, 620);
}
function stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } }

/* ===================== мир и физика ===================== */
const GRAV = 1500, VIEW_H = 800, groundY = 620, WORLD_W = 2100;
const MATS = {
  wood: { base: 100, dens: 0.0014, rest: 0.22, fric: 0.75, c1: '#cf8f42', c2: '#8b5a25', coin: 5 },
  ice: { base: 60, dens: 0.0010, rest: 0.28, fric: 0.60, c1: '#bfeaf7', c2: '#6fb6d8', coin: 7 },
  stone: { base: 175, dens: 0.0024, rest: 0.14, fric: 0.86, c1: '#b8bdc7', c2: '#767d89', coin: 9 }
};
let cv, ctx, DPR = 1, SCALE = 1, viewW = 1400;
let cam = { x: 0 };
let bodies = [], parts = [], flock = [], pigsAlive = 0;
let state = 'menu', level = 1, score = 0, coinsEarned = 0, killsThisLevel = 0, shotsThisLevel = 0;
let comboNow = 0, comboBest = 0, comboWindow = 0, shake = 0, waitT = 0, hudT = 0;
let queue = [], current = null, drag = null;
let clouds = [], idc = 1;

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth, h = window.innerHeight;
  cv.width = Math.floor(w * DPR); cv.height = Math.floor(h * DPR);
  cv.style.width = w + 'px'; cv.style.height = h + 'px';
  SCALE = cv.height / VIEW_H;
  viewW = cv.width / SCALE;
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
}
function camY() { return groundY + 150 - VIEW_H; }
function maxCamX() { return Math.max(0, WORLD_W - viewW); }

function addBody(o) { o.id = idc++; o.dead = false; o.vx = o.vx || 0; o.vy = o.vy || 0; o.hitT = 0; bodies.push(o); return o; }
function matOf(k) { return MATS[k] || MATS.wood; }
function box(x, y, w, h, m) {
  const M = matOf(m);
  const area = w * h;
  const hp = M.base * Math.max(0.55, Math.sqrt(area / 2880));
  return addBody({
    shape: 'box', type: 'box', x: x, y: y, hw: w / 2, hh: h / 2, w: w, h: h,
    mat: m, mass: Math.max(1.5, area * M.dens), hp: hp, maxHp: hp,
    rest: M.rest, fric: M.fric
  });
}
function pig(x, y, r) {
  const hp = r * 2.6;
  return addBody({ shape: 'circle', type: 'pig', x: x, y: y, r: r, mass: r * r * 0.0032, hp: hp, maxHp: hp, rest: 0.34, fric: 0.7 });
}
function mkBird(x, y, kind) {
  return addBody({ shape: 'circle', type: 'bird', x: x, y: y, r: 20, mass: 2.0, hp: 99999, maxHp: 99999, rest: 0.42, fric: 0.8, kind: kind, used: false, born: Date.now(), done: false });
}

function particles(x, y, n, color, spd) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = (spd || 220) * (0.35 + Math.random());
    parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 90, life: 0.6 + Math.random() * 0.5, max: 1.1, c: color, s: 3 + Math.random() * 5 });
  }
}

function killPig(p, byBird) {
  p.dead = true;
  score += 5000;
  coinsEarned += Math.round(25 * (1 + 0.25 * save.items.rich));
  save.stats.kills++;
  killsThisLevel++;
  if (byBird) {
    comboNow++; comboWindow = 1.6;
    if (comboNow > comboBest) comboBest = comboNow;
    if (comboNow >= 2) score += 2000 * comboNow;
  }
  particles(p.x, p.y, 16, '#7cc242', 260);
  sfx.pig(); vib(25); shake = Math.max(shake, 7);
}
function killBox(b) {
  b.dead = true;
  score += 500;
  coinsEarned += Math.round(matOf(b.mat).coin * (1 + 0.25 * save.items.rich));
  save.stats.blocks++;
  particles(b.x, b.y, 10, matOf(b.mat).c1, 200);
  sfx.brk(); shake = Math.max(shake, 4);
}
function damage(t, amount, byBird) {
  if (t.dead || amount <= 0) return;
  t.hp -= amount; t.hitT = 0.14;
  if (t.hp <= 0) { if (t.type === 'pig') killPig(t, byBird); else killBox(t); }
}

function circleBoxHit(c, b) {
  const cx = clamp(c.x, b.x - b.hw, b.x + b.hw);
  const cy = clamp(c.y, b.y - b.hh, b.y + b.hh);
  const dx = c.x - cx, dy = c.y - cy;
  const d = Math.hypot(dx, dy);
  if (d > c.r) return null;
  if (d < 0.0001) {
    const ox = b.hw - Math.abs(c.x - b.x), oy = b.hh - Math.abs(c.y - b.y);
    if (ox < oy) return { nx: (c.x < b.x ? -1 : 1), ny: 0, pen: ox + c.r };
    return { nx: 0, ny: (c.y < b.y ? -1 : 1), pen: oy + c.r };
  }
  return { nx: dx / d, ny: dy / d, pen: c.r - d };
}

function resolve(a, b) {
  let nx = 0, ny = 0, pen = 0;
  const ca = a.shape === 'circle', cb = b.shape === 'circle';
  if (ca && cb) {
    const dx = a.x - b.x, dy = a.y - b.y;
    const d = Math.hypot(dx, dy) || 0.001, rr = a.r + b.r;
    if (d >= rr) return;
    nx = dx / d; ny = dy / d; pen = rr - d;
  } else if (ca && !cb) {
    const h = circleBoxHit(a, b); if (!h) return;
    nx = h.nx; ny = h.ny; pen = h.pen;
  } else if (!ca && cb) {
    const h = circleBoxHit(b, a); if (!h) return;
    nx = -h.nx; ny = -h.ny; pen = h.pen;
  } else {
    const dx = a.x - b.x, px = (a.hw + b.hw) - Math.abs(dx);
    if (px <= 0) return;
    const dy = a.y - b.y, py = (a.hh + b.hh) - Math.abs(dy);
    if (py <= 0) return;
    if (px < py) { nx = dx < 0 ? -1 : 1; ny = 0; pen = px; }
    else { nx = 0; ny = dy < 0 ? -1 : 1; pen = py; }
  }

  const ima = 1 / a.mass, imb = 1 / b.mass, im = ima + imb;
  if (im <= 0) return;

  const rvx = a.vx - b.vx, rvy = a.vy - b.vy;
  const vn = rvx * nx + rvy * ny;
  const rest = Math.min(a.rest || 0.2, b.rest || 0.2);

  if (vn < 0) {
    const j = -(1 + rest) * vn / im;
    a.vx += j * nx * ima; a.vy += j * ny * ima;
    b.vx -= j * nx * imb; b.vy -= j * ny * imb;

    const spd = -vn;
    if (spd > 190) {
      sfx.hit();
      const birdHitA = (a.type === 'bird' && spd > 220), birdHitB = (b.type === 'bird' && spd > 220);
      let dmgA = 0, dmgB = 0;
      if (birdHitB) dmgA = 120;
      else if (birdHitA) dmgB = 120;
      else {
        dmgA = clamp((spd - 380) * 0.06, 0, 60);
        dmgB = clamp((spd - 380) * 0.06, 0, 60);
      }
      damage(a, dmgA, b.type === 'bird');
      damage(b, dmgB, a.type === 'bird');
    }
    if (Math.abs(ny) > 0.6) { a.vx *= 0.86; b.vx *= 0.86; }
  }
  const k = 0.8;
  a.x += nx * pen * (ima / im) * k; a.y += ny * pen * (ima / im) * k;
  b.x -= nx * pen * (imb / im) * k; b.y -= ny * pen * (imb / im) * k;
}

function resolveGround(b) {
  if (b.shape === 'circle') {
    if (b.y + b.r > groundY) {
      b.y = groundY - b.r;
      if (b.vy > 0) {
        const spd = b.vy;
        b.vy = -b.vy * (b.rest || 0.25);
        if (spd > 420 && b.type === 'pig') damage(b, clamp((spd - 380) * 0.11, 0, 90), false);
        if (spd > 150) sfx.hit();
      }
      b.vx *= 0.9;
    }
    if (b.x < 40) { b.x = 40; b.vx = Math.abs(b.vx) * 0.5; }
    if (b.x > WORLD_W - 40) { b.x = WORLD_W - 40; b.vx = -Math.abs(b.vx) * 0.5; }
  } else {
    if (b.y + b.hh > groundY) {
      b.y = groundY - b.hh;
      if (b.vy > 0) {
        const spd = b.vy;
        if (spd > 520) damage(b, clamp((spd - 480) * 0.07, 0, 60), false);
        b.vy = -b.vy * (b.rest || 0.15);
      }
      b.vx *= b.fric || 0.8;
      if (Math.abs(b.vx) < 6) b.vx = 0;
    }
    if (b.x - b.hw < 40) { b.x = 40 + b.hw; b.vx = 0; }
    if (b.x + b.hw > WORLD_W - 40) { b.x = WORLD_W - 40 - b.hw; b.vx = 0; }
  }
}

/* ===================== уровни ===================== */
function matPick(R) {
  const r = R();
  if (level <= 6) return r < 0.8 ? 'wood' : 'ice';
  if (level <= 16) return r < 0.5 ? 'wood' : (r < 0.78 ? 'ice' : 'stone');
  return r < 0.38 ? 'wood' : (r < 0.72 ? 'stone' : 'ice');
}
function buildTower(cx, pigs, R) {
  let placed = 0, y = groundY;
  const floors = clamp(pigs, 1, 4);
  for (let f = 0; f < floors; f++) {
    box(cx - 68, y - 60, 24, 120, matPick(R));
    box(cx + 68, y - 60, 24, 120, matPick(R));
    box(cx, y - 132, 180, 24, matPick(R));
    if (placed < pigs) { pig(cx + (f % 2 ? 32 : -32), y - 28, 26); placed++; }
    y -= 144;
  }
  return placed;
}
function buildHouse(cx, pigs, R) {
  let placed = 0;
  box(cx - 82, groundY - 62, 26, 124, matPick(R));
  box(cx + 82, groundY - 62, 26, 124, matPick(R));
  box(cx, groundY - 140, 220, 26, matPick(R));
  if (placed < pigs) { pig(cx, groundY - 28, 27); placed++; }
  for (let i = 0; placed < pigs && i < 2; i++) {
    const ox = i === 0 ? -175 : 175;
    box(cx + ox, groundY - 62, 26, 124, matPick(R));
    box(cx + ox * 0.52, groundY - 140, 150, 24, matPick(R));
    pig(cx + ox * 0.52, groundY - 28, 25); placed++;
  }
  return placed;
}
function buildPyramid(cx, pigs, R) {
  let placed = 0;
  const rows = [5, 3, 1];
  let y = groundY;
  for (let r = 0; r < rows.length; r++) {
    const n = rows[r];
    for (let i = 0; i < n; i++) box(cx + (i - (n - 1) / 2) * 70, y - 34, 66, 68, matPick(R));
    y -= 68;
  }
  if (placed < pigs) { pig(cx - 215, groundY - 26, 24); placed++; }
  if (placed < pigs) { pig(cx + 215, groundY - 26, 24); placed++; }
  let g = 0;
  while (placed < pigs && g++ < 6) { pig(cx + g * 48 - 120, groundY - 240, 22); placed++; }
  return placed;
}
function buildBridge(cx, pigs, R) {
  let placed = 0;
  box(cx - 190, groundY - 62, 26, 124, matPick(R));
  box(cx + 190, groundY - 62, 26, 124, matPick(R));
  box(cx, groundY - 142, 420, 26, matPick(R));
  if (placed < pigs) { pig(cx, groundY - 28, 27); placed++; }
  if (placed < pigs) { pig(cx, groundY - 172, 25); placed++; }
  let g = 0;
  while (placed < pigs && g++ < 5) { pig(cx - 160 + g * 80, groundY - 28, 24); placed++; }
  return placed;
}
function buildTwin(cx, pigs, R) {
  let placed = 0;
  for (let s = 0; s < 2; s++) {
    const bx = cx + (s === 0 ? -150 : 150);
    for (let f = 0; f < 2; f++) {
      const y = groundY - f * 144;
      box(bx - 56, y - 60, 22, 120, matPick(R));
      box(bx + 56, y - 60, 22, 120, matPick(R));
      box(bx, y - 132, 150, 22, matPick(R));
      if (placed < pigs) { pig(bx, y - 28, 25); placed++; }
    }
  }
  box(cx, groundY - 330, 300, 24, matPick(R));
  return placed;
}
function buildFort(cx, pigs, R) {
  let placed = 0;
  for (let i = 0; i < 4; i++) box(cx - 210 + i * 140, groundY - 60, 30, 120, 'stone');
  box(cx, groundY - 138, 520, 26, 'stone');
  if (placed < pigs) { pig(cx - 90, groundY - 28, 26); placed++; }
  if (placed < pigs) { pig(cx + 90, groundY - 28, 26); placed++; }
  if (placed < pigs) { pig(cx, groundY - 170, 24); placed++; }
  let g = 0;
  while (placed < pigs && g++ < 5) { box(cx - 130 + g * 70, groundY - 300, 24, 90, matPick(R)); placed++; }
  return placed;
}
function buildLevel(n) {
  bodies = []; parts = []; flock = [];
  const R = mulberry32(7919 * n + 17);
  const pigCount = Math.min(7, 1 + Math.floor((n - 1) / 8) + (n > 30 ? 1 : 0));
  const cx = 1050 + Math.floor(R() * 3) * 60;
  let placed = 0;
  switch ((n - 1) % 6) {
    case 0: placed = buildTower(cx, pigCount, R); break;
    case 1: placed = buildHouse(cx, pigCount, R); break;
    case 2: placed = buildPyramid(cx, pigCount, R); break;
    case 3: placed = buildBridge(cx, pigCount, R); break;
    case 4: placed = buildTwin(cx, pigCount, R); break;
    default: placed = buildFort(cx, pigCount, R); break;
  }
  let guard = 0;
  while (placed < pigCount && guard++ < 10) {
    pig(clamp(cx + (R() * 420 - 210), 700, WORLD_W - 160), groundY - 26, 25);
    placed++;
  }
  pigsAlive = pigCount;
}
function makeQueue(n) {
  const q = ['red'];
  if (n >= 2) q.push('yellow');
  if (n >= 4) q.push(save.items.blue ? 'blue' : 'red');
  if (n >= 7 && save.items.black) q.push('black');
  while (q.length < 3) q.push('red');
  if (n >= 10) q.push(save.items.blue ? 'blue' : 'red');
  if (n >= 18) q.push(save.items.black ? 'black' : 'yellow');
  for (let i = 0; i < save.items.gold; i++) q.push('red');
  return q;
}

/* ===================== игра ===================== */
const slingX = 268, slingTopY = groundY - 300;
let powerMul = 1;

function startLevel(n) {
  level = n;
  score = 0; coinsEarned = 0; killsThisLevel = 0; shotsThisLevel = 0;
  comboNow = 0; comboBest = 0; comboWindow = 0; shake = 0; waitT = 0; hudT = 0;
  powerMul = 1 + 0.1 * save.items.power;
  buildLevel(n);
  queue = makeQueue(n);
  cam.x = 0;
  hideAllScreens(); showHud(true); hideOverlays();
  state = 'aim';
  nextBird();
  updateHud();
  startMusic();
}
function nextBird() {
  if (queue.length === 0) { current = null; loseLevel(); return; }
  current = queue.shift();
  drag = null;
  state = 'aim';
  updateHud();
}
function birdAtSling() { return { x: slingX, y: slingTopY + 10 }; }

function shoot(dx, dy) {
  const p = birdAtSling();
  const b = mkBird(p.x, p.y, current);
  b.vx = dx * 8.6 * powerMul;
  b.vy = dy * 8.6 * powerMul;
  flock = [b];
  current = null;
  state = 'fly';
  waitT = 0;
  save.stats.shots++; shotsThisLevel++;
  sfx.shoot(); vib(12);
  updateHud();
}

function useAbility() {
  if (state !== 'fly' || flock.length === 0) return;
  const b = flock.find(x => !x.dead && !x.done && !x.used);
  if (!b) return;
  if (b.kind === 'yellow') {
    b.used = true; b.vx *= 2.1; b.vy *= 1.1;
    particles(b.x, b.y, 8, '#f5c542', 180); sfx.tap(); vib(15);
  } else if (b.kind === 'blue') {
    b.used = true;
    const sp = Math.hypot(b.vx, b.vy) || 400, ang = Math.atan2(b.vy, b.vx);
    for (const off of [-0.26, 0.26]) {
      const nb = mkBird(b.x, b.y, 'blue');
      nb.vx = Math.cos(ang + off) * sp * 0.92;
      nb.vy = Math.sin(ang + off) * sp * 0.92;
      nb.used = true;
      flock.push(nb);
    }
    sfx.tap(); vib(15);
  } else if (b.kind === 'black') {
    b.used = true; b.dead = true;
    explode(b.x, b.y, 165);
    sfx.boom(); vib(70); shake = 16;
  }
}
function explode(x, y, r) {
  particles(x, y, 30, '#ffb02e', 420);
  for (const t of bodies) {
    if (t.dead || t.type === 'bird') continue;
    const d = Math.hypot(t.x - x, t.y - y);
    if (d < r) {
      const f = 1 - d / r;
      const ax = (t.x - x) / (d || 1), ay = (t.y - y) / (d || 1);
      t.vx += ax * 620 * f * (t.type === 'box' ? 0.7 : 1.3);
      t.vy += ay * 620 * f * (t.type === 'box' ? 0.7 : 1.3) - 140 * f;
      damage(t, 40 + 150 * f, false);
    }
  }
}

function winLevel() {
  if (state === 'end') return;
  state = 'end';
  const birdsLeft = queue.length + (current ? 1 : 0);
  score += birdsLeft * 10000;
  const st = score >= 26000 + level * 1800 ? 3 : (score >= 15000 + level * 1200 ? 2 : 1);
  const prev = save.stars[level] || 0;
  if (st > prev) { save.stars[level] = st; save.stats.starsTotal = totalStars(); }
  if (birdsLeft > 0) save.stats.perfect++;
  if (st === 3) save.stats.three++;
  if (level >= save.unlocked) save.unlocked = Math.min(50, level + 1);
  if (level > save.stats.levels) save.stats.levels = level;
  if (comboBest > save.stats.bestCombo) save.stats.bestCombo = comboBest;
  const coins = Math.round((60 + st * 60 + killsThisLevel * 10) * (1 + 0.25 * save.items.rich));
  save.coins += coins + coinsEarned;
  persist(); checkAch();
  $('#winStars').innerHTML = [0, 1, 2].map(i => i < st ? '★' : '<span class="off">☆</span>').join('');
  $('#winScore').textContent = score;
  $('#winCoins').textContent = coins + coinsEarned;
  $('#btnNext').style.display = level < 50 ? '' : 'none';
  $('#ovWin').classList.remove('hidden');
  showHud(false); stopMusic();
  sfx.win(); vib([20, 60, 20]);
}
function loseLevel() {
  if (state === 'end') return;
  state = 'end';
  $('#losePigs').textContent = pigsAlive;
  $('#ovLose').classList.remove('hidden');
  showHud(false); stopMusic();
  sfx.lose(); vib(120);
}

/* ===================== достижения ===================== */
const ACH = [
  { id: 'first', n: 'Первая кровь', d: 'Сбить первую свинью', ic: '🐷', goal: 1, v: s => s.stats.kills },
  { id: 'k50', n: 'Охотник', d: 'Сбить 50 свиней', ic: '🎯', goal: 50, v: s => s.stats.kills },
  { id: 'k250', n: 'Гроза свиней', d: 'Сбить 250 свиней', ic: '💥', goal: 250, v: s => s.stats.kills },
  { id: 'k1000', n: 'Легенда', d: 'Сбить 1000 свиней', ic: '👑', goal: 1000, v: s => s.stats.kills },
  { id: 'l5', n: 'Новичок', d: 'Пройти 5 уровней', ic: '🚩', goal: 5, v: s => s.stats.levels },
  { id: 'l15', n: 'Опытный', d: 'Пройти 15 уровней', ic: '🏅', goal: 15, v: s => s.stats.levels },
  { id: 'l30', n: 'Мастер', d: 'Пройти 30 уровней', ic: '🥈', goal: 30, v: s => s.stats.levels },
  { id: 'l50', n: 'Чемпион', d: 'Пройти все 50 уровней', ic: '🏆', goal: 50, v: s => s.stats.levels },
  { id: 's30', n: 'Собиратель звёзд', d: 'Заработать 30 звёзд', ic: '⭐', goal: 30, v: () => totalStars() },
  { id: 's90', n: 'Звёздный путь', d: 'Заработать 90 звёзд', ic: '🌟', goal: 90, v: () => totalStars() },
  { id: 's150', n: 'Всё сияет', d: 'Собрать все 150 звёзд', ic: '✨', goal: 150, v: () => totalStars() },
  { id: 't3', n: 'Идеально', d: '3 звезды на 10 уровнях', ic: '💎', goal: 10, v: s => s.stats.three },
  { id: 't25', n: 'Безупречно', d: '3 звезды на 25 уровнях', ic: '🔱', goal: 25, v: s => s.stats.three },
  { id: 'brick', n: 'Разрушитель', d: 'Разбить 200 блоков', ic: '🧱', goal: 200, v: s => s.stats.blocks },
  { id: 'demo', n: 'Снос', d: 'Разбить 1000 блоков', ic: '🚜', goal: 1000, v: s => s.stats.blocks },
  { id: 'combo', n: 'Двойной удар', d: 'Две свиньи одним выстрелом', ic: '⚡', goal: 2, v: s => s.stats.bestCombo },
  { id: 'combo4', n: 'Ураган', d: 'Четыре свиньи одним выстрелом', ic: '🌪', goal: 4, v: s => s.stats.bestCombo },
  { id: 'save', n: 'Бережливый', d: 'Пройти 5 уровней с запасом птиц', ic: '🐦', goal: 5, v: s => s.stats.perfect },
  { id: 'rich', n: 'Богач', d: 'Накопить 5000 монет', ic: '🪙', goal: 5000, v: s => s.coins },
  { id: 'shop', n: 'Покупатель', d: 'Сделать 3 покупки', ic: '🛒', goal: 3, v: s => s.stats.purchases }
];
function checkAch() {
  let changed = false;
  for (const a of ACH) {
    if (save.ach[a.id]) continue;
    if (a.v(save) >= a.goal) {
      save.ach[a.id] = true; save.coins += 200; changed = true;
      tone(1046, 0.2, 'triangle', 0.14);
      setTimeout(() => tone(1568, 0.25, 'triangle', 0.12), 120);
    }
  }
  if (changed) persist();
  if (!$('#ach').classList.contains('hidden')) renderAch();
}

/* ===================== магазин ===================== */
const SHOP = [
  { id: 'blue', n: 'Синяя птица', d: 'Раскол на три в полёте — тап по экрану', ic: '🐦', max: 1, cost: () => 800 },
  { id: 'black', n: 'Чёрная бомба', d: 'Взрыв по тапу в полёте', ic: '💣', max: 1, cost: () => 1600 },
  { id: 'gold', n: 'Золотая птица', d: 'Дополнительная птица на каждом уровне', ic: '⭐', max: 3, cost: l => [700, 1800, 3600][l] || 0 },
  { id: 'power', n: 'Супер-таран', d: 'Сила выстрела +10% за уровень', ic: '🔥', max: 3, cost: l => [500, 1200, 2400][l] || 0 },
  { id: 'rich', n: 'Кладовая', d: 'Монет за уровень +25%', ic: '🪙', max: 2, cost: l => [900, 2000][l] || 0 }
];
function renderShop() {
  const boxEl = $('#shopList');
  boxEl.innerHTML = '';
  for (const it of SHOP) {
    const lv = save.items[it.id] | 0;
    const full = lv >= it.max;
    const price = full ? 0 : it.cost(lv);
    const el = document.createElement('div');
    el.className = 'card' + (full ? ' done' : '');
    el.innerHTML =
      '<div class="ico">' + it.ic + '</div>' +
      '<div class="txt"><div class="nm">' + it.n + ' <span class="lvlpips">' + lv + '/' + it.max + '</span></div>' +
      '<div class="ds">' + it.d + '</div></div>' +
      '<button class="btn ' + (full ? 'ghost' : 'alt') + ' small">' + (full ? 'Куплено' : '🪙 ' + price) + '</button>';
    if (!full) {
      const priceNow = price;
      el.querySelector('button').addEventListener('click', () => {
        if (save.coins < priceNow) { sfx.lose(); return; }
        save.coins -= priceNow;
        save.items[it.id] = lv + 1;
        save.stats.purchases++;
        sfx.buy(); vib(30); persist(); checkAch(); renderShop(); updateCoins();
      });
    }
    boxEl.appendChild(el);
  }
  updateCoins();
}
function updateCoins() {
  $('#menuCoins').textContent = save.coins;
  $('#menuStars').textContent = totalStars();
  $('#levelsCoins').textContent = save.coins;
  $('#shopCoins').textContent = save.coins;
}

/* ===================== достижения UI ===================== */
function renderAch() {
  const boxEl = $('#achList');
  boxEl.innerHTML = '';
  for (const a of ACH) {
    const cur = Math.min(a.goal, a.v(save));
    const done = !!save.ach[a.id];
    const pr = Math.round(cur / a.goal * 100);
    const el = document.createElement('div');
    el.className = 'card' + (done ? ' done' : '');
    el.innerHTML =
      '<div class="ico">' + (done ? a.ic : '🔒') + '</div>' +
      '<div class="txt"><div class="nm">' + a.n + '</div>' +
      '<div class="ds">' + a.d + ' · ' + cur + '/' + a.goal + '</div>' +
      (done ? '' : '<div class="pr"><i style="width:' + pr + '%"></i></div>') +
      '</div>';
    boxEl.appendChild(el);
  }
  $('#achDone').textContent = achDone();
  $('#achTotal').textContent = ACH.length;
}

/* ===================== экраны ===================== */
function hideAllScreens() { ['#menu', '#levels', '#shop', '#ach', '#settings'].forEach(s => $(s).classList.add('hidden')); }
function hideOverlays() { ['#ovPause', '#ovWin', '#ovLose'].forEach(s => $(s).classList.add('hidden')); }
function showHud(on) { $('#hud').classList.toggle('hidden', !on); }
function showScreen(id) {
  hideAllScreens(); hideOverlays(); showHud(false);
  $(id).classList.remove('hidden');
  state = 'menu'; stopMusic();
  if (id === '#levels') renderLevels();
  if (id === '#shop') renderShop();
  if (id === '#ach') renderAch();
  if (id === '#settings') renderSettings();
  updateCoins();
}
function renderLevels() {
  const g = $('#levelsGrid');
  g.innerHTML = '';
  for (let i = 1; i <= 50; i++) {
    const open = i <= save.unlocked;
    const st = save.stars[i] | 0;
    const el = document.createElement('div');
    el.className = 'lvl' + (open ? ' open' : ' locked');
    el.innerHTML = (open ? i : '🔒') + '<div class="st">' + (st ? '★'.repeat(st) : '') + '</div>';
    if (open) el.addEventListener('click', () => { sfx.tap(); startLevel(i); });
    g.appendChild(el);
  }
}
function renderSettings() {
  $('#swSound').classList.toggle('on', save.settings.sound);
  $('#swMusic').classList.toggle('on', save.settings.music);
  $('#swVibe').classList.toggle('on', save.settings.vibe);
  $('#setInfo').textContent = 'Пройдено уровней: ' + save.stats.levels + ' · Звёзд: ' + totalStars() + '/150 · Свиней: ' + save.stats.kills;
}
function updateHud() {
  $('#hudLevel').textContent = 'Уровень ' + level;
  $('#hudScore').textContent = score;
  $('#hudPigs').textContent = '🐷 ' + pigsAlive;
  const hb = $('#hudBirds');
  hb.innerHTML = '';
  const all = [];
  if (current) all.push(current);
  for (const k of queue) all.push(k);
  for (const k of all) {
    const d = document.createElement('div');
    d.className = 'pip ' + k;
    hb.appendChild(d);
  }
}

/* ===================== ввод ===================== */
let pointerId = null;
function pos(e) {
  const r = cv.getBoundingClientRect();
  const k = 1 / SCALE;
  return { x: (e.clientX - r.left) * k + cam.x, y: (e.clientY - r.top) * k + camY() };
}
function onDown(e) {
  audio();
  if (state === 'aim' && current) {
    const p = pos(e);
    const s = birdAtSling();
    if (Math.hypot(p.x - s.x, p.y - s.y) < 200) {
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
  const d = Math.hypot(dx, dy), max = 145;
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

/* ===================== цикл ===================== */
let acc = 0, last = 0;
function step(dt) {
  if (state === 'aim' || state === 'fly' || state === 'end') {
    for (const b of bodies) {
      if (b.dead) continue;
      b.vy += GRAV * dt;
      b.vx *= 0.9995;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.hitT > 0) b.hitT -= dt;
    }
    const list = bodies.filter(b => !b.dead);
    for (let it = 0; it < 3; it++) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          if (list[i].dead || list[j].dead) continue;
          resolve(list[i], list[j]);
        }
      }
      for (const b of list) if (!b.dead) resolveGround(b);
    }
    for (let i = bodies.length - 1; i >= 0; i--) {
      const b = bodies[i];
      if (b.dead) { bodies.splice(i, 1); continue; }
      if (b.type === 'bird' && (b.y > groundY + 500 || b.x < -400 || b.x > WORLD_W + 400)) bodies.splice(i, 1);
    }
    let alive = 0;
    for (const b of bodies) if (b.type === 'pig' && !b.dead) alive++;
    pigsAlive = alive;
    for (const p of parts) {
      p.vy += GRAV * 0.7 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
    }
    for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1);

    if (comboWindow > 0) { comboWindow -= dt; if (comboWindow <= 0) comboNow = 0; }
    if (shake > 0) shake = Math.max(0, shake - dt * 40);
  }

  if (state === 'fly') {
    if (pigsAlive <= 0 && !flock.some(b => !b.dead && !b.done)) { winLevel(); return; }
    let moving = false;
    for (const b of flock) {
      if (b.dead) { b.done = true; continue; }
      const out = b.x < -80 || b.x > WORLD_W + 80 || b.y > groundY + 300;
      const resty = Math.abs(b.vx) < 42 && Math.abs(b.vy) < 60 && b.y + b.r >= groundY - 4;
      const tooLong = Date.now() - (b.born || 0) > 9000;
      if (out || resty || tooLong) b.done = true;
      else moving = true;
    }
    if (!moving) {
      waitT += dt;
      if (waitT > 0.7) {
        waitT = 0; flock = [];
        if (pigsAlive <= 0) winLevel();
        else if (queue.length > 0) nextBird();
        else loseLevel();
        return;
      }
    }
    const t = flock.find(x => !x.dead && !x.done);
    if (t) {
      const want = clamp(t.x - viewW * 0.42, 0, maxCamX());
      cam.x += (want - cam.x) * Math.min(1, dt * 4);
    }
    hudT -= dt;
    if (hudT <= 0) { hudT = 0.2; updateHud(); }
  }

  if ((state === 'aim' || state === 'menu') && cam.x > 0) cam.x += (0 - cam.x) * Math.min(1, dt * 3);
}

/* ===================== отрисовка ===================== */
function drawSky() {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, '#3d7fd6'); g.addColorStop(0.55, '#8fc4e8'); g.addColorStop(1, '#d9ecc3');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, viewW, VIEW_H);

  ctx.save();
  ctx.translate(viewW * 0.17, 115);
  const sg = ctx.createRadialGradient(0, 0, 8, 0, 0, 130);
  sg.addColorStop(0, 'rgba(255,244,180,1)');
  sg.addColorStop(1, 'rgba(255,244,180,0)');
  ctx.fillStyle = sg;
  ctx.beginPath(); ctx.arc(0, 0, 130, 0, 6.3); ctx.fill();
  ctx.restore();

  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  const span = viewW + 500;
  for (const c of clouds) {
    const x = ((c.x - cam.x * 0.3) % span + span) % span - 250;
    const y = c.y;
    ctx.beginPath();
    ctx.arc(x, y, c.r, 0, 6.3);
    ctx.arc(x + c.r * 0.9, y + 6, c.r * 0.75, 0, 6.3);
    ctx.arc(x - c.r * 0.9, y + 8, c.r * 0.65, 0, 6.3);
    ctx.fill();
  }
}
function drawGround() {
  ctx.fillStyle = '#7fae5a';
  ctx.beginPath();
  ctx.moveTo(cam.x - 60, groundY + 8);
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const x = cam.x - 60 + i * (viewW + 120) / steps;
    ctx.lineTo(x, groundY - 60 - Math.sin(i * 1.05 + 0.3) * 52);
  }
  ctx.lineTo(cam.x + viewW + 60, groundY + 8);
  ctx.closePath(); ctx.fill();

  const gg = ctx.createLinearGradient(0, groundY, 0, groundY + 420);
  gg.addColorStop(0, '#8fc95d'); gg.addColorStop(0.14, '#6ea83f'); gg.addColorStop(1, '#456f27');
  ctx.fillStyle = gg;
  ctx.fillRect(cam.x - 60, groundY, viewW + 120, 520);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(cam.x - 60, groundY, viewW + 120, 6);
}
function drawSling() {
  ctx.strokeStyle = '#6b4423'; ctx.lineWidth = 14; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(slingX - 14, groundY); ctx.lineTo(slingX - 14, slingTopY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(slingX + 16, groundY); ctx.lineTo(slingX + 16, slingTopY); ctx.stroke();
  ctx.strokeStyle = '#4d2f19'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(slingX - 24, slingTopY + 44); ctx.lineTo(slingX + 26, slingTopY + 44); ctx.stroke();

  const s = birdAtSling();
  const px = (drag && current) ? drag.x : s.x;
  const py = (drag && current) ? drag.y : s.y;
  if (state === 'aim' && current) {
    ctx.strokeStyle = '#3b2412'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(slingX - 14, slingTopY + 8); ctx.lineTo(px, py); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(slingX + 16, slingTopY + 8); ctx.lineTo(px, py); ctx.stroke();
  }
}
function drawBirdShape(x, y, r, kind, rot) {
  ctx.save(); ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  const col = kind === 'yellow' ? '#f5c542' : (kind === 'blue' ? '#4aa8e8' : (kind === 'black' ? '#3a3a44' : '#e8453c'));
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.3); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath(); ctx.arc(-r * 0.25, -r * 0.3, r * 0.55, 0, 6.3); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(r * 0.2, -r * 0.25, r * 0.36, 0, 6.3); ctx.fill();
  ctx.fillStyle = '#20222b';
  ctx.beginPath(); ctx.arc(r * 0.3, -r * 0.25, r * 0.16, 0, 6.3); ctx.fill();
  ctx.fillStyle = '#f2a03d';
  ctx.beginPath();
  ctx.moveTo(r * 0.7, -r * 0.05); ctx.lineTo(r * 1.35, r * 0.12); ctx.lineTo(r * 0.7, r * 0.32);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = kind === 'blue' ? '#2a6ea8' : (kind === 'black' ? '#1c1c22' : '#c9352c');
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, -r * 0.75); ctx.lineTo(-r * 1.15, -r * 1.5); ctx.lineTo(-r * 0.15, -r * 0.95);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}
function drawPig(x, y, r, hurt) {
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.95, r * 0.95, r * 0.3, 0, 0, 6.3); ctx.fill();
  ctx.fillStyle = hurt ? '#a8d36a' : '#7cc242';
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.fill();
  ctx.fillStyle = '#6aa834';
  ctx.beginPath(); ctx.arc(x - r * 0.7, y - r * 0.75, r * 0.28, 0, 6.3); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.7, y - r * 0.75, r * 0.28, 0, 6.3); ctx.fill();
  ctx.fillStyle = '#8fd44f';
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.15, r * 0.42, r * 0.32, 0, 0, 6.3); ctx.fill();
  ctx.fillStyle = '#5d9c2c';
  ctx.beginPath(); ctx.arc(x - r * 0.13, y + r * 0.15, r * 0.09, 0, 6.3); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.13, y + r * 0.15, r * 0.09, 0, 6.3); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.24, 0, 6.3); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.3, y - r * 0.3, r * 0.24, 0, 6.3); ctx.fill();
  ctx.fillStyle = '#20222b';
  ctx.beginPath(); ctx.arc(x - r * 0.26, y - r * 0.3, r * 0.1, 0, 6.3); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.34, y - r * 0.3, r * 0.1, 0, 6.3); ctx.fill();
}
function drawBox(b) {
  const M = matOf(b.mat);
  const x = b.x - b.hw, y = b.y - b.hh;
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(x + 3, y + 4, b.w, b.h);
  ctx.fillStyle = M.c1;
  ctx.fillRect(x, y, b.w, b.h);
  ctx.fillStyle = M.c2;
  ctx.fillRect(x, y + b.h * 0.72, b.w, b.h * 0.28);
  ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, b.w - 2, b.h - 2);
  if (b.mat === 'ice') {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x + b.w * 0.18, y + b.h * 0.12, b.w * 0.18, b.h * 0.5);
  }
  const hpFrac = b.hp / b.maxHp;
  if (hpFrac < 0.7) {
    ctx.strokeStyle = 'rgba(0,0,0,' + (0.25 + (1 - hpFrac) * 0.5) + ')';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + b.w * 0.2, y + b.h * 0.2);
    ctx.lineTo(x + b.w * 0.5, y + b.h * 0.55);
    ctx.lineTo(x + b.w * 0.32, y + b.h * 0.85);
    ctx.stroke();
    if (hpFrac < 0.4) {
      ctx.beginPath();
      ctx.moveTo(x + b.w * 0.7, y + b.h * 0.15);
      ctx.lineTo(x + b.w * 0.55, y + b.h * 0.5);
      ctx.lineTo(x + b.w * 0.85, y + b.h * 0.8);
      ctx.stroke();
    }
  }
  if (b.hitT > 0) {
    ctx.fillStyle = 'rgba(255,255,255,' + clamp(b.hitT * 3, 0, 1) + ')';
    ctx.fillRect(x, y, b.w, b.h);
  }
}
function drawTrajectory() {
  if (!drag || !current) return;
  const s = birdAtSling();
  const vx = (s.x - drag.x) * 8.6 * powerMul, vy = (s.y - drag.y) * 8.6 * powerMul;
  let px = s.x, py = s.y, pvx = vx, pvy = vy;
  const dt = 0.05;
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  for (let i = 0; i < 44; i++) {
    pvy += GRAV * dt; px += pvx * dt; py += pvy * dt;
    if (py > groundY - 6) break;
    if (i % 2 === 0) { ctx.beginPath(); ctx.arc(px, py, 4, 0, 6.3); ctx.fill(); }
  }
}
function draw() {
  ctx.save();
  if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  drawSky();
  ctx.save();
  ctx.translate(-cam.x, camY());
  drawGround();
  drawSling();
  for (const b of bodies) {
    if (b.shape === 'box') drawBox(b);
    else if (b.type === 'pig') drawPig(b.x, b.y, b.r, b.hitT > 0);
    else drawBirdShape(b.x, b.y, b.r, b.kind, Math.abs(b.vx) > 60 ? Math.atan2(b.vy, b.vx) : 0);
  }
  for (const p of parts) {
    ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
    ctx.fillStyle = p.c;
    ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
  }
  ctx.globalAlpha = 1;
  if (state === 'aim' && current) {
    const px = drag ? drag.x : birdAtSling().x, py = drag ? drag.y : birdAtSling().y;
    drawBirdShape(px, py, 20, current, 0);
    drawTrajectory();
  }
  ctx.restore();
  ctx.restore();
}
function frame(ts) {
  const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
  last = ts;
  acc += dt;
  const h = 1 / 120;
  let n = 0;
  while (acc >= h && n < 5) { step(h); acc -= h; n++; }
  if (acc > 0.2) acc = 0;
  draw();
  requestAnimationFrame(frame);
}

/* ===================== кнопки и запуск ===================== */
function goMenu() { showScreen('#menu'); updateCoins(); }
function togglePause() {
  if (state === 'aim' || state === 'fly') {
    $('#ovPause').classList.remove('hidden');
    state = 'pause';
  } else if (state === 'pause') {
    $('#ovPause').classList.add('hidden');
    state = current ? 'aim' : 'fly';
  }
}
function bind() {
  $('#btnPlay').addEventListener('click', () => { sfx.tap(); showScreen('#levels'); });
  $('#btnShop').addEventListener('click', () => { sfx.tap(); showScreen('#shop'); });
  $('#btnAch').addEventListener('click', () => { sfx.tap(); showScreen('#ach'); });
  $('#btnSettings').addEventListener('click', () => { sfx.tap(); showScreen('#settings'); });
  $('#btnLevelsBack').addEventListener('click', goMenu);
  $('#btnShopBack').addEventListener('click', goMenu);
  $('#btnAchBack').addEventListener('click', goMenu);
  $('#btnSettingsBack').addEventListener('click', goMenu);
  $('#swSound').addEventListener('click', () => { save.settings.sound = !save.settings.sound; persist(); renderSettings(); if (save.settings.sound) sfx.tap(); });
  $('#swMusic').addEventListener('click', () => { save.settings.music = !save.settings.music; persist(); renderSettings(); if (save.settings.music) startMusic(); else stopMusic(); });
  $('#swVibe').addEventListener('click', () => { save.settings.vibe = !save.settings.vibe; persist(); renderSettings(); vib(30); });
  $('#btnReset').addEventListener('click', () => {
    save = defaultSave(); persist(); renderSettings(); updateCoins();
    tone(300, 0.3, 'sawtooth', 0.12);
  });
  $('#btnPause').addEventListener('click', togglePause);
  $('#btnResume').addEventListener('click', togglePause);
  $('#btnRestart').addEventListener('click', () => startLevel(level));
  $('#btnQuitP').addEventListener('click', goMenu);
  $('#btnReplay').addEventListener('click', () => startLevel(level));
  $('#btnQuitW').addEventListener('click', goMenu);
  $('#btnNext').addEventListener('click', () => startLevel(Math.min(50, level + 1)));
  $('#btnRetry').addEventListener('click', () => startLevel(level));
  $('#btnQuitL').addEventListener('click', goMenu);

  cv.addEventListener('pointerdown', onDown);
  cv.addEventListener('pointermove', onMove);
  cv.addEventListener('pointerup', onUp);
  cv.addEventListener('pointercancel', onUp);
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 250));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && (state === 'aim' || state === 'fly')) togglePause();
  });

  window.onAndroidBack = function () {
    if (!$('#ovWin').classList.contains('hidden') || !$('#ovLose').classList.contains('hidden') || !$('#ovPause').classList.contains('hidden')) { goMenu(); return; }
    if (state === 'aim' || state === 'fly') { togglePause(); return; }
    if (!$('#menu').classList.contains('hidden')) return;
    goMenu();
  };
  window.onAndroidPause = function () { if (state === 'aim' || state === 'fly') togglePause(); };
}
function init() {
  cv = $('#cv');
  ctx = cv.getContext('2d');
  resize();
  for (let i = 0; i < 10; i++) clouds.push({ x: Math.random() * 2600, y: 40 + Math.random() * 190, r: 26 + Math.random() * 32 });
  bind();
  updateCoins();
  showScreen('#menu');
  last = performance.now();
  requestAnimationFrame(frame);
}
document.addEventListener('DOMContentLoaded', init);
})();
