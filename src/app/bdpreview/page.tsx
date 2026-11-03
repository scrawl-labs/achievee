"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { buildBori } from "@/lib/buddy3d/character";
export default function P() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setSize(512, 512); r.toneMapping = THREE.NeutralToneMapping;
    ref.current!.appendChild(r.domElement);
    const scene = new THREE.Scene();
    scene.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.35;
    const key = new THREE.DirectionalLight("#fff4e6", 2.2); key.position.set(2, 4, 4); scene.add(key);
    const rim = new THREE.DirectionalLight("#8fb0ff", 1.6); rim.position.set(-3, 3, -3); scene.add(rim);
    scene.add(new THREE.HemisphereLight("#fff", "#443", 0.5));
    const b = buildBori(); scene.add(b.root);
    b.setFace({ face: "idle", blink: 0, talk: 0, look: 0 });
    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50); cam.position.set(0.3, 1.2, 5.6); cam.lookAt(0, 1.0, 0);
    r.render(scene, cam);
    (window as unknown as { done: boolean }).done = true;
  }, []);
  return <div ref={ref} />;
}
