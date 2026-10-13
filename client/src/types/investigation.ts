/**
 * CODE ARCHAEOLOGIST — Type Definitions
 * Accurately models the 5 LangGraph agent state outputs and API contracts.
 */

export type AgentStage = 
  | 'repository_analyst'
  | 'diagnosis_agent'
  | 'fix_agent'
  | 'qa_agent'
  | 'review_agent';

export type InvestigationOutcome = 
  | 'VERIFIED'
  | 'REJECTED'
  | 'QA_FAILED'
  | 'INCONCLUSIVE'
  | 'ERROR'
  | null;

export type RunStatus = 
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'TERMINATED';

export interface RepositoryAnalysis {
  relevant_files?: string[];
  relevant_functions?: string[];
  relevant_classes?: string[];
  relevant_tests?: string[];
  dependencies?: string[];
  repository_summary?: string;
  fileCount?: number;
}

export interface Diagnosis {
  suspectedFile?: string;
  suspectedFunction?: string;
  suspectedLocation?: string;
  rootCause?: string;
  evidence?: string[];
  expectedBehavior?: string;
  actualBehavior?: string;
  confidence?: number;
}

export interface PatchChange {
  file: string;
  originalCode: string;
  fixedCode: string;
  reason: string;
}

export interface Patch {
  explanation?: string;
  modifiedFiles?: string[];
  diff?: string;
  changes?: PatchChange[];
  status?: string; // 'PROPOSED'
}

export interface QAFailure {
  test: string;
  reason: string;
  relatedToPatch?: boolean;
}

export interface TestResults {
  status?: 'PASS' | 'FAIL' | 'INCONCLUSIVE';
  summary?: string;
  originalBugVerified?: boolean;
  regressionsDetected?: boolean;
  targetedTests?: {
    passed: boolean;
    details?: string;
  };
  fullTests?: {
    passed: boolean;
    details?: string;
  };
  failures?: QAFailure[];
  confidence?: number;
  applied?: boolean;
  restored?: boolean;
}

export interface Validation {
  status?: 'VERIFIED' | 'REJECTED';
  rootCauseAddressed?: boolean;
  minimalPatch?: boolean;
  testsPassed?: boolean;
  unrelatedChanges?: boolean;
  diagnosisPatchConsistent?: boolean;
  bugCoverageAdequate?: boolean;
  reason?: string;
}

export interface InvestigationState {
  repository_path?: string;
  bug_report?: string;
  iteration?: number;
  feedback?: string;
  repository_analysis?: RepositoryAnalysis;
  diagnosis?: Diagnosis;
  patch?: Patch;
  test_results?: TestResults;
  validation?: Validation;
  error?: string;
}

export interface RunEvent {
  timestamp: string;
  type: string;
  agent?: string;
  message: string;
  data?: any;
  error?: string;
  outcome?: string;
}

export interface InvestigationRun {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: RunStatus;
  repositoryPath: string;
  repositoryName: string;
  bugReport: string;
  currentAgent: AgentStage | null;
  iteration: number;
  completedAgents: string[];
  events: RunEvent[];
  state: InvestigationState;
  error: string | null;
  outcome: InvestigationOutcome;
}

export interface TargetRepo {
  id: string;
  name: string;
  relativePath: string;
  absolutePath: string;
  summary: string;
  sampleBug: string;
  language: string;
}

export interface SystemConfig {
  status: string;
  apiKeyConfigured: boolean;
  apiKeySource: string;
  defaultRepo: string;
  models: {
    analyst: string;
    diagnosis: string;
    fix: string;
    qa: string;
    review: string;
  };
  maxIterations: number;
  version: string;
}
