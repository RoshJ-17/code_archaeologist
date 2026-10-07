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

export const graph = buildWorkflow();
