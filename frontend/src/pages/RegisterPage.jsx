import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { UserPlus, AlertCircle, ArrowRight, FileText } from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.register({ name, email, password });
      const { token, user } = res.data?.data || {};
      if (token) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user || { name, email }));
        navigate('/');
      } else {
        navigate('/login');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Registration failed. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gcp-auth-canvas">
      <div className="gcp-auth-card">
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          {/* DocFlow branded icon */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--df-navy)',
            marginBottom: 14
          }}>
            <FileText size={24} color="#FFFFFF" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 600, fontFamily: 'var(--font-sans)', color: 'var(--df-text-primary)' }}>
            Create your DocFlow Account
          </h2>
          <p style={{ color: 'var(--df-text-secondary)', fontSize: '0.85rem', marginTop: 4 }}>
            to manage Serverless Document Workflows & Storage
          </p>
        </div>

        {error && (
          <div style={{
            background: 'var(--df-danger-light)',
            border: '1px solid var(--df-danger-border)',
            color: 'var(--df-danger)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-xs)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 20
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="Alex Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email address</label>
            <input
              type="email"
              required
              className="form-input"
              placeholder="alex@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              required
              minLength={6}
              className="form-input"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="gcp-btn gcp-btn-primary"
            style={{ width: '100%', height: 42, fontSize: '0.9rem' }}
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Get Started'}
            <ArrowRight size={15} />
          </button>
        </form>

        <div style={{
          marginTop: 24,
          paddingTop: 18,
          borderTop: '1px solid var(--df-border)',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--df-text-secondary)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--df-navy-mid)', fontWeight: 500 }}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
