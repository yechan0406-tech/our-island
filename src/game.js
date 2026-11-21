'use strict';
/* =========================================================
   우리의 섬 — 예찬 & 예형
   설정은 여기서 바꾸면 돼요 (이름, 날짜, 편지 내용)
   ========================================================= */
const CONFIG = {
  players: {
    dog: { name: '예찬', animal: '강아지', emoji: '🐶' },
    cat: { name: '예형', animal: '고양이', emoji: '🐱' },
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
const R_GRASS = 30, R_SAND = 35;
const colliders = []; // {x,z,r}
const PIER = { x0: -42, x1: -29, z: 8, w: 1.2 };
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

// island
mesh(new THREE.CylinderGeometry(R_GRASS, R_GRASS + 0.5, 3, 72), mat(0x8fd16a), 0, -1.5, 0, scene, false);
mesh(new THREE.CylinderGeometry(R_SAND, R_SAND + 3, 2.4, 72), mat(0xf3dfa9), 0, -1.42, 0, scene, false);
// grass tufts color patches
{
  const r = rng(3), g = new THREE.CircleGeometry(1, 7);
  for (let i = 0; i < 60; i++) {
    const a = r() * 6.28, d = 3 + r() * 25, m = mesh(g, mat(r() > 0.5 ? 0x7cc35a : 0xa2dc7a), Math.cos(a) * d, 0.01, Math.sin(a) * d, scene, false);
    m.rotation.x = -Math.PI / 2; m.scale.setScalar(1 + r() * 2.5);
  }
}
// ocean
const ocean = (() => {
  const g = new THREE.PlaneGeometry(500, 500, 56, 56);
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x4fc3dc, roughness: 0.35, metalness: 0.1, flatShading: true, transparent: true, opacity: 0.9 }));
  m.rotation.x = -Math.PI / 2; m.position.y = -0.55; m.receiveShadow = true; scene.add(m);
  m.userData.base = Float32Array.from(g.attributes.position.array); return m;
})();
const foam = mesh(new THREE.RingGeometry(R_SAND + 0.2, R_SAND + 1.1, 72), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }), 0, -0.45, 0, scene, false);
foam.rotation.x = -Math.PI / 2;

// plaza
mesh(new THREE.CylinderGeometry(5, 5, 0.06, 28), mat(0xe8d8c4), 0, 0.03, 0, scene, false);
// path stones
{
  const g = new THREE.CylinderGeometry(0.55, 0.6, 0.06, 8), m = mat(0xd9c7b0);
  const path = (pts) => { for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1], n = Math.ceil(Math.hypot(bx - ax, bz - az) / 1.4); for (let k = 0; k < n; k++) { const t = k / n; mesh(g, m, lerp(ax, bx, t), 0.03, lerp(az, bz, t), scene, false); } } };
  path([[0, 5], [0, 26]]); path([[-5, 1], [-14, 5], [-29, 8]]); path([[4, -3], [10, -6]]); path([[-3, -4], [-10, -9]]);
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
lamp(3.5, 3.5); lamp(-2, 24);

