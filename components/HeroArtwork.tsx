"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import GlobePoster from "./orbit/GlobePoster";
import CryptoSignals from "./orbit/CryptoSignals";
const Scene = dynamic(() => import("./HeroScene"), { ssr: false, loading: () => <GlobePoster /> });
export default function HeroArtwork() {
  const [renderScene, setRenderScene] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = true;
    const update = () => setRenderScene(!motion.matches && !document.hidden && visible);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }, { rootMargin: "100px" });
    if (host.current) observer.observe(host.current);
    update();
    motion.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return (
    <div
      ref={host}
      className="hero-canvas"
      role="img"
      aria-label="Golden orbital sculpture"
    >
      {renderScene ? <Scene /> : <GlobePoster />}
      {renderScene && <CryptoSignals />}
    </div>
  );
}
