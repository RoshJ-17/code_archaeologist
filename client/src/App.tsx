import React, { useState, useEffect } from 'react';
import { Navbar, type NavigationTab } from './components/layout/Navbar';
import { NewInvestigationPage } from './pages/NewInvestigationPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { CaseHistoryPage } from './pages/CaseHistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import {
  fetchSystemConfig,
  fetchTargetRepos,
  fetchInvestigationRuns,
  startInvestigation,
} from './api/client';
import type {
  SystemConfig,
  TargetRepo,
  InvestigationRun,
} from './types/investigation';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavigationTab>('new');
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [repos, setRepos] = useState<TargetRepo[]>([]);
  const [runs, setRuns] = useState<InvestigationRun[]>([]);
  const [activeRun, setActiveRun] = useState<InvestigationRun | null>(null);

  const [loadingLaunch, setLoadingLaunch] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [serverOnline, setServerOnline] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Initialize data from real backend
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [cfg, discoveredRepos, cases] = await Promise.all([
        fetchSystemConfig().catch((e) => {
          console.warn('Config fetch issue:', e);
          setServerOnline(false);
          return null;
        }),
        fetchTargetRepos().catch((e) => {
          console.warn('Repos fetch issue:', e);
          return [];
        }),
        fetchInvestigationRuns().catch((e) => {
          console.warn('Runs fetch issue:', e);
          return [];
        }),
      ]);

      if (cfg) {
        setConfig(cfg);
        setServerOnline(true);
      }
      setRepos(discoveredRepos);
      setRuns(cases);

      // Default active run to first case if available
      if (cases.length > 0 && !activeRun) {
        setActiveRun(cases[0]);
      }
    } catch (err) {
      console.error('Failed to initialize Code Archaeologist data:', err);
      setServerOnline(false);
    }
  };

  const handleRefreshHistory = async () => {
    setHistoryLoading(true);
    try {
      const cases = await fetchInvestigationRuns();
      setRuns(cases);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleStartInvestigation = async (repoPath: string, bugReport: string) => {
    setLoadingLaunch(true);
    setLaunchError(null);

    try {
      const result = await startInvestigation(repoPath, bugReport);
      setActiveRun(result.run);
      // Prepend to cases list
      setRuns((prev) => [result.run, ...prev]);
      setActiveTab('workspace');
    } catch (err: any) {
      console.error('Failed to start excavation:', err);
      setLaunchError(err.message || 'Failed to initiate excavation.');
    } finally {
      setLoadingLaunch(false);
    }
  };

  const handleSelectHistoricalRun = (run: InvestigationRun) => {
    setActiveRun(run);
    setActiveTab('workspace');
  };

  const handleUpdateRun = (updated: InvestigationRun) => {
    setActiveRun(updated);
    setRuns((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  return (
    <div className="app-layout">
      {/* Top Forensic Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === 'history') {
            handleRefreshHistory();
          }
        }}
        config={config}
        serverOnline={serverOnline}
      />

      {/* Main Viewport Content */}
      <main className="app-main">
        {activeTab === 'new' && (
          <NewInvestigationPage
            repos={repos}
            onStartInvestigation={handleStartInvestigation}
            loading={loadingLaunch}
            error={launchError}
          />
        )}

        {activeTab === 'workspace' && activeRun && (
          <WorkspacePage
            run={activeRun}
            onUpdateRun={handleUpdateRun}
            onBackToNew={() => setActiveTab('new')}
          />
        )}

        {activeTab === 'workspace' && !activeRun && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <h2 style={{ marginBottom: '12px', color: 'var(--color-text-bone)' }}>
              No Active Investigation Selected
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
              Select a previous dossier from Case History or begin a new excavation.
            </p>
            <button
              type="button"
              className="btn-primary-excavate"
              style={{ display: 'inline-flex' }}
              onClick={() => setActiveTab('new')}
            >
              Begin New Excavation
            </button>
          </div>
        )}

        {activeTab === 'history' && (
          <CaseHistoryPage
            runs={runs}
            onSelectRun={handleSelectHistoricalRun}
            onRefresh={handleRefreshHistory}
            loading={historyLoading}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPage
            config={config}
            onConfigReload={(updated) => setConfig(updated)}
            serverOnline={serverOnline}
          />
        )}
      </main>
    </div>
  );
};

export default App;
