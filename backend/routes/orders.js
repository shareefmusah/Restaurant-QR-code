const express = require('express');
const { db } = require('../db/db');
const { requireAuth } = require('./auth');

const router = express.Router();

const VALID_STATUSES = ['pending', 'preparing', 'ready', 'served', 'cancelled'];

// PUBLIC: place a new order
router.post('/', (req, res) => {
  const { table_id, items, notes } = req.body;
  if (!table_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'table_id and at least one item are required' });
  }

  const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(table_id);
  if (!table) return res.status(404).json({ error: 'Invalid table' });

  // Look up authoritative prices server-side (never trust client price)
  const getItem = db.prepare('SELECT * FROM menu_items WHERE id = ? AND available = 1');
  let total = 0;
  const resolvedItems = [];
  for (const line of items) {
    const menuItem = getItem.get(line.menu_item_id);
    if (!menuItem) return res.status(400).json({ error: `Item ${line.menu_item_id} is not available` });
    const qty = Math.max(1, parseInt(line.quantity) || 1);
    total += menuItem.price * qty;
    resolvedItems.push({ menuItem, qty, item_notes: line.item_notes || '' });
  }

  const insertOrder = db.prepare('INSERT INTO orders (table_id, status, total, notes) VALUES (?, ?, ?, ?)');
  const orderInfo = insertOrder.run(table_id, 'pending', total, notes || '');
  const orderId = orderInfo.lastInsertRowid;

  const insertItem = db.prepare(`INSERT INTO order_items (order_id, menu_item_id, name_at_order, price_at_order, quantity, item_notes)
    VALUES (?, ?, ?, ?, ?, ?)`);
  for (const ri of resolvedItems) {
    insertItem.run(orderId, ri.menuItem.id, ri.menuItem.name, ri.menuItem.price, ri.qty, ri.item_notes);
  }

  const fullOrder = getOrderWithItems(orderId);

  const io = req.app.get('io');
  io.to('admin').emit('order:new', fullOrder);

  res.json(fullOrder);
});

// PUBLIC: get order status (customer polls or listens for their own order)
router.get('/:id', (req, res) => {
  const order = getOrderWithItems(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

// ADMIN: list orders, optionally filtered by status
router.get('/', requireAuth, (req, res) => {
  const { status } = req.query;
  let orderRows;
  if (status) {
    orderRows = db.prepare('SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC').all(status);
  } else {
    orderRows = db.prepare("SELECT * FROM orders WHERE status != 'served' AND status != 'cancelled' ORDER BY created_at ASC").all();
  }
  const full = orderRows.map(o => getOrderWithItems(o.id));
  res.json(full);
});

// ADMIN: update order status
router.put('/:id/status', requireAuth, (req, res) => {
  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  db.prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, req.params.id);
  const updated = getOrderWithItems(req.params.id);

  const io = req.app.get('io');
  io.to('admin').emit('order:updated', updated);
  io.to(`table:${order.table_id}`).emit('order:updated', updated);

  res.json(updated);
});

function getOrderWithItems(orderId) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return null;
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
  const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(order.table_id);
  return { ...order, table_name: table ? table.name : 'Unknown', items };
}

module.exports = router;
