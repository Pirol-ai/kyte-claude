# kyte for Claude

The kyte plugin connects Claude to your company's **kyte** workspace — the company OS by [Pirol Labs](https://pirol.ai). Ask Claude about your customers, projects, hours, invoices, goals, people and documents, and let it log hours, create a customer or update a deal for you. Claude works **as you**: it sees exactly what your role in kyte may see and changes only what your role may change.

## What you need

**Node.js 18 or newer** on your `PATH` — the plugin's own launcher runs on it. kyte itself brings everything it needs in one binary; this one small file is the exception.

Then the **kyte command line**, installed and signed in once:

1. Install it — macOS / Linux: `curl -fsSL https://updates.pirol.ai/cli/install.sh | sh` · Windows: `irm https://updates.pirol.ai/cli/install.ps1 | iex`
2. Sign in for the plugin's data folder (the **Data folder** setting, `~/.kyte/claude` unless you change it): `~/.local/bin/kyte login --db ~/.kyte/claude` (Windows: `%LOCALAPPDATA%\Programs\kyte\kyte.exe login --db ~/.kyte/claude`) — the full path, because the installer's folder is not always on your `PATH` yet. Once it is, plain `kyte login …` works.

## Install

In Claude Code:

```
/plugin marketplace add Pirol-ai/kyte-claude
/plugin install kyte@kyte-claude
```

In the Claude app: **Customize → Plugins → Add → Add marketplace**, enter `Pirol-ai/kyte-claude`, then add **kyte**.

## Use it

Ask in plain words: *"Which projects for Meyer GmbH still have unbilled hours?"*, *"Book three hours on the Northwind implementation for today"*, *"Who is out next week?"*. Claude looks things up with the kyte tools before it answers, asks before it changes anything (your Claude app asks you to allow each tool that writes), and says afterwards what it changed.

Where it works: **Claude Code** and **Cowork** sessions on your computer. Claude's chat cannot start programs on your computer, so the kyte tools are not available there.

## Settings

- **Read only** — Claude may read but not create, change or delete anything.
- **Data folder** — where this connection keeps its local copy of your workspace. Its own folder, so Claude never competes with a kyte session in your terminal for the one database.
- **kyte program** — only if kyte is installed somewhere the installer does not put it.

## What it runs, sends and stores

- **Runs:** `server/kyte.cjs`, a small launcher (readable source, no dependencies, checked by `node --test server/*.test.cjs`) that finds the installed `kyte` program and starts `kyte mcp`. Without kyte installed it serves a single tool, `kyte_setup`, that explains how to install it. kyte is started with a named environment — where your files are, how this network reaches the internet — and not with everything else you have set in your shell, so nothing you keep there for another program is passed on by this plugin.
- **Sends:** what Claude reads through these tools goes to Claude's model, as with any tool you use in Claude, under Anthropic's terms. kyte itself keeps your workspace in step with **your company's kyte team server**, run by your company itself or by Pirol on its behalf in German data centers. The plugin sends nothing anywhere else.
- **Stores:** an encrypted local copy of your workspace in the data folder, its key in your operating system's keychain. Every change Claude makes is recorded in kyte as made by an agent on your behalf.
- **Never:** builds apps or extensions, runs commands, or reads your files — only the data tools of your kyte workspace exist for it.

## Support

Questions and problems: [github.com/Pirol-ai/kyte-claude/issues](https://github.com/Pirol-ai/kyte-claude/issues).

## Privacy and terms

- Privacy policy: [pirol.ai/privacy](https://pirol.ai/privacy)
- Terms of service: [pirol.ai/terms](https://pirol.ai/terms)

## License

MIT — see [LICENSE](LICENSE). The license covers this plugin (the launcher, the skill and the documents); the kyte program it starts is licensed separately.
