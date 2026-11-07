// Claude Code PostToolUse hook, declared in .claude/settings.json: validates the topic of a file an agent just wrote.
// A screen file checks that screen alone, any other file of the topic checks the whole topic.
// Exit code 2 hands the validator output back to the agent. Files outside a topic and the kit itself are ignored.
import { readFileSync, existsSync, realpathSync } from "node:fs";
import { join, dirname, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../..");
const inside = (parent, path) => path.startsWith(parent + sep);

const written = JSON.parse(readFileSync(0, "utf8")).tool_input?.file_path;
if (!written) process.exit(0);
// The real path: ROOT comes from this script's own, and a symlink in the project path must not read as outside.
const file = realpathSync(resolve(written));
if (!inside(ROOT, file) || inside(join(ROOT, "kit"), file)) process.exit(0);

let topicDir = dirname(file);
while (topicDir !== ROOT && !existsSync(join(topicDir, "topic.json"))) topicDir = dirname(topicDir);
if (topicDir === ROOT) process.exit(0);

// A malformed topic.json names no screen here: the validator run below reports it.
let screen;
try {
  screen = JSON.parse(readFileSync(join(topicDir, "topic.json"), "utf8")).screens.find((s) => join(topicDir, s.file) === file);
} catch {}

const args = [join(HERE, "validate.mjs"), topicDir, ...(screen ? [screen.id] : [])];
const run = spawnSync(process.execPath, args, { encoding: "utf8" });
if (run.status === 0) process.exit(0);
process.stderr.write(`${relative(ROOT, file)}: the validator found problems.\n${run.stdout}${run.stderr}`);
process.exit(2);
