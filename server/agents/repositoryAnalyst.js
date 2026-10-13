
/**
 * Repository Analyst Agent — Member 1's component.
 * Scans a repository and uses Gemini to identify code relevant to a bug.
 */

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  buildRepositorySummary,
  readFiles,
} from "../tools/repositoryTools.js";
import {
  getSystemPrompt,
  getUserPrompt,
} from "../prompts/repositoryPrompt.js";

// Configuration
const LLM_MODEL = process.env.ANALYST_MODEL || "gemini-3.8-flash";
const LLM_TEMPERATURE = 0.2;

const MAX_ATTEMPTS = 4;
const INITIAL_RETRY_DELAY_MS = 1000;

// Retry temporary API errors, but do not retry permanent failures.
function isRetryableError(error) {
  const message = String(error?.message || error);
  const status = error?.status ?? error?.statusCode;

  return (
    [408, 429, 500, 502, 503, 504].includes(Number(status)) ||
    /\b(408|429|500|502|503|504)\b/.test(message) ||
    /high demand|temporarily unavailable|overloaded|fetch failed|ECONNRESET|ETIMEDOUT/i.test(
      message
    )
  );
}

async function invokeWithRetry(llm, messages) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await llm.invoke(messages);
    } catch (error) {
      if (!isRetryableError(error) || attempt === MAX_ATTEMPTS) {
        throw error;
      }

      const delay =
        INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);

      console.warn(
        `[Repository Analyst] Gemini request failed ` +
          `(attempt ${attempt}/${MAX_ATTEMPTS}): ${error.message}`
      );

      console.log(
        `[Repository Analyst] Retrying in ${delay / 1000} seconds...`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("Gemini request failed after all retry attempts.");
}

/**
 * Analyze the repository and bug report.
 */
export async function analyzeRepository(repositoryPath, bugReport) {
  console.log("[Repository Analyst] Scanning repository...");

  const repoSummary = await buildRepositorySummary(repositoryPath);

  console.log(
    `[Repository Analyst] Found ${repoSummary.length} source files.`
  );

  if (repoSummary.length === 0) {
    return {
      relevant_files: [],
      relevant_functions: [],
      relevant_classes: [],
      relevant_tests: [],
      dependencies: [],
      repository_summary: "No source files found in the repository.",
      file_contents: {},
    };
  }

  console.log("[Repository Analyst] Analyzing with LLM...");
  console.log(`[Repository Analyst] Model: ${LLM_MODEL}`);

  const llm = new ChatGoogleGenerativeAI({
    model: LLM_MODEL,
    temperature: LLM_TEMPERATURE,
  });

  const messages = [
    { role: "system", content: getSystemPrompt() },
    {
      role: "user",
      content: getUserPrompt(repoSummary, bugReport),
    },
  ];

  const response = await invokeWithRetry(llm, messages);

  const analysis = parseAnalysisResponse(response.content);

  const relevantPaths = [
    ...analysis.relevant_files.map((file) => file.path),
    ...analysis.relevant_tests.map((file) => file.path),
  ].filter((filePath) => typeof filePath === "string");

  const uniquePaths = [...new Set(relevantPaths)];

  const fileContents = await readFiles(repositoryPath, uniquePaths);
  analysis.file_contents = fileContents;

  console.log("[Repository Analyst] Analysis complete.");

  return analysis;
}

/**
 * LangGraph node wrapper.
 */
export async function repositoryAnalystNode(state) {
  try {
    const analysis = await analyzeRepository(
      state.repository_path,
      state.bug_report
    );

    return {
      repository_analysis: analysis,
      error: null,
    };
  } catch (err) {
    console.error(
      "[Repository Analyst] Error:",
      err.message
    );

    return {
      repository_analysis: null,
      error: `Repository Analyst failed: ${err.message}`,
    };
  }
}

/**
 * Parse the LLM's JSON response.
 */
function parseAnalysisResponse(raw) {
  const cleaned = String(raw ?? "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");

  const defaultResult = {
    relevant_files: [],
    relevant_functions: [],
    relevant_classes: [],
    relevant_tests: [],
    dependencies: [],
    repository_summary: "",
  };

  try {
    const parsed = JSON.parse(cleaned);

    return {
      relevant_files: Array.isArray(parsed.relevant_files)
        ? parsed.relevant_files
        : [],
      relevant_functions: Array.isArray(parsed.relevant_functions)
        ? parsed.relevant_functions
        : [],
      relevant_classes: Array.isArray(parsed.relevant_classes)
        ? parsed.relevant_classes
        : [],
      relevant_tests: Array.isArray(parsed.relevant_tests)
        ? parsed.relevant_tests
        : [],
      dependencies: Array.isArray(parsed.dependencies)
        ? parsed.dependencies
        : [],
      repository_summary:
        typeof parsed.repository_summary === "string"
          ? parsed.repository_summary
          : "",
    };
  } catch (error) {
    console.error(
      "[Repository Analyst] Failed to parse LLM response as JSON:",
      error.message
    );

    console.error("[Repository Analyst] Raw response:", raw);

    return defaultResult;
  }
}

/**
 * CLI entry point.
 */
async function main() {
  const args = process.argv.slice(2);
  const repoIdx = args.indexOf("--repo");
  const bugIdx = args.indexOf("--bug");

  if (repoIdx === -1 || bugIdx === -1) {
    console.error(
      "Usage: node server/agents/repositoryAnalyst.js " +
        '--repo "<path>" --bug "<description>"'
    );
    process.exitCode = 1;
    return;
  }

  const repoPath = args[repoIdx + 1];
  const bugReport = args[bugIdx + 1];

  if (!repoPath || !bugReport) {
    console.error("Both --repo and --bug must have values.");
    process.exitCode = 1;
    return;
  }

  const analysis = await analyzeRepository(repoPath, bugReport);

  const { file_contents, ...printable } = analysis;

  console.log("\n=== REPOSITORY ANALYSIS ===");
  console.log(JSON.stringify(printable, null, 2));

  console.log(
    `\n[Attached ${Object.keys(file_contents || {}).length} ` +
      "file(s) content for Diagnosis Agent]"
  );
}

const isDirectRun =
  process.argv[1] &&
  import.meta.url.endsWith(
    process.argv[1].replace(/\\/g, "/")
  );

if (isDirectRun) {
  main().catch((error) => {
    console.error("Fatal:", error.message);
    process.exitCode = 1;
  });
}
