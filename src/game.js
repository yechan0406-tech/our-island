'use strict';
/* =========================================================
   우리의 섬 — 찬이 & 형이
   설정은 여기서 바꾸면 돼요 (이름, 날짜, 편지 내용)
   ========================================================= */
const CONFIG = {
  players: {
    dog: { name: '찬이', animal: '강아지', emoji: '🐶' },
    cat: { name: '형이', animal: '고양이', emoji: '🐱' },
  },
  anniversary: '2026-11-19',               // 사귄 날 (이 날이 1일)
  birthdays: { dog: [4, 6], cat: [8, 2] },  // [월, 일]
  letter: { to: 'cat', from: 'dog', text: '예형아 사랑해 ♥' },
  room: 'yy-ourisland-1119',                // 둘만의 방 이름 (바꾸면 새 섬)
};

/* ---------- utils ---------- */
const params = new URLSearchParams(location.search);
const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function hasBatchim(s) { const c = s.charCodeAt(s.length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; }
const callName = (n) => n + (hasBatchim(n) ? '아' : '야');   // 예형아
const subj = (n) => n + (hasBatchim(n) ? '이가' : '가');     // 예찬이가
const nick = (n) => n + (hasBatchim(n) ? '이' : '');         // 예형이
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const store = {
  get(k, d) { try { const v = localStorage.getItem('ourisland.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('ourisland.' + k, JSON.stringify(v)); } catch {} },
};

/* ---------- date & events ---------- */
function today() {
  const p = params.get('date');
  if (p && /^\d{4}-\d{2}-\d{2}$/.test(p)) { const [y, m, d] = p.split('-').map(Number); return new Date(y, m - 1, d); }
  const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}
function dayCount() {
  const [y, m, d] = CONFIG.anniversary.split('-').map(Number);
  return Math.round((today() - new Date(y, m - 1, d)) / 86400000) + 1;
}
function todaysEvents() {
  const t = today(), ev = [], n = dayCount();
  const [ay, am, ad] = CONFIG.anniversary.split('-').map(Number);
  if (n === 1) ev.push({ kind: 'anniv', text: '💕 오늘부터 1일! 💕' });
  else if (t.getMonth() + 1 === am && t.getDate() === ad && t.getFullYear() > ay) ev.push({ kind: 'anniv', text: `🎉 우리 ${t.getFullYear() - ay}주년 🎉` });
  else if (n > 0 && n % 100 === 0) ev.push({ kind: 'anniv', text: `🎉 우리 ${n}일 🎉` });
  for (const who of ['dog', 'cat']) {
    const [bm, bd] = CONFIG.birthdays[who];
    if (t.getMonth() + 1 === bm && t.getDate() === bd) ev.push({ kind: 'bday', who, text: `🎂 ${callName(CONFIG.players[who].name)} 생일 축하해! 🎂` });
  }
  return ev;
}

/* =========================================================
   renderer / scene
   ========================================================= */
const canvas = $('#game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 600);
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true, ...extra });
function mesh(geo, material, x = 0, y = 0, z = 0, parent = scene, shadow = true) {
  const m = new THREE.Mesh(geo, material); m.position.set(x, y, z);
  m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m;
}

/* ---------- lights & sky ---------- */
const hemi = new THREE.HemisphereLight(0xffffff, 0x88aa66, 1.4); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(30, 50, 20); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: 1, far: 150 });
sun.shadow.bias = -0.0005;
scene.add(sun); scene.add(sun.target);
scene.fog = new THREE.Fog(0x9fd8f5, 70, 260);

const SKY = [ // [hour, sky, sunColor, sunIntensity, hemiIntensity]
  [0, 0x141a38, 0x8899ff, 0.35, 0.45], [5, 0x262e5c, 0x8899ff, 0.4, 0.5], [6.5, 0xf6b9a2, 0xffc49a, 1.2, 0.9],
  [8, 0x9fd8f5, 0xffffff, 2.2, 1.4], [16, 0x9fd8f5, 0xffffff, 2.2, 1.4], [18, 0xf5a37a, 0xffa070, 1.4, 1.0],
  [19.5, 0x5a4a8a, 0xb08cff, 0.6, 0.6], [21, 0x141a38, 0x8899ff, 0.35, 0.45], [24, 0x141a38, 0x8899ff, 0.35, 0.45],
];
function currentHour() { const h = parseFloat(params.get('hour')); if (!isNaN(h)) return h; const n = new Date(); return n.getHours() + n.getMinutes() / 60; }
let night = 0;
const skyCol = new THREE.Color(), tmpC = new THREE.Color();
function applySky() {
  const h = currentHour();
  let i = 0; while (i < SKY.length - 2 && SKY[i + 1][0] <= h) i++;
  const a = SKY[i], b = SKY[i + 1], t = (h - a[0]) / (b[0] - a[0]);
  skyCol.set(a[1]).lerp(tmpC.set(b[1]), t);
  scene.background = skyCol.clone(); scene.fog.color.copy(skyCol);
  sun.color.set(a[2]).lerp(tmpC.set(b[2]), t);
  sun.intensity = lerp(a[3], b[3], t); hemi.intensity = lerp(a[4], b[4], t);
  night = (h >= 19 || h < 5.5) ? 1 : (h >= 17.5 ? smooth(17.5, 19, h) : (h < 7 ? 1 - smooth(5.5, 7, h) : 0));
  stars.material.opacity = night; lampLights.forEach(l => (l.intensity = night * 18)); lampBulbs.forEach(m => m.material.emissiveIntensity = 0.2 + night * 1.6);
  windowMat.emissiveIntensity = night * 1.2;
  ocean.material.color.set(0x4fc3dc).lerp(tmpC.set(0x1d3557), night * 0.85);
}

/* ---------- stars ---------- */
const stars = (() => {
  const g = new THREE.BufferGeometry(), p = [], r = rng(7);
  for (let i = 0; i < 700; i++) { const th = r() * Math.PI * 2, ph = r() * 1.3; p.push(Math.cos(th) * Math.sin(ph) * 250, Math.cos(ph) * 250 + 10, Math.sin(th) * Math.sin(ph) * 250); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  const s = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.4, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  scene.add(s); return s;
})();

/* =========================================================
   world
   ========================================================= */
const R_GRASS = 60, R_SAND = 66;
const colliders = []; // {x,z,r}
const PIER = { x0: -72, x1: -59, z: 16, w: 1.2 };
function onPier(x, z) { return x > PIER.x0 && x < PIER.x1 + 1 && Math.abs(z - PIER.z) < PIER.w; }
function groundY(x, z) {
  if (onPier(x, z) && Math.hypot(x, z) > R_GRASS - 0.5) return 0.08;
  const r = Math.hypot(x, z); return r < R_GRASS - 0.5 ? 0 : -0.2 * smooth(R_GRASS - 0.5, R_SAND, r);
}
function walkable(x, z) {
  if (onPier(x, z)) return true;
  if (Math.hypot(x, z) > R_SAND - 1.2) return false;
  return true;
}
const _m4 = new THREE.Matrix4(), _m4b = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
// one draw call for many copies of the same shape
function instanced(geo, items, { shadow = true } = {}) { // items: [{m: Matrix4, c: color}]
  const im = new THREE.InstancedMesh(geo, mat(0xffffff), Math.max(1, items.length));
  items.forEach((it, i) => { im.setMatrixAt(i, it.m); im.setColorAt(i, _c.set(it.c)); });
  im.count = items.length; im.castShadow = shadow; im.receiveShadow = true; im.frustumCulled = false; scene.add(im); return im;
}
const flatM = (x, y, z, s, sx = s, sz = s) => new THREE.Matrix4().compose(_v.set(x, y, z), _q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2), _s.set(sx, sz, 1));

// island
mesh(new THREE.CylinderGeometry(R_GRASS, R_GRASS + 0.5, 3, 120), mat(0x8fd16a), 0, -1.5, 0, scene, false);
mesh(new THREE.CylinderGeometry(R_SAND, R_SAND + 3, 2.4, 120), mat(0xf3dfa9), 0, -1.42, 0, scene, false);
{ // grass patches
  const r = rng(3), items = [];
  for (let i = 0; i < 240; i++) { const a = r() * 6.28, d = 3 + r() * 55; items.push({ m: flatM(Math.cos(a) * d, 0.01, Math.sin(a) * d, 1 + r() * 2.8), c: r() > 0.5 ? 0x7cc35a : 0xa2dc7a }); }
  instanced(new THREE.CircleGeometry(1, 7), items, { shadow: false });
}
// ocean
const ocean = (() => {
  const g = new THREE.PlaneGeometry(600, 600, 64, 64);
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x4fc3dc, roughness: 0.35, metalness: 0.1, flatShading: true, transparent: true, opacity: 0.9 }));
  m.rotation.x = -Math.PI / 2; m.position.y = -0.55; m.receiveShadow = true; scene.add(m);
  m.userData.base = Float32Array.from(g.attributes.position.array); return m;
})();
const foam = mesh(new THREE.RingGeometry(R_SAND + 0.2, R_SAND + 1.3, 120), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }), 0, -0.45, 0, scene, false);
foam.rotation.x = -Math.PI / 2;

// plaza + paths
mesh(new THREE.CylinderGeometry(5, 5, 0.06, 28), mat(0xe8d8c4), 0, 0.03, 0, scene, false);
const PATHS = [[[0, 5], [0, 55]], [[-5, 1], [-28, 10], [-58, 16]], [[-3, -4], [-20, -14]], [[4, -3], [20, -15]], [[5, 0], [30, 2], [57, 5]]];
function distToPaths(x, z) {
  let best = Infinity;
  for (const p of PATHS) for (let i = 0; i < p.length - 1; i++) {
    const [ax, az] = p[i], [bx, bz] = p[i + 1], dx = bx - ax, dz = bz - az, t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1);
    best = Math.min(best, Math.hypot(x - (ax + dx * t), z - (az + dz * t)));
  }
  return best;
}
{
  const items = [];
  for (const p of PATHS) for (let i = 0; i < p.length - 1; i++) {
    const [ax, az] = p[i], [bx, bz] = p[i + 1], n = Math.ceil(Math.hypot(bx - ax, bz - az) / 1.4);
    for (let k = 0; k < n; k++) { const t = k / n; items.push({ m: new THREE.Matrix4().makeTranslation(lerp(ax, bx, t), groundY(lerp(ax, bx, t), lerp(az, bz, t)) + 0.03, lerp(az, bz, t)), c: 0xd9c7b0 }); }
  }
  instanced(new THREE.CylinderGeometry(0.55, 0.6, 0.06, 8), items, { shadow: false });
}

// lamps
const lampLights = [], lampBulbs = [];
function lamp(x, z) {
  mesh(new THREE.CylinderGeometry(0.09, 0.12, 2.6, 6), mat(0x4a4a5a), x, 1.3, z);
  const b = mesh(new THREE.SphereGeometry(0.28, 10, 8), mat(0xfff2c0, { emissive: 0xffd27a, emissiveIntensity: 0.2 }), x, 2.75, z, scene, false);
  lampBulbs.push(b);
  const l = new THREE.PointLight(0xffc870, 0, 14, 1.6); l.position.set(x, 2.7, z); scene.add(l); lampLights.push(l);
  colliders.push({ x, z, r: 0.25 });
}
lamp(3.5, 3.5); lamp(-2, 50); lamp(-30, 12); lamp(19, -12); lamp(40, 4.5);

// trees (collected, then drawn with instancing)
const treeSpecs = [];
function tree(x, z, kind, s = 1) { treeSpecs.push({ x, z, kind, s, rot: Math.random() * 6.28, g: Math.floor(Math.random() * 3) }); colliders.push({ x, z, r: 0.45 * s }); }
function buildTrees() {
  const P = {
    trunk: [new THREE.CylinderGeometry(0.22, 0.32, 1.6, 6), []], roundA: [new THREE.IcosahedronGeometry(1.35, 0), []], roundB: [new THREE.IcosahedronGeometry(0.95, 0), []],
    pine1: [new THREE.ConeGeometry(1.4, 1.8, 7), []], pine2: [new THREE.ConeGeometry(1.1, 1.5, 7), []], pine3: [new THREE.ConeGeometry(0.75, 1.2, 7), []],
    blA: [new THREE.IcosahedronGeometry(1.3, 0), []], blB: [new THREE.IcosahedronGeometry(0.85, 0), []],
  };
  const greens = [0x6cc05a, 0x5fb34f, 0x7fd06a], pinks = [0xffb7cf, 0xffa6c4, 0xffc9da];
  for (const t of treeSpecs) {
    const base = new THREE.Matrix4().compose(_v.set(t.x, 0, t.z), _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), t.rot), _s.setScalar(t.s));
    t.parts = [];
    const add = (k, x, y, z, c) => { const it = { m: base.clone().multiply(_m4b.makeTranslation(x, y, z)), c }; P[k][1].push(it); if (k !== 'trunk') t.parts.push([k, P[k][1].length - 1, it.m]); };
    add('trunk', 0, 0.8, 0, 0x9b6b43);
    if (t.kind === 0) { add('roundA', 0, 2.4, 0, greens[t.g]); add('roundB', 0.6, 3.1, 0.2, greens[t.g]); }
    else if (t.kind === 1) { add('pine1', 0, 2.0, 0, 0x3f9c5a); add('pine2', 0, 2.9, 0, 0x48aa62); add('pine3', 0, 3.7, 0, 0x52b86b); }
    else { add('blA', 0, 2.4, 0, pinks[t.g]); add('blB', -0.55, 3.0, 0.3, pinks[(t.g + 1) % 3]); }
  }
  const meshes = {};
  for (const k in P) if (P[k][1].length) meshes[k] = instanced(P[k][0], P[k][1]);
  for (const t of treeSpecs) { t.parts = t.parts.map(([k, i, m]) => [meshes[k], i, m]); t.hidden = false; }
}
// hide tree tops that stand between the camera and the players
const ZERO_M = new THREE.Matrix4().makeScale(0, 0, 0);
function updateTreeOcclusion(cam, targets) {
  const dirty = new Set();
  for (const t of treeSpecs) {
    let hide = false;
    for (const p of targets) {
      const ax = cam.x, az = cam.z, dx = p.x - ax, dz = p.z - az, L2 = dx * dx + dz * dz; if (L2 < 1e-3) continue;
      const u = ((t.x - ax) * dx + (t.z - az) * dz) / L2; if (u < 0 || u > 1.08) continue;
      const d = Math.hypot(t.x - (ax + dx * u), t.z - (az + dz * u)); if (d < 1.4 * t.s + 0.6) { hide = true; break; }
      if (Math.hypot(t.x - p.x, t.z - p.z) < 1.6 * t.s && u > 0.75) { hide = true; break; }
    }
    if (hide !== t.hidden) { t.hidden = hide; for (const [im, i, m] of t.parts) { im.setMatrixAt(i, hide ? ZERO_M : m); dirty.add(im); } }
  }
  dirty.forEach(im => (im.instanceMatrix.needsUpdate = true));
}
// palm on sand
function palm(x, z, rot) {
  const g = new THREE.Group(); g.position.set(x, groundY(x, z), z); g.rotation.y = rot; scene.add(g);
  for (let i = 0; i < 5; i++) { const seg = mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.85, 6), mat(0xb5895a), 0.03 * i * i, 0.42 + i * 0.8, 0, g); seg.rotation.z = -0.06 * i; }
  for (let i = 0; i < 5; i++) { const l = mesh(new THREE.ConeGeometry(0.35, 2.2, 4), mat(0x58b45a), 0.6, 4.1, 0, g); l.rotation.set(0, (i / 5) * 6.28, 0); l.rotateZ(1.9); l.position.set(0.6, 4.0, 0); }
  colliders.push({ x, z, r: 0.35 });
}
// rocks
function rock(x, z, s, col = 0x9aa0a8) {
  const m = mesh(new THREE.DodecahedronGeometry(s, 0), mat(col), x, groundY(x, z) + s * 0.4, z);
  m.rotation.set(Math.random(), Math.random() * 6, Math.random()); m.scale.y = 0.7;
  colliders.push({ x, z, r: s * 0.85 });
}
const polar = (deg, r) => [Math.cos((deg * Math.PI) / 180) * r, Math.sin((deg * Math.PI) / 180) * r];

