/**
 * A quiet forest clearing at golden hour. Distant woods are painted layers (soft, like an out-of-focus lens),
 * nearer trees are knobbly trunks that rise out of frame, and the ground is moss, swaying grass, ferns,
 * mushrooms and stones, with shafts of light, drifting motes and the odd falling leaf.
 */
import * as THREE from "three";

/* ---------- small helpers ---------- */
function rng(seed: number) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }
function hash(x: number, y: number) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function noise(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x: number, y: number) => noise(x, y) * 0.55 + noise(x * 2.1, y * 2.1) * 0.3 + noise(x * 4.3, y * 4.3) * 0.15;
const canvas = (w: number, h: number) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")!] as const; };
const tex = (c: HTMLCanvasElement, srgb = true) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };

/* ---------- painted backdrop layers ----------
   Painted small and magnified by the GPU, so the farther a layer is, the softer it looks. */
function paintLayer(kind: 0 | 1 | 2) {
  const W = [150, 230, 340][kind], H = Math.round(W * 0.42);
  const [c, g] = canvas(W, H);
  const r = rng(11 + kind * 7);
  if (kind === 0) {
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#f6dca0"); sky.addColorStop(0.45, "#e9d7a6"); sky.addColorStop(1, "#b9c99a");
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    const sun = g.createRadialGradient(W * 0.3, H * 0.35, 0, W * 0.3, H * 0.35, W * 0.35);
    sun.addColorStop(0, "rgba(255,245,210,.95)"); sun.addColorStop(1, "rgba(255,245,210,0)");
    g.fillStyle = sun; g.fillRect(0, 0, W, H);
  }
  const trunk = ["#a7b48c", "#6f8a62", "#3f5a3c"][kind];
  const leafCols = [["#b2bf8c", "#c4cb97", "#a3b583"], ["#6f8f5c", "#7f9c63", "#5d7e50", "#93a86a"], ["#3e5c35", "#4a6c3c", "#33502f", "#5d7c42"]][kind];
  const n = [26, 18, 12][kind];
  for (let i = 0; i < n; i++) {
    const x = (i / n) * W + (r() - 0.5) * (W / n);
    const w = W * (0.006 + r() * 0.01) * (kind + 1);
    g.fillStyle = trunk;
    g.beginPath(); g.moveTo(x - w, H); g.lineTo(x - w * 0.6, H * 0.15); g.lineTo(x + w * 0.6, H * 0.15); g.lineTo(x + w, H); g.fill();
  }
  // canopy and undergrowth as overlapping soft dabs
  const dabs = [1600, 2200, 2800][kind];
  for (let i = 0; i < dabs; i++) {
    const top = r() < 0.6;
    const x = r() * W, y = top ? r() * H * 0.45 : H * (0.62 + r() * 0.4);
    const rad = W * (0.005 + r() * 0.016) * (top ? 1.2 : 0.8);
    g.globalAlpha = 0.5 + r() * 0.5;
    g.fillStyle = leafCols[Math.floor(r() * leafCols.length)];
    g.beginPath(); g.ellipse(x, y, rad, rad * (0.7 + r() * 0.5), r() * 3, 0, Math.PI * 2); g.fill();
  }
  // warm light catching the left edges
  g.globalAlpha = 1;
  const light = g.createLinearGradient(0, 0, W, 0);
  light.addColorStop(0, `rgba(255,224,150,${[0.25, 0.18, 0.12][kind]})`); light.addColorStop(0.6, "rgba(255,224,150,0)");
  g.fillStyle = light; g.globalCompositeOperation = "source-atop"; g.fillRect(0, 0, W, H); g.globalCompositeOperation = "source-over";
  if (kind > 0) {
    // keep the sky between the trees open on the nearer layers
    g.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 40; i++) { g.globalAlpha = 0.6; g.beginPath(); g.ellipse(r() * W, H * (0.2 + r() * 0.35), W * 0.04, H * 0.05, 0, 0, Math.PI * 2); g.fill(); }
    g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
  }
  const t = tex(c); t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = false;
  return t;
}

