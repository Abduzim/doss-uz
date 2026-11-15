import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";

function ffmpeg(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath, ["-hide_banner", "-loglevel", "error", "-y", ...args]);
    let err = "";
    p.stderr.on("data", (c) => (err += c));
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(err.trim() || "ffmpeg xatosi"))));
  });
}

// Admin yuklagan video uchun muqova kadri va kartochkadagi qisqa preview yasaydi.
// Muvaffaqiyatsiz bo'lsa null qaytadi — video baribir saqlanadi.
export async function makeVideoExtras(file) {
  const base = file.replace(/\.mp4$/i, "");
  const result = { poster: null, preview: null };
  try {
    await ffmpeg(["-ss", "1", "-i", file, "-frames:v", "1", "-q:v", "3", `${base}-poster.jpg`]);
    result.poster = `${base}-poster.jpg`;
  } catch (err) {
    console.error("Poster yaratilmadi:", err.message);
  }
  try {
    await ffmpeg([
      "-ss", "1", "-t", "5", "-i", file, "-vf", "scale=400:-2", "-an",
      "-c:v", "libx264", "-preset", "fast", "-crf", "30", "-pix_fmt", "yuv420p",
      "-movflags", "+faststart", `${base}-preview.mp4`,
    ]);
    result.preview = `${base}-preview.mp4`;
  } catch (err) {
    console.error("Preview yaratilmadi:", err.message);
  }
  return result;
}