// trees
function tree(x, z, kind, s = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); scene.add(g);
  mesh(new THREE.CylinderGeometry(0.22, 0.32, 1.6, 6), mat(0x9b6b43), 0, 0.8, 0, g);
  if (kind === 0) { // round
    const c = [0x6cc05a, 0x5fb34f, 0x7fd06a][Math.floor(Math.random() * 3)];
    mesh(new THREE.IcosahedronGeometry(1.35, 0), mat(c), 0, 2.4, 0, g);
    mesh(new THREE.IcosahedronGeometry(0.95, 0), mat(c), 0.6, 3.1, 0.2, g);
  } else if (kind === 1) { // pine
    mesh(new THREE.ConeGeometry(1.4, 1.8, 7), mat(0x3f9c5a), 0, 2.0, 0, g);
    mesh(new THREE.ConeGeometry(1.1, 1.5, 7), mat(0x48aa62), 0, 2.9, 0, g);
    mesh(new THREE.ConeGeometry(0.75, 1.2, 7), mat(0x52b86b), 0, 3.7, 0, g);
  } else { // pink blossom
    mesh(new THREE.IcosahedronGeometry(1.3, 0), mat(0xffb7cf), 0, 2.4, 0, g);
    mesh(new THREE.IcosahedronGeometry(0.85, 0), mat(0xffc9da), -0.55, 3.0, 0.3, g);
  }
  colliders.push({ x, z, r: 0.45 * s });
  return g;
}
// palm on sand
function palm(x, z, rot) {
  const g = new THREE.Group(); g.position.set(x, groundY(x, z), z); g.rotation.y = rot; scene.add(g);
  for (let i = 0; i < 6; i++) { const seg = mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.7, 6), mat(0xb5895a), 0.12 * i * i * 0.18, 0.35 + i * 0.65, 0, g); seg.rotation.z = -0.06 * i; }
  for (let i = 0; i < 6; i++) { const l = mesh(new THREE.ConeGeometry(0.35, 2.2, 4), mat(0x58b45a), 0.6, 4.1, 0, g); l.rotation.set(0, (i / 6) * 6.28, 0); l.rotateZ(1.9); l.position.set(0.6 + Math.cos(i) * 0.1, 4.0, 0); }
  colliders.push({ x, z, r: 0.35 });
}
// rocks
function rock(x, z, s, col = 0x9aa0a8) {
  const m = mesh(new THREE.DodecahedronGeometry(s, 0), mat(col), x, groundY(x, z) + s * 0.4, z);
  m.rotation.set(Math.random(), Math.random() * 6, Math.random()); m.scale.y = 0.7;
  colliders.push({ x, z, r: s * 0.85 });
}

// house
const windowMat = mat(0xfff0b0, { emissive: 0xffc860, emissiveIntensity: 0 });
{
  const g = new THREE.Group(); g.position.set(-12, 0, -9); g.rotation.y = 0.5; scene.add(g);
  mesh(new THREE.BoxGeometry(4.4, 2.8, 3.6), mat(0xfff1dd), 0, 1.4, 0, g);
  const roof = mesh(new THREE.ConeGeometry(3.7, 2, 4), mat(0xe77f7f), 0, 3.8, 0, g); roof.rotation.y = Math.PI / 4; roof.scale.z = 0.85;
  mesh(new THREE.BoxGeometry(1, 1.7, 0.1), mat(0xa0704a), 0, 0.85, 1.82, g);
  mesh(new THREE.SphereGeometry(0.07, 6, 6), mat(0xffd34d), 0.33, 0.9, 1.9, g);
  for (const wx of [-1.4, 1.4]) { mesh(new THREE.BoxGeometry(0.8, 0.8, 0.1), windowMat, wx, 1.6, 1.82, g, false); }
  mesh(new THREE.BoxGeometry(0.5, 0.9, 0.5), mat(0xc9746a), 1.2, 4.2, -0.4, g); // chimney
  // mailbox
  mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 6), mat(0x8a6a4a), 2.6, 0.5, 2.2, g);
  mesh(new THREE.BoxGeometry(0.4, 0.35, 0.55), mat(0xff8fab), 2.6, 1.1, 2.2, g);
  for (let i = 0; i < 5; i++) colliders.push({ x: -12 + Math.cos(0.5) * (i - 2) * 1.0, z: -9 - Math.sin(0.5) * (i - 2) * 1.0, r: 2.0 });
}
// pond
{
  const p = mesh(new THREE.CircleGeometry(3.4, 20), new THREE.MeshStandardMaterial({ color: 0x6fd0e6, roughness: 0.2, flatShading: true }), 12, 0.04, -11, scene, false);
  p.rotation.x = -Math.PI / 2;
  const rim = mesh(new THREE.RingGeometry(3.3, 3.8, 20), mat(0xc9c2b8), 12, 0.035, -11, scene, false); rim.rotation.x = -Math.PI / 2;
  for (const [dx, dz] of [[1, 0.5], [-1.2, -0.8], [0.3, -1.6]]) { const l = mesh(new THREE.CircleGeometry(0.45, 8), mat(0x6fbf57), 12 + dx, 0.06, -11 + dz, scene, false); l.rotation.x = -Math.PI / 2; }
  colliders.push({ x: 12, z: -11, r: 3.4 });
}
// pier
{
  const len = PIER.x1 - PIER.x0 + 1;
  mesh(new THREE.BoxGeometry(len, 0.18, PIER.w * 2), mat(0xc19a6b), (PIER.x0 + PIER.x1 + 1) / 2, 0.0, PIER.z);
  for (let x = PIER.x0 + 0.5; x < PIER.x1; x += 2.5) for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.4, 6), mat(0x8a6a4a), x, -0.5, PIER.z + s * (PIER.w - 0.1));
}

