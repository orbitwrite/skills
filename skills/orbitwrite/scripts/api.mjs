#!/usr/bin/env node
// Orbitwrite HTTP API caller, for agents that have no MCP client.
//
//   node api.mjs <METHOD> <path> [--query k=v]... [--body '<json>' | --body-file <file>]
//   node api.mjs upload <file> [--name <display name>]
//
// Options:
//   --api-key <key>     Otherwise ORBITWRITE_API_KEY, then ~/.orbitwrite/credentials
//   --base-url <url>    Default https://orbitwrite.com (or ORBITWRITE_BASE_URL)
//   --compact           Print compact JSON instead of pretty
//
// Paths may be given with or without the /api/v1 prefix. A workspace key already
// names its workspace, so `organizationId` is not needed.
//
// `upload` runs the three-step media flow (create-upload-url, PUT the bytes,
// confirm) and prints the media record. Pass the returned `id` in a post
// item's `mediaIds`.
//
// Exit code 0 on a 2xx, 1 otherwise. The failing status and body go to stderr.
// The key is never printed.

import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const MIME_BY_EXT = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".pdf": "application/pdf",
};

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const positional = [];
  const opts = { query: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    const name = arg.slice(2);
    if (name === "compact") {
      opts.compact = true;
      continue;
    }
    const value = argv[++i];
    if (value === undefined) fail(`Missing value for --${name}`);
    if (name === "query") opts.query.push(value);
    else opts[name.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
  }
  return { positional, opts };
}

async function resolveApiKey(opts) {
  if (opts.apiKey) return opts.apiKey;
  if (process.env.ORBITWRITE_API_KEY) return process.env.ORBITWRITE_API_KEY;
  try {
    const file = await readFile(path.join(homedir(), ".orbitwrite", "credentials"), "utf8");
    for (const line of file.split(/\r?\n/)) {
      const match = /^\s*(?:export\s+)?ORBITWRITE_API_KEY\s*=\s*(.+?)\s*$/.exec(line);
      if (match) return match[1].replace(/^["']|["']$/g, "");
    }
  } catch {
    // no credentials file
  }
  fail(
    "No API key. Pass --api-key, set ORBITWRITE_API_KEY, or put ORBITWRITE_API_KEY=orbit_sk_... in ~/.orbitwrite/credentials",
  );
}

function baseUrl(opts) {
  const raw = opts.baseUrl ?? process.env.ORBITWRITE_BASE_URL ?? "https://orbitwrite.com";
  return raw.replace(/\/$/, "");
}

function apiUrl(opts, route, query) {
  let p = route.startsWith("/") ? route : `/${route}`;
  if (!p.startsWith("/api/v1")) p = `/api/v1${p}`;
  const url = new URL(baseUrl(opts) + p);
  for (const pair of query) {
    const eq = pair.indexOf("=");
    if (eq === -1) fail(`--query expects k=v, got ${pair}`);
    url.searchParams.append(pair.slice(0, eq), pair.slice(eq + 1));
  }
  return url;
}

async function readBody(opts) {
  if (opts.body !== undefined && opts.bodyFile !== undefined) fail("Use --body or --body-file, not both");
  const raw = opts.bodyFile !== undefined ? await readFile(opts.bodyFile, "utf8") : opts.body;
  if (raw === undefined) return undefined;
  try {
    return JSON.parse(raw);
  } catch (err) {
    fail(`Body is not valid JSON: ${err.message}`);
  }
}

async function call(opts, apiKey, method, route, { query = [], body } = {}) {
  const url = apiUrl(opts, route, query);
  const headers = { accept: "application/json", authorization: `Bearer ${apiKey}` };
  const init = { method, headers };
  if (body !== undefined) {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  const res = await fetch(url, init);
  const text = await res.text();
  let payload = text;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    // not JSON; keep the text
  }
  return { res, payload };
}

function print(opts, payload) {
  if (payload === null || payload === undefined) return;
  if (typeof payload === "string") {
    console.log(payload);
    return;
  }
  console.log(JSON.stringify(payload, null, opts.compact ? 0 : 2));
}

function report(res, payload) {
  const rendered = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  fail(`HTTP ${res.status} ${res.statusText}\n${rendered ?? ""}`);
}

async function upload(opts, apiKey, file) {
  const bytes = await readFile(file);
  const name = opts.name ?? path.basename(file);
  const mime = opts.mime ?? MIME_BY_EXT[path.extname(file).toLowerCase()];
  if (!mime) fail(`Cannot infer a MIME type for ${file}; pass --mime`);

  const created = await call(opts, apiKey, "POST", "/media/create-upload-url", {
    body: { name, mime_type: mime, size_bytes: bytes.byteLength },
  });
  if (!created.res.ok) report(created.res, created.payload);
  const { media_id: mediaId, upload_url: uploadUrl } = created.payload;

  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "content-type": mime, "content-length": String(bytes.byteLength) },
    body: bytes,
  });
  if (!put.ok) fail(`Storage PUT failed: HTTP ${put.status} ${put.statusText}`);

  const confirmed = await call(opts, apiKey, "POST", "/media/confirm", {
    body: { media_ids: [mediaId] },
  });
  if (!confirmed.res.ok) report(confirmed.res, confirmed.payload);
  print(opts, confirmed.payload);
}

async function main() {
  const { positional, opts } = parseArgs(process.argv.slice(2));
  const [command, target] = positional;
  if (!command) {
    fail(
      "Usage: node api.mjs <METHOD> <path> [--query k=v] [--body json | --body-file f]\n       node api.mjs upload <file> [--name n] [--mime type]",
    );
  }
  const apiKey = await resolveApiKey(opts);

  if (command === "upload") {
    if (!target) fail("upload needs a file path");
    await upload(opts, apiKey, target);
    return;
  }

  const method = command.toUpperCase();
  if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) fail(`Unknown method ${command}`);
  if (!target) fail("Missing path");
  const body = await readBody(opts);
  const { res, payload } = await call(opts, apiKey, method, target, { query: opts.query, body });
  if (!res.ok) report(res, payload);
  print(opts, payload);
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
