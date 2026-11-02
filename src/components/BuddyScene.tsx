"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export type Face = "idle" | "happy" | "sad" | "think" | "joy";
type State = { face: Face; talking: boolean; beat: number; night: boolean };

/* ---------- small helpers ---------- */
const mat = (color: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...o });
function mesh(geo: THREE.BufferGeometry, m: THREE.Material, pos: [number, number, number] = [0, 0, 0], scale: [number, number, number] = [1, 1, 1], shadow = true) {
  const x = new THREE.Mesh(geo, m);
  x.position.set(...pos);
  x.scale.set(...scale);
  x.castShadow = shadow;
  x.receiveShadow = shadow;
  return x;
}
const SPH = new THREE.SphereGeometry(1, 48, 32);
const SPH_LO = new THREE.SphereGeometry(1, 20, 14);
const lerp = THREE.MathUtils.lerp;
const damp = (a: number, b: number, k: number, dt: number) => lerp(a, b, 1 - Math.exp(-k * dt));

/** Puts `obj` on the surface of an ellipsoid (centre c, radii r) in the direction (x, y) seen from the front, facing outwards. */
function onFace(obj: THREE.Object3D, c: THREE.Vector3, r: THREE.Vector3, x: number, y: number, lift = 0) {
  const nx = x / r.x, ny = y / r.y;
  const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
  obj.position.set(c.x + x, c.y + y, c.z + nz * r.z + lift);
  const n = new THREE.Vector3(nx / r.x, ny / r.y, nz / r.z).normalize();
  obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
}

