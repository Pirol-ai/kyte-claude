// What has to hold for the version in plugins/kyte, the one Claude's plugin directory carries.
//
// The directory accepts that folder only while it stays text: Markdown, JSON, YAML or one of a
// few image formats, nothing beginning with #!, UTF-8 throughout. A file added there without
// thinking — a helper script, a lockfile, a screenshot in the wrong format — is refused by a
// scan that runs days later, long after the commit. These checks run on the pull request instead.
//
// The second half guards the thing that drifts: the folder named in the readme and the folder
// named in the skill have to be the same folder, or the person signs in for one and Claude reads
// the other.

const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const PLUGIN = path.join(__dirname, "..", "plugins", "kyte");

const filesUnder = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(full) : [full];
  });

const relative = (file) => path.relative(PLUGIN, file);

// Markdown, text, JSON, YAML and PNG/JPEG/GIF/WebP/ICO are what the directory lets through;
// LICENSE carries no extension and is read as text.
const ALLOWED = new Set([".md", ".txt", ".json", ".yaml", ".yml", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico"]);
const ALLOWED_WITHOUT_EXTENSION = new Set(["LICENSE"]);

test("every file in the folder is one the directory accepts", () => {
  for (const file of filesUnder(PLUGIN)) {
    const extension = path.extname(file);
    const accepted = extension
      ? ALLOWED.has(extension.toLowerCase())
      : ALLOWED_WITHOUT_EXTENSION.has(path.basename(file));
    assert.ok(accepted, `${relative(file)} is not a type the directory accepts`);
  }
});

test("no file in the folder is something a computer would run", () => {
  for (const file of filesUnder(PLUGIN)) {
    const head = fs.readFileSync(file).subarray(0, 2).toString("latin1");
    assert.notStrictEqual(head, "#!", `${relative(file)} begins like a program`);
  }
});

test("every text file is UTF-8 and holds no NUL byte", () => {
  for (const file of filesUnder(PLUGIN)) {
    if (path.extname(file).toLowerCase() === ".png") continue;
    const bytes = fs.readFileSync(file);
    assert.ok(!bytes.includes(0), `${relative(file)} holds a NUL byte`);
    const text = bytes.toString("utf8");
    assert.ok(!text.includes("�"), `${relative(file)} is not valid UTF-8`);
  }
});

test("the manifest points at a skill that is there", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(PLUGIN, ".claude-plugin", "plugin.json"), "utf8"));
  assert.strictEqual(manifest.name, "kyte");

  const skill = fs.readFileSync(path.join(PLUGIN, "skills", "kyte", "SKILL.md"), "utf8");
  assert.match(skill, /^---\nname: kyte\n/, "the skill's front matter names it kyte");
  assert.ok(/^description: .{40,}/m.test(skill), "the skill says when to use it");
});

test("nothing in the folder starts a server or a program", () => {
  const files = filesUnder(PLUGIN).map(relative);
  assert.ok(!files.includes(".mcp.json"), "a server manifest would make this the other version");
  assert.ok(!files.some((file) => file.startsWith("server" + path.sep)), "there is no launcher here");

  const manifest = JSON.parse(fs.readFileSync(path.join(PLUGIN, ".claude-plugin", "plugin.json"), "utf8"));
  assert.strictEqual(manifest.mcpServers, undefined);
  assert.strictEqual(manifest.hooks, undefined);
});

test("the readme and the skill send the person to the same folder", () => {
  const readme = fs.readFileSync(path.join(PLUGIN, "README.md"), "utf8");
  const skill = fs.readFileSync(path.join(PLUGIN, "skills", "kyte", "SKILL.md"), "utf8");

  const foldersIn = (text) => new Set([...text.matchAll(/--db ([^\s`]+)/g)].map((match) => match[1]));
  const inReadme = foldersIn(readme);
  const inSkill = foldersIn(skill);

  assert.strictEqual(inReadme.size, 1, `the readme names ${inReadme.size} folders`);
  assert.deepStrictEqual(inSkill, inReadme, "the skill names a different folder than the readme");
});
