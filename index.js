/**
 * Code Archaeologist — Multi-Agent Application Entry Point
 *
 * Runs the 5-agent LangGraph workflow on a target repository and bug report.
 *
 * Usage:
 *   node index.js [--repo <path>] [--bug <description>]
 */

import path from "node:path";
import { runCodeArchaeologist } from "./server/graph/workflow.js";

async function main() {
  const args = process.argv.slice(2);
  const repoIdx = args.indexOf("--repo");
  const bugIdx = args.indexOf("--bug");

  const repoPath = repoIdx !== -1 ? args[repoIdx + 1] : "test-repositories/discount-bug";
  const bugReport =
    bugIdx !== -1
      ? args[bugIdx + 1]
      : "Customers purchasing exactly 10 items are not receiving the bulk discount.";

  const absoluteRepoPath = path.resolve(process.cwd(), repoPath);
  const result = await runCodeArchaeologist(absoluteRepoPath, bugReport);

  console.log("\n=================================================");
  console.log("FINAL MULTI-AGENT EXECUTION SUMMARY");
  console.log("=================================================");
  console.log(`Repository Analysis: ${result.repository_analysis ? "Completed" : "Failed"}`);
  console.log(`Diagnosis: ${result.diagnosis?.suspectedFile || "N/A"} (${result.diagnosis?.rootCause || "N/A"})`);
  console.log(`Patch Status: ${result.patch?.status || "N/A"}`);
  console.log(`QA Status: ${result.test_results?.status || "N/A"}`);
  console.log(`Validation Status: ${result.validation?.status || "N/A"}`);
  console.log(`Reason: ${result.validation?.reason || "N/A"}`);
  console.log(`Total Iterations: ${result.iteration}`);
  console.log("=================================================\n");
}

main().catch((err) => {
  console.error("Execution error:", err);
  process.exit(1);
});
