"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** Alternative artwork for review; neither concept is mounted in the homepage. */
function useGlow() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 96;
    const context = canvas.getContext("2d")!;
    const gradient = context.createRadialGradient(48, 48, 0, 48, 48, 48);
    gradient.addColorStop(0, "#fff");
    gradient.addColorStop(0.1, "rgba(255,255,255,.9)");
    gradient.addColorStop(0.3, "rgba(255,255,255,.18)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 96, 96);
    return new THREE.CanvasTexture(canvas);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function Beacon({ texture, color = "#ffdf9b", scale = 0.3 }: { texture: THREE.Texture; color?: string; scale?: number }) {
  return <group>
    <mesh><sphereGeometry args={[0.018, 12, 8]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
    <sprite scale={scale}><spriteMaterial map={texture} color={color} transparent depthWrite={false} blending={THREE.AdditiveBlending} /></sprite>
  </group>;
}

function Halo({ radius, tilt, speed, phase, texture, silver = false }: {
  radius: number; tilt: [number, number, number]; speed: number; phase: number; texture: THREE.Texture; silver?: boolean;
}) {
  const spin = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (spin.current) spin.current.rotation.z = clock.elapsedTime * speed + phase; });
  return <group rotation={tilt}>
    <mesh>
      <torusGeometry args={[radius, 0.025, 12, 192]} />
      <meshPhysicalMaterial color={silver ? "#9fb2b7" : "#cda85e"} metalness={0.9} roughness={0.26} clearcoat={0.7} />
    </mesh>
    <mesh><torusGeometry args={[radius + 0.055, 0.003, 6, 192]} /><meshBasicMaterial color={silver ? "#bcdee3" : "#ffe0a0"} transparent opacity={0.5} /></mesh>
    <group ref={spin}>
      <mesh rotation={[0, 0, -0.6]}><torusGeometry args={[radius, 0.028, 10, 48, 0.6]} /><meshBasicMaterial color={silver ? "#c4f3ff" : "#ffdf97"} toneMapped={false} transparent opacity={0.85} /></mesh>
      <group position={[radius, 0, 0]}><Beacon texture={texture} scale={0.38} color={silver ? "#b9eaf1" : "#ffe0a0"} /></group>
      {[0, Math.PI].map(a => <mesh key={a} position={[Math.cos(a) * radius, Math.sin(a) * radius, 0]} rotation={[0, 0, a]}>
        <boxGeometry args={[0.065, 0.1, 0.065]} /><meshStandardMaterial color="#d6b86e" metalness={0.9} roughness={0.22} />
      </mesh>)}
    </group>
  </group>;
}

export function Solaris() {
  const root = useRef<THREE.Group>(null), core = useRef<THREE.Group>(null);
  const texture = useGlow();
  useFrame(({ clock, pointer }, delta) => {
    const t = clock.elapsedTime;
    if (root.current) {
      root.current.rotation.y = THREE.MathUtils.damp(root.current.rotation.y, pointer.x * 0.1, 2, delta);
      root.current.rotation.x = THREE.MathUtils.damp(root.current.rotation.x, pointer.y * 0.07, 2, delta);
      root.current.position.y = Math.sin(t * 0.5) * 0.06;
    }
    if (core.current) { core.current.rotation.y = t * 0.19 + 0.6; core.current.rotation.z = Math.sin(t * 0.25) * 0.12; }
  });
  return <group ref={root}>
    <group ref={core}>
      <mesh scale={[0.86, 1.25, 0.86]}>
        <octahedronGeometry args={[1.05, 0]} />
        <meshPhysicalMaterial color="#e9c778" metalness={0.65} roughness={0.32} clearcoat={0.8} emissive="#7b4c14" emissiveIntensity={0.18} flatShading />
      </mesh>
      <mesh scale={[0.92, 1.34, 0.92]} rotation={[0, Math.PI / 4, 0]}>
        <octahedronGeometry args={[1.05, 0]} /><meshBasicMaterial color="#f4d896" wireframe transparent opacity={0.28} />
      </mesh>
      {[1, -1].map(sign => <group key={sign} position={[0, sign * 1.58, 0]}>
        <mesh scale={[0.11, 0.2, 0.11]}><octahedronGeometry args={[1, 0]} /><meshStandardMaterial color="#e5c889" metalness={0.9} roughness={0.2} /></mesh>
        <sprite scale={0.24}><spriteMaterial map={texture} color="#ffdca0" transparent opacity={0.4} depthWrite={false} blending={THREE.AdditiveBlending} /></sprite>
      </group>)}
    </group>
    <Halo radius={1.56} tilt={[1.14, 0.15, -0.4]} speed={0.3} phase={0.4} texture={texture} />
    <Halo radius={1.84} tilt={[0.3, 0.7, 0.55]} speed={-0.2} phase={3} texture={texture} silver />
    <Halo radius={2.06} tilt={[0.7, -0.3, 1.15]} speed={0.13} phase={4.8} texture={texture} />
    <group rotation={[1.14, 0.15, -0.4]}>
      {Array.from({ length: 48 }, (_, i) => {
        const angle = i / 48 * Math.PI * 2;
        return <mesh key={i} position={[Math.cos(angle) * 1.68, Math.sin(angle) * 1.68, 0]} rotation={[0, 0, angle]}>
          <boxGeometry args={[i % 4 === 0 ? 0.07 : 0.025, 0.008, 0.008]} /><meshBasicMaterial color="#cfaf69" transparent opacity={0.45} />
        </mesh>;
      })}
    </group>
  </group>;
}

