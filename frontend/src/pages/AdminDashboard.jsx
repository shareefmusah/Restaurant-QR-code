import AdminLayout from '../components/AdminLayout';
import { Icon } from '../components/Icons';
import { useAdminOrders } from '../context/AdminOrderContext';

const COLUMNS = [
  { key: 'pending', label: 'New', next: 'preparing', nextLabel: 'Start preparing' },
  { key: 'preparing', label: 'Preparing', next: 'ready', nextLabel: 'Mark ready' },
  { key: 'ready', label: 'Ready', next: 'served', nextLabel: 'Mark served' },
];

export default function AdminDashboard() {
  const {
    orders,
    pendingCount,
    preparingCount,
    readyCount,
    connected,
    playOrderChime,
    advanceOrder,
    cancelOrder,
  } = useAdminOrders();

  return (
    <AdminLayout active="dashboard">
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
                      <button className="advance-btn" onClick={() => advanceOrder(order, col.next)}>{col.nextLabel}</button>
                      {col.key === 'pending' && (
                        <button className="cancel-btn" onClick={() => cancelOrder(order)}>Cancel</button>
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
