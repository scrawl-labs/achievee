/**
 * Bori, an original little office-worker creature: one soft sculpted body (built from a signed distance
 * field and shrink-wrapped into a single smooth mesh), a face painted onto the surface so it can change expression
 * (small bean eyes, rosy cheeks, a tiny mouth).
 */
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type Face = "idle" | "happy" | "sad" | "think" | "joy";

/* ---------- the body as a signed distance field ---------- */
type V = [number, number, number];
const len = (x: number, y: number, z: number) => Math.sqrt(x * x + y * y + z * z);
function ell(px: number, py: number, pz: number, c: V, r: V) {
  const x = px - c[0], y = py - c[1], z = pz - c[2];
  const k0 = len(x / r[0], y / r[1], z / r[2]);
  const k1 = len(x / (r[0] * r[0]), y / (r[1] * r[1]), z / (r[2] * r[2]));
  return k1 === 0 ? -Math.min(...r) : (k0 * (k0 - 1)) / k1;
}
function capsule(px: number, py: number, pz: number, a: V, b: V, r: number) {
  const pax = px - a[0], pay = py - a[1], paz = pz - a[2];
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz)));
  return len(pax - bax * h, pay - bay * h, paz - baz * h) - r;
}
function smin(a: number, b: number, k: number) { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; }

/** Distance to Bori's skin. About 2.1 tall, standing on y = 0, facing +z. */
export function sdf(x: number, y: number, z: number) {
  let d = ell(x, y, z, [0, 1.02, 0], [0.9, 0.96, 0.8]);                    // upper body / head (no neck, one blob)
  d = smin(d, ell(x, y, z, [0, 0.62, 0.05], [1.0, 0.6, 0.86]), 0.42);       // the round belly, pear-shaped
  d = smin(d, ell(x, y, z, [-0.47, 1.86, -0.08], [0.2, 0.19, 0.15]), 0.14); // small round ears
  d = smin(d, ell(x, y, z, [0.47, 1.86, -0.08], [0.2, 0.19, 0.15]), 0.14);
  d = smin(d, ell(x, y, z, [-0.38, 0.1, 0.2], [0.26, 0.13, 0.3]), 0.12);    // stubby feet
  d = smin(d, ell(x, y, z, [0.38, 0.1, 0.2], [0.26, 0.13, 0.3]), 0.12);
  d = smin(d, capsule(x, y, z, [-0.84, 1.0, 0.1], [-1.06, 0.58, 0.24], 0.16), 0.07);  // arms hanging down
  d = smin(d, capsule(x, y, z, [0.84, 1.0, 0.1], [1.08, 0.56, 0.22], 0.16), 0.07);
  return d;
}
const CENTER = new THREE.Vector3(0, 0.95, 0.02);