// house (big, enterable)
const windowMat = mat(0xfff0b0, { emissive: 0xffc860, emissiveIntensity: 0 });
const HOUSE = { x: -24, z: -18, ry: 0.93, hx: 6, hz: 4.5, H: 3.0 };
const _hc = Math.cos(HOUSE.ry), _hs = Math.sin(HOUSE.ry);
const houseLocal = (x, z, y = 0) => new THREE.Vector3(HOUSE.x + x * _hc + z * _hs, y, HOUSE.z - x * _hs + z * _hc);
const toHouseLocal = (px, pz) => { const dx = px - HOUSE.x, dz = pz - HOUSE.z; return [dx * _hc - dz * _hs, dx * _hs + dz * _hc]; };
function insideHouse(px, pz) { const [lx, lz] = toHouseLocal(px, pz); return Math.abs(lx) < HOUSE.hx && Math.abs(lz) < HOUSE.hz; }
function houseBox(lx, lz, hx, hz) { const c = houseLocal(lx, lz); colliders.push({ box: true, x: c.x, z: c.z, hx, hz, rot: HOUSE.ry, r: Math.hypot(hx, hz) }); }
function houseCircle(lx, lz, r) { const c = houseLocal(lx, lz); colliders.push({ x: c.x, z: c.z, r }); }
const houseG = new THREE.Group(); houseG.position.set(HOUSE.x, 0, HOUSE.z); houseG.rotation.y = HOUSE.ry; scene.add(houseG);
const wallsG = new THREE.Group(), roofG = new THREE.Group(), furnG = new THREE.Group(); houseG.add(wallsG, roofG, furnG);
let mailboxPos, fireLight, houseLight, chimneyTop;
const flames = [], fireLogs = [];
const BED = { x: 3.9, z: -2.7, hx: 1.3, hz: 1.5, top: 0.65 };
{
  const H = HOUSE.H, wallC = mat(0xfff1dd), wood = mat(0xc8875a), woodD = mat(0x8a5a38), stone = mat(0xbfb2a6);
  const box = (sx, sy, sz, m, x, y, z, parent = furnG, shadow = true) => mesh(new THREE.BoxGeometry(sx, sy, sz), m, x, y, z, parent, shadow);
  const cyl = (rt, rb, h, m, x, y, z, parent = furnG, seg = 10) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z, parent);
  // walls (front has a doorway in the middle)
  box(12.3, H, 0.3, wallC, 0, H / 2, -4.5, wallsG); houseBox(0, -4.5, 6.15, 0.15);
  box(0.3, H, 9, wallC, -6, H / 2, 0, wallsG); houseBox(-6, 0, 0.15, 4.5);
  box(0.3, H, 9, wallC, 6, H / 2, 0, wallsG); houseBox(6, 0, 0.15, 4.5);
  for (const s of [-1, 1]) { box(5.05, H, 0.3, wallC, s * 3.625, H / 2, 4.5, wallsG); houseBox(s * 3.625, 4.5, 2.525, 0.15); }
  box(2.2, 0.8, 0.3, wallC, 0, H - 0.4, 4.5, roofG); // lintel (hidden in cut-away view)
  for (const [x, z] of [[-6, -4.5], [6, -4.5], [-6, 4.5], [6, 4.5]]) box(0.45, H, 0.45, wood, x, H / 2, z, wallsG);
  for (const x of [-1.15, 1.15]) box(0.18, H - 0.6, 0.38, wood, x, (H - 0.6) / 2, 4.5, wallsG); // door frame
  // windows
  const win = (x, y, z, rotY) => { const w = box(1.3, 1.1, 0.36, windowMat, x, y, z, wallsG, false); w.rotation.y = rotY; const f1 = box(1.42, 0.08, 0.4, mat(0xffffff), x, y, z, wallsG, false); f1.rotation.y = rotY; const f2 = box(0.08, 1.2, 0.4, mat(0xffffff), x, y, z, wallsG, false); f2.rotation.y = rotY; };
  win(-3.6, 1.7, 4.5, 0); win(3.6, 1.7, 4.5, 0); win(-4.3, 2.0, -4.5, 0); win(3.9, 2.25, -4.5, 0); win(-6, 1.7, 2.6, Math.PI / 2); win(6, 1.7, 1.4, Math.PI / 2);
  // open door, swung inward
  const hinge = new THREE.Group(); hinge.position.set(1.05, 0, 4.3); hinge.rotation.y = -1.6; wallsG.add(hinge);
  box(1.0, 2.2, 0.08, mat(0xa0704a), -0.5, 1.1, 0, hinge); mesh(new THREE.SphereGeometry(0.06, 6, 6), mat(0xffd34d), -0.85, 1.05, 0.07, hinge);
  // roof + chimney (hidden when inside)
  const roofInner = mesh(new THREE.ConeGeometry(6.6 * Math.SQRT2, 2.8, 4), mat(0xe77f7f), 0, H + 1.4, 0, roofG); roofInner.rotation.y = Math.PI / 4;
  roofG.scale.z = 5.0 / 6.6;
  box(0.9, 2.4, 0.9 / (5.0 / 6.6), mat(0xc9746a), -4.9, H + 1.7, -0.6 / (5.0 / 6.6), roofG);
  chimneyTop = houseLocal(-4.9, -0.6, H + 3.0);
  // floor + rug
  box(11.7, 0.04, 8.7, mat(0xe2b07f), 0, 0.0, 0, furnG, false);
  for (let x = -5.4; x <= 5.4; x += 0.9) box(0.03, 0.045, 8.7, mat(0xc99766), x, 0.0, 0, furnG, false);
  mesh(new THREE.CylinderGeometry(1.75, 1.75, 0.03, 24), mat(0xf4b6c2), -3.0, 0.035, -0.6, furnG, false);
  mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.035, 24), mat(0xfbd3db), -3.0, 0.04, -0.6, furnG, false);
  box(1.6, 0.03, 0.8, mat(0xff8fab), 0, 0.02, 5.2, furnG, false); // doormat outside

  // fireplace on the left wall
  box(0.9, 1.45, 2.1, stone, -5.4, 0.725, -0.6); houseBox(-5.4, -0.6, 0.45, 1.05);
  box(0.12, 0.95, 1.2, mat(0x2a1d18), -4.95, 0.55, -0.6, furnG, false);
  box(1.15, 0.12, 2.35, wood, -5.3, 1.5, -0.6);
  box(0.8, H - 1.56, 1.3, stone, -5.55, 1.56 + (H - 1.56) / 2, -0.6, wallsG);
  for (const [z, ry] of [[-0.85, 0.2], [-0.4, -0.25], [-0.62, 0]]) { const l = cyl(0.09, 0.09, 0.75, woodD, -4.85, 0.18 + (ry === 0 ? 0.13 : 0), z, furnG, 7); l.rotation.set(Math.PI / 2, ry, 0); fireLogs.push(l); }
  for (const [c, dz, s] of [[0xff7a2e, -0.2, 1], [0xffb13b, 0.15, 0.85], [0xffe07a, -0.02, 0.6]]) {
    const f = mesh(new THREE.ConeGeometry(0.2 * s, 0.6 * s, 6), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.92 }), -4.85, 0.45, -0.6 + dz, furnG, false);
    f.userData = { base: 0.6 * s, ph: Math.random() * 6 }; flames.push(f);
  }
  fireLight = new THREE.PointLight(0xff8a3c, 5, 10, 1.4); fireLight.position.set(-4.4, 0.9, -0.6); houseG.add(fireLight);
  // stacked firewood next to the fireplace
  for (const [z, y] of [[1.0, 0.13], [1.3, 0.13], [1.6, 0.13], [1.15, 0.36], [1.45, 0.36], [1.3, 0.59]]) {
    const l = cyl(0.13, 0.13, 0.9, mat(0x9b6b43), -5.35, y, z, furnG, 8); l.rotation.z = Math.PI / 2;
    const end = cyl(0.11, 0.11, 0.02, mat(0xe6c28f), -4.89, y, z, furnG, 8); end.rotation.z = Math.PI / 2;
  }
  houseBox(-5.35, 1.3, 0.5, 0.45);
  // coffee table + mugs
  box(0.85, 0.07, 1.25, wood, -3.0, 0.42, -0.6);
  for (const [dx, dz] of [[-0.35, -0.55], [0.35, -0.55], [-0.35, 0.55], [0.35, 0.55]]) box(0.07, 0.4, 0.07, woodD, -3.0 + dx, 0.2, -0.6 + dz);
  for (const [dz, c] of [[-0.25, 0xff8fab], [0.2, 0x8fd8c0]]) cyl(0.07, 0.06, 0.14, mat(c), -3.0, 0.53, -0.6 + dz);
  houseBox(-3.0, -0.6, 0.45, 0.65);
  // sofa facing the fire
  const sofaC = mat(0x8fbf9f), cush = mat(0xbfe0c8);
  box(0.95, 0.44, 2.5, sofaC, -1.2, 0.22, -0.6); box(0.28, 0.78, 2.5, sofaC, -0.82, 0.78, -0.6);
  for (const s of [-1, 1]) box(0.95, 0.62, 0.25, sofaC, -1.2, 0.31, -0.6 + s * 1.25);
  for (const s of [-1, 1]) box(0.78, 0.14, 1.12, cush, -1.27, 0.5, -0.6 + s * 0.58);
  for (const [s, c] of [[-1, 0xff9fb6], [1, 0xffd166]]) { const p = box(0.18, 0.42, 0.42, mat(c), -1.0, 0.74, -0.6 + s * 0.9); p.rotation.x = s * 0.25; }
  houseBox(-1.15, -0.6, 0.5, 1.3);
  // floor lamp
  cyl(0.04, 0.05, 1.7, mat(0x4a4a5a), -1.0, 0.85, 1.3); cyl(0.2, 0.2, 0.04, mat(0x4a4a5a), -1.0, 0.02, 1.3);
  lampBulbs.push(mesh(new THREE.CylinderGeometry(0.2, 0.34, 0.36, 12), mat(0xfff2c0, { emissive: 0xffd27a, emissiveIntensity: 0.2 }), -1.0, 1.75, 1.3, furnG, false));
  houseCircle(-1.0, 1.3, 0.3);
  // kitchen along the back wall + fridge
  box(2.7, 0.9, 0.65, mat(0xf7e6d0), -4.35, 0.45, -3.95); box(2.8, 0.06, 0.72, wood, -4.35, 0.93, -3.95);
  box(0.62, 0.03, 0.5, mat(0x3a3a44), -3.5, 0.97, -3.95, furnG, false);
  for (const dx of [-0.14, 0.14]) cyl(0.09, 0.09, 0.01, mat(0xe05a4a), -3.5 + dx, 0.99, -3.95, furnG);
  cyl(0.17, 0.15, 0.22, mat(0xff8fab), -3.5, 1.1, -3.95); box(0.55, 0.04, 0.42, mat(0xc9d6df), -4.8, 0.95, -3.95, furnG, false);
  for (const s of [-1, 1]) box(0.07, 0.07, 0.4, mat(0xffffff), -5.35 + s * 0.12, 0.25, -3.6);
  houseBox(-4.35, -3.95, 1.4, 0.38);
  box(0.75, 1.8, 0.7, mat(0xdff1f7), -5.4, 0.9, -2.9); box(0.04, 0.5, 0.05, mat(0x9aa0a8), -5.0, 1.2, -2.65);
  houseBox(-5.4, -2.9, 0.38, 0.36);
  // bookshelf with books and a photo frame
  box(1.7, 2.1, 0.45, mat(0xb5835a), 0.3, 1.05, -4.08);
  const bookCols = [0xff8fab, 0x8fd8c0, 0xffd166, 0xc3a6ff, 0x7cc7ff, 0xf28c6b];
  for (const y of [0.42, 1.06, 1.7]) { let x = -0.45; while (x < 0.95) { const w = 0.09 + Math.random() * 0.06, h = 0.34 + Math.random() * 0.16; box(w, h, 0.3, mat(bookCols[Math.floor(Math.random() * 6)]), x + w / 2, y + h / 2 - 0.17, -3.85, furnG, false); x += w + 0.015; } }
  box(0.36, 0.3, 0.05, mat(0xffffff), 0.3, 2.27, -3.95); box(0.28, 0.22, 0.06, mat(0xffb3c6), 0.3, 2.27, -3.94, furnG, false);
  houseBox(0.3, -4.08, 0.85, 0.25);
  // bed for two
  box(2.6, 0.35, 3.0, wood, BED.x, 0.175, BED.z);
  box(2.4, 0.3, 2.8, mat(0xfffaf2), BED.x, 0.5, BED.z);
  box(2.46, 0.1, 1.55, mat(0xffb3c6), BED.x, 0.7, BED.z + 0.6); box(2.47, 0.11, 0.22, mat(0xff8fab), BED.x, 0.7, BED.z + 0.05);
  for (const s of [-1, 1]) box(0.85, 0.18, 0.48, mat(0xffffff), BED.x + s * 0.55, 0.74, BED.z - 1.08);
  box(2.6, 1.3, 0.15, wood, BED.x, 0.85, BED.z - 1.52);
  { const hg = new THREE.Group(); hg.position.set(BED.x, 1.25, BED.z - 1.43); furnG.add(hg);
    for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.13, 10, 8), mat(0xff6f9c), s * 0.1, 0.05, 0, hg, false);
    const tip = mesh(new THREE.ConeGeometry(0.18, 0.26, 4), mat(0xff6f9c), 0, -0.13, 0, hg, false); tip.rotation.z = Math.PI; }
  houseBox(BED.x, BED.z, BED.hx, BED.hz);
  // nightstand + little lamp + photo
  box(0.6, 0.6, 0.55, wood, 2.1, 0.3, -3.95); cyl(0.06, 0.08, 0.2, mat(0xfff1dd), 2.0, 0.7, -3.95);
  lampBulbs.push(mesh(new THREE.CylinderGeometry(0.1, 0.17, 0.18, 10), mat(0xfff2c0, { emissive: 0xffd27a, emissiveIntensity: 0.2 }), 2.0, 0.88, -3.95, furnG, false));
  const ph = box(0.22, 0.18, 0.03, mat(0xff8fab), 2.25, 0.7, -3.9); ph.rotation.y = 0.3;
  houseBox(2.1, -3.95, 0.3, 0.28);
  // dining table + chairs + flowers
  cyl(0.7, 0.7, 0.06, wood, 3.5, 0.76, 2.3, furnG, 18); cyl(0.08, 0.12, 0.74, woodD, 3.5, 0.37, 2.3);
  cyl(0.06, 0.08, 0.22, mat(0x8fd8c0), 3.5, 0.9, 2.3);
  for (let i = 0; i < 5; i++) mesh(new THREE.SphereGeometry(0.06, 6, 6), mat([0xff8fab, 0xffd166, 0xffffff][i % 3]), 3.5 + Math.cos(i) * 0.07, 1.04 + (i % 2) * 0.04, 2.3 + Math.sin(i) * 0.07, furnG, false);
  houseCircle(3.5, 2.3, 0.72);
  for (const s of [-1, 1]) { box(0.45, 0.06, 0.45, wood, 3.5 + s * 0.95, 0.46, 2.3); box(0.06, 0.55, 0.45, wood, 3.5 + s * 1.15, 0.74, 2.3); for (const dz of [-0.18, 0.18]) for (const dx of [-0.18, 0.18]) box(0.05, 0.44, 0.05, woodD, 3.5 + s * 0.95 + dx, 0.22, 2.3 + dz); houseCircle(3.5 + s * 0.95, 2.3, 0.28); }
  // plants in pots
  for (const [x, z] of [[5.3, 3.8], [-5.3, 3.8], [5.3, -0.3]]) { cyl(0.26, 0.2, 0.42, mat(0xd8845a), x, 0.21, z); mesh(new THREE.IcosahedronGeometry(0.42, 0), mat(0x5fb34f), x, 0.75, z, furnG); houseCircle(x, z, 0.35); }
  // mailbox (outside, right of the door) + chopping stump with firewood
  cyl(0.06, 0.06, 1, mat(0x8a6a4a), 2.8, 0.5, 5.6, furnG, 6); box(0.4, 0.35, 0.55, mat(0xff8fab), 2.8, 1.1, 5.6);
  mailboxPos = houseLocal(2.8, 5.6, 1.33); houseCircle(2.8, 5.6, 0.15);
  cyl(0.45, 0.5, 0.5, mat(0x9b6b43), 7.3, 0.25, 1.5); cyl(0.43, 0.43, 0.02, mat(0xe6c28f), 7.3, 0.51, 1.5);
  { const ax = box(0.06, 0.7, 0.06, woodD, 7.3, 0.8, 1.5); ax.rotation.z = 0.5; const blade = box(0.25, 0.16, 0.04, mat(0x9aa0a8), 7.12, 0.58, 1.5); blade.rotation.z = 0.5; }
  for (const [x, z, r] of [[7.8, 2.3, 0.3], [6.9, 2.5, -0.5], [7.4, 2.5, 1.2]]) { const l = cyl(0.12, 0.12, 0.7, mat(0x9b6b43), x, 0.12, z, furnG, 8); l.rotation.set(0, r, Math.PI / 2); }
  houseCircle(7.3, 1.5, 0.5);
  houseLight = new THREE.PointLight(0xffd9a0, 0, 13, 1.3); houseLight.position.set(1.2, 2.6, 0); houseG.add(houseLight);
  houseG.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
}
function bedSlotPos(slot) { return houseLocal(BED.x + (slot ? 0.55 : -0.55), BED.z + 0.13, BED.top + 0.42); }
// pond
const POND = { x: 24, z: -22 };
{
  const p = mesh(new THREE.CircleGeometry(3.4, 20), new THREE.MeshStandardMaterial({ color: 0x6fd0e6, roughness: 0.2, flatShading: true }), POND.x, 0.04, POND.z, scene, false);
  p.rotation.x = -Math.PI / 2;
  const rim = mesh(new THREE.RingGeometry(3.3, 3.8, 20), mat(0xc9c2b8), POND.x, 0.035, POND.z, scene, false); rim.rotation.x = -Math.PI / 2;
  for (const [dx, dz] of [[1, 0.5], [-1.2, -0.8], [0.3, -1.6]]) { const l = mesh(new THREE.CircleGeometry(0.45, 8), mat(0x6fbf57), POND.x + dx, 0.06, POND.z + dz, scene, false); l.rotation.x = -Math.PI / 2; }
  colliders.push({ x: POND.x, z: POND.z, r: 3.4 });
}
// pier
{
  const len = PIER.x1 - PIER.x0 + 1;
  mesh(new THREE.BoxGeometry(len, 0.18, PIER.w * 2), mat(0xc19a6b), (PIER.x0 + PIER.x1 + 1) / 2, 0.0, PIER.z);
  for (let x = PIER.x0 + 0.5; x < PIER.x1; x += 2.5) for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.4, 6), mat(0x8a6a4a), x, -0.5, PIER.z + s * (PIER.w - 0.1));
}
// lighthouse
const LIGHTHOUSE = { x: 62.5, z: 6 };
{
  const g = new THREE.Group(); g.position.set(LIGHTHOUSE.x, groundY(LIGHTHOUSE.x, LIGHTHOUSE.z), LIGHTHOUSE.z); scene.add(g);
  for (let i = 0; i < 5; i++) mesh(new THREE.CylinderGeometry(1.3 - i * 0.14 - 0.14, 1.3 - i * 0.14, 1.6, 12), mat(i % 2 ? 0xe86a6a : 0xffffff), 0, 0.8 + i * 1.6, 0, g);
  mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.2, 12), mat(0x4a4a5a), 0, 8.1, 0, g);
  const lampTop = mesh(new THREE.CylinderGeometry(0.55, 0.55, 1, 10), mat(0xfff2c0, { emissive: 0xffe08a, emissiveIntensity: 0.3 }), 0, 8.7, 0, g, false); lampBulbs.push(lampTop);
  const roof = mesh(new THREE.ConeGeometry(0.9, 0.9, 10), mat(0xe86a6a), 0, 9.6, 0, g);
  mesh(new THREE.BoxGeometry(0.7, 1.2, 0.1), mat(0x8a6a4a), -1.17, 0.6, 0, g).rotation.y = Math.PI / 2;
  colliders.push({ x: LIGHTHOUSE.x, z: LIGHTHOUSE.z, r: 1.5 });
}
// the oldest tree (giant pink tree in the pink forest)
const GIANT = { x: 34, z: 40 };
{
  const g = new THREE.Group(); g.position.set(GIANT.x, 0, GIANT.z); scene.add(g);
  mesh(new THREE.CylinderGeometry(0.7, 1.2, 5.5, 8), mat(0x8a5a38), 0, 2.75, 0, g);
  for (const [x, y, z, s] of [[0, 6.5, 0, 3], [2.2, 5.8, 0.8, 2], [-2, 6, -0.6, 2.1], [0.4, 8, -0.8, 2], [-0.8, 5.4, 2, 1.7], [1, 5.5, -2.2, 1.7]])
    mesh(new THREE.IcosahedronGeometry(s, 0), mat([0xffa6c4, 0xffb7cf, 0xff9dbd][Math.floor(Math.random() * 3)]), x, y, z, g);
  for (let i = 0; i < 4; i++) { const rt = mesh(new THREE.CylinderGeometry(0.15, 0.35, 1.8, 5), mat(0x8a5a38), 0, 0.2, 0, g); rt.rotation.set(0, (i / 4) * 6.28 + 0.4, 1.25); rt.position.set(Math.cos((i / 4) * 6.28 + 0.4) * 1.3, 0.2, -Math.sin((i / 4) * 6.28 + 0.4) * 1.3); }
  const petals = []; const r = rng(11);
  for (let i = 0; i < 40; i++) { const a = r() * 6.28, d = 2 + r() * 5; petals.push({ m: flatM(GIANT.x + Math.cos(a) * d, 0.02, GIANT.z + Math.sin(a) * d, 0.12 + r() * 0.1), c: 0xffb7cf }); }
  instanced(new THREE.CircleGeometry(1, 5), petals, { shadow: false });
  colliders.push({ x: GIANT.x, z: GIANT.z, r: 1.7 });
}

