/**
 * The launcher's contract, checked with Node's own test runner — `node --test server/*.test.cjs`.
 *
 * No dependencies here either: a plugin is installed as it is, and a test that needs an install
 * step is a test nobody runs. What is worth guarding is the text and the arguments, because both
 * are read by someone who is stuck: the setup text is the only instruction a newcomer gets, and
 * `kyte mcp`'s arguments are what the plugin's two settings actually come down to.
 */
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const {
  childEnv,
  expandHome,
  fallbackAnswer,
  findKyte,
  installTarget,
  kyteArgs,
  setting,
  setupText,
} = require("./kyte.cjs");

const HOME = "/Users/someone";

test("an unsubstituted placeholder counts as an empty setting", () => {
  assert.equal(setting("${user_config.kyte_path}"), "");
  assert.equal(setting("  /opt/kyte  "), "/opt/kyte");
  assert.equal(setting(undefined), "");
});

test("~ is expanded by us, never by a shell", () => {
  assert.equal(expandHome("~/.kyte/claude", HOME), `${HOME}/.kyte/claude`);
  assert.equal(expandHome("~", HOME), HOME);
  assert.equal(expandHome("/tmp/db", HOME), "/tmp/db");
});

test("the two settings become kyte mcp's arguments", () => {
  assert.deepEqual(kyteArgs({}), ["mcp"]);
  assert.deepEqual(kyteArgs({ CLAUDE_PLUGIN_OPTION_DATA_FOLDER: "/tmp/db", CLAUDE_PLUGIN_OPTION_READ_ONLY: "true" }), [
    "mcp",
    "--db",
    "/tmp/db",
    "--read-only",
  ]);
  // anything but the string "true" leaves writing on — "false", "", an unsubstituted placeholder
  assert.deepEqual(kyteArgs({ CLAUDE_PLUGIN_OPTION_READ_ONLY: "${user_config.read_only}" }), ["mcp"]);
});

test("a kyte named in the settings is the only candidate", () => {
  const found = findKyte({ CLAUDE_PLUGIN_OPTION_KYTE_PATH: "/opt/kyte" }, "darwin", HOME, (f) => f === "/opt/kyte");
  assert.equal(found, "/opt/kyte");
  // named but not there: we do not quietly start a different kyte
  assert.equal(findKyte({ CLAUDE_PLUGIN_OPTION_KYTE_PATH: "/opt/kyte" }, "darwin", HOME, () => false), null);
});

test("the sign-in step names the installer's absolute path", () => {
  assert.equal(installTarget({}, "darwin", HOME), `${HOME}/.local/bin/kyte`);
  assert.equal(installTarget({ KYTE_INSTALL_DIR: "/opt/bin" }, "linux", HOME), "/opt/bin/kyte");
  assert.equal(
    installTarget({ LOCALAPPDATA: "C:\\Users\\Someone\\AppData\\Local" }, "win32", HOME),
    "C:\\Users\\Someone\\AppData\\Local\\Programs\\kyte\\kyte.exe",
  );
});

test("the setup text can be pasted as it stands", () => {
  const text = setupText({ CLAUDE_PLUGIN_OPTION_DATA_FOLDER: "~/.kyte/claude" }, "darwin", HOME);
  assert.match(text, /curl -fsSL/);
  assert.ok(text.includes(`${HOME}/.local/bin/kyte login --db ${HOME}/.kyte/claude`));
  // the trap this guards: a bare command in a shell whose PATH lacks the installer's folder
  assert.doesNotMatch(text, /^\s*kyte login/m);
  // and no ~ in the path, which only a shell would expand
  assert.doesNotMatch(text, /--db ~/);
});

test("a kyte named in the settings but missing is said so, by path", () => {
  const text = setupText({ CLAUDE_PLUGIN_OPTION_KYTE_PATH: "/opt/nope/kyte" }, "darwin", HOME);
  assert.match(text, /^kyte is not at \/opt\/nope\/kyte/);
});

test("the windows text uses the windows installer and executable", () => {
  const text = setupText({ LOCALAPPDATA: "C:\\L" }, "win32", HOME);
  assert.match(text, /irm https:\/\/updates\.pirol\.ai\/cli\/install\.ps1 \| iex/);
  assert.match(text, /C:\\L\\Programs\\kyte\\kyte\.exe login/);
});

