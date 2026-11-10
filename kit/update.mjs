// Installs the latest release of the kit: downloads its archive and replaces this kit/ folder with the one inside.
// Called by serve.mjs (POST /__protopass/update). Lives in kit/ so it is updated with the kit.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = "Haidy-ID/protopass";
const KIT = dirname(fileURLToPath(import.meta.url));

// The names tar lists, one per line. The tar that ships with Windows ends its lines with CRLF: a name that kept its
// "\r" matches nothing, and every archive looked as if it had no kit/VERSION.
export const entries = (listing) => listing.split(/\r?\n/).filter(Boolean);

// The archive holds one root folder (<owner>-<repo>-<sha>/): only its kit/ part is taken.
// tar ships with macOS, Linux and Windows 10 and later. Relative paths keep a Windows drive letter away from it.
export function replaceKit(archive, kit = KIT) {
  const site = dirname(kit);
  const staging = `${basename(kit)}.new`;
  const old = join(site, `${basename(kit)}.old`);
  const list = entries(execFileSync("tar", ["-tzf", basename(archive)], { cwd: dirname(archive), encoding: "utf8", maxBuffer: 1 << 28 }));
  // A path that leaves the staging folder (../, absolute) is refused: nothing is written outside the kit.
  const unsafe = list.find((name) => name.startsWith("/") || /^[A-Za-z]:/.test(name) || name.split("/").includes(".."));
  if (unsafe) throw new Error(`Unsafe path in the release archive: ${unsafe}`);
  const root = list[0].split("/")[0];
  if (!list.includes(`${root}/kit/VERSION`)) throw new Error("The release archive has no kit/VERSION");
  rmSync(join(site, staging), { recursive: true, force: true });
  mkdirSync(join(site, staging));
  execFileSync("tar", ["-xzf", relative(site, archive), "--strip-components=2", "-C", staging, `${root}/kit`], { cwd: site });
  // Swap: the old folder is kept until the new one is in place, and comes back if the swap fails.
  rmSync(old, { recursive: true, force: true });
  renameSync(kit, old);
  try {
    renameSync(join(site, staging), kit);
  } catch (e) {
    renameSync(old, kit);
    throw e;
  }
  rmSync(old, { recursive: true, force: true });
  return readFileSync(join(kit, "VERSION"), "utf8").trim();
}

export async function install() {
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: "application/vnd.github+json" } });
  if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
  const release = await res.json();
  const download = await fetch(release.tarball_url);
  if (!download.ok) throw new Error(`The release archive answered ${download.status}`);
  const archive = join(dirname(KIT), "kit.tar.gz");
  writeFileSync(archive, Buffer.from(await download.arrayBuffer()));
  try {
    return replaceKit(archive);
  } finally {
    if (existsSync(archive)) rmSync(archive);
  }
}
