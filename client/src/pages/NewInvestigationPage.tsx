import React, { useState } from 'react';
import { StrataVisual } from '../components/common/StrataVisual';
import {
  Layers,
  Search,
  Wrench,
  CheckCircle2,
  FileCheck,
  Compass,
  AlertCircle,
  Code2,
  HardDrive,
  Cpu,
} from 'lucide-react';
import type { TargetRepo } from '../types/investigation';

interface NewInvestigationPageProps {
  repos: TargetRepo[];
  onStartInvestigation: (repoPath: string, bugReport: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export const NewInvestigationPage: React.FC<NewInvestigationPageProps> = ({
  repos,
  onStartInvestigation,
  loading,
  error,
}) => {
  const [selectedRepoPath, setSelectedRepoPath] = useState<string>(
    repos[0]?.relativePath || 'test-repositories/discount-bug'
  );
  const [bugReport, setBugReport] = useState<string>(
    'Customers purchasing exactly 10 items are not receiving the bulk discount of 20%.'
  );

  const selectedRepo =
    repos.find((r) => r.relativePath === selectedRepoPath) ||
    repos.find((r) => r.absolutePath === selectedRepoPath) ||
    repos[0];

  const handlePresetClick = (sampleBug: string) => {
    setBugReport(sampleBug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepoPath || !bugReport.trim() || loading) return;
    await onStartInvestigation(selectedRepoPath, bugReport);
  };

  return (
    <div className="new-investigation-container">
      {/* Stratigraphic Strata Visual */}
      <StrataVisual />

      {/* Main Forensic Headline Section */}
      <section className="headline-section">
        <div className="headline-eyebrow">
          <Compass size={14} />
          Digital Forensics & Multi-Agent Root Cause Excavation
        </div>
        <h1 className="headline-title">Unearth the Root Cause.</h1>
        <p className="headline-subtitle">
          Five specialized autonomous agents excavate your codebase, trace forensic evidence,
          synthesize a minimal repair, execute sandbox regressions, and certify validation.
        </p>
      </section>

      {/* 5 Autonomous Agent Capability Indicators */}
      <section aria-label="Archaeological Capabilities">
        <div className="capabilities-grid">
          <div className="capability-card">
            <div className="capability-header">
              <span className="capability-index">STAGE 01</span>
              <div className="capability-icon-wrap">
                <Layers size={14} />
              </div>
            </div>
            <div className="capability-name">Repository Analysis</div>
            <div className="capability-desc">
              Scans directory stratigraphy, extracts symbol maps, imports, and test fixtures.
            </div>
          </div>

          <div className="capability-card violet">
            <div className="capability-header">
              <span className="capability-index">STAGE 02</span>
              <div className="capability-icon-wrap violet">
                <Search size={14} />
              </div>
            </div>
            <div className="capability-name">Root-Cause Diagnosis</div>
            <div className="capability-desc">
              Isolates the exact flawed function and line number with confidence and evidence pins.
            </div>
          </div>

          <div className="capability-card">
            <div className="capability-header">
              <span className="capability-index">STAGE 03</span>
              <div className="capability-icon-wrap">
                <Wrench size={14} />
              </div>
            </div>
            <div className="capability-name">Patch Reconstruction</div>
            <div className="capability-desc">
              Synthesizes a minimal unified diff repair without mutating unrelated files or tests.
            </div>
          </div>

          <div className="capability-card teal">
            <div className="capability-header">
              <span className="capability-index">STAGE 04</span>
              <div className="capability-icon-wrap teal">
                <CheckCircle2 size={14} />
              </div>
            </div>
            <div className="capability-name">QA Sandbox & Sweep</div>
            <div className="capability-desc">
              Applies patch to test harness, detects regressions, and guarantees clean restoration.
            </div>
          </div>

          <div className="capability-card teal">
            <div className="capability-header">
              <span className="capability-index">STAGE 05</span>
              <div className="capability-icon-wrap teal">
                <FileCheck size={14} />
              </div>
            </div>
            <div className="capability-name">Independent Review</div>
            <div className="capability-desc">
              Strict audit gate evaluates blast radius, diagnostic consistency, and repair validity.
            </div>
          </div>
        </div>
      </section>

      {/* Excavation Launch Form & Target Telemetry */}
      <form onSubmit={handleSubmit} className="excavation-form-panel">
        <div className="form-main-card">
          {error && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid var(--color-alert-red)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px',
                color: '#FCA5A5',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
              }}
            >
              <AlertCircle size={16} color="var(--color-alert-red)" />
              <span>{error}</span>
            </div>
          )}

