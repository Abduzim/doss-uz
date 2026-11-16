# DOSS_UZ — erkaklar premium kiyim do‘koni

Fullstack onlayn do‘kon: katalog, mahsulot sahifasi (video + rasmlar), savat, buyurtma berish va admin panel.
Katalog Doss_uz Telegram kanali eksportidan tuzilgan (77 ta mahsulot, 98 ta video, 31 ta rasm).

- **Backend:** Node.js, Express 5, PostgreSQL (`pg`), Joi, JWT, argon2, multer
- **Frontend:** sof HTML / CSS / JavaScript (ES modullar, build bosqichi yo‘q)

## Ishga tushirish

```bash
npm install
npm run db:setup   # bazani, jadvallarni va adminni yaratadi (.env dan o'qiydi)
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
Parolni o‘zgartirish: `.env` da yangisini yozing va `npm run db:setup` ni qayta ishga tushiring.

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
