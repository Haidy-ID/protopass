// Local server: node kit/serve.mjs [port], then the address it prints.
// Static files with Cache-Control: no-store so an edited file shows on a plain reload, GET /__protopass/revision for the
// live reload of the pages, POST /__protopass/update, which installs the latest kit release (the update button), and
// /__protopass/lint/<run>, where lint.html leaves its result for render-check.mjs.
// Without a port it takes the first free one from 8000: several workshops can run at once.
import { createServer } from "node:http";
import { createReadStream, existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const KIT = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(KIT, "..");
// Thousands of vendored files that never change: not worth a stat on every live reload poll.
const ICONS = join(KIT, "minimaly", "icons");
const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);
const MAX_LINT_BYTES = 1 << 24;
const lintResults = new Map();
const TYPES = {
  ".css": "text/css", ".gif": "image/gif", ".glb": "model/gltf-binary", ".html": "text/html", ".ico": "image/vnd.microsoft.icon",
  ".jpeg": "image/jpeg", ".jpg": "image/jpeg", ".js": "text/javascript", ".json": "application/json", ".md": "text/markdown",
  ".mjs": "text/javascript", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".pdf": "application/pdf", ".png": "image/png",
  ".svg": "image/svg+xml", ".ttf": "font/ttf", ".txt": "text/plain", ".wasm": "application/wasm", ".webm": "video/webm",
  ".webp": "image/webp", ".woff": "font/woff", ".woff2": "font/woff2", ".yml": "application/yaml",
};

const inside = (parent, path) => path === parent || path.startsWith(parent + sep);
const readJson = (path) => {
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return {}; }
};

// What a page shows, so a save elsewhere in the site does not reload it: a topic, a group, the home page.
// Any other page, or a path outside the site, watches the whole site.
function scope(page) {
  const config = join(ROOT, "protopass.json");
  const kit = [KIT, config];
  const target = resolve(ROOT, page.replace(/^\/+|\/+$/g, ""));
  if (!inside(ROOT, target)) return [ROOT];
  const parts = relative(ROOT, target).split(sep).filter(Boolean);
  if (parts.length === 2 && existsSync(join(target, "topic.json"))) {
    const ds = readJson(join(target, "topic.json")).ds;
    const dsPath = readJson(config).designSystems?.[ds];
    return [target, ...kit, ...(dsPath ? [join(ROOT, dsPath)] : [])];
  }
  if (parts.length === 1 && existsSync(join(target, "topics.json"))) return [target, ...kit];
  if (!parts.length) {
    const groups = readdirSync(ROOT).map((name) => join(ROOT, name, "topics.json")).filter(existsSync);
    return [join(ROOT, "index.html"), ...kit, ...groups];
  }
  return [ROOT];
}

// Newest modification time among the given files and folders. Hidden folders (.git) are skipped.
function revision(paths) {
  let latest = 0;
  const walk = (path) => {
    let info;
    try { info = statSync(path); } catch { return; }
    if (!info.isDirectory()) {
      latest = Math.max(latest, info.mtimeMs);
      return;
    }
    if (path === ICONS) return;
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      if (entry.isDirectory() && (entry.name.startsWith(".") || entry.name === "node_modules")) continue;
      walk(join(path, entry.name));
    }
  };
  paths.forEach(walk);
  return latest;
}

function sendJson(res, body, status) {
  const data = Buffer.from(JSON.stringify(body));
  res.writeHead(status, { "Content-Type": "application/json", "Content-Length": data.length, "Cache-Control": "no-store" });
  res.end(data);
}

function sendStatus(res, status) {
  res.writeHead(status, { "Content-Length": 0, "Cache-Control": "no-store" });
  res.end();
}

// Only this machine, and only the page itself: the custom header makes a request from another site fail its CORS preflight.
const allowed = (req, action) => LOOPBACK.has(req.socket.remoteAddress) && req.headers["x-protopass"] === action;

async function update(req, res) {
  if (!allowed(req, "update")) return sendStatus(res, 403);
  try {
    // Loaded from disk at each call: the updater is part of the kit and changes with it.
    const updater = await import(`${pathToFileURL(join(KIT, "update.mjs")).href}?at=${Date.now()}`);
    sendJson(res, { version: await updater.install() }, 200);
  } catch (e) {
    sendJson(res, { error: e.message }, 500);
  }
}

// The page posts its result, render-check.mjs reads it once.
function lint(req, res, run) {
  if (!allowed(req, "lint")) return sendStatus(res, 403);
  if (req.method === "GET") {
    if (!lintResults.has(run)) return sendStatus(res, 404);
    const body = lintResults.get(run);
    lintResults.delete(run);
    res.writeHead(200, { "Content-Type": "application/json", "Content-Length": body.length, "Cache-Control": "no-store" });
    return res.end(body);
  }
  const chunks = [];
  let size = 0;
  req.on("data", (chunk) => {
    size += chunk.length;
    if (size > MAX_LINT_BYTES) return req.destroy();
    chunks.push(chunk);
  });
  req.on("end", () => {
    lintResults.set(run, Buffer.concat(chunks));
    sendStatus(res, 204);
  });
}

function sendFile(req, res, url) {
  let path;
  try { path = resolve(ROOT, `.${decodeURIComponent(url.pathname)}`); } catch { return sendStatus(res, 404); }
  // Hidden folders stay private: the server also answers on the local network.
  if (!inside(ROOT, path) || relative(ROOT, path).split(sep).some((part) => part.startsWith("."))) return sendStatus(res, 404);
  let info;
  try { info = statSync(path); } catch { return sendStatus(res, 404); }
  if (info.isDirectory()) {
    if (!url.pathname.endsWith("/")) {
      res.writeHead(301, { Location: `${url.pathname}/${url.search}`, "Content-Length": 0, "Cache-Control": "no-store" });
      return res.end();
    }
    path = join(path, "index.html");
    try { info = statSync(path); } catch { return sendStatus(res, 404); }
  }
  res.writeHead(200, {
    "Content-Type": TYPES[extname(path).toLowerCase()] || "application/octet-stream",
    "Content-Length": info.size,
    "Cache-Control": "no-store",
  });
  if (req.method === "HEAD") return res.end();
  createReadStream(path).on("error", () => res.destroy()).pipe(res);
}

const server = createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const run = url.pathname.match(/^\/__protopass\/lint\/([\w-]+)$/)?.[1];
  if (run && (req.method === "GET" || req.method === "POST")) return lint(req, res, run);
  if (req.method === "POST") return url.pathname === "/__protopass/update" ? update(req, res) : sendStatus(res, 404);
  if (req.method !== "GET" && req.method !== "HEAD") return sendStatus(res, 405);
  // Live reload: the pages poll the latest change time of the files they show and reload when it moves.
  if (url.pathname === "/__protopass/revision") return sendJson(res, { revision: revision(scope(url.searchParams.get("page") ?? "")) }, 200);
  sendFile(req, res, url);
});

const asked = Number(process.argv[2]);
let port = asked || 8000;
server.on("error", (e) => {
  if (e.code !== "EADDRINUSE" || asked) throw e;
  port += 1;
  server.listen(port, "::");
});
server.on("listening", () => console.log(`Serving on http://localhost:${port}`));
// :: also accepts IPv4: browsers try localhost as ::1 first, and an IPv4-only server makes every connection wait.
server.listen(port, "::");