/* ---------- textures ---------- */
function barkTexture() {
  const [c, g] = canvas(128, 512);
  g.fillStyle = "#6b5443"; g.fillRect(0, 0, 128, 512);
  const r = rng(3);
  for (let i = 0; i < 220; i++) {
    const x = r() * 128, w = 1 + r() * 4;
    g.fillStyle = r() < 0.5 ? "rgba(40,28,20,.45)" : "rgba(160,140,110,.25)";
    g.beginPath(); g.moveTo(x, 0);
    for (let y = 0; y <= 512; y += 32) g.lineTo(x + Math.sin(y * 0.03 + i) * 3, y);
    g.lineTo(x + w, 512); g.lineTo(x + w, 0); g.fill();
  }
  const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 3); return t;
}
function groundTexture() {
  const [c, g] = canvas(512, 512);
  const img = g.createImageData(512, 512);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const n = fbm(x / 24, y / 24), m = hash(x, y);
    const i = (y * 512 + x) * 4;
    const k = 0.75 + n * 0.4 + (m - 0.5) * 0.12;
    img.data[i] = 255 * k; img.data[i + 1] = 255 * k; img.data[i + 2] = 255 * k; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 7); t.anisotropy = 8; return t;
}
function fernTexture() {
  const [c, g] = canvas(128, 512);
  g.translate(64, 508);
  const r = rng(5);
  g.strokeStyle = "#3f6b2f"; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(8, -250, -6, -500); g.stroke();
  for (let i = 0; i < 26; i++) {
    const t = i / 26, y = -20 - t * 470, x = 8 * Math.sin(t * 3) - t * 6, len = 58 * Math.sin(Math.PI * (0.15 + t * 0.85)) + 6;
    for (const s of [-1, 1]) {
      const col = ["#5e9a44", "#6aa84c", "#4f8a3a"][Math.floor(r() * 3)];
      g.fillStyle = col;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + s * len * 0.6, y - 14, x + s * len, y - 4 - len * 0.15); g.quadraticCurveTo(x + s * len * 0.5, y + 6, x, y + 4); g.fill();
    }
  }
  const t = tex(c); return t;
}
function leafTexture() {
  const [c, g] = canvas(64, 64);
  g.translate(32, 32); g.rotate(0.6);
  g.fillStyle = "#e0a13c"; g.beginPath(); g.moveTo(0, -26); g.quadraticCurveTo(18, -6, 0, 26); g.quadraticCurveTo(-18, -6, 0, -26); g.fill();
  g.strokeStyle = "rgba(120,60,20,.6)"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -24); g.lineTo(0, 24); g.stroke();
  return tex(c);
}
function softDot() {
  const [c, g] = canvas(64, 64);
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,255,255,.5)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return tex(c, false);
}
function shaftTexture() {
  const [c, g] = canvas(64, 256);
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, "rgba(255,236,190,.9)"); gr.addColorStop(1, "rgba(255,236,190,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
  const side = g.createLinearGradient(0, 0, 64, 0);
  side.addColorStop(0, "rgba(0,0,0,1)"); side.addColorStop(0.5, "rgba(0,0,0,0)"); side.addColorStop(1, "rgba(0,0,0,1)");
  g.globalCompositeOperation = "destination-out"; g.fillStyle = side; g.fillRect(0, 0, 64, 256);
  return tex(c, false);
}

/* ---------- pieces ---------- */
const groundY = (x: number, z: number) => {
  const d = Math.hypot(x, z - 0.35);
  const flat = THREE.MathUtils.smoothstep(d, 1.4, 4);
  return (fbm(x * 0.25 + 3, z * 0.25) - 0.5) * 0.9 * flat + Math.max(0, -z - 4) * 0.04;
};

function buildGround() {
  const geo = new THREE.PlaneGeometry(70, 50, 140, 100);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, -12);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const col = new Float32Array(pos.count * 3);
  const moss = new THREE.Color("#6f8f45"), dark = new THREE.Color("#4a6634"), dirt = new THREE.Color("#9a8a5c"), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, groundY(x, z));
    const n = fbm(x * 0.4, z * 0.4);
    c.copy(dark).lerp(moss, n);
    const clearing = 1 - THREE.MathUtils.smoothstep(Math.hypot(x * 0.8, z - 0.5), 0.6, 2.2);
    c.lerp(dirt, clearing * 0.55 * (0.6 + n * 0.4));
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: groundTexture(), roughness: 0.95 }));
  m.receiveShadow = true;
  return m;
}

