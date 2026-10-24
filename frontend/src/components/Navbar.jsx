import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FileText, Cpu, LayoutDashboard, LogOut, LogIn, Activity } from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  let user = null;
  try {
    user = userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    user = null;
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <div className="brand-icon">
            <FileText size={20} />
          </div>
          <div>
            <span>DocFlow</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--secondary)', display: 'block', fontWeight: 500, letterSpacing: '0.04em' }}>
              SERVERLESS WORKFLOW
            </span>
          </div>
        </Link>

        <div className="navbar-links">
          <Link
            to="/"
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </Link>

          <Link
            to="/architecture"
            className={`nav-link ${location.pathname === '/architecture' ? 'active' : ''}`}
          >
            <Activity size={16} />
            <span>Cloud Architecture & Metrics</span>
          </Link>

          {token ? (
            <div className="nav-user">
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {user?.name || user?.email || 'User'}
              </span>
              <button onClick={handleLogout} className="btn btn-secondary btn-sm" title="Log out">
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">
              <LogIn size={14} />
              <span>Login</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