// benches
const benches = [
  { x: 0, z: 27.2, ry: 0 },               // 해변 (바다 보기)
  { x: -40.2, z: PIER.z, ry: -Math.PI / 2 }, // 부두 끝
  { x: 12, z: -6.3, ry: Math.PI },         // 연못
];
for (const b of benches) {
  b.y = groundY(b.x, b.z); b.f = new THREE.Vector3(Math.sin(b.ry), 0, Math.cos(b.ry)); b.r = new THREE.Vector3(Math.cos(b.ry), 0, -Math.sin(b.ry));
  const g = new THREE.Group(); g.position.set(b.x, b.y, b.z); g.rotation.y = b.ry; scene.add(g);
  mesh(new THREE.BoxGeometry(2.0, 0.1, 0.6), mat(0xc8875a), 0, 0.48, 0, g);
  mesh(new THREE.BoxGeometry(2.0, 0.5, 0.08), mat(0xc8875a), 0, 0.85, -0.3, g);
  for (const sx of [-0.85, 0.85]) for (const sz of [-0.22, 0.22]) mesh(new THREE.BoxGeometry(0.08, 0.48, 0.08), mat(0x6b4a3a), sx, 0.24, sz, g);
  colliders.push({ x: b.x - b.f.x * 0.1, z: b.z - b.f.z * 0.1, r: 0.35 });
}
function seatPos(bi, slot) { const b = benches[bi]; return new THREE.Vector3(b.x + b.r.x * (slot ? 0.45 : -0.45) - b.f.x * 0.05, b.y, b.z + b.r.z * (slot ? 0.45 : -0.45) - b.f.z * 0.05); }

// scatter trees/rocks/flowers
{
  const r = rng(42), kinds = [0, 0, 1, 2];
  const avoid = [[0, 0, 7], [-12, -9, 5.5], [12, -11, 5.5], [0, 27, 3], [0, 16, 1.5], [-14, 5, 2], [-22, 7, 2], [0, 10, 1.5], [12, -6, 2.5]];
  let placed = 0, tries = 0;
  while (placed < 34 && tries++ < 2000) {
    const a = r() * 6.28, d = 7 + r() * 20, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (avoid.some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar)) continue;
    if (Math.abs(x) < 1.6 && z > 0) continue; // north path
    if (colliders.some(c => Math.hypot(c.x - x, c.z - z) < 3.2)) continue;
    tree(x, z, kinds[Math.floor(r() * kinds.length)], 0.85 + r() * 0.5); placed++;
  }
  for (const [x, z, rt] of [[18, 26, 0.4], [-25, 21, -0.4], [28, 10, 1.2], [21, -24, 2.3], [-29, -9, 3.7], [6, -32, 2.8]]) palm(x, z, rt);
  for (let i = 0; i < 14; i++) { const a = r() * 6.28, d = 8 + r() * 24, x = Math.cos(a) * d, z = Math.sin(a) * d; if (avoid.some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar) || colliders.some(c => Math.hypot(c.x - x, c.z - z) < 2.2)) continue; rock(x, z, 0.4 + r() * 0.5); }

  // flowers (instanced)
  const cols = [0xff8fab, 0xffd166, 0xffffff, 0xc3a6ff, 0xff9f6b], N = 260;
  const petal = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.16, 0), mat(0xffffff), N);
  const stem = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 4), mat(0x4f9d45), N);
  const m4 = new THREE.Matrix4(), c = new THREE.Color();
  let n = 0;
  while (n < N) {
    // clusters
    const ca = r() * 6.28, cd = 6 + r() * 22, cx = Math.cos(ca) * cd, cz = Math.sin(ca) * cd, k = 4 + Math.floor(r() * 8), col = cols[Math.floor(r() * cols.length)];
    for (let j = 0; j < k && n < N; j++) {
      const x = cx + (r() - 0.5) * 2.4, z = cz + (r() - 0.5) * 2.4;
      if (Math.hypot(x, z) > R_GRASS - 1 || colliders.some(cc => Math.hypot(cc.x - x, cc.z - z) < cc.r + 0.3)) continue;
      m4.makeTranslation(x, 0.32, z); petal.setMatrixAt(n, m4); petal.setColorAt(n, c.set(col));
      m4.makeTranslation(x, 0.15, z); stem.setMatrixAt(n, m4); n++;
    }
  }
  petal.castShadow = true; scene.add(petal, stem);
}
// rocks hiding the letter
rock(-21.3, -22.3, 1.3, 0x8e949c); rock(-19.6, -23.6, 0.8, 0x9aa0a8);

