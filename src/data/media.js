// Katalogdagi mahsulot uchun media ro'yxatini tuzadi (seed va Cloudflare build shu yerdan oladi).
//   "v1804-2" → /media/poster/v1804-2.jpg     "p14" → /media/photo/p14.jpg
export const imageUrl = (ref) => (ref.startsWith("p") ? `/media/photo/${ref}.jpg` : `/media/poster/${ref}.jpg`);

export function buildMedia(p) {
  const media = [{ kind: "image", url: imageUrl(p.cover) }];
  const [main, ...rest] = p.videos;

  for (const v of p.videos) {
    const poster = v === main && p.cover.startsWith(`${v}-`) ? p.cover : `${v}-2`;
    media.push({
      kind: "video",
      url: `/media/video/${v}.mp4`,
      poster_url: imageUrl(poster),
      preview_url: `/media/preview/${v}.mp4`,
    });
  }
  for (const ph of p.photos) media.push({ kind: "image", url: imageUrl(ph) });

  // Videodan olingan kadrlar galereyani to'ldiradi
  const frames = [];
  if (main) for (const n of [2, 1, 3, 4]) frames.push(`${main}-${n}`);
  for (const v of rest) frames.push(`${v}-2`, `${v}-4`);
  const room = Math.max(0, 5 - p.photos.length);
  for (const f of frames.filter((f) => f !== p.cover).slice(0, room)) {
    media.push({ kind: "image", url: imageUrl(f) });
  }
  return media;
}
