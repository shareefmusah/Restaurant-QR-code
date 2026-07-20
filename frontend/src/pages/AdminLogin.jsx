import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await api.login(username, password);
      localStorage.setItem('admin_token', data.token);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login-shell">
      <form className="admin-login-card" onSubmit={handleSubmit}>
        <p className="eyebrow">Staff access</p>
        <h1>Sign in</h1>
        <label>
          Username
          <input value={username} onChange={e => setUsername(e.target.value)} autoFocus />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="primary-btn" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="login-hint">Default: admin / admin123 — change this in production.</p>
      </form>
    </div>
  );
}