/* ---------- hidden letter (bottle) ---------- */
const letterSpot = new THREE.Vector3(-22.9, 0, -23.6); letterSpot.y = groundY(letterSpot.x, letterSpot.z);
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
  const cx = (Math.random() - 0.5) * 50, cy = 18 + Math.random() * 12, cz = 45 + Math.random() * 15;
  for (let i = 0; i < N; i++) {
    pos.set([cx, cy, cz], i * 3);
    const th = Math.random() * 6.28, ph = Math.acos(2 * Math.random() - 1), sp = 7 + Math.random() * 2;
    vel.push(new THREE.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)).multiplyScalar(sp));
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const col = [0xff8fab, 0xffd166, 0x8fd8c0, 0xc3a6ff, 0xffffff][Math.floor(Math.random() * 5)];
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: col, size: 1.1, map: dotTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
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
const me = { kind: null, a: null, pos: new THREE.Vector3(0, 0, 4), ry: Math.PI, moving: false, running: false, sit: null, holding: false, emote: -1 };
const partner = { kind: null, a: null, pos: new THREE.Vector3(), target: new THREE.Vector3(), ry: 0, tRy: 0, moving: false, running: false, sit: null, holding: false, present: false, lastSeen: 0 };
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
  if (/^Digit[1-4]$/.test(e.code)) doEmote(+e.code.slice(5) - 1);
  if (e.code === 'KeyM') toggleMic();
  if (e.code === 'KeyP') takePhoto();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
let camYaw = 0, camZoom = 1;
const joy = { x: 0, y: 0, id: null };
{
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => { drag = { id: e.pointerId, x: e.clientX }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => { if (drag && drag.id === e.pointerId) { camYaw -= (e.clientX - drag.x) * 0.006; drag.x = e.clientX; } });
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
  if (me.sit) return { icon: '🚶', text: '일어나기', fn: standUp };
  if (me.holding) return { icon: '🫳', text: '손 놓기', fn: () => { releaseHold(true); } };
  if (holdReqFrom > clock.elapsedTime && partnerDist() < 3.5) return { icon: '🤝', text: `${nick(partnerName())} 손 잡기 💕`, fn: acceptHold };
  if (me.pos.distanceTo(letterSpot) < 2.2) return { icon: '💌', text: '반짝이는 병 열어보기', fn: openLetter };
  const bi = nearestBench(); if (bi >= 0) return { icon: '🪑', text: '벤치에 앉기', fn: () => sitDown(bi) };
  if (partnerDist() < 2.6) return { icon: '🤝', text: `${nick(partnerName())}에게 손 내밀기`, fn: requestHold };
  return null;
}
function interact() { const a = currentAction(); if (a) a.fn(); }

function requestHold() { send({ t: 'holdReq' }); toast(`${nick(partnerName())}에게 손을 내밀었어요 🤝`); }
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
function togetherOnBench() {
  const h = currentHour();
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
    send({ t: 'hi', kind: me.kind });
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
  conn = null; partner.present = false; me.holding = false; holdReqFrom = 0; remoteAn = null;
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
      partner.a.root.visible = true; partner.present = true; partner.sit = null; partner.holding = false;
      const nm = CONFIG.players[k].name;
      setStatus(`💞 ${nick(nm)}와 함께`, true); toast(`${subj(nm)} 섬에 왔어요! 💕`);
      if (m.kind === me.kind) toast('둘 다 같은 캐릭터로 들어왔어요! 한 명이 다시 골라 주세요 🙈', 5000);
      send({ t: 'hi2', kind: me.kind });
      break;
    }
    case 'hi2': {
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
      if (!partner.seen) { partner.pos.copy(partner.target); partner.ry = partner.tRy; partner.seen = true; }
      break;
    case 'emote': if (partner.a) showEmote(partner.a, m.i | 0); break;
    case 'holdReq': holdReqFrom = clock.elapsedTime + 10; toast(`💕 ${subj(partnerName())} 손을 내밀었어요! (E로 잡기)`, 4000); break;
    case 'holdAccept': setHolding(true); break;
    case 'holdRelease': me.holding = false; break;
    case 'letter': toast(`💌 ${subj(partnerName())} 숨겨진 편지를 찾았어요!`, 4000); break;
  }
}
let sendAcc = 0;
function netTick(dt) {
  sendAcc += dt; if (sendAcc < 1 / 15) return; sendAcc = 0;
  send({ t: 's', x: +me.pos.x.toFixed(3), z: +me.pos.z.toFixed(3), ry: +me.ry.toFixed(3), mv: me.moving ? 1 : 0, rn: me.running ? 1 : 0, sit: me.sit, hd: me.holding ? 1 : 0 });
}

