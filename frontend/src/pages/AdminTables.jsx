import { useEffect, useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { api } from '../api';
import AdminLayout from '../components/AdminLayout';
import { Icon } from '../components/Icons';
import { downloadStandCard, downloadCleanQr, printStandCard } from '../utils/qrStandGenerator';

export default function AdminTables() {
  const [tables, setTables] = useState([]);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const customerOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  function load() {
    api.getTables().then(setTables).catch(() => {});
  }
  useEffect(load, []);

  async function addTable(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await api.createTable({ name: newName.trim() });
      setNewName('');
      load();
    } catch (err) {
      alert(err.message || 'Failed to create table');
    } finally {
      setAdding(false);
    }
  }

  async function removeTable(table) {
    if (!confirm(`Delete ${table.name}? Its QR code will no longer work.`)) return;
    try {
      await api.deleteTable(table.id);
      load();
    } catch (err) {
      alert(err.message || 'Failed to delete table');
    }
  }

  function printAll() {
    window.print();
  }

  return (
    <AdminLayout active="tables">
      <div className="dashboard-header no-print">
        <div className="dashboard-header-title-box">
          <h1>Tables &amp; QR Stand Cards</h1>
          <p className="page-subheading">
            Print-ready table tents and high-resolution QR codes with guest ordering instructions.
          </p>
        </div>
        <div className="dashboard-header-actions">
          {tables.length > 0 && (
            <button
              type="button"
              className="text-btn print-all-btn"
              onClick={printAll}
              title="Print all table stand cards at once"
            >
              <Icon name="printer" size={15} />
              <span>Print All Stands</span>
            </button>
          )}
        </div>
      </div>

      <div className="tables-top-bar no-print">
        <form className="inline-add-table-form" onSubmit={addTable}>
          <input
            placeholder="New table name (e.g. Table 7, Patio 3, Rooftop 1)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
          />
          <button className="primary-btn add-table-btn" type="submit" disabled={adding}>
            <Icon name="plus" size={15} />
            <span>{adding ? 'Adding…' : 'Add table'}</span>
          </button>
        </form>
        <span className="tables-count-pill">
          {tables.length} {tables.length === 1 ? 'Table' : 'Tables'} Active
        </span>
      </div>

      <div className="table-grid">
        {tables.map(t => (
          <TableStandCard
            key={t.id}
            table={t}
            url={`${customerOrigin}/menu/${t.id}`}
            onDelete={() => removeTable(t)}
          />
        ))}
      </div>
    </AdminLayout>
  );
}

function TableStandCard({ table, url, onDelete }) {
  const qrRef = useRef(null);

  function getQrCanvas() {
    return qrRef.current?.querySelector('canvas');
  }

  function handleDownloadStand() {
    const canvas = getQrCanvas();
    if (!canvas) return;
    downloadStandCard(table, url, canvas);
  }

  function handleDownloadClean() {
    const canvas = getQrCanvas();
    if (!canvas) return;
    downloadCleanQr(table, canvas);
  }

  function handlePrintStand() {
    const canvas = getQrCanvas();
    if (!canvas) return;
    printStandCard(table, url, canvas);
  }

  const cleanUrl = url.replace(/^https?:\/\//, '');

  return (
    <div className="table-stand-item">
      {/* Visual Stand Card Mockup */}
      <div className="stand-card-preview">
        <div className="stand-card-inner">
          <div className="stand-brand-seal">SG</div>
          <p className="stand-brand-title">SWISS GARDENS</p>
          <span className="stand-brand-sub">FINE DINING &amp; TABLE SERVICE</span>
          <div className="stand-divider-mini" />

          <div className="stand-table-pill">{table.name.toUpperCase()}</div>

          <div className="stand-qr-box" ref={qrRef}>
            {/* Render at 440px for crisp high-resolution export while scaled to fit */}
            <QRCodeCanvas
              value={url}
              size={440}
              bgColor="#FFFFFF"
              fgColor="#111111"
              level="H"
              includeMargin={false}
              className="stand-qr-canvas"
            />
          </div>

          <p className="stand-scan-heading">SCAN TO BROWSE &amp; ORDER</p>
          <div className="stand-instructions-list">
            <span>1. Open smartphone camera</span>
            <span>2. Point at QR code</span>
            <span>3. Tap link to order fresh</span>
          </div>

          <div className="stand-badge-pill">NO APP REQUIRED · INSTANT DISPATCH</div>
          <div className="stand-divider-thin" />
          <span className="stand-url-text">{cleanUrl}</span>
        </div>
      </div>

      {/* Action Controls for Staff */}
      <div className="stand-card-controls no-print">
        <div className="stand-card-name-row">
          <span className="stand-card-name">{table.name}</span>
          <span className="stand-card-code">/menu/{table.id}</span>
        </div>

        <div className="stand-actions-row">
          <button
            type="button"
            className="stand-btn-primary"
            onClick={handleDownloadStand}
            title="Download full 1000x1420 card with instructions, ready to print or frame"
          >
            <Icon name="download" size={15} />
            <span>Download Stand Card</span>
          </button>
        </div>

        <div className="stand-actions-secondary">
          <button
            type="button"
            className="text-btn stand-sub-btn"
            onClick={handlePrintStand}
            title="Open printable view formatted for A5 table stand"
          >
            <Icon name="printer" size={14} />
            <span>Print Stand</span>
          </button>
          <button
            type="button"
            className="text-btn stand-sub-btn"
            onClick={handleDownloadClean}
            title="Download clean 600x600 QR code PNG without frame"
          >
            <Icon name="qrCode" size={14} />
            <span>Clean QR</span>
          </button>
          <button
            type="button"
            className="text-btn danger stand-del-btn"
            onClick={onDelete}
            title="Delete this table"
          >
            <Icon name="trash2" size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