/* ---------- emote sprites drawn on a canvas ---------- */
function emoteTexture(kind: "note" | "drop" | "q" | "spark") {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.translate(128, 128);
  g.lineJoin = "round";
  g.lineCap = "round";
  if (kind === "note") {
    g.fillStyle = "#ff9a3c"; g.strokeStyle = "#fff"; g.lineWidth = 14;
    const p = new Path2D("M-30 50a26 22 0 1 1 18-21V-60l70-20v100a26 22 0 1 1 18-21V-40l-52 15v75z");
    g.stroke(p); g.fill(p);
  } else if (kind === "drop") {
    const p = new Path2D("M0-80C34-30 46-4 46 22a46 46 0 0 1-92 0C-46-4-34-30 0-80z");
    g.strokeStyle = "#fff"; g.lineWidth = 14; g.stroke(p);
    const gr = g.createLinearGradient(0, -80, 0, 70); gr.addColorStop(0, "#bfe4ff"); gr.addColorStop(1, "#5aaee8");
    g.fillStyle = gr; g.fill(p);
    g.fillStyle = "rgba(255,255,255,.85)"; g.beginPath(); g.ellipse(-16, 18, 9, 16, -0.4, 0, Math.PI * 2); g.fill();
  } else if (kind === "q") {
    g.font = "900 190px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.lineWidth = 18; g.strokeStyle = "#fff"; g.strokeText("?", 0, 10);
    g.fillStyle = "#ff9a3c"; g.fillText("?", 0, 10);
  } else {
    const star = (x: number, y: number, s: number) => {
      const p = new Path2D(); p.moveTo(x, y - s);
      p.quadraticCurveTo(x + s * 0.18, y - s * 0.18, x + s, y); p.quadraticCurveTo(x + s * 0.18, y + s * 0.18, x, y + s);
      p.quadraticCurveTo(x - s * 0.18, y + s * 0.18, x - s, y); p.quadraticCurveTo(x - s * 0.18, y - s * 0.18, x, y - s);
      return p;
    };
    g.strokeStyle = "#fff"; g.lineWidth = 12; g.fillStyle = "#ffd23f";
    for (const [x, y, s] of [[-14, -6, 84], [62, 56, 38], [-70, 62, 26]]) { const p = star(x, y, s); g.stroke(p); g.fill(p); }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function skyTexture(night: boolean) {
  const c = document.createElement("canvas");
  c.width = 4; c.height = 512;
  const g = c.getContext("2d")!;
  const gr = g.createLinearGradient(0, 0, 0, 512);
  if (night) { gr.addColorStop(0, "#0d1530"); gr.addColorStop(0.55, "#1f2c55"); gr.addColorStop(1, "#4a4a6e"); }
  else { gr.addColorStop(0, "#7ec8f2"); gr.addColorStop(0.55, "#bfe6f7"); gr.addColorStop(1, "#fff1d2"); }
  g.fillStyle = gr; g.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------- Bori, built from soft shapes ---------- */
function buildBunny() {
  const fur = mat("#f7c886", { roughness: 0.9, emissive: "#5a3a12", emissiveIntensity: 0.12 });
  const furLight = mat("#fff6e6", { roughness: 0.95, emissive: "#6a5a40", emissiveIntensity: 0.18 });
  const pink = mat("#f7aaa4", { roughness: 0.9 });
  const ink = mat("#2e211b", { roughness: 0.35 });
  const white = new THREE.MeshBasicMaterial({ color: "#ffffff" });
  const scarf = mat("#6cc9a0", { roughness: 0.8 });
  const blushM = new THREE.MeshBasicMaterial({ color: "#ff8f8f", transparent: true, opacity: 0.45, depthWrite: false });
  const mouthM = mat("#7a3530", { roughness: 0.6 });
  const browM = mat("#a8743f");

  const root = new THREE.Group();        // stays on the ground
  const hop = new THREE.Group();         // hops and squashes
  root.add(hop);

  // feet and tail
  hop.add(mesh(SPH, fur, [-0.2, 0.07, 0.12], [0.17, 0.09, 0.22]));
  hop.add(mesh(SPH, fur, [0.2, 0.07, 0.12], [0.17, 0.09, 0.22]));
  const tail = mesh(SPH_LO, furLight, [0, 0.38, -0.42], [0.17, 0.17, 0.17]);
  hop.add(tail);

  // body
  const body = new THREE.Group();
  hop.add(body);
  body.add(mesh(SPH, fur, [0, 0.45, 0], [0.47, 0.46, 0.42]));
  body.add(mesh(SPH, furLight, [0, 0.42, 0.18], [0.32, 0.33, 0.27]));
  const armL = new THREE.Group(); armL.position.set(-0.36, 0.62, 0.08); body.add(armL);
  armL.add(mesh(SPH, fur, [0, -0.13, 0.04], [0.11, 0.19, 0.11]));
  const armR = new THREE.Group(); armR.position.set(0.36, 0.62, 0.08); body.add(armR);
  armR.add(mesh(SPH, fur, [0, -0.13, 0.04], [0.11, 0.19, 0.11]));
  armL.rotation.z = -0.35; armR.rotation.z = 0.35;

  // scarf
  const band = mesh(new THREE.TorusGeometry(0.36, 0.075, 16, 48), scarf, [0, 0.86, 0], [1, 1, 0.92]);
  band.rotation.x = Math.PI / 2 - 0.12;
  body.add(band);
  const knot = mesh(SPH_LO, scarf, [0.17, 0.8, 0.33], [0.08, 0.07, 0.06]);
  body.add(knot);
  const tailCloth = mesh(new THREE.ConeGeometry(0.09, 0.26, 3), scarf, [0.22, 0.68, 0.34]);
  tailCloth.rotation.set(0.2, 0, Math.PI + 0.35);
  body.add(tailCloth);

  // head pivots at the neck so it can tilt
  const head = new THREE.Group();
  head.position.set(0, 0.9, 0);
  hop.add(head);
  const HC = new THREE.Vector3(0, 0.5, 0);
  const HR = new THREE.Vector3(0.66, 0.56, 0.6);
  head.add(mesh(SPH, fur, [HC.x, HC.y, HC.z], [HR.x, HR.y, HR.z]));
  // a little tuft
  for (const [x, z, r] of [[-0.05, 0, 0.09], [0.06, 0.02, 0.08], [0.0, -0.06, 0.07]] as const) head.add(mesh(SPH_LO, fur, [x, 1.04, z], [r, r * 1.2, r]));

  // ears
  const earGeo = new THREE.CapsuleGeometry(0.13, 0.62, 10, 24);
  const innerGeo = new THREE.CapsuleGeometry(0.075, 0.5, 8, 20);
  const mkEar = (side: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.24, 0.94, -0.04);
    const e = mesh(earGeo, fur, [0, 0.42, 0], [1, 1, 0.62]);
    const inner = mesh(innerGeo, pink, [0, 0.42, 0.058], [1, 1, 0.35], false);
    pivot.add(e, inner);
    head.add(pivot);
    return pivot;
  };
  const earL = mkEar(-1), earR = mkEar(1);

  // muzzle, nose, cheeks
  const muzzle = new THREE.Mesh(SPH, furLight);
  onFace(muzzle, HC, HR, 0, -0.17, -0.06);
  muzzle.scale.set(0.2, 0.14, 0.1);
  head.add(muzzle);
  const nose = new THREE.Mesh(SPH_LO, pink);
  onFace(nose, HC, HR, 0, -0.1, 0.03);
  nose.scale.set(0.055, 0.04, 0.04);
  head.add(nose);
  for (const s of [-1, 1]) {
    const b = new THREE.Mesh(new THREE.CircleGeometry(0.1, 32), blushM);
    onFace(b, HC, HR, s * 0.4, -0.13, 0.005);
    b.scale.set(1.15, 0.7, 1);
    head.add(b);
  }

  // eyes (open) with highlights
  const eyes = new THREE.Group();
  head.add(eyes);
  const eyeL = new THREE.Group(), eyeR = new THREE.Group();
  for (const [g, s] of [[eyeL, -1], [eyeR, 1]] as const) {
    onFace(g, HC, HR, s * 0.24, 0.02, -0.012);
    const ball = mesh(SPH, ink, [0, 0, 0], [0.1, 0.13, 0.06], false);
    const hl = new THREE.Mesh(SPH_LO, white); hl.position.set(0.035, 0.05, 0.05); hl.scale.setScalar(0.036);
    const hl2 = new THREE.Mesh(SPH_LO, white); hl2.position.set(-0.03, -0.055, 0.05); hl2.scale.setScalar(0.017);
    g.add(ball, hl, hl2);
    eyes.add(g);
  }
  // eyes (happy ^ ^)
  const happy = new THREE.Group();
  head.add(happy);
  const arc = new THREE.TorusGeometry(0.075, 0.017, 8, 24, Math.PI);
  for (const s of [-1, 1]) {
    const a = new THREE.Mesh(arc, ink);
    onFace(a, HC, HR, s * 0.24, 0.0, 0.0);
    happy.add(a);
  }
  // brows for worried / thinking
  const brows = new THREE.Group();
  head.add(brows);
  const browGeo = new THREE.CapsuleGeometry(0.016, 0.11, 4, 8);
  const browL = new THREE.Mesh(browGeo, browM), browR = new THREE.Mesh(browGeo, browM);
  onFace(browL, HC, HR, -0.25, 0.17, 0.0); onFace(browR, HC, HR, 0.25, 0.17, 0.0);
  browL.rotateZ(Math.PI / 2); browR.rotateZ(Math.PI / 2);
  brows.add(browL, browR);

  // mouth: a small "w" when closed, a little open mouth when talking
  const mouthClosed = new THREE.Group();
  const mArc = new THREE.TorusGeometry(0.03, 0.009, 6, 16, Math.PI);
  for (const s of [-1, 1]) {
    const a = new THREE.Mesh(mArc, ink);
    onFace(a, HC, HR, s * 0.03, -0.2, 0.05);
    a.rotateZ(Math.PI);
    mouthClosed.add(a);
  }
  head.add(mouthClosed);
  const mouthOpen = new THREE.Mesh(SPH_LO, mouthM);
  onFace(mouthOpen, HC, HR, 0, -0.21, 0.045);
  mouthOpen.scale.set(0.05, 0.045, 0.03);
  head.add(mouthOpen);

  root.traverse((o) => { if (o instanceof THREE.Mesh && o.material === white) o.castShadow = false; });
  return { root, hop, body, head, earL, earR, armL, armR, eyes, eyeL, eyeR, happy, brows, browL, browR, mouthClosed, mouthOpen, tail };
}

/* ---------- the island ---------- */
const R = 30; // the ground is a big sphere, so the horizon rolls away like a tiny planet
function placeOnGround(obj: THREE.Object3D, x: number, z: number) {
  const y = Math.sqrt(R * R - x * x - z * z) - R;
  obj.position.set(x, y, z);
  const n = new THREE.Vector3(x, y + R, z).normalize();
  obj.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n));
  return obj;
}
function rng(seed: number) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }

