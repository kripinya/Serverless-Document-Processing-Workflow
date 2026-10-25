import React, { useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  HardDrive,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Tag,
  Layers,
  FileCode,
  Activity,
  Plus
} from 'lucide-react';

export default function DriveSidebar({
  currentFilter,
  onSelectFilter,
  onUploadFile,
  uploading,
  metrics
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const isHome = location.pathname === '/';

  const handleNavClick = (filterKey) => {
    if (!isHome) navigate('/');
    if (onSelectFilter) onSelectFilter(filterKey);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onUploadFile) onUploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <aside className="drive-sidebar">
      {/* Upload Button */}
      <div className="drive-sidebar-action">
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
          accept=".pdf,.png,.jpg,.jpeg,.txt,.doc,.docx"
        />
        <button
          className="drive-new-btn"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          title="Upload a document"
        >
          <div className="drive-plus-icon">
            <Plus size={18} />
          </div>
          <span>{uploading ? 'Processing...' : 'New Upload'}</span>
        </button>
      </div>

      {/* Nav */}
      <ul className="drive-nav-list">
        <li
          className={`drive-nav-item ${isHome && currentFilter === 'ALL' ? 'active' : ''}`}
          onClick={() => handleNavClick('ALL')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <HardDrive size={17} />
            <span>All Documents</span>
          </div>
          <span className="drive-nav-badge">{metrics?.total || 0}</span>
        </li>

        <li
          className={`drive-nav-item ${isHome && currentFilter === 'PROCESSING' ? 'active' : ''}`}
          onClick={() => handleNavClick('PROCESSING')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Cpu size={17} />
            <span>In Pipeline</span>
          </div>
          {metrics?.processing > 0 && (
            <span className="drive-nav-badge" style={{ color: 'var(--df-navy-mid)' }}>
              {metrics.processing}
            </span>
          )}
        </li>

        <li
          className={`drive-nav-item ${isHome && currentFilter === 'COMPLETED' ? 'active' : ''}`}
          onClick={() => handleNavClick('COMPLETED')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle2 size={17} />
            <span>Classified</span>
          </div>
          <span className="drive-nav-badge">{metrics?.completed || 0}</span>
        </li>

        <li
          className={`drive-nav-item ${isHome && currentFilter === 'FAILED' ? 'active' : ''}`}
          onClick={() => handleNavClick('FAILED')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={17} />
            <span>Failed</span>
          </div>
          {metrics?.failed > 0 && (
            <span className="drive-nav-badge" style={{ color: 'var(--df-danger)' }}>
              {metrics.failed}
            </span>
          )}
        </li>

        <div className="drive-section-title">Classifications</div>

        <li
          className={`drive-nav-item ${isHome && currentFilter === 'INVOICE' ? 'active' : ''}`}
          onClick={() => handleNavClick('INVOICE')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={17} style={{ color: 'var(--df-cyan)' }} />
            <span>Invoices</span>
          </div>
        </li>

        <li
          className={`drive-nav-item ${isHome && currentFilter === 'RECEIPT' ? 'active' : ''}`}
          onClick={() => handleNavClick('RECEIPT')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Tag size={17} style={{ color: 'var(--df-success)' }} />
            <span>Receipts</span>
          </div>
        </li>

        <li
          className={`drive-nav-item ${isHome && currentFilter === 'REPORT' ? 'active' : ''}`}
          onClick={() => handleNavClick('REPORT')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Layers size={17} style={{ color: 'var(--df-warning)' }} />
            <span>Reports</span>
          </div>
        </li>

        <li
          className={`drive-nav-item ${isHome && currentFilter === 'RESUME' ? 'active' : ''}`}
          onClick={() => handleNavClick('RESUME')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileCode size={17} style={{ color: 'var(--df-violet)' }} />
            <span>Resumes & CVs</span>
          </div>
        </li>

        <div className="drive-section-title">System</div>

        <li
          className={`drive-nav-item ${location.pathname === '/architecture' ? 'active' : ''}`}
          onClick={() => navigate('/architecture')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Activity size={17} />
            <span>Architecture</span>
          </div>
        </li>
      </ul>

      {/* Progress */}
      <div className="drive-storage-box">
        <div className="drive-storage-title">
          <span>Documents Processed</span>
        </div>
        <div className="drive-storage-bar-track">
          <div
            className="drive-storage-bar-fill"
            style={{ width: `${Math.min(100, Math.max(8, (metrics?.completed || 0) / Math.max(metrics?.total || 1, 1) * 100))}%` }}
          />
        </div>
        <div className="drive-storage-text">
          {metrics?.completed || 0} of {metrics?.total || 0} documents classified
        </div>
      </div>
    </aside>
  );
}
