/**
 * Review & Validation Agent — Member 5 component.
 *
 * An independent final gatekeeper that validates generated code patches
 * against diagnosis, minimality, unrelated changes, and test evidence.
 */

import { getSystemPrompt, getUserPrompt } from "../prompts/reviewPrompt.js";
import { isTestPath, normalizePath } from "../tools/patchTools.js";

// Optional LangChain import for offline test compatibility
let ChatGoogleGenerativeAI;
try {
  const mod = await import("@langchain/google-genai");
  ChatGoogleGenerativeAI = mod.ChatGoogleGenerativeAI;
} catch {
  // Will be injected via options.llm in test environments
}

const LLM_MODEL = process.env.REVIEW_MODEL || process.env.FIX_MODEL || "gemini-3.8-flash";
const LLM_TEMPERATURE = 0.1;

/**
 * Perform independent review and validation of a proposed patch.
 *
 * @param {string} bugReport
 * @param {object} repositoryAnalysis
 * @param {object} diagnosis
 * @param {object} patch
 * @param {object} testResults
 * @param {object} options
 * @returns {Promise<object>} — validation result container
 */
export async function reviewPatch(
  bugReport,
  repositoryAnalysis,
  diagnosis,
  patch,
  testResults,
  options = {}
) {
  if (!diagnosis || typeof diagnosis !== "object") {
    throw new Error("diagnosis is required for review");
  }
  if (!patch || typeof patch !== "object") {
    throw new Error("patch is required for review");
  }

  // 1. Run deterministic checks first (to identify clear invalid patches like test modification or unrelated files)
  const deterministicEval = evaluateDeterministic(
    bugReport,
    repositoryAnalysis,
    diagnosis,
    patch,
    testResults
  );

  // 2. Check if live LLM evaluation is available
  const hasApiKey = Boolean(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || options.apiKey);
  if (options.llm || (ChatGoogleGenerativeAI && hasApiKey)) {
    const llm = options.llm || new ChatGoogleGenerativeAI({
      model: options.model || LLM_MODEL,
      temperature: LLM_TEMPERATURE,
    });

    const systemPrompt = getSystemPrompt();
    const userPrompt = getUserPrompt(
      bugReport,
      repositoryAnalysis,
      diagnosis,
      patch,
      testResults
    );

    const response = await llm.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    const rawContent = response?.content !== undefined ? response.content : response;
    const llmParsed = parseReviewResponse(rawContent);

    // Merge deterministic hard safety constraints (e.g. test modification or test failure overrides LLM)
    if (!deterministicEval.validation.testsPassed || deterministicEval.validation.unrelatedChanges) {
      llmParsed.validation.status = "REJECTED";
      if (!deterministicEval.validation.testsPassed) {
        llmParsed.validation.testsPassed = false;
        llmParsed.validation.reason = `REJECTED: QA tests did not pass. ${llmParsed.validation.reason || ""}`.trim();
      }
      if (deterministicEval.validation.unrelatedChanges) {
        llmParsed.validation.unrelatedChanges = true;
        llmParsed.validation.reason = `REJECTED: Unrelated or test files were modified. ${llmParsed.validation.reason || ""}`.trim();
      }
    }

    return llmParsed;
  }

  // 3. Return deterministic fallback evaluation when offline / no LLM configured
  return deterministicEval;
}

/**
 * Perform heuristic deterministic evaluation of the 5 review checks.
 */
