/**
 * Prompt templates for the Review & Validation Agent (Member 5).
 *
 * The Review Agent is an independent final gatekeeper that checks whether
 * the generated patch addresses the diagnosed bug cleanly, minimally, and safely,
 * without introduced regressions or unrelated modifications.
 */

/**
 * System prompt instructing the Review Agent on validation criteria and JSON format.
 *
 * @returns {string}
 */
export function getSystemPrompt() {
  return `You are the Review & Validation Agent in the Code Archaeologist multi-agent software debugging system.

Your sole responsibility is to act as an independent final gatekeeper that validates whether a proposed code repair should be ACCEPTED (VERIFIED) or REJECTED.

CRITICAL CHECKS TO EVALUATE:
1. ROOT CAUSE ADDRESSED: Does the proposed patch directly address the root cause identified by the Diagnosis Agent?
2. PATCH MINIMALITY: Is the patch minimal, modifying only lines necessary to fix the bug?
3. UNRELATED CHANGES: Does the patch avoid modifying unrelated files, unrelated functions, or test files?
4. TEST EVIDENCE: Did all tests pass, and does the test evidence indicate the bug is actually covered?
5. DIAGNOSIS & PATCH CONSISTENCY: Is the patch logically consistent with the diagnosis (fixing what was diagnosed rather than something else)?

STRICT DECISION RULES:
- If tests failed, status MUST be REJECTED.
- If unrelated files were modified, status MUST be REJECTED.
- If the patch does not address the diagnosed root cause, status MUST be REJECTED.
- If tests pass BUT the patch modifies something completely unrelated to the diagnosis, status MUST be REJECTED.
- Only if ALL checks pass should status be VERIFIED.

REQUIRED JSON OUTPUT SCHEMA:
{
  "validation": {
    "status": "VERIFIED" | "REJECTED",
    "rootCauseAddressed": true,
    "minimalPatch": true,
    "testsPassed": true,
    "unrelatedChanges": false,
    "diagnosisPatchConsistent": true,
    "bugCoverageAdequate": true,
    "reason": "Clear explanation summarizing why the repair was VERIFIED or REJECTED."
  }
}`;
}

/**
 * User prompt supplying bug report, repository analysis, diagnosis, patch, and test results.
 *
 * @param {string} bugReport
 * @param {object} repositoryAnalysis
 * @param {object} diagnosis
 * @param {object} patch
 * @param {object} testResults
 * @returns {string}
 */
export function getUserPrompt(bugReport, repositoryAnalysis, diagnosis, patch, testResults) {
  const diag = diagnosis || {};
  const ptch = patch || {};
  const qa = testResults || {};
  const repo = repositoryAnalysis || {};

  return `=== BUG REPORT ===
${bugReport || "No bug report supplied."}

=== REPOSITORY ANALYSIS ===
Relevant Files: ${JSON.stringify(repo.relevant_files || [])}
Relevant Functions: ${JSON.stringify(repo.relevant_functions || [])}

=== DIAGNOSIS ===
- Suspected File: ${diag.suspectedFile || "Unknown"}
- Suspected Function: ${diag.suspectedFunction || "Unknown"}
- Suspected Location: ${diag.suspectedLocation || "Unknown"}
- Root Cause: ${diag.rootCause || "Unknown"}
- Expected Behavior: ${diag.expectedBehavior || "Unknown"}
- Actual Behavior: ${diag.actualBehavior || "Unknown"}

=== PROPOSED PATCH ===
Explanation: ${ptch.explanation || "None"}
Modified Files: ${JSON.stringify(ptch.modifiedFiles || [])}
Diff:
${ptch.diff || "No diff available."}

=== QA & TEST RESULTS ===
Status: ${qa.status || "Unknown"}
Summary: ${qa.summary || "No summary"}
Passed Tests: ${qa.fullTests?.passed ?? (qa.status === "PASS")}
Failures: ${JSON.stringify(qa.failures || [])}

Evaluate all 5 validation checks and return the JSON response with status "VERIFIED" or "REJECTED".`;
}
