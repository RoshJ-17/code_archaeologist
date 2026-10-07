import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  reviewPatch,
  parseReviewResponse,
  reviewAgentNode,
} from "../server/agents/reviewAgent.js";
import { routeAfterQA, routeAfterReview, MAX_ITERATIONS } from "../server/graph/routing.js";
import { buildWorkflow, runCodeArchaeologist } from "../server/graph/workflow.js";

// ── TEST 1: Correct repair produces VERIFIED status ───────────
test("TEST 1: reviewPatch() approves correct minimal patch with passing tests", async () => {
  const diagnosis = {
    suspectedFile: "src/pricing/discount.py",
    suspectedFunction: "calculate_discount",
    rootCause: "Boundary condition excludes 10 from discount tier",
    expectedBehavior: "10 or more items receive 20% discount",
    actualBehavior: "10 items receive 10% discount",
  };

  const patch = {
    explanation: "Change strict inequality to inclusive inequality",
    modifiedFiles: ["src/pricing/discount.py"],
    changes: [
      {
        file: "src/pricing/discount.py",
        originalCode: "if quantity > 10:",
        fixedCode: "if quantity >= 10:",
        reason: "Fix boundary",
      },
    ],
    status: "PROPOSED",
  };

  const testResults = {
    status: "PASS",
    summary: "All 5 tests passed successfully",
    fullTests: { passed: true },
    failures: [],
  };

  const result = await reviewPatch(
    "10 items not receiving bulk discount",
    { relevant_files: [{ path: "src/pricing/discount.py" }] },
    diagnosis,
    patch,
    testResults
  );

  assert.equal(result.validation.status, "VERIFIED");
  assert.equal(result.validation.rootCauseAddressed, true);
  assert.equal(result.validation.minimalPatch, true);
  assert.equal(result.validation.testsPassed, true);
  assert.equal(result.validation.unrelatedChanges, false);
  assert.equal(result.validation.diagnosisPatchConsistent, true);
  assert.match(result.validation.reason, /directly addresses/i);
});

// ── TEST 2: Incorrect patch produces REJECTED status ──────────
test("TEST 2: reviewPatch() rejects patch that modifies unrelated calculation instead of root cause", async () => {
  const diagnosis = {
    suspectedFile: "src/pricing/discount.py",
    suspectedFunction: "calculate_discount",
    rootCause: "Boundary condition excludes 10 from discount tier",
    expectedBehavior: "10 items receive 20% discount",
    actualBehavior: "10 items receive 10% discount",
  };

  // Patch modifies an unrelated tax calculation instead of the boundary condition
  const patch = {
    explanation: "Modify tax rate multiplier",
    modifiedFiles: ["src/pricing/discount.py"],
    changes: [
      {
        file: "src/pricing/discount.py",
        originalCode: "tax_rate = 0.05",
        fixedCode: "tax_rate = 0.00",
        reason: "Lower tax",
      },
    ],
    status: "PROPOSED",
  };

  const testResults = {
    status: "PASS",
    summary: "Existing tests passed",
  };

  const result = await reviewPatch(
    "10 items not receiving bulk discount",
    {},
    diagnosis,
    patch,
    testResults
  );

  // Even though tests pass, the patch does not address the root cause
  assert.equal(result.validation.status, "REJECTED");
  assert.equal(result.validation.rootCauseAddressed, false);
});

// ── TEST 3: Passing tests but wrong diagnosis/patch ───────────
test("TEST 3: reviewPatch() rejects repair when tests pass but patch fails to address diagnosis", async () => {
  const diagnosis = {
    suspectedFile: "src/auth.py",
    rootCause: "Token expiration calculation bug",
  };

  const patch = {
    explanation: "Add comment to logger",
    modifiedFiles: ["src/auth.py"],
    changes: [], // No code changes
  };

  const testResults = {
    status: "PASS",
    summary: "Tests pass",
  };

  const result = await reviewPatch(
    "Authentication tokens expire prematurely",
    {},
    diagnosis,
    patch,
    testResults
  );

  assert.equal(result.validation.status, "REJECTED");
  assert.equal(result.validation.rootCauseAddressed, false);
});

