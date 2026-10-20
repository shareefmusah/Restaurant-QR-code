import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { getSocket } from '../socket';
import { Icon } from '../components/Icons';
import { ThemeToggle } from '../components/ThemeToggle';

const STEPS = [
  { key: 'pending', label: 'Received', icon: 'clipboardList', desc: 'Order received by kitchen staff' },
  { key: 'preparing', label: 'Preparing', icon: 'utensils', desc: 'Chef is crafting your dishes' },
  { key: 'ready', label: 'Ready', icon: 'sparkles', desc: 'Prepared and being plated for serving' },
  { key: 'served', label: 'Served', icon: 'checkCircle', desc: 'Dishes served to your table' },
];

export default function OrderStatus() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [socketLive, setSocketLive] = useState(false);

  useEffect(() => {
    api.getOrder(orderId)
      .then(setOrder)
      .catch(() => setError('Order not found or has expired.'));

    const socket = getSocket();
    if (!socket.connected) socket.connect();

    function onConnect() {
      setSocketLive(true);
    }
    socket.on('connect', onConnect);
    if (socket.connected) setSocketLive(true);

    function onUpdate(updated) {
      if (String(updated.id) === String(orderId)) {
        setOrder(updated);
      }
    }
    socket.on('order:updated', onUpdate);

    api.getOrder(orderId).then(o => {
      socket.emit('join:table', o.table_id);
    }).catch(() => {});

    return () => {
      socket.off('order:updated', onUpdate);
      socket.off('connect', onConnect);
    };
  }, [orderId]);

  if (error) {
    return (
      <div className="menu-shell">
        <div className="empty-state">
          <div className="error-icon-shield">!</div>
          <p className="eyebrow-luxury">Swiss Gardens</p>
          <h1>Order Not Found</h1>
          <p className="empty-state-desc">{error}</p>
          <div className="empty-state-actions">
            <Link to="/" className="primary-btn-link">Return to Home</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="menu-shell">
        <div className="loading-mark">
          <div className="luxury-spinner" />
          <p className="loading-title">Retrieving Order #{String(orderId).padStart(4, '0')}</p>
          <span className="loading-sub">Connecting to kitchen terminal…</span>
        </div>
      </div>
    );
  }

  const stepIndex = STEPS.findIndex(s => s.key === order.status);
  const cancelled = order.status === 'cancelled';
  const currentStep = STEPS[stepIndex] || STEPS[0];

  return (
    <div className="menu-shell">
      {/* Top Bar */}
      <div className="luxury-top-strip">
        <div className="restaurant-badge">
          <span className="crest-mark">SG</span>
          <span className="restaurant-name">Swiss Gardens</span>
        </div>
        <div className="top-strip-actions">
          <div className="table-live-pill">
            <span className={`live-indicator-dot ${socketLive ? 'active' : ''}`} />
            <span className="table-live-label">{order.table_name || 'Table Order'}</span>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <div className="ticket-wrapper">
        <div className="lux-ticket">
          {/* Decorative notches */}
          <div className="ticket-notch-hole left" />
          <div className="ticket-notch-hole right" />

          {/* Ticket Crest Header */}
          <div className="ticket-header-block">
            <div className="ticket-crest-seal">
              <span>SG</span>
            </div>
            <p className="eyebrow-luxury">Official Table Receipt</p>
            <h1 className="ticket-order-id">#{String(order.id).padStart(4, '0')}</h1>
            <p className="ticket-table-badge">{order.table_name}</p>
            <span className="ticket-time-stamp">
              {new Date(order.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {cancelled ? (
            <div className="ticket-cancelled-banner">
              <span className="cancelled-icon"><Icon name="alertTriangle" size={28} /></span>
              <p className="cancelled-title">Order Cancelled</p>
              <p className="cancelled-sub">This ticket has been cancelled. Please speak with floor staff for assistance.</p>
            </div>
          ) : (
            <div className="order-live-progress-card">
              <div className="current-status-banner">
                <span className="current-status-icon"><Icon name={currentStep.icon} size={28} /></span>
                <div className="current-status-texts">
                  <span className="status-current-badge">{currentStep.label}</span>
                  <p className="status-current-desc">{currentStep.desc}</p>
                </div>
              </div>

              {/* Progress Stepper Track */}
              <div className="ticket-stepper-track">
                {STEPS.map((step, i) => {
                  const isDone = i <= stepIndex;
                  const isCurrent = i === stepIndex;
                  return (
                    <div key={step.key} className={`stepper-node ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}>
                      <div className="stepper-dot-outer">
                        <div className="stepper-dot-inner" />
                        {isCurrent && <div className="stepper-pulse-ring" />}
                      </div>
                      <span className="stepper-node-label">{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="ticket-dashed-line" />

          {/* Order Items */}
          <div className="ticket-item-stream">
            <div className="ticket-table-columns-header">
              <span>Item &amp; Details</span>
              <span>Subtotal</span>
            </div>
            {order.items.map(it => (
              <div className="ticket-item-row" key={it.id}>
                <div className="ticket-item-info">
                  <div className="ticket-item-name-line">
                    <span className="item-qty-badge">{it.quantity}×</span>
                    <span className="item-name-text">{it.name_at_order}</span>
                  </div>
                  {it.item_notes && (
                    <p className="ticket-item-notes">Note: “{it.item_notes}”</p>
                  )}
                </div>
                <span className="ticket-item-amount">
                  GH₵{(it.price_at_order * it.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Order General Notes */}
          {order.notes && (
            <div className="ticket-general-note">
              <span className="note-label">Kitchen Note:</span>
              <p className="note-text">“{order.notes}”</p>
            </div>
          )}

          <div className="ticket-dashed-line" />

          {/* Totals & Payment Reassurance */}
          <div className="ticket-grand-total-row">
            <span>Total Payable</span>
            <span className="ticket-gold-price">GH₵{order.total.toFixed(2)}</span>
          </div>

          <div className="ticket-instructions-card">
            <p className="ticket-instructions-title">
              <Icon name="creditCard" size={16} style={{ marginRight: '6px', verticalAlign: '-2px' }} />
              Counter / Table Payment
            </p>
            <p className="ticket-instructions-sub">
              Your server will attend to your table shortly. You may settle by cash, card, or mobile money upon service.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Return Button */}
      <div className="ticket-back-actions">
        <Link to={`/menu/${order.table_id}`} className="order-more-btn">
          <span><Icon name="plus" size={14} style={{ marginRight: '4px', verticalAlign: '-1px' }} /> Add more dishes for {order.table_name}</span>
        </Link>
        <Link to="/" className="home-link-subtle">
          Return to Dining Portal
        </Link>
      </div>
    </div>
  );
}