/** Marches in from outside along a ray and returns the outermost surface crossing. */
function surface(o: THREE.Vector3, d: THREE.Vector3, tMax: number, step = 0.015) {
  let t = tMax;
  let prev = sdf(o.x + d.x * t, o.y + d.y * t, o.z + d.z * t);
  for (; t > 0; t -= step) {
    const v = sdf(o.x + d.x * t, o.y + d.y * t, o.z + d.z * t);
    if (v < 0 && prev >= 0) {
      let lo = t, hi = t + step;
      for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2; if (sdf(o.x + d.x * m, o.y + d.y * m, o.z + d.z * m) < 0) lo = m; else hi = m; }
      return (lo + hi) / 2;
    }
    prev = v;
  }
  return 0;
}
function gradient(x: number, y: number, z: number, out: THREE.Vector3) {
  const e = 0.0025;
  return out.set(sdf(x + e, y, z) - sdf(x - e, y, z), sdf(x, y + e, z) - sdf(x, y - e, z), sdf(x, y, z + e) - sdf(x, y, z - e)).normalize();
}
/** Where the skin is when looking straight at it from the front (for laying things on the belly). */
export function frontZ(x: number, y: number) {
  let z = 1.6;
  for (; z > -0.5; z -= 0.01) if (sdf(x, y, z) < 0) break;
  let lo = z, hi = z + 0.01; // lo inside, hi outside
  for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2; if (sdf(x, y, m) < 0) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

/** Bori's colours: the body, and the paler belly patch. */
export type Palette = { body: string; belly: string };
export const DEFAULT_PALETTE: Palette = { body: "#e9e4dc", belly: "#ffffff" }; // rice-cake white

function buildBodyGeometry(pal: Palette) {
  const BODY = new THREE.Color(pal.body), BELLY = new THREE.Color(pal.belly);
  let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, 72);
  g.deleteAttribute("normal"); g.deleteAttribute("uv");
  g = mergeVertices(g);
  const pos = g.getAttribute("position") as THREE.BufferAttribute;
  const n = pos.count;
  const normals = new Float32Array(n * 3), colors = new Float32Array(n * 3);
  const dir = new THREE.Vector3(), p = new THREE.Vector3(), nr = new THREE.Vector3(), col = new THREE.Color();
  for (let i = 0; i < n; i++) {
    dir.fromBufferAttribute(pos, i).normalize();
    const t = surface(CENTER, dir, 2.3);
    p.copy(CENTER).addScaledVector(dir, t);
    pos.setXYZ(i, p.x, p.y, p.z);
    gradient(p.x, p.y, p.z, nr);
    normals.set([nr.x, nr.y, nr.z], i * 3);
    // a paler belly patch, and a little darker towards the feet and the back (a cheap ambient occlusion)
    const oval = 1 - ((p.x / 0.7) ** 2 + ((p.y - 0.6) / 0.48) ** 2);
    const belly = THREE.MathUtils.smoothstep(oval, 0, 0.55) * THREE.MathUtils.smoothstep(nr.z, 0.1, 0.6);
    col.copy(BODY).lerp(BELLY, belly * 0.85);
    const ao = 0.78 + 0.22 * THREE.MathUtils.smoothstep(p.y, 0.0, 0.5);
    col.multiplyScalar(ao);
    colors.set([col.r, col.g, col.b], i * 3);
  }
  g.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return g;
}

/* ---------- the face, painted onto a patch of the skin ---------- */
const FX0 = -0.78, FX1 = 0.78, FY0 = 0.92, FY1 = 1.78; // the face box in body space
const FW = 640, FH = Math.round((FW * (FY1 - FY0)) / (FX1 - FX0));
const X = (x: number) => ((x - FX0) / (FX1 - FX0)) * FW;
const Y = (y: number) => ((FY1 - y) / (FY1 - FY0)) * FH;
const U = (k: number) => (k / (FX1 - FX0)) * FW; // body units to pixels

function buildFacePatch(body: THREE.BufferGeometry) {
  const pos = body.getAttribute("position"), nor = body.getAttribute("normal");
  const idx = body.getIndex()!;
  const keep: number[] = [];
  const ok = (i: number) => nor.getZ(i) > 0.12 && pos.getY(i) > FY0 - 0.05 && pos.getY(i) < FY1 + 0.05 && pos.getX(i) > FX0 - 0.05 && pos.getX(i) < FX1 + 0.05;
  for (let t = 0; t < idx.count; t += 3) {
    const a = idx.getX(t), b = idx.getX(t + 1), c = idx.getX(t + 2);
    if (ok(a) && ok(b) && ok(c)) keep.push(a, b, c);
  }
  const g = new THREE.BufferGeometry();
  const p2 = new Float32Array(pos.count * 3), uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    p2.set([x + nor.getX(i) * 0.002, y + nor.getY(i) * 0.002, z + nor.getZ(i) * 0.002], i * 3);
    uv.set([(x - FX0) / (FX1 - FX0), (y - FY0) / (FY1 - FY0)], i * 2);
  }
  g.setAttribute("position", new THREE.BufferAttribute(p2, 3));
  g.setAttribute("normal", nor.clone());
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setIndex(keep);
  return g;
}