// tree stump with mushrooms in the middle of the pine forest
const STUMP = { x: -34, z: -38 };
{
  const g = new THREE.Group(); g.position.set(STUMP.x, 0, STUMP.z); scene.add(g);
  mesh(new THREE.CylinderGeometry(0.75, 0.9, 0.6, 9), mat(0x9b6b43), 0, 0.3, 0, g);
  mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.04, 9), mat(0xd9b48a), 0, 0.61, 0, g);
  for (const [x, z, s, c] of [[1.1, 0.4, 1, 0xe85d5d], [0.9, -0.6, 0.7, 0xe85d5d], [-1.0, 0.7, 0.8, 0xf0a35e], [-0.3, 1.2, 0.6, 0xe85d5d]]) {
    mesh(new THREE.CylinderGeometry(0.06 * s, 0.08 * s, 0.3 * s, 6), mat(0xfff1dd), x, 0.15 * s, z, g);
    const cap = mesh(new THREE.SphereGeometry(0.2 * s, 8, 6, 0, 6.29, 0, Math.PI / 2), mat(c), x, 0.28 * s, z, g);
    mesh(new THREE.SphereGeometry(0.035 * s, 5, 5), mat(0xffffff), x + 0.08 * s, 0.4 * s, z, g, false);
  }
  colliders.push({ x: STUMP.x, z: STUMP.z, r: 0.8 });
}

// benches
const benches = [
  { x: 0, z: 57.2, ry: 0 },                   // 북쪽 해변 (바다 보기)
  { x: -70.2, z: PIER.z, ry: -Math.PI / 2 },  // 부두 끝
  { x: POND.x, z: POND.z + 5.1, ry: Math.PI }, // 연못
];
{ const sp = houseLocal(-1.3, -0.6); benches.push({ x: sp.x, z: sp.z, ry: HOUSE.ry - Math.PI / 2, kind: 'sofa', indoor: true, seatY: 0.34, noMesh: true }); }
for (const b of benches) {
  b.y = groundY(b.x, b.z); b.f = new THREE.Vector3(Math.sin(b.ry), 0, Math.cos(b.ry)); b.r = new THREE.Vector3(Math.cos(b.ry), 0, -Math.sin(b.ry));
  if (b.noMesh) continue;
  const g = new THREE.Group(); g.position.set(b.x, b.y, b.z); g.rotation.y = b.ry; scene.add(g);
  mesh(new THREE.BoxGeometry(2.0, 0.1, 0.6), mat(0xc8875a), 0, 0.48, 0, g);
  mesh(new THREE.BoxGeometry(2.0, 0.5, 0.08), mat(0xc8875a), 0, 0.85, -0.3, g);
  for (const sx of [-0.85, 0.85]) for (const sz of [-0.22, 0.22]) mesh(new THREE.BoxGeometry(0.08, 0.48, 0.08), mat(0x6b4a3a), sx, 0.24, sz, g);
  colliders.push({ x: b.x - b.f.x * 0.1, z: b.z - b.f.z * 0.1, r: 0.35 });
}
function seatPos(bi, slot) { const b = benches[bi]; return new THREE.Vector3(b.x + b.r.x * (slot ? 0.45 : -0.45) - b.f.x * 0.05, b.y, b.z + b.r.z * (slot ? 0.45 : -0.45) - b.f.z * 0.05); }

