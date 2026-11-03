/**
 * In front of a corner shop at night: a warm glowing shopfront with soft-focus shelves behind the glass, a
 * striped awning with downlights, a lit sign with moths circling it, and the classic plastic table outside with
 * a steaming cup of instant noodles and a can. No real brands.
 */
import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import type { World } from "./forest";
import { backdrop, canvas, curve, glow, lathe, rng, soft, softDot, sweep, tex, tube } from "./util";

const FRONT_Z = -5.2, FRONT_W = 7.5, FRONT_H = 2.5;

/** What you see through the glass: shelves of colourful things, painted small so they read soft. */
function interiorTexture() {
  const W = 360, H = Math.round((W * FRONT_H) / FRONT_W);
  const [c, g] = canvas(W, H);
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#fffaf0"); bg.addColorStop(1, "#f1e8d6");
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const r = rng(12);
  const cols = ["#ff7d6b", "#ffd166", "#5fc8a9", "#6aa7ff", "#ff9ecb", "#ffffff", "#f29a3a", "#9adf6c"];
  for (let row = 0; row < 4; row++) {
    const y = H * (0.18 + row * 0.19);
    g.fillStyle = "#d9d0c0"; g.fillRect(0, y + H * 0.13, W, 2);
    for (let x = 2; x < W - 2; ) {
      const w = 3 + r() * 6, h = H * (0.06 + r() * 0.07);
      g.fillStyle = cols[Math.floor(r() * cols.length)]; g.fillRect(x, y + H * 0.13 - h, w, h);
      x += w + (r() < 0.2 ? 3 : 1);
    }
  }
  // the counter and a fridge glow on the right
  g.fillStyle = "#e3f4ff"; g.fillRect(W * 0.78, H * 0.1, W * 0.2, H * 0.8);
  for (let i = 0; i < 5; i++) { g.fillStyle = cols[i]; g.fillRect(W * 0.8, H * (0.2 + i * 0.13), W * 0.16, H * 0.05); }
  return soft(c);
}
/** The shopfront frame: wall around big rounded windows and a glass door. */
function frontTexture() {
  const W = 1024, H = Math.round((W * FRONT_H) / FRONT_W);
  const [c, g] = canvas(W, H);
  g.fillStyle = "#f4f1ea"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#e3ddd2"; g.fillRect(0, H * 0.86, W, H * 0.14);
  const holes: [number, number, number, number][] = [[0.04, 0.08, 0.36, 0.72], [0.43, 0.08, 0.22, 0.86], [0.68, 0.08, 0.28, 0.72]];
  for (const [x, y, w, h] of holes) {
    g.fillStyle = "#9aa0a8"; g.beginPath(); g.roundRect(W * x - 6, H * y - 6, W * w + 12, H * h + 12, 14); g.fill();
  }
  g.globalCompositeOperation = "destination-out";
  for (const [x, y, w, h] of holes) { g.beginPath(); g.roundRect(W * x, H * y, W * w, H * h, 10); g.fill(); }
  g.globalCompositeOperation = "source-over";
  // door handle and a couple of stickers on the glass edge
  g.fillStyle = "#c9ced6"; g.fillRect(W * 0.62, H * 0.4, 8, H * 0.2);
  const t = tex(c); t.anisotropy = 8; return t;
}
function awningTexture() {
  const [c, g] = canvas(256, 256);
  for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? "#fff7ea" : "#3aa37a"; g.fillRect(i * 64, 0, 64, 256); }
  // a scalloped hem at the bottom
  g.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(i * 64 + 32, 256 + 14, 34, 0, Math.PI * 2); g.fill(); }
  g.globalCompositeOperation = "source-over";
  const t = tex(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(1 / 0.6, 1); t.anisotropy = 8; return t;
}
function signTexture() {
  const [c, g] = canvas(1024, 128);
  g.fillStyle = "#3aa37a"; g.fillRect(0, 0, 1024, 128);
  g.fillStyle = "#ffffff"; g.font = "800 72px system-ui, sans-serif"; g.textBaseline = "middle";
  g.fillText("24", 70, 68);
  g.fillStyle = "#ffd166"; g.beginPath();
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? 16 : 36; g.lineTo(220 + Math.cos(a) * rr, 64 + Math.sin(a) * rr); }
  g.fill();
  g.fillStyle = "rgba(255,255,255,.9)"; g.fillRect(290, 50, 300, 10); g.fillRect(290, 72, 220, 8);
  return tex(c);
}
function pavement() {
  const [c, g] = canvas(512, 512);
  g.fillStyle = "#8b8780"; g.fillRect(0, 0, 512, 512);
  const r = rng(3);
  for (let y = 0; y < 512; y += 32) for (let x = (y / 32) % 2 ? -32 : 0; x < 512; x += 64) {
    g.fillStyle = `hsl(30, 6%, ${48 + r() * 8}%)`; g.fillRect(x + 1, y + 1, 62, 30);
  }
  for (let i = 0; i < 5000; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.08)"; g.fillRect(r() * 512, r() * 512, 2, 2); }
  const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(7, 5); t.anisotropy = 8; return t;
}
function nightStreet() {
  const W = 300, H = 126;
  const [c, g] = canvas(W, H);
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#0d1226"); sky.addColorStop(1, "#28264a");
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  const r = rng(77);
  let x = 0;
  while (x < W) {
    const w = 14 + r() * 26, h = H * (0.35 + r() * 0.5);
    g.fillStyle = "#1b1d33"; g.fillRect(x, H - h, w, h);
    for (let wy = H - h + 4; wy < H - 4; wy += 5) for (let wx = x + 3; wx < x + w - 3; wx += 5) if (r() < 0.25) { g.fillStyle = r() < 0.7 ? "#ffcf7a" : "#9fd8ff"; g.fillRect(wx, wy, 2, 2); }
    if (r() < 0.4) { g.fillStyle = ["#ff5fa8", "#45e0ff", "#ffd45e"][Math.floor(r() * 3)]; g.fillRect(x + 3, H - h + 8, w - 6, 4); }
    x += w + 2;
  }
  for (let i = 0; i < 30; i++) { g.fillStyle = "rgba(255,255,255,.8)"; g.fillRect(r() * W, r() * H * 0.3, 1, 1); }
  return soft(c);
}

