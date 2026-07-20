const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db/db');
const { requireAuth } = require('./auth');

const router = express.Router();

// PUBLIC: validate a table exists (used by customer menu page)
router.get('/:id', (req, res) => {
  const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(req.params.id);
  if (!table) return res.status(404).json({ error: 'Table not found' });
  res.json(table);
});

// ADMIN: list all tables
router.get('/', requireAuth, (req, res) => {
  const tables = db.prepare('SELECT * FROM tables ORDER BY created_at ASC').all();
  res.json(tables);
});

// ADMIN: create a new table
router.post('/', requireAuth, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const id = `table-${uuidv4().slice(0, 8)}`;
  db.prepare('INSERT INTO tables (id, name) VALUES (?, ?)').run(id, name);
  res.json({ id, name });
});

// ADMIN: rename a table
router.put('/:id', requireAuth, (req, res) => {
  const { name } = req.body;
  db.prepare('UPDATE tables SET name = ? WHERE id = ?').run(name, req.params.id);
  res.json({ success: true });
});

// ADMIN: delete a table
router.delete('/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM tables WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
