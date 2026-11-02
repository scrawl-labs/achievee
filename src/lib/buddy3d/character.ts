/**
 * Bori, an original, slightly tired office-worker creature: one soft sculpted body (built from a signed distance
 * field and shrink-wrapped into a single smooth mesh), a face painted onto the surface so it can change expression,
 * a loosened polka-dot tie, a shirt collar and a briefcase.
 */
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

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

const BODY = new THREE.Color("#6f93c9");
const BELLY = new THREE.Color("#b9cbe6");

function buildBodyGeometry() {
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
const FW = 1024, FH = Math.round((FW * (FY1 - FY0)) / (FX1 - FX0));
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
function lidPath(g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, close: number, tilt: number, side: number) {
  // the upper lid is a straight-ish line that comes down over the eye; `close` 0 = wide open, 1 = shut
  const top = cy - ry, bottom = cy + ry;
  const ly = top + (bottom - top) * close;
  const tl = tilt * side * ry * 0.6;
  return { inner: ly - tl, outer: ly + tl };
}

/** Draws Bori's face for one moment into the canvas. */
export function paintFace(g: CanvasRenderingContext2D, s: FaceState) {
  g.clearRect(0, 0, FW, FH);
  g.lineCap = "round"; g.lineJoin = "round";
  const happy = s.face === "happy" || s.face === "joy";
  const eyeY = 1.52, eyeX = 0.3;

  // cheeks
  const blush = s.face === "sad" ? 0.12 : happy ? 0.45 : 0.22;
  for (const side of [-1, 1]) {
    const gx = X(side * 0.5), gy = Y(1.33);
    const gr = g.createRadialGradient(gx, gy, 0, gx, gy, U(0.14));
    gr.addColorStop(0, `rgba(255,140,160,${blush})`); gr.addColorStop(1, "rgba(255,140,160,0)");
    g.fillStyle = gr; g.beginPath(); g.ellipse(gx, gy, U(0.16), U(0.11), 0, 0, Math.PI * 2); g.fill();
  }

  for (const side of [-1, 1]) {
    const cx = X(side * eyeX), cy = Y(eyeY);
    const rx = U(0.15), ry = U(0.11);
    if (happy) {
      // happy: closed, upward-curving eyes
      g.strokeStyle = INK; g.lineWidth = U(0.03);
      g.beginPath(); g.moveTo(cx - rx * 0.9, cy + ry * 0.35); g.quadraticCurveTo(cx, cy - ry * 1.15, cx + rx * 0.9, cy + ry * 0.35); g.stroke();
      continue;
    }
    // how far the lid is down: tired by default
    const base = s.face === "sad" ? 0.3 : s.face === "think" ? (side === 1 ? 0.25 : 0.42) : 0.44;
    const close = Math.min(1, base + (1 - base) * s.blink);
    const tilt = s.face === "sad" ? -0.55 : s.face === "think" && side === 1 ? 0.3 : 0.25;
    const { inner, outer } = lidPath(g, cx, cy, rx, ry, close, tilt, side);
    const innerX = cx - side * rx * 1.1, outerX = cx + side * rx * 1.1;
    // eye white, only below the lid line (the skin itself is the lid)
    g.save();
    g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.clip();
    g.beginPath(); g.moveTo(innerX, inner); g.lineTo(outerX, outer); g.lineTo(outerX, cy + ry * 2); g.lineTo(innerX, cy + ry * 2); g.closePath(); g.clip();
    const wg = g.createLinearGradient(0, cy - ry, 0, cy + ry);
    wg.addColorStop(0, "#dfe3ef"); wg.addColorStop(1, "#ffffff");
    g.fillStyle = wg; g.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
    // pupil: small, a little low, slightly looking sideways
    const pxo = cx + (s.face === "think" ? U(0.035) : U(0.012) * -side) + s.look * U(0.02);
    const pyo = cy + ry * (s.face === "think" ? -0.05 : 0.22);
    const pr = s.face === "sad" ? 1.35 : 1;
    g.fillStyle = INK; g.beginPath(); g.ellipse(pxo, pyo, U(0.048) * pr, U(0.054) * pr, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#fff"; g.beginPath(); g.arc(pxo + U(0.015), pyo - U(0.02), U(0.014), 0, Math.PI * 2); g.fill();
    if (s.face === "sad") { g.beginPath(); g.arc(pxo + U(0.02), pyo - U(0.026), U(0.02), 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(pxo - U(0.022), pyo + U(0.024), U(0.01), 0, Math.PI * 2); g.fill(); }
    // a soft shadow under the lid
    g.strokeStyle = "rgba(60,50,90,.28)"; g.lineWidth = U(0.03);
    g.beginPath(); g.moveTo(innerX, inner); g.lineTo(outerX, outer); g.stroke();
    g.restore();
    // eye outline and the lid line
    g.strokeStyle = INK; g.lineWidth = U(0.016);
    g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, Math.asin(Math.max(-1, Math.min(1, (Math.max(inner, outer) - cy) / ry))), Math.PI - Math.asin(Math.max(-1, Math.min(1, (Math.max(inner, outer) - cy) / ry)))); g.stroke();
    g.lineWidth = U(0.024);
    g.beginPath(); g.moveTo(innerX + side * rx * 0.12, inner); g.lineTo(outerX - side * rx * 0.05, outer); g.stroke();
    // tired bags under the eyes
    g.strokeStyle = "rgba(70,60,120,.35)"; g.lineWidth = U(0.012);
    g.beginPath(); g.ellipse(cx, cy + ry * 0.55, rx * 0.8, ry * 0.85, 0, Math.PI * 0.2, Math.PI * 0.8); g.stroke();
    // brows for worried / thinking
    if (s.face === "sad" || s.face === "think") {
      g.strokeStyle = "#3d4a78"; g.lineWidth = U(0.026);
      if (s.face === "sad") {
        // worried: the inner ends go up
        g.beginPath(); g.moveTo(cx - side * rx * 0.75, cy - ry * 2.05); g.quadraticCurveTo(cx - side * rx * 0.1, cy - ry * 1.55, cx + side * rx * 0.85, cy - ry * 1.25); g.stroke();
      } else {
        const lift = side === 1 ? ry * 0.6 : 0;
        g.beginPath(); g.moveTo(cx - rx * 0.8, cy - ry * 1.45 - lift); g.quadraticCurveTo(cx, cy - ry * 1.8 - lift, cx + rx * 0.8, cy - ry * 1.5 - lift); g.stroke();
      }
    }
  }

  // the mouth
  const mx = X(0), my = Y(1.28);
  const mw = U(s.face === "joy" ? 0.36 : 0.32), mh = U(0.085);
  const open = s.face === "joy" ? 1 : happy ? 0.7 : s.talk;
  g.lineWidth = U(0.016); g.strokeStyle = INK;
  if (s.face === "sad" && open < 0.2) {
    // a small wobbly frown
    g.lineWidth = U(0.02);
    g.beginPath(); g.moveTo(mx - mw * 0.35, my + mh * 0.5); g.bezierCurveTo(mx - mw * 0.15, my - mh * 0.2, mx + mw * 0.15, my - mh * 0.2, mx + mw * 0.35, my + mh * 0.5); g.stroke();
    return;
  }
  if (s.face === "think" && open < 0.2) {
    g.lineWidth = U(0.02);
    g.beginPath(); g.moveTo(mx - mw * 0.3, my); g.quadraticCurveTo(mx, my + mh * 0.15, mx + mw * 0.35, my - mh * 0.25); g.stroke();
    return;
  }
  // the gritted-teeth grimace; when talking or happy the jaw opens
  const h = mh * (1 + open * (happy ? 0.9 : 1.2));
  const top = my - mh / 2 - (happy ? mh * 0.2 : 0);
  const smile = happy ? mh * 0.9 : -mh * 0.12;
  const shape = () => {
    g.beginPath();
    g.moveTo(mx - mw / 2, top + (happy ? 0 : mh * 0.1));
    g.bezierCurveTo(mx - mw / 4, top - smile * 0.3, mx + mw / 4, top - smile * 0.3, mx + mw / 2, top + (happy ? 0 : mh * 0.1));
    g.bezierCurveTo(mx + mw / 2 + mh * 0.25, top + h * 0.5, mx + mw / 2, top + h + smile * 0.4, mx + mw * 0.35, top + h + smile * 0.5);
    g.bezierCurveTo(mx, top + h + smile, mx, top + h + smile, mx - mw * 0.35, top + h + smile * 0.5);
    g.bezierCurveTo(mx - mw / 2, top + h + smile * 0.4, mx - mw / 2 - mh * 0.25, top + h * 0.5, mx - mw / 2, top + (happy ? 0 : mh * 0.1));
    g.closePath();
  };
  shape();
  g.fillStyle = "#5b2240"; g.fill();
  g.save(); shape(); g.clip();
  // tongue
  if (open > 0.25) { g.fillStyle = "#ff7d93"; g.beginPath(); g.ellipse(mx, top + h + smile * 0.6, mw * 0.28, h * 0.42, 0, 0, Math.PI * 2); g.fill(); }
  // teeth: top row, and the bottom row when the jaw is closed
  const teeth = (y0: number, y1: number, n: number) => {
    g.fillStyle = "#fffdf6"; g.fillRect(mx - mw, y0, mw * 2, y1 - y0);
    g.strokeStyle = "rgba(90,70,110,.55)"; g.lineWidth = U(0.007);
    for (let i = 1; i < n; i++) { const x = mx - mw / 2 + (mw * i) / n; g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y1); g.stroke(); }
  };
  const gap = h - mh;
  teeth(top - mh, top + mh * 0.5 + (happy ? mh * 0.2 : 0), happy ? 6 : 7);
  if (!happy) teeth(top + mh * 0.5 + gap, top + h + mh, 7);
  g.restore();
  shape(); g.strokeStyle = INK; g.lineWidth = U(0.017); g.stroke();
  if (!happy && open < 0.15) { g.strokeStyle = "rgba(90,70,110,.7)"; g.lineWidth = U(0.008); g.beginPath(); g.moveTo(mx - mw / 2 + U(0.01), top + mh * 0.52); g.lineTo(mx + mw / 2 - U(0.01), top + mh * 0.52); g.stroke(); }
}

/* ---------- tie, collar, briefcase ---------- */
function dotsTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#33416e"; g.fillRect(0, 0, 128, 128);
  g.fillStyle = "#f08a4b";
  for (const [x, y] of [[32, 32], [96, 96]] as const) { g.beginPath(); g.arc(x, y, 15, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(7, 7); t.anisotropy = 4;
  return t;
}

/** Bends a flat (x, y) piece onto the front of the body, `lift` above the skin. */
function conform(geo: THREE.BufferGeometry, baseY: number, lift: number, curl = 0) {
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i) + baseY, z = pos.getZ(i);
    const fz = frontZ(x, y);
    pos.setXYZ(i, x, y, fz + lift + z + curl * (baseY - y) * (baseY - y));
  }
  const merged = mergeVertices(geo, 1e-4);
  merged.computeVertexNormals();
  return merged;
}

