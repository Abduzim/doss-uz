// Telegram eksportidagi media fayllarni veb uchun tayyorlaydi.
// Ishlatish:  node scripts/process-media.js <telegram-export-papkasi>
//
// Har bir video uchun:
//   uploads/video/<id>.mp4     — siqilgan to'liq video (720p, ovozli)
//   uploads/preview/<id>.mp4   — 5 soniyali ovozsiz preview (kartochkada hover uchun)
//   uploads/poster/<id>-N.jpg  — 4 ta kadr (galereya rasmlari)
// Har bir rasm uchun:
//   uploads/photo/<id>.jpg
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import ffmpegPath from "ffmpeg-static";

const SRC = process.argv[2];
if (!SRC) {
  console.error("Eksport papkasini ko'rsating: node scripts/process-media.js <papka>");
  process.exit(1);
}
const OUT = path.resolve(import.meta.dirname, "..", "uploads");
const FRAMES = [0.12, 0.38, 0.62, 0.86];

for (const d of ["video", "preview", "poster", "photo"]) {
  fs.mkdirSync(path.join(OUT, d), { recursive: true });
}

function run(args) {
  return new Promise((resolve) => {
    const p = spawn(ffmpegPath, ["-hide_banner", "-y", ...args]);
    let err = "";
    p.stderr.on("data", (c) => (err += c));
    p.on("close", (code) => resolve({ code, err }));
  });
}

export function videoId(file) {
  const base = path.basename(file).replace(/\.mp4$/i, "");
  const m = base.match(/^IMG_(\d+)$/i);
  return m ? `v${m[1]}` : `v${base.slice(-6)}`;
}

async function duration(file) {
  const { err } = await run(["-i", file]);
  const m = err.match(/Duration: (\d+):(\d+):([\d.]+)/);
  return m ? +m[1] * 3600 + +m[2] * 60 + parseFloat(m[3]) : 0;
}

async function processVideo(file) {
  const id = videoId(file);
  const dur = await duration(file);
  const full = path.join(OUT, "video", `${id}.mp4`);
  const prev = path.join(OUT, "preview", `${id}.mp4`);
  const jobs = [];

  if (!fs.existsSync(full)) {
    jobs.push(
      run([
        "-i", file,
        "-vf", "scale='min(720,iw)':-2",
        "-c:v", "libx264", "-preset", "fast", "-crf", "27", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "64k", "-ac", "2",
        "-movflags", "+faststart", full,
      ])
    );
  }
  if (!fs.existsSync(prev)) {
    const start = Math.max(0, Math.min(dur * 0.15, dur - 5));
    jobs.push(
      run([
        "-ss", start.toFixed(2), "-t", "5", "-i", file,
        "-vf", "scale=400:-2", "-an",
        "-c:v", "libx264", "-preset", "fast", "-crf", "30", "-pix_fmt", "yuv420p",
        "-movflags", "+faststart", prev,
      ])
    );
  }
  FRAMES.forEach((f, i) => {
    const out = path.join(OUT, "poster", `${id}-${i + 1}.jpg`);
    if (fs.existsSync(out)) return;
    jobs.push(
      run(["-ss", (dur * f).toFixed(2), "-i", file, "-frames:v", "1", "-q:v", "3", out])
    );
  });

  const res = await Promise.all(jobs);
  const failed = res.filter((r) => r.code !== 0);
  if (failed.length) console.error(`XATO ${id}:`, failed[0].err.split("\n").slice(-3).join(" "));
  return { id, duration: Math.round(dur) };
}

async function pool(items, size, fn) {
  const out = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
        process.stdout.write(`\r${out.filter(Boolean).length}/${items.length} `);
      }
    })
  );
  return out;
}

const videoDir = path.join(SRC, "video_files");
const photoDir = path.join(SRC, "photos");

const videos = fs.existsSync(videoDir)
  ? fs.readdirSync(videoDir).filter((f) => /\.mp4$/i.test(f)).map((f) => path.join(videoDir, f))
  : [];
const photos = fs.existsSync(photoDir)
  ? fs.readdirSync(photoDir).filter((f) => /\.jpe?g$/i.test(f) && !/_thumb/.test(f))
  : [];

console.log(`Video: ${videos.length} ta, rasm: ${photos.length} ta`);

for (const f of photos) {
  const m = f.match(/^photo_(\d+)@/);
  const dest = path.join(OUT, "photo", `p${m ? m[1] : path.parse(f).name}.jpg`);
  if (!fs.existsSync(dest)) fs.copyFileSync(path.join(photoDir, f), dest);
}

const meta = await pool(videos, Math.max(2, Math.floor(os.cpus().length / 3)), processVideo);
fs.writeFileSync(
  path.join(OUT, "media.json"),
  JSON.stringify(Object.fromEntries(meta.map((m) => [m.id, m.duration])), null, 1)
);
console.log("\nTayyor →", OUT);
