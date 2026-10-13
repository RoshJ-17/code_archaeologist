/**
 * Prompt templates for the Fix Agent (Member 3).
 *
 * The Fix Agent creates the smallest possible safe code repair
 * based on the bug report, diagnosis, and relevant source code.
 */

/**
 * System prompt strictly constraining the Fix Agent to minimal,
 * safe, and non-destructive repairs.
 *
 * @returns {string}
 */
export function getSystemPrompt() {
  return `You are the Fix Agent in the Code Archaeologist multi-agent system.

Your sole responsibility is to convert a bug diagnosis into a minimal, safe, and precise code repair.

STRICT RULES:
1. Act as a software repair agent. Fix ONLY the diagnosed problem.
2. Make the smallest possible change. Prefer single-line edits or minimal replacements.
3. Modify only the relevant source file(s) identified in the diagnosis.
4. Do NOT modify tests or test files under any circumstances.
5. Do NOT rewrite unrelated code or make stylistic/formatting adjustments.
6. Preserve existing function signatures, return types, and class interfaces.
7. Preserve existing behavior outside the bug.
8. Do NOT introduce new external dependencies or libraries.
9. Do NOT make speculative improvements, refactorings, or fix unrelated bugs.
10. Return VALID JSON ONLY. Do NOT wrap the JSON in markdown code fences (\`\`\`json). Do NOT include commentary outside the JSON.

REQUIRED JSON OUTPUT SCHEMA:
{
  "explanation": "string explaining why this fix resolves the issue",
  "modifiedFiles": ["relative/path/to/file"],
  "changes": [
    {
      "file": "relative/path/to/file",
      "originalCode": "exact snippet of existing code to replace",
      "fixedCode": "exact replacement code snippet",
      "reason": "why this exact change fixes the diagnosed issue"
    }
  ]
}`;
}

/**
 * User prompt supplying the bug report, diagnosis details, and current source code.
 *
 * @param {string} bugReport
 * @param {object} diagnosis
 * @param {string|Record<string, string>} sourceCode
 * @returns {string}
 */

export function getUserPrompt(bugReport, diagnosis, sourceCode, context = {}) {
  const diag = diagnosis || {};

  let formattedSource = "";

  if (typeof sourceCode === "string") {
    const file = diag.suspectedFile || "target_file";
    formattedSource = `=== SOURCE FILE: ${file} ===\n${sourceCode}\n=== END SOURCE FILE ===`;
  } else if (sourceCode && typeof sourceCode === "object") {
    formattedSource = Object.entries(sourceCode)
      .map(
        ([file, content]) =>
          `=== SOURCE FILE: ${file} ===\n${content}\n=== END SOURCE FILE ===`
      )
      .join("\n\n");
  } else {
    formattedSource = "No source code provided.";
  }

  const evidenceList = Array.isArray(diag.evidence)
    ? diag.evidence.map((e) => `- ${e}`).join("\n")
    : "None provided";

  const iteration = context.iteration ?? 1;

  const previousQA = context.previousQA
    ? JSON.stringify(context.previousQA, null, 2)
    : "No previous QA results available. This is the initial repair attempt.";

  const previousFeedback = context.previousFeedback
    ? JSON.stringify(context.previousFeedback, null, 2)
    : "No previous review feedback available.";

  return `=== BUG REPORT ===
${bugReport || "No bug report supplied."}

=== REPAIR ATTEMPT ===
Current attempt: ${iteration}
Maximum attempts: 3

=== DIAGNOSIS ===
- Suspected File: ${diag.suspectedFile || "Unknown"}
- Suspected Function: ${diag.suspectedFunction || "Unknown"}
- Suspected Location: ${diag.suspectedLocation || "Unknown"}
- Root Cause: ${diag.rootCause || "Unknown"}
- Expected Behavior: ${diag.expectedBehavior || "Unknown"}
- Actual Behavior: ${diag.actualBehavior || "Unknown"}
- Confidence: ${diag.confidence !== undefined ? diag.confidence : "Unknown"}

Evidence:
${evidenceList}

=== PREVIOUS QA RESULTS ===
${previousQA}

=== PREVIOUS REVIEW FEEDBACK ===
${previousFeedback}

=== RELEVANT SOURCE CODE ===
${formattedSource}

REPAIR INSTRUCTIONS:
1. On the first attempt, address the diagnosed root cause with a minimal patch.
2. On later attempts, carefully examine previous QA failures and review feedback.
3. Use failure messages to identify what remains incorrect.
4. Do not repeat a previous patch unchanged if the QA evidence shows it failed.
5. Modify only the diagnosed source file. Never modify tests.
6. Preserve unrelated behavior and existing interfaces.
7. Return the required JSON structure only.`;
}

