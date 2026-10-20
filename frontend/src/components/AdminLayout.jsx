import { Link, useNavigate } from 'react-router-dom';
import { useAdminOrders } from '../context/AdminOrderContext';
import { Icon } from './Icons';

export default function AdminLayout({ active, children }) {
  const navigate = useNavigate();
  const { orderCount, newOrderToast, setNewOrderToast } = useAdminOrders();

  function logout() {
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand-logo">SG</div>
        <p className="admin-brand">Swiss Gardens</p>
        <span className="admin-brand-sub">Staff Portal</span>
        <nav>
          <Link to="/admin/dashboard" className={`nav-link-row ${active === 'dashboard' ? 'active' : ''}`}>
            <span>Live orders</span>
            {orderCount > 0 && (
              <span className="sidebar-order-pill">{orderCount}</span>
            )}
          </Link>
          <Link to="/admin/menu" className={active === 'menu' ? 'active' : ''}>Menu</Link>
          <Link to="/admin/tables" className={active === 'tables' ? 'active' : ''}>Tables &amp; QR codes</Link>
        </nav>
        <button className="logout-btn" onClick={logout}>Sign out</button>
      </aside>

      <main className="admin-main">
        {newOrderToast && active !== 'dashboard' && (
          <div
            className="admin-new-order-toast"
            onClick={() => {
              setNewOrderToast(null);
              navigate('/admin/dashboard');
            }}
          >
            <div className="toast-left">
              <span className="toast-dot" />
              <Icon name="bell" size={16} />
              <span>New Order #{String(newOrderToast.id).padStart(4, '0')} received for {newOrderToast.table_name || 'Table'}!</span>
            </div>
            <span className="toast-action">View Live Orders <Icon name="arrowRight" size={13} /></span>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
