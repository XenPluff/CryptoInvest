"use client";
import { Canvas, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { Component, Suspense, useEffect, type ReactNode } from "react";
import OrbitalGlobe from "./orbit/OrbitalGlobe";
import GlobePoster from "./orbit/GlobePoster";
import styles from "./orbit/orbital-globe.module.css";
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <GlobePoster /> : this.props.children; }
}
function AdaptiveResolution() {
  const width = useThree(state => state.size.width);
  const setDpr = useThree(state => state.setDpr);
  useEffect(() => { setDpr(width <= 500 ? 1 : Math.min(window.devicePixelRatio, 1.5)); }, [width, setDpr]);
  return null;
}
export default function HeroScene() {
  return <div className={styles.scene}>
    <SceneBoundary>
      <Canvas camera={{ position: [0, 0.18, 6.9], fov: 42 }} dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true, powerPreference: "low-power" }} fallback={<GlobePoster />}>
        <AdaptiveResolution />
        <ambientLight intensity={0.45} />
        <directionalLight position={[-3, 3, 4]} color="#fff1d1" intensity={1.6} />
        <pointLight position={[3, 0, 2]} color="#a8d5e7" intensity={4} />
        <spotLight position={[-3, 4, 2]} color="#e7b960" intensity={15} angle={0.6} penumbra={1} />
        <Suspense fallback={null}>
          <Environment resolution={128} frames={1}>
            <Lightformer form="rect" position={[-3, 3, 3]} rotation={[0.4, -0.5, -0.5]} scale={[1.2, 6, 1]} intensity={4} color="#fff5dd" />
            <Lightformer form="rect" position={[4, 0, 1]} rotation={[0, -Math.PI / 2, 0]} scale={[3, 7, 1]} intensity={2.8} color="#9ac8da" />
            <Lightformer form="ring" position={[0, 3, -3]} scale={4} intensity={3} color="#d5af63" />
          </Environment>
          <OrbitalGlobe />
        </Suspense>
      </Canvas>
    </SceneBoundary>
  </div>;
}