// the letter: on the beach between two big rocks, walking along the shore from the lighthouse
const LETTER_DEG = -26, [lx, lz] = polar(LETTER_DEG, 62.2);
const letterSpot = new THREE.Vector3(lx, groundY(lx, lz), lz);
function rockPair(deg, r = 61.6, col = 0x8e949c) {
  const [a1, b1] = polar(deg - 2.2, r), [a2, b2] = polar(deg + 2.2, r);
  rock(a1, b1, 1.5, col); rock(a2, b2, 1.35, 0x9aa0a8); rock(...polar(deg + 4.5, r - 1.5), 0.5);
}
rockPair(LETTER_DEG);
for (const d of [40, 135, 205, 255, -70]) rockPair(d); // look-alike rock pairs

// forests & scatter
{
  const r = rng(42);
  const avoid = [[0, 0, 8], [HOUSE.x, HOUSE.z, 10], [POND.x, POND.z, 6.5], [0, 57, 4], [GIANT.x, GIANT.z, 4.2], [STUMP.x, STUMP.z, 3.2], [-59, 16, 4], [LIGHTHOUSE.x, LIGHTHOUSE.z, 4]];
  const ok = (x, z, gap) => Math.hypot(x, z) < R_GRASS - 2.5 && distToPaths(x, z) > 2.2 && !avoid.some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar) && !colliders.some(c => Math.hypot(c.x - x, c.z - z) < gap);
  const forest = (cx, cz, rad, n, pick, gap) => { let placed = 0, tries = 0; while (placed < n && tries++ < 4000) { const a = r() * 6.28, d = Math.sqrt(r()) * rad, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; if (!ok(x, z, gap)) continue; tree(x, z, pick(), 0.9 + r() * 0.6); placed++; } };
  forest(GIANT.x, GIANT.z, 14, 60, () => (r() < 0.7 ? 2 : 0), 2.3);       // 분홍 숲
  forest(-32, -34, 14, 60, () => (r() < 0.85 ? 1 : 0), 2.3);              // 소나무 숲
  forest(-38, 36, 10, 30, () => (r() < 0.5 ? 0 : 1), 2.6);                // 북서쪽 작은 숲
  forest(0, 0, 57, 140, () => { const v = r(); return v < 0.55 ? 0 : v < 0.93 ? 1 : 2; }, 3.6);
  buildTrees();
  for (let i = 0; i < 22; i++) { const d = r() * 360; palm(...polar(d, 61.5 + r() * 2), r() * 6); }
  for (let i = 0; i < 45; i++) { const a = r() * 6.28, d = 8 + r() * 50, x = Math.cos(a) * d, z = Math.sin(a) * d; if (!ok(x, z, 2.2)) continue; rock(x, z, 0.4 + r() * 0.6); }

  // flowers (instanced)
  const cols = [0xff8fab, 0xffd166, 0xffffff, 0xc3a6ff, 0xff9f6b], petals = [], stems = [];
  for (let tries = 0; petals.length < 900 && tries < 600; tries++) {
    const ca = r() * 6.28, cd = 6 + r() * 52, cx = Math.cos(ca) * cd, cz = Math.sin(ca) * cd, k = 5 + Math.floor(r() * 10), col = cols[Math.floor(r() * cols.length)];
    for (let j = 0; j < k; j++) {
      const x = cx + (r() - 0.5) * 3, z = cz + (r() - 0.5) * 3;
      if (Math.hypot(x, z) > R_GRASS - 1 || Math.hypot(x - HOUSE.x, z - HOUSE.z) < 9.5 || colliders.some(cc => Math.hypot(cc.x - x, cc.z - z) < cc.r + 0.3)) continue;
      petals.push({ m: new THREE.Matrix4().makeTranslation(x, 0.32, z), c: col }); stems.push({ m: new THREE.Matrix4().makeTranslation(x, 0.15, z), c: 0x4f9d45 });
    }
  }
  instanced(new THREE.IcosahedronGeometry(0.16, 0), petals); instanced(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 4), stems, { shadow: false });
}

/* ---------- hint notes (보물찾기 쪽지) ---------- */
const HINTS = [
  { pos: mailboxPos.clone(), text: '물 위에 동그란 잎사귀가\n떠 있는 곳에\n다음 쪽지를 놓아뒀어 🍃' },
  { pos: new THREE.Vector3(POND.x + 2.9, 0.08, POND.z - 2.7), text: '바다 쪽으로 길게 뻗은\n나무 길 끝,\n벤치 옆을 살펴봐 ⚓' },
  { pos: new THREE.Vector3(-71.4, 0.17, PIER.z - 0.85), text: '뾰족뾰족 초록 나무들이\n빽빽한 숲 한가운데,\n버섯이 자라는\n나무 그루터기를 찾아봐 🍄' },
  { pos: new THREE.Vector3(STUMP.x + 0.2, 0.62, STUMP.z - 0.1), text: '분홍 꽃이 가득한 숲 속에\n섬에서 제일 오래된\n커다란 나무가 있어.\n그 나무 밑동을 찾아봐 🌸' },
  { pos: new THREE.Vector3(GIANT.x - 1.9, 0.05, GIANT.z - 1.3), text: '하얀 등대에서\n해변을 따라 걷다 보면\n커다란 바위 두 개가\n나란히 있어.\n그 사이에 반짝이는 게\n숨어 있어 ✨' },
];
if (params.get('reset')) { store.set('hints', 0); store.set('letterFound', false); }
let hintProgress = clamp(store.get('hints', 0) | 0, 0, HINTS.length);
for (const h of HINTS) {
  const g = new THREE.Group(); g.position.copy(h.pos); scene.add(g); h.obj = g;
  const roll = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8), mat(0xfff5e0), 0, 0.1, 0, g); roll.rotation.z = Math.PI / 2;
  mesh(new THREE.TorusGeometry(0.105, 0.025, 5, 10), mat(0xff6f9c), 0, 0.1, 0, g).rotation.y = Math.PI / 2;
  const sg = new THREE.BufferGeometry(), sp = new Float32Array(8 * 3); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  h.spark = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xfff3a0, size: 0.12, transparent: true, opacity: 0.8, depthWrite: false })); g.add(h.spark);
  h.seed = Array.from({ length: 8 }, () => [Math.random() * 6.28, Math.random()]);
}
function refreshHints() {
  HINTS.forEach((h, i) => (h.obj.visible = i <= hintProgress));
  const el = document.getElementById('hintPill'); if (el) el.textContent = `🗒️ 쪽지 ${hintProgress}/${HINTS.length}`;
  if (typeof sparkle !== 'undefined') sparkle.visible = hintProgress >= HINTS.length;
}

/* ---------- hidden letter (bottle) ---------- */
const bottle = new THREE.Group(); bottle.position.copy(letterSpot); scene.add(bottle);
{
  const glass = new THREE.MeshStandardMaterial({ color: 0x9be7d8, transparent: true, opacity: 0.7, roughness: 0.1 });
  const b = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.7, 10), glass, 0, 0.22, 0, bottle); b.rotation.z = Math.PI / 2 - 0.2;
  const nk = mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.25, 8), glass, 0.45, 0.3, 0, bottle); nk.rotation.z = Math.PI / 2 - 0.2;
  const ck = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 6), mat(0xb5895a), 0.6, 0.33, 0, bottle); ck.rotation.z = Math.PI / 2 - 0.2;
  const paper = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.45, 8), mat(0xfff5e0), 0, 0.22, 0, bottle); paper.rotation.z = Math.PI / 2 - 0.2;
  const hb = mesh(new THREE.SphereGeometry(0.05, 6, 6), mat(0xff5c8a), 0, 0.34, 0, bottle);
  bottle.rotation.y = 0.8;
}
const sparkle = (() => {
  const g = new THREE.BufferGeometry(), N = 14, p = new Float32Array(N * 3);
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const s = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xfff3a0, size: 0.18, transparent: true, opacity: 0.9, depthWrite: false }));
  s.position.copy(letterSpot); scene.add(s); s.userData.seed = Array.from({ length: N }, () => [Math.random() * 6.28, Math.random(), Math.random() * 6.28]); return s;
})();

/* ---------- textures helpers ---------- */
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function labelTex(text, bg = 'rgba(255,250,243,0.92)', fg = '#4a3b35') {
  return canvasTex(256, 80, (ctx, w, h) => {
    ctx.font = '40px Jua, sans-serif'; const tw = Math.min(w - 8, ctx.measureText(text).width + 36);
    ctx.fillStyle = bg; roundRect(ctx, (w - tw) / 2, 8, tw, 62, 31); ctx.fill();
    ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, w / 2, 41);
  });
}
const emojiTexCache = {};
function emojiTex(e) {
  return emojiTexCache[e] ||= canvasTex(128, 128, (ctx) => {
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.arc(64, 58, 50, 0, 6.29); ctx.fill();
    ctx.beginPath(); ctx.moveTo(52, 100); ctx.lineTo(64, 124); ctx.lineTo(76, 100); ctx.fill();
    ctx.font = '62px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(e, 64, 62);
  });
}
const heartTex = canvasTex(64, 64, (ctx) => { ctx.font = '52px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('💗', 32, 36); });
const dotTex = canvasTex(32, 32, (ctx) => { const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 32, 32); });

/* =========================================================
   characters
   ========================================================= */
function makeAnimal(kind) {
  const isDog = kind === 'dog';
  const main = isDog ? 0xdba36b : 0xc9cbd8, light = isDog ? 0xfbe8cc : 0xffffff, dark = 0x3a2e2a;
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const legs = [];
  for (const [x, z] of [[-0.2, 0.18], [0.2, 0.18], [-0.2, -0.2], [0.2, -0.2]]) {
    const pivot = new THREE.Group(); pivot.position.set(x, 0.32, z); body.add(pivot);
    mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.32, 7), mat(main), 0, -0.16, 0, pivot);
    mesh(new THREE.SphereGeometry(0.1, 7, 6), mat(light), 0, -0.3, 0.02, pivot);
    legs.push(pivot);
  }
  const torso = mesh(new THREE.SphereGeometry(0.4, 12, 10), mat(main), 0, 0.55, 0, body); torso.scale.set(1, 0.85, 1.1);
  mesh(new THREE.SphereGeometry(0.28, 10, 8), mat(light), 0, 0.52, 0.2, body).scale.set(1, 0.9, 0.8);
  const head = new THREE.Group(); head.position.set(0, 1.08, 0.12); body.add(head);
  mesh(new THREE.SphereGeometry(0.42, 14, 12), mat(main), 0, 0, 0, head).scale.set(1.05, 0.95, 1);
  // face
  for (const s of [-1, 1]) {
    mesh(new THREE.SphereGeometry(0.055, 8, 8), mat(dark, { roughness: 0.4 }), s * 0.15, 0.05, 0.38, head, false);
    mesh(new THREE.SphereGeometry(0.018, 6, 6), mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.5 }), s * 0.15 + 0.015, 0.07, 0.43, head, false);
    const ch = mesh(new THREE.SphereGeometry(0.07, 8, 6), mat(0xffa8b8), s * 0.26, -0.07, 0.32, head, false); ch.scale.set(1, 0.6, 0.4);
  }
  if (isDog) {
    mesh(new THREE.SphereGeometry(0.17, 10, 8), mat(light), 0, -0.1, 0.36, head).scale.set(1.2, 0.85, 0.9);
    mesh(new THREE.SphereGeometry(0.06, 8, 6), mat(dark, { roughness: 0.3 }), 0, -0.03, 0.51, head, false);
    for (const s of [-1, 1]) { const e = mesh(new THREE.SphereGeometry(0.17, 8, 8), mat(0x9a6a42), s * 0.4, -0.02, -0.02, head); e.scale.set(0.5, 1.25, 0.8); e.rotation.z = s * 0.25; }
    // bandana
    const band = mesh(new THREE.TorusGeometry(0.27, 0.06, 6, 14), mat(0x5aa9e6), 0, 0.82, 0.05, body); band.rotation.x = Math.PI / 2;
    const tri = mesh(new THREE.ConeGeometry(0.16, 0.26, 3), mat(0x5aa9e6), 0, 0.72, 0.28, body); tri.rotation.x = Math.PI;
  } else {
    mesh(new THREE.SphereGeometry(0.12, 10, 8), mat(light), 0, -0.1, 0.36, head).scale.set(1.3, 0.8, 0.8);
    mesh(new THREE.SphereGeometry(0.04, 8, 6), mat(0xff8fab), 0, -0.04, 0.46, head, false);
    for (const s of [-1, 1]) {
      const e = mesh(new THREE.ConeGeometry(0.15, 0.3, 4), mat(main), s * 0.25, 0.38, -0.02, head); e.rotation.z = -s * 0.3;
      const ei = mesh(new THREE.ConeGeometry(0.08, 0.18, 4), mat(0xffc2d1), s * 0.24, 0.36, 0.04, head, false); ei.rotation.z = -s * 0.3;
      for (const w of [-1, 1]) { const wh = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.24, 3), mat(dark), s * 0.27, -0.08 + w * 0.03, 0.36, head, false); wh.rotation.z = Math.PI / 2 + s * w * 0.15; }
    }
    // bow
    const bow = new THREE.Group(); bow.position.set(0.22, 0.32, 0.12); bow.rotation.z = -0.4; head.add(bow);
    for (const s of [-1, 1]) { const w = mesh(new THREE.ConeGeometry(0.1, 0.18, 4), mat(0xff6f9c), s * 0.1, 0, 0, bow, false); w.rotation.z = s * Math.PI / 2; }
    mesh(new THREE.SphereGeometry(0.05, 6, 6), mat(0xff4f86), 0, 0, 0, bow, false);
  }
  // tail
  const tail = new THREE.Group(); tail.position.set(0, 0.55, -0.42); body.add(tail);
  if (isDog) { const t = mesh(new THREE.CapsuleGeometry(0.07, 0.25, 4, 6), mat(main), 0, 0.15, -0.05, tail); t.rotation.x = -0.6; }
  else { const t = mesh(new THREE.CapsuleGeometry(0.05, 0.6, 4, 6), mat(main), 0, 0.3, -0.1, tail); t.rotation.x = -0.35; mesh(new THREE.SphereGeometry(0.07, 6, 6), mat(light), 0, 0.62, -0.22, tail); }

  // labels
  const name = CONFIG.players[kind].name;
  const tagN = labelTex(name), tagS = labelTex('🎙️ ' + name, 'rgba(255,214,228,0.95)');
  const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagN, depthTest: false, transparent: true }));
  tag.scale.set(1.6, 0.5, 1); tag.position.y = 1.9; tag.renderOrder = 10; root.add(tag);
  const bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTex('❤️'), depthTest: false, transparent: true }));
  bubble.scale.set(0.8, 0.8, 1); bubble.position.y = 2.6; bubble.visible = false; bubble.renderOrder = 11; root.add(bubble);
  scene.add(root);
  root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { kind, root, body, head, legs, tail, tag, tagN, tagS, bubble, bubbleUntil: 0, phase: 0, speaking: false };
}
function animateAnimal(a, dt, t, moving, running, sitting) {
  a.phase += dt * (moving ? (running ? 14 : 9) : 0);
  const sw = moving ? Math.sin(a.phase) * 0.7 : 0;
  if (sitting) { a.legs[0].rotation.x = a.legs[1].rotation.x = -1.4; a.legs[2].rotation.x = a.legs[3].rotation.x = -1.5; a.body.position.y = 0.05; a.body.rotation.x = -0.08; }
  else {
    a.legs[0].rotation.x = sw; a.legs[3].rotation.x = sw; a.legs[1].rotation.x = -sw; a.legs[2].rotation.x = -sw;
    a.body.position.y = moving ? Math.abs(Math.sin(a.phase)) * 0.07 : Math.sin(t * 2) * 0.012; a.body.rotation.x = 0;
  }
  a.tail.rotation.y = Math.sin(t * (a.kind === 'dog' ? 12 : 3)) * (a.kind === 'dog' ? 0.6 : 0.3);
  a.head.rotation.z = moving ? 0 : Math.sin(t * 1.3) * 0.05;
  const map = a.speaking ? a.tagS : a.tagN; if (a.tag.material.map !== map) { a.tag.material.map = map; a.tag.material.needsUpdate = true; }
  if (a.bubble.visible) { const left = a.bubbleUntil - t; a.bubble.position.y = 2.6 + Math.sin(t * 5) * 0.05; if (left <= 0) a.bubble.visible = false; }
}
function showEmote(a, idx) {
  const e = EMOTES[idx]; if (!e) return;
  a.bubble.material.map = emojiTex(e); a.bubble.material.needsUpdate = true; a.bubble.visible = true; a.bubbleUntil = clock.elapsedTime + 2.6;
  if (idx === 0) for (let i = 0; i < 6; i++) spawnHeart(a.root.position, 0.4);
}
const EMOTES = ['❤️', '😆', '👋', '😴'];

