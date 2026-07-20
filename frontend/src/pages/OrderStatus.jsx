import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { getSocket } from '../socket';

const STEPS = [
  { key: 'pending', label: 'Received' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready' },
  { key: 'served', label: 'Served' },
];

export default function OrderStatus() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getOrder(orderId).then(setOrder).catch(() => setError('Order not found.'));

    const socket = getSocket();
    if (!socket.connected) socket.connect();

    function onUpdate(updated) {
      if (String(updated.id) === String(orderId)) setOrder(updated);
    }
    socket.on('order:updated', onUpdate);

    // Join the table's room once we know the order (need table_id)
    api.getOrder(orderId).then(o => {
      socket.emit('join:table', o.table_id);
    }).catch(() => {});

    return () => socket.off('order:updated', onUpdate);
  }, [orderId]);

  if (error) return <div className="menu-shell"><div className="empty-state"><h1>Not found</h1><p>{error}</p></div></div>;
  if (!order) return <div className="menu-shell"><div className="loading-mark">Finding your order…</div></div>;

  const stepIndex = STEPS.findIndex(s => s.key === order.status);
  const cancelled = order.status === 'cancelled';

  return (
    <div className="menu-shell">
      <div className="ticket">
        <div className="ticket-notch left" />
        <div className="ticket-notch right" />
        <p className="eyebrow">Order ticket</p>
        <h1 className="ticket-number">#{String(order.id).padStart(4, '0')}</h1>
        <p className="ticket-table">{order.table_name}</p>

        {cancelled ? (
          <p className="ticket-cancelled">This order was cancelled. Please speak with staff.</p>
        ) : (
          <div className="status-track">
            {STEPS.map((step, i) => (
              <div key={step.key} className={`status-step ${i <= stepIndex ? 'done' : ''} ${i === stepIndex ? 'current' : ''}`}>
                <span className="status-dot" />
                <span className="status-label">{step.label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="ticket-divider" />

        <div className="ticket-items">
          {order.items.map(it => (
            <div className="ticket-line" key={it.id}>
              <span>{it.quantity}× {it.name_at_order}</span>
              <span>${(it.price_at_order * it.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="ticket-divider" />
        <div className="ticket-line total">
          <span>Total</span>
          <span>${order.total.toFixed(2)}</span>
        </div>
        <p className="ticket-note">Pay at the counter when your order is served.</p>
      </div>

      <Link to={`/menu/${order.table_id}`} className="back-link">← Order something else</Link>
    </div>
  );
}
