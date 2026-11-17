// Is the skill actually put in front of the model, and does the server reach it?
//
// Installed is not offered. A skill can sit in the plugin, be listed as enabled, and never reach
// the model — that is exactly what happened to this same skill in Hermes, where one wrong key in
// the front matter hid it from every session while `skills list` kept saying `enabled`.
//
// No command answers that, so this asks Claude itself: it stands a throwaway endpoint in front of
// it, runs one turn, and reads the request. No model answers, no account is used and no tokens
// are spent — the request is the evidence.
//
// Two things have to be in it:
//   1. the skill's line in the skills listing, because that list is all the model is given;
//      it reads SKILL.md only when it decides to.
//   2. a tool from our MCP server, which only exists if the launcher started and kyte answered.
//      Where tool search is on it arrives as a deferred name rather than a loaded schema, so the
//      check looks for the name anywhere in the request.
//
// It runs inside the CLAUDE_CONFIG_DIR check.sh has already set up, with the plugin installed.

import { spawn } from "node:child_process";
import { createServer } from "node:http";

const skill = process.argv[2] ?? "kyte:kyte";
const toolPrefix = process.argv[3] ?? "mcp__plugin_kyte_kyte__";

if (!process.env.CLAUDE_CONFIG_DIR) {
  console.error("CLAUDE_CONFIG_DIR is not set: run this through check.sh, not on your own Claude");
  process.exit(1);
}

let finished = false;
let claude;

const server = createServer((req, res) => {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    // Claude checks the endpoint is alive before it asks it anything.
    if (req.method !== "POST" || !body) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end("{}");
      return;
    }
    res.writeHead(500, { "content-type": "application/json" });
    res.end('{"type":"error","error":{"type":"api_error","message":"this endpoint only listens"}}');
    done(body);
  });
});

const done = (body) => {
  if (finished) return;
  finished = true;
  clearTimeout(give_up);
  claude?.kill("SIGKILL");
  server.close();

  // Read the text from the parsed request, not the raw body, or every newline is still a
  // backslash and an n.
  const texts = [];
  const walk = (value) => {
    if (typeof value === "string") texts.push(value);
    else if (value && typeof value === "object") Object.values(value).forEach(walk);
  };
  try {
    walk(JSON.parse(body));
  } catch {
    console.error("Claude sent something that is not JSON");
    process.exit(1);
  }
  const all = texts.join("\n");

  const listing = texts.find((text) => /skills are available for use with the Skill tool/i.test(text));
  if (!listing) {
    console.error("Claude offered no skills at all — the request has no skills listing");
    process.exit(1);
  }

  // Read the entries that follow the heading. The skill's name turns up elsewhere in the request
  // too — a loaded skill's own heading, for one — and matching those would pass while the listing
  // is empty.
  const after = listing.slice(listing.search(/skills are available for use with the Skill tool/i));
  const entries = after
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^- [\w:.-]+:/.test(l));
  const line = entries.find((l) => l.startsWith(`- ${skill}:`));
  if (!line) {
    console.error(`MISSING: "${skill}" is not among the ${entries.length} skills Claude offers the model`);
    const names = entries.map((l) => l.match(/^- ([\w:.-]+):/)[1]);
    console.error("   offered: " + names.join(", "));
    process.exit(1);
  }
  console.log(`   skill:  ${line.trim().slice(0, 96)}…`);

  if (!all.includes(toolPrefix)) {
    console.error(`MISSING: no tool named ${toolPrefix}* reached the model — the server did not come up`);
    process.exit(1);
  }
  const tool = all.match(new RegExp(`${toolPrefix}\\w+`))[0];
  console.log(`   server: ${tool}`);
  process.exit(0);
};

const give_up = setTimeout(() => {
  console.error("Claude never asked the endpoint anything within 180s");
  claude?.kill("SIGKILL");
  process.exit(1);
}, 180_000);

server.listen(0, "127.0.0.1", () => {
  const { port } = server.address();
  claude = spawn("claude", ["-p", "Which projects still have unbilled hours?", "--permission-mode", "plan"], {
    env: {
      ...process.env,
      ANTHROPIC_BASE_URL: `http://127.0.0.1:${port}`,
      ANTHROPIC_API_KEY: "this-endpoint-only-listens",
    },
    stdio: ["ignore", "ignore", "pipe"],
  });
  let stderr = "";
  claude.stderr.on("data", (chunk) => (stderr += chunk));
  claude.on("exit", () => {
    if (finished) return;
    clearTimeout(give_up);
    server.close();
    console.error("Claude stopped before it asked the endpoint anything");
    if (stderr.trim()) console.error(stderr.trim().split("\n").slice(-5).join("\n"));
    process.exit(1);
  });
});
