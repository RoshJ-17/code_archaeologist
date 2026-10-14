/**
 * CODE ARCHAEOLOGIST — API Client
 * Robust typed interaction with Express backend.
 */

import type { SystemConfig, TargetRepo, InvestigationRun } from '../types/investigation';

const API_BASE = '/api';

export async function fetchSystemConfig(): Promise<SystemConfig> {
  const res = await fetch(`${API_BASE}/config`);
  if (!res.ok) throw new Error(`Failed to load system config: ${res.statusText}`);
  return res.json();
}

export async function fetchTargetRepos(): Promise<TargetRepo[]> {
  const res = await fetch(`${API_BASE}/repos`);
  if (!res.ok) throw new Error(`Failed to load repositories: ${res.statusText}`);
  const data = await res.json();
  return data.repos || [];
}

export async function fetchInvestigationRuns(): Promise<InvestigationRun[]> {
  const res = await fetch(`${API_BASE}/runs`);
  if (!res.ok) throw new Error(`Failed to load cases: ${res.statusText}`);
  const data = await res.json();
  return data.runs || [];
}

export async function fetchRunById(id: string): Promise<InvestigationRun> {
  const res = await fetch(`${API_BASE}/runs/${id}`);
  if (!res.ok) throw new Error(`Failed to load investigation ${id}: ${res.statusText}`);
  return res.json();
}

export async function startInvestigation(
  repositoryPath: string,
  bugReport: string
): Promise<{ runId: string; run: InvestigationRun }> {
  const res = await fetch(`${API_BASE}/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repositoryPath, bugReport }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.details || `Request failed with ${res.status}`);
  }

  return res.json();
}

export function subscribeToRunEvents(
  runId: string,
  onUpdate: (payload: { type: string; event?: any; run?: InvestigationRun }) => void,
  onError?: (err: any) => void
): () => void {
  const sse = new EventSource(`${API_BASE}/runs/${runId}/events`);

  sse.onmessage = (msg) => {
    try {
      const data = JSON.parse(msg.data);
      onUpdate(data);
    } catch (e) {
      console.error('Failed to parse SSE payload', e);
    }
  };

  sse.onerror = (err) => {
    if (onError) onError(err);
  };

  return () => {
    sse.close();
  };
}
