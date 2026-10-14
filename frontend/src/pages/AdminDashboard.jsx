import { useEffect, useState, useRef } from 'react';
import { api } from '../api';
import { getSocket } from '../socket';
import AdminLayout from '../components/AdminLayout';
import { Icon } from '../components/Icons';

const COLUMNS = [
  { key: 'pending', label: 'New', next: 'preparing', nextLabel: 'Start preparing' },
  { key: 'preparing', label: 'Preparing', next: 'ready', nextLabel: 'Mark ready' },
  { key: 'ready', label: 'Ready', next: 'served', nextLabel: 'Mark served' },
];

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [connected, setConnected] = useState(false);
  const audioCtxRef = useRef(null);

  // Initialize and unlock audio context
  function getAudioContext() {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }

  function playOrderChime() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;
      // 3-tone cheerful kitchen chime (D5 -> A5 -> D6) with natural bell decay
      const tones = [
        { freq: 587.33, start: 0, duration: 0.35, gain: 0.30 },
        { freq: 880.00, start: 0.12, duration: 0.40, gain: 0.35 },
        { freq: 1174.66, start: 0.25, duration: 0.65, gain: 0.40 },
      ];

      tones.forEach(({ freq, start, duration, gain: peakGain }) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + start);

        gainNode.gain.setValueAtTime(0.0001, now + start);
        gainNode.gain.linearRampToValueAtTime(peakGain, now + start + 0.015);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now + start);
        osc.stop(now + start + duration);
      });
    } catch {
      // Audio playback failed
    }
  }

  useEffect(() => {
    // Unlock Web Audio on user gesture
    function unlockAudio() {
      getAudioContext();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    }
    window.addEventListener('click', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });

    api.getOrders().then(setOrders).catch(() => {});

    const socket = getSocket();
    if (!socket.connected) socket.connect();

    function joinRoom() {
      const token = localStorage.getItem('admin_token');
      if (token) socket.emit('join:admin', token);
    }

    if (socket.connected) {
      joinRoom();
    }
    socket.on('connect', joinRoom);
    socket.on('joined:admin', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    function onNew(order) {
      setOrders(prev => {
        if (prev.some(o => o.id === order.id)) return prev;
        return [...prev, order];
      });
      playOrderChime();
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
      socket.off('connect', joinRoom);
      socket.off('joined:admin');
      socket.off('disconnect');
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  async function advance(order, nextStatus) {
    try {
      const updated = await api.updateOrderStatus(order.id, nextStatus);
      if (nextStatus === 'served' || nextStatus === 'cancelled') {
        setOrders(prev => prev.filter(o => o.id !== order.id));
      } else {
        setOrders(prev => prev.map(o => (o.id === order.id ? updated : o)));
      }
    } catch { /* ignore */ }
  }

  async function cancel(order) {
    if (!confirm(`Cancel order #${order.id}?`)) return;
    await advance(order, 'cancelled');
  }

  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const preparingCount = orders.filter(o => o.status === 'preparing').length;
  const readyCount = orders.filter(o => o.status === 'ready').length;

  return (
    <AdminLayout active="dashboard" orderCount={orders.length}>
      <div className="dashboard-header">
        <div className="dashboard-header-title-box">
          <h1>Live orders</h1>
          <p className="page-subheading">Real-time floor &amp; kitchen management dispatch</p>
        </div>
        <div className="dashboard-header-actions">
          <span className={`conn-badge ${connected ? 'on' : 'off'}`}>
            <span className="live-dot-mini" /> {connected ? 'Terminal Live' : 'Connecting…'}
          </span>
        </div>
      </div>

      {/* Prominent Red Banner with Number of Orders */}
      <div className={`live-orders-red-banner ${orders.length > 0 ? 'active-pulse' : 'idle'}`}>
        <div className="red-banner-left">
          <div className="red-banner-icon-badge">
            <span className="red-banner-pulse-dot" />
            <Icon name="bell" size={20} />
          </div>
          <div className="red-banner-text-group">
            <div className="red-banner-headline">
              <span className="red-banner-title">
                {orders.length === 0 ? 'LIVE ORDERS SCREEN · KITCHEN READY' : 'LIVE ORDERS SCREEN · ACTION REQUIRED'}
              </span>
            </div>
            <p className="red-banner-subtitle">
              {orders.length === 0 ? (
                'No pending orders right now. Sound chime is armed for incoming orders.'
              ) : (
                <span>
                  <strong>{pendingCount}</strong> New · <strong>{preparingCount}</strong> Preparing · <strong>{readyCount}</strong> Ready for Table Service
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="red-banner-right">
          <div className="red-banner-badge" title="Total active kitchen orders">
            <span className="badge-count-number">{orders.length}</span>
            <span className="badge-count-label">{orders.length === 1 ? 'ORDER' : 'ORDERS'}</span>
          </div>
          <button
            type="button"
            className="sound-test-btn"
            onClick={playOrderChime}
            title="Click to test order bell sound"
          >
            <Icon name="volume2" size={15} />
            <span>Test Sound</span>
          </button>
        </div>
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
                    <div className="order-card-total">GH₵{order.total.toFixed(2)}</div>
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