function buildTie(mat: THREE.Material, knotMat: THREE.Material) {
  const blade = new THREE.Shape();
  blade.moveTo(-0.055, 0); blade.lineTo(0.055, 0); blade.lineTo(0.13, -0.5); blade.lineTo(0, -0.63); blade.lineTo(-0.13, -0.5); blade.closePath();
  const bg = new THREE.ExtrudeGeometry(blade, { depth: 0.015, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 4, steps: 1 });
  // subdivide by re-sampling along y so it can bend over the belly
  const tie = new THREE.Group();
  const bladeMesh = new THREE.Mesh(conform(tessellate(bg, 0.03), 1.04, 0.015), mat);
  const knot = new THREE.Shape();
  knot.moveTo(-0.085, 0.05); knot.lineTo(0.085, 0.05); knot.lineTo(0.055, -0.07); knot.lineTo(-0.055, -0.07); knot.closePath();
  const kg = new THREE.ExtrudeGeometry(knot, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.015, bevelSegments: 3, curveSegments: 4 });
  const knotMesh = new THREE.Mesh(conform(tessellate(kg, 0.03), 1.04, 0.03), knotMat);
  bladeMesh.castShadow = knotMesh.castShadow = true;
  tie.add(bladeMesh, knotMesh);
  return tie;
}
/** Splits long triangles so a flat piece can follow a curved surface. */
function tessellate(geo: THREE.BufferGeometry, maxEdge: number) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  for (let pass = 0; pass < 6; pass++) {
    const p = g.getAttribute("position"), uv = g.getAttribute("uv");
    const P: number[] = [], T: number[] = [];
    let split = false;
    const v = (i: number) => new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i));
    const w = (i: number) => new THREE.Vector2(uv.getX(i), uv.getY(i));
    for (let i = 0; i < p.count; i += 3) {
      const a = v(i), b = v(i + 1), c = v(i + 2), ta = w(i), tb = w(i + 1), tc = w(i + 2);
      const ab = a.distanceTo(b), bc = b.distanceTo(c), ca = c.distanceTo(a);
      const m = Math.max(ab, bc, ca);
      const push = (...vs: [THREE.Vector3, THREE.Vector2][]) => vs.forEach(([q, t]) => { P.push(q.x, q.y, q.z); T.push(t.x, t.y); });
      if (m <= maxEdge) { push([a, ta], [b, tb], [c, tc]); continue; }
      split = true;
      if (m === ab) { const d = a.clone().lerp(b, 0.5), td = ta.clone().lerp(tb, 0.5); push([a, ta], [d, td], [c, tc], [d, td], [b, tb], [c, tc]); }
      else if (m === bc) { const d = b.clone().lerp(c, 0.5), td = tb.clone().lerp(tc, 0.5); push([a, ta], [b, tb], [d, td], [a, ta], [d, td], [c, tc]); }
      else { const d = c.clone().lerp(a, 0.5), td = tc.clone().lerp(ta, 0.5); push([a, ta], [b, tb], [d, td], [d, td], [b, tb], [c, tc]); }
    }
    g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(T, 2));
    if (!split) break;
  }
  return g;
}

