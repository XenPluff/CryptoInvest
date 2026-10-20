"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Download, Film, Play, RotateCcw } from "lucide-react";
import { aureonVideos, videoDuration, videoTime, type AureonVideo } from "@/lib/video-content";
import styles from "./videos.module.css";

export function VideoTeaser() {
  return (
    <section className={`container ${styles.teaser}`} aria-labelledby="video-teaser-title" lang="en">
      <Link href="/videos" className={styles.teaserArt} aria-label="Watch the AUREON introduction and video guides">
        <Image src="/videos/introduction.jpg" alt="AUREON introduction: a new perspective, with a gold orbital sphere" width={1280} height={720} sizes="(max-width: 750px) 100vw, 50vw" />
        <span className={styles.playBadge}><Play size={20} fill="currentColor" /></span>
        <span className={styles.teaserDuration}>MEET AUREON · 0:32</span>
      </Link>
      <div className={styles.teaserCopy}>
        <p className="eyebrow">Films & field notes</p>
        <h2 id="video-teaser-title">A little context.<br /><em>A clearer view.</em></h2>
        <p>Meet AUREON, explore the workspace and follow the process at your own pace. Short films. Practical guides. Every step, explained.</p>
        <Link href="/videos" className={styles.textLink}>Explore the video library <ArrowUpRight size={16} /></Link>
      </div>
    </section>
  );
}

export default function VideoLibrary() {
  const [active, setActive] = useState(aureonVideos[0]);
  const [failed, setFailed] = useState(false);
  const player = useRef<HTMLVideoElement>(null);
  const playerSection = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const readHash = () => {
      const match = aureonVideos.find(video => `#${video.id}` === window.location.hash);
      if (match) { setActive(match); setFailed(false); }
    };
    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, []);

  function choose(video: AureonVideo) {
    player.current?.pause();
    setActive(video);
    setFailed(false);
    window.history.replaceState(null, "", `#${video.id}`);
    if (window.matchMedia("(max-width: 900px)").matches) {
      playerSection.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    }
  }

  function seek(seconds: number) {
    if (!player.current) return;
    player.current.currentTime = seconds;
    void player.current.play().catch(() => {
      // Native controls remain available if the browser requires another gesture.
    });
  }

  return (
    <section className={`container ${styles.library}`} aria-label="AUREON video library">
      <div className={styles.screenColumn} ref={playerSection}>
        <div className={styles.screen}>
          <video
            ref={player}
            key={active.id}
            controls
            playsInline
            preload="none"
            poster={`/videos/${active.id}.jpg`}
            width={1280}
            height={720}
            aria-label={active.title}
            aria-describedby="video-description"
            onError={() => setFailed(true)}
          >
            <source src={`/videos/${active.id}.mp4`} type="video/mp4" />
            <track kind="captions" src={`/videos/${active.id}.vtt`} srcLang="en" label="English" default />
            Your browser does not support embedded video. Download the MP4 or read the transcript below.
          </video>
        </div>
        {failed && <div className={styles.error} role="alert">
          <p>The video could not load. You can retry, download it, or read the transcript below.</p>
          <button type="button" onClick={() => { setFailed(false); player.current?.load(); }}><RotateCcw size={14} /> Retry video</button>
        </div>}
        <div className={styles.videoMeta}><span>{active.category}</span><span>{videoTime(videoDuration(active))} · ENGLISH</span></div>
        <h2 className={styles.videoTitle}>{active.title}</h2>
        <p id="video-description" className={styles.description}>{active.description}</p>
        <p className={styles.audioNote}>On-screen guidance with ambient music. No spoken narration. English captions and a transcript are included.</p>
        <div className={styles.actions}>
          <Link href={active.action.href} className={styles.textLink}>{active.action.label} <ArrowUpRight size={15} /></Link>
          <a href={`/videos/${active.id}.mp4`} download className={styles.download}><Download size={14} /> Download MP4</a>
        </div>
        <details className={styles.transcript}>
          <summary>Chapters & full transcript</summary>
          <p className={styles.transcriptNote}>Choose a timestamp to play from that chapter. Visuals illustrate the process; use your current account for live details.</p>
          <ol>
            {active.scenes.map((scene, index) => <li key={scene.label}>
              <button type="button" onClick={() => seek(index * active.sceneSeconds)} aria-label={`Play ${scene.title} ${scene.accent} at ${videoTime(index * active.sceneSeconds)}`}>
                <Play size={11} /> {videoTime(index * active.sceneSeconds)}
              </button>
              <div><h3>{scene.title} {scene.accent}</h3><p>{scene.text}</p></div>
            </li>)}
          </ol>
          <a href={`/videos/${active.id}.txt`} download className={styles.download}><Download size={14} /> Download text transcript</a>
        </details>
      </div>
      <aside className={styles.playlist} aria-label="Choose a video">
        <div className={styles.playlistHeading}><Film size={16} /><span>THE COLLECTION</span><small>05 FILMS</small></div>
        {aureonVideos.map((video, index) => <button type="button" key={video.id} onClick={() => choose(video)} aria-pressed={active.id === video.id} className={`${styles.choice} ${active.id === video.id ? styles.selected : ""}`}>
          <span className={styles.thumbnail}>
            <Image src={`/videos/${video.id}.jpg`} alt="" width={1280} height={720} sizes="120px" />
            <span>{videoTime(videoDuration(video))}</span>
          </span>
          <span className={styles.choiceCopy}><small>{String(index + 1).padStart(2, "0")} / {video.category}</small><strong>{video.title}</strong></span>
          <Play className={styles.choicePlay} size={12} fill={active.id === video.id ? "currentColor" : "none"} />
        </button>)}
        <div className={styles.playlistNote}><p>Understand the process before making a decision.</p><Link href="/how-it-works">Read the step-by-step guide <ArrowUpRight size={13} /></Link></div>
      </aside>
      <p className={styles.risk}>Digital assets involve substantial risk, including the loss of your entire investment. Illustrative targets are not guaranteed returns or available funds. These videos explain the platform and do not establish regulatory authorization or replace the <Link href="/legal/terms">terms</Link> and <Link href="/legal/risk">risk disclosure</Link>.</p>
    </section>
  );
}