/* ---------- hearts ---------- */
const hearts = [];
function spawnHeart(pos, spread = 0.3, y = 1.4) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: heartTex, transparent: true, depthWrite: false }));
  s.position.set(pos.x + (Math.random() - 0.5) * spread * 2, pos.y + y, pos.z + (Math.random() - 0.5) * spread * 2);
  s.scale.setScalar(0.35 + Math.random() * 0.2); s.userData = { life: 0, vy: 0.7 + Math.random() * 0.5, ph: Math.random() * 6 };
  scene.add(s); hearts.push(s);
}
function updateHearts(dt) {
  for (let i = hearts.length - 1; i >= 0; i--) {
    const h = hearts[i], u = h.userData; u.life += dt;
    h.position.y += u.vy * dt; h.position.x += Math.sin(u.life * 3 + u.ph) * dt * 0.3;
    h.material.opacity = 1 - u.life / 2.2;
    if (u.life > 2.2) { scene.remove(h); h.material.dispose(); hearts.splice(i, 1); }
  }
}

/* =========================================================
   celebrations (anniversary / birthday)
   ========================================================= */
const fireworks = [];
let celebrating = false, bdayWho = null;
function launchFirework() {
  const N = 90, g = new THREE.BufferGeometry(), pos = new Float32Array(N * 3), vel = [];
  const cx = (Math.random() - 0.5) * 90, cy = 26 + Math.random() * 16, cz = 92 + Math.random() * 20;
  for (let i = 0; i < N; i++) {
    pos.set([cx, cy, cz], i * 3);
    const th = Math.random() * 6.28, ph = Math.acos(2 * Math.random() - 1), sp = 7 + Math.random() * 2;
    vel.push(new THREE.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)).multiplyScalar(sp));
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const col = [0xff8fab, 0xffd166, 0x8fd8c0, 0xc3a6ff, 0xffffff][Math.floor(Math.random() * 5)];
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: col, size: 1.8, map: dotTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  p.userData = { vel, life: 0 }; scene.add(p); fireworks.push(p);
}
function updateFireworks(dt) {
  for (let i = fireworks.length - 1; i >= 0; i--) {
    const f = fireworks[i], u = f.userData, a = f.geometry.attributes.position; u.life += dt;
    for (let k = 0; k < u.vel.length; k++) { const v = u.vel[k]; v.multiplyScalar(1 - dt * 1.4); v.y -= 4 * dt; a.array[k * 3] += v.x * dt; a.array[k * 3 + 1] += v.y * dt; a.array[k * 3 + 2] += v.z * dt; }
    a.needsUpdate = true; f.material.opacity = 1 - u.life / 2.4;
    if (u.life > 2.4) { scene.remove(f); f.geometry.dispose(); f.material.dispose(); fireworks.splice(i, 1); }
  }
}
const balloons = [];
function setupCelebration(events) {
  if (!events.length) return;
  celebrating = true;
  const banner = $('#banner'); banner.textContent = events.map(e => e.text).join('  ·  '); banner.classList.remove('hidden');
  const bd = events.find(e => e.kind === 'bday');
  if (bd) {
    bdayWho = bd.who;
    // cake on a table at plaza
    const g = new THREE.Group(); g.position.set(-2.2, 0, -1.5); scene.add(g);
    mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.08, 16), mat(0xffffff), 0, 0.8, 0, g);
    mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.8, 8), mat(0xb5895a), 0, 0.4, 0, g);
    mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 16), mat(0xfff1e0), 0, 1.0, 0, g);
    mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.08, 16), mat(0xff8fab), 0, 1.12, 0, g);
    mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 16), mat(0xfff1e0), 0, 1.27, 0, g);
    mesh(new THREE.SphereGeometry(0.07, 6, 6), mat(0xe63950), 0, 1.42, 0, g);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * 6.28; mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 5), mat(0x8fd8c0), Math.cos(a) * 0.22, 1.48, Math.sin(a) * 0.22, g);
      const fl = mesh(new THREE.SphereGeometry(0.035, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffc040 }), Math.cos(a) * 0.22, 1.62, Math.sin(a) * 0.22, g, false); fl.userData.flame = true;
    }
    g.userData.cake = true; balloons.push(g);
    colliders.push({ x: -2.2, z: -1.5, r: 0.7 });
    const cols = [0xff8fab, 0xffd166, 0x8fd8c0, 0xc3a6ff, 0x7cc7ff];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * 6.28, bx = Math.cos(a) * 4.6, bz = Math.sin(a) * 4.6, bg = new THREE.Group(); bg.position.set(bx, 0, bz); scene.add(bg);
      const s = mesh(new THREE.SphereGeometry(0.38, 12, 10), mat(cols[i % 5], { roughness: 0.4 }), 0, 3.2, 0, bg); s.scale.y = 1.15;
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 2.8, 0)]), new THREE.LineBasicMaterial({ color: 0xffffff })); bg.add(line);
      bg.userData.ph = Math.random() * 6; balloons.push(bg);
    }
  }
}

/* =========================================================
   state
   ========================================================= */
const me = { kind: null, a: null, pos: new THREE.Vector3(0, 0, 4), ry: Math.PI, moving: false, running: false, sit: null, lie: null, holding: false, emote: -1 };
const partner = { kind: null, a: null, pos: new THREE.Vector3(), target: new THREE.Vector3(), ry: 0, tRy: 0, moving: false, running: false, sit: null, lie: null, lieRoll: 0, toss: 0, holding: false, present: false, lastSeen: 0 };
let holdReqFrom = 0; // time until which partner's request is valid
let modalOpen = false;
const otherKind = (k) => (k === 'dog' ? 'cat' : 'dog');
const myName = () => CONFIG.players[me.kind].name;
const partnerName = () => CONFIG.players[otherKind(me.kind)].name;

/* ---------- input ---------- */
const keys = {};
addEventListener('keydown', (e) => {
  if (!me.a) return;
  keys[e.code] = true;
  if (modalOpen) { if (['KeyE', 'Space', 'Escape', 'Enter'].includes(e.code)) closeLetter(); return; }
  if (e.code === 'KeyE' || e.code === 'Space') { e.preventDefault(); interact(); }
  if (me.lie && !e.repeat) { if (e.code === 'KeyA' || e.code === 'ArrowLeft') toss(-1); if (e.code === 'KeyD' || e.code === 'ArrowRight') toss(1); }
  if (/^Digit[1-4]$/.test(e.code)) doEmote(+e.code.slice(5) - 1);
  if (e.code === 'KeyM') toggleMic();
  if (e.code === 'KeyP') takePhoto();
  if (e.code === 'KeyR') toggleRec();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
let camYaw = 0, camZoom = 1;
const joy = { x: 0, y: 0, id: null };
{
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => { drag = { id: e.pointerId, x: e.clientX }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => { if (drag && drag.id === e.pointerId) { camYaw -= (e.clientX - drag.x) * 0.006; drag.x = e.clientX; camYawTo = null; } });
  const end = (e) => { if (drag && drag.id === e.pointerId) drag = null; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('wheel', (e) => { camZoom = clamp(camZoom + e.deltaY * 0.001, 0.55, 1.7); }, { passive: true });
  const base = $('#joy'), knob = $('#knob');
  const upd = (e) => { const r = base.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), d = Math.hypot(dx, dy), m = r.width / 2 - 10, k = d > m ? m / d : 1; joy.x = (dx * k) / m; joy.y = (dy * k) / m; knob.style.transform = `translate(${dx * k}px,${dy * k}px)`; };
  base.addEventListener('pointerdown', (e) => { joy.id = e.pointerId; base.setPointerCapture(e.pointerId); upd(e); });
  base.addEventListener('pointermove', (e) => { if (joy.id === e.pointerId) upd(e); });
  const jend = (e) => { if (joy.id === e.pointerId) { joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; } };
  base.addEventListener('pointerup', jend); base.addEventListener('pointercancel', jend);
}
if (matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window) document.body.classList.add('touch');

/* ---------- toast / ui ---------- */
let toastTimer = 0;
function toast(msg, ms = 2600) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms); }
function setStatus(msg, ok = false) { const s = $('#status'); s.textContent = msg; s.classList.toggle('ok', ok); }

/* =========================================================
   interactions
   ========================================================= */
function nearestBench() {
  let best = -1, bd = 2.4;
  benches.forEach((b, i) => { const d = Math.hypot(b.x - me.pos.x, b.z - me.pos.z); if (d < bd) { bd = d; best = i; } });
  return best;
}
function partnerDist() { return partner.present ? Math.hypot(partner.pos.x - me.pos.x, partner.pos.z - me.pos.z) : Infinity; }
function currentAction() {
  if (me.lie) return { icon: '🚶', text: document.body.classList.contains('touch') ? '일어나기 · 조이스틱 좌우로 뒤척뒤척' : '일어나기 · A/D 뒤척이기', fn: standUpBed };
  if (me.sit) return { icon: '🚶', text: '일어나기', fn: standUp };
  if (me.holding) return { icon: '🫳', text: '손 놓기', fn: () => { releaseHold(true); } };
  if (holdReqFrom > clock.elapsedTime && partnerDist() < 3.5) return { icon: '🤝', text: `${nick(partnerName())} 손 잡기 💕`, fn: acceptHold };
  const hi = HINTS.findIndex((h, i) => i <= hintProgress && Math.hypot(h.pos.x - me.pos.x, h.pos.z - me.pos.z) < 2.3);
  if (hi >= 0) return { icon: '🗒️', text: `쪽지 읽기 (${hi + 1}/${HINTS.length})`, fn: () => openHint(hi) };
  if (Math.hypot(letterSpot.x - me.pos.x, letterSpot.z - me.pos.z) < 2.2) return { icon: '💌', text: '반짝이는 병 열어보기', fn: openLetter };
  if (insideHouse(me.pos.x, me.pos.z)) {
    const [lx, lz] = toHouseLocal(me.pos.x, me.pos.z);
    if (Math.hypot(lx + 4.6, lz + 0.6) < 1.7) return { icon: '🪵', text: '장작 넣기 🔥', fn: addLog };
    if (Math.max(Math.abs(lx - BED.x) - BED.hx, Math.abs(lz - BED.z) - BED.hz) < 1.1) return { icon: '🛏️', text: '침대에 눕기', fn: lieDown };
  }
  const bi = nearestBench(); if (bi >= 0) return benches[bi].kind === 'sofa' ? { icon: '🛋️', text: '소파에 앉기', fn: () => sitDown(bi) } : { icon: '🪑', text: '벤치에 앉기', fn: () => sitDown(bi) };
  if (partnerDist() < 2.6) return { icon: '🤝', text: `${nick(partnerName())}에게 손 내밀기`, fn: requestHold };
  return null;
}
function interact() { const a = currentAction(); if (a) a.fn(); }

