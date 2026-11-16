# DOSS_UZ — erkaklar premium kiyim do‘koni

Fullstack onlayn do‘kon: katalog, mahsulot sahifasi (video + rasmlar), savat, buyurtma berish va admin panel.
Katalog Doss_uz Telegram kanali eksportidan tuzilgan (77 ta mahsulot, 98 ta video, 31 ta rasm).

- **Backend:** Node.js, Express 5, PostgreSQL (`pg`), Joi, JWT, multer
- **Hosting:** Cloudflare Pages — https://doss-uz.pages.dev
- **Frontend:** sof HTML / CSS / JavaScript (ES modullar, build bosqichi yo‘q)

## Ishga tushirish

```bash
npm install
npm run db:setup   # bazani va jadvallarni yaratadi (.env dan o'qiydi)
npm run db:seed    # katalogni bazaga yuklaydi
npm run dev        # http://localhost:4000
```

Sozlamalar `.env` faylida (namuna — `.env.example`): baza ulanishi, admin login/paroli, JWT kaliti.

| Sahifa | Manzil |
| --- | --- |
| Bosh sahifa | `/` |
| Katalog (filtr, saralash, qidiruv) | `/catalog` |
| Mahsulot | `/catalog/<slug>` |
| Buyurtma berish | `/checkout` |
| Sevimlilar | `/favorites` |
| Do‘kon va aloqa | `/contacts` |
| Admin panel | `/admin` |

## Admin panel

`/admin` — login va parol `.env` dagi `ADMIN_USERNAME` / `ADMIN_PASSWORD`.
Parolni o‘zgartirish: kompyuterda — `.env` da yangisini yozib serverni qayta yoqing;
internetdagi sayt uchun — `npx wrangler pages secret put ADMIN_PASSWORD --project-name doss-uz`, keyin `npm run deploy:cf`.

- **Buyurtmalar:** ro‘yxat, holatini o‘zgartirish (yangi → tasdiqlangan → yo‘lda → yakunlangan / bekor qilingan).
- **Mahsulotlar:** qo‘shish, tahrirlash, o‘chirish, yashirish; rasm va video yuklash.
  Video yuklanganda muqova kadri va kartochkadagi qisqa preview avtomatik yasaladi.

## Qayerda nimani o‘zgartirish

| Nima | Fayl |
| --- | --- |
| Manzil, telefon, ish vaqti, Telegram, xarita koordinatasi | `src/data/site.js` |
| Boshlang‘ich katalog (nom, narx, razmer, tavsif) | `src/data/catalog.js` → `npm run db:seed` |
| Ranglar va shriftlar | `public/css/style.css` (`:root` bloki) |
| Bosh sahifa matnlari va hero videolari | `public/index.html`, `uploads/hero/` |

Kundalik ishda mahsulotlarni admin panel orqali o‘zgartirish qulayroq.
`npm run db:seed` faqat `catalog.js` dagi mahsulotlarni yangilaydi — admin panelda qo‘shilganlarga tegmaydi,
lekin `catalog.js` dagi mahsulotga admin panelda kiritilgan o‘zgarishlarni ustidan yozadi.

## Telegramga buyurtma xabarnomasi

Har bir yangi buyurtma haqida Telegramga xabar kelishi uchun `.env` ga yozing:

```
TELEGRAM_BOT_TOKEN=...   # @BotFather bergan token
TELEGRAM_CHAT_ID=...     # xabar boradigan chat yoki guruh ID si
```

Bo‘sh qoldirilsa, buyurtmalar faqat admin panelda ko‘rinadi.

## Media fayllar

Rasm va videolar `uploads/` papkasida turadi (git ga qo‘shilmaydi, ~950 MB) va saytda `/media/...` manzilida ochiladi.

```
uploads/video/    siqilgan videolar (720p)
uploads/preview/  kartochkadagi 5 soniyali ovozsiz preview
uploads/poster/   videodan olingan kadrlar
uploads/photo/    kanal rasmlari
uploads/hero/     bosh sahifadagi 3 ta video
uploads/admin/    admin panel orqali yuklangan fayllar
```

