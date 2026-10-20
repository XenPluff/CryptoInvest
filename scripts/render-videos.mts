/** Offline, deterministic Canvas + FFmpeg video production. No external media or services. */
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { chmod, mkdir, readFile, writeFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { aureonVideos, videoDuration, type AureonVideo } from "../lib/video-content";

const root = process.cwd();
const output = path.join(root, "public/videos");
const fps = 24;
const only = process.argv.find(arg => arg.startsWith("--only="))?.split("=")[1];
const movies = only ? aureonVideos.filter(video => video.id === only) : aureonVideos;
if (!movies.length) throw new Error(`Unknown video: ${only}`);
await mkdir(output, { recursive: true });
await chmod(path.dirname(output), 0o755);
await chmod(output, 0o755);
const fonts = await Promise.all([
  ["DM Sans", "dm-sans", "400", "normal"],
  ["Cormorant Garamond", "cormorant-garamond", "400", "normal"],
  ["Cormorant Garamond Italic", "cormorant-garamond", "400", "italic"],
].map(async ([name, pkg, weight, style]) => ({
  name,
  data: (await readFile(path.join(root, `node_modules/@fontsource/${pkg}/files/${pkg}-latin-${weight}-${style}.woff2`))).toString("base64"),
})));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox", "--disable-dev-shm-usage"], headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await page.setContent(await readFile(path.join(root, "scripts/videos/stage.html"), "utf8"));
await page.evaluate(async fonts => {
  for (const font of fonts) {
    const face = new FontFace(font.name, `url(data:font/woff2;base64,${font.data})`);
    await face.load();
    document.fonts.add(face);
  }
  await document.fonts.ready;
}, fonts);
const cueTime = (seconds: number) => `00:${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}.000`;
try {
  for (const movie of movies) {
    const seconds = videoDuration(movie);
    const target = path.join(output, `${movie.id}.mp4`);
    const temporary = path.join(output, `${movie.id}.rendering.mp4`);
    // Original, quiet stereo sine-pad score, faded at both ends; no licensed samples or voice.
    const score = "aevalsrc=0.025*(sin(2*PI*130.8128*t)+0.4*sin(2*PI*196*t)+0.25*sin(2*PI*261.6256*t))*(0.7+0.3*sin(2*PI*0.09*t))|0.025*(sin(2*PI*130.9128*t)+0.4*sin(2*PI*196.15*t)+0.25*sin(2*PI*261.4256*t))*(0.7+0.3*sin(2*PI*0.09*t)):s=48000";
    const encoder = spawn("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "image2pipe", "-framerate", String(fps), "-vcodec", "mjpeg", "-i", "pipe:0", "-f", "lavfi", "-i", score, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-threads", "2", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "64k", "-af", `afade=t=in:st=0:d=2,afade=t=out:st=${seconds-3}:d=3`, "-t", String(seconds), "-movflags", "+faststart", temporary], { stdio: ["pipe", "ignore", "pipe"] });
    let errors = "";
    encoder.stderr.on("data", chunk => { errors += chunk.toString(); });
    const finished = new Promise<void>((resolve, reject) => {
      encoder.on("error", reject);
      encoder.on("close", code => code === 0 ? resolve() : reject(new Error(`FFmpeg ${code}: ${errors}`)));
      encoder.stdin.on("error", reject);
    });
    // Observe failures immediately even while the deterministic frame loop is running.
    void finished.catch(() => {});
    for (let start = 0; start < seconds * fps; start += 12) {
      const frames = await page.evaluate(({ movie, start, fps, count }) => {
        const frameCanvas = document.getElementById("stage") as HTMLCanvasElement;
        const render = (window as unknown as { renderFrame: (movie: AureonVideo, time: number) => void }).renderFrame;
        const result: string[] = [];
        for (let i = 0; i < count; i++) {
          render(movie, (start + i) / fps);
          result.push(frameCanvas.toDataURL("image/jpeg", 0.9).split(",")[1]);
        }
        return result;
      }, { movie, start, fps, count: Math.min(12, seconds * fps - start) });
      for (const frame of frames) {
        if (!encoder.stdin.write(Buffer.from(frame, "base64"))) await once(encoder.stdin, "drain");
      }
      if (start % (fps * 8) === 0) console.log(`${movie.id}: ${Math.round(start / fps)} / ${seconds}s`);
    }
    encoder.stdin.end();
    await finished;
    await rename(temporary, target);
    const poster = await page.evaluate(movie => {
      (window as unknown as { renderFrame: (movie: AureonVideo, time: number) => void }).renderFrame(movie, 2);
      return (document.getElementById("stage") as HTMLCanvasElement).toDataURL("image/jpeg", 0.93).split(",")[1];
    }, movie);
    await writeFile(path.join(output, `${movie.id}.jpg`), Buffer.from(poster, "base64"));
    const cues = movie.scenes.map((scene, i) => `${i+1}\n${cueTime(i * movie.sceneSeconds)} --> ${cueTime((i+1) * movie.sceneSeconds)} line:84% position:50% size:90% align:center\n${scene.title} ${scene.accent}\n${scene.text}\n`).join("\n");
    await writeFile(path.join(output, `${movie.id}.vtt`), `WEBVTT\n\nNOTE Ambient instrumental music. All instructions appear on screen.\n\n${cues}`);
    const transcript = [movie.title, "", "Ambient instrumental music; no spoken narration. All instructions appear on screen.", "", ...movie.scenes.flatMap(scene => [scene.label, `${scene.title} ${scene.accent}`, scene.text, ""]), "Digital assets involve substantial risk, including loss of your entire investment."].join("\n");
    await writeFile(path.join(output, `${movie.id}.txt`), transcript);
    for (const extension of ["mp4", "jpg", "vtt", "txt"]) await chmod(path.join(output, `${movie.id}.${extension}`), 0o644);
    console.log(`Finished ${movie.id}: ${seconds}s, 1280x720, ${fps}fps`);
  }
} finally {
  await browser.close();
  for (const movie of movies) await rm(path.join(output, `${movie.id}.rendering.mp4`), { force: true });
}
