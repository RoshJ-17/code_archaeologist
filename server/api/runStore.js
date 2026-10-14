/**
 * Code Archaeologist — In-Memory Run Store & Event Bus
 * 
 * Manages active and historical investigation runs, handles Server-Sent Events subscriptions,
 * and sanitizes state updates (e.g. stripping multi-megabyte raw file contents while preserving
 * structured forensic metadata).
 */

import crypto from "node:crypto";

class RunStore {
  constructor() {
    /** @type {Map<string, object>} */
    this.runs = new Map();
    /** @type {Map<string, Set<Function>>} */
    this.listeners = new Map();
    
    // Seed initial demo/historical cases so Case History has rich data immediately
    this._seedHistoricalCases();
  }

  /**
   * Create a new investigation run record.
   */
  createRun({ repositoryPath, repositoryName, bugReport }) {
    const id = `excavation_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    const run = {
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "QUEUED", // QUEUED | RUNNING | COMPLETED | FAILED | TERMINATED
      repositoryPath,
      repositoryName: repositoryName || repositoryPath.split(/[/\\]/).pop(),
      bugReport,
      currentAgent: null,
      iteration: 0,
      completedAgents: [],
      events: [
        {
          timestamp: new Date().toISOString(),
          type: "INITIALIZED",
          message: `Excavation dossier created for ${repositoryName || repositoryPath}`,
        },
      ],
      state: {
        repository_path: repositoryPath,
        bug_report: bugReport,
        iteration: 0,
      },
      error: null,
      outcome: null, // VERIFIED | REJECTED | QA_FAILED | INCONCLUSIVE | ERROR
    };

    this.runs.set(id, run);
    this.listeners.set(id, new Set());
    return run;
  }

  /**
   * Get a run by ID.
   */
  getRun(id) {
    return this.runs.get(id) || null;
  }

  /**
   * Get all runs, newest first.
   */
  getAllRuns() {
    return Array.from(this.runs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Append an event to a run and broadcast to subscribers.
   */
  addEvent(runId, event) {
    const run = this.runs.get(runId);
    if (!run) return;

    const fullEvent = {
      timestamp: new Date().toISOString(),
      ...event,
    };
    run.events.push(fullEvent);
    run.updatedAt = fullEvent.timestamp;

    const subs = this.listeners.get(runId);
    if (subs) {
      for (const cb of subs) {
        try {
          cb(fullEvent);
        } catch (e) {
          console.error(`Error notifying listener on run ${runId}:`, e);
        }
      }
    }
  }

  /**
   * Update run state and sanitize large payload items.
   */
  updateRunState(runId, partialState) {
    const run = this.runs.get(runId);
    if (!run) return;

    const sanitizedUpdate = { ...partialState };

    // Strip excessive file contents to prevent network bloat
    if (sanitizedUpdate.repository_analysis?.file_contents) {
      const { file_contents, ...restAnalysis } = sanitizedUpdate.repository_analysis;
      sanitizedUpdate.repository_analysis = {
        ...restAnalysis,
        fileCount: Object.keys(file_contents || {}).length,
      };
    }

    if (sanitizedUpdate.patch?.originalFileContents) {
      delete sanitizedUpdate.patch.originalFileContents;
    }

    run.state = {
      ...run.state,
      ...sanitizedUpdate,
    };

    if (typeof partialState.iteration === "number") {
      run.iteration = partialState.iteration;
    }

    run.updatedAt = new Date().toISOString();
  }

  /**
   * Update high-level run status and outcome.
   */
  updateRunStatus(runId, status, { error = null, outcome = null, currentAgent = null } = {}) {
    const run = this.runs.get(runId);
    if (!run) return;

    run.status = status;
    run.updatedAt = new Date().toISOString();
    if (error !== undefined) run.error = error;
    if (outcome !== undefined) run.outcome = outcome;
    if (currentAgent !== undefined) run.currentAgent = currentAgent;
  }

  /**
   * Mark an agent as completed.
   */
  markAgentCompleted(runId, agentName) {
    const run = this.runs.get(runId);
    if (!run) return;
    if (!run.completedAgents.includes(agentName)) {
      run.completedAgents.push(agentName);
    }
  }

  /**
   * Subscribe to SSE events for a specific run.
   */
  subscribe(runId, callback) {
    let subs = this.listeners.get(runId);
    if (!subs) {
      subs = new Set();
      this.listeners.set(runId, subs);
    }
    subs.add(callback);
    return () => {
      subs.delete(callback);
    };
  }

  /**
   * Seed realistic historical cases based on real repository bugs in test-repositories.
   */
  _seedHistoricalCases() {
    const case1 = {
      id: "case_hist_discount_01",
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 4 + 45000).toISOString(),
      status: "COMPLETED",
      repositoryPath: "test-repositories/discount-bug",
      repositoryName: "discount-bug",
      bugReport: "Customers purchasing exactly 10 items are not receiving the bulk discount of 20%.",
      currentAgent: null,
      iteration: 1,
      completedAgents: [
        "repository_analyst",
        "diagnosis_agent",
        "fix_agent",
        "qa_agent",
        "review_agent",
      ],
      outcome: "VERIFIED",
      events: [
        {
          timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
          type: "INITIALIZED",
          message: "Excavation dossier created for discount-bug",
        },
        {
          timestamp: new Date(Date.now() - 3600000 * 4 + 3000).toISOString(),
          type: "AGENT_START",
          agent: "repository_analyst",
          message: "Repository Analyst initiated source stratigraphy sweep",
        },
        {
          timestamp: new Date(Date.now() - 3600000 * 4 + 8000).toISOString(),
          type: "AGENT_COMPLETE",
          agent: "repository_analyst",
          message: "Repository Analyst identified 3 source files and 2 test suites",
        },
        {
          timestamp: new Date(Date.now() - 3600000 * 4 + 9000).toISOString(),
          type: "AGENT_START",
          agent: "diagnosis_agent",
          message: "Diagnosis Agent inspecting pricing and cart boundary conditions",
        },
        {
          timestamp: new Date(Date.now() - 3600000 * 4 + 17000).toISOString(),
          type: "AGENT_COMPLETE",
          agent: "diagnosis_agent",
          message: "Root cause localized to src/pricing/discount.py:calculate_discount (confidence 0.95)",
        },
        {
          timestamp: new Date(Date.now() - 3600000 * 4 + 18000).toISOString(),
          type: "AGENT_START",
          agent: "fix_agent",
          message: "Fix Agent synthesizing minimal repair patch (Iteration 1)",
        },
        {
          timestamp: new Date(Date.now() - 3600000 * 4 + 27000).toISOString(),
          type: "AGENT_COMPLETE",
          agent: "fix_agent",
          message: "Single-line boundary patch generated for src/pricing/discount.py",
        },
        {
          timestamp: new Date(Date.now() - 3600000 * 4 + 28000).toISOString(),
          type: "AGENT_START",
          agent: "qa_agent",
          message: "QA Agent applying patch to sandbox & executing test matrix",
        },
        {
          timestamp: new Date(Date.now() - 3600000 * 4 + 37000).toISOString(),
          type: "AGENT_COMPLETE",
          agent: "qa_agent",
          message: "QA Passed: targeted tests verified, 0 regressions detected, clean file restore",
        },
        {
          timestamp: new Date(Date.now() - 3600000 * 4 + 38000).toISOString(),
          type: "AGENT_START",
          agent: "review_agent",
          message: "Review Agent performing independent blast-radius and validation audit",
        },
        {
          timestamp: new Date(Date.now() - 3600000 * 4 + 45000).toISOString(),
          type: "AGENT_COMPLETE",
          agent: "review_agent",
          message: "Audit VERIFIED: repair addresses root cause with minimal blast radius",
        },
      ],
      state: {
        repository_path: "test-repositories/discount-bug",
        bug_report: "Customers purchasing exactly 10 items are not receiving the bulk discount of 20%.",
        iteration: 1,
        repository_analysis: {
          relevant_files: [
            "src/pricing/discount.py",
            "src/pricing/cart.py",
            "src/orders/order.py",
          ],
          relevant_functions: ["calculate_discount", "get_discount_rate", "calculate_cart_total"],
          relevant_classes: ["Cart", "Order"],
          relevant_tests: ["tests/test_discount.py", "tests/test_order.py"],
          dependencies: ["pytest"],
          repository_summary: "E-commerce pricing engine with tiered quantity discount rules.",
          fileCount: 4,
        },
        diagnosis: {
          suspectedFile: "src/pricing/discount.py",
          suspectedFunction: "calculate_discount",
          suspectedLocation: "line 16",
          rootCause: "Strict inequality '>' used instead of inclusive '>=' for the 10-item bulk discount tier threshold.",
          evidence: [
            "src/pricing/discount.py line 16 has `if quantity > 10:`",
            "Docstring specifies: 'Rules: 10 or more items: 20% discount'",
            "When quantity is 10, logic falls through to `elif quantity >= 5:` resulting in only 10% discount.",
          ],
          expectedBehavior: "Purchasing 10 items should trigger the 20% discount tier.",
          actualBehavior: "Purchasing 10 items triggers the 10% tier because quantity 10 does not satisfy `quantity > 10`.",
          confidence: 0.95,
        },
        patch: {
          explanation: "Adjusted quantity threshold check from strict inequality to inclusive inequality (quantity >= 10).",
          modifiedFiles: ["src/pricing/discount.py"],
          diff: `--- src/pricing/discount.py
+++ src/pricing/discount.py
@@ -15,3 +15,3 @@
-    if quantity > 10:
+    if quantity >= 10:
         discount = 0.20`,
          changes: [
            {
              file: "src/pricing/discount.py",
              originalCode: "    if quantity > 10:\n        discount = 0.20",
              fixedCode: "    if quantity >= 10:\n        discount = 0.20",
              reason: "Ensure bulk discount tier activates for purchases of exactly 10 items.",
            },
          ],
          status: "PROPOSED",
        },
        test_results: {
          status: "PASS",
          summary: "Targeted pytest suite passed with zero regressions. Boundary condition validated.",
          originalBugVerified: true,
          regressionsDetected: false,
          targetedTests: {
            passed: true,
            details: "tests/test_discount.py::test_ten_items_boundary PASSED",
          },
          fullTests: {
            passed: true,
            details: "4 passed in 0.12s",
          },
          failures: [],
          confidence: 0.95,
          applied: true,
          restored: true,
        },
        validation: {
          status: "VERIFIED",
          rootCauseAddressed: true,
          minimalPatch: true,
          testsPassed: true,
          unrelatedChanges: false,
          diagnosisPatchConsistent: true,
          bugCoverageAdequate: true,
          reason: "Patch precisely corrects the off-by-one threshold condition in calculate_discount without collateral side-effects.",
        },
      },
      error: null,
    };

    const case2 = {
      id: "case_hist_tax_02",
      createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 18 + 52000).toISOString(),
      status: "COMPLETED",
      repositoryPath: "test-repositories/tax-bug",
      repositoryName: "tax-bug",
      bugReport: "Tax calculation fails on zero-rate exempt items due to division by zero in surcharge ratio.",
      currentAgent: null,
      iteration: 2,
      completedAgents: [
        "repository_analyst",
        "diagnosis_agent",
        "fix_agent",
        "qa_agent",
        "review_agent",
      ],
      outcome: "VERIFIED",
      events: [
        {
          timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
          type: "INITIALIZED",
          message: "Excavation dossier created for tax-bug",
        },
        {
          timestamp: new Date(Date.now() - 3600000 * 18 + 52000).toISOString(),
          type: "AGENT_COMPLETE",
          agent: "review_agent",
          message: "Audit VERIFIED on iteration 2 after first attempt modified test suite",
        },
      ],
      state: {
        repository_path: "test-repositories/tax-bug",
        bug_report: "Tax calculation fails on zero-rate exempt items due to division by zero in surcharge ratio.",
        iteration: 2,
        feedback: "Iteration 1 rejected: Patch attempted to alter tests/test_tax.py instead of src/tax.py.",
        repository_analysis: {
          relevant_files: ["src/tax.py"],
          relevant_functions: ["compute_effective_tax"],
          relevant_classes: [],
          relevant_tests: ["tests/test_tax.py"],
          dependencies: ["pytest"],
          repository_summary: "Tax assessment calculation module for multi-jurisdiction rate schedules.",
          fileCount: 2,
        },
        diagnosis: {
          suspectedFile: "src/tax.py",
          suspectedFunction: "compute_effective_tax",
          suspectedLocation: "line 8",
          rootCause: "Unchecked division when tax_rate evaluates to 0.0 for exempt merchandise.",
          evidence: [
            "Zero tax items produce ZeroDivisionError in surcharge ratio calculation",
            "Guard condition for `if tax_rate == 0:` missing prior to ratio computation",
          ],
          expectedBehavior: "Exempt goods with 0% tax rate should incur 0 surcharge and total 0 tax.",
          actualBehavior: "ZeroDivisionError thrown, halting checkout pipeline.",
          confidence: 0.92,
        },
        patch: {
          explanation: "Added zero-rate guard returning 0.0 immediately before surcharge division.",
          modifiedFiles: ["src/tax.py"],
          diff: `--- src/tax.py
+++ src/tax.py
@@ -6,2 +6,4 @@
+    if tax_rate <= 0:
+        return 0.0
     surcharge = (base_amount / tax_rate) * 0.01`,
          changes: [
            {
              file: "src/tax.py",
              originalCode: "    surcharge = (base_amount / tax_rate) * 0.01",
              fixedCode: "    if tax_rate <= 0:\n        return 0.0\n    surcharge = (base_amount / tax_rate) * 0.01",
              reason: "Prevent division by zero for zero-rate items.",
            },
          ],
          status: "PROPOSED",
        },
        test_results: {
          status: "PASS",
          summary: "Pytest passed: zero-rate items return 0.0 tax without exception.",
          originalBugVerified: true,
          regressionsDetected: false,
          targetedTests: { passed: true, details: "tests/test_tax.py PASSED" },
          fullTests: { passed: true, details: "2 passed in 0.08s" },
          failures: [],
          confidence: 0.94,
          applied: true,
          restored: true,
        },
        validation: {
          status: "VERIFIED",
          rootCauseAddressed: true,
          minimalPatch: true,
          testsPassed: true,
          unrelatedChanges: false,
          diagnosisPatchConsistent: true,
          bugCoverageAdequate: true,
          reason: "Safe guard check properly prevents zero division without altering standard rate logic.",
        },
      },
      error: null,
    };

    this.runs.set(case1.id, case1);
    this.runs.set(case2.id, case2);
  }
}

export const runStore = new RunStore();
