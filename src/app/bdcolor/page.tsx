"use client";
// Temporary preview: Bori in several colours. Not part of the app.
import { useEffect, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { buildBori, type Palette } from "@/lib/buddy3d/character";

const OPTIONS: [string, Palette][] = [
  ["지금 · 하늘색", { body: "#6f93c9", belly: "#b9cbe6" }],
  ["민트", { body: "#7cc4ad", belly: "#d6f0e5" }],
  ["복숭아", { body: "#f2a48f", belly: "#fde4d8" }],
  ["버터 노랑", { body: "#f0cc6a", belly: "#fff2c9" }],
  ["라벤더", { body: "#a797d8", belly: "#e6def7" }],
  ["찹쌀떡 흰색", { body: "#e9e4dc", belly: "#ffffff" }],
  ["곰 갈색", { body: "#b88a62", belly: "#ecd7bf" }],
  ["먹색 회색", { body: "#73778a", belly: "#bfc2cc" }],
];

export default function P() {
  const [shots, setShots] = useState<[string, string][]>([]);
  useEffect(() => {
    const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    r.setSize(420, 420); r.toneMapping = THREE.NeutralToneMapping; r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene(); scene.background = new THREE.Color("#f1ece4");
    scene.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.35;
    const key = new THREE.DirectionalLight("#fff4e6", 2.2); key.position.set(2, 4, 4); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); scene.add(key);
    const rim = new THREE.DirectionalLight("#ffffff", 1.0); rim.position.set(-3, 3, -3); scene.add(rim);
    scene.add(new THREE.HemisphereLight("#fff", "#b8a890", 0.6));
    const fl = new THREE.Mesh(new THREE.CircleGeometry(3, 64), new THREE.ShadowMaterial({ opacity: 0.18 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; scene.add(fl);
    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50); cam.position.set(0.4, 1.25, 5.4); cam.lookAt(0.05, 1.0, 0);
    const out: [string, string][] = [];
    for (const [label, pal] of OPTIONS) {
      const b = buildBori(pal); b.setFace({ face: "happy", blink: 0, talk: 0, look: 0 });
      scene.add(b.root); r.render(scene, cam); out.push([label, r.domElement.toDataURL("image/png")]); scene.remove(b.root);
    }
    setShots(out);
    (window as unknown as { done: boolean }).done = true;
  }, []);
  return (
    <main style={{ background: "#16171f", padding: 16, display: "grid", gridTemplateColumns: "repeat(4, 220px)", gap: 12 }}>
      {shots.map(([l, src]) => (
        <figure key={l} style={{ margin: 0 }}>
          <img src={src} width={220} height={220} alt="" style={{ borderRadius: 14, display: "block" }} />
          <figcaption style={{ color: "#eee", font: "600 14px system-ui", marginTop: 6 }}>{l}</figcaption>
        </figure>
      ))}
    </main>
  );
}
