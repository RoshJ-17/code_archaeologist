/**
 * Code Archaeologist — Investigation Workstation Backend API
 *
 * Exposes real LangGraph multi-agent execution, live SSE status streaming,
 * repository discovery, and case history.
 */

import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { runStore } from "./runStore.js";
import { buildWorkflow } from "../graph/workflow.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "../..");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ── Security & Directory Verification ─────────────────────────────────

function isPathInside(targetPath, parentPath) {
  const relative = path.relative(parentPath, targetPath);
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}

function resolveSafeRepoPath(inputPath) {
  if (!inputPath || typeof inputPath !== "string") {
    throw new Error("Repository path must be a non-empty string");
  }
  const cleanInput = inputPath.trim().replace(/^["']|["']$/g, "");
  const resolved = path.isAbsolute(cleanInput)
    ? path.normalize(cleanInput)
    : path.resolve(PROJECT_ROOT, cleanInput);

  // Ensure path is inside project root or explicit REPO_ROOT
  const allowedRoot = process.env.REPO_ROOT
    ? path.resolve(process.env.REPO_ROOT)
    : PROJECT_ROOT;

  if (resolved !== allowedRoot && !isPathInside(resolved, allowedRoot)) {
    throw new Error(`Access denied: repository path is outside allowed directory (${allowedRoot})`);
  }

  return resolved;
}

// ── Endpoints ─────────────────────────────────────────────────────────

/**
 * System configuration & health check.
 * NEVER returns API keys or sensitive secrets.
 */
app.get("/api/config", (req, res) => {
  const hasGoogleKey = Boolean(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY);

  res.json({
    status: "ok",
    apiKeyConfigured: hasGoogleKey,
    apiKeySource: process.env.GOOGLE_API_KEY
      ? "GOOGLE_API_KEY"
      : process.env.GEMINI_API_KEY
      ? "GEMINI_API_KEY"
      : "NONE",
    defaultRepo: "test-repositories/discount-bug",
    models: {
      analyst: process.env.ANALYST_MODEL || "gemini-3.8-flash",
      diagnosis: process.env.DIAGNOSIS_MODEL || "gemini-3.8-flash",
      fix: process.env.FIX_MODEL || "gemini-3.8-flash",
      qa: process.env.QA_MODEL || "gemini-3.8-flash",
      review: process.env.REVIEW_MODEL || "gemini-3.8-flash",
    },
    maxIterations: 3,
    version: "1.0.0",
  });
});

/**
 * Discover test repositories and known targets.
 */
app.get("/api/repos", async (req, res) => {
  try {
    const testReposDir = path.join(PROJECT_ROOT, "test-repositories");
    const entries = await fs.readdir(testReposDir, { withFileTypes: true });
    const repos = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const repoPath = path.join(testReposDir, entry.name);
        let summary = "Local test repository";
        let sampleBug = "";

        try {
          const readmePath = path.join(repoPath, "README.md");
          const readmeContent = await fs.readFile(readmePath, "utf-8");
          summary = readmeContent.split("\n")[0].replace(/^#\s*/, "") || summary;
        } catch (_) {}

        if (entry.name === "discount-bug") {
          sampleBug = "Customers purchasing exactly 10 items are not receiving the bulk discount of 20%.";
        } else if (entry.name === "boundary-bug") {
          sampleBug = "Threshold calculation excludes upper bound edge cases.";
        } else if (entry.name === "tax-bug") {
          sampleBug = "Tax calculation fails on zero-rate exempt items due to division by zero in surcharge ratio.";
        }

        repos.push({
          id: entry.name,
          name: entry.name,
          relativePath: `test-repositories/${entry.name}`,
          absolutePath: repoPath,
          summary,
          sampleBug,
          language: "Python (pytest)",
        });
      }
    }

    res.json({ repos });
  } catch (err) {
    res.status(500).json({ error: "Failed to scan repositories", details: err.message });
  }
});

/**
 * List all investigation runs.
 */
app.get("/api/runs", (req, res) => {
  res.json({ runs: runStore.getAllRuns() });
});

/**
 * Get individual investigation dossier.
 */
app.get("/api/runs/:id", (req, res) => {
  const run = runStore.getRun(req.params.id);
  if (!run) {
    return res.status(404).json({ error: "Investigation run not found" });
  }
  res.json(run);
});

/**
 * Server-Sent Events stream for real-time progress.
 */
app.get("/api/runs/:id/events", (req, res) => {
  const run = runStore.getRun(req.params.id);
  if (!run) {
    return res.status(404).json({ error: "Investigation run not found" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Send current state immediately as initialization event
  res.write(
    `data: ${JSON.stringify({
      type: "SYNC",
      run: {
        id: run.id,
        status: run.status,
        currentAgent: run.currentAgent,
        completedAgents: run.completedAgents,
        state: run.state,
        outcome: run.outcome,
        error: run.error,
      },
    })}\n\n`
  );

  const unsubscribe = runStore.subscribe(run.id, (event) => {
    res.write(`data: ${JSON.stringify({ type: "EVENT", event, run: runStore.getRun(run.id) })}\n\n`);
  });

  // Heartbeat ping every 15s to keep SSE connection alive
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 15000);

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

/**
 * Start a new investigation excavation.
 */
app.post("/api/runs", async (req, res) => {
  const { repositoryPath, bugReport } = req.body;

  if (!bugReport || typeof bugReport !== "string" || !bugReport.trim()) {
    return res.status(400).json({ error: "Bug report description is required" });
  }

  let resolvedRepoPath;
  try {
    resolvedRepoPath = resolveSafeRepoPath(repositoryPath || "test-repositories/discount-bug");
    // Verify repository exists on disk
    await fs.access(resolvedRepoPath);
  } catch (err) {
    return res.status(400).json({ error: "Invalid repository path", details: err.message });
  }

  const repoName = path.basename(resolvedRepoPath);
  const run = runStore.createRun({
    repositoryPath: resolvedRepoPath,
    repositoryName: repoName,
    bugReport: bugReport.trim(),
  });

  // Respond immediately with the created run ID
  res.status(202).json({
    message: "Excavation initiated",
    runId: run.id,
    run,
  });

  // Execute workflow asynchronously in background
  executeWorkflowInBackground(run.id, resolvedRepoPath, bugReport.trim()).catch((err) => {
    console.error(`[Investigation Background Error ${run.id}]:`, err);
  });
});

/**
 * Execute the 5-agent LangGraph workflow with real state streaming.
 */
async function executeWorkflowInBackground(runId, repositoryPath, bugReport) {
  runStore.updateRunStatus(runId, "RUNNING", { currentAgent: "repository_analyst" });
  runStore.addEvent(runId, {
    type: "WORKFLOW_START",
    message: "Archaeological expedition started. Building 5-agent graph.",
  });

  const agentDisplayNames = {
    repository_analyst: "Repository Analyst",
    diagnosis_agent: "Diagnosis Agent",
    fix_agent: "Fix Agent",
    qa_agent: "QA Agent",
    review_agent: "Review Agent",
  };

  try {
    const appWorkflow = buildWorkflow();
    const initialState = {
      repository_path: repositoryPath,
      bug_report: bugReport,
      iteration: 0,
    };

    runStore.addEvent(runId, {
      type: "AGENT_START",
      agent: "repository_analyst",
      message: "Repository Analyst beginning source stratigraphy and symbol indexing.",
    });

    const stream = await appWorkflow.stream(initialState, { streamMode: "updates" });

    let latestState = { ...initialState };

    for await (const chunk of stream) {
      const nodeKeys = Object.keys(chunk);

      for (const nodeName of nodeKeys) {
        const update = chunk[nodeName];
        runStore.updateRunState(runId, update);
        runStore.markAgentCompleted(runId, nodeName);
        latestState = { ...latestState, ...update };

        const readableName = agentDisplayNames[nodeName] || nodeName;
        let eventMsg = `${readableName} completed stage execution.`;

        if (nodeName === "repository_analyst" && update.repository_analysis) {
          const filesCount = update.repository_analysis.relevant_files?.length || 0;
          eventMsg = `Repository Analyst mapped ${filesCount} relevant source/test artifacts.`;
          runStore.updateRunStatus(runId, "RUNNING", { currentAgent: "diagnosis_agent" });
          runStore.addEvent(runId, {
            type: "AGENT_START",
            agent: "diagnosis_agent",
            message: "Diagnosis Agent excavating root cause hypothesis & gathering code evidence.",
          });
        } else if (nodeName === "diagnosis_agent" && update.diagnosis) {
          const file = update.diagnosis.suspectedFile || "unknown";
          const conf = Math.round((update.diagnosis.confidence || 0) * 100);
          eventMsg = `Diagnosis Agent localized anomaly to ${file} (confidence: ${conf}%).`;
          runStore.updateRunStatus(runId, "RUNNING", { currentAgent: "fix_agent" });
          runStore.addEvent(runId, {
            type: "AGENT_START",
            agent: "fix_agent",
            message: `Fix Agent reconstructing minimal patch delta (Iteration ${update.iteration || 1}).`,
          });
        } else if (nodeName === "fix_agent" && update.patch) {
          eventMsg = `Fix Agent synthesized patch for ${update.patch.modifiedFiles?.join(", ") || "target files"}.`;
          runStore.updateRunStatus(runId, "RUNNING", { currentAgent: "qa_agent" });
          runStore.addEvent(runId, {
            type: "AGENT_START",
            agent: "qa_agent",
            message: "QA Agent applying patch to sandbox and executing pytest/test assertions.",
          });
        } else if (nodeName === "qa_agent" && update.test_results) {
          const qaStatus = update.test_results.status;
          const restoredStatus = update.test_results.restored ? "cleanly restored" : "FAILED RESTORATION";
          eventMsg = `QA Agent evaluated patch: ${qaStatus}. Sandbox ${restoredStatus}.`;

          if (qaStatus === "PASS") {
            runStore.updateRunStatus(runId, "RUNNING", { currentAgent: "review_agent" });
            runStore.addEvent(runId, {
              type: "AGENT_START",
              agent: "review_agent",
              message: "Review Agent performing independent blast-radius and validation audit.",
            });
          } else {
            // QA failed, might loop back to fix_agent or end
            const iter = update.iteration || 1;
            if (iter < 3) {
              runStore.updateRunStatus(runId, "RUNNING", { currentAgent: "fix_agent" });
              runStore.addEvent(runId, {
                type: "ROUTING",
                message: `QA failed. Routing back to Fix Agent for iteration ${iter + 1}.`,
              });
            }
          }
        } else if (nodeName === "review_agent" && update.validation) {
          const valStatus = update.validation.status;
          eventMsg = `Review Agent final verdict: ${valStatus}. ${update.validation.reason || ""}`;
        }

        runStore.addEvent(runId, {
          type: "AGENT_COMPLETE",
          agent: nodeName,
          message: eventMsg,
          data: update,
        });
      }
    }

    // Determine final outcome
    let finalOutcome = "COMPLETED";
    if (latestState.validation?.status === "VERIFIED") {
      finalOutcome = "VERIFIED";
    } else if (latestState.validation?.status === "REJECTED") {
      finalOutcome = "REJECTED";
    } else if (latestState.test_results?.status === "FAIL") {
      finalOutcome = "QA_FAILED";
    } else if (latestState.test_results?.status === "INCONCLUSIVE") {
      finalOutcome = "INCONCLUSIVE";
    } else if (latestState.error) {
      finalOutcome = "ERROR";
    }

    const finalStatus = latestState.error ? "FAILED" : "COMPLETED";

    runStore.updateRunStatus(runId, finalStatus, {
      outcome: finalOutcome,
      currentAgent: null,
      error: latestState.error || null,
    });

    runStore.addEvent(runId, {
      type: "WORKFLOW_COMPLETE",
      message: `Investigation finalized with outcome: ${finalOutcome}.`,
      outcome: finalOutcome,
    });
  } catch (err) {
    console.error(`Workflow failure on run ${runId}:`, err);
    runStore.updateRunStatus(runId, "FAILED", {
      outcome: "ERROR",
      currentAgent: null,
      error: err.message,
    });
    runStore.addEvent(runId, {
      type: "AGENT_ERROR",
      message: `Expedition failed: ${err.message}`,
      error: err.message,
    });
  }
}

app.listen(PORT, () => {
  console.log(`[Code Archaeologist Backend] Listening on http://localhost:${PORT}`);
});