          {/* Repository Selector */}
          <div className="form-group">
            <label className="form-label" htmlFor="repo-select">
              <span>Target Repository Excavation Site</span>
              <span className="form-label-meta">
                {repos.length > 0 ? `${repos.length} REPOSITORIES DISCOVERED` : 'SCANNING DISK...'}
              </span>
            </label>
            <select
              id="repo-select"
              className="form-select"
              value={selectedRepoPath}
              onChange={(e) => {
                setSelectedRepoPath(e.target.value);
                const matched = repos.find(
                  (r) => r.relativePath === e.target.value || r.absolutePath === e.target.value
                );
                if (matched?.sampleBug) {
                  setBugReport(matched.sampleBug);
                }
              }}
            >
              {repos.length > 0 ? (
                repos.map((r) => (
                  <option key={r.id} value={r.relativePath}>
                    {r.name} — {r.summary}
                  </option>
                ))
              ) : (
                <option value="test-repositories/discount-bug">
                  discount-bug (Local Test Repository)
                </option>
              )}
            </select>
          </div>

          {/* Bug Report Textarea */}
          <div className="form-group">
            <label className="form-label" htmlFor="bug-description">
              <span>Bug Report / Observed Anomaly</span>
              <span className="form-label-meta">PRE-REPRESENTATION BRIEF</span>
            </label>
            <textarea
              id="bug-description"
              className="form-textarea"
              placeholder="Describe the failure symptoms, expected vs actual behavior, or failing assertion..."
              value={bugReport}
              onChange={(e) => setBugReport(e.target.value)}
              required
            />

            {/* Presets */}
            <div className="preset-bugs-group">
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Quick Load:</span>
              <button
                type="button"
                className="preset-chip-btn"
                onClick={() =>
                  handlePresetClick(
                    'Customers purchasing exactly 10 items are not receiving the bulk discount of 20%.'
                  )
                }
              >
                Discount Boundary Bug (10 items)
              </button>
              <button
                type="button"
                className="preset-chip-btn"
                onClick={() =>
                  handlePresetClick(
                    'Tax calculation fails on zero-rate exempt items due to division by zero in surcharge ratio.'
                  )
                }
              >
                Tax Zero-Division Bug
              </button>
              <button
                type="button"
                className="preset-chip-btn"
                onClick={() =>
                  handlePresetClick(
                    'Threshold calculation excludes upper bound edge cases in boundary condition evaluation.'
                  )
                }
              >
                Upper-Bound Boundary Bug
              </button>
            </div>
          </div>

          {/* Primary Amber CTA Button */}
          <button
            type="submit"
            className="btn-primary-excavate"
            disabled={loading || !bugReport.trim()}
            id="begin-excavation-btn"
          >
            {loading ? (
              <>
                <Cpu size={16} className="animate-spin" />
                <span>Initializing Expedition...</span>
              </>
            ) : (
              <>
                <Compass size={18} />
                <span>Begin Excavation</span>
              </>
            )}
          </button>
        </div>

        {/* Telemetry Panel */}
        <aside className="form-telemetry-card" aria-label="Investigation Target Telemetry">
          <div className="telemetry-header">
            <HardDrive size={14} color="var(--color-amber-primary)" />
            <span>Site Telemetry</span>
          </div>

          <div className="telemetry-row">
            <span className="telemetry-label">Repository Name</span>
            <span className="telemetry-value">{selectedRepo?.name || 'discount-bug'}</span>
          </div>

          <div className="telemetry-row">
            <span className="telemetry-label">Harness Type</span>
            <span className="telemetry-value">{selectedRepo?.language || 'Python (pytest)'}</span>
          </div>

          <div className="telemetry-row">
            <span className="telemetry-label">Relative Path</span>
            <span className="telemetry-value font-mono">
              {selectedRepo?.relativePath || 'test-repositories/discount-bug'}
            </span>
          </div>

          <div className="telemetry-row">
            <span className="telemetry-label">Max Repair Attempts</span>
            <span className="telemetry-value font-mono">3 Iterations</span>
          </div>

          <div className="telemetry-row">
            <span className="telemetry-label">Forensic Protocol</span>
            <span className="telemetry-value font-mono" style={{ color: 'var(--color-teal-primary)' }}>
              Non-destructive sandbox
            </span>
          </div>

          <div
            style={{
              marginTop: 'auto',
              background: 'var(--color-surface-elevated)',
              padding: '10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border-subtle)',
              fontSize: '11px',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.4,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-amber-primary)', fontWeight: 600, marginBottom: '4px' }}>
              <Code2 size={12} />
              <span>Safety Guarantee</span>
            </div>
            All patches are tested inside isolated subprocesses. Test files are strictly protected against modification.
          </div>
        </aside>
      </form>
    </div>
  );
};
