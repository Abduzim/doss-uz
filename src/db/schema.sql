CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL PRIMARY KEY,
  slug        VARCHAR(60)  NOT NULL UNIQUE,
  name        VARCHAR(80)  NOT NULL,
  description TEXT         NOT NULL DEFAULT '',
  sort        INT          NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id            SERIAL PRIMARY KEY,
  slug          VARCHAR(120) NOT NULL UNIQUE,
  title         VARCHAR(160) NOT NULL,
  category_id   INT          NOT NULL REFERENCES categories(id),
  price         INT          NOT NULL CHECK (price >= 0),
  old_price     INT,
  sizes         TEXT[]       NOT NULL DEFAULT '{}',
  material      VARCHAR(120) NOT NULL DEFAULT '',
  brand         VARCHAR(80)  NOT NULL DEFAULT '',
  description   TEXT         NOT NULL DEFAULT '',
  features      TEXT[]       NOT NULL DEFAULT '{}',
  is_new        BOOLEAN      NOT NULL DEFAULT FALSE,
  is_featured   BOOLEAN      NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  published_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_category_idx ON products(category_id);
CREATE INDEX IF NOT EXISTS products_published_idx ON products(published_at DESC);

CREATE TABLE IF NOT EXISTS product_media (
  id          SERIAL PRIMARY KEY,
  product_id  INT         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  kind        VARCHAR(10) NOT NULL CHECK (kind IN ('image', 'video')),
  url         TEXT        NOT NULL,
  poster_url  TEXT,
  preview_url TEXT,
  sort        INT         NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS product_media_product_idx ON product_media(product_id);

CREATE TABLE IF NOT EXISTS admins (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(60) NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id            SERIAL PRIMARY KEY,
  customer_name VARCHAR(120) NOT NULL,
  phone         VARCHAR(30)  NOT NULL,
  region        VARCHAR(80)  NOT NULL DEFAULT '',
  address       TEXT         NOT NULL DEFAULT '',
  comment       TEXT         NOT NULL DEFAULT '',
  delivery      VARCHAR(20)  NOT NULL DEFAULT 'delivery' CHECK (delivery IN ('delivery', 'pickup')),
  total         INT          NOT NULL,
  status        VARCHAR(20)  NOT NULL DEFAULT 'new'
                CHECK (status IN ('new', 'confirmed', 'shipped', 'done', 'cancelled')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id         SERIAL PRIMARY KEY,
  order_id   INT          NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INT          REFERENCES products(id) ON DELETE SET NULL,
  title      VARCHAR(160) NOT NULL,
  price      INT          NOT NULL,
  size       VARCHAR(10)  NOT NULL,
  quantity   INT          NOT NULL CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items(order_id);
