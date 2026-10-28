"use client";

import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { Suspense } from "react";
import { Nexus, Solaris } from "./GlobeConcepts";
import styles from "./orbital-globe.module.css";

/** Review scene only. Choosing a concept does not change the homepage. */
export default function GlobeConceptScene({ concept }: { concept: "solaris" | "nexus" }) {
  return <div className={styles.scene}>
    <Canvas camera={{ position: [0, 0.15, 6.9], fov: 42 }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[-3, 3, 4]} color="#fff1d1" intensity={2.2} />
      <pointLight position={[3, 0, 2]} color="#9ddde9" intensity={6} />
      <Suspense fallback={null}>
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" position={[-3, 3, 3]} rotation={[0.4, -0.5, -0.5]} scale={[1.5, 6, 1]} intensity={5} color="#fff0d0" />
          <Lightformer form="rect" position={[4, 0, 1]} rotation={[0, -Math.PI / 2, 0]} scale={[3, 7, 1]} intensity={3} color="#a9d9e4" />
          <Lightformer form="ring" position={[0, 3, -3]} scale={4} intensity={4} color="#d5af63" />
        </Environment>
        {concept === "solaris" ? <Solaris /> : <Nexus />}
      </Suspense>
    </Canvas>
  </div>;
}
