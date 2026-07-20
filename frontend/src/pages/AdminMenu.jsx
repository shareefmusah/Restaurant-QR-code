import { useEffect, useState } from 'react';
import { api } from '../api';
import AdminLayout from '../components/AdminLayout';

export default function AdminMenu() {
  const [categories, setCategories] = useState([]);
  const [newCatName, setNewCatName] = useState('');
  const [editingItem, setEditingItem] = useState(null); // item object or 'new'
  const [editingCategoryId, setEditingCategoryId] = useState(null);

  function load() {
    api.getAdminMenu().then(data => setCategories(data.categories));
  }
  useEffect(load, []);

  async function addCategory(e) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    await api.createCategory({ name: newCatName.trim(), sort_order: categories.length + 1 });
    setNewCatName('');
    load();
  }

  async function removeCategory(id) {
    if (!confirm('Delete this category? Items in it will become uncategorized.')) return;
    await api.deleteCategory(id);
    load();
  }

  async function toggleAvailable(item) {
    await api.updateItem(item.id, { available: !item.available });
    load();
  }

  async function removeItem(id) {
    if (!confirm('Delete this menu item?')) return;
    await api.deleteItem(id);
    load();
  }

  return (
    <AdminLayout active="menu">
      <div className="dashboard-header">
        <h1>Menu</h1>
      </div>

      <form className="inline-form" onSubmit={addCategory}>
        <input placeholder="New category name (e.g. Desserts)" value={newCatName} onChange={e => setNewCatName(e.target.value)} />
        <button className="primary-btn" type="submit">Add category</button>
      </form>

      {categories.map(cat => (
        <section className="admin-category" key={cat.id}>
          <div className="admin-category-header">
            <h2>{cat.name}</h2>
            <div>
              <button className="text-btn" onClick={() => setEditingItem({ category_id: cat.id })}>+ Add item</button>
              <button className="text-btn danger" onClick={() => removeCategory(cat.id)}>Delete category</button>
            </div>
          </div>
          <div className="admin-item-table">
            {cat.items.length === 0 && <p className="board-empty">No items yet.</p>}
            {cat.items.map(item => (
              <div className="admin-item-row" key={item.id}>
                <div className="admin-item-info">
                  <p className="admin-item-name">{item.name}</p>
                  {item.description && <p className="admin-item-desc">{item.description}</p>}
                </div>
                <span className="admin-item-price">${item.price.toFixed(2)}</span>
                <label className="toggle">
                  <input type="checkbox" checked={!!item.available} onChange={() => toggleAvailable(item)} />
                  <span>{item.available ? 'Available' : 'Hidden'}</span>
                </label>
                <button className="text-btn" onClick={() => setEditingItem(item)}>Edit</button>
                <button className="text-btn danger" onClick={() => removeItem(item.id)}>Delete</button>
              </div>
            ))}
          </div>
        </section>
      ))}

      {editingItem && (
        <ItemEditorModal
          item={editingItem}
          categories={categories}
          onClose={() => setEditingItem(null)}
          onSaved={() => { setEditingItem(null); load(); }}
        />
      )}
    </AdminLayout>
  );
}

function ItemEditorModal({ item, categories, onClose, onSaved }) {
  const isNew = !item.id;
  const [name, setName] = useState(item.name || '');
  const [description, setDescription] = useState(item.description || '');
  const [price, setPrice] = useState(item.price ?? '');
  const [categoryId, setCategoryId] = useState(item.category_id || categories[0]?.id || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save(e) {
    e.preventDefault();
    if (!name.trim() || price === '' || isNaN(parseFloat(price))) {
      setError('Please enter a name and a valid price.');
      return;
    }
    setSaving(true);
    try {
      const body = { name: name.trim(), description, price: parseFloat(price), category_id: parseInt(categoryId) };
      if (isNew) await api.createItem(body);
      else await api.updateItem(item.id, body);
      onSaved();
    } catch (err) {
      setError(err.message || 'Could not save item.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="cart-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <h2>{isNew ? 'Add menu item' : 'Edit menu item'}</h2>
        <form onSubmit={save}>
          <label>Name<input value={name} onChange={e => setName(e.target.value)} autoFocus /></label>
          <label>Description<textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} /></label>
          <label>Price<input type="number" step="0.01" min="0" value={price} onChange={e => setPrice(e.target.value)} /></label>
          <label>Category
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="text-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