let myReqUntil = 0;
function requestHold() { myReqUntil = clock.elapsedTime + 10; send({ t: 'holdReq' }); toast(`${nick(partnerName())}에게 손을 내밀었어요 🤝`); }
function acceptHold() { holdReqFrom = 0; setHolding(true); send({ t: 'holdAccept' }); }
function setHolding(v) {
  me.holding = v;
  if (v) { toast('손을 잡았어요 💕'); for (let i = 0; i < 8; i++) spawnHeart(me.pos.clone().lerp(partner.pos, 0.5), 0.5, 1.2); }
}
function releaseHold(notify) { if (!me.holding) return; me.holding = false; if (notify) send({ t: 'holdRelease' }); }

function sitDown(bi) {
  const taken = partner.present && partner.sit && partner.sit[0] === bi ? partner.sit[1] : -1;
  const p0 = seatPos(bi, 0), p1 = seatPos(bi, 1);
  let slot = me.pos.distanceTo(p0) < me.pos.distanceTo(p1) ? 0 : 1; if (slot === taken) slot = 1 - slot;
  releaseHold(true);
  me.sit = [bi, slot]; me.pos.copy(seatPos(bi, slot)); me.ry = benches[bi].ry;
  if (partner.sit && partner.sit[0] === bi) togetherOnBench();
}
function standUp() { const b = benches[me.sit[0]]; me.pos.set(me.pos.x + b.f.x * 0.9, 0, me.pos.z + b.f.z * 0.9); me.sit = null; }
function lieDown() {
  const taken = partner.present && partner.lie ? partner.lie.slot : -1;
  const d0 = me.pos.distanceTo(bedSlotPos(0)), d1 = me.pos.distanceTo(bedSlotPos(1));
  let slot = d0 < d1 ? 0 : 1; if (slot === taken) slot = 1 - slot;
  releaseHold(true); me.sit = null;
  me.lie = { slot, rollT: 0, roll: 0, toss: 0, idle: 0 }; me.pos.copy(bedSlotPos(slot));
  if (partner.present && partner.lie) bothInBed();
}
function standUpBed() { const slot = me.lie.slot; me.lie = null; me.pos.copy(houseLocal(BED.x + (slot ? 0.55 : -0.55), BED.z + BED.hz + 0.75)); me.ry = HOUSE.ry; }
function toss(dir) {
  const L = me.lie; if (!L) return;
  const nt = clamp(L.rollT + dir, -1, 1);
  if (nt === L.rollT) L.rollT = -L.rollT || dir; else L.rollT = nt;   // at the edge: roll over to the other side
  L.toss = 0.5; L.idle = 0;
  if (facingEachOther()) { toast('💕 서로 마주 보는 중', 1800); for (let i = 0; i < 6; i++) spawnHeart(me.pos.clone().lerp(partner.pos, 0.5), 0.3, 0.5); }
}
function facingEachOther() {
  if (!me.lie || !partner.present || !partner.lie) return false;
  const mine = me.lie.rollT, theirs = partner.lie.rollT;
  return me.lie.slot === 0 ? mine > 0 && theirs < 0 : mine < 0 && theirs > 0;
}
function bothInBed() { toast('🛏️ 같이 누웠어요 💕', 2600); for (let i = 0; i < 10; i++) setTimeout(() => spawnHeart(me.pos.clone().lerp(partner.pos, 0.5), 0.4, 0.6), i * 120); }
let fireBoost = 0;
function addLog(remote) {
  fireBoost = 8; if (!remote) { send({ t: 'fire' }); toast('🔥 타닥타닥...', 1600); }
  for (let i = 0; i < 18; i++) spawnEmber(true);
}
function togetherOnBench() {
  const h = currentHour();
  if (me.sit && benches[me.sit[0]].kind === 'sofa') { toast('🔥 같이 불멍 중...', 3500); for (let i = 0; i < 10; i++) setTimeout(() => spawnHeart(me.pos.clone().lerp(partner.pos, 0.5), 0.4, 1.3), i * 150); return; }
  toast(h >= 17 && h < 19.5 ? '🌅 같이 노을 보는 중...' : night > 0.5 ? '🌙 같이 별 보는 중...' : '🌊 같이 바다 보는 중...', 3500);
  for (let i = 0; i < 10; i++) setTimeout(() => spawnHeart(me.pos.clone().lerp(partner.pos, 0.5), 0.4, 1.3), i * 150);
}

/* ---------- letter ---------- */
function openLetter() {
  const L = CONFIG.letter, to = CONFIG.players[L.to].name, from = CONFIG.players[L.from].name, paper = $('#paper');
  const showLetter = () => {
    paper.innerHTML = `<div class="to">To. ${to}</div><div class="body"></div><div class="from">From. ${from} 🐾</div><button id="lc">닫기</button>`;
    paper.querySelector('.body').textContent = L.text; paper.querySelector('#lc').onclick = closeLetter;
  };
  if (me.kind === L.to) {
    showLetter();
    if (!store.get('letterFound', false)) { store.set('letterFound', true); send({ t: 'letter' }); }
    for (let i = 0; i < 14; i++) setTimeout(() => spawnHeart(me.pos, 0.6), i * 90);
  } else {
    paper.innerHTML = `<div class="secret">🤫 이건 ${nick(to)}를 위한 편지예요.<br>${nick(to)}가 찾을 때까지 비밀!<small>(편지 내용은 CONFIG.letter에서 바꿀 수 있어요)</small></div><button id="lc">알겠어요</button><button class="ghost" id="lp">살짝 미리보기</button>`;
    paper.querySelector('#lc').onclick = closeLetter; paper.querySelector('#lp').onclick = showLetter;
  }
  $('#letter').classList.remove('hidden'); modalOpen = true;
}
function openHint(i) {
  const paper = $('#paper'), last = i === HINTS.length - 1;
  paper.innerHTML = `<div class="to">🗒️ 쪽지 ${i + 1} / ${HINTS.length}</div><div class="body hint"></div><div class="from">${last ? '거의 다 왔어! 💕' : '다음 쪽지를 찾아봐!'}</div><button id="lc">닫기</button>`;
  paper.querySelector('.body').textContent = HINTS[i].text; paper.querySelector('#lc').onclick = closeLetter;
  $('#letter').classList.remove('hidden'); modalOpen = true;
  if (i + 1 > hintProgress) { setHintProgress(i + 1); send({ t: 'hint', n: hintProgress }); for (let k = 0; k < 6; k++) spawnHeart(me.pos, 0.5); }
}
function setHintProgress(n) { hintProgress = clamp(Math.max(hintProgress, n | 0), 0, HINTS.length); store.set('hints', hintProgress); refreshHints(); }
function openHintList() {
  if (modalOpen) return;
  const paper = $('#paper');
  const list = HINTS.slice(0, hintProgress).map((h, i) => `<div class="hl"><b>쪽지 ${i + 1}</b><span></span></div>`).join('');
  paper.innerHTML = `<div class="to">🗒️ 찾은 쪽지 ${hintProgress} / ${HINTS.length}</div>${hintProgress ? list : '<div class="secret" style="margin:18px 0">아직 찾은 쪽지가 없어요.<small>집 앞 우편함부터 살펴봐요 📮</small></div>'}<button id="lc">닫기</button>`;
  paper.querySelectorAll('.hl span').forEach((el, i) => (el.textContent = HINTS[i].text.replace(/\n/g, ' ')));
  paper.querySelector('#lc').onclick = closeLetter;
  $('#letter').classList.remove('hidden'); modalOpen = true;
}
$('#hintPill').addEventListener('click', openHintList);
function closeLetter() { $('#letter').classList.add('hidden'); modalOpen = false; }
$('#letter').addEventListener('click', (e) => { if (e.target.id === 'letter') closeLetter(); });

/* ---------- emotes / photo ---------- */
function doEmote(i) { showEmote(me.a, i); send({ t: 'emote', i }); }
document.querySelectorAll('[data-emote]').forEach(b => b.addEventListener('click', () => doEmote(+b.dataset.emote)));
function takePhoto() {
  me.a.tag.visible = false; if (partner.a) partner.a.tag.visible = false;
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  me.a.tag.visible = true; if (partner.a) partner.a.tag.visible = true;
  const a = document.createElement('a'); const d = new Date();
  a.href = url; a.download = `우리의섬_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}_${d.getHours()}${d.getMinutes()}.png`; a.click();
  toast('📸 찰칵! 사진을 저장했어요');
}
$('#photoBtn').addEventListener('click', takePhoto);

/* ---------- recording (gameplay + voice -> file on this computer) ----------
   둘 다 볼 수 있게 작은 '녹화 중' 표시가 켜져요. */
let recorder = null, recChunks = [], recOn = false, partnerRec = false;
function recSupported() { return typeof MediaRecorder !== 'undefined' && !!canvas.captureStream; }
function updateRecUI() {
  const dot = $('#recDot');
  if (recOn) { dot.textContent = '녹화 중'; dot.classList.remove('hidden', 'partner'); }
  else if (partnerRec) { dot.textContent = '함께 녹화 중'; dot.classList.remove('hidden'); dot.classList.add('partner'); }
  else dot.classList.add('hidden');
  $('#recBtn').classList.toggle('on', recOn);
}
function startRec() {
  if (recorder || !recSupported()) { if (!recSupported()) toast('이 브라우저에서는 녹화를 지원하지 않아요'); return; }
  try {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    const vstream = canvas.captureStream(30);
    const tracks = [...vstream.getVideoTracks()];
    if (audioCtx) {
      const dest = audioCtx.createMediaStreamDestination();
      let any = false;
      if (localStream) { try { audioCtx.createMediaStreamSource(localStream).connect(dest); any = true; } catch {} }
      if (remoteAudio.srcObject) { try { audioCtx.createMediaStreamSource(remoteAudio.srcObject).connect(dest); any = true; } catch {} }
      if (any) tracks.push(...dest.stream.getAudioTracks());
    }
    const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m)) || 'video/webm';
    recorder = new MediaRecorder(new MediaStream(tracks), { mimeType: mime, videoBitsPerSecond: 5e6 });
    recChunks = [];
    recorder.ondataavailable = (e) => { if (e.data && e.data.size) recChunks.push(e.data); };
    recorder.onstop = saveRec;
    recorder.start(1000);
    recOn = true; send({ t: 'rec', on: 1 }); updateRecUI();
    toast('⏺️ 녹화를 시작했어요', 1600);
  } catch (e) { recorder = null; toast('녹화를 시작할 수 없어요'); }
}
function stopRec() { if (recorder) { try { recorder.stop(); } catch {} } }
function saveRec() {
  const blob = new Blob(recChunks, { type: 'video/webm' });
  recChunks = []; recorder = null; recOn = false; send({ t: 'rec', on: 0 }); updateRecUI();
  if (!blob.size) return;
  const d = new Date(), pad = (n) => String(n).padStart(2, '0');
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `우리의섬_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}.webm`;
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 15000);
}
function toggleRec() { if (recorder) stopRec(); else startRec(); }
$('#recBtn').addEventListener('click', toggleRec);
addEventListener('beforeunload', () => { if (recorder) try { recorder.stop(); } catch {} });
$('#actBtn').addEventListener('click', () => { if (modalOpen) closeLetter(); else interact(); });

/* =========================================================
   voice
   ========================================================= */
let localStream = null, micOn = store.get('micOn', true), audioCtx = null, localAn = null, remoteAn = null;
const remoteAudio = new Audio(); remoteAudio.autoplay = true; remoteAudio.playsInline = true;
async function initMic() {
  try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
  if (!navigator.mediaDevices?.getUserMedia) return;
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    localStream.getAudioTracks().forEach(t => (t.enabled = micOn));
    localAn = analyser(localStream);
  } catch (e) { localStream = null; toast('마이크 없이 들어왔어요 (목소리는 들을 수 있어요)'); }
  updateMicBtn();
}
function analyser(stream) {
  if (!audioCtx) return null;
  try { const src = audioCtx.createMediaStreamSource(stream), an = audioCtx.createAnalyser(); an.fftSize = 512; src.connect(an); return { an, buf: new Uint8Array(an.fftSize) }; } catch { return null; }
}
function level(A) { if (!A) return 0; A.an.getByteTimeDomainData(A.buf); let s = 0; for (const v of A.buf) { const x = (v - 128) / 128; s += x * x; } return Math.sqrt(s / A.buf.length); }
function silentStream() {
  try { const ctx = audioCtx || new AudioContext(), d = ctx.createMediaStreamDestination(); return d.stream; } catch { return new MediaStream(); }
}
function toggleMic() {
  if (!localStream) { toast('마이크를 사용할 수 없어요 (브라우저 권한을 확인해 주세요)'); return; }
  micOn = !micOn; store.set('micOn', micOn); localStream.getAudioTracks().forEach(t => (t.enabled = micOn)); updateMicBtn();
  toast(micOn ? '🎙️ 마이크 켜짐' : '🔇 마이크 꺼짐', 1400);
}
function updateMicBtn() { const b = $('#micBtn'); b.textContent = localStream && micOn ? '🎙️' : '🔇'; b.classList.toggle('off', !(localStream && micOn)); }
$('#micBtn').addEventListener('click', toggleMic);

/* =========================================================
   networking (PeerJS / WebRTC)
   먼저 들어온 사람이 섬(호스트)을 열고, 다음 사람은 자동으로 접속
   ========================================================= */
