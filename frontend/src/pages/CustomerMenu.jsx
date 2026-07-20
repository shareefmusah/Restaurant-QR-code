import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function CustomerMenu() {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const [table, setTable] = useState(null);
  const [menu, setMenu] = useState(null);
  const [error, setError] = useState('');
  const [cart, setCart] = useState({}); // { itemId: { item, qty, note } }
  const [cartOpen, setCartOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);

  useEffect(() => {
    api.getTable(tableId).then(setTable).catch(() => setError('This table code is not recognized. Ask a staff member for help.'));
    api.getMenu().then(data => {
      setMenu(data);
      if (data.categories.length) setActiveCategory(data.categories[0].id);
    }).catch(() => setError('Could not load the menu right now.'));
  }, [tableId]);

  const currency = menu?.restaurant?.currency || '$';

  const cartList = Object.values(cart);
  const cartCount = cartList.reduce((sum, c) => sum + c.qty, 0);
  const cartTotal = cartList.reduce((sum, c) => sum + c.qty * c.item.price, 0);

  function addToCart(item) {
    setCart(prev => {
      const existing = prev[item.id];
      return { ...prev, [item.id]: { item, qty: (existing?.qty || 0) + 1, note: existing?.note || '' } };
    });
  }

  function changeQty(itemId, delta) {
    setCart(prev => {
      const existing = prev[itemId];
      if (!existing) return prev;
      const newQty = existing.qty + delta;
      const next = { ...prev };
      if (newQty <= 0) delete next[itemId];
      else next[itemId] = { ...existing, qty: newQty };
      return next;
    });
  }

  async function placeOrder() {
    setPlacing(true);
    try {
      const items = cartList.map(c => ({ menu_item_id: c.item.id, quantity: c.qty, item_notes: c.note }));
      const order = await api.placeOrder({ table_id: tableId, items });
      navigate(`/order/${order.id}`);
    } catch (e) {
      setError(e.message || 'Could not place order. Please try again.');
      setPlacing(false);
    }
  }

  if (error) {
    return (
      <div className="menu-shell">
        <div className="empty-state">
          <p className="eyebrow">Order</p>
          <h1>Something's not right</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!table || !menu) {
    return <div className="menu-shell"><div className="loading-mark">Setting your table…</div></div>;
  }

  return (
    <div className="menu-shell">
      <header className="menu-header">
        <p className="eyebrow">{table.name}</p>
        <h1>{menu.restaurant.name}</h1>
        <p className="menu-subhead">Tap a dish to add it to your order. No account needed.</p>
      </header>

      <nav className="category-rail">
        {menu.categories.map(cat => (
          <button
            key={cat.id}
            className={`category-pill ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => {
              setActiveCategory(cat.id);
              document.getElementById(`cat-${cat.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          >
            {cat.name}
          </button>
        ))}
      </nav>

      <main className="menu-body">
        {menu.categories.map(cat => (
          <section key={cat.id} id={`cat-${cat.id}`} className="category-section">
            <h2>{cat.name}</h2>
            <div className="item-grid">
              {cat.items.map(item => {
                const inCart = cart[item.id];
                return (
                  <div className="dish-card" key={item.id}>
                    <div className="dish-info">
                      <h3>{item.name}</h3>
                      {item.description && <p className="dish-desc">{item.description}</p>}
                      <p className="dish-price">{currency}{item.price.toFixed(2)}</p>
                    </div>
                    {inCart ? (
                      <div className="qty-stepper">
                        <button onClick={() => changeQty(item.id, -1)} aria-label="Remove one">–</button>
                        <span>{inCart.qty}</span>
                        <button onClick={() => changeQty(item.id, 1)} aria-label="Add one">+</button>
                      </div>
                    ) : (
                      <button className="add-btn" onClick={() => addToCart(item)}>Add</button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </main>

      {cartCount > 0 && (
        <button className="cart-bar" onClick={() => setCartOpen(true)}>
          <span className="cart-bar-count">{cartCount} item{cartCount > 1 ? 's' : ''}</span>
          <span className="cart-bar-label">View order</span>
          <span className="cart-bar-total">{currency}{cartTotal.toFixed(2)}</span>
        </button>
      )}

      {cartOpen && (
        <div className="cart-overlay" onClick={() => setCartOpen(false)}>
          <div className="cart-sheet" onClick={e => e.stopPropagation()}>
            <div className="cart-sheet-header">
              <h2>Your order — {table.name}</h2>
              <button className="close-btn" onClick={() => setCartOpen(false)} aria-label="Close">×</button>
            </div>
            <div className="cart-items">
              {cartList.length === 0 && <p className="cart-empty">Your order is empty.</p>}
              {cartList.map(({ item, qty }) => (
                <div className="cart-row" key={item.id}>
                  <div>
                    <p className="cart-row-name">{item.name}</p>
                    <p className="cart-row-price">{currency}{item.price.toFixed(2)} each</p>
                  </div>
                  <div className="qty-stepper">
                    <button onClick={() => changeQty(item.id, -1)}>–</button>
                    <span>{qty}</span>
                    <button onClick={() => changeQty(item.id, 1)}>+</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="cart-total-row">
              <span>Total</span>
              <span>{currency}{cartTotal.toFixed(2)}</span>
            </div>
            <button className="place-order-btn" disabled={cartList.length === 0 || placing} onClick={placeOrder}>
              {placing ? 'Sending to kitchen…' : 'Place order · pay at counter'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
