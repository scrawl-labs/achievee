/**
 * The subway home at sunset. The car is built from its cross-section (a lower wall, the window band and an
 * upper wall that curves into the ceiling) swept along its length, so there are no boxes. Windows, adverts and
 * ceiling lights are painted into the shell's textures; the low sun shines in through the windows, throwing
 * window-shaped light across the floor, while a soft-focus city slides past outside.
 */
import * as THREE from "three";
import type { World, WorldOpts } from "./forest";

function rng(seed: number) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }
const canvas = (w: number, h: number) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")!] as const; };
const tex = (c: HTMLCanvasElement, srgb = true) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };

type P = [number, number]; // (z, y)
/** Points along a quadratic curve, for building smooth profiles. */
function curve(a: P, c: P, b: P, n = 10): P[] {
  return Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]] as P; });
}
/** Sweeps a (z, y) profile along x. u runs along x in metres, v along the profile in metres. */
function sweep(profile: P[], x0: number, x1: number, segX = 2, bend?: (x: number, j: number) => number) {
  const n = profile.length;
  const len = [0];
  for (let j = 1; j < n; j++) len.push(len[j - 1] + Math.hypot(profile[j][0] - profile[j - 1][0], profile[j][1] - profile[j - 1][1]));
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= segX; i++) {
    const x = x0 + ((x1 - x0) * i) / segX;
    for (let j = 0; j < n; j++) { pos.push(x, profile[j][1] + (bend ? bend(x, j) : 0), profile[j][0]); uv.push(x, len[j]); }
  }
  for (let i = 0; i < segX; i++) for (let j = 0; j < n - 1; j++) {
    const a = i * n + j, b = (i + 1) * n + j;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return { geo: g, length: len[n - 1] };
}

const PITCH = 2.4; // one window + pillar, in metres
const WALL = "#ece6da", WALL_SH = "#d9d1c3";

