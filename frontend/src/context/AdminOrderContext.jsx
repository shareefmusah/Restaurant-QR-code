import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { api } from '../api';
import { getSocket } from '../socket';

const AdminOrderContext = createContext(null);

export function AdminOrderProvider({ children }) {
  const [orders, setOrders] = useState([]);
  const [connected, setConnected] = useState(false);
  const [newOrderToast, setNewOrderToast] = useState(null);
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
        { freq: 587.33, start: 0, duration: 0.35, gain: 0.40 },
        { freq: 880.00, start: 0.12, duration: 0.40, gain: 0.50 },
        { freq: 1174.66, start: 0.25, duration: 0.70, gain: 0.60 },
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
    // Unlock Web Audio on any user gesture
    function unlockAudio() {
      getAudioContext();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    }
    window.addEventListener('click', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });

    // Initial fetch
    api.getOrders().then(setOrders).catch(() => {});

    const socket = getSocket();
    if (!socket.connected) socket.connect();

    function joinRoom() {
      const token = localStorage.getItem('admin_token');
      socket.emit('join:admin', token);
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
      setNewOrderToast(order);
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

    // Continuous 3.5s polling fallback so no order is ever missed
    const pollInterval = setInterval(() => {
      api.getOrders().then(latestOrders => {
        setOrders(prev => {
          const prevIds = new Set(prev.map(o => o.id));
          const hasNew = latestOrders.some(o => !prevIds.has(o.id) && o.status === 'pending');
          if (hasNew) {
            playOrderChime();
            const newest = latestOrders.find(o => !prevIds.has(o.id) && o.status === 'pending');
            if (newest) setNewOrderToast(newest);
          }
          return latestOrders;
        });
      }).catch(() => {});
    }, 3500);

    return () => {
      clearInterval(pollInterval);
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

  async function advanceOrder(order, nextStatus) {
    try {
      const updated = await api.updateOrderStatus(order.id, nextStatus);
      if (nextStatus === 'served' || nextStatus === 'cancelled') {
        setOrders(prev => prev.filter(o => o.id !== order.id));
      } else {
        setOrders(prev => prev.map(o => (o.id === order.id ? updated : o)));
      }
    } catch { /* ignore */ }
  }

  async function cancelOrder(order) {
    if (!confirm(`Cancel order #${order.id}?`)) return;
    await advanceOrder(order, 'cancelled');
  }

  const orderCount = orders.length;
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const preparingCount = orders.filter(o => o.status === 'preparing').length;
  const readyCount = orders.filter(o => o.status === 'ready').length;

  return (
    <AdminOrderContext.Provider
      value={{
        orders,
        orderCount,
        pendingCount,
        preparingCount,
        readyCount,
        connected,
        playOrderChime,
        advanceOrder,
        cancelOrder,
        newOrderToast,
        setNewOrderToast,
      }}
    >
      {children}
    </AdminOrderContext.Provider>
  );
}

// eslint-disable-next-line react/only-export-components
export function useAdminOrders() {
  const ctx = useContext(AdminOrderContext);
  if (!ctx) {
    throw new Error('useAdminOrders must be used within AdminOrderProvider');
  }
  return ctx;
}
