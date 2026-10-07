/**
 * LangGraph Multi-Agent Workflow Orchestration — Member 5 component.
 *
 * Connects all 5 specialized agents into an iterative repair graph:
 *   1. Repository Analyst Agent
 *   2. Diagnosis Agent
 *   3. Fix Agent
 *   4. QA Agent
 *   5. Review & Validation Agent
 */

import { StateGraph, START, END } from "@langchain/langgraph";
import CodeArchaeologistState from "./state.js";
import { repositoryAnalystNode } from "../agents/repositoryAnalyst.js";
import { diagnosisAgentNode } from "../agents/diagnosisAgent.js";
import { fixAgentNode } from "../agents/fixAgent.js";
import { qaAgentNode } from "../agents/qaAgent.js";
import { reviewAgentNode } from "../agents/reviewAgent.js";
import { routeAfterQA, routeAfterReview } from "./routing.js";

/**
 * Node wrapper for Fix Agent that tracks repair attempt iterations.
 */
async function fixNodeWrapper(state) {
  const currentIteration = (typeof state?.iteration === "number" ? state.iteration : 0) + 1;
  console.log(`\n[Workflow] --- FIX AGENT ITERATION ${currentIteration} ---`);
  
  const update = await fixAgentNode(state);
  return {
    ...update,
    iteration: currentIteration,
  };
}

/**
 * Build and compile the complete Code Archaeologist multi-agent graph.
 *
 * @returns {object} — compiled LangGraph executable graph
 */
export function buildWorkflow() {
  const workflow = new StateGraph(CodeArchaeologistState)
    .addNode("repository_analyst", repositoryAnalystNode)
    .addNode("diagnosis_agent", diagnosisAgentNode)
    .addNode("fix_agent", fixNodeWrapper)
    .addNode("qa_agent", qaAgentNode)
    .addNode("review_agent", reviewAgentNode)

    // Sequential initial flow
    .addEdge(START, "repository_analyst")
    .addEdge("repository_analyst", "diagnosis_agent")
    .addEdge("diagnosis_agent", "fix_agent")
    .addEdge("fix_agent", "qa_agent")

    // Conditional routing after QA execution
    .addConditionalEdges("qa_agent", routeAfterQA, {
      review_agent: "review_agent",
      fix_agent: "fix_agent",
      end: END,
    })

    // Conditional routing after Review Agent validation
    .addConditionalEdges("review_agent", routeAfterReview, {
      end: END,
      fix_agent: "fix_agent",
    });

  return workflow.compile();
}

/**
 * Convenience entry point to run the multi-agent workflow on a repository and bug report.
 *
 * @param {string} repositoryPath
 * @param {string} bugReport
 * @param {object} initialInputs
 * @returns {Promise<object>} — final state output
 */
export async function runCodeArchaeologist(repositoryPath, bugReport, initialInputs = {}) {
  const app = buildWorkflow();

  const initialState = {
    repository_path: repositoryPath,
    bug_report: bugReport,
    iteration: 0,
    ...initialInputs,
  };

  console.log("=================================================");
  console.log("STARTING CODE ARCHAEOLOGIST MULTI-AGENT SYSTEM");
  console.log(`Target Repo: ${repositoryPath}`);
  console.log(`Bug Report: ${bugReport}`);
  console.log("=================================================\n");

  const result = await app.invoke(initialState);
  return result;
}

import path from "node:path";

export const graph = buildWorkflow();

// ── CLI entry point ─────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const repoIdx = args.indexOf("--repo");
  const bugIdx = args.indexOf("--bug");

  const repoPath = repoIdx !== -1 ? args[repoIdx + 1] : "test-repositories/discount-bug";
  const bugReport = bugIdx !== -1 ? args[bugIdx + 1] : "Customers purchasing exactly 10 items are not receiving the bulk discount.";

  const absoluteRepoPath = path.resolve(process.cwd(), repoPath);
  const result = await runCodeArchaeologist(absoluteRepoPath, bugReport);

  console.log("\n=================================================");
  console.log("FINAL MULTI-AGENT EXECUTION SUMMARY");
  console.log("=================================================");
  console.log(`Repository Analysis: ${result.repository_analysis ? "Completed" : "Failed"}`);
  console.log(`Diagnosis: ${result.diagnosis?.suspectedFile || "N/A"} - ${result.diagnosis?.rootCause || "N/A"}`);
  console.log(`Patch Status: ${result.patch?.status || "N/A"}`);
  console.log(`QA Status: ${result.test_results?.status || "N/A"}`);
  console.log(`Validation Status: ${result.validation?.status || "N/A"}`);
  console.log(`Reason: ${result.validation?.reason || "N/A"}`);
  console.log(`Total Iterations: ${result.iteration}`);
  console.log("=================================================\n");
}

const isDirectRun =
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));

if (isDirectRun) {
  main().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
}
