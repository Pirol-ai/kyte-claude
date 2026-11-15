# kyte for Claude

**kyte** is the company OS by [Pirol Labs](https://pirol.ai): customers, contacts, deals, projects,
hours, invoices, goals, people and the company's documents, in one workspace. This plugin lets
Claude work in that workspace — ask it which projects still have unbilled hours, book three hours
on an implementation, look up who is out next week.

## What this plugin is

One skill, written as Markdown. It carries two things: how a person connects their kyte workspace
to Claude the first time, and how Claude should work in it afterwards — look things up before
answering, use the ids the tools return, name a record before deleting it, never report a change
that did not happen.

It is worth being plain about what that means: **this plugin does not reach your workspace by
itself.** The records come from the `kyte` program on your own computer, which you install and
sign in to once. Installing this plugin alone gives Claude the knowledge, not the data.

## Connecting your workspace

Three steps, once per computer. Claude will walk you through them when you ask it something about
your company and finds no kyte tools — or do them yourself:

1. Install the kyte command line — macOS and Linux: `curl -fsSL https://updates.pirol.ai/cli/install.sh | sh` · Windows: `irm https://updates.pirol.ai/cli/install.ps1 | iex`
2. Sign in once, for this connection's own folder: `kyte login --db ~/.kyte/claude`
3. Register it with Claude Code: `claude mcp add kyte -- kyte mcp --db ~/.kyte/claude` — add `--read-only` to let Claude read but never change anything.

The tools appear in the next session. Full instructions: [kyte.pirol.ai/docs/en/mcp/](https://kyte.pirol.ai/docs/en/mcp/).

Where it works: **Claude Code** and **Cowork** sessions on your computer. Claude's chat cannot
start programs on your computer, so the kyte tools are not available there.

## What it runs, sends and stores

- **Runs:** nothing. Every file in this plugin is Markdown, JSON or its icon — there is no program
  here, and nothing in it is executed.
- **Sends:** nothing. The plugin talks to no server of ours or anyone else's.
- **Stores:** nothing.

Once you have connected a workspace as described above, the kyte program is what reads and changes
it, under your own permissions, and keeps a local copy in the folder you named. What Claude reads
through those tools goes to Claude's model, as with any tool you use in Claude, under Anthropic's
terms. kyte keeps the workspace in step with your company's kyte team server — run by your company
itself, or by Pirol on its behalf in German data centres. How that works, and what it stores where,
is described in the kyte documentation linked above.

## Support

Questions and problems: [github.com/Pirol-ai/kyte-claude/issues](https://github.com/Pirol-ai/kyte-claude/issues).

## Privacy and terms

- Privacy policy: [pirol.ai/privacy](https://pirol.ai/privacy)
- Terms of service: [pirol.ai/terms](https://pirol.ai/terms)

## License

MIT — see [LICENSE](LICENSE). The licence covers this plugin; the kyte program it describes is
licensed separately.
