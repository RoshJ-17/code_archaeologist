import React, { useState, useEffect } from 'react';
import {
  Layers,
  Search,
  Wrench,
  CheckCircle2,
  FileCheck,
  AlertTriangle,
  AlertOctagon,
  Copy,
  Check,
  Terminal,
  Clock,
  ShieldAlert,
  GitBranch,
} from 'lucide-react';
import type {
  InvestigationRun,
  AgentStage,
} from '../types/investigation';
import { subscribeToRunEvents } from '../api/client';

interface WorkspacePageProps {
  run: InvestigationRun;
  onUpdateRun: (updated: InvestigationRun) => void;
  onBackToNew: () => void;
}

export const WorkspacePage: React.FC<WorkspacePageProps> = ({
  run,
  onUpdateRun,
  onBackToNew,
}) => {
  const [selectedStage, setSelectedStage] = useState<AgentStage>(
    (run.currentAgent as AgentStage) || 'review_agent'
  );
  const [copiedDiff, setCopiedDiff] = useState(false);
  const [streamActive, setStreamActive] = useState(run.status === 'RUNNING' || run.status === 'QUEUED');

  // Real-time SSE listener
  useEffect(() => {
    if (run.status === 'COMPLETED' || run.status === 'FAILED' || run.status === 'TERMINATED') {
      setStreamActive(false);
      return;
    }

    setStreamActive(true);
    const unsubscribe = subscribeToRunEvents(
      run.id,
      (data) => {
        if (data.run) {
          onUpdateRun(data.run);
          if (data.run.currentAgent) {
            setSelectedStage(data.run.currentAgent);
          }
          if (data.run.status === 'COMPLETED' || data.run.status === 'FAILED') {
            setStreamActive(false);
          }
        }
      },
      (err) => {
        console.warn('SSE stream disconnected, fallback to current state:', err);
        setStreamActive(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [run.id, run.status]);

  // Keep selectedStage aligned when currentAgent changes
  useEffect(() => {
    if (run.currentAgent && run.status === 'RUNNING') {
      setSelectedStage(run.currentAgent);
    } else if (run.status === 'COMPLETED' && run.state.validation) {
      setSelectedStage('review_agent');
    }
  }, [run.currentAgent, run.status]);

  const handleCopyDiff = (diffText: string) => {
    navigator.clipboard.writeText(diffText);
    setCopiedDiff(true);
    setTimeout(() => setCopiedDiff(false), 2000);
  };

  const agents: Array<{
    id: AgentStage;
    name: string;
    num: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    accent: 'amber' | 'violet' | 'teal';
  }> = [
    { id: 'repository_analyst', name: 'Repository Analyst', num: '01', icon: Layers, accent: 'amber' },
    { id: 'diagnosis_agent', name: 'Diagnosis Agent', num: '02', icon: Search, accent: 'violet' },
    { id: 'fix_agent', name: 'Fix Agent', num: '03', icon: Wrench, accent: 'amber' },
    { id: 'qa_agent', name: 'QA Agent', num: '04', icon: CheckCircle2, accent: 'teal' },
    { id: 'review_agent', name: 'Review Agent', num: '05', icon: FileCheck, accent: 'teal' },
  ];

  // Derive agent status
  const getAgentStatus = (agentId: AgentStage) => {
    if (run.error && run.currentAgent === agentId) return 'error';
    if (run.currentAgent === agentId && run.status === 'RUNNING') return 'active';
    if (run.completedAgents.includes(agentId)) return 'complete';
    return 'pending';
  };

  const st = run.state || {};
  const analysis = st.repository_analysis;
  const diagnosis = st.diagnosis;
  const patch = st.patch;
  const qa = st.test_results;
  const validation = st.validation;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      {/* Top Dossier Status Banner */}
      <section
        className={`dossier-banner ${
          run.outcome === 'VERIFIED'
            ? 'verified'
            : run.outcome === 'REJECTED'
            ? 'rejected'
            : run.status === 'FAILED'
            ? 'failed'
            : ''
        }`}
        aria-label="Investigation Dossier Summary"
      >
        <div className="dossier-meta">
          <div className="dossier-id">
            <GitBranch size={13} />
            <span>INVESTIGATION DOSSIER: {run.id}</span>
            <span style={{ color: 'var(--color-text-muted)' }}>•</span>
            <span style={{ color: 'var(--color-text-secondary)' }}>
              {new Date(run.createdAt).toLocaleTimeString()}
            </span>
            {streamActive && (
              <span
                style={{
                  color: 'var(--color-amber-primary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span className="status-dot" style={{ backgroundColor: 'var(--color-amber-primary)' }} />
                LIVE STREAM
              </span>
            )}
          </div>
          <div className="dossier-repo">{run.repositoryName}</div>
          <div className="dossier-bug-preview">
            <span style={{ color: 'var(--color-amber-primary)', fontWeight: 600 }}>Anomaly: </span>
            {run.bugReport}
          </div>
        </div>

        {/* Big Outcome State Badge */}
        <div>
          {run.status === 'RUNNING' && (
            <div className="dossier-outcome-badge running" id="outcome-running-badge">
              <span className="status-dot" style={{ backgroundColor: 'var(--color-amber-primary)' }} />
              EXCAVATING STAGE ({run.currentAgent?.replace('_', ' ').toUpperCase() || 'RUNNING'})
            </div>
          )}

          {run.status === 'COMPLETED' && run.outcome === 'VERIFIED' && (
            <div className="dossier-outcome-badge verified" id="outcome-verified-badge">
              <CheckCircle2 size={16} />
              VERIFIED & VALIDATED
            </div>
          )}

          {run.status === 'COMPLETED' && run.outcome === 'REJECTED' && (
            <div className="dossier-outcome-badge rejected" id="outcome-rejected-badge">
              <AlertOctagon size={16} />
              REPAIR REJECTED BY AUDIT
            </div>
          )}

          {run.status === 'COMPLETED' && run.outcome === 'QA_FAILED' && (
            <div className="dossier-outcome-badge qa-fail" id="outcome-qafail-badge">
              <AlertTriangle size={16} />
              QA REGRESSION FAILURE
            </div>
          )}

          {run.status === 'COMPLETED' && run.outcome === 'INCONCLUSIVE' && (
            <div className="dossier-outcome-badge rejected" id="outcome-inconclusive-badge">
              <AlertTriangle size={16} />
              QA INCONCLUSIVE
            </div>
          )}

          {run.status === 'FAILED' && (
            <div className="dossier-outcome-badge error" id="outcome-error-badge">
              <ShieldAlert size={16} />
              EXPEDITION TERMINATED
            </div>
          )}
        </div>
      </section>

      {/* Prominent Warning if Repository Restoration Failed */}
      {qa && qa.restored === false && (
        <div className="restoration-warning-box" role="alert" id="restoration-failed-warning">
          <ShieldAlert size={20} color="var(--color-alert-red)" />
          <div>
            <strong>CRITICAL FORENSIC WARNING: Repository Restoration Failed!</strong>
            <div style={{ fontSize: '12px', marginTop: '2px' }}>
              The QA Agent applied a temporary patch for testing, but reverting the changes back to pristine
              condition failed. Files in the target repository may remain dirty or modified. Manual git checkout is advised.
            </div>
          </div>
        </div>
      )}

      {/* Honest Error Reporting (e.g. Missing API key, quota limit, path issue) */}
      {run.error && (
        <div
          style={{
            background: 'var(--color-alert-red-surface)',
            border: '1px solid var(--color-alert-red)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            color: 'var(--color-alert-red)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
          id="investigation-error-banner"
        >
          <AlertOctagon size={20} color="var(--color-alert-red)" style={{ marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: 700, color: '#FFFFFF', fontSize: '14px', marginBottom: '4px' }}>
              Agent Failure Recorded
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#FEE2E2' }}>
              {run.error}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
              Note: The system preserves complete honesty regarding API quota exhaustion, model failures, or missing credentials. No simulated success was generated.
            </div>
          </div>
        </div>
      )}

      {/* Workspace Split Layout: Timeline + Main Forensic Stage */}
      <div className="workspace-grid">
        {/* Left-Side 5-Agent Investigation Timeline */}
        <aside className="timeline-card" aria-label="Investigation Agent Timeline">
          <div className="timeline-title-bar">
            <span className="timeline-title">
              <Clock size={14} color="var(--color-amber-primary)" />
              Expedition Sequence
            </span>
            <span className="timeline-iteration-badge">
              ITERATION {run.iteration || 1} / 3
            </span>
          </div>

          <div className="timeline-agents-list">
            {agents.map((agent, index) => {
              const status = getAgentStatus(agent.id);
              const isSelected = selectedStage === agent.id;
              const Icon = agent.icon;

              return (
                <div key={agent.id} style={{ position: 'relative' }}>
                  {index < agents.length - 1 && (
                    <div
                      className={`agent-connector-line ${
                        status === 'complete' || status === 'active' ? 'active' : ''
                      }`}
                    />
                  )}

                  <button
                    type="button"
                    className={`agent-node ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedStage(agent.id)}
                    id={`timeline-agent-${agent.id}`}
                  >
                    <div className="agent-marker-container">
                      <div className={`agent-marker ${status}`}>
                        {status === 'complete' ? (
                          <Check size={12} />
                        ) : status === 'error' ? (
                          <AlertTriangle size={12} />
                        ) : (
                          agent.num
                        )}
                      </div>
                    </div>

                    <div className="agent-info">
                      <div className="agent-title">{agent.name}</div>
                      <div className="agent-status-label">
                        <Icon size={11} />
                        <span style={{ textTransform: 'uppercase' }}>{status}</span>
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Quick Context Summary */}
          <div
            style={{
              marginTop: 'var(--space-md)',
              paddingTop: 'var(--space-md)',
              borderTop: '1px solid var(--color-border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontSize: '11px',
              color: 'var(--color-text-secondary)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="font-mono">Target:</span>
              <span className="font-mono" style={{ color: 'var(--color-text-bone)' }}>
                {run.repositoryName}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="font-mono">Total Events:</span>
              <span className="font-mono" style={{ color: 'var(--color-amber-primary)' }}>
                {run.events?.length || 0}
              </span>
            </div>
            <button
              type="button"
              onClick={onBackToNew}
              style={{
                marginTop: '8px',
                background: 'transparent',
                border: '1px solid var(--color-border-bright)',
                color: 'var(--color-text-secondary)',
                padding: '6px',
                borderRadius: 'var(--radius-xs)',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <span>← New Investigation</span>
            </button>
          </div>
        </aside>

        {/* Main Context-Sensitive Detail Panels */}
        <main className="workspace-main-panel">
          {/* Stage Tab Selector */}
          <nav className="stage-tabs-bar" aria-label="Forensic Stage Panels">
            <button
              className={`stage-tab-btn ${selectedStage === 'repository_analyst' ? 'active' : ''}`}
              onClick={() => setSelectedStage('repository_analyst')}
            >
              <Layers size={14} />
              Repository Overview
            </button>

            <button
              className={`stage-tab-btn violet ${selectedStage === 'diagnosis_agent' ? 'active' : ''}`}
              onClick={() => setSelectedStage('diagnosis_agent')}
            >
              <Search size={14} />
              Root-Cause Diagnosis
            </button>

            <button
              className={`stage-tab-btn ${selectedStage === 'fix_agent' ? 'active' : ''}`}
              onClick={() => setSelectedStage('fix_agent')}
            >
              <Wrench size={14} />
              Reconstructed Patch
            </button>

            <button
              className={`stage-tab-btn teal ${selectedStage === 'qa_agent' ? 'active' : ''}`}
              onClick={() => setSelectedStage('qa_agent')}
            >
              <CheckCircle2 size={14} />
              QA Test Verification
            </button>

            <button
              className={`stage-tab-btn teal ${selectedStage === 'review_agent' ? 'active' : ''}`}
              onClick={() => setSelectedStage('review_agent')}
            >
              <FileCheck size={14} />
              Validation Audit Gate
            </button>
          </nav>

          {/* ── PANEL 1: REPOSITORY ANALYST ─────────────────────────── */}
          {selectedStage === 'repository_analyst' && (
            <section className="detail-card" aria-label="Repository Analysis Panel">
              <div className="detail-card-header">
                <div className="detail-card-title">
                  <Layers size={18} color="var(--color-amber-primary)" />
                  <span>Repository Stratigraphy & Symbol Mapping</span>
                </div>
                <div className="detail-card-meta">STAGE 01 • AGENT OUTPUT</div>
              </div>

              {analysis ? (
                <>
                  <div className="forensic-callout" style={{ borderLeftColor: 'var(--color-amber-primary)' }}>
                    <div className="callout-label" style={{ color: 'var(--color-amber-primary)' }}>
                      Repository Forensic Summary
                    </div>
                    <div className="callout-text">
                      {analysis.repository_summary || 'Repository indexed successfully.'}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                    {/* Relevant Source Files */}
                    <div className="qa-card-box">
                      <div className="qa-card-title">
                        <span>Relevant Target Files</span>
                        <span>{analysis.relevant_files?.length || 0}</span>
                      </div>
                      <div className="qa-card-content">
                        {analysis.relevant_files && analysis.relevant_files.length > 0 ? (
                          analysis.relevant_files.map((file, i) => (
                            <div key={i} style={{ color: 'var(--color-amber-primary)', padding: '2px 0' }}>
                              › {file}
                            </div>
                          ))
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)' }}>None identified</span>
                        )}
                      </div>
                    </div>

                    {/* Relevant Tests */}
                    <div className="qa-card-box">
                      <div className="qa-card-title">
                        <span>Identified Test Fixtures</span>
                        <span>{analysis.relevant_tests?.length || 0}</span>
                      </div>
                      <div className="qa-card-content">
                        {analysis.relevant_tests && analysis.relevant_tests.length > 0 ? (
                          analysis.relevant_tests.map((test, i) => (
                            <div key={i} style={{ color: 'var(--color-teal-primary)', padding: '2px 0' }}>
                              ✓ {test}
                            </div>
                          ))
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)' }}>None identified</span>
                        )}
                      </div>
                    </div>

                    {/* Functions */}
                    <div className="qa-card-box">
                      <div className="qa-card-title">
                        <span>Suspect Functions</span>
                        <span>{analysis.relevant_functions?.length || 0}</span>
                      </div>
                      <div className="qa-card-content">
                        {analysis.relevant_functions && analysis.relevant_functions.length > 0 ? (
                          analysis.relevant_functions.map((fn, i) => (
                            <div key={i} style={{ color: 'var(--color-text-bone)', padding: '2px 0' }}>
                              ƒ {fn}()
                            </div>
                          ))
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)' }}>None identified</span>
                        )}
                      </div>
                    </div>

                    {/* Dependencies */}
                    <div className="qa-card-box">
                      <div className="qa-card-title">
                        <span>Harness & Dependencies</span>
                        <span>{analysis.dependencies?.length || 0}</span>
                      </div>
                      <div className="qa-card-content">
                        {analysis.dependencies && analysis.dependencies.length > 0 ? (
                          analysis.dependencies.map((dep, i) => (
                            <div key={i} style={{ color: 'var(--color-text-secondary)', padding: '2px 0' }}>
                              pkg: {dep}
                            </div>
                          ))
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)' }}>Standard library</span>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  Repository Analyst stage has not produced artifacts yet.
                </div>
              )}
            </section>
          )}

          {/* ── PANEL 2: DIAGNOSIS AGENT ────────────────────────────── */}
          {selectedStage === 'diagnosis_agent' && (
            <section className="detail-card" aria-label="Diagnosis Panel">
              <div className="detail-card-header">
                <div className="detail-card-title">
                  <Search size={18} color="var(--color-violet-primary)" />
                  <span>Causal Forensic Findings & Evidence</span>
                </div>
                <div className="detail-card-meta">STAGE 02 • FORENSIC DIAGNOSIS</div>
              </div>

              {diagnosis ? (
                <div className="diagnosis-grid">
                  <div className="diagnosis-main">
                    {/* Suspected Location Coordinates */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        background: 'var(--color-surface-elevated)',
                        padding: '12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border-subtle)',
                      }}
                    >
                      <span className="trench-badge" style={{ background: 'var(--color-violet-surface)', color: 'var(--color-violet-primary)' }}>
                        SUSPECT FILE
                      </span>
                      <span className="font-mono" style={{ color: 'var(--color-text-bone)', fontWeight: 600 }}>
                        {diagnosis.suspectedFile || 'Unknown'}
                      </span>
                      <span style={{ color: 'var(--color-text-muted)' }}>:</span>
                      <span className="font-mono" style={{ color: 'var(--color-amber-primary)' }}>
                        {diagnosis.suspectedFunction || 'Unknown'}()
                      </span>
                      {diagnosis.suspectedLocation && (
                        <span className="font-mono" style={{ color: 'var(--color-teal-primary)', marginLeft: 'auto' }}>
                          loc: {diagnosis.suspectedLocation}
                        </span>
                      )}
                    </div>

                    {/* Root Cause Callout */}
                    <div className="forensic-callout">
                      <div className="callout-label">Root Cause Hypothesis</div>
                      <div className="callout-text">{diagnosis.rootCause}</div>
                    </div>

                    {/* Expected vs Actual */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                      <div className="qa-card-box" style={{ borderColor: 'var(--color-success)' }}>
                        <div className="qa-card-title" style={{ color: 'var(--color-success)' }}>
                          Expected Behavior
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-primary)', marginTop: '4px' }}>
                          {diagnosis.expectedBehavior || 'N/A'}
                        </div>
                      </div>

                      <div className="qa-card-box" style={{ borderColor: 'var(--color-alert-red)' }}>
                        <div className="qa-card-title" style={{ color: 'var(--color-alert-red)' }}>
                          Observed Anomaly
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-primary)', marginTop: '4px' }}>
                          {diagnosis.actualBehavior || 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Evidence References */}
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
                        Traced Evidence References ({diagnosis.evidence?.length || 0})
                      </div>
                      <div className="evidence-items-list">
                        {diagnosis.evidence && diagnosis.evidence.length > 0 ? (
                          diagnosis.evidence.map((ev, idx) => (
                            <div key={idx} className="evidence-item">
                              <span className="evidence-pin">#0{idx + 1}</span>
                              <span>{ev}</span>
                            </div>
                          ))
                        ) : (
                          <div style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
                            No explicit evidence pins recorded.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Confidence Gauge */}
                  <div className="confidence-meter-card">
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                      Diagnostic Confidence
                    </div>
                    <div className="confidence-big-pct">
                      {Math.round((diagnosis.confidence || 0) * 100)}%
                    </div>
                    <div className="confidence-bar-track">
                      <div
                        className="confidence-bar-fill"
                        style={{ width: `${Math.round((diagnosis.confidence || 0) * 100)}%` }}
                      />
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
                      Based on AST anomaly match, test failure reproduction, and symbol correlation.
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  Diagnosis stage in progress or pending.
                </div>
              )}
            </section>
          )}

          {/* ── PANEL 3: FIX AGENT (PATCH & DIFF) ───────────────────── */}
          {selectedStage === 'fix_agent' && (
            <section className="detail-card" aria-label="Patch Reconstruction Panel">
              <div className="detail-card-header">
                <div className="detail-card-title">
                  <Wrench size={18} color="var(--color-amber-primary)" />
                  <span>Reconstructed Patch & Unified Diff</span>
                </div>
                <div className="detail-card-meta">
                  <span className="patch-state-tag proposed">STATUS: {patch?.status || 'PROPOSED'}</span>
                </div>
              </div>

              {patch ? (
                <>
                  <div className="forensic-callout" style={{ borderLeftColor: 'var(--color-amber-primary)' }}>
                    <div className="callout-label" style={{ color: 'var(--color-amber-primary)' }}>
                      Repair Explanation
                    </div>
                    <div className="callout-text">{patch.explanation}</div>
                  </div>

                  {/* Patch Persistence Disclaimer: NEVER pretend fix is permanently applied */}
                  <div
                    style={{
                      background: 'var(--color-surface-elevated)',
                      border: '1px solid var(--color-border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-amber-primary)' }}>
                      <AlertTriangle size={14} />
                      <span>
                        Patch State: <strong>{patch.status || 'PROPOSED'}</strong> — tested in isolated sandbox.
                        Files in the repository are restored to pristine condition after QA.
                      </span>
                    </div>
                    <span className="trench-badge" style={{ color: 'var(--color-teal-primary)' }}>
                      NON-DESTRUCTIVE
                    </span>
                  </div>

                  {/* Unified Diff Block */}
                  {patch.diff && (
                    <div className="diff-container">
                      <div className="diff-header-bar">
                        <div className="diff-filepath">
                          <span>UNIFIED DIFF</span>
                          <span style={{ color: 'var(--color-text-muted)' }}>•</span>
                          <span style={{ color: 'var(--color-text-primary)' }}>
                            {patch.modifiedFiles?.join(', ') || 'target-delta.diff'}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="diff-copy-btn"
                          onClick={() => handleCopyDiff(patch.diff || '')}
                          id="copy-diff-btn"
                        >
                          {copiedDiff ? (
                            <>
                              <Check size={12} color="var(--color-teal-primary)" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Copy Patch</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="diff-lines-block">
                        {patch.diff.split('\n').map((line, idx) => {
                          let lineType = '';
                          if (line.startsWith('+') && !line.startsWith('+++')) lineType = 'addition';
                          else if (line.startsWith('-') && !line.startsWith('---')) lineType = 'deletion';
                          else if (line.startsWith('@@') || line.startsWith('---') || line.startsWith('+++'))
                            lineType = 'header';

                          return (
                            <div key={idx} className={`diff-line ${lineType}`}>
                              <span className="diff-line-num">{idx + 1}</span>
                              <span>{line}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Individual Changes Breakdown */}
                  {patch.changes && patch.changes.length > 0 && (
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
                        Individual Code Deltas ({patch.changes.length})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                        {patch.changes.map((change, i) => (
                          <div
                            key={i}
                            style={{
                              background: 'var(--color-obsidian)',
                              border: '1px solid var(--color-border-subtle)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '12px',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '12px',
                            }}
                          >
                            <div style={{ color: 'var(--color-amber-primary)', marginBottom: '6px', fontWeight: 600 }}>
                              {change.file}: {change.reason}
                            </div>
                            <div style={{ color: 'var(--color-alert-red)', background: 'var(--color-alert-red-surface)', padding: '6px', borderRadius: 'var(--radius-xs)', marginBottom: '4px' }}>
                              <span style={{ userSelect: 'none', marginRight: '6px' }}>-</span>
                              {change.originalCode}
                            </div>
                            <div style={{ color: 'var(--color-success)', background: 'var(--color-success-surface)', padding: '6px', borderRadius: 'var(--radius-xs)' }}>
                              <span style={{ userSelect: 'none', marginRight: '6px' }}>+</span>
                              {change.fixedCode}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  Fix Agent has not generated a patch delta yet.
                </div>
              )}
            </section>
          )}

          {/* ── PANEL 4: QA AGENT (TEST RESULTS & SANDBOX) ──────────── */}
          {selectedStage === 'qa_agent' && (
            <section className="detail-card" aria-label="QA Verification Panel">
              <div className="detail-card-header">
                <div className="detail-card-title">
                  <CheckCircle2 size={18} color="var(--color-teal-primary)" />
                  <span>QA Sandbox & Regression Sweep</span>
                </div>
                <div className="detail-card-meta">
                  <span
                    className="trench-badge"
                    style={{
                      background:
                        qa?.status === 'PASS'
                          ? 'var(--color-teal-surface)'
                          : qa?.status === 'FAIL'
                          ? 'var(--color-alert-red-surface)'
                          : 'var(--color-surface-elevated)',
                      color:
                        qa?.status === 'PASS'
                          ? 'var(--color-teal-primary)'
                          : qa?.status === 'FAIL'
                          ? 'var(--color-alert-red)'
                          : 'var(--color-text-secondary)',
                      border: '1px solid currentColor',
                    }}
                  >
                    STATUS: {qa?.status || 'PENDING'}
                  </span>
                </div>
              </div>

              {qa ? (
                <>
                  <div className="forensic-callout" style={{ borderLeftColor: 'var(--color-teal-primary)' }}>
                    <div className="callout-label" style={{ color: 'var(--color-teal-primary)' }}>
                      QA Evaluation Summary
                    </div>
                    <div className="callout-text">{qa.summary}</div>
                  </div>

                  {/* Sandbox Isolation & Restoration Check */}
                  <div className="qa-grid">
                    <div className="qa-card-box">
                      <div className="qa-card-title">
                        <span>Patch Applied in Sandbox</span>
                        <span style={{ color: qa.applied ? 'var(--color-teal-primary)' : 'var(--color-alert-orange)' }}>
                          {qa.applied ? 'YES (TEMPORARY)' : 'NO'}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                        Patch was injected into sandbox filesystem for subprocess execution.
                      </div>
                    </div>

                    <div className="qa-card-box">
                      <div className="qa-card-title">
                        <span>Repository Immutability Restored</span>
                        <span style={{ color: qa.restored ? 'var(--color-teal-primary)' : 'var(--color-alert-red)', fontWeight: 700 }}>
                          {qa.restored ? 'CLEANLY RESTORED' : 'RESTORATION FAILED'}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                        {qa.restored
                          ? 'All modified files verified back to pristine state.'
                          : 'CRITICAL: Files may remain modified in sandbox!'}
                      </div>
                    </div>
                  </div>

                  {/* Targeted vs Full Test Suite Runs */}
                  <div className="qa-grid">
                    <div className="qa-card-box">
                      <div className="qa-card-title">
                        <span>Targeted Bug Tests</span>
                        <span style={{ color: qa.targetedTests?.passed ? 'var(--color-teal-primary)' : 'var(--color-alert-red)' }}>
                          {qa.targetedTests?.passed ? 'PASSED' : 'FAILED'}
                        </span>
                      </div>
                      <div className="qa-card-content">
                        {qa.targetedTests?.details || 'Targeted test details unavailable'}
                      </div>
                    </div>

                    <div className="qa-card-box">
                      <div className="qa-card-title">
                        <span>Full Regression Suite</span>
                        <span style={{ color: qa.fullTests?.passed ? 'var(--color-teal-primary)' : 'var(--color-alert-red)' }}>
                          {qa.fullTests?.passed ? 'ALL PASSED' : 'REGRESSION DETECTED'}
                        </span>
                      </div>
                      <div className="qa-card-content">
                        {qa.fullTests?.details || 'Full test suite details unavailable'}
                      </div>
                    </div>
                  </div>

                  {/* Failures List if any */}
                  {qa.failures && qa.failures.length > 0 && (
                    <div style={{ marginTop: 'var(--space-sm)' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-alert-red)', marginBottom: '8px', textTransform: 'uppercase' }}>
                        Detected Failures ({qa.failures.length})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {qa.failures.map((f, i) => (
                          <div
                            key={i}
                            style={{
                              background: 'var(--color-alert-red-surface)',
                              border: '1px solid var(--color-alert-red)',
                              borderRadius: 'var(--radius-xs)',
                              padding: '8px 12px',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '11px',
                              color: 'var(--color-alert-red)',
                            }}
                          >
                            <strong>{f.test}:</strong> {f.reason}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  QA Agent test run has not completed yet.
                </div>
              )}
            </section>
          )}

          {/* ── PANEL 5: REVIEW & VALIDATION AGENT ──────────────────── */}
          {selectedStage === 'review_agent' && (
            <section className="detail-card" aria-label="Review Agent Panel">
              <div className="detail-card-header">
                <div className="detail-card-title">
                  <FileCheck size={18} color="var(--color-teal-primary)" />
                  <span>Independent Audit & Validation Scorecard</span>
                </div>
                <div className="detail-card-meta">
                  <span
                    className="trench-badge"
                    style={{
                      background:
                        validation?.status === 'VERIFIED'
                          ? 'var(--color-teal-surface)'
                          : 'var(--color-alert-orange-surface)',
                      color:
                        validation?.status === 'VERIFIED'
                          ? 'var(--color-teal-primary)'
                          : 'var(--color-alert-orange)',
                      border: '1px solid currentColor',
                    }}
                  >
                    VERDICT: {validation?.status || 'PENDING'}
                  </span>
                </div>
              </div>

              {validation ? (
                <>
                  <div
                    className="forensic-callout"
                    style={{
                      borderLeftColor:
                        validation.status === 'VERIFIED'
                          ? 'var(--color-teal-primary)'
                          : 'var(--color-alert-orange)',
                    }}
                  >
                    <div
                      className="callout-label"
                      style={{
                        color:
                          validation.status === 'VERIFIED'
                            ? 'var(--color-teal-primary)'
                            : 'var(--color-alert-orange)',
                      }}
                    >
                      Audit Determination Reason
                    </div>
                    <div className="callout-text">{validation.reason}</div>
                  </div>

                  {/* 6-Point Semantic Validation Checklist */}
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '10px', textTransform: 'uppercase' }}>
                      Audit Criteria Compliance Matrix
                    </div>
                    <div className="validation-checklist">
                      <div className="checklist-item">
                        <span className="checklist-label">Root Cause Directly Addressed</span>
                        <span className={`checklist-badge ${validation.rootCauseAddressed ? 'pass' : 'fail'}`}>
                          {validation.rootCauseAddressed ? 'COMPLIANT' : 'NON-COMPLIANT'}
                        </span>
                      </div>

                      <div className="checklist-item">
                        <span className="checklist-label">Minimal Blast Radius Patch</span>
                        <span className={`checklist-badge ${validation.minimalPatch ? 'pass' : 'fail'}`}>
                          {validation.minimalPatch ? 'COMPLIANT' : 'EXCESSIVE'}
                        </span>
                      </div>

                      <div className="checklist-item">
                        <span className="checklist-label">Test Suite Verification Pass</span>
                        <span className={`checklist-badge ${validation.testsPassed ? 'pass' : 'fail'}`}>
                          {validation.testsPassed ? 'PASSED' : 'FAILED'}
                        </span>
                      </div>

                      <div className="checklist-item">
                        <span className="checklist-label">Zero Unrelated File Mutations</span>
                        <span className={`checklist-badge ${!validation.unrelatedChanges ? 'pass' : 'fail'}`}>
                          {!validation.unrelatedChanges ? 'CLEAN' : 'POLLUTED'}
                        </span>
                      </div>

                      <div className="checklist-item">
                        <span className="checklist-label">Diagnosis-to-Patch Consistency</span>
                        <span className={`checklist-badge ${validation.diagnosisPatchConsistent ? 'pass' : 'fail'}`}>
                          {validation.diagnosisPatchConsistent ? 'ALIGNED' : 'DISCREPANCY'}
                        </span>
                      </div>

                      <div className="checklist-item">
                        <span className="checklist-label">Bug Coverage Adequacy</span>
                        <span className={`checklist-badge ${validation.bugCoverageAdequate ? 'pass' : 'fail'}`}>
                          {validation.bugCoverageAdequate ? 'SUFFICIENT' : 'INSUFFICIENT'}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  Review Agent audit gate pending execution.
                </div>
              )}
            </section>
          )}

          {/* Real-time Forensic Event Stream Console */}
          <section className="detail-card" style={{ padding: 'var(--space-md)' }} aria-label="Event Log Stream">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                <Terminal size={14} color="var(--color-amber-primary)" />
                <span>Forensic Telemetry Feed ({run.events?.length || 0} events)</span>
              </div>
              <span className="trench-badge" style={{ color: 'var(--color-text-muted)' }}>
                STDOUT / SSE
              </span>
            </div>

            <div className="events-console">
              {run.events && run.events.length > 0 ? (
                run.events.map((ev, i) => (
                  <div key={i} className="event-log-entry">
                    <span className="event-timestamp">
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </span>
                    {ev.agent && <span className="event-agent-tag">[{ev.agent}]</span>}
                    <span className="event-msg">{ev.message}</span>
                  </div>
                ))
              ) : (
                <div style={{ color: 'var(--color-text-muted)' }}>No telemetry events recorded yet.</div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};