const ROOM = params.get('room') || CONFIG.room;
const HOST_ID = ('ourisland-' + ROOM + '-host').replace(/[^a-zA-Z0-9-]/g, '');
let peer = null, conn = null, mediaCall = null, isHost = false, solo = false, netGen = 0, retryTimer = 0;
function peerOpts() {
  const p = params.get('peer');
  if (p) { const [host, port] = p.split(':'); return { host, port: +port || 9000, path: '/', secure: location.protocol === 'https:', debug: 1, config: { iceServers: [] } }; }
  return { debug: 1 };
}
function send(msg) { if (conn && conn.open) { try { conn.send(msg); } catch {} } }
function scheduleRetry(ms) { clearTimeout(retryTimer); retryTimer = setTimeout(startNet, ms + Math.random() * 1200); }
function startNet() {
  if (solo) return;
  const gen = ++netGen;
  try { peer && peer.destroy(); } catch {}
  isHost = false; setStatus('섬에 연결하는 중...');
  const p = (peer = new Peer(HOST_ID, peerOpts()));
  p.on('open', () => { if (gen !== netGen) return; isHost = true; if (!partner.present) setStatus(`💭 ${nick(partnerName())} 기다리는 중`); });
  p.on('connection', (c) => { if (gen !== netGen) return; bindConn(c, gen); });
  p.on('call', (c) => { if (gen !== netGen) return; answerCall(c); });
  p.on('disconnected', () => { if (gen === netGen && !p.destroyed) { try { p.reconnect(); } catch {} } });
  p.on('error', (err) => {
    if (gen !== netGen) return;
    if (err.type === 'unavailable-id') becomeGuest();
    else if (err.type === 'peer-unavailable') { /* handled in guest */ }
    else { console.warn('peer error', err.type, err); setStatus('연결이 불안정해요. 다시 시도 중...'); scheduleRetry(3000); }
  });
}
function becomeGuest() {
  const gen = ++netGen;
  try { peer && peer.destroy(); } catch {}
  isHost = false; setStatus(`${nick(partnerName())}의 섬에 놀러 가는 중...`);
  const p = (peer = new Peer(undefined, peerOpts()));
  p.on('open', () => {
    if (gen !== netGen) return;
    const c = p.connect(HOST_ID, { reliable: true, serialization: 'json' });
    bindConn(c, gen);
    setTimeout(() => { if (gen === netGen && !c.open) { try { c.close(); } catch {} scheduleRetry(500); } }, 10000);
  });
  p.on('call', (c) => { if (gen === netGen) answerCall(c); });
  p.on('error', (err) => { if (gen !== netGen) return; console.warn('guest error', err.type); scheduleRetry(err.type === 'peer-unavailable' ? 300 : 2500); });
}
function bindConn(c, gen) {
  c.on('open', () => {
    if (gen !== netGen) { c.close(); return; }
    if (conn && conn !== c) { try { conn.close(); } catch {} }
    conn = c;
    send({ t: 'hi', kind: me.kind, hints: hintProgress });
    if (!isHost) { // guest starts the voice call
      const call = peer.call(HOST_ID, localStream || silentStream());
      if (call) bindCall(call);
    }
  });
  c.on('data', onData);
  c.on('close', () => { if (conn === c) onPartnerLeft(); });
  c.on('error', () => { if (conn === c) onPartnerLeft(); });
}
function answerCall(c) { c.answer(localStream || silentStream()); bindCall(c); }
function bindCall(c) {
  if (mediaCall && mediaCall !== c) { try { mediaCall.close(); } catch {} }
  mediaCall = c;
  c.on('stream', (s) => {
    remoteAudio.srcObject = s; remoteAudio.play().catch(() => toast('화면을 한 번 눌러 주세요 (소리 재생)'));
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    remoteAn = analyser(s);
  });
}
function onPartnerLeft() {
  if (!partner.present && !conn) return;
  conn = null; partner.present = false; me.holding = false; holdReqFrom = 0; remoteAn = null; partnerRec = false; updateRecUI();
  if (mediaCall) { try { mediaCall.close(); } catch {} mediaCall = null; }
  if (partner.a) partner.a.root.visible = false;
  toast(`${nick(partnerName())}가 섬을 떠났어요 👋`);
  if (isHost) setStatus(`💭 ${nick(partnerName())} 기다리는 중`); else scheduleRetry(1500);
}
function onData(m) {
  if (!m || typeof m !== 'object') return;
  partner.lastSeen = clock.elapsedTime;
  switch (m.t) {
    case 'hi': {
      const k = m.kind === 'dog' || m.kind === 'cat' ? m.kind : otherKind(me.kind);
      if (!partner.a || partner.kind !== k) { if (partner.a) scene.remove(partner.a.root); partner.kind = k; partner.a = makeAnimal(k); }
      partner.a.root.visible = true; partner.present = true; partner.sit = null; partner.lie = null; partner.holding = false;
      const nm = CONFIG.players[k].name;
      setStatus(`💞 ${nick(nm)}와 함께`, true); toast(`${subj(nm)} 섬에 왔어요! 💕`);
      if (m.kind === me.kind) toast('둘 다 같은 캐릭터로 들어왔어요! 한 명이 다시 골라 주세요 🙈', 5000);
      send({ t: 'hi2', kind: me.kind, hints: hintProgress }); if ((m.hints | 0) > hintProgress) setHintProgress(m.hints);
      break;
    }
    case 'hi2': {
      if ((m.hints | 0) > hintProgress) setHintProgress(m.hints);
      const k = m.kind === 'dog' || m.kind === 'cat' ? m.kind : otherKind(me.kind);
      if (!partner.a || partner.kind !== k) { if (partner.a) scene.remove(partner.a.root); partner.kind = k; partner.a = makeAnimal(k); }
      partner.a.root.visible = true; partner.present = true;
      setStatus(`💞 ${nick(CONFIG.players[k].name)}와 함께`, true); toast(`${nick(CONFIG.players[k].name)}의 섬에 왔어요! 💕`);
      break;
    }
    case 's':
      if (!partner.a) return;
      partner.target.set(+m.x || 0, 0, +m.z || 0); partner.tRy = +m.ry || 0; partner.moving = !!m.mv; partner.running = !!m.rn;
      partner.sit = Array.isArray(m.sit) ? m.sit : null; partner.holding = !!m.hd;
      { const wasLying = !!partner.lie, L = Array.isArray(m.lie) ? { slot: m.lie[0] ? 1 : 0, rollT: clamp(m.lie[1] | 0, -1, 1) } : null;
        if (L && partner.lie && L.rollT !== partner.lie.rollT) partner.toss = 0.5;
        const turned = L && partner.lie && L.rollT !== partner.lie.rollT;
        partner.lie = L; if (L && !wasLying && me.lie) bothInBed();
        if (turned && facingEachOther()) { toast('💕 서로 마주 보는 중', 1800); for (let i = 0; i < 6; i++) spawnHeart(me.pos.clone().lerp(partner.pos, 0.5), 0.3, 0.5); } }
      if (!partner.seen) { partner.pos.copy(partner.target); partner.ry = partner.tRy; partner.seen = true; }
      break;
    case 'emote': if (partner.a) showEmote(partner.a, m.i | 0); break;
    case 'holdReq': if (myReqUntil > clock.elapsedTime && !me.holding) { myReqUntil = 0; acceptHold(); break; } holdReqFrom = clock.elapsedTime + 10; toast(`💕 ${subj(partnerName())} 손을 내밀었어요! (E로 잡기)`, 4000); break;
    case 'holdAccept': setHolding(true); break;
    case 'holdRelease': me.holding = false; break;
    case 'hint': if ((m.n | 0) > hintProgress) { setHintProgress(m.n); toast(`🗒️ ${subj(partnerName())} 쪽지 ${hintProgress}을 찾았어요!`, 3500); } break;
    case 'letter': toast(`💌 ${subj(partnerName())} 숨겨진 편지를 찾았어요!`, 4000); break;
    case 'fire': addLog(true); break;
    case 'rec': partnerRec = !!(m.on | 0); updateRecUI(); break;
  }
}
let sendAcc = 0;
function netTick(dt) {
  sendAcc += dt; if (sendAcc < 1 / 15) return; sendAcc = 0;
  send({ t: 's', x: +me.pos.x.toFixed(3), z: +me.pos.z.toFixed(3), ry: +me.ry.toFixed(3), mv: me.moving ? 1 : 0, rn: me.running ? 1 : 0, sit: me.sit, lie: me.lie ? [me.lie.slot, me.lie.rollT] : null, hd: me.holding ? 1 : 0 });
}

/* =========================================================
   game loop
   ========================================================= */
const clock = new THREE.Clock();
const camPos = new THREE.Vector3(0, 12, 16), camLook = new THREE.Vector3();
const linkMesh = mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 6), mat(0xff8fab), 0, 0, 0, scene, false); linkMesh.visible = false;
let heartAcc = 0, fwAcc = 0, skyAcc = 99, occAcc = 0, emberAcc = 0, smokeAcc = 0, wasInHouse = false, camYawTo = null;
const _qH = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), HOUSE.ry), _qX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2), _qR = new THREE.Quaternion(), _Y = new THREE.Vector3(0, 1, 0);
function lieQuat(roll) { return _qH.clone().multiply(_qX).multiply(_qR.setFromAxisAngle(_Y, roll)); }
// fireplace embers and chimney smoke
const particles = [];
function spawnEmber(big) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: Math.random() > 0.5 ? 0xffb13b : 0xff7a2e, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.position.copy(houseLocal(-4.85, -0.6 + (Math.random() - 0.5) * 0.6, 0.5)); s.scale.setScalar(big ? 0.14 : 0.09);
  s.userData = { life: 0, max: 1 + Math.random(), vx: (Math.random() - 0.4) * 0.5, vy: 0.9 + Math.random() * (big ? 1.4 : 0.6), grow: 0 };
  scene.add(s); particles.push(s);
}
function spawnSmoke() {
  if (particles.length > 60) return;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: 0xeeeeee, transparent: true, opacity: 0.5, depthWrite: false }));
  s.position.copy(chimneyTop); s.scale.setScalar(0.6);
  s.userData = { life: 0, max: 4.5, vx: 0.25, vy: 0.8, grow: 0.5, smoke: true };
  scene.add(s); particles.push(s);
}
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i], u = p.userData; u.life += dt;
    p.position.x += u.vx * dt; p.position.y += u.vy * dt; if (u.grow) p.scale.addScalar(u.grow * dt);
    p.material.opacity = (u.smoke ? 0.5 : 1) * (1 - u.life / u.max);
    if (u.life > u.max) { scene.remove(p); p.material.dispose(); particles.splice(i, 1); }
  }
}

function moveMe(dt) {
  if (me.lie) { // joystick left/right = toss
    const jx = joy.x, side = jx > 0.6 ? 1 : jx < -0.6 ? -1 : 0;
    if (side && side !== joyTossSide) toss(side); joyTossSide = side;
  }
  if (me.sit || me.lie || modalOpen) { me.moving = false; return; }
  let ix = 0, iz = 0;
  if (keys.KeyW || keys.ArrowUp) iz -= 1; if (keys.KeyS || keys.ArrowDown) iz += 1;
  if (keys.KeyA || keys.ArrowLeft) ix -= 1; if (keys.KeyD || keys.ArrowRight) ix += 1;
  ix += joy.x; iz += joy.y;
  const len = Math.hypot(ix, iz); me.running = !!(keys.ShiftLeft || keys.ShiftRight) || Math.hypot(joy.x, joy.y) > 0.92;
  if (len > 0.12) {
    const n = Math.min(1, len), dx = ix / len, dz = iz / len;
    const wx = dx * Math.cos(camYaw) + dz * Math.sin(camYaw), wz = -dx * Math.sin(camYaw) + dz * Math.cos(camYaw);
    const sp = (me.running ? 7.5 : 4.5) * n;
    tryMove(wx * sp * dt, wz * sp * dt);
    const target = Math.atan2(wx, wz); let d = target - me.ry; d = Math.atan2(Math.sin(d), Math.cos(d)); me.ry += d * Math.min(1, dt * 12);
    me.moving = true;
  } else me.moving = false;
  // holding hands: stay beside partner
  if (me.holding && partner.present) {
    const dx = partner.pos.x - me.pos.x, dz = partner.pos.z - me.pos.z, d = Math.hypot(dx, dz);
    if (d > 6) { releaseHold(true); toast('손이 풀렸어요 🥲'); }
    else if (d < 0.95 && d > 1e-3) { const push = (0.95 - d) * Math.min(1, dt * 6); tryMove((-dx / d) * push, (-dz / d) * push); }
    else if (d > 1.15) {
      const pull = (d - 1.1) * Math.min(1, dt * 7); tryMove((dx / d) * pull, (dz / d) * pull);
      if (!me.moving && partner.moving) { me.moving = true; me.running = partner.running; let dd = partner.ry - me.ry; dd = Math.atan2(Math.sin(dd), Math.cos(dd)); me.ry += dd * Math.min(1, dt * 8); }
    }
  }
}
let joyTossSide = 0;
function tryMove(dx, dz) {
  let nx = me.pos.x + dx, nz = me.pos.z + dz;
  for (const c of colliders) {
    if (c.box) { // oriented box (walls, furniture)
      const cs = Math.cos(c.rot), sn = Math.sin(c.rot), ox = nx - c.x, oz = nz - c.z;
      let lx = ox * cs - oz * sn, lz = ox * sn + oz * cs; const ex = c.hx + 0.4, ez = c.hz + 0.4;
      if (Math.abs(lx) < ex && Math.abs(lz) < ez) {
        if (ex - Math.abs(lx) < ez - Math.abs(lz)) lx = Math.sign(lx || 1) * ex; else lz = Math.sign(lz || 1) * ez;
        nx = c.x + lx * cs + lz * sn; nz = c.z - lx * sn + lz * cs;
      }
      continue;
    }
    const ox = nx - c.x, oz = nz - c.z, d = Math.hypot(ox, oz), min = c.r + 0.4; if (d < min && d > 1e-4) { nx = c.x + (ox / d) * min; nz = c.z + (oz / d) * min; } }
  if (walkable(nx, nz)) { me.pos.x = nx; me.pos.z = nz; }
  else if (walkable(nx, me.pos.z)) me.pos.x = nx;
  else if (walkable(me.pos.x, nz)) me.pos.z = nz;
}

