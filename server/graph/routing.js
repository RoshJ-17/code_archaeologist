/**
 * Conditional routing logic for the Code Archaeologist LangGraph workflow.
 *
 * Defines state transition functions that determine next node targets based on
 * QA test results, Review Agent validation, and maximum iteration bounds.
 */

export const MAX_ITERATIONS = 3;

/**
 * Route after QA Agent execution.
 *
 * If tests pass -> route to Review Agent.
 * If tests fail AND iteration < MAX_ITERATIONS -> route back to Fix Agent.
 * If tests fail AND iteration >= MAX_ITERATIONS -> terminate workflow (end).
 *
 * @param {object} state — current CodeArchaeologistState
 * @returns {string} — destination node key ("review" | "fix" | "end")
 */
export function routeAfterQA(state) {
  const iteration = typeof state?.iteration === "number" ? state.iteration : 0;
  const status = state?.test_results?.status;

  if (status === "PASS") {
    console.log("[Routing] QA PASSED -> Routing to Review Agent");
    return "review_agent";
  }

  if (iteration >= MAX_ITERATIONS) {
    console.log(`[Routing] QA FAILED and MAX_ITERATIONS (${MAX_ITERATIONS}) reached -> Terminating workflow`);
    return "end";
  }

  console.log(`[Routing] QA FAILED (Iteration ${iteration}/${MAX_ITERATIONS}) -> Routing back to Fix Agent`);
  return "fix_agent";
}

/**
 * Route after Review Agent execution.
 *
 * If validation status is VERIFIED -> terminate workflow with success (end).
 * If validation status is REJECTED AND iteration < MAX_ITERATIONS -> route back to Fix Agent.
 * If validation status is REJECTED AND iteration >= MAX_ITERATIONS -> terminate workflow (end).
 *
 * @param {object} state — current CodeArchaeologistState
 * @returns {string} — destination node key ("end" | "fix_agent")
 */
export function routeAfterReview(state) {
  const iteration = typeof state?.iteration === "number" ? state.iteration : 0;
  const status = state?.validation?.status;

  if (status === "VERIFIED") {
    console.log("[Routing] Review VERIFIED -> Workflow complete");
    return "end";
  }

  if (iteration >= MAX_ITERATIONS) {
    console.log(`[Routing] Review REJECTED and MAX_ITERATIONS (${MAX_ITERATIONS}) reached -> Terminating workflow`);
    return "end";
  }

  console.log(`[Routing] Review REJECTED (Iteration ${iteration}/${MAX_ITERATIONS}) -> Routing back to Fix Agent`);
  return "fix_agent";
}
