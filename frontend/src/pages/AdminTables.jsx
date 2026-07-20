import { useEffect, useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { api } from '../api';
import AdminLayout from '../components/AdminLayout';

export default function AdminTables() {
  const [tables, setTables] = useState([]);
  const [newName, setNewName] = useState('');
  const customerOrigin = window.location.origin;

  function load() {
    api.getTables().then(setTables);
  }
  useEffect(load, []);

  async function addTable(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    await api.createTable({ name: newName.trim() });
    setNewName('');
    load();
  }

  async function removeTable(id) {
    if (!confirm('Delete this table? Its QR code will stop working.')) return;
    await api.deleteTable(id);
    load();
  }

  return (
    <AdminLayout active="tables">
      <div className="dashboard-header">
        <h1>Tables &amp; QR codes</h1>
      </div>
      <p className="page-intro">Print a QR code for each table. Guests scan it to open the menu for that table — no app or account needed.</p>

      <form className="inline-form" onSubmit={addTable}>
        <input placeholder="New table name (e.g. Table 7, Patio 2)" value={newName} onChange={e => setNewName(e.target.value)} />
        <button className="primary-btn" type="submit">Add table</button>
      </form>

      <div className="table-grid">
        {tables.map(t => (
          <TableCard key={t.id} table={t} url={`${customerOrigin}/menu/${t.id}`} onDelete={() => removeTable(t.id)} />
        ))}
      </div>
    </AdminLayout>
  );
}

function TableCard({ table, url, onDelete }) {
  const canvasWrapRef = useRef(null);

  function download() {
    const canvas = canvasWrapRef.current?.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${table.name.replace(/\s+/g, '-').toLowerCase()}-qr.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  return (
    <div className="table-card">
      <div className="table-card-qr" ref={canvasWrapRef}>
        <QRCodeCanvas value={url} size={160} bgColor="#FFFFFF" fgColor="#241C14" level="M" />
      </div>
      <p className="table-card-name">{table.name}</p>
      <p className="table-card-url">{url.replace(/^https?:\/\//, '')}</p>
      <div className="table-card-actions">
        <button className="text-btn" onClick={download}>Download PNG</button>
        <button className="text-btn danger" onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}
