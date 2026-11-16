// Cloudflare Pages kirish nuqtasi (dist-cf/site/_worker.js shu faylni ulaydi).
//   - HTML, CSS, JS, rasmlar — statik fayl sifatida Cloudflare'ning o'zi beradi (dist-cf/site)
//   - /api/*                 — shu yerdagi Express ilovasi (baza: DATABASE_URL siri)
//   - videolar               — shu yerdan beriladi, chunki Safari videoni bo'laklab (Range) so'raydi,
//                              statik fayllar xizmati esa buni qo'llamaydi
import { handleAsNodeRequest } from "cloudflare:node";
import { createApp } from "./app.js";
import sizes from "../dist-cf/media-sizes.json";

const PORT = 8080; // haqiqiy port emas — Workers ichidagi yo'naltirish kaliti
createApp().listen(PORT);

const MEDIA_CACHE = "public, max-age=2592000";

// Oqimdan faqat [start, end] baytlarni o'tkazadi
function slice(body, start, end) {
  let pos = 0;
  return body.pipeThrough(
    new TransformStream({
      transform(chunk, controller) {
        const from = pos;
        pos += chunk.byteLength;
        if (pos <= start) return;
        if (from > end) return controller.terminate();
        controller.enqueue(chunk.subarray(Math.max(0, start - from), Math.min(chunk.byteLength, end - from + 1)));
        if (pos > end) controller.terminate();
      },
    })
  );
}

async function serveMedia(request, env, url) {
  const asset = await env.ASSETS.fetch(new Request(url, { method: request.method === "HEAD" ? "HEAD" : "GET" }));
  if (!asset.ok) return new Response(null, { status: 404 });

  const headers = new Headers(asset.headers);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", MEDIA_CACHE);

  const size = sizes[url.pathname] ?? Number(asset.headers.get("content-length"));
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") || "");
  if (!range || !size || request.method === "HEAD") {
    return new Response(asset.body, { status: 200, headers });
  }

  let start;
  let end;
  if (range[1] === "") {
    // "bytes=-500" — oxirgi 500 bayt
    start = Math.max(0, size - Number(range[2]));
    end = size - 1;
  } else {
    start = Number(range[1]);
    end = range[2] === "" ? size - 1 : Math.min(Number(range[2]), size - 1);
  }
  if (start >= size || start > end) {
    asset.body?.cancel();
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  }

  const length = end - start + 1;
  const out = new FixedLengthStream(length);
  slice(asset.body, start, end).pipeTo(out.writable).catch(() => {});
  headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
  headers.set("Content-Length", String(length));
  return new Response(out.readable, { status: 206, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname.startsWith("/api/")) return handleAsNodeRequest(PORT, request);
    if (pathname.startsWith("/media/")) return serveMedia(request, env, url);

    // /catalog/<slug> — bitta umumiy mahsulot sahifasi
    if (/^\/catalog\/[^/]+\/?$/.test(pathname)) {
      return env.ASSETS.fetch(new Request(new URL("/product", url), request));
    }

    // Qolgani — statik fayl (topilmasa, Cloudflare o'zi 404.html ni beradi)
    return env.ASSETS.fetch(request);
  },
};
