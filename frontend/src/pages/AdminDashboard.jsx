import { useEffect, useState, useRef } from 'react';
import { api } from '../api';
import { getSocket } from '../socket';
import AdminLayout from '../components/AdminLayout';

const COLUMNS = [
  { key: 'pending', label: 'New', next: 'preparing', nextLabel: 'Start preparing' },
  { key: 'preparing', label: 'Preparing', next: 'ready', nextLabel: 'Mark ready' },
  { key: 'ready', label: 'Ready', next: 'served', nextLabel: 'Mark served' },
];

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [connected, setConnected] = useState(false);
  const dingRef = useRef(null);

  useEffect(() => {
    api.getOrders().then(setOrders).catch(() => {});

    const socket = getSocket();
    if (!socket.connected) socket.connect();
    const token = localStorage.getItem('admin_token');
    socket.emit('join:admin', token);
    socket.on('joined:admin', () => setConnected(true));

    function onNew(order) {
      setOrders(prev => [...prev, order]);
      playDing();
    }
    function onUpdate(updated) {
      setOrders(prev => {
        if (updated.status === 'served' || updated.status === 'cancelled') {
          return prev.filter(o => o.id !== updated.id);
        }
        return prev.map(o => (o.id === updated.id ? updated : o));
      });
    }
    socket.on('order:new', onNew);
    socket.on('order:updated', onUpdate);

    return () => {
      socket.off('order:new', onNew);
      socket.off('order:updated', onUpdate);
      socket.off('joined:admin');
    };
  }, []);

  function playDing() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) { /* ignore */ }
  }

  async function advance(order, nextStatus) {
    try {
      const updated = await api.updateOrderStatus(order.id, nextStatus);
      if (nextStatus === 'served' || nextStatus === 'cancelled') {
        setOrders(prev => prev.filter(o => o.id !== order.id));
      } else {
        setOrders(prev => prev.map(o => (o.id === order.id ? updated : o)));
      }
    } catch (e) { /* ignore */ }
  }

  async function cancel(order) {
    if (!confirm(`Cancel order #${order.id}?`)) return;
    await advance(order, 'cancelled');
  }

  return (
    <AdminLayout active="dashboard">
      <div className="dashboard-header">
        <h1>Live orders</h1>
        <span className={`conn-badge ${connected ? 'on' : 'off'}`}>{connected ? 'Live' : 'Connecting…'}</span>
      </div>

      <div className="board">
        {COLUMNS.map(col => {
          const colOrders = orders.filter(o => o.status === col.key).sort((a, b) => a.id - b.id);
          return (
            <div className="board-column" key={col.key}>
              <div className="board-column-header">
                <h2>{col.label}</h2>
                <span className="board-count">{colOrders.length}</span>
              </div>
              <div className="board-column-body">
                {colOrders.length === 0 && <p className="board-empty">Nothing here.</p>}
                {colOrders.map(order => (
                  <div className="order-card" key={order.id}>
                    <div className="order-card-head">
                      <span className="order-card-number">#{String(order.id).padStart(4, '0')}</span>
                      <span className="order-card-table">{order.table_name}</span>
                    </div>
                    <ul className="order-card-items">
                      {order.items.map(it => (
                        <li key={it.id}>
                          <span>{it.quantity}× {it.name_at_order}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="order-card-total">${order.total.toFixed(2)}</div>
                    <div className="order-card-actions">
                      <button className="advance-btn" onClick={() => advance(order, col.next)}>{col.nextLabel}</button>
                      {col.key === 'pending' && (
                        <button className="cancel-btn" onClick={() => cancel(order)}>Cancel</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </AdminLayout>
  );
}
