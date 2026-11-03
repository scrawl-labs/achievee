/**
 * A bus stop on a rainy evening: a shelter with a curved glass roof and a glowing advert, a lamp whose cone the
 * rain falls through, wet ground that catches the lights, drips from the roof edge and splashes on the road,
 * and a blurred street behind with headlights going by.
 */
import * as THREE from "three";
import type { World } from "./forest";
import { backdrop, canvas, curve, fbm, glow, rng, soft, sweep, tex, tube, wetStreak } from "./util";

function streetLayer(kind: 0 | 1) {
  const W = kind === 0 ? 220 : 300, H = Math.round(W * 0.42);
  const [c, g] = canvas(W, H);
  const r = rng(40 + kind);
  if (kind === 0) {
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#151b2c"); sky.addColorStop(0.6, "#2a3350"); sky.addColorStop(1, "#46496a");
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
  }
  let x = 0;
  while (x < W) {
    const w = W * (0.04 + r() * 0.07), h = H * (kind === 0 ? 0.4 + r() * 0.5 : 0.3 + r() * 0.45);
    g.fillStyle = kind === 0 ? "#2a3048" : "#1d2236"; g.fillRect(x, H - h, w, h);
    for (let wy = H - h + 3; wy < H - 4; wy += 4) for (let wx = x + 2; wx < x + w - 2; wx += 4) {
      if (r() < 0.3) { g.fillStyle = ["#ffd98f", "#cfe4ff", "#ffc36b"][Math.floor(r() * 3)]; g.globalAlpha = 0.6 + r() * 0.4; g.fillRect(wx, wy, 2, 2); g.globalAlpha = 1; }
    }
    if (kind === 1 && r() < 0.35) { g.fillStyle = ["#ff6fa0", "#5ee0ff", "#ffd45e"][Math.floor(r() * 3)]; g.fillRect(x + 3, H - h + 6, w - 6, 4); }
    x += w + W * 0.01 * r();
  }
  // rain haze
  g.fillStyle = "rgba(160,180,220,.12)"; g.fillRect(0, 0, W, H);
  return soft(c, kind === 1);
}

