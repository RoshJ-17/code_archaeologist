import React, { useState } from 'react';
import {
  Settings,
  ShieldCheck,
  AlertTriangle,
  Cpu,
  Lock,
  RefreshCw,
  FolderLock,
} from 'lucide-react';
import type { SystemConfig } from '../types/investigation';
import { fetchSystemConfig } from '../api/client';

interface SettingsPageProps {
  config: SystemConfig | null;
  onConfigReload: (updated: SystemConfig) => void;
  serverOnline: boolean;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  config,
  onConfigReload,
  serverOnline,
}) => {
  const [checking, setChecking] = useState(false);

  const handleTestConnection = async () => {
    setChecking(true);
    try {
      const cfg = await fetchSystemConfig();
      onConfigReload(cfg);
    } catch (e) {
      console.error(e);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: 'var(--space-lg)' }}>
        <div className="headline-eyebrow">
          <Settings size={14} />
          Forensic Architecture & Environment Diagnostics
        </div>
        <h1 className="headline-title" style={{ fontSize: '24px' }}>
          Workstation Settings & Telemetry
        </h1>
        <p className="headline-subtitle">
          Backend LangGraph runtime configuration, LLM model allocations, security guards, and credentials verification.
        </p>
      </div>

      <div className="settings-grid">
        {/* Left Column: API & Connectivity */}
        <div className="settings-card">
          <div className="detail-card-title">
            <Lock size={16} color="var(--color-amber-primary)" />
            <span>Credentials & Server Status</span>
          </div>

          <div className="settings-row">
            <div className="settings-label">
              <span className="settings-key">Server Connection</span>
              <span className="settings-desc">Express API endpoint at /api</span>
            </div>
            <span
              className="trench-badge"
              style={{
                background: serverOnline ? 'var(--color-teal-surface)' : 'var(--color-alert-red-surface)',
                color: serverOnline ? 'var(--color-teal-primary)' : 'var(--color-alert-red)',
                border: '1px solid currentColor',
              }}
            >
              {serverOnline ? 'ONLINE' : 'DISCONNECTED'}
            </span>
          </div>

          <div className="settings-row">
            <div className="settings-label">
              <span className="settings-key">Gemini API Key</span>
              <span className="settings-desc">
                {config?.apiKeyConfigured
                  ? `Configured via server environment (${config.apiKeySource})`
                  : 'Missing GOOGLE_API_KEY / GEMINI_API_KEY environment variable'}
              </span>
            </div>
            <span
              className="trench-badge"
              style={{
                background: config?.apiKeyConfigured
                  ? 'var(--color-teal-surface)'
                  : 'var(--color-alert-orange-surface)',
                color: config?.apiKeyConfigured
                  ? 'var(--color-teal-primary)'
                  : 'var(--color-alert-orange)',
                border: '1px solid currentColor',
              }}
            >
              {config?.apiKeyConfigured ? (
                <>
                  <ShieldCheck size={12} />
                  <span>SECURED</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={12} />
                  <span>NOT CONFIGURED</span>
                </>
              )}
            </span>
          </div>

          <div className="settings-row">
            <div className="settings-label">
              <span className="settings-key">Credential Storage Security</span>
              <span className="settings-desc">Zero secret keys exposed to browser</span>
            </div>
            <span className="trench-badge font-mono" style={{ color: 'var(--color-teal-primary)' }}>
              SERVER-SIDE ONLY
            </span>
          </div>

          <button
            type="button"
            className="btn-inspect-case"
            onClick={handleTestConnection}
            disabled={checking}
            style={{ marginTop: 'auto', padding: '10px 16px', justifyContent: 'center' }}
            id="test-connection-btn"
          >
            <RefreshCw size={13} className={checking ? 'animate-spin' : ''} />
            <span>{checking ? 'Pinging Server...' : 'Test Connection & Re-evaluate'}</span>
          </button>
        </div>

        {/* Right Column: Model Allocation Matrix */}
        <div className="settings-card">
          <div className="detail-card-title">
            <Cpu size={16} color="var(--color-violet-primary)" />
            <span>Agent LLM Model Allocation</span>
          </div>

          <div className="settings-row">
            <div className="settings-label">
              <span className="settings-key">Repository Analyst</span>
              <span className="settings-desc">High-context structural parsing</span>
            </div>
            <span className="font-mono" style={{ color: 'var(--color-text-bone)', fontSize: '12px' }}>
              {config?.models?.analyst || 'gemini-3.8-flash'}
            </span>
          </div>

          <div className="settings-row">
            <div className="settings-label">
              <span className="settings-key">Diagnosis Agent</span>
              <span className="settings-desc">Causal inference & evidence weighting</span>
            </div>
            <span className="font-mono" style={{ color: 'var(--color-violet-primary)', fontSize: '12px' }}>
              {config?.models?.diagnosis || 'gemini-3.8-flash'}
            </span>
          </div>

          <div className="settings-row">
            <div className="settings-label">
              <span className="settings-key">Fix Agent</span>
              <span className="settings-desc">Minimal unified diff synthesis</span>
            </div>
            <span className="font-mono" style={{ color: 'var(--color-amber-primary)', fontSize: '12px' }}>
              {config?.models?.fix || 'gemini-3.8-flash'}
            </span>
          </div>

          <div className="settings-row">
            <div className="settings-label">
              <span className="settings-key">QA Agent</span>
              <span className="settings-desc">Failure analysis & test output extraction</span>
            </div>
            <span className="font-mono" style={{ color: 'var(--color-teal-primary)', fontSize: '12px' }}>
              {config?.models?.qa || 'gemini-3.8-flash'}
            </span>
          </div>

          <div className="settings-row">
            <div className="settings-label">
              <span className="settings-key">Review Agent</span>
              <span className="settings-desc">Strict semantic gate & validation audit</span>
            </div>
            <span className="font-mono" style={{ color: 'var(--color-teal-primary)', fontSize: '12px' }}>
              {config?.models?.review || 'gemini-3.8-flash'}
            </span>
          </div>
        </div>

        {/* Forensic Safety & Sandbox Policy Card */}
        <div className="settings-card" style={{ gridColumn: 'span 2' }}>
          <div className="detail-card-title">
            <FolderLock size={16} color="var(--color-teal-primary)" />
            <span>Forensic Safety Guarantees & Constraints</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-md)' }}>
            <div className="qa-card-box">
              <div className="qa-card-title">
                <span>Immutability & Sandbox</span>
                <span style={{ color: 'var(--color-teal-primary)' }}>ACTIVE</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                Files modified during QA testing are strictly reverted after test completion.
              </div>
            </div>

            <div className="qa-card-box">
              <div className="qa-card-title">
                <span>Test File Protection</span>
                <span style={{ color: 'var(--color-teal-primary)' }}>ENFORCED</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                Fix Agent and Review Agent reject any attempt to modify tests to make them pass.
              </div>
            </div>

            <div className="qa-card-box">
              <div className="qa-card-title">
                <span>Loop Bound Check</span>
                <span style={{ color: 'var(--color-teal-primary)' }}>MAX 3 LOOPS</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                The LangGraph router caps repair attempts to exactly 3 iterations before termination.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
