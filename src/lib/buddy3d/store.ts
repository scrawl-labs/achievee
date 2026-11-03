/**
 * In front of a corner shop at night. Through rounded, metal-framed windows you see a real little room: shelving
 * units with rows of colourful goods, a counter, a glowing drinks fridge and ceiling lights, so the inside shifts
 * with depth as the camera drifts. Outside: a rounded lightbox sign, a striped awning that sags between its
 * brackets with a string of warm bulbs, an ice-cream freezer, a vending machine, potted plants, a chalkboard, and
 * the classic plastic table with a steaming cup of noodles. No real brands.
 */
import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { World, WorldOpts } from "./forest";
import { backdrop, canvas, curve, glow, lathe, rng, soft, softDot, sweep, tex, tube } from "./util";

const FRONT_Z = -4.6, FRONT_W = 7.2, FRONT_H = 2.6, ROOM_D = 3.2;
// the three window openings (x centre, width) and their height range
const WINS: [number, number][] = [[-2.25, 2.5], [0.35, 1.5], [2.45, 1.9]];
const WIN_Y0 = 0.35, WIN_Y1 = 2.2;
const DOOR = 1; // the middle opening is the door: it goes down to the ground

const goodsCols = ["#ff7d6b", "#ffd166", "#5fc8a9", "#6aa7ff", "#ff9ecb", "#fff4e0", "#f29a3a", "#9adf6c", "#c79cff"];
/** A strip of goods on a shelf: little packs and bottles in many colours, painted soft. */
function goodsTexture(seed: number, rows: number) {
  const W = 256, H = 64 * rows;
  const [c, g] = canvas(W, H);
  g.fillStyle = "#f4efe6"; g.fillRect(0, 0, W, H);
  const r = rng(seed);
  for (let row = 0; row < rows; row++) {
    const base = (row + 1) * 64 - 8;
    g.fillStyle = "#d8cfc0"; g.fillRect(0, base, W, 8);
    for (let x = 2; x < W - 2; ) {
      const w = 8 + r() * 14, h = 20 + r() * 30;
      const col = goodsCols[Math.floor(r() * goodsCols.length)];
      g.fillStyle = col;
      if (r() < 0.3) { g.beginPath(); g.roundRect(x, base - h, w, h, w / 2.5); g.fill(); } else g.fillRect(x, base - h, w, h);
      g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(x + 2, base - h + 4, Math.max(2, w * 0.25), h * 0.5);
      x += w + 2 + (r() < 0.15 ? 6 : 0);
    }
  }
  const t = soft(c); return t;
}
/** The shopfront wall with rounded openings cut out of it. */
function wallTexture() {
  const W = 1024, H = Math.round((W * (FRONT_H + 0.2)) / FRONT_W);
  const [c, g] = canvas(W, H);
  const r = rng(4);
  g.fillStyle = "#e9e3d8"; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 2600; i++) { g.fillStyle = r() < 0.5 ? "rgba(0,0,0,.035)" : "rgba(255,255,255,.05)"; g.fillRect(r() * W, r() * H, 2, 2); }
  g.fillStyle = "#cfc6b8"; g.fillRect(0, H * 0.9, W, H * 0.1); // a plinth along the bottom
  const X = (x: number) => ((x + FRONT_W / 2) / FRONT_W) * W, Yp = (y: number) => H - (y / (FRONT_H + 0.2)) * H;
  g.globalCompositeOperation = "destination-out";
  WINS.forEach(([cx, w], i) => { const y0 = i === DOOR ? 0 : WIN_Y0; g.beginPath(); g.roundRect(X(cx - w / 2), Yp(WIN_Y1), X(cx + w / 2) - X(cx - w / 2), Yp(y0) - Yp(WIN_Y1), [18, 18, i === DOOR ? 0 : 18, i === DOOR ? 0 : 18]); g.fill(); });
  g.globalCompositeOperation = "source-over";
  const t = tex(c); t.anisotropy = 8; return t;
}
/** Points around a rounded rectangle in the x-y plane, for metal window frames. */
function roundedRect(cx: number, y0: number, w: number, h: number, r: number, z: number, openBottom = false): [number, number, number][] {
  // clockwise: up the left side, across the top, down the right side (and back along the bottom unless it is a door)
  const pts: [number, number, number][] = [];
  const arc = (ax: number, ay: number, a0: number) => { for (let i = 0; i <= 6; i++) { const a = a0 - (i / 6) * (Math.PI / 2); pts.push([ax + Math.cos(a) * r, ay + Math.sin(a) * r, z]); } };
  const x0 = cx - w / 2, x1 = cx + w / 2, y1 = y0 + h;
  pts.push([x0, openBottom ? y0 : y0 + r, z]);
  arc(x0 + r, y1 - r, Math.PI); arc(x1 - r, y1 - r, Math.PI / 2);
  if (openBottom) { pts.push([x1, y0, z]); return pts; }
  arc(x1 - r, y0 + r, 0); arc(x0 + r, y0 + r, -Math.PI / 2);
  pts.push(pts[0]);
  return pts;
}
function vendingTexture() {
  const [c, g] = canvas(256, 512);
  g.fillStyle = "#eaf6ff"; g.fillRect(0, 0, 256, 512);
  const r = rng(21);
  for (let row = 0; row < 5; row++) for (let i = 0; i < 6; i++) {
    const x = 18 + i * 37, y = 30 + row * 74;
    g.fillStyle = goodsCols[Math.floor(r() * goodsCols.length)];
    g.beginPath(); g.roundRect(x, y, 22, 52, 9); g.fill();
    g.fillStyle = "rgba(255,255,255,.5)"; g.fillRect(x + 4, y + 8, 4, 30);
    g.fillStyle = "#3b4a6b"; g.fillRect(x - 2, y + 56, 26, 6);
  }
  g.fillStyle = "#2b3550"; g.fillRect(0, 410, 256, 102);
  g.fillStyle = "#101522"; g.beginPath(); g.roundRect(40, 440, 176, 46, 8); g.fill();
  return tex(c);
}
function chalkTexture() {
  const [c, g] = canvas(256, 320);
  g.fillStyle = "#2f3a33"; g.fillRect(0, 0, 256, 320);
  g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = 3; g.lineCap = "round";
  g.fillStyle = "rgba(255,255,255,.9)"; g.font = "700 30px system-ui, sans-serif"; g.textAlign = "center";
  g.fillText("NIGHT", 128, 62); g.fillText("SNACKS", 128, 98);
  g.fillStyle = "#ffd166"; g.beginPath(); g.arc(128, 175, 38, 0, Math.PI); g.fill();
  g.strokeStyle = "#fff6e0"; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(108 + i * 20, 160); g.quadraticCurveTo(114 + i * 20, 140, 106 + i * 20, 122); g.stroke(); }
  g.fillStyle = "#ff9ecb"; g.font = "700 26px system-ui, sans-serif"; g.fillText("1 + 1", 128, 270);
  return tex(c);
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