function NetworkShell({ texture }: { texture: THREE.Texture }) {
  const { edges, points, colors } = useMemo(() => {
    const geometry = new THREE.IcosahedronGeometry(1.38, 4);
    const edgeGeometry = new THREE.EdgesGeometry(geometry, 1);
    const edges = new Float32Array(edgeGeometry.attributes.position.array);
    const seen = new Set<string>(), coordinates: number[] = [], shades: number[] = [];
    const color = new THREE.Color();
    for (let i = 0; i < geometry.attributes.position.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(geometry.attributes.position, i);
      const key = v.toArray().map(n => n.toFixed(4)).join(",");
      if (seen.has(key)) continue;
      seen.add(key); coordinates.push(...v.toArray());
      color.set(seen.size % 7 === 0 ? "#ffe0a0" : "#8fdfed"); shades.push(color.r, color.g, color.b);
    }
    geometry.dispose(); edgeGeometry.dispose();
    return { edges, points: new Float32Array(coordinates), colors: new Float32Array(shades) };
  }, []);
  return <group>
    <mesh><sphereGeometry args={[1.285, 64, 48]} /><meshStandardMaterial color="#07191d" metalness={0.6} roughness={0.6} /></mesh>
    <lineSegments><bufferGeometry><bufferAttribute attach="attributes-position" args={[edges, 3]} /></bufferGeometry><lineBasicMaterial color="#65bdcc" transparent opacity={0.35} depthWrite={false} /></lineSegments>
    <points><bufferGeometry><bufferAttribute attach="attributes-position" args={[points, 3]} /><bufferAttribute attach="attributes-color" args={[colors, 3]} /></bufferGeometry><pointsMaterial map={texture} size={0.07} vertexColors transparent opacity={0.95} depthWrite={false} toneMapped={false} /></points>
  </group>;
}

function Ribbon({ phase, cool = false }: { phase: number; cool?: boolean }) {
  const geometry = useMemo(() => {
    const points = Array.from({ length: 240 }, (_, i) => {
      const t = i / 240 * Math.PI * 2, r = 1.62;
      const latitude = Math.sin(t * 2 + phase) * 0.46;
      return new THREE.Vector3(Math.cos(t) * Math.cos(latitude) * r, Math.sin(latitude) * r, Math.sin(t) * Math.cos(latitude) * r);
    });
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), 256, 0.015, 8, true);
  }, [phase]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry}><meshPhysicalMaterial color={cool ? "#79c5d1" : "#e1b65b"} emissive={cool ? "#31626a" : "#8f5d12"} emissiveIntensity={0.35} metalness={0.65} roughness={0.3} clearcoat={0.8} /></mesh>;
}

export function Nexus() {
  const root = useRef<THREE.Group>(null), shell = useRef<THREE.Group>(null), ribbons = useRef<THREE.Group>(null), scan = useRef<THREE.Mesh>(null), lights = useRef<THREE.Group>(null);
  const texture = useGlow();
  useFrame(({ clock, pointer }, delta) => {
    const t = clock.elapsedTime;
    if (root.current) {
      root.current.rotation.y = THREE.MathUtils.damp(root.current.rotation.y, pointer.x * 0.1, 2, delta);
      root.current.rotation.x = THREE.MathUtils.damp(root.current.rotation.x, pointer.y * 0.07 - 0.12, 2, delta);
      root.current.position.y = Math.sin(t * 0.45) * 0.04;
    }
    if (shell.current) shell.current.rotation.y = t * 0.1;
    if (ribbons.current) ribbons.current.rotation.y = -t * 0.12;
    if (lights.current) lights.current.rotation.z = t * 0.2;
    if (scan.current) { const y = Math.sin(t * 0.6) * 1.25; scan.current.position.y = y; scan.current.scale.setScalar(Math.sqrt(1.38 ** 2 - y ** 2)); }
  });
  return <group ref={root} rotation={[-0.12, 0, -0.15]}>
    <group ref={shell}><NetworkShell texture={texture} /></group>
    <group ref={ribbons} rotation={[0.25, 0, -0.32]}><Ribbon phase={0} /><Ribbon phase={Math.PI} cool /></group>
    <mesh ref={scan} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1, 0.0035, 6, 128]} /><meshBasicMaterial color="#b9f6ff" transparent opacity={0.5} toneMapped={false} /></mesh>
    <group rotation={[0.5, 0.25, 0.45]}>
      <mesh><torusGeometry args={[2.01, 0.0035, 6, 192]} /><meshBasicMaterial color="#cea959" transparent opacity={0.5} /></mesh>
      <group ref={lights}>
        <group position={[2.01, 0, 0]}><Beacon texture={texture} scale={0.38} /></group>
        <group position={[-2.01, 0, 0]}><Beacon texture={texture} color="#a2e9f4" scale={0.3} /></group>
      </group>
    </group>
    <group rotation={[0, 0, -0.15]}>
      {[1, -1].map(sign => <group key={sign} position={[0, sign * 1.8, 0]}>
        <mesh rotation={[0, Math.PI / 4, 0]} scale={[0.07, 0.12, 0.07]}><octahedronGeometry args={[1, 0]} /><meshBasicMaterial color="#cbe4e4" transparent opacity={0.65} /></mesh>
        <sprite scale={0.25}><spriteMaterial map={texture} color="#9adbe7" transparent opacity={0.35} depthWrite={false} blending={THREE.AdditiveBlending} /></sprite>
      </group>)}
    </group>
  </group>;
}