/* =========================================================
   game loop
   ========================================================= */
const clock = new THREE.Clock();
const camPos = new THREE.Vector3(0, 12, 16), camLook = new THREE.Vector3();
const linkMesh = mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 6), mat(0xff8fab), 0, 0, 0, scene, false); linkMesh.visible = false;
let heartAcc = 0, fwAcc = 0, skyAcc = 99;

function moveMe(dt) {
  if (me.sit || modalOpen) { me.moving = false; return; }
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
function tryMove(dx, dz) {
  let nx = me.pos.x + dx, nz = me.pos.z + dz;
  for (const c of colliders) { const ox = nx - c.x, oz = nz - c.z, d = Math.hypot(ox, oz), min = c.r + 0.4; if (d < min && d > 1e-4) { nx = c.x + (ox / d) * min; nz = c.z + (oz / d) * min; } }
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
    me.pos.y = me.sit ? benches[me.sit[0]].y + 0.2 : groundY(me.pos.x, me.pos.z);
    me.a.root.position.copy(me.pos); me.a.root.rotation.y = me.ry;
    me.a.speaking = micOn && level(localAn) > 0.04;
    animateAnimal(me.a, dt, t, me.moving, me.running, !!me.sit);

    if (partner.present && partner.a) {
      if (partner.sit) { const b = benches[partner.sit[0]]; partner.target.copy(seatPos(partner.sit[0], partner.sit[1])); partner.tRy = b.ry; }
      const k = 1 - Math.exp(-dt * 12); partner.pos.x = lerp(partner.pos.x, partner.target.x, k); partner.pos.z = lerp(partner.pos.z, partner.target.z, k);
      let d = partner.tRy - partner.ry; d = Math.atan2(Math.sin(d), Math.cos(d)); partner.ry += d * k;
      partner.pos.y = partner.sit ? benches[partner.sit[0]].y + 0.2 : groundY(partner.pos.x, partner.pos.z);
      partner.a.root.position.copy(partner.pos); partner.a.root.rotation.y = partner.ry;
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
    // both on the same bench
    if (me.sit && partner.present && partner.sit && partner.sit[0] === me.sit[0]) { heartAcc += dt; if (heartAcc > 0.9) { heartAcc = 0; spawnHeart(me.pos.clone().lerp(partner.pos, 0.5), 0.3, 1.5); } }

    // camera
    let wantPos, wantLook;
    if (me.sit) {
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
if (window.__PREVIEW) { $('#soloBtn').classList.add('hidden'); $('#photoBtn').classList.add('hidden'); document.querySelector('.tiny').textContent = '미리보기 모드예요. 혼자 섬을 둘러볼 수 있어요. 둘이 같이 하기와 보이스는 index.html 파일로 열어야 돼요.'; }

async function start(isSolo) {
  if (!chosen) return;
  if (window.__PREVIEW) isSolo = true;
  store.set('kind', chosen); solo = isSolo;
  me.kind = chosen; me.a = makeAnimal(chosen);
  $('#title').classList.add('hidden'); $('#hud').classList.remove('hidden');
  const n = dayCount(); $('#dday').textContent = n > 0 ? `💕 ${CONFIG.players.dog.name} ♥ ${CONFIG.players.cat.name} · ${n}일째` : `💕 D-${1 - n}`;
  setupCelebration(todaysEvents());
  if (me.kind === CONFIG.letter.to && !store.get('letterFound', false)) setTimeout(() => toast(`✨ 해변 어딘가에 ${nick(myName())}를 위한 게 숨겨져 있대요...`, 4500), 1800);
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
window.__game = { fps: () => fpsVal, me, partner, benches, letterSpot, send, interact, get conn() { return conn; }, get isHost() { return isHost; } };
requestAnimationFrame(loop);