function buildWorld(scene: THREE.Scene) {
  const grass = mat("#8fd47a", { roughness: 1 });
  const ground = new THREE.Mesh(new THREE.SphereGeometry(R, 128, 64), grass);
  ground.position.y = -R;
  ground.receiveShadow = true;
  scene.add(ground);

  // a sandy path under Bori
  const path = new THREE.Mesh(new THREE.CircleGeometry(1.25, 48), mat("#e9d6a5", { roughness: 1 }));
  path.rotation.x = -Math.PI / 2; path.position.y = 0.005; path.receiveShadow = true;
  scene.add(path);

  const r = rng(7);
  const trunk = mat("#a8754a");
  const leafColors = ["#5cb85c", "#6cc46a", "#4fa856", "#78c96b"];
  const fruitM = mat("#ff8a65", { roughness: 0.6 });
  const tree = (x: number, z: number, s: number, fruit: boolean) => {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.12, 0.17, 1.1, 12), trunk, [0, 0.55, 0]));
    const leaf = mat(leafColors[Math.floor(r() * leafColors.length)]);
    g.add(mesh(SPH, leaf, [0, 1.45, 0], [0.75, 0.68, 0.75]));
    g.add(mesh(SPH, leaf, [0.32, 1.25, 0.2], [0.5, 0.45, 0.5]));
    g.add(mesh(SPH, leaf, [-0.34, 1.28, -0.1], [0.5, 0.45, 0.5]));
    g.add(mesh(SPH, leaf, [0, 1.9, 0], [0.45, 0.4, 0.45]));
    if (fruit) for (let i = 0; i < 4; i++) {
      const a = r() * Math.PI * 2;
      g.add(mesh(SPH_LO, fruitM, [Math.cos(a) * 0.62, 1.2 + r() * 0.5, Math.sin(a) * 0.62 + 0.15], [0.09, 0.09, 0.09]));
    }
    g.scale.setScalar(s);
    g.rotation.y = r() * Math.PI;
    scene.add(placeOnGround(g, x, z));
  };
  tree(-3.4, -2.6, 1.15, true); tree(3.1, -3.2, 1.25, false); tree(-5.6, -6, 1.4, false); tree(5.8, -6.5, 1.5, true);
  tree(-1.4, -7.5, 1.3, false); tree(1.8, -9, 1.5, false); tree(-8, -3, 1.3, true); tree(8.4, -3.6, 1.2, false);
  tree(-4.6, 0.6, 1.0, false); tree(4.9, 0.2, 1.1, true); tree(-10.5, -8, 1.6, false); tree(10.8, -9.5, 1.7, false); tree(-6.8, 3.2, 1.0, true); tree(7.2, 3.6, 0.95, false);

  // flowers
  const petals = ["#ff8fb1", "#ffd54f", "#ffffff", "#b39ddb", "#ff7f6e"].map((c) => mat(c, { roughness: 0.7 }));
  const stem = mat("#4e9e47");
  const centre = mat("#ffcf40");
  const petalGeo = new THREE.SphereGeometry(1, 12, 8);
  for (let i = 0; i < 90; i++) {
    const a = r() * Math.PI * 2, d = 1.7 + r() * 7.5;
    const x = Math.cos(a) * d, z = Math.sin(a) * d - 1;
    if (z > 2.2 && Math.abs(x) < 1.6) continue; // keep the camera's foreground clear
    const f = new THREE.Group();
    f.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 5), stem, [0, 0.11, 0], [1, 1, 1], false));
    const pm = petals[Math.floor(r() * petals.length)];
    for (let k = 0; k < 5; k++) {
      const pa = (k / 5) * Math.PI * 2;
      f.add(mesh(petalGeo, pm, [Math.cos(pa) * 0.05, 0.23, Math.sin(pa) * 0.05], [0.045, 0.02, 0.045], false));
    }
    f.add(mesh(SPH_LO, centre, [0, 0.24, 0], [0.03, 0.02, 0.03], false));
    f.scale.setScalar(0.7 + r() * 0.45);
    scene.add(placeOnGround(f, x, z));
  }
  // grass tufts and pebbles
  const tuftM = mat("#79c766");
  const tuftGeo = new THREE.ConeGeometry(0.022, 0.13, 5);
  for (let i = 0; i < 160; i++) {
    const a = r() * Math.PI * 2, d = 1.4 + r() * 8;
    const g = new THREE.Group();
    for (let k = 0; k < 3; k++) {
      const b = mesh(tuftGeo, tuftM, [(k - 1) * 0.04, 0.09, 0], [1, 0.8 + r() * 0.6, 1], false);
      b.rotation.z = (k - 1) * 0.35;
      g.add(b);
    }
    scene.add(placeOnGround(g, Math.cos(a) * d, Math.sin(a) * d - 1));
  }
  const stoneM = mat("#c9c3b8");
  for (const [x, z, s] of [[1.6, 0.4, 0.14], [-1.9, -0.6, 0.18], [2.4, -1.5, 0.11], [-1.2, 1.2, 0.1]]) {
    scene.add(placeOnGround(mesh(SPH_LO, stoneM, [0, 0, 0], [s * 1.4, s * 0.7, s]), x, z));
  }

  // a wooden signpost, a little bit of "place"
  const wood = mat("#c48b55");
  const sign = new THREE.Group();
  sign.add(mesh(new THREE.BoxGeometry(0.07, 0.75, 0.07), wood, [0, 0.37, 0]));
  sign.add(mesh(new THREE.BoxGeometry(0.62, 0.3, 0.05), wood, [0, 0.66, 0.03]));
  sign.rotation.y = 0.5;
  scene.add(placeOnGround(sign, -2.1, -1.3));
}

