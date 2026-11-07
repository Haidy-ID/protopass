// Run: node --test kit/*.test.mjs
// The server and the updater run from a throwaway site, so nothing here touches the real kit.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { networkInterfaces, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { replaceKit } from "./update.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const site = mkdtempSync(join(tmpdir(), "protopass-site-"));
const servers = [];
const write = (name, text, root = site) => {
  mkdirSync(dirname(join(root, name)), { recursive: true });
  writeFileSync(join(root, name), text);
};

write("index.html", "<h1>Home</h1>");
write("protopass.json", "{}");
write("kit/VERSION", "1.0.0");
write("kit/minimaly/icons/regular/plus.svg", "<svg/>");
write(".secret/key.txt", "private");
write("prototypes/topics.json", "[]");
write("prototypes/a/topic.json", "{}");
write("prototypes/a/screen.html", "<p>a</p>");
write("prototypes/b/topic.json", "{}");
for (const file of ["serve.mjs", "update.mjs"]) copyFileSync(join(HERE, file), join(site, "kit", file));

function serve(...args) {
  const child = spawn(process.execPath, [join(site, "kit/serve.mjs"), ...args]);
  servers.push(child);
  return new Promise((done, fail) => {
    child.stdout.on("data", (data) => done((String(data).match(/http:\S+/) || [])[0]));
    child.stderr.on("data", (data) => fail(new Error(String(data))));
  });
}
after(() => {
  servers.forEach((child) => child.kill());
  rmSync(site, { recursive: true, force: true });
});

test("two servers take two ports", async () => {
  const [a, b] = [await serve(), await serve()];
  assert.notEqual(a, b);
});

test("files, redirects and refusals", async () => {
  const base = await serve();
  const get = (path, options) => fetch(base + path, { redirect: "manual", ...options });
  const home = await get("/");
  assert.equal(home.status, 200);
  assert.equal(home.headers.get("content-type"), "text/html");
  assert.equal(home.headers.get("cache-control"), "no-store");
  const moved = await get("/prototypes?x=1");
  assert.equal(moved.status, 301);
  assert.equal(moved.headers.get("location"), "/prototypes/?x=1");
  assert.equal((await get("/nope")).status, 404);
  assert.equal((await get("/.secret/key.txt")).status, 404);
  assert.equal((await get("/%2e%2e/%2e%2e/%2e%2e/etc/passwd")).status, 404);
  assert.equal((await get("/__protopass/update", { method: "POST" })).status, 403);
  assert.equal((await get("/nope", { method: "POST" })).status, 404);
});

test("revision moves with the files a page shows, and only those", async () => {
  const base = await serve();
  const revision = async (page) => (await (await fetch(`${base}/__protopass/revision?page=${encodeURIComponent(page)}`)).json()).revision;
  const touch = (name, seconds) => utimesSync(join(site, name), seconds, seconds);
  touch("prototypes/a/screen.html", 2000000000);
  const a = await revision("/prototypes/a/");
  const b = await revision("/prototypes/b/");
  touch("prototypes/a/screen.html", 2000000100);
  assert.notEqual(await revision("/prototypes/a/"), a);
  assert.equal(await revision("/prototypes/b/"), b);
  touch("kit/minimaly/icons/regular/plus.svg", 2000000200);
  assert.equal(await revision("/prototypes/b/"), b);
});

test("a lint result is left once, from this machine only", async () => {
  const base = await serve();
  const url = `${base}/__protopass/lint/run-1`;
  const headers = { "x-protopass": "lint" };
  assert.equal((await fetch(url, { method: "POST", body: "{}" })).status, 403);
  assert.equal((await fetch(url)).status, 403);
  assert.equal((await fetch(url, { headers })).status, 404);
  assert.equal((await fetch(url, { method: "POST", headers, body: '{"errors":2}' })).status, 204);
  assert.deepEqual(await (await fetch(url, { headers })).json(), { errors: 2 });
  assert.equal((await fetch(url, { headers })).status, 404);
  // The machine's own network address is not loopback: same route, as seen from the local network.
  const address = Object.values(networkInterfaces()).flat().find((i) => i.family === "IPv4" && !i.internal)?.address;
  if (address) assert.equal((await fetch(url.replace("localhost", address), { headers })).status, 403);
});

// A tar written by hand: system tar refuses to create the unsafe paths this test needs.
function archive(path, files) {
  const blocks = files.flatMap(([name, text]) => {
    const body = Buffer.from(text);
    const head = Buffer.alloc(512);
    head.write(name, 0);
    head.write("0000644\0", 100);
    head.write("0000000\0", 108);
    head.write("0000000\0", 116);
    head.write(`${body.length.toString(8).padStart(11, "0")}\0`, 124);
    head.write("00000000000\0", 136);
    head.write("        ", 148);
    head.write("0", 156);
    head.write("ustar\x0000", 257);
    const sum = head.reduce((total, byte) => total + byte, 0);
    head.write(`${sum.toString(8).padStart(6, "0")}\0 `, 148);
    return [head, body, Buffer.alloc((512 - (body.length % 512)) % 512)];
  });
  writeFileSync(path, gzipSync(Buffer.concat([...blocks, Buffer.alloc(1024)])));
}

test("an update replaces the kit and nothing else", () => {
  const dir = mkdtempSync(join(tmpdir(), "protopass-update-"));
  write("kit/VERSION", "1.0.0", dir);
  write("kit/gone.txt", "old", dir);
  write("protopass.json", "mine", dir);
  const file = join(dir, "kit.tar.gz");
  archive(file, [["repo-sha/kit/VERSION", "2.0.0\n"], ["repo-sha/kit/new.txt", "new"], ["repo-sha/protopass.json", "theirs"]]);
  assert.equal(replaceKit(file, join(dir, "kit")), "2.0.0");
  assert.equal(readFileSync(join(dir, "kit/new.txt"), "utf8"), "new");
  assert.equal(existsSync(join(dir, "kit/gone.txt")), false);
  assert.equal(readFileSync(join(dir, "protopass.json"), "utf8"), "mine");
  assert.equal(existsSync(join(dir, "kit.old")) || existsSync(join(dir, "kit.new")), false);
  rmSync(dir, { recursive: true, force: true });
});

test("a bad archive leaves the kit in place", () => {
  const dir = mkdtempSync(join(tmpdir(), "protopass-update-"));
  write("kit/VERSION", "1.0.0", dir);
  const file = join(dir, "kit.tar.gz");
  archive(file, [["repo-sha/kit/VERSION", "2.0.0"], ["repo-sha/../../evil.txt", "x"]]);
  assert.throws(() => replaceKit(file, join(dir, "kit")), /Unsafe path/);
  archive(file, [["repo-sha/kit/other.txt", "x"]]);
  assert.throws(() => replaceKit(file, join(dir, "kit")), /no kit\/VERSION/);
  assert.equal(readFileSync(join(dir, "kit/VERSION"), "utf8"), "1.0.0");
  assert.equal(existsSync(join(dir, "kit.new")), false);
  rmSync(dir, { recursive: true, force: true });
});

test("system tar is available", () => {
  assert.match(execFileSync("tar", ["--version"], { encoding: "utf8" }), /tar/);
});
