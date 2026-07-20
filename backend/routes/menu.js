const express = require('express');
const { db } = require('../db/db');
const { requireAuth } = require('./auth');

const router = express.Router();

// PUBLIC: get full menu (categories + items), only available items shown to customers
router.get('/', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC, id ASC').all();
  const items = db.prepare('SELECT * FROM menu_items WHERE available = 1 ORDER BY sort_order ASC, id ASC').all();
  const grouped = categories.map(cat => ({
    ...cat,
    items: items.filter(i => i.category_id === cat.id)
  })).filter(cat => cat.items.length > 0);
  const settings = db.prepare('SELECT * FROM restaurant_settings WHERE id = 1').get();
  res.json({ restaurant: settings, categories: grouped });
});

// ADMIN: get full menu including unavailable items, for management
router.get('/admin', requireAuth, (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC, id ASC').all();
  const items = db.prepare('SELECT * FROM menu_items ORDER BY sort_order ASC, id ASC').all();
  const grouped = categories.map(cat => ({
    ...cat,
    items: items.filter(i => i.category_id === cat.id)
  }));
  res.json({ categories: grouped });
});

// ADMIN: create category
router.post('/categories', requireAuth, (req, res) => {
  const { name, sort_order } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const info = db.prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?)').run(name, sort_order || 0);
  res.json({ id: info.lastInsertRowid, name, sort_order: sort_order || 0 });
});

// ADMIN: update category
router.put('/categories/:id', requireAuth, (req, res) => {
  const { name, sort_order } = req.body;
  db.prepare('UPDATE categories SET name = COALESCE(?, name), sort_order = COALESCE(?, sort_order) WHERE id = ?')
    .run(name, sort_order, req.params.id);
  res.json({ success: true });
});

// ADMIN: delete category
router.delete('/categories/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ADMIN: create menu item
router.post('/items', requireAuth, (req, res) => {
  const { category_id, name, description, price, image_url, available, sort_order } = req.body;
  if (!name || price === undefined) return res.status(400).json({ error: 'Name and price required' });
  const info = db.prepare(`INSERT INTO menu_items (category_id, name, description, price, image_url, available, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    category_id || null, name, description || '', price, image_url || '', available === false ? 0 : 1, sort_order || 0
  );
  res.json({ id: info.lastInsertRowid });
});

// ADMIN: update menu item (edit, toggle availability, change price, etc.)
router.put('/items/:id', requireAuth, (req, res) => {
  const { category_id, name, description, price, image_url, available, sort_order } = req.body;
  const existing = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Item not found' });

  db.prepare(`UPDATE menu_items SET
      category_id = COALESCE(?, category_id),
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      price = COALESCE(?, price),
      image_url = COALESCE(?, image_url),
      available = COALESCE(?, available),
      sort_order = COALESCE(?, sort_order)
    WHERE id = ?`).run(
    category_id, name, description, price, image_url,
    available === undefined ? null : (available ? 1 : 0),
    sort_order, req.params.id
  );
  res.json({ success: true });
});

// ADMIN: delete menu item
router.delete('/items/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM menu_items WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