/** The manifests as they ship: the settings only work if all three spell the options alike. */
const read = (file) => JSON.parse(readFileSync(path.join(__dirname, "..", file), "utf8"));

test("the option names in .mcp.json are the ones the launcher reads", () => {
  const declared = read(".mcp.json").mcpServers.kyte.env;
  const userConfig = read(".claude-plugin/plugin.json").userConfig;

  // each variable is CLAUDE_PLUGIN_OPTION_ plus a userConfig key in capitals, and its value is
  // nothing but a reference to that option — the only shape the plugin directory accepts
  const keys = [];
  for (const [name, value] of Object.entries(declared)) {
    const key = /^\$\{user_config\.([a-z0-9_]+)\}$/.exec(value)?.[1];
    assert.ok(key, `${name} is set to ${value}, not to one option of this plugin`);
    assert.equal(name, `CLAUDE_PLUGIN_OPTION_${key.toUpperCase()}`);
    assert.ok(key in userConfig, `${key} is handed over but not offered in plugin.json`);
    keys.push(key);
  }
  assert.deepEqual(keys.sort(), Object.keys(userConfig).sort());

  // and the launcher answers to exactly those names, taken from the manifest itself
  const handed = (values) =>
    Object.fromEntries(
      Object.entries(declared).map(([name, value]) => [
        name,
        values[/\.([a-z0-9_]+)\}$/.exec(value)[1]] ?? "",
      ]),
    );
  const env = handed({ data_folder: "~/.kyte/claude", read_only: "true", kyte_path: "/opt/kyte" });
  assert.deepEqual(kyteArgs(env), ["mcp", "--db", expandHome("~/.kyte/claude"), "--read-only"]);
  assert.equal(findKyte(env, "darwin", HOME, (f) => f === "/opt/kyte"), "/opt/kyte");
});

test("kyte is started with a named environment, not with everything the person has set", () => {
  const passed = childEnv({
    HOME: "/Users/someone",
    PATH: "/usr/bin",
    HTTPS_PROXY: "http://proxy:3128",
    // the one that matters: kyte would read this key and talk to a server with it
    PIROL_API_KEY: "sk-live-nobody-asked-for-this",
    AWS_SECRET_ACCESS_KEY: "another one",
    GITHUB_TOKEN: "and another",
    CLAUDE_PLUGIN_OPTION_KYTE_PATH: "/opt/kyte",
  });
  assert.deepEqual(passed, {
    HOME: "/Users/someone",
    PATH: "/usr/bin",
    HTTPS_PROXY: "http://proxy:3128",
  });
});

test("a windows variable is matched without case and handed on as it was spelled", () => {
  const passed = childEnv({ Path: "C:\\bin", SystemRoot: "C:\\Windows", Secret: "no" });
  assert.deepEqual(passed, { Path: "C:\\bin", SystemRoot: "C:\\Windows" });
});

test("the fallback server speaks MCP while kyte is missing", () => {
  const text = "install it like so";
  const init = fallbackAnswer(
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26" } },
    text,
  );
  assert.equal(init.result.protocolVersion, "2025-03-26");
  assert.deepEqual(init.result.capabilities, { tools: {} });
  assert.match(init.result.instructions, /install it like so/);

  const list = fallbackAnswer({ jsonrpc: "2.0", id: 2, method: "tools/list" }, text);
  assert.equal(list.result.tools.length, 1);
  assert.equal(list.result.tools[0].name, "kyte_setup");

  const call = fallbackAnswer(
    { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "kyte_setup" } },
    text,
  );
  assert.equal(call.result.isError, false);
  assert.equal(call.result.content[0].text, text);

  // a notification takes no answer, and anything else is an honest "method not found"
  assert.equal(fallbackAnswer({ jsonrpc: "2.0", method: "notifications/initialized" }, text), null);
  assert.equal(
    fallbackAnswer({ jsonrpc: "2.0", id: 4, method: "resources/list" }, text).error.code,
    -32601,
  );
});
