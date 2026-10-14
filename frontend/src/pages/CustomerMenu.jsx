import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { Icon } from '../components/Icons';

const DEFAULT_IMAGES = {
  'spring rolls': '/images/spring_rolls.jpg',
  'chicken wings': '/images/chicken_wings.jpg',
  'jollof rice & chicken': '/images/jollof_rice_chicken.jpg',
  'jollof rice': '/images/jollof_rice_chicken.jpg',
  'grilled tilapia': '/images/grilled_tilapia.jpg',
  'tilapia': '/images/grilled_tilapia.jpg',
  'beef burger': '/images/beef_burger.jpg',
  'burger': '/images/beef_burger.jpg',
  'chocolate cake': '/images/chocolate_cake.jpg',
  'cake': '/images/chocolate_cake.jpg',
};

const ITEM_BADGES = {
  'spring rolls': ['Crispy', 'Popular'],
  'chicken wings': ['Spicy', "Chef's Pick"],
  'jollof rice & chicken': ['Signature', 'Best Seller'],
  'grilled tilapia': ['Fresh Catch', "Chef's Pick"],
  'beef burger': ['Wagyu Smash', 'Artisan'],
  'chocolate cake': ['Decadent', 'House Made'],
  'fresh juice': ['Cold Pressed', 'Fresh Citrus'],
  'bottled water': ['Chilled Spring']
};

