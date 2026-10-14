import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, Outlet } from 'react-router-dom';
import CustomerMenu from './pages/CustomerMenu';
import OrderStatus from './pages/OrderStatus';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminMenu from './pages/AdminMenu';
import AdminTables from './pages/AdminTables';
import { api } from './api';
import { Icon } from './components/Icons';
import { AdminOrderProvider } from './context/AdminOrderContext';

function RequireAuth({ children }) {
  const token = localStorage.getItem('admin_token');
  if (!token) return <Navigate to="/admin/login" replace />;
  return children;
}

function Home() {
  const [tables, setTables] = useState([]);

  useEffect(() => {
    api.getTables()
      .then(setTables)
      .catch(() => {
        // Fallback default tables if not yet seeded
        setTables([
          { id: 'table-1', name: 'Table 1' },
          { id: 'table-2', name: 'Table 2' },
          { id: 'table-3', name: 'Table 3' },
          { id: 'table-4', name: 'Table 4' },
          { id: 'table-5', name: 'Table 5' },
          { id: 'table-6', name: 'Table 6' },
        ]);
      });
  }, []);

  return (
    <div className="landing-shell">
      <div className="landing-card">
        <div className="landing-brand-crest">
          <span className="crest-initials">SG</span>
        </div>
        <p className="eyebrow-luxury">Swiss Gardens Fine Dining</p>
        <h1 className="landing-title">Table Ordering Experience</h1>
        <p className="landing-desc">
          Scan the QR code printed on your table stand, or select your table below to browse our culinary creations and order directly.
        </p>

        <div className="landing-tables-section">
          <span className="section-label">Select Your Table</span>
          <div className="landing-table-grid">
            {tables.map(t => (
              <Link to={`/menu/${t.id}`} key={t.id} className="table-select-card">
                <span className="table-select-icon"><Icon name="mapPin" size={18} /></span>
                <span className="table-select-name">{t.name}</span>
                <span className="table-select-action">
                  Open Menu <Icon name="arrowRight" size={13} style={{ marginLeft: '4px' }} />
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="landing-footer-bar">
          <Link to="/admin/login" className="landing-staff-link">
            <Icon name="shield" size={16} />
            <span>Kitchen &amp; Staff Portal</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function AdminShellWrapper() {
  return (
    <RequireAuth>
      <AdminOrderProvider>
        <Outlet />
      </AdminOrderProvider>
    </RequireAuth>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/menu/:tableId" element={<CustomerMenu />} />
        <Route path="/order/:orderId" element={<OrderStatus />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route element={<AdminShellWrapper />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/menu" element={<AdminMenu />} />
          <Route path="/admin/tables" element={<AdminTables />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