/** The window band: wall colour with rounded window openings and a grey rubber gasket. */
function windowBandTexture(h: number) {
  const W = 512, H = Math.round((W * h) / PITCH);
  const [c, g] = canvas(W, H);
  g.fillStyle = WALL; g.fillRect(0, 0, W, H);
  const m = W * 0.075, r = W * 0.06;
  g.fillStyle = "#8f949b"; g.beginPath(); g.roundRect(m - 6, 8, W - 2 * m + 12, H - 16, r + 6); g.fill();
  g.fillStyle = "#b9bdc2"; g.beginPath(); g.roundRect(m - 2, 12, W - 2 * m + 4, H - 24, r + 2); g.fill();
  g.globalCompositeOperation = "destination-out";
  g.beginPath(); g.roundRect(m + 2, 16, W - 2 * m - 4, H - 32, r); g.fill();
  g.globalCompositeOperation = "source-over";
  // a small route sticker on the pillar
  g.fillStyle = "#ffffff"; g.fillRect(W - m * 0.75, H * 0.2, m * 0.5, H * 0.22);
  g.fillStyle = "#3fae6a"; g.fillRect(W - m * 0.75, H * 0.2, m * 0.5, H * 0.05);
  const t = tex(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(1 / PITCH, 1 / h); t.anisotropy = 8;
  return t;
}

/** Upper wall + ceiling: adverts along the curve, two strips of lights down the ceiling. */
function upperTextures(len: number) {
  const W = 1024, H = Math.round((W * len) / (PITCH * 2));
  const [c, g] = canvas(W, H);
  const [e, ge] = canvas(W, H);
  g.fillStyle = WALL; g.fillRect(0, 0, W, H);
  ge.fillStyle = "#000"; ge.fillRect(0, 0, W, H);
  const v = (m: number) => (m / len) * H, u = (m: number) => (m / (PITCH * 2)) * W;
  // adverts in a row just above the windows
  const ads = [["#ffe2ea", "#ff7d9c"], ["#e3f2ff", "#4b9cf0"], ["#fff2c6", "#f0a800"], ["#e5f6e0", "#43b77c"]];
  for (let i = 0; i < 4; i++) {
    const x = u(0.15 + i * 1.2), y = v(0.12), w = u(0.95), h = v(0.42);
    g.fillStyle = "#b4b8be"; g.beginPath(); g.roundRect(x - 3, y - 3, w + 6, h + 6, 8); g.fill();
    g.fillStyle = ads[i][0]; g.beginPath(); g.roundRect(x, y, w, h, 6); g.fill();
    g.fillStyle = ads[i][1]; g.beginPath(); g.arc(x + w * 0.8, y + h * 0.5, h * 0.3, 0, Math.PI * 2); g.fill();
    g.fillStyle = "rgba(40,40,70,.55)"; g.fillRect(x + w * 0.08, y + h * 0.3, w * 0.45, h * 0.12);
    g.fillStyle = "rgba(40,40,70,.28)"; g.fillRect(x + w * 0.08, y + h * 0.55, w * 0.55, h * 0.08); g.fillRect(x + w * 0.08, y + h * 0.7, w * 0.4, h * 0.08);
  }
  // seam where the curve meets the ceiling, and the light strips
  g.fillStyle = WALL_SH; g.fillRect(0, v(0.68), W, 3);
  for (const vm of [1.0, 2.2]) {
    for (const [cx, ctx] of [[g, "#fffaf0"], [ge, "#fff3d6"]] as const) {
      cx.fillStyle = ctx; cx.beginPath(); cx.roundRect(u(0.08), v(vm), W - u(0.16), v(0.14), 10); cx.fill();
    }
    g.fillStyle = "#cfc7b8"; g.fillRect(u(0.08), v(vm) - 3, W - u(0.16), 3);
  }
  // air vents
  g.fillStyle = "#cbc3b4";
  for (let x = 30; x < W; x += 260) for (let k = 0; k < 5; k++) g.fillRect(x + k * 14, v(1.55), 8, v(0.18));
  const t = tex(c), te = tex(e);
  for (const x of [t, te]) { x.wrapS = THREE.RepeatWrapping; x.repeat.set(1 / (PITCH * 2), 1 / len); x.anisotropy = 8; }
  return { map: t, emissive: te };
}

/** Seat moquette: a deep teal with a small repeating pattern. */
function moquette() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = "#2f7f86"; g.fillRect(0, 0, 256, 256);
  const r = rng(9);
  for (let i = 0; i < 9000; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.08)"; g.fillRect(r() * 256, r() * 256, 2, 2); }
  for (let y = 16; y < 256; y += 32) for (let x = (y / 32) % 2 ? 0 : 16; x < 256; x += 32) {
    g.fillStyle = "#4fa6a8"; g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#f2b23d"; g.beginPath(); g.arc(x, y, 2, 0, Math.PI * 2); g.fill();
  }
  const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3.2, 3.2); t.anisotropy = 8; return t;
}
function rubberFloor() {
  const [c, g] = canvas(512, 512);
  g.fillStyle = "#7d7a74"; g.fillRect(0, 0, 512, 512);
  const r = rng(4);
  for (let i = 0; i < 9000; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.12)"; g.fillRect(r() * 512, r() * 512, 2, 2); }
  const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 6); t.anisotropy = 8; return t;
}

/** The sunset city, painted small so it reads soft and out of focus. Tiles sideways. */
function cityLayer(kind: 0 | 1 | 2) {
  const W = [200, 300, 360][kind], H = Math.round(W * 0.42);
  const [c, g] = canvas(W, H);
  const r = rng(30 + kind * 11);
  if (kind === 0) {
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#8e8fd0"); sky.addColorStop(0.45, "#f0a9a2"); sky.addColorStop(0.75, "#ffc98a"); sky.addColorStop(1, "#ffe0a8");
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    const sun = g.createRadialGradient(W * 0.62, H * 0.72, 0, W * 0.62, H * 0.72, W * 0.22);
    sun.addColorStop(0, "rgba(255,246,214,1)"); sun.addColorStop(0.25, "rgba(255,226,170,.8)"); sun.addColorStop(1, "rgba(255,210,150,0)");
    g.fillStyle = sun; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 6; i++) { g.fillStyle = "rgba(255,220,210,.35)"; g.beginPath(); g.ellipse(r() * W, H * (0.15 + r() * 0.3), W * (0.08 + r() * 0.1), H * 0.03, 0, 0, Math.PI * 2); g.fill(); }
    return finish(c, false);
  }
  const body = kind === 1 ? "#8f7aa8" : "#5a4a72";
  const lit = kind === 1 ? ["rgba(255,236,190,.7)"] : ["#ffe2a0", "#fff2cf", "#ffd28a"];
  let x = 0;
  while (x < W) {
    const w = W * (kind === 1 ? 0.02 + r() * 0.04 : 0.03 + r() * 0.05);
    const h = H * (kind === 1 ? 0.35 + r() * 0.45 : 0.35 + r() * 0.5);
    g.fillStyle = body; g.fillRect(x, H - h, w, h);
    if (r() < 0.3) g.fillRect(x + w * 0.3, H - h - H * 0.05, w * 0.15, H * 0.05);
    for (let wy = H - h + 3; wy < H - 2; wy += kind === 1 ? 3 : 4) for (let wx = x + 2; wx < x + w - 2; wx += kind === 1 ? 3 : 4) {
      if (r() < 0.32) { g.fillStyle = lit[Math.floor(r() * lit.length)]; g.fillRect(wx, wy, kind === 1 ? 1 : 2, kind === 1 ? 1 : 2); }
    }
    // the sunset catching the left faces
    g.fillStyle = "rgba(255,190,140,.25)"; g.fillRect(x, H - h, Math.max(1, w * 0.25), h);
    x += w + (r() < 0.25 ? W * 0.006 * r() : 0);
  }
  if (kind === 2) {
    // street trees and lamps between the buildings
    for (let i = 0; i < 18; i++) { g.fillStyle = r() < 0.5 ? "#4e5f4c" : "#5c6d52"; g.beginPath(); g.ellipse(r() * W, H * (0.88 + r() * 0.1), W * (0.015 + r() * 0.02), H * 0.07, 0, 0, Math.PI * 2); g.fill(); }
  }
  return finish(c, true);
  function finish(cv: HTMLCanvasElement, wrap: boolean) {
    const t = tex(cv); t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; if (wrap) t.wrapS = THREE.RepeatWrapping; return t;
  }
}

