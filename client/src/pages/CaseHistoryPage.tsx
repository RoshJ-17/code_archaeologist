import React from 'react';
import {
  FolderGit2,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  GitBranch,
} from 'lucide-react';
import type { InvestigationRun } from '../types/investigation';

interface CaseHistoryPageProps {
  runs: InvestigationRun[];
  onSelectRun: (run: InvestigationRun) => void;
  onRefresh: () => void;
  loading: boolean;
}

export const CaseHistoryPage: React.FC<CaseHistoryPageProps> = ({
  runs,
  onSelectRun,
  onRefresh,
  loading,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: 'var(--space-lg)' }}>
        <div>
          <div className="headline-eyebrow">
            <FolderGit2 size={14} />
            Forensic Archive & Stratigraphic Records
          </div>
          <h1 className="headline-title" style={{ fontSize: '24px' }}>
            Case History Dossiers
          </h1>
          <p className="headline-subtitle">
            Archived multi-agent investigation records, verified repairs, and historical anomaly diagnoses.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="btn-inspect-case"
          disabled={loading}
          style={{ padding: '8px 16px', fontSize: '12px' }}
          id="refresh-history-btn"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Archive</span>
        </button>
      </div>

      {/* Cases Table */}
      <div className="cases-table-card">
        {runs.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            No investigation dossiers archived yet. Begin an excavation from the New Investigation tab.
          </div>
        ) : (
          <table className="cases-table">
            <thead>
              <tr>
                <th>Dossier Ref</th>
                <th>Excavation Site</th>
                <th>Observed Anomaly</th>
                <th>Attempts</th>
                <th>Final Outcome</th>
                <th>Timestamp</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => {
                return (
                  <tr key={r.id}>
                    <td>
                      <span className="table-case-id font-mono">
                        <GitBranch size={12} style={{ display: 'inline', marginRight: '4px' }} />
                        {r.id.substring(0, 18)}...
                      </span>
                    </td>
                    <td>
                      <span className="font-mono" style={{ fontWeight: 600, color: 'var(--color-text-bone)' }}>
                        {r.repositoryName}
                      </span>
                    </td>
                    <td>
                      <div
                        style={{
                          maxWidth: '380px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          color: 'var(--color-text-secondary)',
                          fontSize: '12px',
                        }}
                        title={r.bugReport}
                      >
                        {r.bugReport}
                      </div>
                    </td>
                    <td>
                      <span className="trench-badge" style={{ color: 'var(--color-text-primary)' }}>
                        {r.iteration || 1} / 3
                      </span>
                    </td>
                    <td>
                      {r.outcome === 'VERIFIED' && (
                        <span className="trench-badge" style={{ background: 'var(--color-success-surface)', color: 'var(--color-success)', border: '1px solid var(--color-success)' }}>
                          <CheckCircle2 size={11} />
                          VERIFIED
                        </span>
                      )}
                      {r.outcome === 'REJECTED' && (
                        <span className="trench-badge" style={{ background: 'var(--color-alert-orange-surface)', color: 'var(--color-alert-orange)', border: '1px solid currentColor' }}>
                          <AlertOctagon size={11} />
                          REJECTED
                        </span>
                      )}
                      {r.outcome === 'QA_FAILED' && (
                        <span className="trench-badge" style={{ background: 'var(--color-alert-red-surface)', color: 'var(--color-alert-red)', border: '1px solid currentColor' }}>
                          <AlertTriangle size={11} />
                          QA FAIL
                        </span>
                      )}
                      {r.outcome === 'INCONCLUSIVE' && (
                        <span className="trench-badge" style={{ background: 'var(--color-alert-orange-surface)', color: 'var(--color-alert-orange)', border: '1px solid currentColor' }}>
                          INCONCLUSIVE
                        </span>
                      )}
                      {r.status === 'RUNNING' && (
                        <span className="trench-badge" style={{ background: 'var(--color-amber-surface)', color: 'var(--color-amber-primary)', border: '1px solid var(--color-amber-primary)' }}>
                          EXCAVATING
                        </span>
                      )}
                      {r.status === 'FAILED' && (
                        <span className="trench-badge" style={{ background: 'var(--color-alert-red-surface)', color: 'var(--color-alert-red)', border: '1px solid var(--color-alert-red)' }}>
                          <ShieldAlert size={11} />
                          TERMINATED
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-inspect-case"
                        onClick={() => onSelectRun(r)}
                        id={`inspect-case-${r.id}`}
                      >
                        <span>Open Dossier</span>
                        <ExternalLink size={11} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
