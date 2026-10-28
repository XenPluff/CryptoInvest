"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import GlobePoster from "./orbit/GlobePoster";
const Scene = dynamic(() => import("./HeroScene"), { ssr: false, loading: () => <GlobePoster /> });
export default function HeroArtwork() {
  const [renderScene, setRenderScene] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const screen = matchMedia("(min-width: 651px)");
    let visible = true;
    const update = () => setRenderScene(!motion.matches && screen.matches && !document.hidden && visible);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }, { rootMargin: "100px" });
    if (host.current) observer.observe(host.current);
    update();
    motion.addEventListener("change", update);
    screen.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", update);
      screen.removeEventListener("change", update);
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
    </div>
  );
}
