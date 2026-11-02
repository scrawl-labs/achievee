/** A night subway car built from rounded boxes, with the city sliding past the windows. */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

function rng(seed: number) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }

/** A long strip of night city: buildings, lit windows, neon, a few soft bokeh lights. Tiles sideways. */
function cityTexture(seed: number, far: boolean) {
  const W = 2048, H = 512;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d")!;
  const r = rng(seed);
  if (far) {
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#0b1030"); sky.addColorStop(0.6, "#1c2456"); sky.addColorStop(1, "#3b3870");
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
  }
  let x = 0;
  while (x < W) {
    const bw = far ? 60 + r() * 110 : 90 + r() * 160;
    const bh = H * (far ? 0.35 + r() * 0.45 : 0.25 + r() * 0.5);
    const w = Math.min(bw, W - x);
    g.fillStyle = far ? "#1a1f4a" : "#0e1130";
    g.fillRect(x, H - bh, w, bh);
    const lit = far ? ["#ffd98a", "#a8dcff", "#ffe9c2"] : ["#ffcf73", "#fff0c9", "#9fe1ff"];
    const cw = far ? 7 : 12, ch = far ? 9 : 14, gap = far ? 7 : 10;
    for (let wy = H - bh + 12; wy < H - 10; wy += ch + gap) for (let wx = x + 8; wx < x + w - cw - 4; wx += cw + gap) {
      if (r() < (far ? 0.32 : 0.45)) { g.fillStyle = lit[Math.floor(r() * lit.length)]; g.globalAlpha = 0.6 + r() * 0.4; g.fillRect(wx, wy, cw, ch); g.globalAlpha = 1; }
    }
    if (!far && r() < 0.35 && w > 120) {
      const neon = ["#ff5fa8", "#45e0ff", "#ffe066", "#9dff7a"][Math.floor(r() * 4)];
      const sy = H - bh + 20 + r() * 40;
      g.shadowColor = neon; g.shadowBlur = 24; g.fillStyle = neon;
      g.fillRect(x + 16, sy, w - 32, 14);
      g.shadowBlur = 0;
    }
    x += w + (far ? r() * 10 : 20 + r() * 60);
  }
  if (!far) {
    // out-of-focus street lights drifting in the foreground
    for (let i = 0; i < 26; i++) {
      const bx = r() * W, by = H * (0.55 + r() * 0.4), br = 10 + r() * 26;
      const col = ["255,200,120", "255,240,210", "140,210,255", "255,120,170"][Math.floor(r() * 4)];
      const gr = g.createRadialGradient(bx, by, 0, bx, by, br);
      gr.addColorStop(0, `rgba(${col},.55)`); gr.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = gr; g.beginPath(); g.arc(bx, by, br, 0, Math.PI * 2); g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping;
  return t;
}

function adTexture(i: number) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 128;
  const g = c.getContext("2d")!;
  const bg = ["#ffe3ea", "#e2f3ff", "#fff3c9", "#e6f7df"][i % 4];
  const ac = ["#ff7d9c", "#4aa8ff", "#f5b100", "#4cc38a"][i % 4];
  g.fillStyle = bg; g.fillRect(0, 0, 512, 128);
  g.fillStyle = ac; g.beginPath(); g.arc(440, 64, 40, 0, Math.PI * 2); g.fill();
  g.fillStyle = "rgba(40,40,70,.55)"; g.fillRect(36, 40, 220, 14); g.fillStyle = "rgba(40,40,70,.3)"; g.fillRect(36, 70, 300, 10); g.fillRect(36, 88, 250, 10);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** A speckled rubber floor with a yellow safety line near the doors. */
function floorTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 512;
  const g = c.getContext("2d")!;
  g.fillStyle = "#5b6372"; g.fillRect(0, 0, 512, 512);
  const r = rng(5);
  for (let i = 0; i < 2600; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,.10)" : "rgba(0,0,0,.12)"; g.fillRect(r() * 512, r() * 512, 2, 2); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(16, 12); t.anisotropy = 8;
  return t;
}

export function buildSubway() {
  const group = new THREE.Group();
  const M = (color: string, o: Partial<THREE.MeshPhysicalMaterialParameters> = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.6, ...o });
  const wallM = M("#e9eaec", { roughness: 0.5 });
  const wallLow = M("#c9d3dc", { roughness: 0.45, clearcoat: 0.3 });
  const seatM = M("#3e8f9a", { roughness: 0.75, sheen: 0.6, sheenColor: new THREE.Color("#7fd0d8") });
  const seatEdge = M("#2c6d76", { roughness: 0.7 });
  const steel = new THREE.MeshStandardMaterial({ color: "#d9dde3", roughness: 0.18, metalness: 1 });
  const floorM = M("#ffffff", { map: floorTexture(), roughness: 0.6, clearcoat: 0.25, clearcoatRoughness: 0.4 });
  const strapM = M("#f2f2ee", { roughness: 0.5 });
  const lightM = new THREE.MeshBasicMaterial({ color: "#fff7e3" });
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, shadow = true) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; group.add(m); return m;
  };
  const WALL_Z = -2.1, SPAN = 18;

  // floor and ceiling
  const floor = add(new THREE.PlaneGeometry(SPAN * 2, 24), floorM, 0, 0, 8, false); floor.rotation.x = -Math.PI / 2;
  const line = add(new THREE.PlaneGeometry(SPAN, 0.08), new THREE.MeshStandardMaterial({ color: "#f2c230", roughness: 0.6 }), 0, 0.003, 2.2, false); line.rotation.x = -Math.PI / 2;
  const ceil = add(new THREE.PlaneGeometry(SPAN, 8), wallM, 0, 3.0, 0, false); ceil.rotation.x = Math.PI / 2;
  for (let x = -8; x <= 8; x += 3.2) add(new RoundedBoxGeometry(2.6, 0.05, 0.36, 2, 0.02), lightM, x, 2.97, -0.9, false);

  // the wall behind: lower panel, window band with pillars, upper panel with adverts
  add(new THREE.BoxGeometry(SPAN, 1.2, 0.1), wallLow, 0, 0.6, WALL_Z);
  add(new THREE.BoxGeometry(SPAN, 0.75, 0.1), wallM, 0, 2.62, WALL_Z);
  const winBottom = 1.2, winTop = 2.25;
  add(new THREE.BoxGeometry(SPAN, 0.06, 0.16), steel, 0, winBottom + 0.02, WALL_Z + 0.04);
  add(new THREE.BoxGeometry(SPAN, 0.05, 0.16), steel, 0, winTop - 0.02, WALL_Z + 0.04);
  for (let x = -8.4; x <= 8.4; x += 2.8) add(new RoundedBoxGeometry(0.34, winTop - winBottom, 0.16, 3, 0.05), wallM, x + 1.4, (winTop + winBottom) / 2, WALL_Z);
  for (let i = 0, x = -7; x <= 7; x += 2.8, i++) {
    const ad = add(new THREE.PlaneGeometry(1.7, 0.42), new THREE.MeshStandardMaterial({ map: adTexture(i), roughness: 0.6 }), x, 2.6, WALL_Z + 0.06, false);
    ad.receiveShadow = false;
  }

  // the city outside, two layers moving at different speeds
  const farTex = cityTexture(7, true), nearTex = cityTexture(19, false);
  farTex.repeat.set(2, 1); nearTex.repeat.set(1.6, 1);
  const outside = new THREE.Group(); group.add(outside);
  const far = new THREE.Mesh(new THREE.PlaneGeometry(26, 4.2), new THREE.MeshBasicMaterial({ map: farTex, fog: false }));
  far.position.set(0, 1.9, WALL_Z - 3.2);
  const near = new THREE.Mesh(new THREE.PlaneGeometry(22, 3.2), new THREE.MeshBasicMaterial({ map: nearTex, transparent: true, fog: false }));
  near.position.set(0, 1.4, WALL_Z - 1.2);
  outside.add(far, near);
  // glass with a faint reflection
  add(new THREE.PlaneGeometry(SPAN, winTop - winBottom), new THREE.MeshPhysicalMaterial({ color: "#9fb4d8", transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0, transmission: 0 }), 0, (winTop + winBottom) / 2, WALL_Z - 0.02, false);

  // the long bench
  add(new RoundedBoxGeometry(SPAN, 0.16, 0.6, 3, 0.06), seatM, 0, 0.5, WALL_Z + 0.42);
  add(new RoundedBoxGeometry(SPAN, 0.55, 0.14, 3, 0.06), seatM, 0, 0.88, WALL_Z + 0.14);
  add(new THREE.BoxGeometry(SPAN, 0.42, 0.5), seatEdge, 0, 0.21, WALL_Z + 0.38);
  for (let x = -8; x <= 8; x += 1.6) add(new THREE.BoxGeometry(0.03, 0.5, 0.16), seatEdge, x, 0.9, WALL_Z + 0.2, false);

  // poles and the hand rail with swinging straps
  const poles: number[] = [-2.6, 2.6];
  for (const x of poles) add(new THREE.CylinderGeometry(0.035, 0.035, 3, 20), steel, x, 1.5, 0.4);
  const rail = add(new THREE.CylinderGeometry(0.025, 0.025, SPAN, 12), steel, 0, 2.62, -0.6, false);
  rail.rotation.z = Math.PI / 2;
  const straps: THREE.Group[] = [];
  for (let x = -7.5; x <= 7.5; x += 0.75) {
    const s = new THREE.Group(); s.position.set(x, 2.62, -0.6);
    const band = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.36, 0.015, 2, 0.006), strapM); band.position.y = -0.18; band.castShadow = true;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.016, 10, 28), strapM); ring.position.y = -0.43; ring.castShadow = true;
    s.add(band, ring); group.add(s); straps.push(s);
  }

  return { group, farTex, nearTex, straps, outside };
}
