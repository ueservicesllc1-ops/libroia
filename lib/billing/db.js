const Database = require("better-sqlite3");
const path = require("path");

/** @type {import("better-sqlite3").Database | null} */
let db = null;

function getDb() {
  if (!db) throw new Error("Base de datos no inicializada");
  return db;
}

/**
 * @param {import("better-sqlite3").Database} database
 */
function ensureUserAuthColumns(database) {
  const rows = database.prepare("PRAGMA table_info(users)").all();
  const has = (name) => rows.some((r) => r.name === name);
  
  if (!has("password_hash")) database.exec("ALTER TABLE users ADD COLUMN password_hash TEXT");
  if (!has("google_sub")) {
    database.exec("ALTER TABLE users ADD COLUMN google_sub TEXT");
    database.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub) WHERE google_sub IS NOT NULL");
  }
  if (!has("author_name")) database.exec("ALTER TABLE users ADD COLUMN author_name TEXT");
  if (!has("bio")) database.exec("ALTER TABLE users ADD COLUMN bio TEXT");
  if (!has("avatar_url")) database.exec("ALTER TABLE users ADD COLUMN avatar_url TEXT");
  if (!has("website")) database.exec("ALTER TABLE users ADD COLUMN website TEXT");
  
  // Roles para Fase 2.5
  if (!has("is_seller")) database.exec("ALTER TABLE users ADD COLUMN is_seller INTEGER DEFAULT 0");
  if (!has("is_admin")) database.exec("ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0");
}

/**
 * @param {string} dataDir
 */