function buildTrunk(x: number, z: number, r: number, bark: THREE.Texture, seed: number) {
  const h = 16;
  const geo = new THREE.CylinderGeometry(r * 0.75, r, h, 28, 48, true);
  geo.translate(0, h / 2, 0);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const col = new Float32Array(pos.count * 3);
  const barkC = new THREE.Color("#ffffff"), mossC = new THREE.Color("#7da04a"), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i);
    const a = Math.atan2(pz, px);
    const flare = 1 + 0.9 * Math.exp(-py * 2.2) * (0.6 + 0.4 * Math.sin(a * 5 + seed));
    const knob = 1 + (noise(a * 2 + seed, py * 0.8) - 0.5) * 0.25;
    const k = flare * knob;
    pos.setX(i, px * k); pos.setZ(i, pz * k);
    // moss on the shady lower side
    const mossy = THREE.MathUtils.smoothstep(2.4 - py, 0, 2) * (0.5 + 0.5 * Math.cos(a - 2)) * noise(a * 3, py * 2 + seed);
    c.copy(barkC).lerp(mossC, Math.min(1, mossy * 1.6));
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: bark, vertexColors: true, roughness: 0.95 }));
  m.position.set(x, groundY(x, z) - 0.15, z);
  m.rotation.set((rng(seed)() - 0.5) * 0.06, rng(seed + 1)() * 6, (rng(seed + 2)() - 0.5) * 0.06);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

function buildStone(x: number, z: number, s: number, seed: number) {
  const geo = new THREE.IcosahedronGeometry(1, 4);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const col = new Float32Array(pos.count * 3);
  const rock = new THREE.Color("#9a9a8c"), moss = new THREE.Color("#6f9443"), c = new THREE.Color();
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const k = 1 + (noise(v.x * 1.6 + seed, v.z * 1.6 + v.y) - 0.5) * 0.45;
    v.multiplyScalar(k); v.y *= 0.6;
    pos.setXYZ(i, v.x, v.y, v.z);
    c.copy(rock).lerp(moss, THREE.MathUtils.smoothstep(v.y, 0.1, 0.5) * (0.6 + 0.4 * noise(v.x * 4, v.z * 4)));
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }));
  m.scale.setScalar(s); m.position.set(x, groundY(x, z) + s * 0.1, z); m.rotation.y = seed;
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

function buildMushrooms(x: number, z: number) {
  const g = new THREE.Group();
  const capM = new THREE.MeshPhysicalMaterial({ color: "#c8763f", roughness: 0.5, clearcoat: 0.3 });
  const stemM = new THREE.MeshStandardMaterial({ color: "#f1e6cf", roughness: 0.8 });
  const capGeo = new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2);
  const stemGeo = new THREE.CylinderGeometry(0.75, 1, 1, 16);
  for (const [dx, dz, s, tilt] of [[0, 0, 1, 0.08], [0.16, 0.1, 0.65, -0.15], [-0.12, 0.14, 0.5, 0.2]] as const) {
    const m = new THREE.Group();
    const stem = new THREE.Mesh(stemGeo, stemM); stem.scale.set(0.03 * s, 0.14 * s, 0.03 * s); stem.position.y = 0.07 * s;
    const cap = new THREE.Mesh(capGeo, capM); cap.scale.set(0.09 * s, 0.065 * s, 0.09 * s); cap.position.y = 0.13 * s;
    stem.castShadow = cap.castShadow = true;
    m.add(stem, cap); m.position.set(dx, 0, dz); m.rotation.z = tilt;
    g.add(m);
  }
  g.position.set(x, groundY(x, z), z);
  return g;
}

function buildFerns(spots: [number, number, number][]) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ map: fernTexture(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.8 });
  const card = new THREE.PlaneGeometry(0.28, 1.1, 1, 6);
  card.translate(0, 0.55, 0);
  // bend each card outwards like a frond
  const pos = card.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); pos.setZ(i, (y / 1.1) ** 2 * 0.5); }
  card.computeVertexNormals();
  spots.forEach(([x, z, s], k) => {
    const clump = new THREE.Group();
    const n = 7;
    for (let i = 0; i < n; i++) {
      const f = new THREE.Mesh(card, mat);
      f.rotation.set(0, (i / n) * Math.PI * 2 + k, 0);
      f.rotateX(-0.35);
      f.scale.setScalar(0.8 + ((i * 37) % 10) / 25);
      f.castShadow = true;
      clump.add(f);
    }
    clump.position.set(x, groundY(x, z), z); clump.scale.setScalar(s);
    g.add(clump);
  });
  return g;
}