export type FaceState = { face: Face; blink: number; talk: number; look: number };

const INK = "#2b2238";

function bean(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, shine = 1) {
  g.fillStyle = INK; g.beginPath(); g.ellipse(X(x), Y(y), U(rx), U(ry), 0, 0, Math.PI * 2); g.fill();
  if (!shine) return;
  g.fillStyle = "#fff";
  g.beginPath(); g.arc(X(x + rx * 0.32), Y(y + ry * 0.36), U(rx * 0.34 * shine), 0, Math.PI * 2); g.fill();
}
function stroke(g: CanvasRenderingContext2D, w: number, draw: () => void, col = INK) {
  g.strokeStyle = col; g.lineWidth = U(w); g.lineCap = "round"; g.lineJoin = "round";
  g.beginPath(); draw(); g.stroke();
}

/** Draws Bori's face for one moment: small bean eyes, rosy cheeks, a tiny mouth. */
export function paintFace(g: CanvasRenderingContext2D, s: FaceState) {
  g.clearRect(0, 0, FW, FH);
  const happy = s.face === "happy" || s.face === "joy";
  const EY = 1.5, EX = 0.25, MY = 1.36;

  // cheeks
  const blush = s.face === "sad" ? 0.38 : happy ? 0.62 : 0.5;
  for (const side of [-1, 1]) {
    const gx = X(side * 0.44), gy = Y(1.36);
    const gr = g.createRadialGradient(gx, gy, 0, gx, gy, U(0.1));
    gr.addColorStop(0, `rgba(255,135,160,${blush})`); gr.addColorStop(1, "rgba(255,135,160,0)");
    g.fillStyle = gr; g.beginPath(); g.ellipse(gx, gy, U(0.12), U(0.075), 0, 0, Math.PI * 2); g.fill();
  }

  // eyes
  for (const side of [-1, 1]) {
    const cx = side * EX + s.look * 0.008;
    if (happy) {
      // ^ ^
      stroke(g, 0.02, () => { g.moveTo(X(cx - 0.05), Y(EY - 0.01)); g.quadraticCurveTo(X(cx), Y(EY + 0.06), X(cx + 0.05), Y(EY - 0.01)); });
    } else if (s.blink > 0.5) {
      stroke(g, 0.018, () => { g.moveTo(X(cx - 0.045), Y(EY)); g.quadraticCurveTo(X(cx), Y(EY - 0.02), X(cx + 0.045), Y(EY)); });
    } else if (s.face === "sad") {
      // glossy, a bit bigger, with a line of tears along the bottom
      const ry = 0.07 * (1 - s.blink * 0.8);
      bean(g, cx, EY - 0.005, 0.06, ry, 0);
      g.fillStyle = "#fff";
      g.beginPath(); g.arc(X(cx + 0.02), Y(EY + 0.02), U(0.022), 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(X(cx - 0.022), Y(EY - 0.025), U(0.011), 0, Math.PI * 2); g.fill();
      stroke(g, 0.012, () => { g.moveTo(X(cx - 0.06), Y(EY - 0.065)); g.quadraticCurveTo(X(cx), Y(EY - 0.08), X(cx + 0.06), Y(EY - 0.065)); }, "rgba(140,200,255,.95)");
      // worried brows, inner ends up
      stroke(g, 0.014, () => { g.moveTo(X(cx + side * 0.05), Y(EY + 0.1)); g.lineTo(X(cx - side * 0.04), Y(EY + 0.13)); }, "#3d4a78");
    } else {
      const ry = 0.062 * (1 - s.blink * 0.85);
      const up = s.face === "think" ? 0.012 : 0;
      bean(g, cx + (s.face === "think" ? 0.012 : 0), EY + up, 0.05, ry);
      if (s.face === "think" && side === 1) stroke(g, 0.014, () => { g.moveTo(X(cx - 0.045), Y(EY + 0.11)); g.lineTo(X(cx + 0.045), Y(EY + 0.125)); }, "#3d4a78");
    }
  }

  // mouth
  const open = s.face === "joy" ? 1 : s.talk;
  if (open > 0.15) {
    // a small open mouth with a tongue
    const w = 0.04 + open * 0.012, h = 0.022 + open * 0.03;
    g.fillStyle = "#5b2240";
    g.beginPath(); g.ellipse(X(0), Y(MY - h * 0.25), U(w), U(h), 0, 0, Math.PI * 2); g.fill();
    g.save(); g.clip();
    g.fillStyle = "#ff7d93"; g.beginPath(); g.ellipse(X(0), Y(MY - h * 0.95), U(w * 0.75), U(h * 0.55), 0, 0, Math.PI * 2); g.fill();
    g.restore();
    stroke(g, 0.012, () => g.ellipse(X(0), Y(MY - h * 0.25), U(w), U(h), 0, 0, Math.PI * 2));
  } else if (s.face === "sad") {
    // wobbly "uuung"
    stroke(g, 0.016, () => { g.moveTo(X(-0.05), Y(MY - 0.005)); g.bezierCurveTo(X(-0.03), Y(MY + 0.015), X(-0.015), Y(MY - 0.02), X(0), Y(MY)); g.bezierCurveTo(X(0.015), Y(MY + 0.02), X(0.03), Y(MY - 0.02), X(0.05), Y(MY)); });
  } else if (s.face === "think") {
    stroke(g, 0.016, () => { g.moveTo(X(-0.035), Y(MY)); g.lineTo(X(0.04), Y(MY + 0.012)); });
  } else {
    // ω
    const k = happy ? 1.25 : 1;
    stroke(g, 0.016, () => { g.moveTo(X(-0.05 * k), Y(MY)); g.quadraticCurveTo(X(-0.025 * k), Y(MY - 0.04 * k), X(0), Y(MY - 0.005)); g.quadraticCurveTo(X(0.025 * k), Y(MY - 0.04 * k), X(0.05 * k), Y(MY)); });
  }
}

export type Bori = ReturnType<typeof buildBori>;

export function buildBori(pal: Palette = DEFAULT_PALETTE) {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group(); // squashes and sways
  root.add(bodyGroup);

  const geo = buildBodyGeometry(pal);
  const skin = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, sheen: 0.35, sheenRoughness: 0.6, sheenColor: new THREE.Color(pal.belly), clearcoat: 0.1, clearcoatRoughness: 0.5 });
  const body = new THREE.Mesh(geo, skin);
  body.castShadow = true; body.receiveShadow = true;
  bodyGroup.add(body);

  const faceCanvas = document.createElement("canvas");
  faceCanvas.width = FW; faceCanvas.height = FH;
  const faceCtx = faceCanvas.getContext("2d")!;
  const faceTex = new THREE.CanvasTexture(faceCanvas);
  faceTex.colorSpace = THREE.SRGBColorSpace; faceTex.anisotropy = 4;
  const faceMat = new THREE.MeshPhysicalMaterial({ map: faceTex, transparent: true, roughness: 0.45, clearcoat: 0.15, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false });
  const face = new THREE.Mesh(buildFacePatch(geo), faceMat);
  face.renderOrder = 2;
  bodyGroup.add(face);

  let last = "";
  const setFace = (s: FaceState) => {
    const key = `${s.face}|${s.blink.toFixed(2)}|${s.talk.toFixed(2)}|${s.look.toFixed(2)}`;
    if (key === last) return;
    last = key;
    paintFace(faceCtx, s);
    faceTex.needsUpdate = true;
  };
  setFace({ face: "idle", blink: 0, talk: 0, look: 0 });

  return { root, bodyGroup, body, setFace };
}
