/** Small shared helpers for Mallow's places: seeded randomness, noise, canvases, and swept / curved shapes. */
import * as THREE from "three";

export function rng(seed: number) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }
export function hash(x: number, y: number) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
export function noise(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export const fbm = (x: number, y: number) => noise(x, y) * 0.55 + noise(x * 2.1, y * 2.1) * 0.3 + noise(x * 4.3, y * 4.3) * 0.15;

export const canvas = (w: number, h: number) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")!] as const; };
export const tex = (c: HTMLCanvasElement, srgb = true) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
/** A texture painted small on purpose: magnified by the GPU it looks soft, like something out of focus. */
export const soft = (c: HTMLCanvasElement, wrap = false) => { const t = tex(c); t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; if (wrap) t.wrapS = THREE.RepeatWrapping; return t; };

export function softDot() {
  const [c, g] = canvas(64, 64);
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,255,255,.5)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return tex(c, false);
}
/** A glowing sprite (lamps, bokeh, the sun). */
export function glow(color: string, size: number, opacity = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity, fog: false }));
  s.scale.setScalar(size);
  return s;
}
/** A long soft streak lying on wet ground under a light, pointing at the viewer: a cheap reflection. */
export function wetStreak(color: string, x: number, z: number, w: number, len: number, opacity = 0.5) {
  const [c, g] = canvas(32, 128);
  const gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 32, 128);
  const side = g.createLinearGradient(0, 0, 32, 0);
  side.addColorStop(0, "rgba(0,0,0,1)"); side.addColorStop(0.5, "rgba(0,0,0,0)"); side.addColorStop(1, "rgba(0,0,0,1)");
  g.globalCompositeOperation = "destination-out"; g.fillStyle = side; g.fillRect(0, 0, 32, 128);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, len), new THREE.MeshBasicMaterial({ map: tex(c, false), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, 0.006, z + len / 2);
  return m;
}

export type P = [number, number]; // (z, y) or any 2D pair
export function curve(a: P, c: P, b: P, n = 10): P[] {
  return Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]] as P; });
}
/** Sweeps a (z, y) profile along x. u runs along x in metres, v along the profile in metres. */
export function sweep(profile: P[], x0: number, x1: number, segX = 2, bend?: (x: number, j: number) => number) {
  const n = profile.length;
  const len = [0];
  for (let j = 1; j < n; j++) len.push(len[j - 1] + Math.hypot(profile[j][0] - profile[j - 1][0], profile[j][1] - profile[j - 1][1]));
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= segX; i++) {
    const x = x0 + ((x1 - x0) * i) / segX;
    for (let j = 0; j < n; j++) { pos.push(x, profile[j][1] + (bend ? bend(x, j) : 0), profile[j][0]); uv.push(x, len[j]); }
  }
  for (let i = 0; i < segX; i++) for (let j = 0; j < n - 1; j++) { const a = i * n + j, b = (i + 1) * n + j; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return { geo: g, length: len[n - 1] };
}
/** A round tube through points. */
export function tube(points: [number, number, number][], r: number, mat: THREE.Material, seg = 48) {
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), seg, r, 12), mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
/** A turned shape (cups, tables, buckets) from a (radius, y) outline. */
export function lathe(outline: P[], mat: THREE.Material, seg = 48) {
  const m = new THREE.Mesh(new THREE.LatheGeometry(outline.map(([r, y]) => new THREE.Vector2(r, y)), seg), mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
/** A flat plane at a height, painted, for backdrops. */
export function backdrop(t: THREE.Texture, w: number, h: number, y: number, z: number, transparent = true) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent, fog: false, depthWrite: !transparent }));
  m.position.set(0, y, z);
  return m;
}