function buildCollar(mat: THREE.Material) {
  const group = new THREE.Group();
  for (const side of [-1, 1]) {
    const s = new THREE.Shape();
    s.moveTo(0, 0.06); s.lineTo(side * 0.2, 0.08); s.lineTo(side * 0.13, -0.1); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.01, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2 });
    const m = new THREE.Mesh(conform(tessellate(g, 0.03), 1.04, 0.012), mat);
    m.castShadow = true;
    group.add(m);
  }
  return group;
}

function buildBriefcase() {
  const leather = new THREE.MeshPhysicalMaterial({ color: "#c9772f", roughness: 0.45, clearcoat: 0.35, clearcoatRoughness: 0.4, sheen: 0.3 });
  const dark = new THREE.MeshPhysicalMaterial({ color: "#7a431a", roughness: 0.55 });
  const metal = new THREE.MeshStandardMaterial({ color: "#e8c46a", roughness: 0.25, metalness: 1 });
  const g = new THREE.Group();
  const box = new THREE.Mesh(new RoundedBoxGeometry(0.6, 0.42, 0.17, 5, 0.05), leather);
  box.position.y = -0.3; box.castShadow = true;
  const flap = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.12, 0.18, 4, 0.04), leather);
  flap.position.y = -0.13; flap.castShadow = true;
  const seam = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.012, 0.182), dark);
  seam.position.y = -0.19;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.022, 12, 24, Math.PI), dark);
  handle.position.y = -0.07; handle.castShadow = true;
  g.add(box, flap, seam, handle);
  for (const s of [-1, 1]) {
    const clasp = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.06, 0.03, 2, 0.01), metal);
    clasp.position.set(s * 0.17, -0.18, 0.095);
    g.add(clasp);
  }
  return g;
}