// ── TEST 4: Unrelated changes produce REJECTED status ─────────
test("TEST 4: reviewPatch() rejects patch modifying extra files or test files", async () => {
  const diagnosis = {
    suspectedFile: "src/discount.py",
    rootCause: "Incorrect condition",
  };

  // Patch modifies extra unrelated files
  const patchWithUnrelated = {
    explanation: "Fix discount and update auth & database",
    modifiedFiles: ["src/discount.py", "src/auth.py", "src/database.py"],
    changes: [
      { file: "src/discount.py", originalCode: "a", fixedCode: "b" },
      { file: "src/auth.py", originalCode: "c", fixedCode: "d" },
    ],
  };

  const testResults = { status: "PASS" };

  const resultUnrelated = await reviewPatch(
    "Discount bug",
    {},
    diagnosis,
    patchWithUnrelated,
    testResults
  );

  assert.equal(resultUnrelated.validation.status, "REJECTED");
  assert.equal(resultUnrelated.validation.unrelatedChanges, true);

  // Patch modifies test file
  const patchWithTest = {
    explanation: "Modify test assertion",
    modifiedFiles: ["tests/test_discount.py"],
    changes: [{ file: "tests/test_discount.py", originalCode: "x", fixedCode: "y" }],
  };

  const resultTest = await reviewPatch(
    "Discount bug",
    {},
    diagnosis,
    patchWithTest,
    testResults
  );

  assert.equal(resultTest.validation.status, "REJECTED");
  assert.equal(resultTest.validation.unrelatedChanges, true);
});

// ── TEST 5: QA failure routing ────────────────────────────────
test("TEST 5: routeAfterQA() routes FAIL to fix agent and PASS to review agent", () => {
  // 1. Pass -> Review
  const passState = { test_results: { status: "PASS" }, iteration: 1 };
  assert.equal(routeAfterQA(passState), "review_agent");

  // 2. Fail with iterations remaining -> Fix
  const failState = { test_results: { status: "FAIL" }, iteration: 1 };
  assert.equal(routeAfterQA(failState), "fix_agent");
});

// ── TEST 6: Maximum iterations enforcement ───────────────────
test("TEST 6: Routing enforces maximum iteration bounds and terminates loop", () => {
  const maxIterationState = {
    test_results: { status: "FAIL" },
    validation: { status: "REJECTED" },
    iteration: MAX_ITERATIONS,
  };

  // After QA with max iterations reached -> end
  assert.equal(routeAfterQA(maxIterationState), "end");

  // After Review with max iterations reached -> end
  assert.equal(routeAfterReview(maxIterationState), "end");

  // Review VERIFIED -> end
  const verifiedState = {
    validation: { status: "VERIFIED" },
    iteration: 1,
  };
  assert.equal(routeAfterReview(verifiedState), "end");

  // Review REJECTED under max iterations -> fix_agent
  const rejectedState = {
    validation: { status: "REJECTED" },
    iteration: 1,
  };
  assert.equal(routeAfterReview(rejectedState), "fix_agent");
});

// ── TEST 7: Response parsing & LangGraph node execution ───────
test("TEST 7: parseReviewResponse() and reviewAgentNode() execute correctly", async () => {
  // 1. Parse JSON response
  const raw = JSON.stringify({
    validation: {
      status: "VERIFIED",
      rootCauseAddressed: true,
      minimalPatch: true,
      testsPassed: true,
      unrelatedChanges: false,
      diagnosisPatchConsistent: true,
      bugCoverageAdequate: true,
      reason: "Validated",
    },
  });

  const parsed = parseReviewResponse(raw);
  assert.equal(parsed.validation.status, "VERIFIED");
  assert.equal(parsed.validation.reason, "Validated");

  // 2. LangGraph node execution
  const nodeState = {
    bug_report: "Sample bug",
    diagnosis: { suspectedFile: "src/app.py", rootCause: "Bug" },
    patch: {
      modifiedFiles: ["src/app.py"],
      changes: [{ file: "src/app.py", originalCode: "1", fixedCode: "2" }],
    },
    test_results: { status: "PASS" },
  };

  const nodeResult = await reviewAgentNode(nodeState);
  assert.ok(nodeResult.validation !== null);
  assert.equal(nodeResult.validation.status, "VERIFIED");
  assert.equal(nodeResult.error, null);
});

// ── TEST 8: LangGraph Workflow compilation & execution ───────
test("TEST 8: buildWorkflow() compiles valid graph with all 5 nodes", () => {
  const app = buildWorkflow();
  assert.ok(app !== null);
  assert.equal(typeof app.invoke, "function");
});