function adTexture() {
  const [c, g] = canvas(256, 384);
  const bg = g.createLinearGradient(0, 0, 0, 384);
  bg.addColorStop(0, "#ffe7c8"); bg.addColorStop(1, "#ffc6d4");
  g.fillStyle = bg; g.fillRect(0, 0, 256, 384);
  g.fillStyle = "#ff8a7a"; g.beginPath(); g.arc(128, 150, 70, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#fff4e2"; g.beginPath(); g.arc(150, 130, 26, 0, Math.PI * 2); g.fill();
  g.fillStyle = "rgba(60,40,70,.6)"; g.fillRect(40, 270, 176, 16); g.fillStyle = "rgba(60,40,70,.3)"; g.fillRect(40, 300, 140, 10); g.fillRect(40, 318, 160, 10);
  return tex(c);
}
function signTexture() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = "#2e7dd6"; g.beginPath(); g.arc(128, 128, 124, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#ffffff"; g.beginPath(); g.arc(128, 128, 104, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#2e7dd6"; g.beginPath(); g.roundRect(70, 78, 116, 84, 18); g.fill();
  g.fillStyle = "#ffffff"; g.fillRect(84, 92, 40, 30); g.fillRect(132, 92, 40, 30);
  g.fillStyle = "#2e7dd6"; g.beginPath(); g.arc(94, 172, 13, 0, Math.PI * 2); g.arc(162, 172, 13, 0, Math.PI * 2); g.fill();
  return tex(c);
}
function wetGround() {
  const [c, g] = canvas(512, 512);
  const [rc, rg] = canvas(256, 256);
  g.fillStyle = "#4b4f58"; g.fillRect(0, 0, 512, 512);
  // pavement tiles
  g.strokeStyle = "rgba(20,22,28,.5)"; g.lineWidth = 3;
  for (let i = 0; i <= 512; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
  const r = rng(8);
  for (let i = 0; i < 6000; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,.04)" : "rgba(0,0,0,.08)"; g.fillRect(r() * 512, r() * 512, 2, 2); }
  // puddles: smooth (low roughness) patches
  const img = rg.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const n = fbm(x / 40, y / 40);
    const puddle = Math.min(1, Math.max(0, (n - 0.5) / 0.12));
    const v = (120 + n * 60) * (1 - puddle) + 30 * puddle;
    const i = (y * 256 + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  rg.putImageData(img, 0, 0);
  const t = tex(c), rt = tex(rc, false);
  for (const x of [t, rt]) { x.wrapS = x.wrapT = THREE.RepeatWrapping; x.repeat.set(6, 4); x.anisotropy = 8; }
  return { map: t, rough: rt };
}

export function buildBusStop(): World {
  const group = new THREE.Group();
  const add = <T extends THREE.Object3D>(o: T) => { group.add(o); return o; };

  /* ---- light ---- */
  add(new THREE.HemisphereLight("#8fa6d6", "#1a1e2a", 0.7));
  const fill = new THREE.DirectionalLight("#cbd8ff", 0.65); fill.position.set(2, 3, 7); add(fill);
  const rim = new THREE.DirectionalLight("#8fb4ff", 0.9); rim.position.set(-2, 3, -6); add(rim);
  const lamp = new THREE.SpotLight("#ffd79c", 45, 14, 0.62, 0.6, 1.6);
  lamp.position.set(-3.1, 3.7, 1.3); lamp.target.position.set(-1.2, 0, 0.6);
  lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -0.0005; lamp.shadow.radius = 4;
  add(lamp); add(lamp.target);
  const adLight = new THREE.PointLight("#ffe6d0", 4, 5, 1.6); adLight.position.set(-1.55, 1.3, -1.0); add(adLight);

  /* ---- ground: wet pavement under the shelter, a kerb, the road in front ---- */
  const { map, rough } = wetGround();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 22), new THREE.MeshPhysicalMaterial({ map, roughnessMap: rough, roughness: 1, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.12, color: "#ffffff" }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -2); ground.receiveShadow = true; add(ground);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(30, 8), new THREE.MeshPhysicalMaterial({ color: "#2b2e36", roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.08 }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, -0.12, 6.0); road.receiveShadow = true; add(road);
  const kerb = sweep([[2.0, -0.12], ...curve([2.0, 0.0], [2.0, 0.02], [1.96, 0.02], 3)], -15, 15).geo;
  const k = add(new THREE.Mesh(kerb, new THREE.MeshStandardMaterial({ color: "#8a8e96", roughness: 0.6, side: THREE.DoubleSide }))); k.receiveShadow = true;

  /* ---- the shelter ---- */
  const steel = new THREE.MeshStandardMaterial({ color: "#c9ced6", roughness: 0.25, metalness: 0.9 });
  const glass = new THREE.MeshPhysicalMaterial({ color: "#b8d4ff", transparent: true, opacity: 0.22, roughness: 0.05, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
  const roofProfile = curve([-1.55, 2.5], [-0.1, 2.95], [1.45, 2.66], 18);
  const roof = add(new THREE.Mesh(sweep(roofProfile, -2.7, 2.7, 4).geo, new THREE.MeshPhysicalMaterial({ color: "#a8c4ea", transparent: true, opacity: 0.45, roughness: 0.15, clearcoat: 1, side: THREE.DoubleSide })));
  roof.castShadow = true;
  for (const x of [-2.7, 2.7]) add(tube(roofProfile.map(([z, y]) => [x, y, z]), 0.035, steel));
  for (const [z, y] of [roofProfile[0], roofProfile[roofProfile.length - 1]]) add(tube([[-2.7, y, z], [2.7, y, z]], 0.035, steel, 8));
  for (const x of [-2.45, 2.45]) add(tube([[x, 0, -1.5], [x, 2.3, -1.52], [x, 2.62, -1.4]], 0.05, steel));
  // back glass, and the lit advert on the left
  const back = add(new THREE.Mesh(new THREE.PlaneGeometry(4.9, 2.0), glass)); back.position.set(0, 1.15, -1.5);
  const adFrame = add(new THREE.Mesh(new THREE.PlaneGeometry(1.06, 1.56), new THREE.MeshStandardMaterial({ color: "#d6dae2", roughness: 0.3, metalness: 0.6 }))); adFrame.position.set(-1.55, 1.25, -1.47);
  const ad = add(new THREE.Mesh(new THREE.PlaneGeometry(0.94, 1.42), new THREE.MeshBasicMaterial({ map: adTexture() }))); ad.position.set(-1.55, 1.25, -1.455);
  add(glow("#ffe2cc", 2.6, 0.35)).position.set(-1.55, 1.25, -1.3);
  // the bench: four rounded wooden slats
  const wood = new THREE.MeshStandardMaterial({ color: "#a8743f", roughness: 0.55 });
  for (let i = 0; i < 4; i++) {
    const z = -1.32 + i * 0.09;
    const slat: [number, number][] = [[z - 0.035, 0.46], [z + 0.035, 0.46], [z + 0.04, 0.43], [z - 0.04, 0.43]];
    add(new THREE.Mesh(sweep([...slat, slat[0]], -0.2, 2.1).geo, wood)).castShadow = true;
  }
  for (const x of [0.0, 1.9]) add(tube([[x, 0, -1.1], [x, 0.43, -1.15], [x, 0.43, -1.35], [x, 0, -1.4]], 0.025, steel, 16));

  // the stop sign on its pole
  add(tube([[3.1, 0, 1.3], [3.1, 2.5, 1.3]], 0.04, steel, 8));
  const sign = add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 40), [steel, new THREE.MeshStandardMaterial({ map: signTexture(), roughness: 0.4 }), steel]));
  sign.rotation.x = Math.PI / 2; // the top cap, with the picture, faces the street
  sign.position.set(3.1, 2.62, 1.3);
  const board = add(new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.55), new THREE.MeshStandardMaterial({ color: "#f2f4f8", roughness: 0.4 }))); board.position.set(3.1, 1.6, 1.33);

  // the lamp post curving over the stop
  add(tube([[-3.6, 0, 1.6], [-3.6, 3.4, 1.6], [-3.4, 3.85, 1.45], [-3.05, 3.85, 1.3]], 0.06, new THREE.MeshStandardMaterial({ color: "#3a3f4a", roughness: 0.5, metalness: 0.5 })));
  const head = add(new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#3a3f4a", roughness: 0.5, metalness: 0.5, side: THREE.DoubleSide })));
  head.position.set(-3.05, 3.8, 1.3);
  const bulb = add(new THREE.Mesh(new THREE.CircleGeometry(0.13, 24), new THREE.MeshBasicMaterial({ color: "#fff1cf" }))); bulb.rotation.x = Math.PI / 2; bulb.position.set(-3.05, 3.79, 1.3);
  add(glow("#ffd890", 1.6, 0.8)).position.set(-3.05, 3.7, 1.3);
  // a soft volume of light under the lamp, made of stacked glows so it has no hard edges
  for (let i = 0; i < 6; i++) {
    const k = i / 5;
    add(glow("#ffd79c", 0.8 + k * 2.6, 0.16 - k * 0.07)).position.set(-3.05 + 1.6 * k, 3.6 - 3.0 * k, 1.3 - 0.55 * k);
  }

  // reflections in the wet ground
  add(wetStreak("#ffd18a", -2.6, 0.9, 1.4, 4.5, 0.35));
  add(wetStreak("#ffd2c2", -1.55, -1.4, 0.9, 3.4, 0.3));
  add(wetStreak("#9fc4ff", 3.1, 1.3, 0.5, 2.6, 0.25));

  /* ---- the street behind, with headlights ---- */
  add(backdrop(streetLayer(0), 60, 24, 3, -18, false));
  const near = streetLayer(1); near.repeat.set(1.5, 1);
  add(backdrop(near, 40, 12, 2.2, -10));
  const cars = Array.from({ length: 5 }, (_, i) => {
    const s = add(glow(i % 2 ? "#ffe2a8" : "#ff6d5e", 0.9, 0.9));
    return { s, x: -14 + i * 6, dir: i % 2 ? 1 : -1, z: i % 2 ? -7.5 : -8.2, speed: 2 + (i % 3) * 0.7 };
  });

  /* ---- rain, splashes, drips ---- */
  const N = 1800;
  const pos = new Float32Array(N * 6);
  const drops = Array.from({ length: N }, (_, i) => { const r = rng(900 + i); return { x: 0, y: r() * 6, z: 0, s: 6 + r() * 3, seed: i }; });
  const under = (x: number, z: number) => Math.abs(x) < 2.75 && z > -1.6 && z < 1.5;
  const place = (d: { x: number; z: number; seed: number }, k: number) => {
    const r = rng(d.seed * 31 + k);
    do { d.x = (r() - 0.5) * 16; d.z = -6 + r() * 10; } while (under(d.x, d.z));
  };
  drops.forEach((d, i) => place(d, i));
  const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  add(new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: "#c9dcff", transparent: true, opacity: 0.42, depthWrite: false })));
  const ringGeo = new THREE.RingGeometry(0.03, 0.045, 24);
  const splashes = Array.from({ length: 70 }, (_, i) => {
    const m = add(new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: "#d6e4ff", transparent: true, opacity: 0, depthWrite: false })));
    m.rotation.x = -Math.PI / 2;
    return { m, t: (i / 70) * 0.6, seed: i };
  });
  const drips = Array.from({ length: 10 }, (_, i) => {
    const m = add(new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), new THREE.MeshBasicMaterial({ color: "#dfe9ff", transparent: true, opacity: 0.8 })));
    m.scale.y = 2.2;
    return { m, x: -2.5 + i * 0.55, y: 2.6, v: 0, wait: i * 0.37 };
  });

  const update = (t: number, dt: number, mo: number) => {
    const fall = dt * mo;
    for (let i = 0; i < N; i++) {
      const d = drops[i];
      d.y -= d.s * fall;
      if (d.y < 0) { d.y += 6; place(d, Math.floor(t * 10) + i); }
      const o = i * 6, len = 0.22;
      pos[o] = d.x; pos[o + 1] = d.y; pos[o + 2] = d.z;
      pos[o + 3] = d.x + 0.03; pos[o + 4] = d.y + len; pos[o + 5] = d.z;
    }
    rainGeo.attributes.position.needsUpdate = true;
    for (const s of splashes) {
      s.t += dt * mo;
      if (s.t > 0.6) {
        s.t = 0;
        const r = rng(s.seed * 97 + Math.floor(t * 7));
        let x = 0, z = 0;
        do { x = (r() - 0.5) * 9; z = -3 + r() * 6.5; } while (under(x, z));
        s.m.position.set(x, z > 2 ? -0.11 : 0.01, z);
      }
      const k = s.t / 0.6;
      s.m.scale.setScalar(0.4 + k * 2.2);
      (s.m.material as THREE.MeshBasicMaterial).opacity = mo ? 0.55 * (1 - k) : 0;
    }
    for (const d of drips) {
      if (d.wait > 0) { d.wait -= dt * mo; d.m.visible = false; continue; }
      d.m.visible = true; d.v += 9.8 * dt * mo; d.y -= d.v * dt * mo;
      d.m.position.set(d.x, d.y, 1.45);
      if (d.y < 0) { d.y = 2.62; d.v = 0; d.wait = 0.6 + ((d.x * 13.7) % 1.5); }
    }
    for (const c of cars) {
      c.x += c.dir * c.speed * dt * mo;
      if (c.x > 16) c.x = -16; if (c.x < -16) c.x = 16;
      c.s.position.set(c.x, 0.55, c.z);
    }
    lamp.intensity = 45 * (mo ? 0.97 + 0.03 * Math.sin(t * 23) * Math.sin(t * 7) : 1);
  };

  return { group, update, background: new THREE.Color("#1b2233"), fog: new THREE.Fog("#2a3248", 9, 28) };
}
