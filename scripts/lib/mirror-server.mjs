import http from "node:http";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".wasm": "application/wasm",
  ".manifest": "text/cache-manifest"
};

function isPathInside(child, parent) {
  const relative = path.relative(parent, child);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function resolveCspPolicy(policy) {
  if (policy === false || policy === "off" || policy === "none") {
    return null;
  }

  if (!policy || policy === "self") {
    return "default-src 'self' data: blob:; img-src 'self' data: blob:; media-src 'self' data: blob:; font-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com; style-src 'self' 'unsafe-inline'; connect-src 'self' data: blob: https://unpkg.com; frame-ancestors 'self'; object-src 'none'; base-uri 'self'; worker-src 'self' blob: data:";
  }

  if (policy === "strict") {
    return "default-src 'self'; img-src 'self' data:; media-src 'self' data:; font-src 'self' data:; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'self'; worker-src 'self'";
  }

  return policy;
}

async function pickExistingFile(candidatePaths) {
  for (const candidate of candidatePaths) {
    try {
      const stat = await fsp.stat(candidate);
      if (stat.isFile()) {
        return { path: candidate, stat };
      }
    } catch {
      // Continue
    }
  }
  return null;
}

function buildCandidatePaths(rootDir, decodedPath) {
  const normalized = decodedPath.replace(/^\/+/, "");
  const baseCandidate = path.join(rootDir, normalized);
  const candidates = [];

  if (decodedPath.endsWith("/")) {
    candidates.push(path.join(rootDir, normalized, "index.html"));
  }

  if (!path.extname(baseCandidate)) {
    candidates.push(path.join(rootDir, normalized, "index.html"));
  }

  candidates.push(baseCandidate);
  return candidates;
}

function writeNotFound(res) {
  res.statusCode = 404;
  res.end("Not found");
}

function writeForbidden(res) {
  res.statusCode = 403;
  res.end("Forbidden");
}

function writeMethodNotAllowed(res) {
  res.statusCode = 405;
  res.end("Method not allowed");
}

function normalizePathname(url) {
  try {
    const parsed = new URL(url, "http://localhost");
    return decodeURIComponent(parsed.pathname);
  } catch {
    return null;
  }
}

function buildHeaders({ ext, cacheControl, cspHeader, enableRange, size }) {
  const headers = {
    "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
    "Cache-Control": cacheControl
  };

  if (enableRange) {
    headers["Accept-Ranges"] = "bytes";
  }

  if (typeof size === "number") {
    headers["Content-Length"] = size;
  }

  if (cspHeader && ext === ".html") {
    headers["Content-Security-Policy"] = cspHeader;
  }

  return headers;
}

function parseRangeHeader(rangeHeader, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader || "");
  if (!match) {
    return null;
  }

  let start = match[1] ? parseInt(match[1], 10) : 0;
  let end = match[2] ? parseInt(match[2], 10) : size - 1;

  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) {
    return null;
  }

  end = Math.min(end, size - 1);

  return { start, end };
}

export function createMirrorServer({ rootDir, csp, enableRange = true, log = console.log }) {
  const resolvedRoot = path.resolve(rootDir);
  const cspHeader = resolveCspPolicy(csp);

  const server = http.createServer(async (req, res) => {
    const pathname = normalizePathname(req.url || "");
    if (!pathname) {
      writeNotFound(res);
      return;
    }

    if (!["GET", "HEAD"].includes(req.method || "")) {
      writeMethodNotAllowed(res);
      return;
    }

    const candidates = buildCandidatePaths(resolvedRoot, pathname);
    const insideRoot = candidates.map((candidate) => path.resolve(candidate)).filter((candidate) => isPathInside(candidate, resolvedRoot));
    if (!insideRoot.length) {
      writeForbidden(res);
      return;
    }

    const match = await pickExistingFile(insideRoot);
    if (!match) {
      writeNotFound(res);
      return;
    }

    const { path: filePath, stat } = match;
    if (stat.isDirectory()) {
      writeForbidden(res);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const effectiveExt = ext || (pathname.startsWith("/api/") ? ".json" : "");
    const cacheControl = effectiveExt === ".html" ? "no-cache" : "public, max-age=31536000, immutable";
    const headers = buildHeaders({ ext: effectiveExt, cacheControl, cspHeader, enableRange, size: stat.size });

    try {
      if (enableRange && req.headers.range) {
        const range = parseRangeHeader(req.headers.range, stat.size);
        if (!range) {
          res.writeHead(416, { "Content-Range": `bytes */${stat.size}` });
          res.end();
          return;
        }

        const { start, end } = range;
        const length = end - start + 1;
        const partialHeaders = {
          ...headers,
          "Content-Range": `bytes ${start}-${end}/${stat.size}`,
          "Content-Length": length
        };

        res.writeHead(206, partialHeaders);
        const stream = fs.createReadStream(filePath, { start, end });
        stream.pipe(res);
        stream.on("error", (error) => {
          log?.(`[mirror-serve] stream error for ${filePath}: ${error.message}`);
          res.destroy(error);
        });
        return;
      }

      res.writeHead(200, headers);
      if (req.method === "HEAD") {
        res.end();
        return;
      }

      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
      stream.on("error", (error) => {
        log?.(`[mirror-serve] stream error for ${filePath}: ${error.message}`);
        res.destroy(error);
      });
    } catch (error) {
      log?.(`[mirror-serve] server error for ${filePath}: ${error.message}`);
      res.statusCode = 500;
      res.end("Server error");
    }
  });

  return {
    server,
    root: resolvedRoot,
    csp: cspHeader,
    enableRange
  };
}

export async function startMirrorServer(options) {
  const { server, root, csp, enableRange } = createMirrorServer(options);
  const port = options.port ?? 4173;
  const host = options.host ?? "0.0.0.0";

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolve());
  });

  const address = server.address();
  const resolvedPort = typeof address === "object" && address ? address.port : port;
  options?.log?.(`[mirror-serve] root=${root} port=${resolvedPort} csp=${csp || "off"} range=${enableRange ? "on" : "off"}`);

  return { server, port: resolvedPort, host, root, csp, enableRange };
}

export { resolveCspPolicy };
