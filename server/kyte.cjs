#!/usr/bin/env node
/**
 * kyte for Claude — the plugin's launcher.
 *
 * Claude Code (and a Cowork session on this computer) starts this file as the plugin's MCP server.
 * The plugin carries no copy of kyte: it finds the kyte CLI the person installed
 * (one signed binary, kept current by its own installer) and hands the connection to `kyte mcp`.
 * Everything kyte says over MCP — the tools, the instructions, its answers — comes from kyte
 * itself; this file only decides which program to start and with which arguments.
 *
 * When there is no kyte to start, the connection still comes up: one tool that says how to
 * install it. A host that shows "server disconnected" teaches nobody anything.
 *
 * No dependencies on purpose: a bundle is installed as it is, and the only runtime it can count
 * on is Node.
 */
"use strict";

const { spawn } = require("node:child_process");
const { accessSync, constants, statSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const readline = require("node:readline");

const INSTALL = {
  posix: "curl -fsSL https://updates.pirol.ai/cli/install.sh | sh",
  win32: "irm https://updates.pirol.ai/cli/install.ps1 | iex",
};

/** A value Claude substituted — or the literal placeholder it leaves for an empty field. */
function setting(value) {
  const text = (value ?? "").trim();
  return text && !text.includes("${") ? text : "";
}

/** `~/…` as the person wrote it in the settings: no shell is involved to expand it. */
function expandHome(value, home = os.homedir()) {
  return value === "~" ? home : value.startsWith("~/") ? path.join(home, value.slice(2)) : value;
}

/** Where the installers put kyte, after anything on PATH (install.sh / install.ps1). */
function candidates(env, platform, home) {
  const exe = platform === "win32" ? "kyte.exe" : "kyte";
  const sep = platform === "win32" ? ";" : ":";
  const join = platform === "win32" ? path.win32.join : path.posix.join;
  const dirs = [];
  if (setting(env.KYTE_INSTALL_DIR)) dirs.push(setting(env.KYTE_INSTALL_DIR));
  dirs.push(...(env.PATH ?? "").split(sep).filter(Boolean));
  // a GUI app does not get the shell's PATH: the installers' own targets are named explicitly
  if (platform === "win32") {
    if (env.LOCALAPPDATA) dirs.push(join(env.LOCALAPPDATA, "Programs", "kyte"));
  } else {
    dirs.push(join(home, ".local", "bin"), "/opt/homebrew/bin", "/usr/local/bin");
  }
  return [...new Set(dirs.map((dir) => join(dir, exe)))];
}

function runnable(file) {
  try {
    accessSync(file, constants.X_OK);
    return statSync(file).isFile();
  } catch {
    return false;
  }
}

/** The kyte to start: the one the person named in the plugin's settings, else the first found. */
function findKyte(
  env = process.env,
  platform = process.platform,
  home = os.homedir(),
  ok = runnable,
) {
  const named = setting(env.KYTE_EXT_BIN);
  if (named) return ok(named) ? named : null;
  return candidates(env, platform, home).find(ok) ?? null;
}

/** `kyte mcp` with the plugin's two settings: which data folder, and whether it may write. */
function kyteArgs(env = process.env) {
  const args = ["mcp"];
  const dbDir = expandHome(setting(env.KYTE_EXT_DB_DIR));
  if (dbDir) args.push("--db", dbDir);
  if (setting(env.KYTE_EXT_READ_ONLY) === "true") args.push("--read-only");
  return args;
}

/** What to do when kyte is missing — in the words the person needs, for their system. */
function setupText(env = process.env, platform = process.platform) {
  const dbDir = expandHome(setting(env.KYTE_EXT_DB_DIR));
  const named = setting(env.KYTE_EXT_BIN);
  return [
    named
      ? `kyte is not at ${named}, the path set in this plugin's settings.`
      : "The kyte command line is not installed on this computer, so this plugin has nothing to start.",
    "",
    "1. Install it:",
    `   ${platform === "win32" ? INSTALL.win32 : INSTALL.posix}`,
    "2. Sign in once:",
    `   kyte login${dbDir ? ` --db ${dbDir}` : ""}`,
    "3. Restart Claude (or reconnect the kyte server with /mcp in Claude Code).",
  ].join("\n");
}

const SETUP_TOOL = "kyte_setup";

/**
 * The MCP answer to one message while kyte is missing: a handshake, one tool, and that tool's
 * explanation. Everything else is "method not found", as any server would say.
 */
function fallbackAnswer(msg, text) {
  const { id, method } = msg;
  if (id === undefined || id === null) return null; // a notification takes no answer
  const ok = (result) => ({ jsonrpc: "2.0", id, result });
  if (method === "initialize")
    return ok({
      protocolVersion: msg.params?.protocolVersion ?? "2025-06-18",
      capabilities: { tools: {} },
      serverInfo: { name: "kyte", title: "kyte — not set up yet", version: "0" },
      instructions: `kyte cannot answer yet. Tell the person this, in their words:\n\n${text}`,
    });
  if (method === "ping") return ok({});
  if (method === "tools/list")
    return ok({
      tools: [
        {
          name: SETUP_TOOL,
          title: "kyte: how to set it up",
          description: "Explains why kyte cannot answer yet and how to fix it. Call this first.",
          inputSchema: { type: "object", properties: {} },
          annotations: { readOnlyHint: true, openWorldHint: false },
        },
      ],
    });
  if (method === "tools/call")
    return ok({
      content: [{ type: "text", text }],
      isError: msg.params?.name !== SETUP_TOOL,
    });
  return { jsonrpc: "2.0", id, error: { code: -32601, message: `method not found: ${method}` } };
}

function serveFallback(text) {
  console.error(`kyte plugin: ${text.split("\n")[0]}`);
  const lines = readline.createInterface({ input: process.stdin });
  lines.on("line", (line) => {
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      return;
    }
    const answer = fallbackAnswer(msg, text);
    if (answer) process.stdout.write(`${JSON.stringify(answer)}\n`);
  });
}

function main() {
  const kyte = findKyte();
  if (!kyte) return serveFallback(setupText());
  // stdio straight through: the conversation is between Claude and kyte, not this file
  const child = spawn(kyte, kyteArgs(), { stdio: "inherit" });
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
  child.on("error", (error) => {
    console.error(`kyte plugin: could not start ${kyte}: ${error.message}`);
    serveFallback(setupText());
  });
  child.on("exit", (code, signal) => process.exit(signal ? 1 : (code ?? 0)));
}

module.exports = { candidates, expandHome, fallbackAnswer, findKyte, kyteArgs, setting, setupText };

if (require.main === module) main();
