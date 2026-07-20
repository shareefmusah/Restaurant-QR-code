import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CustomerMenu from './pages/CustomerMenu';
import OrderStatus from './pages/OrderStatus';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminMenu from './pages/AdminMenu';
import AdminTables from './pages/AdminTables';

function RequireAuth({ children }) {
  const token = localStorage.getItem('admin_token');
  if (!token) return <Navigate to="/admin/login" replace />;
  return children;
}

function Home() {
  return (
    <div className="menu-shell">
      <div className="empty-state">
        <p className="eyebrow">Table Ticket</p>
        <h1>Scan a table's QR code to see its menu</h1>
        <p>Staff: <a href="/admin/login">go to the admin dashboard</a></p>
      </div>
    </div>
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
        <Route path="/admin/dashboard" element={<RequireAuth><AdminDashboard /></RequireAuth>} />
        <Route path="/admin/menu" element={<RequireAuth><AdminMenu /></RequireAuth>} />
        <Route path="/admin/tables" element={<RequireAuth><AdminTables /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
