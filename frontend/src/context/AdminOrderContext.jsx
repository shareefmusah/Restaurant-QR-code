import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { api } from '../api';
import { getSocket } from '../socket';

const AdminOrderContext = createContext(null);

export function AdminOrderProvider({ children }) {
  const [orders, setOrders] = useState([]);
  const [connected, setConnected] = useState(() => {
    try {
      const s = getSocket();
      return s ? s.connected : false;
    } catch {
      return false;
    }
  });
  const [updatingId, setUpdatingId] = useState(null);
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

    function joinRoom() {
      const token = localStorage.getItem('admin_token');
      if (token) {
        socket.emit('join:admin', token);
      }
    }

    function handleConnect() {
      setConnected(true);
      joinRoom();
    }

    function handleJoined() {
      setConnected(true);
    }

    function handleDisconnect() {
      setConnected(false);
    }

    function handleError(err) {
      console.warn('Socket error:', err);
      if (err === 'Invalid admin token' || (typeof err === 'string' && err.toLowerCase().includes('token'))) {
        localStorage.removeItem('admin_token');
        setConnected(false);
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
          window.location.href = '/admin/login?expired=1';
        }
      }
    }

    socket.on('connect', handleConnect);
    socket.on('joined:admin', handleJoined);
    socket.on('disconnect', handleDisconnect);
    socket.on('error', handleError);

    if (socket.connected) {
      setConnected(true);
      joinRoom();
    } else {
      socket.connect();
    }

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
      socket.off('connect', handleConnect);
      socket.off('joined:admin', handleJoined);
      socket.off('disconnect', handleDisconnect);
      socket.off('error', handleError);
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  async function advanceOrder(order, nextStatus) {
    setUpdatingId(order.id);
    try {
      const updated = await api.updateOrderStatus(order.id, nextStatus);
      if (nextStatus === 'served' || nextStatus === 'cancelled') {
        setOrders(prev => prev.filter(o => o.id !== order.id));
      } else {
        setOrders(prev => prev.map(o => (o.id === order.id ? updated : o)));
      }
    } catch (err) {
      console.error('Failed to advance order:', err);
      alert(err.message || 'Could not update order status. Please check connection or sign in again.');
    } finally {
      setUpdatingId(null);
    }
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
        updatingId,
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
