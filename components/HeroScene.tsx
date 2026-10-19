"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, Lightformer } from "@react-three/drei";
import {
  Suspense,
  useRef,
  useState,
  useEffect,
  Component,
  type ReactNode,
} from "react";
import * as THREE from "three";
function Sculpture() {
  const group = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  useFrame((state, delta) => {
    if (group.current) {
      group.current.rotation.y += delta * 0.075;
      group.current.rotation.x = THREE.MathUtils.lerp(
        group.current.rotation.x,
        state.pointer.y * 0.12 + 0.18,
        0.02,
      );
      group.current.position.x = THREE.MathUtils.lerp(
        group.current.position.x,
        state.pointer.x * 0.1,
        0.02,
      );
    }
    if (core.current) core.current.rotation.y -= delta * 0.09;
  });
  return (
    <Float speed={0.65} rotationIntensity={0.12} floatIntensity={0.4}>
      <group ref={group} rotation={[0.18, 0.2, -0.25]}>
        <mesh ref={core}>
          <icosahedronGeometry args={[1.28, 0]} />
          <meshPhysicalMaterial
            color="#8b682d"
            metalness={0.95}
            roughness={0.22}
            clearcoat={1}
            clearcoatRoughness={0.1}
            envMapIntensity={2.4}
          />
        </mesh>
        <mesh scale={1.018}>
          <icosahedronGeometry args={[1.28, 0]} />
          <meshBasicMaterial
            color="#f0d99a"
            wireframe
            transparent
            opacity={0.42}
          />
        </mesh>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
          <mesh key={n} rotation={[0, (Math.PI * n) / 9, Math.PI / 12]}>
            <torusGeometry args={[1.7, 0.009, 8, 160]} />
            <meshStandardMaterial
              color="#ddbf76"
              metalness={0.9}
              roughness={0.24}
              transparent
              opacity={0.72}
            />
          </mesh>
        ))}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.72, 0.015, 12, 200]} />
          <meshStandardMaterial
            color="#f3dca6"
            metalness={1}
            roughness={0.25}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0.32]}>
          <torusGeometry args={[1.98, 0.005, 8, 200]} />
          <meshBasicMaterial color="#d8bc78" transparent opacity={0.45} />
        </mesh>
        <mesh
          position={[0, 0.02, 0]}
          rotation={[0.2, 0, 0.2]}
          scale={[1, 1.65, 1]}
        >
          <octahedronGeometry args={[1.07, 0]} />
          <meshPhysicalMaterial
            color="#e6d6b5"
            metalness={0.1}
            roughness={0.1}
            transparent
            opacity={0.22}
            transmission={0.6}
            thickness={0.5}
          />
        </mesh>
      </group>
    </Float>
  );
}
class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="sculpture-fallback">
        <span />
        <span />
        <span />
        <i>Λ</i>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function HeroScene() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    setEnabled(!reduced.matches && window.innerWidth > 600);
  }, []);
  return (
    <div
      className="hero-canvas"
      aria-label="A slowly rotating golden orbital sculpture"
      role="img"
    >
      <SceneBoundary>
        {enabled ? (
          <Canvas
            camera={{ position: [0, 0, 5.6], fov: 42 }}
            dpr={[1, 1.5]}
            gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
          >
            <ambientLight intensity={0.45} />
            <spotLight
              position={[2, 4, 4]}
              intensity={80}
              color="#fff2d1"
              angle={0.6}
              penumbra={1}
            />
            <pointLight position={[-3, -1, 2]} intensity={15} color="#ac8441" />
            <directionalLight
              position={[-4, 3, 1]}
              intensity={3}
              color="#f8e8c4"
            />
            <Suspense fallback={null}>
              <Environment resolution={128}>
                <Lightformer
                  form="rect"
                  intensity={5}
                  position={[0, 5, -4]}
                  scale={[8, 3, 1]}
                />
                <Lightformer
                  form="rect"
                  color="#e8c27b"
                  intensity={3}
                  position={[-4, 0, 1]}
                  rotation={[0, Math.PI / 2, 0]}
                  scale={[4, 8, 1]}
                />
                <Lightformer
                  form="ring"
                  intensity={4}
                  position={[3, 1, 4]}
                  scale={3}
                />
              </Environment>
              <Sculpture />
            </Suspense>
          </Canvas>
        ) : (
          <div className="sculpture-fallback">
            <span />
            <span />
            <span />
            <i>Λ</i>
          </div>
        )}
      </SceneBoundary>
    </div>
  );
}
