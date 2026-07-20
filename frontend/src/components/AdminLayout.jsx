import { Link, useNavigate } from 'react-router-dom';

export default function AdminLayout({ active, children }) {
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <p className="admin-brand">Table Ticket</p>
        <nav>
          <Link to="/admin/dashboard" className={active === 'dashboard' ? 'active' : ''}>Live orders</Link>
          <Link to="/admin/menu" className={active === 'menu' ? 'active' : ''}>Menu</Link>
          <Link to="/admin/tables" className={active === 'tables' ? 'active' : ''}>Tables &amp; QR codes</Link>
        </nav>
        <button className="logout-btn" onClick={logout}>Sign out</button>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