function buildGrass(count: number) {
  const blade = new THREE.PlaneGeometry(0.035, 0.3, 1, 4);
  blade.translate(0, 0.15, 0);
  const p = blade.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 0.3; p.setX(i, p.getX(i) * (1 - y * 0.85)); p.setZ(i, y * y * 0.06); }
  blade.computeVertexNormals();
  const uniforms = { uTime: { value: 0 } };
  const mat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.75 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uniforms.uTime;
    sh.vertexShader = "uniform float uTime;\n" + sh.vertexShader
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        vec3 ip = instanceMatrix[3].xyz;
        float bend = uv.y * uv.y;
        transformed.x += (sin(uTime * 1.4 + ip.x * 0.7 + ip.z * 0.5) * 0.06 + sin(uTime * 3.1 + ip.z * 2.0) * 0.015) * bend;
        transformed.z += cos(uTime * 1.1 + ip.x * 0.4) * 0.03 * bend;`)
      .replace("#include <color_vertex>", "#include <color_vertex>\n#ifdef USE_INSTANCING_COLOR\n vColor.rgb *= mix(0.42, 1.08, uv.y);\n#endif");
  };
  const mesh = new THREE.InstancedMesh(blade, mat, count);
  const r = rng(21), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3(), c = new THREE.Color();
  const greens = ["#7fae4a", "#8fbd55", "#6e9a3f", "#a3c25e", "#5f8a38"].map((x) => new THREE.Color(x));
  for (let i = 0; i < count; i++) {
    let x = 0, z = 0;
    for (;;) { x = (r() - 0.5) * 20; z = 3.2 - r() * 15.2; const d = Math.hypot(x * 0.8, z - 0.5); if (d > 0.55 && r() < 1.15 - d / 9) break; }
    v.set(x, groundY(x, z) - 0.02, z);
    q.setFromEuler(new THREE.Euler((r() - 0.5) * 0.3, r() * Math.PI, (r() - 0.5) * 0.3));
    const h = (0.5 + r() * 0.7) * (z > 1.6 ? 0.4 : z > 0.8 ? 0.7 : 1);
    s.set(1, h, 1);
    mesh.setMatrixAt(i, m4.compose(v, q, s));
    c.copy(greens[Math.floor(r() * greens.length)]).multiplyScalar(0.9 + r() * 0.2);
    mesh.setColorAt(i, c);
  }
  mesh.receiveShadow = true;
  return { mesh, uniforms };
}

export type World = { group: THREE.Group; update: (t: number, dt: number, motion: number) => void; background: THREE.Color; fog: THREE.Fog };
/** lite: phones and small devices, so fewer small things (grass, raindrops). */
export type WorldOpts = { lite?: boolean };

export function buildForest(opts: WorldOpts = {}): World {
  const group = new THREE.Group();

  // golden-hour sun from behind on the left, soft sky light, and a gentle fill so Mallow's face reads
  group.add(new THREE.HemisphereLight("#ffeccc", "#4d6b35", 1.0));
  const key = new THREE.DirectionalLight("#ffd28f", 3.2);
  key.position.set(-4, 6.5, -2.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -4, near: 1, far: 22 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03; key.shadow.radius = 6;
  group.add(key);
  const fill = new THREE.DirectionalLight("#fff4e4", 0.9);
  fill.position.set(3, 3.5, 6);
  group.add(fill);

  // painted woods behind, farthest first
  const layers: [number, number, number, number][] = [[0, -26, 70, 30], [1, -18, 52, 22], [2, -11, 38, 16]];
  for (const [k, z, w, h] of layers) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: paintLayer(k as 0 | 1 | 2), transparent: k > 0, fog: false, depthWrite: k === 0 }));
    m.position.set(0, h / 2 - 1.2 - k * 0.3, z);
    group.add(m);
  }

  group.add(buildGround());
  const bark = barkTexture();
  const trunks: [number, number, number][] = [[-2.9, -2.2, 0.32], [3.3, -3.0, 0.42], [-5.8, -5.5, 0.5], [5.6, -7, 0.55], [-1.4, -7.5, 0.38], [1.6, -11, 0.55], [-8.2, -10, 0.6], [8.6, -4.2, 0.48], [-4.6, 1.8, 0.36], [4.9, 2.2, 0.4], [10, -12, 0.65], [-11, -6, 0.6]];
  trunks.forEach(([x, z, r], i) => group.add(buildTrunk(x, z, r, bark, i * 3.7)));
  group.add(buildStone(1.3, 0.2, 0.32, 1), buildStone(-1.7, -0.6, 0.45, 2), buildStone(2.4, -1.6, 0.25, 3), buildStone(-3.4, -1.4, 0.3, 4));
  group.add(buildMushrooms(-0.85, 0.75), buildMushrooms(1.75, -0.35));
  group.add(buildFerns([[-2.2, 0.3, 0.9], [2.6, 0.1, 1.0], [-3.6, -2.6, 1.2], [3.9, -2.4, 1.1], [-1.2, -2.8, 0.8], [1.2, -3.4, 0.9], [-5, 0, 1.1], [5.4, 0.8, 1.2]]));
  const grass = buildGrass(opts.lite ? 4500 : 9000);
  group.add(grass.mesh);

  // shafts of light slanting through the trees
  const shaftTex = shaftTexture();
  const shafts: THREE.Mesh[] = [];
  for (const [x, z, w, a] of [[-1.8, -4, 1.4, 0.45], [0.8, -6, 2.2, 0.35], [-4.2, -7, 1.8, 0.28], [2.8, -3.2, 1.0, 0.5]] as const) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 12), new THREE.MeshBasicMaterial({ map: shaftTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.35, fog: false }));
    m.position.set(x, 5.2, z); m.rotation.z = -0.42;
    group.add(m); shafts.push(m);
  }

  // the low sun glowing through the trees, top left
  const [gc, gg] = canvas(256, 256);
  const glow = gg.createRadialGradient(128, 128, 0, 128, 128, 128);
  glow.addColorStop(0, "rgba(255,226,160,.9)"); glow.addColorStop(0.4, "rgba(255,210,140,.35)"); glow.addColorStop(1, "rgba(255,210,140,0)");
  gg.fillStyle = glow; gg.fillRect(0, 0, 256, 256);
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(gc, false), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.8 }));
  sun.scale.set(16, 16, 1); sun.position.set(-7, 7, -9);
  group.add(sun);

  // drifting motes
  const N = 140;
  const pts = new Float32Array(N * 3);
  const seeds = Array.from({ length: N }, (_, i) => { const r = rng(300 + i); return [(r() - 0.5) * 12, 0.3 + r() * 3.5, 2 - r() * 9, r() * 6.28, 0.4 + r()] as const; });
  const motesGeo = new THREE.BufferGeometry(); motesGeo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
  const motes = new THREE.Points(motesGeo, new THREE.PointsMaterial({ map: softDot(), color: "#ffe8a8", size: 0.09, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
  group.add(motes);

  // a few falling leaves
  const leafMat = new THREE.MeshStandardMaterial({ map: leafTexture(), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.7 });
  const leafGeo = new THREE.PlaneGeometry(0.16, 0.16);
  const leaves = Array.from({ length: 10 }, (_, i) => {
    const m = new THREE.Mesh(leafGeo, leafMat);
    const r = rng(500 + i);
    const st = { x: (r() - 0.5) * 7, z: 1.5 - r() * 6, y: r() * 5, speed: 0.25 + r() * 0.2, ph: r() * 6 };
    group.add(m);
    return { m, st };
  });

  const update = (t: number, dt: number, motion: number) => {
    grass.uniforms.uTime.value = t * motion;
    shafts.forEach((s, i) => { (s.material as THREE.MeshBasicMaterial).opacity = 0.3 + 0.1 * Math.sin(t * 0.35 + i * 1.7); });
    for (let i = 0; i < N; i++) {
      const [x, y, z, ph, sp] = seeds[i];
      pts[i * 3] = x + Math.sin(t * 0.2 * sp + ph) * 0.6 * motion;
      pts[i * 3 + 1] = y + Math.sin(t * 0.33 * sp + ph * 2) * 0.3 * motion;
      pts[i * 3 + 2] = z + Math.cos(t * 0.17 * sp + ph) * 0.4 * motion;
    }
    motesGeo.attributes.position.needsUpdate = true;
    if (motion) for (const { m, st } of leaves) {
      st.y -= st.speed * dt;
      if (st.y < groundY(st.x, st.z)) st.y = 5 + Math.random() * 2;
      m.position.set(st.x + Math.sin(t * 0.9 + st.ph) * 0.4, st.y, st.z + Math.cos(t * 0.7 + st.ph) * 0.2);
      m.rotation.set(t * 1.3 + st.ph, t * 0.9, Math.sin(t * 2 + st.ph));
    }
  };

  return { group, update, background: new THREE.Color("#e6dcae"), fog: new THREE.Fog("#d8d6a8", 10, 34) };
}