export function buildStore(): World {
  RectAreaLightUniformsLib.init();
  const group = new THREE.Group();
  const add = <T extends THREE.Object3D>(o: T) => { group.add(o); return o; };

  /* ---- light: the shop glow, awning downlights, a cool night sky ---- */
  add(new THREE.HemisphereLight("#5d6aa0", "#1a1720", 0.35));
  const shopGlow = new THREE.RectAreaLight("#ffe7c4", 3.2, FRONT_W * 0.9, FRONT_H * 0.7);
  shopGlow.position.set(0, 1.3, FRONT_Z + 0.05); shopGlow.lookAt(0, 1.0, 3);
  add(shopGlow);
  for (const x of [-1.6, 1.6]) {
    const s = new THREE.SpotLight("#ffe2b4", 18, 7, 0.75, 0.7, 1.5);
    s.position.set(x, FRONT_H - 0.25, FRONT_Z + 0.8); s.target.position.set(x * 0.6, 0, 0.4);
    s.castShadow = true; s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -0.0005; s.shadow.radius = 5;
    add(s); add(s.target);
  }
  const moon = new THREE.DirectionalLight("#9fb2ff", 0.3); moon.position.set(4, 6, 5); add(moon);
  const fill = new THREE.DirectionalLight("#ffe9d8", 0.85); fill.position.set(-2, 2, 7); add(fill);

  /* ---- the shopfront ---- */
  const inside = add(new THREE.Mesh(new THREE.PlaneGeometry(FRONT_W, FRONT_H), new THREE.MeshBasicMaterial({ map: interiorTexture(), color: "#e8d9bd" })));
  inside.position.set(0, FRONT_H / 2, FRONT_Z - 0.35);
  const frontMat = new THREE.MeshStandardMaterial({ map: frontTexture(), alphaTest: 0.5, roughness: 0.7 });
  const front = add(new THREE.Mesh(new THREE.PlaneGeometry(FRONT_W, FRONT_H), frontMat));
  front.position.set(0, FRONT_H / 2, FRONT_Z); front.receiveShadow = true;
  // a slightly reflective pane over the windows
  const pane = add(new THREE.Mesh(new THREE.PlaneGeometry(FRONT_W, FRONT_H), new THREE.MeshPhysicalMaterial({ color: "#ffffff", transparent: true, opacity: 0.06, roughness: 0.02, clearcoat: 1, depthWrite: false })));
  pane.position.set(0, FRONT_H / 2, FRONT_Z - 0.02);
  // side walls and the wall above
  const wallMat = new THREE.MeshStandardMaterial({ color: "#bdb6aa", roughness: 0.8 });
  for (const s of [-1, 1]) { const w = add(new THREE.Mesh(new THREE.PlaneGeometry(0.5, FRONT_H + 1.1), wallMat)); w.position.set(s * (FRONT_W / 2 + 0.25), (FRONT_H + 1.1) / 2, FRONT_Z - 0.02); }
  const above = add(new THREE.Mesh(new THREE.PlaneGeometry(FRONT_W + 1, 1.1), wallMat)); above.position.set(0, FRONT_H + 0.55, FRONT_Z - 0.03);
  // the lit sign and the awning under it
  const sign = add(new THREE.Mesh(new THREE.PlaneGeometry(FRONT_W * 0.9, 0.55), new THREE.MeshBasicMaterial({ map: signTexture() })));
  sign.position.set(0, FRONT_H + 0.45, FRONT_Z + 0.05);
  add(glow("#7dffc8", 5, 0.25)).position.set(0, FRONT_H + 0.45, FRONT_Z + 0.4);
  const awning = add(new THREE.Mesh(sweep(curve([FRONT_Z, FRONT_H + 0.05], [FRONT_Z + 0.5, FRONT_H + 0.05], [FRONT_Z + 0.95, FRONT_H - 0.38], 12), -FRONT_W / 2, FRONT_W / 2, 4).geo,
    new THREE.MeshStandardMaterial({ map: awningTexture(), alphaTest: 0.5, roughness: 0.75, side: THREE.DoubleSide })));
  awning.castShadow = true;
  for (const x of [-1.6, 1.6]) add(glow("#fff0cc", 0.6, 0.9)).position.set(x, FRONT_H - 0.27, FRONT_Z + 0.8);

  /* ---- pavement and kerb ---- */
  const floor = add(new THREE.Mesh(new THREE.PlaneGeometry(26, 16), new THREE.MeshPhysicalMaterial({ map: pavement(), roughness: 0.75, clearcoat: 0.2 })));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 4); floor.receiveShadow = true;
  // warm light pooling in front of the windows
  const [lc, lg] = canvas(128, 128);
  const lgr = lg.createRadialGradient(64, 40, 0, 64, 40, 80); lgr.addColorStop(0, "rgba(255,220,160,.3)"); lgr.addColorStop(1, "rgba(255,226,170,0)");
  lg.fillStyle = lgr; lg.fillRect(0, 0, 128, 128);
  const pool = add(new THREE.Mesh(new THREE.PlaneGeometry(10, 6), new THREE.MeshBasicMaterial({ map: tex(lc, false), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
  pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.005, FRONT_Z + 3);

  /* ---- the plastic table, two chairs, noodles and a can ---- */
  const plastic = (c: string) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.35, clearcoat: 0.4 });
  const table = new THREE.Group();
  table.add(lathe([[0, 0.72], [0.46, 0.72], [0.48, 0.70], [0.46, 0.66], [0.06, 0.64], [0.035, 0.6], [0.035, 0.08], [0.3, 0.03], [0.3, 0.0], [0, 0]], plastic("#e9e4da")));
  table.position.set(-1.45, 0, 0.1);
  add(table);
  const chair = (x: number, z: number, ry: number) => {
    const ch = new THREE.Group();
    const seat = lathe([[0, 0.44], [0.2, 0.45], [0.22, 0.43], [0.2, 0.4], [0, 0.39]], plastic("#e9e4da"));
    seat.scale.z = 0.95; ch.add(seat);
    for (const [lx, lz] of [[-0.16, -0.14], [0.16, -0.14], [-0.16, 0.14], [0.16, 0.14]]) ch.add(tube([[lx, 0.4, lz], [lx * 1.3, 0.0, lz * 1.3]], 0.018, plastic("#e9e4da"), 6));
    const backP = curve([-0.18, 0.44], [-0.24, 0.7], [-0.2, 0.86], 8);
    // the backrest: a curved plate behind the seat (the chair faces +z)
    const back = new THREE.Mesh(sweep(backP, -0.19, 0.19, 6).geo, new THREE.MeshPhysicalMaterial({ color: "#e9e4da", roughness: 0.35, side: THREE.DoubleSide }));
    back.castShadow = true; ch.add(back);
    ch.position.set(x, 0, z); ch.rotation.y = ry;
    add(ch);
  };
  chair(-2.25, 0.25, Math.PI / 2 + 0.3);
  chair(-1.35, -0.75, 0.1);
  // a cup of instant noodles with its lid peeled back, steaming
  const cup = lathe([[0, 0], [0.055, 0], [0.075, 0.11], [0.078, 0.112], [0, 0.112]], new THREE.MeshPhysicalMaterial({ color: "#fdf6ea", roughness: 0.5 }));
  cup.position.set(-1.6, 0.72, 0.2); add(cup);
  const band = lathe([[0.062, 0.04], [0.07, 0.085]], new THREE.MeshStandardMaterial({ color: "#e9573f", roughness: 0.5, side: THREE.DoubleSide }));
  band.position.copy(cup.position); add(band);
  const lid = add(new THREE.Mesh(new THREE.CircleGeometry(0.08, 24), new THREE.MeshStandardMaterial({ color: "#f2c94c", roughness: 0.3, metalness: 0.4, side: THREE.DoubleSide })));
  lid.position.set(-1.6, 0.86, 0.15); lid.rotation.x = -0.6;
  const chop = new THREE.MeshStandardMaterial({ color: "#d9b88a", roughness: 0.6 });
  for (const dx of [0, 0.02]) add(tube([[-1.52 + dx, 0.74, 0.32], [-1.38 + dx, 0.75, 0.05]], 0.006, chop, 4));
  const can = lathe([[0, 0], [0.032, 0], [0.034, 0.01], [0.034, 0.11], [0.028, 0.125], [0, 0.125]], new THREE.MeshStandardMaterial({ color: "#55b6e8", roughness: 0.25, metalness: 0.7 }));
  can.position.set(-1.25, 0.72, 0.25); add(can);
  // steam
  const S = 18;
  const steamPts = new Float32Array(S * 3);
  const steamGeo = new THREE.BufferGeometry(); steamGeo.setAttribute("position", new THREE.BufferAttribute(steamPts, 3));
  add(new THREE.Points(steamGeo, new THREE.PointsMaterial({ map: softDot(), color: "#ffffff", size: 0.12, transparent: true, opacity: 0.35, depthWrite: false })));

  /* ---- the street behind, and moths at the sign ---- */
  const street = add(backdrop(nightStreet(), 50, 21, 4, -14, false));
  void street;
  const M = 6;
  const moths = Array.from({ length: M }, () => add(glow("#fff6dc", 0.08, 0.9)));

  const update = (t: number, _dt: number, m: number) => {
    for (let i = 0; i < S; i++) {
      const k = ((t * 0.35 + i / S) % 1);
      steamPts[i * 3] = -1.6 + Math.sin(t * 1.3 + i) * 0.03 * k * m;
      steamPts[i * 3 + 1] = 0.85 + k * 0.45;
      steamPts[i * 3 + 2] = 0.2 + Math.cos(t + i * 2) * 0.02 * k;
    }
    steamGeo.attributes.position.needsUpdate = true;
    moths.forEach((mo, i) => {
      const a = t * (1.5 + i * 0.3) * m + i * 2;
      mo.position.set(Math.cos(a) * (0.4 + i * 0.12) + Math.sin(t * 3 + i) * 0.05, FRONT_H + 0.4 + Math.sin(a * 1.7) * 0.25, FRONT_Z + 0.5 + Math.sin(a) * 0.25);
    });
    shopGlow.intensity = 3.2 * (m ? 0.98 + 0.02 * Math.sin(t * 40) * Math.sin(t * 3) : 1);
  };

  return { group, update, background: new THREE.Color("#0d1226"), fog: new THREE.Fog("#141832", 10, 30) };
}