/* ---------- the React wrapper ---------- */
export default function BuddyScene({ face, talking, beat, night, onFail }: State & { onFail: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const state = useRef<State>({ face, talking, beat, night });
  state.current = { face, talking, beat, night };

  useEffect(() => {
    const el = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    } catch { onFail(); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);

    const night = state.current.night;
    const scene = new THREE.Scene();
    scene.background = skyTexture(night);
    scene.fog = new THREE.Fog(night ? "#2f3558" : "#dff0f2", 18, 42);

    const hemi = new THREE.HemisphereLight(night ? "#8fa3e0" : "#fff6e0", night ? "#2a3a2a" : "#7fb069", night ? 0.9 : 1.4);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(night ? "#b7c6ff" : "#fff1d6", night ? 1.1 : 2.4);
    sun.position.set(3.5, 7, 4.5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -6; sun.shadow.camera.right = 6; sun.shadow.camera.top = 6; sun.shadow.camera.bottom = -6;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 25;
    sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02; sun.shadow.radius = 4;
    scene.add(sun);
    const rim = new THREE.DirectionalLight(night ? "#6c7cff" : "#ffd9a8", night ? 0.5 : 0.7);
    rim.position.set(-4, 3, -4);
    scene.add(rim);
    if (night) {
      const lamp = new THREE.PointLight("#ffc77a", 6, 6, 1.6);
      lamp.position.set(0.9, 1.6, 1.4);
      scene.add(lamp);
    }

    buildWorld(scene);
    const b = buildBunny();
    scene.add(b.root);

    // floating bits: petals by day, fireflies by night
    const n = 40;
    const bits = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: night ? "#fff2a0" : "#ffd1e0", transparent: true, opacity: night ? 0.9 : 0.85 }), n);
    const seeds = Array.from({ length: n }, (_, i) => { const r = rng(100 + i); return [r() * 12 - 6, r() * 2.6 + 0.3, r() * -8 + 1.5, r() * 6.28, 0.6 + r()] as const; });
    scene.add(bits);
    let stars: THREE.Points | null = null;
    if (night) {
      const pts = new Float32Array(600 * 3);
      const r = rng(3);
      for (let i = 0; i < 600; i++) {
        const th = r() * Math.PI * 2, ph = r() * 0.45 + 0.05;
        pts.set([Math.cos(th) * Math.cos(ph) * 60, Math.sin(ph) * 60, Math.sin(th) * Math.cos(ph) * 60 - 10], i * 3);
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
      stars = new THREE.Points(geo, new THREE.PointsMaterial({ color: "#fff", size: 0.25, fog: false }));
      scene.add(stars);
    }

    // emote sprite above the head
    const tex = { note: emoteTexture("note"), drop: emoteTexture("drop"), q: emoteTexture("q"), spark: emoteTexture("spark") };
    const emote = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.note, transparent: true, depthTest: false }));
    emote.renderOrder = 10;
    emote.position.set(0.72, 2.25, 0.2);
    emote.scale.setScalar(0);
    scene.add(emote);

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 120);
    const target = new THREE.Vector3(0, 1.4, 0);
    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h, false);
      const aspect = w / h;
      camera.aspect = aspect;
      // Bori (ears included, about 2.9 tall) fills a set share of the screen height and sits in the upper part,
      // so the dialogue box and the replies at the bottom never cover her face
      const share = aspect < 0.8 ? 0.39 : 0.54;
      const dist = 2.9 / share / (2 * Math.tan(THREE.MathUtils.degToRad(15)));
      camera.position.set(0, 1.4 + dist * 0.11, dist);
      camera.lookAt(target);
      camera.setViewOffset(w, h, 0, h * (aspect < 0.8 ? 0.24 : 0.19), w, h);
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    // animation state
    const clock = new THREE.Clock();
    let lastBeat = state.current.beat, hopT = 9, emoteT = 9, lastEmote = "";
    let nextBlink = 2, blinkT = 9;
    let earL = 0.2, earR = -0.45, tilt = 0, mouth = 0, armL = -0.35, armR = 0.35;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s3 = new THREE.Vector3();
    let raf = 0, running = true;

    const frame = () => {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      const st = state.current;
      const happyFace = st.face === "happy" || st.face === "joy";

      if (st.beat !== lastBeat) { lastBeat = st.beat; hopT = 0; }
      hopT += dt;
      // hop: squash, jump, stretch, land
      const h = hopT < 0.55 ? hopT / 0.55 : 1;
      const jump = h < 1 ? Math.sin(h * Math.PI) * 0.28 : 0;
      const squash = h < 0.15 ? 1 - Math.sin((h / 0.15) * Math.PI) * 0.12 : h < 1 ? 1 + Math.sin(((h - 0.15) / 0.85) * Math.PI) * 0.06 : 1;
      const breathe = Math.sin(t * 2.4) * 0.012;
      b.hop.position.y = jump;
      b.hop.scale.set(1 + (1 - squash) * 0.6 - breathe * 0.5, squash + breathe, 1 + (1 - squash) * 0.6 - breathe * 0.5);
      b.head.position.y = 0.9 + Math.sin(t * 2.4 - 0.6) * 0.012;

      // gentle sway towards the camera, and a tilt when thinking
      b.root.rotation.y = Math.sin(t * 0.6) * 0.08;
      tilt = damp(tilt, st.face === "think" ? 0.17 : st.face === "sad" ? -0.04 : happyFace ? Math.sin(t * 3) * 0.05 : 0, 6, dt);
      b.head.rotation.z = tilt;
      b.head.rotation.x = damp(b.head.rotation.x, st.face === "sad" ? 0.12 : -0.03, 5, dt);

      // ears
      const wiggle = (t % 5.5) > 5.1 ? Math.sin((t % 5.5) * 30) * 0.12 : 0;
      earL = damp(earL, st.face === "sad" ? 0.55 : happyFace ? 0.1 : 0.2, 7, dt);
      earR = damp(earR, st.face === "sad" ? -0.65 : st.face === "joy" ? -0.12 : -0.45, 7, dt);
      b.earL.rotation.z = earL; b.earR.rotation.z = earR - wiggle;
      b.earL.rotation.x = damp(b.earL.rotation.x, st.face === "sad" ? -1.0 : -0.1, 7, dt); b.earR.rotation.x = damp(b.earR.rotation.x, st.face === "sad" ? -1.0 : -0.05, 7, dt);

      // arms: up with joy, together when sad
      armL = damp(armL, st.face === "joy" ? -2.2 + Math.sin(t * 10) * 0.2 : st.face === "sad" ? -0.1 : -0.35, 8, dt);
      armR = damp(armR, st.face === "joy" ? 2.2 - Math.sin(t * 10) * 0.2 : st.face === "sad" ? 0.1 : 0.35, 8, dt);
      b.armL.rotation.z = armL; b.armR.rotation.z = armR;
      b.tail.position.x = Math.sin(t * 9) * (happyFace ? 0.03 : 0.008);

      // face
      blinkT += dt;
      if (t > nextBlink) { blinkT = 0; nextBlink = t + 2.5 + Math.random() * 3; }
      const blink = blinkT < 0.14 ? 1 - Math.sin((blinkT / 0.14) * Math.PI) * 0.92 : 1;
      b.eyes.visible = !happyFace;
      b.happy.visible = happyFace;
      b.eyeL.scale.y = blink * (st.face === "sad" ? 0.85 : 1); b.eyeR.scale.y = blink * (st.face === "sad" ? 0.85 : 1);
      b.brows.visible = st.face === "sad" || st.face === "think";
      b.browL.rotation.z = Math.PI / 2 + (st.face === "sad" ? 0.38 : -0.08);
      b.browR.rotation.z = Math.PI / 2 + (st.face === "sad" ? -0.38 : 0.3);
      const mTarget = st.talking ? 0.5 + 0.5 * Math.abs(Math.sin(t * 17)) : 0;
      mouth = damp(mouth, mTarget, 25, dt);
      b.mouthOpen.visible = mouth > 0.08;
      b.mouthClosed.visible = mouth <= 0.08;
      b.mouthOpen.scale.set(0.05, 0.02 + mouth * 0.035, 0.03);

      // emote
      const kind = st.face === "happy" ? "note" : st.face === "sad" ? "drop" : st.face === "think" ? "q" : st.face === "joy" ? "spark" : "";
      if (kind + st.beat !== lastEmote) { lastEmote = kind + st.beat; emoteT = 0; if (kind) emote.material.map = tex[kind as keyof typeof tex]; emote.material.needsUpdate = true; }
      emoteT += dt;
      const pop = kind ? Math.min(1, emoteT / 0.35) : 0;
      const over = pop < 1 ? 1 + Math.sin(pop * Math.PI) * 0.35 : 1;
      emote.scale.setScalar(0.42 * pop * over);
      emote.position.y = 2.25 + jump + Math.sin(t * 2.5) * 0.04 + (kind === "drop" ? -Math.min(emoteT, 2) * 0.05 : 0);

      // petals / fireflies
      for (let i = 0; i < n; i++) {
        const [x, y, z, ph, sp] = seeds[i];
        v.set(x + Math.sin(t * 0.3 * sp + ph) * 0.8, y + Math.sin(t * 0.7 * sp + ph) * 0.25, z + Math.cos(t * 0.25 * sp + ph) * 0.6);
        const sz = night ? 0.025 * (0.6 + 0.4 * Math.sin(t * 3 * sp + ph)) : 0.03;
        q.setFromEuler(new THREE.Euler(t * sp, ph, 0));
        s3.set(sz, night ? sz : sz * 0.4, sz);
        bits.setMatrixAt(i, m4.compose(v, q, s3));
      }
      bits.instanceMatrix.needsUpdate = true;

      // a slow, barely-there camera drift
      camera.position.x = Math.sin(t * 0.18) * 0.25;
      camera.lookAt(target);

      renderer.render(scene, camera);
    };
    frame();

    const onVis = () => {
      if (document.hidden) { running = false; cancelAnimationFrame(raf); }
      else if (!running) { running = true; clock.getDelta(); frame(); }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      ro.disconnect();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.Sprite) {
          if (o.geometry !== SPH && o.geometry !== SPH_LO) o.geometry?.dispose();
          const ms = Array.isArray(o.material) ? o.material : [o.material];
          ms.forEach((m) => m.dispose());
        }
      });
      Object.values(tex).forEach((x) => x.dispose());
      (scene.background as THREE.Texture | null)?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
    // the scene is built once; later prop changes reach the loop through `state`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [night]);

  return <div ref={host} className="bdg-canvas" aria-hidden="true" />;
}
