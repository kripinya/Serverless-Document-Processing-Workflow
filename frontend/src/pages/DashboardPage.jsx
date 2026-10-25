import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { documentAPI, processingAPI } from '../services/api';
import {
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
  RefreshCw,
  Grid,
  List,
  Folder,
  Tag,
  Download,
  FileCode,
  HardDrive,
  Cpu,
  ChevronRight,
  MoreVertical,
  Check
} from 'lucide-react';

export default function DashboardPage({
  searchQuery,
  setSearchQuery,
  activeFilter,
  setActiveFilter,
  onMetricsUpdate,
  registerUploadHandler,
  setGlobalUploading
}) {
  const [documents, setDocuments] = useState([]);
  const [metrics, setMetrics] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    processing: 0,
    successRate: 100
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await documentAPI.getAll();
      const docs = res.data?.data || res.data || [];
      setDocuments(docs);

      const total = docs.length;
      const completed = docs.filter(d => d.status === 'COMPLETED').length;
      const failed = docs.filter(d => d.status === 'FAILED').length;
      const processing = docs.filter(d => !['COMPLETED', 'FAILED'].includes(d.status)).length;
      const calculatedMetrics = {
        total,
        completed,
        failed,
        processing,
        successRate: total > 0 ? Math.round((completed / total) * 100) : 100
      };

      setMetrics(calculatedMetrics);
      if (onMetricsUpdate) {
        onMetricsUpdate(calculatedMetrics);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  }, [onMetricsUpdate]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // SQS Polling simulation every 3 seconds for async pipeline updates
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchDocuments();
    }, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchDocuments]);

  const handleFileUpload = useCallback(async (file) => {
    if (!file) return;
    setUploadError('');
    setUploading(true);
    if (setGlobalUploading) setGlobalUploading(true);

    try {
      await documentAPI.upload(file);
      await fetchDocuments();
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setUploadError(err.response?.data?.error || err.response?.data?.message || 'File upload failed. Ensure server is running.');
    } finally {
      setUploading(false);
      if (setGlobalUploading) setGlobalUploading(false);
    }
  }, [fetchDocuments, setGlobalUploading]);

  // Register upload handler with top-level Drive sidebar
  useEffect(() => {
    if (registerUploadHandler) {
      registerUploadHandler(() => (file) => handleFileUpload(file));
    }
  }, [registerUploadHandler, handleFileUpload]);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
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
      alert('Retry trigger failed: ' + (err.response?.data?.error || err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this object from S3 and DynamoDB?')) return;
    try {
      await documentAPI.delete(id);
      setDocuments(prev => prev.filter(d => (d.documentId || d.id) !== id));
      await fetchDocuments();
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.error || err.response?.data?.message || err.message));
    }
  };

  const handleDownload = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await documentAPI.download(id);
      if (res.data?.data?.downloadUrl) {
        window.open(res.data.data.downloadUrl, '_blank');
      }
    } catch (err) {
      alert('Download error: ' + (err.response?.data?.error || err.message));
    }
  };

  // Filter Documents based on search & category
  const filteredDocs = documents.filter((doc) => {
    const docName = doc.fileName || doc.originalName || '';
    const docId = doc.documentId || doc.id || '';
    const classification = doc.classification || '';
    const searchMatch = (docName + ' ' + docId + ' ' + classification)
      .toLowerCase()
      .includes((searchQuery || '').toLowerCase());

    if (!searchMatch) return false;

    if (!activeFilter || activeFilter === 'ALL') return true;
    if (activeFilter === 'COMPLETED') return doc.status === 'COMPLETED';
    if (activeFilter === 'PROCESSING') return !['COMPLETED', 'FAILED'].includes(doc.status);
    if (activeFilter === 'FAILED') return doc.status === 'FAILED';
    if (['INVOICE', 'RECEIPT', 'REPORT', 'RESUME', 'CONTRACT'].includes(activeFilter)) {
      return (doc.classification || '').toUpperCase() === activeFilter;
    }

    return true;
  });

  const getFileIcon = (fileName, mimeType) => {
    const name = (fileName || '').toLowerCase();
    if (name.endsWith('.pdf') || mimeType?.includes('pdf')) {
      return <FileText size={18} style={{ color: '#f28b82' }} />;
    }
    if (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || mimeType?.includes('image')) {
      return <Tag size={18} style={{ color: '#81c995' }} />;
    }
    if (name.endsWith('.doc') || name.endsWith('.docx')) {
      return <FileCode size={18} style={{ color: '#8ab4f8' }} />;
    }
    return <FileText size={18} style={{ color: '#c58af9' }} />;
  };

  return (
    <div className="gcp-content-container">
      {/* Breadcrumb Header */}
      <div className="gcp-breadcrumb-bar" style={{ padding: 0, marginBottom: 20, borderBottom: 'none' }}>
        <div className="gcp-breadcrumbs">
          <Link to="/">Dashboard</Link>
          <ChevronRight size={14} />
          <span style={{ color: 'var(--df-text-primary)', fontWeight: 500 }}>
            Documents
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="gcp-btn gcp-btn-secondary gcp-btn-sm"
          >
            <RefreshCw size={13} className={autoRefresh ? 'pulse-dot' : ''} />
            <span>Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}</span>
          </button>
          <button onClick={fetchDocuments} className="gcp-btn gcp-btn-secondary gcp-btn-sm" title="Refresh objects">
            <RotateCw size={13} />
          </button>
        </div>
      </div>

      {/* Metric Tiles */}
      <div className="gcp-metrics-grid">
        <div className="gcp-metric-tile">
          <div className="gcp-metric-icon" style={{ backgroundColor: 'var(--df-navy-light)', color: 'var(--df-navy-mid)' }}>
            <HardDrive size={22} />
          </div>
          <div className="gcp-metric-info">
            <div className="gcp-metric-label">Total Documents</div>
            <div className="gcp-metric-value">{metrics.total}</div>
            <div className="gcp-metric-sub">Uploaded to storage</div>
          </div>
        </div>

        <div className="gcp-metric-tile">
          <div className="gcp-metric-icon" style={{ backgroundColor: 'var(--df-success-light)', color: 'var(--df-success)' }}>
            <FileCheck2 size={22} />
          </div>
          <div className="gcp-metric-info">
            <div className="gcp-metric-label">Classified</div>
            <div className="gcp-metric-value">{metrics.completed}</div>
            <div className="gcp-metric-sub">{metrics.successRate}% success rate</div>
          </div>
        </div>

        <div className="gcp-metric-tile">
          <div className="gcp-metric-icon" style={{ backgroundColor: 'var(--df-warning-light)', color: 'var(--df-warning)' }}>
            <Cpu size={22} />
          </div>
          <div className="gcp-metric-info">
            <div className="gcp-metric-label">In Pipeline</div>
            <div className="gcp-metric-value">{metrics.processing}</div>
            <div className="gcp-metric-sub">Currently processing</div>
          </div>
        </div>

        <div className="gcp-metric-tile">
          <div className="gcp-metric-icon" style={{ backgroundColor: 'var(--df-danger-light)', color: 'var(--df-danger)' }}>
            <AlertTriangle size={22} />
          </div>
          <div className="gcp-metric-info">
            <div className="gcp-metric-label">Failed</div>
            <div className="gcp-metric-value">{metrics.failed}</div>
            <div className="gcp-metric-sub">Retry eligible</div>
          </div>
        </div>
      </div>

      {/* Upload error display */}
      {uploadError && (
        <div style={{
          background: 'var(--df-danger-light)',
          border: '1px solid var(--df-danger-border)',
          color: 'var(--df-danger)',
          padding: '10px 14px',
          borderRadius: 'var(--radius-xs)',
          fontSize: '13px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <AlertTriangle size={14} />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="gcp-toolbar">
        <div className="gcp-toolbar-left">
          {['ALL', 'COMPLETED', 'PROCESSING', 'FAILED', 'INVOICE', 'RECEIPT', 'REPORT', 'RESUME'].map((f) => (
            <button
              key={f}
              className={`gcp-chip ${activeFilter === f ? 'active' : ''}`}
              onClick={() => setActiveFilter && setActiveFilter(f)}
            >
              <span>{f}</span>
            </button>
          ))}
        </div>

        <div className="gcp-toolbar-right">
          <div style={{ display: 'flex', border: '1px solid var(--df-border)', borderRadius: 'var(--radius-xs)', overflow: 'hidden' }}>
            <button
              className={`gcp-icon-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              style={{
                borderRadius: 0,
                backgroundColor: viewMode === 'list' ? 'var(--df-surface-elevated)' : 'transparent',
                color: viewMode === 'list' ? 'var(--df-navy-mid)' : 'var(--df-text-secondary)'
              }}
              title="Table view"
            >
              <List size={16} />
            </button>
            <button
              className={`gcp-icon-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              style={{
                borderRadius: 0,
                backgroundColor: viewMode === 'grid' ? 'var(--df-surface-elevated)' : 'transparent',
                color: viewMode === 'grid' ? 'var(--df-navy-mid)' : 'var(--df-text-secondary)'
              }}
              title="Grid view"
            >
              <Grid size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Objects Viewport (List vs Grid) */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--df-text-secondary)' }}>
          Loading documents...
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="gcp-card" style={{ padding: 60, textAlign: 'center' }}>
          <Folder size={48} style={{ color: 'var(--df-text-tertiary)', marginBottom: 12 }} />
          <h3 style={{ fontSize: '16px', fontWeight: 500, marginBottom: 6, color: 'var(--df-text-primary)' }}>
            No documents found
          </h3>
          <p style={{ color: 'var(--df-text-secondary)', fontSize: '13px' }}>
            Use the "+ New Upload" button in the sidebar to trigger the serverless processing pipeline.
          </p>
        </div>
      ) : viewMode === 'list' ? (
        /* Table View */
        <div className="gcp-table-container">
          <table className="gcp-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input type="checkbox" style={{ accentColor: 'var(--df-navy-mid)' }} readOnly />
                </th>
                <th>Name</th>
                <th>Classification</th>
                <th>Status</th>
                <th>Retries</th>
                <th>Size</th>
                <th>Last Modified</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map((doc) => {
                const docId = doc.documentId || doc.id;
                const fileName = doc.fileName || doc.originalName || 'Untitled Document';
                const fileSize = doc.fileSize || doc.size;
                const fileType = doc.fileType || doc.mimeType;

                return (
                  <tr key={docId}>
                    <td>
                      <input type="checkbox" style={{ accentColor: 'var(--df-navy-mid)' }} />
                    </td>
                    <td>
                      <div className="doc-name-cell">
                        {getFileIcon(fileName, fileType)}
                        <div>
                          <div className="doc-name-text">{fileName}</div>
                          <div className="doc-name-sub">ID: {docId}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="gcp-class-tag">
                        {doc.classification || doc.documentType || 'UNCLASSIFIED'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${doc.status}`}>
                        <span className={`badge-dot ${!['COMPLETED', 'FAILED'].includes(doc.status) ? 'pulse' : ''}`} />
                        {doc.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: (doc.retryCount || 0) > 0 ? 'var(--df-warning)' : 'var(--df-text-tertiary)' }}>
                      {doc.retryCount || 0} / 3
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--df-text-secondary)' }}>
                      {fileSize ? `${(fileSize / 1024).toFixed(1)} KB` : '12.4 KB'}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--df-text-secondary)' }}>
                      {(doc.uploadedAt || doc.createdAt)
                        ? new Date(doc.uploadedAt || doc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        : 'Just now'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                        <Link to={`/document/${docId}`} className="gcp-btn gcp-btn-secondary gcp-btn-sm" title="View details">
                          <ExternalLink size={13} />
                          <span>Details</span>
                        </Link>

                        <button
                          onClick={(e) => handleDownload(docId, e)}
                          className="gcp-btn gcp-btn-secondary gcp-btn-sm"
                          title="Download"
                        >
                          <Download size={13} />
                        </button>

                        {doc.status === 'FAILED' && (
                          <button
                            onClick={(e) => handleRetry(docId, e)}
                            className="gcp-btn gcp-btn-sm"
                            style={{ backgroundColor: 'var(--df-warning-light)', color: 'var(--df-warning)', border: '1px solid var(--df-warning-border)' }}
                            title="Retry processing"
                          >
                            <RotateCw size={13} />
                            <span>Retry</span>
                          </button>
                        )}

                        <button
                          onClick={(e) => handleDelete(docId, e)}
                          className="gcp-btn gcp-btn-danger gcp-btn-sm"
                          title="Delete document"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Grid View */
        <div className="drive-grid">
          {filteredDocs.map((doc) => {
            const docId = doc.documentId || doc.id;
            const fileName = doc.fileName || doc.originalName || 'Untitled Document';
            const fileSize = doc.fileSize || doc.size;
            const fileType = doc.fileType || doc.mimeType;

            return (
              <div
                key={docId}
                className="drive-file-card"
                onClick={() => window.location.href = `/document/${docId}`}
              >
                <div className="drive-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {getFileIcon(fileName, fileType)}
                    <span className="gcp-class-tag" style={{ fontSize: '10px' }}>
                      {doc.classification || 'PENDING'}
                    </span>
                  </div>

                  <span className={`badge badge-${doc.status}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                    {doc.status}
                  </span>
                </div>

                <div className="drive-card-preview">
                  <FileText size={38} style={{ opacity: 0.6 }} />
                </div>

                <div className="drive-card-title" title={fileName}>
                  {fileName}
                </div>

                <div className="drive-card-meta">
                  <span>{fileSize ? `${(fileSize / 1024).toFixed(1)} KB` : '12 KB'}</span>
                  <span>{(doc.uploadedAt || doc.createdAt) ? new Date(doc.uploadedAt || doc.createdAt).toLocaleDateString() : 'Today'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