Yangi Telegram eksportidan media tayyorlash:

```bash
npm run media -- /yo'l/telegram-eksport-papkasi
```

## API

Ochiq:

- `GET /api/categories`
- `GET /api/products?category=&size=&q=&sort=new|price_asc|price_desc&only=new|featured&ids=1,2&limit=&offset=`
- `GET /api/products/:slug`
- `POST /api/orders` — `{ customer_name, phone, delivery, region, address, comment, items: [{ product_id, size, quantity }] }`.
  Narx har doim bazadan olinadi.

Admin (`Authorization: Bearer <token>`):

- `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/admin/stats`, `GET /api/admin/orders`, `PATCH /api/admin/orders/:id`
- `GET|POST /api/admin/products`, `GET|PUT|DELETE /api/admin/products/:id`
- `POST /api/admin/upload` (multipart, `files`)

## Loyiha tuzilishi

```
src/
  server.js            Express ilovasi
  config/              env va PostgreSQL ulanishi
  routers/ controllers/ services/   API qatlamlari
  middleware/          validatsiya, admin tekshiruvi, limit, xatolar
  utils/               Joi sxemalari, slug, Telegram, ffmpeg
  data/                do'kon ma'lumoti va boshlang'ich katalog
  db/                  schema.sql, setup.js, seed.js
public/                frontend (HTML, css/, js/, admin/, fonts/)
scripts/               process-media.js
uploads/               media fayllar
```

## Internetga chiqarishdan oldin

- `.env` da `JWT_SECRET` va `ADMIN_PASSWORD` ni yangi, kuchli qiymatga almashtiring.
- Saytni HTTPS orqali bering (Nginx / Caddy orqasida).
- `uploads/` papkasini serverga alohida ko‘chiring — u git da yo‘q.

## Saytni vaqtincha internetga ochish (Cloudflare Tunnel)

```bash
npm run dev     # 1-terminal: sayt
npm run share   # 2-terminal: https://....trycloudflare.com ko'rinishidagi ochiq link chiqadi
```

Link kompyuter yoniq va ikkala buyruq ishlab turgan paytda ochiladi; har safar qayta ishga tushirilganda yangi manzil beriladi.

## Cloudflare'ga joylash (doimiy manzil)

Sayt Cloudflare Pages'da turadi: https://doss-uz.pages.dev

```bash
npm run deploy:cf   # yig'adi (dist-cf/) va Cloudflare'ga yuklaydi
```

- Sahifalar va rasmlar — statik fayllar; `/api/*` va videolar — `src/worker.js` orqali (shu Express ilovasi).
  Worker qaysi manzillarda ishlashi `dist-cf/site/_routes.json` da (uni `scripts/build-cf.js` yozadi).
- Sirlar `npx wrangler pages secret put <NOM> --project-name doss-uz` bilan qo'yiladi: `DATABASE_URL`, `JWT_SECRET`, `ADMIN_PASSWORD`.
  Sir o'zgargach, kuchga kirishi uchun `npm run deploy:cf` ni qayta ishga tushiring.
- `DATABASE_URL` qo'yilmagan bo'lsa, katalog `src/data/catalog.js` dan o'qiladi (faqat ko'rish);
  buyurtma va admin panel ishlashi uchun baza kerak.
- Bulutdagi bazani tayyorlash (bir marta): `DATABASE_URL=<neon satri> npm run db:setup && DATABASE_URL=<neon satri> npm run db:seed`
- Internetdagi versiyada admin panel orqali fayl yuklash o'chirilgan (Cloudflare'da disk yo'q).
  Yangi rasm/video qo'shish: kompyuterda qo'shing, keyin `npm run deploy:cf`.
- Cloudflare bitta fayl uchun 25 MB chegarasini qo'yadi — undan katta video yuklanmaydi.