function shaftTexture() {
  const [c, g] = canvas(64, 256);
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, "rgba(255,214,150,.75)"); gr.addColorStop(0.75, "rgba(255,214,150,.12)"); gr.addColorStop(1, "rgba(255,214,150,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
  const side = g.createLinearGradient(0, 0, 64, 0);
  side.addColorStop(0, "rgba(0,0,0,1)"); side.addColorStop(0.25, "rgba(0,0,0,0)"); side.addColorStop(0.75, "rgba(0,0,0,0)"); side.addColorStop(1, "rgba(0,0,0,1)");
  g.globalCompositeOperation = "destination-out"; g.fillStyle = side; g.fillRect(0, 0, 64, 256);
  return tex(c, false);
}
function softDot() {
  const [c, g] = canvas(64, 64);
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,255,255,.5)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return tex(c, false);
}

export function buildSubway(_opts: WorldOpts = {}): World {
  const group = new THREE.Group();
  const X0 = -9, X1 = 9;
  const add = (o: THREE.Object3D) => { group.add(o); return o; };
  const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, cast = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = true; return add(m) as THREE.Mesh; };

  /* ---- lighting: the low sun through the windows, warm ceiling light, a soft front fill ---- */
  add(new THREE.HemisphereLight("#fff0dd", "#5a4a50", 0.75));
  const sun = new THREE.DirectionalLight("#ffb46a", 4.2);
  sun.position.set(2.5, 3.6, -7.5);
  sun.target.position.set(0, 0, 1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 5, bottom: -5, near: 1, far: 20 });
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03; sun.shadow.radius = 4;
  add(sun); add(sun.target);
  const ceilingLight = new THREE.DirectionalLight("#fff6e8", 0.9);
  ceilingLight.position.set(0.5, 6, 2.5);
  add(ceilingLight);
  const fill = new THREE.DirectionalLight("#ffe9dc", 0.7);
  fill.position.set(2, 2.5, 7);
  add(fill);
  const passing = new THREE.PointLight("#ffcf8a", 0, 7, 1.8);
  passing.position.set(10, 1.7, -2.8);
  add(passing);

  /* ---- the shell ---- */
  const lower = curve([-1.74, -0.02], [-1.9, 0.6], [-1.88, 1.2], 8);
  const band = curve([-1.88, 1.2], [-1.9, 1.65], [-1.86, 2.1], 6);
  const upper = [...curve([-1.86, 2.1], [-1.8, 2.72], [-1.05, 2.82], 14), ...curve([-1.05, 2.82], [0.4, 2.9], [2.2, 2.88], 6).slice(1)];
  const wallMat = new THREE.MeshStandardMaterial({ color: "#d8d2c6", roughness: 0.7, side: THREE.DoubleSide });
  mesh(sweep(lower, X0, X1).geo, wallMat);
  const bandSweep = sweep(band, X0, X1);
  const bandMat = new THREE.MeshStandardMaterial({ map: windowBandTexture(bandSweep.length), alphaTest: 0.5, roughness: 0.6, side: THREE.DoubleSide });
  const bandMesh = mesh(bandSweep.geo, bandMat);
  bandMesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: bandMat.map, alphaTest: 0.5 });
  const up = sweep(upper, X0, X1, 2);
  const upTex = upperTextures(up.length);
  mesh(up.geo, new THREE.MeshStandardMaterial({ map: upTex.map, emissiveMap: upTex.emissive, emissive: new THREE.Color("#fff1d0"), emissiveIntensity: 1.4, roughness: 0.6, side: THREE.DoubleSide }));

  // the floor, with a slightly lighter aisle
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, 9), new THREE.MeshStandardMaterial({ map: rubberFloor(), roughness: 0.55, color: "#ffffff" }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 2.6); floor.receiveShadow = true; add(floor);

  /* ---- the long bench: a contoured seat for each person, a soft back that rolls over at the top ---- */
  const seatMat = new THREE.MeshPhysicalMaterial({ map: moquette(), roughness: 0.85, sheen: 0.7, sheenColor: new THREE.Color("#7fd3cf"), side: THREE.DoubleSide });
  const contour = (x: number, j: number) => j > 1 && j < 9 ? -0.018 * Math.cos((2 * Math.PI * (x + 0.24)) / 0.48) - 0.018 : 0;
  const cushion: P[] = [[-1.72, 0.43], ...curve([-1.6, 0.46], [-1.2, 0.48], [-1.14, 0.47], 6), ...curve([-1.14, 0.47], [-1.08, 0.45], [-1.11, 0.39], 4).slice(1), [-1.2, 0.35]];
  const back: P[] = [...curve([-1.7, 0.46], [-1.58, 0.82], [-1.76, 1.08], 10), ...curve([-1.76, 1.08], [-1.8, 1.17], [-1.88, 1.13], 4).slice(1)];
  const base: P[] = curve([-1.18, 0.36], [-1.24, 0.12], [-1.4, 0.04], 6).concat([[-1.74, 0.04]]);
  const baseMat = new THREE.MeshStandardMaterial({ color: "#9ca3ab", roughness: 0.35, metalness: 0.7, side: THREE.DoubleSide });
  const benches: [number, number][] = [[-7.6, -4.25], [-3.45, 3.45], [4.25, 7.6]];
  const steel = new THREE.MeshStandardMaterial({ color: "#e2e5ea", roughness: 0.15, metalness: 1 });
  for (const [a, b] of benches) {
    mesh(sweep(cushion, a, b, Math.round((b - a) / 0.06), contour).geo, seatMat);
    mesh(sweep(back, a, b, 2).geo, seatMat);
    mesh(sweep(base, a, b, 2).geo, baseMat, false);
    // curved grab bars at both ends
    for (const x of [a - 0.06, b + 0.06]) {
      const path = new THREE.CatmullRomCurve3([new THREE.Vector3(x, 0, -1.02), new THREE.Vector3(x, 0.7, -1.02), new THREE.Vector3(x, 0.98, -1.12), new THREE.Vector3(x, 1.08, -1.4), new THREE.Vector3(x, 1.1, -1.84)]);
      mesh(new THREE.TubeGeometry(path, 40, 0.022, 12), steel);
    }
  }
  // a paper shopping bag left on the bench
  const bag = new THREE.Group();
  const bagMat = new THREE.MeshStandardMaterial({ color: "#d9b27c", roughness: 0.9 });
  const bagBody = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.32, 4, 1), bagMat);
  bagBody.rotation.y = Math.PI / 4; bagBody.scale.set(1.1, 1, 0.55); bagBody.position.y = 0.16; bagBody.castShadow = true;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.008, 6, 20, Math.PI), new THREE.MeshStandardMaterial({ color: "#7a5a3a" }));
  handle.position.y = 0.32;
  const leek = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.3, 10), new THREE.MeshStandardMaterial({ color: "#8fc46a", roughness: 0.6 }));
  leek.position.set(0.05, 0.38, 0); leek.rotation.z = -0.25;
  bag.add(bagBody, handle, leek); bag.position.set(1.55, 0.47, -1.45); bag.rotation.y = 0.3;
  add(bag);

  /* ---- poles, the hand rail and swinging straps ---- */
  for (const x of [-2.3, 2.3]) {
    const pole = new THREE.CatmullRomCurve3([new THREE.Vector3(x, 0, 0.95), new THREE.Vector3(x, 2.5, 0.95), new THREE.Vector3(x, 2.75, 0.7), new THREE.Vector3(x, 2.86, 0.2)]);
    mesh(new THREE.TubeGeometry(pole, 40, 0.032, 14), steel);
  }
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, X1 - X0, 12), steel);
  rail.rotation.z = Math.PI / 2; rail.position.set(0, 2.42, -1.02); add(rail);
  const strapMat = new THREE.MeshStandardMaterial({ color: "#f3efe6", roughness: 0.55 });
  const straps: THREE.Group[] = [];
  for (let x = X0 + 0.4; x < X1; x += 0.6) {
    const s = new THREE.Group(); s.position.set(x, 2.42, -1.02);
    const strap = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6), strapMat); strap.position.y = -0.15; strap.scale.z = 2.5;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.014, 10, 28), strapMat); ring.position.y = -0.37;
    strap.castShadow = ring.castShadow = true;
    s.add(strap, ring); add(s); straps.push(s);
  }

  /* ---- outside: sky, far and near city, painted soft ---- */
  const sky = cityLayer(0), far = cityLayer(1), near = cityLayer(2);
  far.repeat.set(2, 1); near.repeat.set(1.5, 1);
  const plane = (t: THREE.Texture, w: number, h: number, y: number, z: number, transparent: boolean) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent, fog: false, depthWrite: !transparent }));
    m.position.set(0, y, z); return add(m);
  };
  plane(sky, 60, 22, 2.5, -16, false);
  plane(far, 44, 11, 1.2, -11, true);
  plane(near, 30, 7, 0.4, -6, true);

  // sunbeams coming in through each window
  const shaftTex = shaftTexture();
  const shafts: THREE.Mesh[] = [];
  const dir = new THREE.Vector3().subVectors(sun.target.position, sun.position).normalize();
  for (let x = X0 + PITCH / 2; x < X1; x += PITCH) {
    const o = new THREE.Vector3(x, 1.65, -1.88), w = PITCH * 0.75, L = 2.1; // short enough to fade out before reaching Mallow
    const p = [o.clone().add(new THREE.Vector3(-w / 2, 0, 0)), o.clone().add(new THREE.Vector3(w / 2, 0, 0))];
    const q = p.map((v) => v.clone().addScaledVector(dir, L));
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([...p[0].toArray(), ...p[1].toArray(), ...q[0].toArray(), ...q[1].toArray()], 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
    g.setIndex([0, 2, 1, 1, 2, 3]);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: shaftTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, opacity: 0.32, fog: false }));
    add(m); shafts.push(m);
  }

  // dust drifting in the light
  const N = 120;
  const pts = new Float32Array(N * 3);
  const seeds = Array.from({ length: N }, (_, i) => { const r = rng(700 + i); return [(r() - 0.5) * 10, 0.4 + r() * 2.2, -1.6 + r() * 3, r() * 6.28, 0.4 + r()] as const; });
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
  add(new THREE.Points(dustGeo, new THREE.PointsMaterial({ map: softDot(), color: "#ffdcaa", size: 0.06, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })));

  const update = (t: number, dt: number, m: number) => {
    far.offset.x = (t * 0.004 * m) % 1;
    near.offset.x = (t * 0.03 * m) % 1;
    // the car rocks gently; straps follow a moment later
    straps.forEach((s, i) => { s.rotation.z = Math.sin(t * 1.25 + i * 0.12) * 0.07 * m; s.rotation.x = Math.sin(t * 0.85 + i * 0.25) * 0.035 * m; });
    // a lamp outside sweeps past every few seconds, warming the wall and the seats
    const cyc = (t * 3.2) % 26;
    passing.position.x = 10 - cyc;
    passing.intensity = cyc < 20 && m ? 7 : 0;
    // clouds pass the sun now and then
    const k = 0.85 + 0.15 * Math.sin(t * 0.21) * Math.sin(t * 0.13);
    sun.intensity = 4.2 * (m ? k : 1);
    shafts.forEach((s) => { (s.material as THREE.MeshBasicMaterial).opacity = 0.32 * (m ? k : 1); });
    for (let i = 0; i < N; i++) {
      const [x, y, z, ph, sp] = seeds[i];
      pts[i * 3] = x + Math.sin(t * 0.15 * sp + ph) * 0.5 * m;
      pts[i * 3 + 1] = y + Math.sin(t * 0.25 * sp + ph * 2) * 0.25 * m;
      pts[i * 3 + 2] = z + Math.cos(t * 0.12 * sp + ph) * 0.3 * m;
    }
    dustGeo.attributes.position.needsUpdate = true;
    void dt;
  };

  return { group, update, background: new THREE.Color("#3a3036"), fog: new THREE.Fog("#e8c9a8", 14, 40) };
}
