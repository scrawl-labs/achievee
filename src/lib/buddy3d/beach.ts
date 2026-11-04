/**
 * A beach in the late afternoon: a painted sky and horizon, a gently moving sea that glitters under the sun,
 * foam that washes in and slides back over darker wet sand, rippled dry sand with Mallow's footprints, a striped
 * parasol and towel, a starfish, shells and gulls.
 */
import * as THREE from "three";
import type { World, WorldOpts } from "./forest";
import { backdrop, canvas, fbm, hash, lathe, noise, rng, soft, softDot, tex } from "./util";

const SHORE = -1.7; // where the sea meets the sand, on average

function skyTexture() {
  const W = 260, H = 110;
  const [c, g] = canvas(W, H);
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#6fb0e8"); sky.addColorStop(0.6, "#bfe0f5"); sky.addColorStop(0.92, "#ffe9cc"); sky.addColorStop(1, "#ffe2bd");
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  const sun = g.createRadialGradient(W * 0.3, H * 0.62, 0, W * 0.3, H * 0.62, W * 0.25);
  sun.addColorStop(0, "rgba(255,250,230,1)"); sun.addColorStop(0.2, "rgba(255,240,205,.7)"); sun.addColorStop(1, "rgba(255,240,205,0)");
  g.fillStyle = sun; g.fillRect(0, 0, W, H);
  const r = rng(6);
  for (let i = 0; i < 14; i++) {
    const x = r() * W, y = H * (0.15 + r() * 0.45), w = W * (0.05 + r() * 0.12);
    for (let k = 0; k < 6; k++) { g.fillStyle = "rgba(255,255,255,.55)"; g.beginPath(); g.ellipse(x + (r() - 0.5) * w, y + (r() - 0.5) * 4, w * (0.3 + r() * 0.3), 3 + r() * 4, 0, 0, Math.PI * 2); g.fill(); }
  }
  // a faint island on the horizon
  g.fillStyle = "rgba(120,150,170,.45)"; g.beginPath(); g.ellipse(W * 0.78, H * 0.93, W * 0.12, H * 0.05, 0, Math.PI, 0); g.fill();
  return soft(c);
}
function sandTexture() {
  const [c, g] = canvas(512, 512);
  const img = g.createImageData(512, 512);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const n = fbm(x / 30, y / 30), m = hash(x, y);
    const k = 0.86 + n * 0.18 + (m - 0.5) * 0.14;
    const i = (y * 512 + x) * 4; img.data[i] = 255 * k; img.data[i + 1] = 255 * k; img.data[i + 2] = 255 * k; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(9, 6); t.anisotropy = 8; return t;
}
function waterNormal() {
  const N = 256;
  const [c, g] = canvas(N, N);
  const img = g.createImageData(N, N);
  const h = (x: number, y: number) => noise(x / 14, y / 14) * 0.6 + noise(x / 6, y / 6) * 0.4;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = h(x + 1, y) - h(x - 1, y), dy = h(x, y + 1) - h(x, y - 1);
    const i = (y * N + x) * 4;
    img.data[i] = 128 - dx * 300; img.data[i + 1] = 128 - dy * 300; img.data[i + 2] = 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = tex(c, false); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(14, 10); return t;
}
function foamTexture() {
  const W = 512, H = 64;
  const [c, g] = canvas(W, H);
  const r = rng(2);
  // a lacy line of foam with bubbles trailing behind
  for (let x = 0; x < W; x++) {
    const edge = 14 + noise(x / 18, 1) * 18;
    const gr = g.createLinearGradient(0, 0, 0, edge + 20);
    gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(Math.min(0.99, edge / (edge + 20)), "rgba(255,255,255,.95)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(x, 0, 1, edge + 20);
  }
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.5})`; g.beginPath(); g.arc(r() * W, r() * H * 0.55, 0.8 + r() * 2.2, 0, Math.PI * 2); g.fill(); }
  const t = tex(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(3, 1); return t;
}
function stripes(cols: string[], n: number) {
  const [c, g] = canvas(256, 32);
  for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; g.fillRect((i * 256) / n, 0, 256 / n + 1, 32); }
  return tex(c);
}

const sandY = (x: number, z: number) => (z - SHORE) * 0.045 + (fbm(x * 0.3, z * 0.3) - 0.5) * 0.12 * THREE.MathUtils.smoothstep(Math.hypot(x, z - 0.35), 1.2, 3);

export function buildBeach(_opts: WorldOpts = {}): World {
  const group = new THREE.Group();
  const add = <T extends THREE.Object3D>(o: T) => { group.add(o); return o; };

  /* ---- light: the sun low over the sea on the left, a bright sky ---- */
  add(new THREE.HemisphereLight("#d6ecff", "#f0d8a8", 1.15));
  const sun = new THREE.DirectionalLight("#fff0d2", 2.8);
  sun.position.set(-6, 6.5, -6); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 6, bottom: -5, near: 1, far: 25 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 5;
  add(sun);
  const fill = new THREE.DirectionalLight("#fff6ec", 0.9); fill.position.set(3, 3, 7); add(fill);

  /* ---- sky ---- */
  add(backdrop(skyTexture(), 120, 50, 18, -45, false));

  /* ---- sand: rippled, paler when dry, darker and shinier near the water ---- */
  const sandGeo = new THREE.PlaneGeometry(40, 20, 160, 80);
  sandGeo.rotateX(-Math.PI / 2); sandGeo.translate(0, 0, 4);
  const sp = sandGeo.getAttribute("position") as THREE.BufferAttribute;
  const col = new Float32Array(sp.count * 3);
  const dry = new THREE.Color("#ecd3a2"), wet = new THREE.Color("#b49563"), c = new THREE.Color();
  for (let i = 0; i < sp.count; i++) {
    const x = sp.getX(i), z = sp.getZ(i);
    const ripple = Math.sin(x * 9 + noise(x * 0.8, z * 0.8) * 6) * 0.008 * THREE.MathUtils.smoothstep(z, SHORE + 0.6, SHORE + 2.5);
    sp.setY(i, sandY(x, z) + ripple);
    c.copy(dry).lerp(wet, 1 - THREE.MathUtils.smoothstep(z, SHORE + 0.2, SHORE + 1.6));
    c.multiplyScalar(0.94 + noise(x * 2, z * 2) * 0.1);
    col.set([c.r, c.g, c.b], i * 3);
  }
  sandGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  sandGeo.computeVertexNormals();
  const sand = add(new THREE.Mesh(sandGeo, new THREE.MeshPhysicalMaterial({ vertexColors: true, map: sandTexture(), roughness: 0.9, clearcoat: 0.15, clearcoatRoughness: 0.6 })));
  sand.receiveShadow = true;

  /* ---- the sea ---- */
  const wn = waterNormal();
  const seaGeo = new THREE.PlaneGeometry(140, 50, 120, 60);
  seaGeo.rotateX(-Math.PI / 2); seaGeo.translate(0, 0, -25 + SHORE + 0.4);
  const seaCol = new Float32Array(seaGeo.getAttribute("position").count * 3);
  const shallow = new THREE.Color("#5fd0c8"), deep = new THREE.Color("#2a6fb0");
  const sp2 = seaGeo.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < sp2.count; i++) { c.copy(shallow).lerp(deep, THREE.MathUtils.smoothstep(-sp2.getZ(i) + SHORE, 0.5, 9)); seaCol.set([c.r, c.g, c.b], i * 3); }
  seaGeo.setAttribute("color", new THREE.BufferAttribute(seaCol, 3));
  const seaU = { uTime: { value: 0 } };
  const seaMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, normalMap: wn, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.12, metalness: 0, transparent: true, opacity: 0.93, clearcoat: 0.6 });
  seaMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = seaU.uTime;
    sh.vertexShader = "uniform float uTime;\n" + sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
      transformed.y += sin(position.z * 1.3 + uTime * 1.1) * 0.035 + sin(position.x * 0.7 + position.z * 0.4 + uTime * 0.8) * 0.025;`);
  };
  const sea = add(new THREE.Mesh(seaGeo, seaMat)); sea.position.y = -0.02; sea.receiveShadow = true;
  // a glittering path where the sun hits the water
  const [gc, gg] = canvas(64, 256);
  const r = rng(13);
  for (let i = 0; i < 260; i++) { const y = r() * 256; gg.fillStyle = `rgba(255,250,225,${0.3 + r() * 0.7})`; gg.fillRect(32 + (r() - 0.5) * (8 + y * 0.22), y, 1 + r() * 3, 1); }
  const glitter = add(new THREE.Mesh(new THREE.PlaneGeometry(9, 32), new THREE.MeshBasicMaterial({ map: tex(gc, false), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 })));
  glitter.rotation.x = -Math.PI / 2; glitter.position.set(-4.5, 0.03, -18);

  /* ---- foam washing in and out ---- */
  const foamTex = foamTexture();
  const foams = [0, 1].map((k) => {
    const m = add(new THREE.Mesh(new THREE.PlaneGeometry(40, 1.1, 40, 1), new THREE.MeshBasicMaterial({ map: foamTex.clone(), transparent: true, depthWrite: false, opacity: 0.9 })));
    m.rotation.x = -Math.PI / 2; (m.material as THREE.MeshBasicMaterial).map!.offset.x = k * 0.37;
    return m;
  });
  const wetSheen = add(new THREE.Mesh(new THREE.PlaneGeometry(40, 1.4), new THREE.MeshPhysicalMaterial({ color: "#a6c9d0", transparent: true, opacity: 0.35, roughness: 0.05, clearcoat: 1, depthWrite: false })));
  wetSheen.rotation.x = -Math.PI / 2;

  /* ---- things on the sand ---- */
  // Mallow's footprints, coming from the left
  const printMat = new THREE.MeshBasicMaterial({ color: "#a98a58", transparent: true, opacity: 0.45, depthWrite: false });
  for (let i = 0; i < 9; i++) {
    const x = -0.55 - i * 0.42, z = 0.6 + Math.sin(i * 0.6) * 0.15 + (i % 2 ? 0.1 : -0.1);
    const p = add(new THREE.Mesh(new THREE.CircleGeometry(0.07, 16), printMat));
    p.rotation.x = -Math.PI / 2; p.scale.set(1.2, 0.8, 1); p.position.set(x, sandY(x, z) + 0.01, z);
  }
  // the parasol and a towel in its shade
  const parasol = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.3, 10), new THREE.MeshStandardMaterial({ color: "#f4efe6", roughness: 0.5 }));
  pole.position.y = 1.15; pole.castShadow = true;
  const canopy = lathe([[0, 2.3], [0.4, 2.22], [0.9, 2.02], [1.25, 1.84], [1.28, 1.8]], new THREE.MeshStandardMaterial({ map: stripes(["#ff6f61", "#fff6ea"], 16), roughness: 0.6, side: THREE.DoubleSide }), 32);
  parasol.add(pole, canopy);
  parasol.position.set(-2.8, sandY(-2.8, -0.4) - 0.08, -0.4); parasol.rotation.z = 0.08;
  add(parasol);
  const towel = add(new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.6, 8, 16), new THREE.MeshStandardMaterial({ map: stripes(["#4aa3df", "#ffffff", "#ffd166", "#ffffff"], 8), roughness: 0.9 })));
  towel.rotation.set(-Math.PI / 2, 0, 0.4); towel.position.set(-2.5, sandY(-2.5, 0.1) + 0.012, 0.1); towel.receiveShadow = true;
  // a starfish and some shells
  const star = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + Math.PI / 2, rr = i % 2 ? 0.045 : 0.12; const x = Math.cos(a) * rr, y = Math.sin(a) * rr; if (i) star.lineTo(x, y); else star.moveTo(x, y); }
  const starMesh = add(new THREE.Mesh(new THREE.ExtrudeGeometry(star, { depth: 0.015, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 4 }), new THREE.MeshStandardMaterial({ color: "#ff8a4c", roughness: 0.6 })));
  starMesh.rotation.set(-Math.PI / 2, 0, 0.5); starMesh.position.set(1.15, sandY(1.15, 0.9) + 0.02, 0.9); starMesh.castShadow = true;
  const shellMat = new THREE.MeshStandardMaterial({ color: "#fbe9de", roughness: 0.4 });
  for (const [x, z, s] of [[1.7, 0.2, 1], [-1.0, 1.4, 0.8], [2.3, -0.6, 0.7]] as const) {
    const sh = add(new THREE.Mesh(new THREE.SphereGeometry(0.07 * s, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), shellMat));
    sh.scale.y = 0.45; sh.position.set(x, sandY(x, z), z); sh.castShadow = true;
  }
  // a bucket
  const bucket = lathe([[0, 0], [0.11, 0], [0.14, 0.2], [0.145, 0.2], [0.115, 0.01], [0, 0.01]], new THREE.MeshStandardMaterial({ color: "#ffcf3f", roughness: 0.45, side: THREE.DoubleSide }));
  bucket.position.set(1.9, sandY(1.9, 0.7), 0.7); add(bucket);

  /* ---- gulls ---- */
  const [bc, bg] = canvas(64, 32);
  bg.strokeStyle = "#ffffff"; bg.lineWidth = 4; bg.lineCap = "round";
  bg.beginPath(); bg.moveTo(4, 18); bg.quadraticCurveTo(18, 4, 32, 18); bg.quadraticCurveTo(46, 4, 60, 18); bg.stroke();
  const gullTex = tex(bc);
  const gulls = Array.from({ length: 4 }, (_, i) => {
    const s = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: gullTex, transparent: true, fog: false, opacity: 0.9 })));
    s.scale.set(0.6, 0.3, 1);
    return { s, x: -12 + i * 6, y: 4.5 + i * 0.6, z: -10 - i * 2, sp: 0.6 + i * 0.15, ph: i };
  });

  // sea spray glinting in the air near the shore
  const N = 60;
  const pts = new Float32Array(N * 3);
  const motesGeo = new THREE.BufferGeometry(); motesGeo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
  add(new THREE.Points(motesGeo, new THREE.PointsMaterial({ map: softDot(), color: "#fffbe8", size: 0.05, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })));

  const update = (t: number, dt: number, m: number) => {
    seaU.uTime.value = t * m;
    wn.offset.set((t * 0.01 * m) % 1, (t * 0.018 * m) % 1);
    // two waves taking turns washing up and sliding back
    foams.forEach((f, k) => {
      const ph = ((t * 0.16 + k * 0.5) % 1);
      const reach = Math.sin(ph * Math.PI);
      f.position.set(0, sandY(0, SHORE + reach * 1.1) + 0.015, SHORE + reach * 1.1 - 0.2);
      (f.material as THREE.MeshBasicMaterial).opacity = m ? 0.95 * Math.min(1, (1 - ph) * 2.2) : 0.8;
    });
    const top = Math.max(...foams.map((f) => f.position.z));
    wetSheen.position.set(0, sandY(0, top - 0.5) + 0.01, top - 0.55);
    (glitter.material as THREE.MeshBasicMaterial).opacity = 0.55 + 0.35 * Math.sin(t * 2.3) * Math.sin(t * 1.1);
    for (const g of gulls) {
      g.x += g.sp * dt * m; if (g.x > 18) g.x = -18;
      g.s.position.set(g.x, g.y + Math.sin(t * 0.8 + g.ph) * 0.3, g.z);
      g.s.scale.y = 0.3 * (0.75 + 0.25 * Math.sin(t * 6 + g.ph * 2));
    }
    for (let i = 0; i < N; i++) {
      const rr = rng(50 + i);
      pts[i * 3] = (rr() - 0.5) * 12 + Math.sin(t * 0.3 + i) * 0.4 * m;
      pts[i * 3 + 1] = 0.2 + rr() * 1.5 + Math.sin(t * 0.5 + i * 2) * 0.15 * m;
      pts[i * 3 + 2] = SHORE - 1 + rr() * 2;
    }
    motesGeo.attributes.position.needsUpdate = true;
  };

  return { group, update, background: new THREE.Color("#bfe0f5"), fog: new THREE.Fog("#dbeaf0", 22, 70) };
}
