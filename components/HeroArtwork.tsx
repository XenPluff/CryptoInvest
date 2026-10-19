"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
const Scene = dynamic(() => import("./HeroScene"), { ssr: false });
export default function HeroArtwork() {
  const [renderScene, setRenderScene] = useState(false);
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const screen = matchMedia("(min-width: 651px)");
    const update = () =>
      setRenderScene(!motion.matches && screen.matches && !document.hidden);
    update();
    motion.addEventListener("change", update);
    screen.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      motion.removeEventListener("change", update);
      screen.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  if (renderScene) return <Scene />;
  return (
    <div
      className="hero-canvas"
      role="img"
      aria-label="Golden orbital sculpture"
    >
      <div className="sculpture-fallback">
        <span />
        <span />
        <span />
        <i>Λ</i>
      </div>
    </div>
  );
}
