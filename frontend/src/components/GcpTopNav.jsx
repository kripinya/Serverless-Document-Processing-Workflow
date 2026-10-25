import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  Search,
  LogOut,
  FileText,
  Terminal
} from 'lucide-react';

export default function GcpTopNav({ onToggleSidebar, onSearch, searchQuery }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  let user = null;
  try { user = userStr ? JSON.parse(userStr) : null; } catch (e) { user = null; }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setShowUserMenu(false);
    navigate('/login');
  };

  const userInitial = (user?.name || user?.email || 'U')[0].toUpperCase();

  return (
    <header className="gcp-topbar">
      <div className="gcp-topbar-left">
        <button className="gcp-menu-icon" onClick={onToggleSidebar} title="Toggle sidebar">
          <Menu size={18} />
        </button>

        <Link to="/" className="gcp-logo-group">
          {/* Original DocFlow logo — stacked document layers */}
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'linear-gradient(135deg, #D2C1B6, #456882)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <FileText size={15} color="#1B3C53" strokeWidth={2.5} />
          </div>
          <div className="gcp-brand-text">
            <span>DocFlow</span>
            <span className="gcp-product-badge">Serverless</span>
          </div>
        </Link>
      </div>

      {/* Search */}
      <div className="gcp-search-container">
        <Search size={15} className="gcp-search-icon" />
        <input
          type="text"
          className="gcp-search-input"
          placeholder="Search documents, classifications..."
          value={searchQuery || ''}
          onChange={(e) => onSearch && onSearch(e.target.value)}
        />
      </div>

      {/* Right */}
      <div className="gcp-topbar-right">
        <Link
          to="/architecture"
          className="gcp-icon-btn"
          title="Architecture & Metrics"
          style={location.pathname === '/architecture' ? { color: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.12)' } : {}}
        >
          <Terminal size={17} />
        </Link>

        {token ? (
          <div style={{ position: 'relative' }}>
            <div className="gcp-avatar-btn" onClick={() => setShowUserMenu(!showUserMenu)} title={user?.email || 'Account'}>
              {userInitial}
            </div>

            {showUserMenu && (
              <div style={{
                position: 'absolute', top: 42, right: 0, width: 220,
                backgroundColor: 'var(--df-surface)', border: '1px solid var(--df-border)',
                borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-4)', zIndex: 120, padding: 14
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div className="gcp-avatar-btn" style={{ width: 36, height: 36, fontSize: 14 }}>{userInitial}</div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--df-text-primary)' }}>{user?.name || 'User'}</div>
                    <div style={{ fontSize: 11, color: 'var(--df-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--df-border)', paddingTop: 10 }}>
                  <button onClick={handleLogout} className="gcp-btn gcp-btn-danger gcp-btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }}>
                    <LogOut size={14} /> <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link to="/login" className="gcp-btn gcp-btn-sm" style={{ backgroundColor: 'var(--df-sand)', color: 'var(--df-navy)', fontWeight: 600, border: 'none' }}>
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