function initDb(dataDir) {
  const fp = path.join(dataDir, "app.db");
  db = new Database(fp);
  db.pragma("journal_mode = WAL");
  
  // Migración para Phase 2
  const runMigration = (cmd) => { try { db.prepare(cmd).run(); } catch(e) {} };
  runMigration("ALTER TABLE purchases ADD COLUMN stripe_session_id TEXT");
  runMigration("ALTER TABLE purchases ADD COLUMN stripe_payment_intent_id TEXT");
  runMigration("ALTER TABLE purchases ADD COLUMN amount_total INTEGER");
  runMigration("ALTER TABLE purchases ADD COLUMN platform_fee_amount INTEGER");
  runMigration("ALTER TABLE purchases ADD COLUMN author_amount INTEGER");
  runMigration("ALTER TABLE purchases ADD COLUMN currency TEXT DEFAULT 'usd'");
  runMigration("ALTER TABLE purchases ADD COLUMN status TEXT DEFAULT 'paid'");

  // Migración para Tabla Sales (Cambio de author_id a seller_id)
  runMigration("ALTER TABLE sales ADD COLUMN seller_id INTEGER");
  runMigration("ALTER TABLE sales ADD COLUMN seller_amount INTEGER");

  // Migración Phase 3 — book_files (para publicación con B2)
  runMigration(`CREATE TABLE IF NOT EXISTS book_files (
    book_id TEXT PRIMARY KEY,
    cover_url TEXT,
    pdf_url TEXT,
    sample_url TEXT,
    updated_at TEXT,
    FOREIGN KEY (book_id) REFERENCES books_public(id)
  )`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      stripe_customer_id TEXT,
      plan TEXT NOT NULL DEFAULT 'basic',
      subscription_status TEXT NOT NULL DEFAULT 'active',
      billing_cycle_start TEXT NOT NULL,
      billing_cycle_end TEXT NOT NULL,
      included_tokens_limit INTEGER NOT NULL DEFAULT 3000000,
      included_tokens_used INTEGER NOT NULL DEFAULT 0,
      sonnet_payg_enabled INTEGER NOT NULL DEFAULT 0,
      sonnet_monthly_spend_limit REAL,
      sonnet_monthly_spend_used REAL NOT NULL DEFAULT 0,
      is_seller INTEGER DEFAULT 0,
      is_admin INTEGER DEFAULT 0,
      password_hash TEXT,
      google_sub TEXT UNIQUE,
      author_name TEXT,
      bio TEXT,
      avatar_url TEXT,
      website TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS seller_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE,
      display_name TEXT,
      bio TEXT,
      avatar_url TEXT,
      payout_method TEXT,
      payout_email TEXT,
      tax_info_status TEXT,
      status TEXT DEFAULT 'pending', -- pending, approved, rejected, suspended
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS seller_balances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seller_id INTEGER UNIQUE,
      available_balance INTEGER DEFAULT 0,
      pending_balance INTEGER DEFAULT 0,
      lifetime_earnings INTEGER DEFAULT 0,
      updated_at TEXT,
      FOREIGN KEY (seller_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS seller_payouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seller_id INTEGER,
      amount INTEGER,
      method TEXT,
      status TEXT DEFAULT 'pending', -- pending, processing, paid, rejected
      notes TEXT,
      created_at TEXT,
      paid_at TEXT,
      FOREIGN KEY (seller_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      book_id TEXT,
      stripe_session_id TEXT,
      stripe_payment_intent_id TEXT,
      amount_total INTEGER,
      platform_fee_amount INTEGER,
      author_amount INTEGER,
      currency TEXT DEFAULT 'usd',
      status TEXT DEFAULT 'paid', -- pending, paid, failed, refunded
      created_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (book_id) REFERENCES books_public(id)
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seller_id INTEGER,
      book_id TEXT,
      purchase_id INTEGER,
      amount_total INTEGER,
      platform_fee_amount INTEGER,
      seller_amount INTEGER,
      status TEXT DEFAULT 'paid',
      created_at TEXT,
      FOREIGN KEY (seller_id) REFERENCES users(id),
      FOREIGN KEY (purchase_id) REFERENCES purchases(id)
    );

    CREATE TABLE IF NOT EXISTS books_public (
      id TEXT PRIMARY KEY,
      author_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      cover_url TEXT,
      category TEXT,
      language TEXT DEFAULT 'es',
      tags TEXT,
      price INTEGER DEFAULT 0,
      status TEXT DEFAULT 'draft',
      visibility TEXT DEFAULT 'public',
      word_count INTEGER DEFAULT 0,
      reading_time_minutes INTEGER DEFAULT 0,
      sample_content TEXT,
      is_published INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (author_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      book_id TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (book_id) REFERENCES books_public(id)
    );

    CREATE TABLE IF NOT EXISTS reading_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      book_id TEXT NOT NULL,
      progress REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (book_id) REFERENCES books_public(id),
      UNIQUE(user_id, book_id)
    );

    CREATE TABLE IF NOT EXISTS book_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      content_before TEXT,
      content_after TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (book_id) REFERENCES books_public(id)
    );

    CREATE TABLE IF NOT EXISTS book_files (
      book_id TEXT PRIMARY KEY,
      cover_url TEXT,
      pdf_url TEXT,
      sample_url TEXT,
      updated_at TEXT,
      FOREIGN KEY (book_id) REFERENCES books_public(id)
    );

    CREATE INDEX IF NOT EXISTS idx_seller_profiles_user ON seller_profiles(user_id);
    CREATE INDEX IF NOT EXISTS idx_seller_profiles_status ON seller_profiles(status);
    CREATE INDEX IF NOT EXISTS idx_seller_balances_seller ON seller_balances(seller_id);
    CREATE INDEX IF NOT EXISTS idx_seller_payouts_seller ON seller_payouts(seller_id);
    CREATE INDEX IF NOT EXISTS idx_sales_seller ON sales(seller_id);

    CREATE TABLE IF NOT EXISTS physical_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      stripe_session_id TEXT,
      stripe_payment_intent_id TEXT,
      amount_total INTEGER NOT NULL,
      shipping_cents INTEGER NOT NULL DEFAULT 0,
      currency TEXT DEFAULT 'usd',
      status TEXT DEFAULT 'paid',
      shipping_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS physical_order_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      book_id TEXT NOT NULL,
      seller_id INTEGER NOT NULL,
      title TEXT,
      amount_total INTEGER NOT NULL,
      platform_fee_amount INTEGER NOT NULL,
      seller_amount INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES physical_orders(id),
      FOREIGN KEY (book_id) REFERENCES books_public(id)
    );

    CREATE INDEX IF NOT EXISTS idx_physical_orders_user ON physical_orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_physical_orders_session ON physical_orders(stripe_session_id);
  `);

  ensureUserAuthColumns(db);

  // Seed Admin si no existe (luisuf@gmail.com)
  const adminEmail = "luisuf@gmail.com";
  const existingAdmin = db.prepare("SELECT * FROM users WHERE email = ?").get(adminEmail);
  if (!existingAdmin) {
    const now = new Date().toISOString();
    const future = new Date(); future.setFullYear(future.getFullYear() + 10);
    db.prepare(`
      INSERT INTO users (
        email, plan, subscription_status, billing_cycle_start, billing_cycle_end,
        is_admin, created_at, updated_at
      ) VALUES (?, 'pro', 'active', ?, ?, 1, ?, ?)
    `).run(adminEmail, now, future.toISOString(), now, now);
  }

  return db;
}

module.exports = { initDb, getDb };
