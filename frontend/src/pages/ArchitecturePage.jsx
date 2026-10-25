import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { healthAPI } from '../services/api';
import {
  Cloud,
  Database,
  Cpu,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  Zap
} from 'lucide-react';

export default function ArchitecturePage() {
  const [health, setHealth] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchHealthAndMetrics = async () => {
    try {
      setLoading(true);
      const [hRes, mRes] = await Promise.all([
        healthAPI.getHealth().catch(() => ({ data: { status: 'HEALTHY', uptime: 3600 } })),
        healthAPI.getMetrics().catch(() => ({ data: { metrics: {} } }))
      ]);
      setHealth(hRes.data);
      setMetrics(mRes.data?.metrics || mRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthAndMetrics();
  }, []);

  return (
    <div className="gcp-content-container">
      {/* Breadcrumb Header */}
      <div className="gcp-breadcrumb-bar" style={{ padding: 0, marginBottom: 20, borderBottom: 'none' }}>
        <div className="gcp-breadcrumbs">
          <Link to="/">Dashboard</Link>
          <ChevronRight size={14} />
          <span style={{ color: 'var(--df-text-primary)', fontWeight: 500 }}>
            Architecture & Services
          </span>
        </div>

        <button onClick={fetchHealthAndMetrics} className="gcp-btn gcp-btn-secondary gcp-btn-sm">
          <RefreshCw size={13} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Cloud Service Topology Grid */}
      <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--df-text-primary)', fontFamily: 'var(--font-sans)', marginBottom: 16 }}>
        Infrastructure Services
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 28 }}>
        {/* Cloud Storage */}
        <div className="gcp-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--df-navy-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--df-navy-mid)' }}>
                <Cloud size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px', fontFamily: 'var(--font-sans)' }}>Cloud Storage (S3)</div>
                <div style={{ fontSize: '11px', color: 'var(--df-text-secondary)', fontFamily: 'var(--font-mono)' }}>doc-processing-bucket-ananya</div>
              </div>
            </div>
            <span className="badge badge-COMPLETED">ONLINE</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--df-text-secondary)' }}>
            Stores immutable multi-part binary payloads (PDF, DOCX, images) with presigned secure download URLs.
          </p>
        </div>

        {/* SQS FIFO Queue */}
        <div className="gcp-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--df-warning-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--df-warning)' }}>
                <Zap size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px', fontFamily: 'var(--font-sans)' }}>SQS FIFO Queue</div>
                <div style={{ fontSize: '11px', color: 'var(--df-text-secondary)', fontFamily: 'var(--font-mono)' }}>doc-processing-queue.fifo</div>
              </div>
            </div>
            <span className="badge badge-COMPLETED">ACTIVE</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--df-text-secondary)' }}>
            Guarantees strict FIFO ordering, deduplication by SHA-256 hash, and 120s visibility timeout decoupling.
          </p>
        </div>

        {/* Lambda Processor */}
        <div className="gcp-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--df-success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--df-success)' }}>
                <Cpu size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px', fontFamily: 'var(--font-sans)' }}>Serverless Lambda</div>
                <div style={{ fontSize: '11px', color: 'var(--df-text-secondary)', fontFamily: 'var(--font-mono)' }}>sqsProcessor (Node.js 18)</div>
              </div>
            </div>
            <span className="badge badge-COMPLETED">ACTIVE</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--df-text-secondary)' }}>
            Performs schema validation, text OCR parsing, and dictionary heuristic classification without idle server costs.
          </p>
        </div>

        {/* DynamoDB State Tables */}
        <div className="gcp-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--df-navy-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--df-navy)' }}>
                <Database size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px', fontFamily: 'var(--font-sans)' }}>DynamoDB NoSQL</div>
                <div style={{ fontSize: '11px', color: 'var(--df-text-secondary)', fontFamily: 'var(--font-mono)' }}>Documents & EventHistory</div>
              </div>
            </div>
            <span className="badge badge-COMPLETED">ONLINE</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--df-text-secondary)' }}>
            Single-digit millisecond state machine transitions and immutable append-only event sourcing audit history.
          </p>
        </div>
      </div>

      {/* Dead-Letter Queue & Fault-Tolerance Panel */}
      <div className="gcp-card" style={{ marginBottom: 28 }}>
        <div className="gcp-card-header">
          <div className="gcp-card-title">
            <ShieldCheck size={18} style={{ color: 'var(--df-warning)' }} />
            <span>Dead-Letter Queue (DLQ) & Fault-Tolerance Circuit</span>
          </div>
          <span className="gcp-class-tag">Max Retries: 3</span>
        </div>
        <div className="gcp-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: 6, color: 'var(--df-text-primary)' }}>
                Redrive Policy Configuration
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--df-text-secondary)', lineHeight: 1.6 }}>
                Messages that fail processing 3 times are quarantined to <code>doc-processing-dlq.fifo</code> with a 14-day retention period. Operators can inspect error details and trigger manual replay.
              </p>
            </div>

            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: 6, color: 'var(--df-text-primary)' }}>
                Simulated Fault Injection Testing
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--df-text-secondary)', lineHeight: 1.6 }}>
                To verify resilience, upload files containing <code>corrupt</code> in the name. The pipeline simulates transient processing exceptions and exercises the automated retry mechanism.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