let fpsVal = 0, fpsN = 0, fpsT = 0;
function loop() {
  const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime;
  fpsN++; fpsT += dt; if (fpsT > 1) { fpsVal = fpsN / fpsT; fpsN = 0; fpsT = 0; }
  if (me.a) {
    moveMe(dt);
    if (me.lie) {
      const L = me.lie; L.roll = lerp(L.roll, L.rollT * 1.3, Math.min(1, dt * 7)); L.toss = Math.max(0, L.toss - dt); L.idle += dt;
      me.pos.copy(bedSlotPos(L.slot)); me.a.root.position.copy(me.pos);
      me.a.root.position.y += Math.sin((L.toss / 0.5) * Math.PI) * 0.12;
      me.a.root.quaternion.copy(lieQuat(L.roll + Math.sin(L.toss * 28) * 0.12 * (L.toss > 0)));
      if (L.idle > 15) { L.idle = 0; doEmote(3); }
    } else {
      me.pos.y = me.sit ? benches[me.sit[0]].y + (benches[me.sit[0]].seatY ?? 0.2) : groundY(me.pos.x, me.pos.z);
      me.a.root.position.copy(me.pos); me.a.root.rotation.set(0, me.ry, 0);
    }
    me.a.speaking = micOn && level(localAn) > 0.04;
    animateAnimal(me.a, dt, t, me.moving, me.running, !!me.sit);

    if (partner.present && partner.a) {
      if (partner.sit) { const b = benches[partner.sit[0]]; partner.target.copy(seatPos(partner.sit[0], partner.sit[1])); partner.tRy = b.ry; }
      if (partner.lie) partner.target.copy(bedSlotPos(partner.lie.slot));
      const k = 1 - Math.exp(-dt * 12); partner.pos.x = lerp(partner.pos.x, partner.target.x, k); partner.pos.z = lerp(partner.pos.z, partner.target.z, k);
      let d = partner.tRy - partner.ry; d = Math.atan2(Math.sin(d), Math.cos(d)); partner.ry += d * k;
      if (partner.lie) {
        partner.pos.copy(bedSlotPos(partner.lie.slot)); partner.lieRoll = lerp(partner.lieRoll, partner.lie.rollT * 1.3, Math.min(1, dt * 7)); partner.toss = Math.max(0, partner.toss - dt);
        partner.a.root.position.copy(partner.pos); partner.a.root.position.y += Math.sin((partner.toss / 0.5) * Math.PI) * 0.12;
        partner.a.root.quaternion.copy(lieQuat(partner.lieRoll + Math.sin(partner.toss * 28) * 0.12 * (partner.toss > 0)));
      } else {
        partner.pos.y = partner.sit ? benches[partner.sit[0]].y + (benches[partner.sit[0]].seatY ?? 0.2) : groundY(partner.pos.x, partner.pos.z);
        partner.a.root.position.copy(partner.pos); partner.a.root.rotation.set(0, partner.ry, 0);
      }
      partner.a.speaking = level(remoteAn) > 0.04;
      animateAnimal(partner.a, dt, t, partner.moving, partner.running, !!partner.sit);
      const pd = partnerDist(); remoteAudio.volume = pd < 6 ? 1 : Math.max(0.35, 1 - (pd - 6) / 40);
    }
    // hand link
    if (me.holding && partner.present && partner.a) {
      const a = me.pos.clone().add(new THREE.Vector3(0, 0.6, 0)), b = partner.pos.clone().add(new THREE.Vector3(0, 0.6, 0));
      const mid = a.clone().add(b).multiplyScalar(0.5), len = Math.max(0.01, a.distanceTo(b) - 0.7);
      linkMesh.position.copy(mid); linkMesh.scale.set(1, len, 1); linkMesh.lookAt(b); linkMesh.rotateX(Math.PI / 2); linkMesh.visible = true;
      heartAcc += dt; if (heartAcc > 0.7) { heartAcc = 0; spawnHeart(mid, 0.2, 0.6); }
    } else linkMesh.visible = false;
    if (me.lie && partner.present && partner.lie) { heartAcc += dt; if (heartAcc > (facingEachOther() ? 0.5 : 1.1)) { heartAcc = 0; spawnHeart(me.pos.clone().lerp(partner.pos, 0.5), 0.3, 0.6); } }
    // both on the same bench
    if (me.sit && partner.present && partner.sit && partner.sit[0] === me.sit[0]) { heartAcc += dt; if (heartAcc > 0.9) { heartAcc = 0; spawnHeart(me.pos.clone().lerp(partner.pos, 0.5), 0.3, 1.5); } }

    // camera
    let wantPos, wantLook;
    const inHouse = insideHouse(me.pos.x, me.pos.z);
    if (inHouse && !wasInHouse) camYawTo = HOUSE.ry + 0.55;   // swing to a front view of the room
    wasInHouse = inHouse;
    if (camYawTo !== null) { let d = camYawTo - camYaw; d = Math.atan2(Math.sin(d), Math.cos(d)); camYaw += d * Math.min(1, dt * 4); if (Math.abs(d) < 0.01) camYawTo = null; }
    wallsG.scale.y = lerp(wallsG.scale.y, inHouse ? 0.26 : 1, Math.min(1, dt * 6)); roofG.visible = wallsG.scale.y > 0.85;
    if (inHouse) {
      const off = new THREE.Vector3(Math.sin(camYaw) * 6.2, 9.5, Math.cos(camYaw) * 6.2).multiplyScalar(camZoom);
      const focus = new THREE.Vector3(me.pos.x, 0, me.pos.z);
      if (me.holding && partner.present) focus.lerp(new THREE.Vector3(partner.pos.x, 0, partner.pos.z), 0.5);
      wantPos = focus.clone().add(off); wantLook = focus.clone().add(new THREE.Vector3(0, 0.6, 0));
    } else if (me.sit) {
      const b = benches[me.sit[0]]; const c = new THREE.Vector3(b.x, b.y, b.z);
      wantPos = c.clone().addScaledVector(b.f, -4.8).add(new THREE.Vector3(0, 2.6, 0));
      wantLook = c.clone().addScaledVector(b.f, 8).add(new THREE.Vector3(0, 1.2, 0));
    } else {
      const off = new THREE.Vector3(Math.sin(camYaw) * 10.5, 8.5, Math.cos(camYaw) * 10.5).multiplyScalar(camZoom);
      const focus = me.holding && partner.present ? me.pos.clone().lerp(partner.pos, 0.5) : me.pos.clone();
      wantPos = focus.clone().add(off); wantLook = focus.clone().add(new THREE.Vector3(0, 1, 0));
    }
    const ck = 1 - Math.exp(-dt * 5); camPos.lerp(wantPos, ck); camLook.lerp(wantLook, ck);
    camera.position.copy(camPos); camera.lookAt(camLook);
    occAcc += dt; if (occAcc > 0.12) { occAcc = 0; updateTreeOcclusion(camPos, partner.present && partner.a ? [me.pos, partner.pos] : [me.pos]); }
    sun.target.position.copy(me.pos); sun.position.copy(me.pos).add(new THREE.Vector3(30, 50, 20));

    // prompt
    const act = currentAction(), pr = $('#prompt'), ab = $('#actBtn');
    if (act && !modalOpen) { pr.textContent = (document.body.classList.contains('touch') ? '' : 'E · ') + act.text; pr.classList.remove('hidden'); ab.textContent = act.icon; ab.classList.remove('dim'); }
    else { pr.classList.add('hidden'); ab.textContent = '✋'; ab.classList.add('dim'); }
    netTick(dt);
  }

  // world anim
  const pa = ocean.geometry.attributes.position, base = ocean.userData.base;
  for (let i = 0; i < pa.count; i++) { const x = base[i * 3], y = base[i * 3 + 1]; pa.array[i * 3 + 2] = Math.sin(x * 0.15 + t * 1.2) * 0.12 + Math.cos(y * 0.13 + t * 0.9) * 0.12; }
  pa.needsUpdate = true;
  foam.position.y = -0.47 + Math.sin(t * 1.3) * 0.05; foam.material.opacity = 0.5 + Math.sin(t * 1.3) * 0.2;
  { const sp = sparkle.geometry.attributes.position, sd = sparkle.userData.seed; for (let i = 0; i < sd.length; i++) { const [a, r, ph] = sd[i], h = ((t * 0.4 + r) % 1); sp.array[i * 3] = Math.cos(a + t * 0.5) * 0.5; sp.array[i * 3 + 1] = 0.2 + h * 1.2; sp.array[i * 3 + 2] = Math.sin(a + t * 0.5) * 0.5; } sp.needsUpdate = true; sparkle.material.opacity = 0.6 + Math.sin(t * 4) * 0.3; }
  bottle.position.y = letterSpot.y + Math.sin(t * 2) * 0.02;
  fireBoost = Math.max(0, fireBoost - dt); const fb = fireBoost > 0 ? 1 + Math.min(1, fireBoost / 2) * 0.8 : 1;
  for (const f of flames) { const u = f.userData; f.scale.set(fb * (0.9 + Math.sin(t * 9 + u.ph) * 0.1), fb * (0.85 + Math.sin(t * 13 + u.ph) * 0.2 + Math.random() * 0.08), fb); f.position.y = 0.3 + u.base * 0.5 * f.scale.y; }
  fireLight.intensity = (4.5 + Math.sin(t * 11) * 0.8 + Math.random() * 0.6) * fb;
  houseLight.intensity = insideHouse(camLook.x, camLook.z) ? 2.5 + night * 7 : night * 3;
  emberAcc += dt; if (emberAcc > (fireBoost > 0 ? 0.08 : 0.5)) { emberAcc = 0; spawnEmber(false); }
  smokeAcc += dt; if (smokeAcc > (fireBoost > 0 ? 0.25 : 0.6)) { smokeAcc = 0; spawnSmoke(); }
  updateParticles(dt);
  for (const h of HINTS) { if (!h.obj.visible) continue; const a = h.spark.geometry.attributes.position; h.seed.forEach(([ang, r0], i) => { const k = (t * 0.5 + r0) % 1; a.array[i * 3] = Math.cos(ang + t) * 0.35; a.array[i * 3 + 1] = 0.15 + k * 0.8; a.array[i * 3 + 2] = Math.sin(ang + t) * 0.35; }); a.needsUpdate = true; h.obj.rotation.y = Math.sin(t * 1.5) * 0.2; }
  for (const b of balloons) { if (b.userData.cake) b.traverse(o => { if (o.userData.flame) o.scale.setScalar(0.8 + Math.random() * 0.5); }); else b.position.y = Math.sin(t * 1.5 + b.userData.ph) * 0.15; }
  if (celebrating) { fwAcc += dt; if (fwAcc > (night > 0.5 ? 0.9 : 1.8)) { fwAcc = 0; launchFirework(); } }
  updateFireworks(dt); updateHearts(dt);
  skyAcc += dt; if (skyAcc > 30) { skyAcc = 0; applySky(); }

  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

/* =========================================================
   title / start
   ========================================================= */
let chosen = store.get('kind', null);
const goBtn = $('#goBtn');
function pick(k) {
  chosen = k; document.querySelectorAll('.char').forEach(c => c.classList.toggle('sel', c.dataset.who === k));
  goBtn.disabled = false; goBtn.textContent = `${CONFIG.players[k].emoji} ${myNameFor(k)}로 섬에 가기`;
}
const myNameFor = (k) => nick(CONFIG.players[k].name);
document.querySelectorAll('.char').forEach(c => c.addEventListener('click', () => pick(c.dataset.who)));
if (chosen) pick(chosen);
if (window.__PREVIEW) { $('#soloBtn').classList.add('hidden'); $('#photoBtn').classList.add('hidden'); $('#recBtn').classList.add('hidden'); document.querySelector('.tiny').textContent = '미리보기 모드예요. 혼자 섬을 둘러볼 수 있어요. 둘이 같이 하기와 보이스는 index.html 파일로 열어야 돼요.'; }

async function start(isSolo) {
  if (!chosen) return;
  if (window.__PREVIEW) isSolo = true;
  store.set('kind', chosen); solo = isSolo;
  me.kind = chosen; me.a = makeAnimal(chosen);
  $('#title').classList.add('hidden'); $('#hud').classList.remove('hidden');
  const n = dayCount(); $('#dday').textContent = n > 0 ? `💕 ${CONFIG.players.dog.name} ♥ ${CONFIG.players.cat.name} · ${n}일째` : `💕 D-${1 - n}`;
  setupCelebration(todaysEvents());
  refreshHints();
  if (!store.get('letterFound', false)) setTimeout(() => toast(hintProgress ? `🗒️ 쪽지 ${hintProgress}/${HINTS.length}까지 찾았어요. 이어서 찾아봐요!` : '📮 집 앞 우편함에 쪽지가 꽂혀 있어요!', 4500), 1800);
  if (bdayWho) setTimeout(() => toast(`🎂 광장에 케이크가 있어요!`, 3500), 6500);
  if (isSolo) { setStatus('🏝️ 혼자 둘러보는 중'); $('#micBtn').classList.add('hidden'); }
  else { await initMic(); startNet(); }
}
goBtn.addEventListener('click', () => start(false));
$('#soloBtn').addEventListener('click', () => { if (!chosen) pick('dog'); start(true); });
addEventListener('pointerdown', () => { if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); if (remoteAudio.srcObject && remoteAudio.paused) remoteAudio.play().catch(() => {}); });
addEventListener('beforeunload', () => { try { peer && peer.destroy(); } catch {} });

applySky();
camPos.set(0, 14, 22); camLook.set(0, 0, 0);
window.__game = { HOUSE, BED, houseLocal, insideHouse, lieDown, toss, bedSlotPos, HINTS, colliders, walkable, tryMove, get hints() { return hintProgress; }, fps: () => fpsVal, me, partner, benches, letterSpot, send, interact, get conn() { return conn; }, get isHost() { return isHost; } };
requestAnimationFrame(loop);
