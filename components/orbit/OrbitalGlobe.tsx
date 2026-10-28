"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import land from "@/lib/orbital-land.json";

const GOLD = new THREE.Color("#d8b66a"), IVORY = new THREE.Color("#ffedc3"), RADIUS = 1.32;
function position(lat: number, lon: number, radius = RADIUS + 0.025) {
  const p = THREE.MathUtils.degToRad(lat), t = THREE.MathUtils.degToRad(lon);
  return new THREE.Vector3(Math.cos(p) * Math.sin(t), Math.sin(p), Math.cos(p) * Math.cos(t)).multiplyScalar(radius);
}
function glowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 96;
  const ctx = canvas.getContext("2d")!, glow = ctx.createRadialGradient(48, 48, 0, 48, 48, 48);
  glow.addColorStop(0, "rgba(255,255,255,1)"); glow.addColorStop(0.09, "rgba(255,255,255,.9)");
  glow.addColorStop(0.26, "rgba(255,255,255,.24)"); glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 96, 96);
  return new THREE.CanvasTexture(canvas);
}
function Atmosphere() {
  const uniforms = useMemo(() => ({ tint: { value: new THREE.Color("#a0d8df") } }), []);
  return <mesh scale={1.022}>
    <sphereGeometry args={[RADIUS, 80, 56]} />
    <shaderMaterial transparent depthWrite={false} blending={THREE.AdditiveBlending} uniforms={uniforms}
      vertexShader={`varying vec3 n; varying vec3 v; void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=-p.xyz;gl_Position=projectionMatrix*p;}`}
      fragmentShader={`uniform vec3 tint; varying vec3 n; varying vec3 v; void main(){float rim=pow(1.-max(dot(normalize(n),normalize(v)),0.),3.8);gl_FragColor=vec4(tint,rim*.35);}`} />
  </mesh>;
}
function MeridianGrid() {
  const points = useMemo(() => {
    const out: number[] = [], r = RADIUS + 0.008;
    const segment = (a: THREE.Vector3, b: THREE.Vector3) => out.push(...a.toArray(), ...b.toArray());
    for (let lon = -180; lon < 180; lon += 30) for (let i = 0; i < 90; i++) segment(position(-90 + i * 2, lon, r), position(-88 + i * 2, lon, r));
    for (let lat = -60; lat <= 60; lat += 30) for (let i = 0; i < 180; i++) segment(position(lat, i * 2, r), position(lat, i * 2 + 2, r));
    return new Float32Array(out);
  }, []);
  return <lineSegments>
    <bufferGeometry><bufferAttribute attach="attributes-position" args={[points, 3]} /></bufferGeometry>
    <lineBasicMaterial color="#9b986e" transparent opacity={0.12} depthWrite={false} />
  </lineSegments>;
}
function LandLights() {
  const { points, colors } = useMemo(() => {
    const points = new Float32Array(land.length), colors = new Float32Array(land.length), c = new THREE.Color();
    for (let i = 0; i < land.length; i += 3) {
      points[i] = land[i] * (RADIUS + 0.014); points[i + 1] = land[i + 1] * (RADIUS + 0.014); points[i + 2] = land[i + 2] * (RADIUS + 0.014);
      c.copy(GOLD).lerp(IVORY, ((i * 73) % 211) / 280); c.toArray(colors, i);
    }
    return { points, colors };
  }, []);
  return <points>
    <bufferGeometry><bufferAttribute attach="attributes-position" args={[points, 3]} /><bufferAttribute attach="attributes-color" args={[colors, 3]} /></bufferGeometry>
    <pointsMaterial size={0.017} vertexColors transparent opacity={0.95} sizeAttenuation depthWrite={false} />
  </points>;
}
const HUBS = [[51.5, -0.1], [40.7, -74], [1.3, 103.8], [35.7, 139.7], [25.2, 55.3], [-33.9, 151.2], [-23.6, -46.6]];
function SurfaceArcs({ glow }: { glow: THREE.Texture }) {
  const points = useMemo(() => {
    const out: number[] = [];
    for (const [a, b] of [[0, 1], [0, 4], [0, 6], [4, 2], [2, 3], [2, 5]]) {
      const start = position(HUBS[a][0], HUBS[a][1], 1), end = position(HUBS[b][0], HUBS[b][1], 1);
      const angle = start.angleTo(end), sine = Math.sin(angle);
      const point = (t: number) => start.clone().multiplyScalar(Math.sin((1 - t) * angle) / sine).addScaledVector(end, Math.sin(t * angle) / sine).multiplyScalar(RADIUS + 0.035 + Math.sin(t * Math.PI) * 0.18);
      for (let i = 0; i < 64; i++) out.push(...point(i / 64).toArray(), ...point((i + 1) / 64).toArray());
    }
    return new Float32Array(out);
  }, []);
  return <group>
    <lineSegments><bufferGeometry><bufferAttribute attach="attributes-position" args={[points, 3]} /></bufferGeometry><lineBasicMaterial color="#f4cf83" transparent opacity={0.43} depthWrite={false} /></lineSegments>
    {HUBS.map(([lat, lon], i) => <group key={i} position={position(lat, lon)}>
      <mesh><sphereGeometry args={[0.018, 10, 8]} /><meshBasicMaterial color="#fff3cf" toneMapped={false} /></mesh>
      <sprite scale={0.16}><spriteMaterial map={glow} color="#f5cf80" transparent opacity={0.65} depthWrite={false} blending={THREE.AdditiveBlending} /></sprite>
    </group>)}
  </group>;
}
function Orbit({ radius, tilt, speed, phase, glow, cool = false }: { radius: number; tilt: [number, number, number]; speed: number; phase: number; glow: THREE.Texture; cool?: boolean }) {
  const tail = useRef<THREE.Group>(null), bead = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { const t = clock.elapsedTime * speed + phase; if (tail.current) tail.current.rotation.z = t - 0.55; if (bead.current) bead.current.position.set(Math.cos(t) * radius, Math.sin(t) * radius, 0); });
  return <group rotation={tilt}>
    <mesh><torusGeometry args={[radius, 0.006, 6, 192]} /><meshStandardMaterial color={cool ? "#9abfc4" : "#d3ae62"} metalness={0.72} roughness={0.3} transparent opacity={0.85} /></mesh>
    <mesh><torusGeometry args={[radius + 0.037, 0.0022, 4, 192]} /><meshBasicMaterial color={cool ? "#7ca6ae" : "#e3bd68"} transparent opacity={0.2} /></mesh>
    <group ref={tail}>{[0, 1, 2, 3, 4].map(i => <mesh key={i} rotation={[0, 0, i * 0.11]}>
      <torusGeometry args={[radius, 0.0075, 6, 20, 0.112]} /><meshBasicMaterial color={cool ? "#c4f5ff" : "#fff0b7"} transparent opacity={0.12 + i * 0.17} toneMapped={false} />
    </mesh>)}</group>
    <group ref={bead}>
      <mesh><sphereGeometry args={[0.022, 12, 10]} /><meshBasicMaterial color="#fff8e8" toneMapped={false} /></mesh>
      <sprite scale={cool ? 0.24 : 0.3}><spriteMaterial map={glow} color={cool ? "#9fe6f4" : "#f5c96b"} transparent depthWrite={false} blending={THREE.AdditiveBlending} /></sprite>
    </group>
  </group>;
}
function OrbitalDust() {
  const ref = useRef<THREE.Points>(null);
  const points = useMemo(() => { const out: number[] = []; for (let i = 0; i < 150; i++) { const angle = i * 2.3999632297, r = 1.8 + ((i * 37) % 103) / 103 * 0.62; out.push(Math.cos(angle) * r, (((i * 29) % 97) / 97 - 0.5) * 0.4, Math.sin(angle) * r); } return new Float32Array(out); }, []);
  useFrame((_, delta) => { if (ref.current) ref.current.rotation.y += delta * 0.018; });
  return <points ref={ref} rotation={[0.33, 0, -0.12]}>
    <bufferGeometry><bufferAttribute attach="attributes-position" args={[points, 3]} /></bufferGeometry><pointsMaterial color="#d4bc85" size={0.009} transparent opacity={0.4} sizeAttenuation depthWrite={false} />
  </points>;
}
export default function OrbitalGlobe() {
  const root = useRef<THREE.Group>(null), globe = useRef<THREE.Group>(null), glow = useMemo(glowTexture, []);
  useEffect(() => () => glow.dispose(), [glow]);
  useFrame(({ clock, pointer }, delta) => {
    if (root.current) { root.current.rotation.x = THREE.MathUtils.damp(root.current.rotation.x, pointer.y * 0.065 - 0.08, 2, delta); root.current.rotation.y = THREE.MathUtils.damp(root.current.rotation.y, pointer.x * 0.08, 2, delta); root.current.position.y = Math.sin(clock.elapsedTime * 0.36) * 0.045; }
    if (globe.current) globe.current.rotation.y = clock.elapsedTime * 0.065 - 0.28;
  });
  return <group ref={root} rotation={[-0.08, 0, -0.13]}>
    <group ref={globe}>
      <mesh><sphereGeometry args={[RADIUS, 96, 64]} /><meshPhysicalMaterial color="#111c20" metalness={0.72} roughness={0.48} clearcoat={0.45} clearcoatRoughness={0.35} envMapIntensity={1.1} /></mesh>
      <MeridianGrid /><LandLights /><SurfaceArcs glow={glow} />
    </group>
    <Atmosphere />
    <Orbit radius={1.88} tilt={[1.08, 0.12, -0.24]} speed={0.28} phase={0.7} glow={glow} />
    <Orbit radius={2.12} tilt={[0.3, 0.75, 0.66]} speed={-0.19} phase={3.2} glow={glow} cool />
    <Orbit radius={1.65} tilt={[0.55, -0.4, 1.07]} speed={0.22} phase={4.3} glow={glow} />
    <OrbitalDust />
  </group>;
}
