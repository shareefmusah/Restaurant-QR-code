const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(path, options = {}) {
  const token = localStorage.getItem('admin_token');
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token && path.includes('/admin') === false) {
    // attach token generally for admin-protected routes; harmless on public ones
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  base: API_BASE,
  getMenu: () => request('/api/menu'),
  getAdminMenu: () => request('/api/menu/admin'),
  createCategory: (body) => request('/api/menu/categories', { method: 'POST', body: JSON.stringify(body) }),
  updateCategory: (id, body) => request(`/api/menu/categories/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCategory: (id) => request(`/api/menu/categories/${id}`, { method: 'DELETE' }),
  createItem: (body) => request('/api/menu/items', { method: 'POST', body: JSON.stringify(body) }),
  updateItem: (id, body) => request(`/api/menu/items/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteItem: (id) => request(`/api/menu/items/${id}`, { method: 'DELETE' }),

  getTable: (id) => request(`/api/tables/${id}`),
  getTables: () => request('/api/tables'),
  createTable: (body) => request('/api/tables', { method: 'POST', body: JSON.stringify(body) }),
  updateTable: (id, body) => request(`/api/tables/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTable: (id) => request(`/api/tables/${id}`, { method: 'DELETE' }),

  placeOrder: (body) => request('/api/orders', { method: 'POST', body: JSON.stringify(body) }),
  getOrder: (id) => request(`/api/orders/${id}`),
  getOrders: (status) => request(`/api/orders${status ? `?status=${status}` : ''}`),
  updateOrderStatus: (id, status) => request(`/api/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),

  login: (username, password) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
};
