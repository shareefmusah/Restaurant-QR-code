const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('crypto');

const db = new Database(path.join(__dirname, 'restaurant.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---------- SCHEMA ----------
db.exec(`
CREATE TABLE IF NOT EXISTS restaurant_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL DEFAULT 'My Restaurant',
  currency TEXT NOT NULL DEFAULT '$'
);

CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tables (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS menu_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price REAL NOT NULL,
  image_url TEXT DEFAULT '',
  available INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_id TEXT REFERENCES tables(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, preparing, ready, served, cancelled
  total REAL NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id INTEGER REFERENCES menu_items(id),
  name_at_order TEXT NOT NULL,
  price_at_order REAL NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  item_notes TEXT DEFAULT ''
);
`);

// ---------- SEED ----------
function hashPassword(password, salt) {
  return bcrypt.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

function seed() {
  const settingsExists = db.prepare('SELECT id FROM restaurant_settings WHERE id = 1').get();
  if (!settingsExists) {
    db.prepare('INSERT INTO restaurant_settings (id, name, currency) VALUES (1, ?, ?)').run('My Restaurant', '$');
  }

  const adminExists = db.prepare('SELECT id FROM admins WHERE username = ?').get('admin');
  if (!adminExists) {
    const salt = require('crypto').randomBytes(16).toString('hex');
    const hash = hashPassword('admin123', salt);
    db.prepare('INSERT INTO admins (username, password_hash, password_salt) VALUES (?, ?, ?)').run('admin', hash, salt);
    console.log('Seeded default admin -> username: admin / password: admin123 (CHANGE THIS)');
  }

  const tableCount = db.prepare('SELECT COUNT(*) as c FROM tables').get().c;
  if (tableCount === 0) {
    const insertTable = db.prepare('INSERT INTO tables (id, name) VALUES (?, ?)');
    for (let i = 1; i <= 6; i++) {
      insertTable.run(`table-${i}`, `Table ${i}`);
    }
  }

  const catCount = db.prepare('SELECT COUNT(*) as c FROM categories').get().c;
  if (catCount === 0) {
    const insertCat = db.prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?)');
    const starters = insertCat.run('Starters', 1).lastInsertRowid;
    const mains = insertCat.run('Main Courses', 2).lastInsertRowid;
    const drinks = insertCat.run('Drinks', 3).lastInsertRowid;
    const desserts = insertCat.run('Desserts', 4).lastInsertRowid;

    const insertItem = db.prepare(`INSERT INTO menu_items (category_id, name, description, price, image_url, available, sort_order)
      VALUES (?, ?, ?, ?, ?, 1, ?)`);
    insertItem.run(starters, 'Spring Rolls', 'Crispy vegetable spring rolls with sweet chili sauce', 5.50, '', 1);
    insertItem.run(starters, 'Chicken Wings', 'Grilled wings tossed in house spice blend', 7.00, '', 2);
    insertItem.run(mains, 'Jollof Rice & Chicken', 'Classic jollof rice served with grilled chicken', 12.00, '', 1);
    insertItem.run(mains, 'Grilled Tilapia', 'Whole grilled tilapia with pepper sauce', 15.00, '', 2);
    insertItem.run(mains, 'Beef Burger', 'House burger with fries', 10.50, '', 3);
    insertItem.run(drinks, 'Bottled Water', '', 1.50, '', 1);
    insertItem.run(drinks, 'Fresh Juice', 'Ask about today\'s flavor', 3.00, '', 2);
    insertItem.run(desserts, 'Chocolate Cake', 'Rich layered chocolate cake', 4.50, '', 1);
  }
}

seed();

module.exports = { db, hashPassword };
