/**
 * The launcher's contract, checked with Node's own test runner — `node --test server/`.
 *
 * No dependencies here either: a plugin is installed as it is, and a test that needs an install
 * step is a test nobody runs. What is worth guarding is the text and the arguments, because both
 * are read by someone who is stuck: the setup text is the only instruction a newcomer gets, and
 * `kyte mcp`'s arguments are what the plugin's two settings actually come down to.
 */
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
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
  assert.deepEqual(kyteArgs({ KYTE_EXT_DB_DIR: "/tmp/db", KYTE_EXT_READ_ONLY: "true" }), [
    "mcp",
    "--db",
    "/tmp/db",
    "--read-only",
  ]);
  // anything but the string "true" leaves writing on — "false", "", an unsubstituted placeholder
  assert.deepEqual(kyteArgs({ KYTE_EXT_READ_ONLY: "${user_config.read_only}" }), ["mcp"]);
});

test("a kyte named in the settings is the only candidate", () => {
  const found = findKyte({ KYTE_EXT_BIN: "/opt/kyte" }, "darwin", HOME, (f) => f === "/opt/kyte");
  assert.equal(found, "/opt/kyte");
  // named but not there: we do not quietly start a different kyte
  assert.equal(findKyte({ KYTE_EXT_BIN: "/opt/kyte" }, "darwin", HOME, () => false), null);
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
  const text = setupText({ KYTE_EXT_DB_DIR: "~/.kyte/claude" }, "darwin", HOME);
  assert.match(text, /curl -fsSL/);
  assert.ok(text.includes(`${HOME}/.local/bin/kyte login --db ${HOME}/.kyte/claude`));
  // the trap this guards: a bare command in a shell whose PATH lacks the installer's folder
  assert.doesNotMatch(text, /^\s*kyte login/m);
  // and no ~ in the path, which only a shell would expand
  assert.doesNotMatch(text, /--db ~/);
});

test("a kyte named in the settings but missing is said so, by path", () => {
  const text = setupText({ KYTE_EXT_BIN: "/opt/nope/kyte" }, "darwin", HOME);
  assert.match(text, /^kyte is not at \/opt\/nope\/kyte/);
});

test("the windows text uses the windows installer and executable", () => {
  const text = setupText({ LOCALAPPDATA: "C:\\L" }, "win32", HOME);
  assert.match(text, /irm https:\/\/updates\.pirol\.ai\/cli\/install\.ps1 \| iex/);
  assert.match(text, /C:\\L\\Programs\\kyte\\kyte\.exe login/);
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