export function buildStore(opts: WorldOpts = {}): World {
  RectAreaLightUniformsLib.init();
  const group = new THREE.Group();
  const add = <T extends THREE.Object3D>(o: T) => { group.add(o); return o; };
  const r = rng(31);

  /* ---- light: the shop glow, awning downlights, a cool night sky ---- */
  add(new THREE.HemisphereLight("#5d6aa0", "#1a1720", 0.4));
  const shopGlow = new THREE.RectAreaLight("#ffe7c4", 3.4, FRONT_W * 0.85, 1.8);
  shopGlow.position.set(0, 1.25, FRONT_Z + 0.06); shopGlow.lookAt(0, 0.9, 4);
  add(shopGlow);
  for (const x of [-1.9, 1.9]) {
    const s = new THREE.SpotLight("#ffe2b4", 16, 7, 0.8, 0.75, 1.5);
    s.position.set(x, FRONT_H + 0.1, FRONT_Z + 0.85); s.target.position.set(x * 0.55, 0, 0.3);
    s.castShadow = true; s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -0.0005; s.shadow.radius = 5;
    add(s); add(s.target);
  }
  const moon = new THREE.DirectionalLight("#9fb2ff", 0.3); moon.position.set(4, 6, 5); add(moon);
  const fill = new THREE.DirectionalLight("#ffe9d8", 0.8); fill.position.set(-2, 2, 7); add(fill);

  /* ---- the room inside: lit by its own lights, so it simply glows ---- */
  const room = new THREE.Group(); add(room);
  const bz = FRONT_Z - ROOM_D;
  const lit = (t: THREE.Texture | null, color = "#ffffff") => new THREE.MeshBasicMaterial({ map: t, color, side: THREE.DoubleSide });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(FRONT_W, FRONT_H), lit(goodsTexture(5, 4), "#f3e7cf")); back.position.set(0, FRONT_H / 2, bz); room.add(back);
  const floorIn = new THREE.Mesh(new THREE.PlaneGeometry(FRONT_W, ROOM_D), lit(null, "#d9d2c4")); floorIn.rotation.x = -Math.PI / 2; floorIn.position.set(0, 0.002, FRONT_Z - ROOM_D / 2); room.add(floorIn);
  const [cc, cg] = canvas(256, 128);
  cg.fillStyle = "#f6f2ea"; cg.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 3; i++) { cg.fillStyle = "#fffef6"; cg.shadowColor = "#fff6d8"; cg.shadowBlur = 12; cg.beginPath(); cg.roundRect(20 + i * 80, 52, 56, 24, 8); cg.fill(); }
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(FRONT_W, ROOM_D), lit(soft(cc))); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, FRONT_H, FRONT_Z - ROOM_D / 2); room.add(ceil);
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_D, FRONT_H), lit(goodsTexture(9 + s, 4), "#efe2c8")); w.rotation.y = s * Math.PI / 2; w.position.set(-s * FRONT_W / 2, FRONT_H / 2, FRONT_Z - ROOM_D / 2); room.add(w); }
  // two shelving units standing in the room, facing the window
  for (const [x, z, w] of [[-2.1, FRONT_Z - 1.4, 2.0], [1.4, FRONT_Z - 1.9, 1.8]] as const) {
    const unit = new THREE.Group();
    const body = new THREE.Mesh(new RoundedBoxGeometry(w, 1.4, 0.45, 3, 0.04), lit(null, "#e4ddd0"));
    body.position.y = 0.7; unit.add(body);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.08, 1.3), lit(goodsTexture(40 + x * 10, 4)));
    face.position.set(0, 0.7, 0.23); unit.add(face);
    unit.position.set(x, 0, z); room.add(unit);
  }
  // the counter and a drinks fridge glowing on the back wall
  const counter = new THREE.Mesh(new RoundedBoxGeometry(1.4, 0.95, 0.55, 3, 0.05), lit(null, "#d7cbb5")); counter.position.set(2.75, 0.48, FRONT_Z - 0.9); room.add(counter);
  const fridge = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.9), lit(goodsTexture(77, 4), "#dff2ff")); fridge.position.set(-0.4, 1.0, bz + 0.02); room.add(fridge);

  /* ---- the shopfront ---- */
  const front = add(new THREE.Mesh(new THREE.PlaneGeometry(FRONT_W, FRONT_H + 0.2), new THREE.MeshStandardMaterial({ map: wallTexture(), alphaTest: 0.5, roughness: 0.75 })));
  front.position.set(0, (FRONT_H + 0.2) / 2, FRONT_Z); front.receiveShadow = true;
  // rounded metal frames around the openings, a door handle, and glass with a soft sheen
  const metal = new THREE.MeshStandardMaterial({ color: "#5d6470", roughness: 0.35, metalness: 0.8 });
  WINS.forEach(([cx, w], i) => {
    const y0 = i === DOOR ? 0 : WIN_Y0;
    add(tube(roundedRect(cx, y0, w, WIN_Y1 - y0, 0.09, FRONT_Z + 0.02, i === DOOR), 0.035, metal, 80));
    const glass = add(new THREE.Mesh(new THREE.PlaneGeometry(w - 0.06, WIN_Y1 - y0 - 0.06), new THREE.MeshPhysicalMaterial({ color: "#ffffff", transparent: true, opacity: 0.07, roughness: 0.03, clearcoat: 1, depthWrite: false })));
    glass.position.set(cx, (y0 + WIN_Y1) / 2, FRONT_Z - 0.01);
  });
  add(tube([[WINS[DOOR][0] + 0.55, 0.85, FRONT_Z + 0.06], [WINS[DOOR][0] + 0.55, 1.35, FRONT_Z + 0.06]], 0.02, metal, 6));
  // reflections drifting across the glass
  const [rc, rg] = canvas(256, 64);
  const rgr = rg.createLinearGradient(0, 0, 256, 0);
  rgr.addColorStop(0, "rgba(255,255,255,0)"); rgr.addColorStop(0.45, "rgba(255,255,255,.18)"); rgr.addColorStop(0.55, "rgba(255,255,255,.18)"); rgr.addColorStop(1, "rgba(255,255,255,0)");
  rg.fillStyle = rgr; rg.fillRect(0, 0, 256, 64);
  const sheen = add(new THREE.Mesh(new THREE.PlaneGeometry(2.2, 6), new THREE.MeshBasicMaterial({ map: tex(rc, false), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.6 })));
  sheen.rotation.z = -0.5; sheen.position.set(-1, 1.2, FRONT_Z + 0.015);
  // a wall above for the sign, with rounded corners where it meets the sky
  add(new THREE.Mesh(new RoundedBoxGeometry(FRONT_W + 0.3, 1.2, 0.3, 4, 0.12), new THREE.MeshStandardMaterial({ color: "#d8d1c4", roughness: 0.8 }))).position.set(0, FRONT_H + 0.75, FRONT_Z - 0.16);
  for (const s of [-1, 1]) add(new THREE.Mesh(new RoundedBoxGeometry(0.34, FRONT_H + 0.4, 0.34, 4, 0.1), new THREE.MeshStandardMaterial({ color: "#d8d1c4", roughness: 0.8 }))).position.set(s * (FRONT_W / 2 + 0.05), (FRONT_H + 0.4) / 2, FRONT_Z - 0.05);

  // the lightbox sign: thick, rounded, glowing from the front
  const signFace = new THREE.MeshBasicMaterial({ map: signTexture() });
  const signSide = new THREE.MeshStandardMaterial({ color: "#2f8a66", roughness: 0.4 });
  const sign = add(new THREE.Mesh(new RoundedBoxGeometry(FRONT_W * 0.86, 0.62, 0.22, 4, 0.1), [signSide, signSide, signSide, signSide, signFace, signSide]));
  sign.position.set(0, FRONT_H + 0.72, FRONT_Z + 0.12);
  add(glow("#7dffc8", 5.5, 0.22)).position.set(0, FRONT_H + 0.72, FRONT_Z + 0.5);

  // the awning: curved, a little sag between its brackets, a scalloped hem
  const sag = (x: number) => -0.05 * Math.pow(Math.cos((x / FRONT_W) * Math.PI * 3), 2);
  const awProfile = curve([FRONT_Z + 0.02, FRONT_H + 0.08], [FRONT_Z + 0.55, FRONT_H + 0.1], [FRONT_Z + 1.0, FRONT_H - 0.36], 14);
  const awning = add(new THREE.Mesh(sweep(awProfile, -FRONT_W / 2, FRONT_W / 2, 48, (x, j) => sag(x) * (j / awProfile.length)).geo,
    new THREE.MeshStandardMaterial({ map: awningTexture(), alphaTest: 0.5, roughness: 0.75, side: THREE.DoubleSide })));
  awning.castShadow = true;
  for (const x of [-FRONT_W / 2 + 0.2, -FRONT_W / 6, FRONT_W / 6, FRONT_W / 2 - 0.2]) add(tube([[x, FRONT_H + 0.08, FRONT_Z + 0.02], [x, FRONT_H - 0.05, FRONT_Z + 0.55], [x, FRONT_H - 0.3, FRONT_Z + 0.95]], 0.015, metal, 12));
  for (const x of [-1.9, 1.9]) add(glow("#fff0cc", 0.55, 0.9)).position.set(x, FRONT_H + 0.06, FRONT_Z + 0.85);

  // a string of warm bulbs swinging under the awning edge
  const bulbs: THREE.Sprite[] = [];
  const bulbMat = new THREE.MeshBasicMaterial({ color: "#ffe1a0" });
  const wire: [number, number, number][] = [];
  for (let i = 0; i <= 28; i++) {
    const x = -FRONT_W / 2 + 0.2 + (i / 28) * (FRONT_W - 0.4);
    const k = (i % 7) / 7, y = FRONT_H - 0.42 - Math.sin(k * Math.PI) * 0.14;
    wire.push([x, y, FRONT_Z + 1.02]);
    if (i % 2 === 0) {
      const b = add(new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), bulbMat)); b.position.set(x, y - 0.04, FRONT_Z + 1.02);
      const g = add(glow("#ffcf7a", 0.32, 0.7)); g.position.copy(b.position); bulbs.push(g);
    }
  }
  add(tube(wire, 0.005, new THREE.MeshBasicMaterial({ color: "#2b2420" }), 120));

  /* ---- pavement, kerb, and the glow pooling in front ---- */
  const floor = add(new THREE.Mesh(new THREE.PlaneGeometry(26, 16), new THREE.MeshPhysicalMaterial({ map: pavement(), roughness: 0.6, clearcoat: 0.35, clearcoatRoughness: 0.3 })));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 4); floor.receiveShadow = true;
  const [lc, lg] = canvas(128, 128);
  const lgr = lg.createRadialGradient(64, 30, 0, 64, 30, 90); lgr.addColorStop(0, "rgba(255,220,160,.32)"); lgr.addColorStop(1, "rgba(255,220,160,0)");
  lg.fillStyle = lgr; lg.fillRect(0, 0, 128, 128);
  const pool = add(new THREE.Mesh(new THREE.PlaneGeometry(10, 6), new THREE.MeshBasicMaterial({ map: tex(lc, false), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
  pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.005, FRONT_Z + 3);

  /* ---- things outside the shop ---- */
  // an ice-cream freezer with a glowing glass lid
  const freezer = new THREE.Group();
  const fb = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.78, 0.62, 4, 0.08), new THREE.MeshStandardMaterial({ color: "#f4f6f8", roughness: 0.35 }));
  fb.position.y = 0.39; fb.castShadow = true; freezer.add(fb);
  const glassLid = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.04, 0.52, 2, 0.02), new THREE.MeshBasicMaterial({ color: "#cfeaff" }));
  glassLid.position.y = 0.79; freezer.add(glassLid);
  const stripe = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.16), new THREE.MeshStandardMaterial({ color: "#5fb0e8", roughness: 0.5 }));
  stripe.position.set(0, 0.55, 0.315); freezer.add(stripe);
  freezer.position.set(2.85, 0, FRONT_Z + 0.75); freezer.rotation.y = -0.1; add(freezer);
  add(glow("#bfe6ff", 1.4, 0.35)).position.set(2.85, 0.95, FRONT_Z + 0.75);
  // a vending machine glowing at the corner
  const vm = new THREE.Group();
  const vbody = new THREE.Mesh(new RoundedBoxGeometry(0.85, 1.85, 0.7, 4, 0.06), new THREE.MeshStandardMaterial({ color: "#d9534f", roughness: 0.35, metalness: 0.2 }));
  vbody.position.y = 0.925; vbody.castShadow = true; vm.add(vbody);
  const vface = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.45), new THREE.MeshBasicMaterial({ map: vendingTexture() }));
  vface.position.set(0, 1.0, 0.352); vm.add(vface);
  vm.position.set(-FRONT_W / 2 - 0.65, 0, FRONT_Z + 0.5); vm.rotation.y = 0.25; add(vm);
  const vLight = new THREE.PointLight("#dff2ff", 2.5, 3.5, 1.8); vLight.position.set(-FRONT_W / 2 - 0.4, 1.0, FRONT_Z + 1.2); add(vLight);
  // potted plants either side of the door
  const pot = new THREE.MeshStandardMaterial({ color: "#c87a4a", roughness: 0.7 });
  const leafM = new THREE.MeshStandardMaterial({ color: "#4f8a46", roughness: 0.75 });
  for (const x of [WINS[DOOR][0] - 0.95, WINS[DOOR][0] + 0.95]) {
    const pl = new THREE.Group();
    pl.add(lathe([[0, 0], [0.16, 0], [0.2, 0.34], [0.22, 0.36], [0, 0.36]], pot, 24));
    for (let i = 0; i < 9; i++) {
      const l = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), leafM);
      const a = (i / 9) * Math.PI * 2, h = 0.45 + r() * 0.35;
      l.scale.set(0.05, 0.22, 0.12); l.position.set(Math.cos(a) * 0.1, h, Math.sin(a) * 0.1); l.rotation.set(Math.sin(a) * 0.6, a, Math.cos(a) * 0.6);
      l.castShadow = true; pl.add(l);
    }
    pl.position.set(x, 0, FRONT_Z + 0.35); add(pl);
  }
  // a chalkboard on an A-frame
  const board = new THREE.Group();
  for (const s of [-1, 1]) {
    const b = new THREE.Mesh(new RoundedBoxGeometry(0.55, 0.72, 0.03, 2, 0.012), [new THREE.MeshStandardMaterial({ color: "#a8743f" }), new THREE.MeshStandardMaterial({ color: "#a8743f" }), new THREE.MeshStandardMaterial({ color: "#a8743f" }), new THREE.MeshStandardMaterial({ color: "#a8743f" }), new THREE.MeshStandardMaterial({ map: chalkTexture(), roughness: 0.9 }), new THREE.MeshStandardMaterial({ color: "#a8743f" })]);
    b.position.set(0, 0.36, s * 0.12); b.rotation.x = s * 0.2; if (s < 0) b.rotation.y = Math.PI;
    b.castShadow = true; board.add(b);
  }
  board.position.set(1.55, 0, FRONT_Z + 1.4); board.rotation.y = -0.35; add(board);

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
  add(backdrop(nightStreet(), 50, 21, 4, -14, false));
  const M = 6;
  const moths = Array.from({ length: M }, () => add(glow("#fff6dc", 0.08, 0.9)));
  void opts;

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
      mo.position.set(Math.cos(a) * (0.4 + i * 0.12) + Math.sin(t * 3 + i) * 0.05, FRONT_H + 0.75 + Math.sin(a * 1.7) * 0.25, FRONT_Z + 0.55 + Math.sin(a) * 0.25);
    });
    bulbs.forEach((b, i) => { (b.material as THREE.SpriteMaterial).opacity = 0.55 + 0.3 * (m ? Math.sin(t * 2 + i * 1.3) * Math.sin(t * 0.7 + i) : 1); });
    sheen.position.x = -1 + Math.sin(t * 0.12) * 0.8 * m;
    shopGlow.intensity = 3.4 * (m ? 0.98 + 0.02 * Math.sin(t * 40) * Math.sin(t * 3) : 1);
  };

  return { group, update, background: new THREE.Color("#0d1226"), fog: new THREE.Fog("#141832", 10, 30) };
}