function evaluateDeterministic(bugReport, repositoryAnalysis, diagnosis, patch, testResults) {
  const testsPassed = Boolean(
    testResults && (testResults.status === "PASS" || testResults.fullTests?.passed)
  );

  const suspectedFile = diagnosis?.suspectedFile ? normalizePath(diagnosis.suspectedFile) : "";
  const modifiedFiles = Array.isArray(patch?.modifiedFiles)
    ? patch.modifiedFiles.map(normalizePath)
    : [];

  // Check 1 — Root Cause Addressed
  // Patch must modify the suspected file or a file in repository analysis
  const modifiesSuspected = suspectedFile ? modifiedFiles.includes(suspectedFile) : modifiedFiles.length > 0;
  
  // Check if patch changes match suspected location or root cause keywords if provided
  let locationMatch = true;
  const locationOrCause = `${diagnosis?.suspectedLocation || ""} ${diagnosis?.rootCause || ""}`.trim();
  if (locationOrCause && Array.isArray(patch?.changes) && patch.changes.length > 0) {
    const loc = locationOrCause.toLowerCase();
    const changesText = patch.changes
      .map((c) => `${c.originalCode || ""} ${c.fixedCode || ""} ${c.reason || ""}`)
      .join(" ")
      .toLowerCase();

    const keywords = loc.match(/[a-z0-9_]{4,}/g) || [];
    const noise = new Set(["from", "with", "this", "that", "have", "been", "item", "items", "bug", "bugs", "issue", "issues", "error", "code", "file", "func", "function"]);
    const meaningfulKeywords = keywords.filter((kw) => !noise.has(kw));

    if (meaningfulKeywords.length > 0) {
      locationMatch = meaningfulKeywords.some((kw) => changesText.includes(kw));
    }
  }

  const rootCauseAddressed = modifiesSuspected && Array.isArray(patch?.changes) && patch.changes.length > 0 && locationMatch;

  // Check 2 — Patch Minimality
  const minimalPatch = modifiedFiles.length <= 2 && (patch?.changes ? patch.changes.length <= 5 : true);

  // Check 3 — Unrelated Changes
  // Flagged if patch modifies test files OR modifies files outside suspected file
  const modifiesTestFile = modifiedFiles.some((f) => isTestPath(f));
  const modifiesUnrelatedFile = suspectedFile ? modifiedFiles.some((f) => f !== suspectedFile) : false;
  const unrelatedChanges = modifiesTestFile || modifiesUnrelatedFile;

  // Check 4 — Test Evidence
  const bugCoverageAdequate = testsPassed;

  // Check 5 — Diagnosis / Patch Consistency
  const diagnosisPatchConsistent = modifiesSuspected && !unrelatedChanges;

  let isVerified = testsPassed && rootCauseAddressed && minimalPatch && !unrelatedChanges && diagnosisPatchConsistent;
  let reason = "";

  if (!testsPassed) {
    reason = "QA tests failed. Patch does not pass existing test suite.";
  } else if (modifiesTestFile) {
    reason = "Patch modified test files, which is forbidden.";
  } else if (modifiesUnrelatedFile) {
    reason = `Patch modified files (${modifiedFiles.join(", ")}) unrelated to the diagnosed suspected file (${suspectedFile}).`;
  } else if (!rootCauseAddressed) {
    reason = "Patch does not address the diagnosed root cause or contains no code changes.";
  } else if (!diagnosisPatchConsistent) {
    reason = "Patch is inconsistent with the diagnosis.";
  } else {
    reason = "The patch directly addresses the diagnosed root cause, modifies only relevant code, and all tests pass.";
  }

  return {
    validation: {
      status: isVerified ? "VERIFIED" : "REJECTED",
      rootCauseAddressed,
      minimalPatch,
      testsPassed,
      unrelatedChanges,
      diagnosisPatchConsistent,
      bugCoverageAdequate,
      reason,
    },
  };
}

/**
 * Parse and validate raw LLM output into standard Review response format.
 *
 * @param {any} raw
 * @returns {object} — { validation: { status, ... } }
 */
export function parseReviewResponse(raw) {
  const text = extractResponseText(raw).trim();
  if (!text) {
    throw new Error("Empty response from Review Agent LLM");
  }

  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Review Agent response was not valid JSON: ${err.message}`);
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Review Agent response must be a JSON object");
  }

  // Handle both nested { validation: { ... } } and top-level { status: ... }
  const val = parsed.validation && typeof parsed.validation === "object"
    ? parsed.validation
    : parsed;

  const rawStatus = String(val.status || "").toUpperCase();
  const status = rawStatus === "VERIFIED" ? "VERIFIED" : "REJECTED";

  return {
    validation: {
      status,
      rootCauseAddressed: Boolean(val.rootCauseAddressed),
      minimalPatch: Boolean(val.minimalPatch),
      testsPassed: Boolean(val.testsPassed),
      unrelatedChanges: Boolean(val.unrelatedChanges),
      diagnosisPatchConsistent: Boolean(val.diagnosisPatchConsistent),
      bugCoverageAdequate: Boolean(val.bugCoverageAdequate),
      reason: typeof val.reason === "string" ? val.reason : "",
    },
  };
}

/**
 * LangGraph-compatible node wrapper for Review & Validation Agent.
 *
 * Reads:
 * - state.bug_report
 * - state.repository_analysis
 * - state.diagnosis
 * - state.patch
 * - state.test_results
 *
 * Produces:
 * - { validation, feedback, error: null }
 *
 * @param {object} state
 * @returns {Promise<object>}
 */
export async function reviewAgentNode(state) {
  try {
    if (!state.diagnosis) {
      throw new Error("state.diagnosis is missing");
    }
    if (!state.patch) {
      throw new Error("state.patch is missing");
    }
    if (!state.test_results) {
      throw new Error("state.test_results is missing");
    }

    const reviewResult = await reviewPatch(
      state.bug_report,
      state.repository_analysis,
      state.diagnosis,
      state.patch,
      state.test_results
    );

    const validation = reviewResult.validation;
    const feedback = validation.status === "REJECTED" ? validation.reason : null;

    return {
      validation,
      feedback,
      error: null,
    };
  } catch (err) {
    console.error("[Review Agent] Error:", err.message);
    return {
      validation: {
        status: "REJECTED",
        rootCauseAddressed: false,
        minimalPatch: false,
        testsPassed: false,
        unrelatedChanges: false,
        diagnosisPatchConsistent: false,
        bugCoverageAdequate: false,
        reason: `Review Agent failed: ${err.message}`,
      },
      feedback: `Review failed: ${err.message}`,
      error: `Review Agent failed: ${err.message}`,
    };
  }
}

function extractResponseText(raw) {
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object") {
    if (typeof raw.text === "string") return raw.text;
    if (typeof raw.content === "string") return raw.content;
    if (Array.isArray(raw.content)) {
      return raw.content
        .map((part) => (typeof part === "string" ? part : part?.text || ""))
        .join("");
    }
  }
  return String(raw || "");
}
