---
name: kyte
description: Work with the company's kyte workspace — customers, contacts, deals, products, projects, time entries and hours, invoices, processes, goals and key results, people, teams, absences and the company's documents. Use when the person asks about any of these, wants something looked up, logged, booked, created, changed or removed in kyte, or asks a question their company data can answer. Also use when they want to connect their kyte workspace to Claude for the first time.
---

# Working in kyte

kyte is the person's company workspace — the company OS by Pirol Labs. Its records reach you
through the `kyte` program on the person's own computer, which serves that workspace over MCP.
This plugin is text: it starts nothing and connects to nothing. It is what you need to know
before that connection exists, and after.

Once it exists, it works **as that person**, under their permissions: what they may not see does
not exist for you, and what they may not change you cannot change.

## First: are the kyte tools there?

They are named after the records they serve — `crm_organizations_list`, `projects_projects_create`,
`time_entries_list` and their like.

- **There** → go on to *Looking things up*.
- **Not there** → this computer has no kyte connection yet. Say so plainly, offer the three steps
  below, and until they are done do not answer questions about the company at all: anything you
  say about their customers, projects or hours without those tools is invention.

## Connecting a workspace — three steps, once per computer

The person runs the first two themselves: the first writes a program onto their computer, the
second opens their browser to sign in. Walk them through it; do not run them for them.

1. **Install the kyte command line.** On macOS and Linux:

   ```
   curl -fsSL https://updates.pirol.ai/cli/install.sh | sh
   ```

   On Windows, in PowerShell:

   ```
   irm https://updates.pirol.ai/cli/install.ps1 | iex
   ```

   `kyte --version` says whether it is already there.

2. **Sign in once, for the folder this connection will use.**

   ```
   kyte login --db ~/.kyte/claude
   ```

   A browser opens, the person confirms, and the session is stored on their machine — there is
   nothing to copy and nothing for you to see. The folder is this connection's own copy of the
   workspace, kept apart from any kyte session they run in a terminal, so the two never compete
   for one database.

3. **Register the workspace as a local MCP server.** In Claude Code:

   ```
   claude mcp add kyte -- kyte mcp --db ~/.kyte/claude
   ```

   Add `--read-only` at the end to let Claude read the workspace but never create, change or
   delete anything. The tools appear in the next session, not this one.

If step 2 or 3 answers that `kyte` cannot be found, the installer's folder is not on the person's
`PATH` yet. It puts the program at `~/.local/bin/kyte` on macOS and Linux and at
`%LOCALAPPDATA%\Programs\kyte\kyte.exe` on Windows; use that path in both steps.

## Looking things up

- Prefer the kyte tools over guessing, and over asking the person for data the workspace already
  holds.
- The `*_list` tools page their results. Narrow with `search` first; read on with `offset` when the
  answer needs more rows. A list says how many rows there are in total — say so when you show only
  some.
- Use the ids the tools return. Never invent an id, and never reuse one from a different kind of
  record.

## Before you change anything

- Change only what the person asked for. When the request is ambiguous — which customer, which
  project, which week — ask, or show what you found and ask which one.
- A `*_delete` cannot be undone from here. Name the record you are about to delete and get a clear
  yes first.
- A tool that answers `ok: false` changed nothing. Say so, with its reason — never report a change
  that did not happen.

## After you changed something

Say in one or two sentences what you changed: which record, which fields, the values before and
after where you know them. Every change is recorded in kyte as made by an agent on the person's
behalf.

## What does not happen here

Apps, extensions and new data structures are built in kyte itself, in its Extend mode, not through
these tools. When the person wants a new field, table or app, tell them to build it there.

## When the workspace itself cannot answer

Sometimes the connection is registered but the workspace is not available — nobody has signed in
for that folder, or the company's team server cannot be reached. kyte then serves a single tool
that explains the situation instead of the usual ones. Call it, relay what it says word for word,
and treat the workspace as unreadable until it is fixed: no answers about the company from memory.
