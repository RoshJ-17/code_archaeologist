import React from 'react';
import { Logo } from '../common/Logo';
import { Search, FolderGit2, Settings, ShieldCheck, AlertTriangle } from 'lucide-react';
import type { SystemConfig } from '../../types/investigation';

export type NavigationTab = 'new' | 'history' | 'settings' | 'workspace';

interface NavbarProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  config: SystemConfig | null;
  serverOnline: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  config,
  serverOnline,
}) => {
  return (
    <header className="top-nav">
      {/* Brand Group */}
      <div className="brand-section" onClick={() => onTabChange('new')} role="button" tabIndex={0}>
        <div className="brand-logo-container">
          <Logo size={26} className="brand-logo-svg" />
        </div>
        <div className="brand-text-group">
          <div className="brand-title">
            CODE ARCHAEOLOGIST
            <span
              style={{
                fontSize: '9px',
                padding: '1px 5px',
                borderRadius: '2px',
                background: 'var(--color-amber-surface)',
                color: 'var(--color-amber-primary)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
              }}
            >
              v1.0
            </span>
          </div>
          <div className="brand-tagline">Unearth the Root Cause.</div>
        </div>
      </div>

      {/* Primary Navigation System */}
      <nav className="nav-links-group" aria-label="Main Navigation">
        <button
          className={`nav-item-btn ${activeTab === 'new' ? 'active' : ''}`}
          onClick={() => onTabChange('new')}
          id="nav-new-investigation"
        >
          <Search size={14} />
          New Investigation
        </button>

        <button
          className={`nav-item-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => onTabChange('history')}
          id="nav-case-history"
        >
          <FolderGit2 size={14} />
          Case History
        </button>

        <button
          className={`nav-item-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => onTabChange('settings')}
          id="nav-settings"
        >
          <Settings size={14} />
          Settings
        </button>
      </nav>

      {/* System Telemetry & Status Indicator */}
      <div className="nav-system-status">
        {serverOnline ? (
          config?.apiKeyConfigured ? (
            <div className="status-pill online" title="Backend connected & Gemini API ready">
              <span className="status-dot" />
              <ShieldCheck size={12} />
              <span>FORENSICS LIVE</span>
            </div>
          ) : (
            <div className="status-pill" style={{ borderColor: 'currentColor', color: 'var(--color-alert-orange)' }} title="API Key not configured in environment">
              <span className="status-dot warn" />
              <AlertTriangle size={12} />
              <span>API KEY UNSET</span>
            </div>
          )
        ) : (
          <div className="status-pill error" title="Cannot reach backend at /api">
            <span className="status-dot" style={{ backgroundColor: 'var(--color-alert-red)' }} />
            <span>BACKEND DISCONNECTED</span>
          </div>
        )}
      </div>
    </header>
  );
};