export type Bori = ReturnType<typeof buildBori>;

export function buildBori() {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group(); // squashes and sways
  root.add(bodyGroup);

  const geo = buildBodyGeometry();
  const skin = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, sheen: 0.35, sheenRoughness: 0.6, sheenColor: new THREE.Color("#a9c2ec"), clearcoat: 0.1, clearcoatRoughness: 0.5 });
  const body = new THREE.Mesh(geo, skin);
  body.castShadow = true; body.receiveShadow = true;
  bodyGroup.add(body);

  const faceCanvas = document.createElement("canvas");
  faceCanvas.width = FW; faceCanvas.height = FH;
  const faceCtx = faceCanvas.getContext("2d")!;
  const faceTex = new THREE.CanvasTexture(faceCanvas);
  faceTex.colorSpace = THREE.SRGBColorSpace; faceTex.anisotropy = 8;
  const faceMat = new THREE.MeshPhysicalMaterial({ map: faceTex, transparent: true, roughness: 0.45, clearcoat: 0.15, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false });
  const face = new THREE.Mesh(buildFacePatch(geo), faceMat);
  face.renderOrder = 2;
  bodyGroup.add(face);

  const tieTex = dotsTexture();
  const tieMat = new THREE.MeshPhysicalMaterial({ map: tieTex, roughness: 0.35, sheen: 0.8, sheenColor: new THREE.Color("#8fa4ff"), clearcoat: 0.2 });
  const tie = buildTie(tieMat, tieMat);
  bodyGroup.add(tie);
  const collar = buildCollar(new THREE.MeshPhysicalMaterial({ color: "#fbfbff", roughness: 0.6, sheen: 0.4 }));
  bodyGroup.add(collar);

  // the briefcase hangs from the right hand and swings a little
  const hand = new THREE.Group();
  hand.position.set(1.1, 0.6, 0.26);
  bodyGroup.add(hand);
  const briefcase = buildBriefcase();
  briefcase.rotation.y = -0.25;
  hand.add(briefcase);

  let last = "";
  const setFace = (s: FaceState) => {
    const key = `${s.face}|${s.blink.toFixed(2)}|${s.talk.toFixed(2)}|${s.look.toFixed(2)}`;
    if (key === last) return;
    last = key;
    paintFace(faceCtx, s);
    faceTex.needsUpdate = true;
  };
  setFace({ face: "idle", blink: 0, talk: 0, look: 0 });

  return { root, bodyGroup, body, hand, briefcase, tie, setFace };
}