export default function CustomerMenu() {
  const { tableId } = useParams();
  const navigate = useNavigate();

  const [table, setTable] = useState(null);
  const [menu, setMenu] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Cart state: { [itemId]: { item, qty, note } }
  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [placing, setPlacing] = useState(false);

  // Filters & Search
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');

  // Modal for Dish Details & Custom Notes
  const [detailItem, setDetailItem] = useState(null);
  const [detailNote, setDetailNote] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getTable(tableId).catch(() => null),
      api.getMenu().catch(() => null),
    ])
      .then(([tableData, menuData]) => {
        if (!tableData) {
          setError('This table code is not recognized. Please scan the QR code on your table again or ask a server.');
        } else {
          setTable(tableData);
        }

        if (!menuData) {
          setError('Could not load the menu. Please check your connection and refresh.');
        } else {
          setMenu(menuData);
          if (menuData.categories?.length) {
            setActiveCategory(menuData.categories[0].id);
          }
        }
      })
      .finally(() => setLoading(false));
  }, [tableId]);

  const currency = menu?.restaurant?.currency || 'GH₵';

  const cartList = useMemo(() => Object.values(cart), [cart]);
  const cartCount = useMemo(() => cartList.reduce((sum, c) => sum + c.qty, 0), [cartList]);
  const cartTotal = useMemo(() => cartList.reduce((sum, c) => sum + c.qty * c.item.price, 0), [cartList]);

  function getItemImage(item) {
    if (item.image_url && item.image_url.trim()) return item.image_url;
    const lower = item.name.toLowerCase().trim();
    for (const [key, path] of Object.entries(DEFAULT_IMAGES)) {
      if (lower.includes(key)) return path;
    }
    return null;
  }

  function getItemBadges(item) {
    const lower = item.name.toLowerCase().trim();
    for (const [key, badges] of Object.entries(ITEM_BADGES)) {
      if (lower.includes(key)) return badges;
    }
    return [];
  }

  function addToCart(item, customNote = '') {
    setCart(prev => {
      const existing = prev[item.id];
      return {
        ...prev,
        [item.id]: {
          item,
          qty: (existing?.qty || 0) + 1,
          note: customNote || existing?.note || ''
        }
      };
    });
  }

  function changeQty(itemId, delta) {
    setCart(prev => {
      const existing = prev[itemId];
      if (!existing) return prev;
      const newQty = existing.qty + delta;
      const next = { ...prev };
      if (newQty <= 0) {
        delete next[itemId];
      } else {
        next[itemId] = { ...existing, qty: newQty };
      }
      return next;
    });
  }

  function updateItemNote(itemId, note) {
    setCart(prev => {
      const existing = prev[itemId];
      if (!existing) return prev;
      return {
        ...prev,
        [itemId]: { ...existing, note }
      };
    });
  }

  function openItemDetails(item) {
    const existing = cart[item.id];
    setDetailItem(item);
    setDetailNote(existing?.note || '');
  }

  async function placeOrder() {
    if (cartList.length === 0 || placing) return;
    setPlacing(true);
    try {
      const items = cartList.map(c => ({
        menu_item_id: c.item.id,
        quantity: c.qty,
        item_notes: c.note || ''
      }));

      const order = await api.placeOrder({
        table_id: tableId,
        items,
        notes: orderNotes
      });

      navigate(`/order/${order.id}`);
    } catch (e) {
      setError(e.message || 'Could not place order. Please try again.');
      setPlacing(false);
    }
  }

  // Filtered categories and dishes
  const filteredCategories = useMemo(() => {
    if (!menu?.categories) return [];
    const query = searchQuery.trim().toLowerCase();

    return menu.categories.map(cat => {
      const matchingItems = cat.items.filter(item => {
        const matchesQuery = !query || 
          item.name.toLowerCase().includes(query) || 
          (item.description && item.description.toLowerCase().includes(query));

        if (!matchesQuery) return false;

        if (selectedTag === 'all') return true;
        const badges = getItemBadges(item).map(b => b.toLowerCase());
        if (selectedTag === 'popular') return badges.some(b => b.includes('popular') || b.includes('best seller'));
        if (selectedTag === 'spicy') return badges.some(b => b.includes('spicy'));
        if (selectedTag === 'special') return badges.some(b => b.includes('chef') || b.includes('signature'));
        return true;
      });

      return {
        ...cat,
        items: matchingItems
      };
    }).filter(cat => cat.items.length > 0);
  }, [menu, searchQuery, selectedTag]);

  if (error) {
    return (
      <div className="menu-shell">
        <div className="empty-state">
          <div className="error-icon-shield">!</div>
          <p className="eyebrow">Swiss Gardens</p>
          <h1>Table Assistance Needed</h1>
          <p className="empty-state-desc">{error}</p>
          <div className="empty-state-actions">
            <Link to="/" className="primary-btn-link">Return to Dining Home</Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !table || !menu) {
    return (
      <div className="menu-shell">
        <div className="loading-mark">
          <div className="luxury-spinner" />
          <p className="loading-title">Setting Your Table</p>
          <span className="loading-sub">Preparing today's artisanal menu…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="menu-shell">
      {/* Top Ambient Bar */}
      <div className="luxury-top-strip">
        <div className="restaurant-badge">
          <span className="crest-mark">SG</span>
          <span className="restaurant-name">{menu.restaurant.name}</span>
        </div>
        <div className="table-live-pill">
          <span className="live-indicator-dot" />
          <span className="table-live-label">{table.name}</span>
        </div>
      </div>

      {/* Hero Welcome Header */}
      <header className="menu-hero-header">
        <div className="menu-hero-content">
          <p className="eyebrow-luxury">Artisanal Fine Dining · Table Experience</p>
          <h1 className="menu-hero-title">Culinary Craftsmanship</h1>
          <p className="menu-hero-subtitle">
            Explore our curated creations. Tap any dish to order fresh to <strong className="gold-highlight">{table.name}</strong>.
          </p>
        </div>

        {/* Search & Discovery Bar */}
        <div className="search-box-wrap">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Search dishes, drinks, ingredients…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="search-clear-btn" onClick={() => setSearchQuery('')} aria-label="Clear search">
              <Icon name="x" size={14} />
            </button>
          )}
        </div>

        {/* Quick Tag Pills */}
        <div className="tag-filter-rail">
          {[
            { id: 'all', label: 'All Dishes', icon: 'layoutGrid' },
            { id: 'popular', label: 'Popular', icon: 'flame' },
            { id: 'special', label: "Chef's Choice", icon: 'star' },
            { id: 'spicy', label: 'Spicy', icon: 'zap' },
          ].map(tag => (
            <button
              key={tag.id}
              className={`tag-filter-pill ${selectedTag === tag.id ? 'active' : ''}`}
              onClick={() => setSelectedTag(tag.id)}
            >
              <Icon name={tag.icon} size={13} style={{ marginRight: '6px' }} />
              {tag.label}
            </button>
          ))}
        </div>
      </header>

      {/* Sticky Category Navigation */}
      <nav className="category-rail-sticky">
        {menu.categories.map(cat => {
          const hasItems = filteredCategories.some(fc => fc.id === cat.id);
          return (
            <button
              key={cat.id}
              disabled={!hasItems}
              className={`category-pill-lux ${activeCategory === cat.id ? 'active' : ''} ${!hasItems ? 'disabled' : ''}`}
              onClick={() => {
                setActiveCategory(cat.id);
                const el = document.getElementById(`category-${cat.id}`);
                if (el) {
                  const yOffset = -90;
                  const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
                  window.scrollTo({ top: y, behavior: 'smooth' });
                }
              }}
            >
              {cat.name}
            </button>
          );
        })}
      </nav>

      {/* Menu Categories & Dish Cards */}
      <main className="menu-body-lux">
        {filteredCategories.length === 0 ? (
          <div className="no-results-panel">
            <p className="no-results-icon"><Icon name="utensils" size={36} /></p>
            <h3>No culinary items found</h3>
            <p>Try searching for a different dish name or reset your filter.</p>
            <button className="reset-filter-btn" onClick={() => { setSearchQuery(''); setSelectedTag('all'); }}>
              Reset Filters
            </button>
          </div>
        ) : (
          filteredCategories.map(cat => (
            <section key={cat.id} id={`category-${cat.id}`} className="lux-category-section">
              <div className="category-heading-wrap">
                <h2 className="category-title">{cat.name}</h2>
                <span className="category-item-count">{cat.items.length} {cat.items.length === 1 ? 'dish' : 'dishes'}</span>
              </div>

              <div className="dish-card-grid">
                {cat.items.map(item => {
                  const inCart = cart[item.id];
                  const imgUrl = getItemImage(item);
                  const badges = getItemBadges(item);

                  return (
                    <article className="lux-dish-card" key={item.id}>
                      {/* Dish Image Banner */}
                      <div className="dish-media-wrap" onClick={() => openItemDetails(item)}>
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={item.name}
                            className="dish-media-img"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.parentElement.classList.add('dish-media-fallback');
                            }}
                          />
                        ) : (
                          <div className="dish-media-placeholder">
                            <span className="dish-placeholder-icon"><Icon name="sparkles" size={24} /></span>
                            <span className="dish-placeholder-label">Signature</span>
                          </div>
                        )}
                        <div className="dish-media-overlay" />
                        
                        {/* Badges on image */}
                        {badges.length > 0 && (
                          <div className="dish-badge-strip">
                            {badges.map((b, idx) => (
                              <span key={idx} className="dish-badge-pill">{b}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Dish Details */}
                      <div className="dish-details-content">
                        <div className="dish-title-row" onClick={() => openItemDetails(item)}>
                          <h3 className="dish-name">{item.name}</h3>
                          <span className="dish-price-tag">
                            {currency}{item.price.toFixed(2)}
                          </span>
                        </div>

                        {item.description && (
                          <p className="dish-description" onClick={() => openItemDetails(item)}>
                            {item.description}
                          </p>
                        )}

                        {/* Special Note pill if added */}
                        {inCart?.note && (
                          <div className="dish-note-pill" onClick={() => openItemDetails(item)}>
                            <span className="note-icon"><Icon name="pencil" size={12} /></span>
                            <span className="note-text">"{inCart.note}"</span>
                          </div>
                        )}

                        {/* Card Footer Actions */}
                        <div className="dish-action-row">
                          <button
                            type="button"
                            className="dish-customize-btn"
                            onClick={() => openItemDetails(item)}
                            title="Add special instructions"
                          >
                            <span>Special Note</span>
                          </button>

                          {inCart ? (
                            <div className="lux-qty-stepper">
                              <button
                                type="button"
                                className="stepper-btn minus"
                                onClick={() => changeQty(item.id, -1)}
                                aria-label="Decrease quantity"
                              >
                                –
                              </button>
                              <span className="stepper-val">{inCart.qty}</span>
                              <button
                                type="button"
                                className="stepper-btn plus"
                                onClick={() => changeQty(item.id, 1)}
                                aria-label="Increase quantity"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="lux-add-btn"
                              onClick={() => addToCart(item)}
                            >
                              <span className="plus-symbol">+</span> Add
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </main>

      {/* Floating Bottom Cart Bar */}
      {cartCount > 0 && (
        <aside className="floating-cart-anchor">
          <button
            type="button"
            className="floating-cart-pill"
            onClick={() => setCartOpen(true)}
            aria-label="View current order"
          >
            <div className="cart-pill-left">
              <span className="cart-badge-count">{cartCount}</span>
              <div className="cart-pill-titles">
                <span className="cart-pill-title">View Your Order</span>
                <span className="cart-pill-subtitle">{table.name}</span>
              </div>
            </div>
            <div className="cart-pill-right">
              <span className="cart-pill-total">{currency}{cartTotal.toFixed(2)}</span>
              <svg className="cart-pill-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </div>
          </button>
        </aside>
      )}

      {/* Cart Drawer Bottom Sheet */}
      {cartOpen && (
        <div className="cart-overlay-blur" onClick={() => setCartOpen(false)}>
          <div className="cart-sheet-lux" onClick={e => e.stopPropagation()}>
            <div className="sheet-drag-handle" />

            <div className="cart-sheet-header-lux">
              <div className="cart-header-title-box">
                <p className="eyebrow-sheet">Dining Ticket</p>
                <h2>Order Review · {table.name}</h2>
              </div>
              <button
                type="button"
                className="sheet-close-btn"
                onClick={() => setCartOpen(false)}
                aria-label="Close cart"
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            <div className="cart-scroll-body">
              {cartList.length === 0 ? (
                <div className="cart-empty-lux">
                  <p className="cart-empty-icon"><Icon name="shoppingBag" size={36} /></p>
                  <p>Your order ticket is currently empty.</p>
                </div>
              ) : (
                <div className="cart-items-stream">
                  {cartList.map(({ item, qty, note }) => {
                    const imgUrl = getItemImage(item);
                    return (
                      <div className="cart-row-lux" key={item.id}>
                        {imgUrl && (
                          <img src={imgUrl} alt={item.name} className="cart-item-thumb" />
                        )}
                        <div className="cart-item-main">
                          <div className="cart-row-top">
                            <span className="cart-row-name-text">{item.name}</span>
                            <span className="cart-row-price-text">
                              {currency}{(item.price * qty).toFixed(2)}
                            </span>
                          </div>
                          <span className="cart-row-unit-price">
                            {currency}{item.price.toFixed(2)} each
                          </span>

                          {/* Editable note */}
                          <div className="cart-item-note-row">
                            <input
                              type="text"
                              className="cart-note-input"
                              placeholder="Add special instructions (e.g. no onions)…"
                              value={note || ''}
                              onChange={e => updateItemNote(item.id, e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="lux-qty-stepper compact">
                          <button
                            type="button"
                            className="stepper-btn minus"
                            onClick={() => changeQty(item.id, -1)}
                          >
                            –
                          </button>
                          <span className="stepper-val">{qty}</span>
                          <button
                            type="button"
                            className="stepper-btn plus"
                            onClick={() => changeQty(item.id, 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Kitchen Instruction Box */}
              <div className="order-kitchen-notes-section">
                <label htmlFor="general-order-note" className="kitchen-notes-label">
                  Special Kitchen Note for {table.name}
                </label>
                <textarea
                  id="general-order-note"
                  rows={2}
                  className="kitchen-notes-textarea"
                  placeholder="E.g. Please bring drinks first, extra napkins, allergies…"
                  value={orderNotes}
                  onChange={e => setOrderNotes(e.target.value)}
                />
              </div>

              {/* Receipt Summary */}
              <div className="cart-breakdown-box">
                <div className="breakdown-line">
                  <span>Selected Dishes ({cartCount})</span>
                  <span>{currency}{cartTotal.toFixed(2)}</span>
                </div>
                <div className="breakdown-line">
                  <span>Table Service</span>
                  <span className="service-free">Complimentary</span>
                </div>
                <div className="breakdown-line">
                  <span>Estimated Kitchen Prep</span>
                  <span className="service-time">~15–20 mins</span>
                </div>
                <div className="breakdown-divider-dashed" />
                <div className="breakdown-line grand-total">
                  <span>Total Amount</span>
                  <span className="total-gold-number">{currency}{cartTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Submit Bar */}
            <div className="cart-footer-cta-block">
              <button
                type="button"
                className="place-order-lux-btn"
                disabled={cartList.length === 0 || placing}
                onClick={placeOrder}
              >
                {placing ? (
                  <span className="btn-spinner-wrap">
                    <span className="mini-spinner" />
                    Sending to Kitchen…
                  </span>
                ) : (
                  <span className="btn-content-wrap">
                    <span>Send Order to Kitchen</span>
                    <span className="btn-gold-arrow"><Icon name="arrowRight" size={14} /></span>
                  </span>
                )}
              </button>
              <p className="pay-reassurance-text">
                <Icon name="check" size={14} style={{ marginRight: '6px', verticalAlign: '-1px' }} />
                Pay at counter or server when your food is served
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Dish Detail & Customization Modal */}
      {detailItem && (
        <div className="modal-backdrop-blur" onClick={() => setDetailItem(null)}>
          <div className="dish-modal-sheet" onClick={e => e.stopPropagation()}>
            {getItemImage(detailItem) && (
              <div className="modal-hero-image-wrap">
                <img
                  src={getItemImage(detailItem)}
                  alt={detailItem.name}
                  className="modal-hero-img"
                />
                <div className="modal-image-gradient" />
              </div>
            )}

            <button
              type="button"
              className="modal-close-icon"
              onClick={() => setDetailItem(null)}
              aria-label="Close dish preview"
            >
              <Icon name="x" size={18} />
            </button>

            <div className="modal-content-pad">
              <div className="modal-title-price-row">
                <h2>{detailItem.name}</h2>
                <span className="modal-price-tag">
                  {currency}{detailItem.price.toFixed(2)}
                </span>
              </div>

              {detailItem.description && (
                <p className="modal-dish-desc">{detailItem.description}</p>
              )}

              {/* Badges */}
              <div className="modal-badges-row">
                {getItemBadges(detailItem).map((b, i) => (
                  <span key={i} className="dish-badge-pill">{b}</span>
                ))}
              </div>

              {/* Special Instructions Note */}
              <div className="modal-notes-field">
                <label className="modal-field-label">
                  Special Preparation / Instructions
                </label>
                <input
                  type="text"
                  className="modal-note-input"
                  placeholder="e.g. Extra spicy, no onions, sauce on the side"
                  value={detailNote}
                  onChange={e => setDetailNote(e.target.value)}
                />
              </div>

              <div className="modal-cta-row">
                <button
                  type="button"
                  className="modal-add-btn"
                  onClick={() => {
                    addToCart(detailItem, detailNote);
                    setDetailItem(null);
                  }}
                >
                  Add to Order · {currency}{detailItem.price.toFixed(2)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
