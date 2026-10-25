---
name: kyte
description: Work with the company's kyte workspace — customers, contacts, deals, products, projects, time entries and hours, invoices, processes, goals and key results, people, teams, absences and the company's documents. Use when the person asks about any of these, wants something looked up, logged, booked, created, changed or removed in kyte, or asks a question their company data can answer.
---

# Working in kyte

kyte is the person's company workspace. The `kyte` tools read and change it **as that person**, under their permissions: what they may not see does not exist for you, and what they may not change you cannot change.

## Look things up before you answer

- Prefer the kyte tools over guessing, and over asking the person for data the workspace already holds.
- The `*_list` tools page their results. Narrow with `search` first; read on with `offset` when the answer needs more rows. A list says how many rows there are in total — say so when you show only some.
- Use the ids the tools return. Never invent an id, and never reuse one from a different kind of record.

## Before you change anything

- Change only what the person asked for. When the request is ambiguous — which customer, which project, which week — ask, or show what you found and ask which one.
- A `*_delete` cannot be undone from here. Name the record you are about to delete and get a clear yes first.
- A tool that answers `ok: false` changed nothing. Say so, with its reason — never report a change that did not happen.

## After you changed something

Say in one or two sentences what you changed: which record, which fields, the values before and after where you know them. Every change is recorded in kyte as made by an agent on the person's behalf.

## What does not happen here

Apps, extensions and new data structures are built in kyte itself (its Extend mode), not through these tools. When the person wants a new field, table or app, tell them to build it there.

## When kyte cannot answer

If the only tool is `kyte_setup`, or a tool says kyte cannot answer right now, call it (or read its message) and tell the person exactly what it says — usually: install the kyte command line, sign in once with `kyte login --db <data folder>`, then restart Claude.
