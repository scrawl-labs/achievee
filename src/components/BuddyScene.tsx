"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { buildBori, prewarmBori, type Face } from "@/lib/buddy3d/character";
import { buildForest } from "@/lib/buddy3d/forest";
import { buildSubway } from "@/lib/buddy3d/subway";
import { buildBusStop } from "@/lib/buddy3d/busstop";
import { buildBeach } from "@/lib/buddy3d/beach";

export type MapId = "forest" | "subway" | "rain" | "beach";
const WORLDS = { forest: buildForest, subway: buildSubway, rain: buildBusStop, beach: buildBeach };

type Props = { map: MapId; face: Face; talking: boolean; beat: number; onFail: () => void; onReady?: () => void };

/** Builds Bori's body in idle time before the scene is opened (call from a launcher once it is on screen). */
export function warmUp() { prewarmBori(); }

function emoteTexture(kind: "note" | "drop" | "q" | "spark") {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.translate(128, 128); g.lineJoin = "round"; g.lineCap = "round";
  const stroke = (p: Path2D) => { g.strokeStyle = "#fff"; g.lineWidth = 16; g.stroke(p); g.fill(p); };
  if (kind === "note") { g.fillStyle = "#ff9a3c"; stroke(new Path2D("M-30 50a26 22 0 1 1 18-21V-60l70-20v100a26 22 0 1 1 18-21V-40l-52 15v75z")); }
  else if (kind === "drop") {
    const gr = g.createLinearGradient(0, -80, 0, 70); gr.addColorStop(0, "#c7e8ff"); gr.addColorStop(1, "#4ea6ea");
    g.fillStyle = gr; stroke(new Path2D("M0-80C34-30 46-4 46 22a46 46 0 0 1-92 0C-46-4-34-30 0-80z"));
    g.fillStyle = "rgba(255,255,255,.85)"; g.beginPath(); g.ellipse(-16, 18, 9, 16, -0.4, 0, Math.PI * 2); g.fill();
  } else if (kind === "q") {
    g.font = "900 190px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.lineWidth = 18; g.strokeStyle = "#fff"; g.strokeText("?", 0, 10); g.fillStyle = "#ff9a3c"; g.fillText("?", 0, 10);
  } else {
    g.fillStyle = "#ffd23f";
    for (const [x, y, s] of [[-14, -6, 84], [62, 56, 38], [-70, 62, 26]]) {
      const p = new Path2D(); p.moveTo(x, y - s);
      p.quadraticCurveTo(x + s * 0.18, y - s * 0.18, x + s, y); p.quadraticCurveTo(x + s * 0.18, y + s * 0.18, x, y + s);
      p.quadraticCurveTo(x - s * 0.18, y + s * 0.18, x - s, y); p.quadraticCurveTo(x - s * 0.18, y - s * 0.18, x, y - s);
      stroke(p);
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** A plain standard material with the same look, for phones. */
function toStandard(m: THREE.MeshPhysicalMaterial) {
  const n = new THREE.MeshStandardMaterial();
  for (const k of ["name", "color", "map", "roughness", "roughnessMap", "metalness", "normalMap", "normalScale", "emissive", "emissiveMap", "emissiveIntensity",
    "vertexColors", "transparent", "opacity", "alphaTest", "side", "depthWrite", "depthTest", "blending", "polygonOffset", "polygonOffsetFactor", "polygonOffsetUnits", "fog"] as const) {
    const v = (m as unknown as Record<string, unknown>)[k];
    const cur = (n as unknown as Record<string, unknown>)[k];
    if (cur && typeof (cur as { copy?: unknown }).copy === "function" && v) (cur as { copy: (x: unknown) => void }).copy(v);
    else (n as unknown as Record<string, unknown>)[k] = v;
  }
  n.onBeforeCompile = m.onBeforeCompile; // the sea's waves live here
  m.dispose();
  return n;
}

const damp = (a: number, b: number, k: number, dt: number) => THREE.MathUtils.lerp(a, b, 1 - Math.exp(-k * dt));

/** The full-screen 3D scene: Bori after work, in one of a few places (a forest, the subway home, a rainy bus stop, the beach). */
export default function BuddyScene({ map, face, talking, beat, onFail, onReady }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const state = useRef({ face, talking, beat });
  state.current = { face, talking, beat };

  useEffect(() => {
    const el = host.current!;
    let renderer: THREE.WebGLRenderer;
    // phones and tablets get a lighter scene (fewer grass blades and raindrops, smaller shadows)
    const lite = window.matchMedia("(pointer: coarse)").matches || (navigator.hardwareConcurrency ?? 8) <= 4;
    // phones draw 30 frames a second at a sharp resolution rather than 60 at a blurry one
    const dprCap = Math.min(window.devicePixelRatio || 1, 1.75);
    const dprMin = Math.min(dprCap, lite ? 1.25 : 1);
    const frameGap = lite ? 1000 / 31 : 0;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" }); }
    catch { onFail(); return; }
    let dpr = dprCap;
    renderer.setPixelRatio(dpr);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const scene = new THREE.Scene();
    const world = WORLDS[map]({ lite });
    scene.background = world.background;
    scene.fog = world.fog;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.25;
    scene.add(world.group);

    const bori = buildBori();
    const S = 0.62; // Bori is small: about the height of a fern, or of a subway seat back
    bori.root.scale.setScalar(S);
    bori.root.position.set(0, 0, 0.35);
    scene.add(bori.root);

    const tex = { note: emoteTexture("note"), drop: emoteTexture("drop"), q: emoteTexture("q"), spark: emoteTexture("spark") };
    const emote = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.note, transparent: true, depthTest: false }));
    emote.renderOrder = 10; emote.scale.setScalar(0);
    emote.position.set(0.5, 1.45, 0.6);
    scene.add(emote);

    // shadows: one size fits all, and they are redrawn every other frame (only Bori and a few small things move)
    scene.traverse((o) => { const l = o as THREE.DirectionalLight; if (l.isLight && l.castShadow && l.shadow) l.shadow.mapSize.set(lite ? 1024 : 1536, lite ? 1024 : 1536); });
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    // phones: plain materials instead of the costlier sheen / clearcoat ones (they look almost the same at this size)
    if (lite) scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
      const swapped = mats.map((mt) => (mt as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial ? toStandard(mt as THREE.MeshPhysicalMaterial) : mt);
      if (mats.length) mesh.material = Array.isArray(mesh.material) ? swapped : swapped[0];
    });

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
    const target = new THREE.Vector3(0.1, 0.95, 0.35);
    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h, false);
      const aspect = w / h;
      camera.aspect = aspect;
      // Bori fills a set share of the screen height and sits in the upper part, clear of the dialogue box
      const share = aspect < 0.8 ? 0.3 : 0.38;
      const tan = 2 * Math.tan(THREE.MathUtils.degToRad(15));
      // fit by height, and on narrow screens also by width (Bori, arms included, is about 2.2 wide)
      const dist = Math.max((2.3 * S) / share / tan, (2.2 * S) / 0.62 / (tan * aspect));
      camera.position.set(0.35, 1.2, 0.35 + dist);
      camera.lookAt(target);
      camera.setViewOffset(w, h, 0, h * (aspect < 0.8 ? 0.17 : 0.12), w, h);
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const clock = new THREE.Clock();
    let lastBeat = state.current.beat, hopT = 9, emoteT = 9, lastEmote = "";
    let nextBlink = 1.5, blinkT = 9, talk = 0;
    let raf = 0, running = true, frames = 0, lastDraw = 0;
    // keep it smooth: if frames run slow, render at a lower resolution; if there is room again, go back up
    let slowSum = 0, slowN = 0, calmUntil = 2;
    const goal = lite ? 1 / 30 : 1 / 60; // seconds per frame we aim for
    const adapt = (dt: number, t: number) => {
      if (t < calmUntil) return;
      slowSum += dt; slowN++;
      if (slowN < 45) return;
      const avg = slowSum / slowN; slowSum = 0; slowN = 0;
      const next = avg > goal * 1.35 ? Math.max(dprMin, dpr - 0.25) : avg < goal * 1.08 ? Math.min(dprCap, dpr + 0.25) : dpr;
      if (next !== dpr) { dpr = next; renderer.setPixelRatio(dpr); resize(); calmUntil = t + 1.5; }
    };

    const frame = () => {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      const now = performance.now();
      if (frameGap && now - lastDraw < frameGap) return;
      lastDraw = now;
      const dt = Math.min(clock.getDelta(), 0.1);
      const t = clock.elapsedTime;
      const st = state.current;
      const m = reduce ? 0 : 1;

      if (st.beat !== lastBeat) { lastBeat = st.beat; hopT = 0; }
      hopT += dt;

      // a light breeze: Bori rocks a tiny bit
      const sway = Math.sin(t * 0.8) * 0.005 * m;

      // Bori: breathing, a little hop on each new line
      const h = hopT < 0.5 ? hopT / 0.5 : 1;
      const jump = h < 1 ? Math.sin(h * Math.PI) * 0.08 * m : 0;
      const squash = h < 1 ? 1 - Math.sin(h * Math.PI * 2) * 0.05 * m : 1;
      const breathe = Math.sin(t * 1.9) * 0.012 * m;
      bori.root.position.y = jump;
      bori.bodyGroup.scale.set(1 + (1 - squash) * 0.5 - breathe * 0.4, squash + breathe, 1 + (1 - squash) * 0.5 - breathe * 0.4);
      bori.root.rotation.z = sway * 0.8;
      const lean = st.face === "think" ? 0.07 : st.face === "sad" ? -0.03 : 0;
      bori.bodyGroup.rotation.z = damp(bori.bodyGroup.rotation.z, lean, 4, dt);
      bori.bodyGroup.rotation.x = damp(bori.bodyGroup.rotation.x, st.face === "sad" ? 0.06 : 0, 4, dt);
      bori.root.rotation.y = Math.sin(t * 0.5) * 0.06 * m - 0.1;

      // face
      if (t > nextBlink) { blinkT = 0; nextBlink = t + 2.2 + Math.random() * 3.5; }
      blinkT += dt;
      const blink = blinkT < 0.16 ? Math.sin((blinkT / 0.16) * Math.PI) : 0;
      talk = damp(talk, st.talking && !reduce ? 0.35 + 0.65 * Math.abs(Math.sin(t * 15)) : 0, 22, dt);
      bori.setFace({ face: st.face, blink: Math.round(blink * 4) / 4, talk: Math.round(talk * 5) / 5, look: Math.round(Math.sin(t * 0.4) * 2) / 2 });

      // emote above the head
      const kind = st.face === "happy" ? "note" : st.face === "sad" ? "drop" : st.face === "think" ? "q" : st.face === "joy" ? "spark" : "";
      if (kind + st.beat !== lastEmote) { lastEmote = kind + st.beat; emoteT = 0; if (kind) { emote.material.map = tex[kind as keyof typeof tex]; emote.material.needsUpdate = true; } }
      emoteT += dt;
      const pop = kind ? Math.min(1, emoteT / 0.35) : 0;
      emote.scale.setScalar(0.3 * pop * (pop < 1 ? 1 + Math.sin(pop * Math.PI) * 0.35 : 1));
      emote.position.y = 1.48 + jump + Math.sin(t * 2.5) * 0.02 * m;

      // the world outside and the straps
      world.update(t, dt, m);
      camera.position.y = 1.2 + Math.sin(t * 0.3) * 0.02 * m;
      camera.position.x = 0.35 + Math.sin(t * 0.17) * 0.08 * m;
      camera.lookAt(target);

      // shadows: every other frame on computers; on phones only while Bori hops (the rest of the scene stands still)
      frames++;
      if (lite ? hopT < 0.7 : frames % 2 === 0) renderer.shadowMap.needsUpdate = true;
      adapt(dt, t);
      renderer.render(scene, camera);
    };
    // prepare every material on the graphics card first, so the first seconds don't stutter; then start and say so
    let started = false;
    const begin = () => {
      if (started || !running) return;
      started = true;
      frame();
      onReady?.();
    };
    // wait two frames so the loading screen is on screen, then compile everything in one go and draw
    let warm = requestAnimationFrame(() => {
      warm = requestAnimationFrame(() => {
        try { renderer.compile(scene, camera); } catch { /* compiling on first draw instead */ }
        begin();
      });
    });
    const fallback = window.setTimeout(begin, 8000); // never wait forever

    const onVis = () => {
      if (document.hidden) { running = false; cancelAnimationFrame(raf); }
      else if (!running) { running = true; clock.getDelta(); frame(); }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      running = false; cancelAnimationFrame(raf); cancelAnimationFrame(warm); window.clearTimeout(fallback);
      document.removeEventListener("visibilitychange", onVis);
      ro.disconnect();
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry && !mesh.geometry.userData.shared) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((x) => { (x as THREE.MeshStandardMaterial).map?.dispose(); x.dispose(); });
      });
      Object.values(tex).forEach((x) => x.dispose());
      env.dispose(); pmrem.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
    // built once; later prop changes reach the loop through `state`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={host} className="bdg-canvas" aria-hidden="true" />;
}
