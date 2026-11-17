#!/bin/sh
# Does this repository actually work as a Claude marketplace?
#
# Everything happens in two throwaway folders: a CLAUDE_CONFIG_DIR, so your own Claude is not
# touched, and a HOME, so no real kyte workspace is opened. What is checked is the whole path a
# newcomer walks — the manifests, the marketplace, the install, what the plugin brought, and
# finally what Claude puts in front of the model.
#
# Run it from anywhere:  sh check.sh
#
# It needs claude, node and kyte on the machine. The launcher and the directory version are
# checked by `node --test server/*.test.cjs tests/*.test.cjs`, which needs none of them.

set -eu

repo=$(cd "$(dirname "$0")" && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

HOME="$work/home"
CLAUDE_CONFIG_DIR="$work/claude"
mkdir -p "$HOME" "$CLAUDE_CONFIG_DIR" "$work/cwd"
export HOME CLAUDE_CONFIG_DIR

fail() {
  echo "FAILED: $1" >&2
  exit 1
}

echo "1. the launcher and the directory version"
node --test "$repo"/server/*.test.cjs "$repo"/tests/*.test.cjs >"$work/tests.txt" 2>&1 ||
  fail "the local tests do not pass
$(tail -30 "$work/tests.txt")"

echo "2. claude reads the manifests"
claude plugin validate "$repo" >"$work/validate.txt" 2>&1 ||
  fail "claude rejects the plugin
$(cat "$work/validate.txt")"
claude plugin validate "$repo/plugins/kyte" --profile directory --strict >"$work/validate-dir.txt" 2>&1 ||
  fail "the directory version would be sent back
$(cat "$work/validate-dir.txt")"

echo "3. the marketplace, and the install"
cd "$work/cwd"
claude plugin marketplace add "$repo" >"$work/add.txt" 2>&1 || fail "claude would not add the marketplace
$(cat "$work/add.txt")"
claude plugin install kyte@kyte-claude >"$work/install.txt" 2>&1 || fail "the plugin would not install
$(cat "$work/install.txt")"

echo "4. what the plugin brought"
# Both halves have to be there. A plugin whose skill is missing is a server with no manual, and a
# plugin whose server is missing is a manual for tools that do not exist.
claude plugin details kyte@kyte-claude >"$work/details.txt" 2>&1 || fail "claude plugin details did not run"
sed -n '/Component inventory/,/LSP/p' "$work/details.txt" | sed 's/^/   /'
grep -q 'Skills (1) *kyte' "$work/details.txt" || fail "the plugin brings no kyte skill
$(cat "$work/details.txt")"
grep -q 'MCP servers (1) *kyte' "$work/details.txt" || fail "the plugin brings no kyte server
$(cat "$work/details.txt")"

echo "5. the model is offered both"
# Installed is not offered: everything above can pass while the model is shown neither.
# This asks Claude itself — it answers into a throwaway endpoint, so no account and no tokens.
node "$repo/scripts/skill-offered.mjs" kyte:kyte mcp__plugin_kyte_kyte__ ||
  fail "Claude does not put the kyte skill and server in front of the model"

echo
echo "All five passed."
