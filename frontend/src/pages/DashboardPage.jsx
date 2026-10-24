import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { documentAPI, processingAPI, healthAPI } from '../services/api';
import {
  UploadCloud,
  FileText,
  FileCheck2,
  AlertTriangle,
  RotateCw,
  Trash2,
  ExternalLink,
  Search,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  RefreshCw
} from 'lucide-react';

export default function DashboardPage() {
  const [documents, setDocuments] = useState([]);
  const [metrics, setMetrics] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    processing: 0,
    avgProcessingTimeMs: 0
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const fileInputRef = useRef(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await documentAPI.getAll();
      const docs = res.data?.data || res.data || [];
      setDocuments(docs);

      // Compute client-side metrics
      const total = docs.length;
      const completed = docs.filter(d => d.status === 'COMPLETED').length;
      const failed = docs.filter(d => d.status === 'FAILED').length;
      const processing = docs.filter(d => !['COMPLETED', 'FAILED'].includes(d.status)).length;

      setMetrics({
        total,
        completed,
        failed,
        processing,
        successRate: total > 0 ? Math.round((completed / total) * 100) : 100
      });
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Polling every 3 seconds for async status updates
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchDocuments();
    }, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchDocuments]);

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploadError('');
    setUploading(true);
    try {
      await documentAPI.upload(file);
      await fetchDocuments();
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setUploadError(err.response?.data?.message || 'File upload failed. Ensure server is running.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleRetry = async (id, e) => {
    e.stopPropagation();
    try {
      await processingAPI.retry(id);
      await fetchDocuments();
    } catch (err) {
      alert('Retry trigger failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await documentAPI.delete(id);
      setDocuments(prev => prev.filter(d => d.id !== id));
      await fetchDocuments();
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = (doc.originalName || doc.id || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = statusFilter === 'ALL' || doc.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>Document Processing Workflow</h1>
          <p>Asynchronous multi-stage event processing, automatic classification, and retry management.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`btn ${autoRefresh ? 'btn-secondary' : 'btn-secondary'}`}
            style={{ fontSize: '0.8rem', padding: '8px 14px' }}
          >
            <RefreshCw size={14} className={autoRefresh ? 'pulse-dot' : ''} />
            <span>Auto-refresh: {autoRefresh ? 'ON (3s)' : 'OFF'}</span>
          </button>
          <button onClick={fetchDocuments} className="btn btn-secondary btn-sm" title="Refresh now">
            <RotateCw size={14} />
          </button>
        </div>
      </div>

      {/* Metrics Ribbon */}
      <div className="metrics-grid">
        <div className="glass-panel metric-card">
          <div className="metric-icon-box" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)' }}>
            <Layers size={24} />
          </div>
          <div className="metric-info">
            <div className="metric-label">Total Documents</div>
            <div className="metric-value">{metrics.total}</div>
            <div className="metric-sub">Processed through pipeline</div>
          </div>
        </div>

        <div className="glass-panel metric-card">
          <div className="metric-icon-box" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
            <FileCheck2 size={24} />
          </div>
          <div className="metric-info">
            <div className="metric-label">Completed</div>
            <div className="metric-value">{metrics.completed}</div>
            <div className="metric-sub">
              {metrics.total > 0 ? `${metrics.successRate}% success rate` : '100% success rate'}
            </div>
          </div>
        </div>

        <div className="glass-panel metric-card">
          <div className="metric-icon-box" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
            <Clock size={24} />
          </div>
          <div className="metric-info">
            <div className="metric-label">In Pipeline</div>
            <div className="metric-value">{metrics.processing}</div>
            <div className="metric-sub">SQS Async Queue</div>
          </div>
        </div>

        <div className="glass-panel metric-card">
          <div className="metric-icon-box" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
            <AlertTriangle size={24} />
          </div>
          <div className="metric-info">
            <div className="metric-label">Dead-Letter / Failed</div>
            <div className="metric-value">{metrics.failed}</div>
            <div className="metric-sub">Retry eligible with DLQ</div>
          </div>
        </div>
      </div>

      {/* Upload Dropzone */}
      <div
        className="upload-card"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={(e) => handleFileUpload(e.target.files?.[0])}
          accept=".pdf,.png,.jpg,.jpeg,.txt,.doc,.docx"
        />
        <div className="upload-icon-circle">
          <UploadCloud size={32} />
        </div>
        <div className="upload-title">
          {uploading ? 'Uploading & Triggering Serverless Event...' : 'Click or Drag & Drop document to upload'}
        </div>
        <div className="upload-desc">
          Supported formats: PDF, PNG, JPG, TXT, DOCX (Max 10MB). Automatically classified into INVOICE, RECEIPT, RESUME, or REPORT.
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={uploading}
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
        >
          {uploading ? 'Processing Event...' : 'Select Document'}
        </button>

        {uploadError && (
          <div style={{ color: 'var(--danger)', marginTop: 14, fontSize: '0.85rem' }}>
            {uploadError}
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
        <div style={{ position: 'relative', minWidth: 280 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: 12, color: 'var(--text-dim)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: 40 }}
            placeholder="Search by filename or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['ALL', 'COMPLETED', 'PROCESSING', 'FAILED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Table */}
      <div className="glass-panel table-container">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading workflow documents...
          </div>
        ) : filteredDocs.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <FileText size={44} style={{ color: 'var(--text-dim)', marginBottom: 12 }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 6 }}>No documents found</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Upload your first document above to watch the serverless processing pipeline in real time.
            </p>
          </div>
        ) : (
          <table className="doc-table">
            <thead>
              <tr>
                <th>Document Name</th>
                <th>Classification</th>
                <th>Stage / Status</th>
                <th>Retries</th>
                <th>Created</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <div className="doc-name-cell">
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: 'rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--primary)'
                      }}>
                        <FileText size={18} />
                      </div>
                      <div>
                        <div>{doc.originalName || doc.fileName || 'Untitled Document'}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                          ID: {doc.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: 4,
                      background: 'rgba(99, 102, 241, 0.1)',
                      color: 'var(--primary)',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}>
                      {doc.classification || doc.documentType || 'PENDING'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${doc.status}`}>
                      {!['COMPLETED', 'FAILED'].includes(doc.status) && (
                        <span className="pulse-dot" style={{ background: 'currentColor' }} />
                      )}
                      {doc.status}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.85rem', color: (doc.retryCount || 0) > 0 ? 'var(--warning)' : 'var(--text-dim)' }}>
                      {doc.retryCount || 0} / 3
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {doc.createdAt ? new Date(doc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Just now'}
                  </td>
                  <td>
                    <div className="actions-cell" style={{ justifyContent: 'flex-end' }}>
                      <Link to={`/document/${doc.id}`} className="btn btn-secondary btn-sm" title="View Pipeline Details">
                        <ExternalLink size={14} />
                        <span>Details</span>
                      </Link>

                      {doc.status === 'FAILED' && (
                        <button
                          onClick={(e) => handleRetry(doc.id, e)}
                          className="btn btn-sm"
                          style={{ background: 'var(--warning-bg)', color: 'var(--warning)', borderColor: 'var(--warning-border)' }}
                          title="Trigger SQS Retry"
                        >
                          <RotateCw size={14} />
                          <span>Retry</span>
                        </button>
                      )}

                      <button
                        onClick={(e) => handleDelete(doc.id, e)}
                        className="btn btn-danger btn-sm"
                        title="Delete Document"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
