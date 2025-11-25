const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "public");
const port = process.env.PORT || 4173;

const mimeTypes = {
  ".html": "text/html",
  ".js": "application/javascript",
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
  ".ico": "image/x-icon"
};

function sendNotFound(res) {
  res.statusCode = 404;
  res.end("Not found");
}

function isPathInside(child, parent) {
  const relative = path.relative(parent, child);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

const server = http.createServer((req, res) => {
  try {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    let filePath = path.join(root, urlPath.replace(/^\/+/, ""));

    if (urlPath.endsWith("/")) {
      filePath = path.join(root, urlPath.replace(/^\/+/, ""), "index.html");
    }

    // Support implicit index.html for directory-like URLs without trailing slash.
    if (!path.extname(filePath)) {
      filePath = path.join(root, urlPath.replace(/^\/+/, ""), "index.html");
    }

    if (!isPathInside(filePath, root)) {
      res.statusCode = 403;
      res.end("Forbidden");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || "application/octet-stream";
    const cacheControl = ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable";

    fs.readFile(filePath, (err, data) => {
      if (err) {
        sendNotFound(res);
        return;
      }

      res.writeHead(200, { "Content-Type": contentType, "Cache-Control": cacheControl });
      res.end(data);
    });
  } catch (error) {
    console.error("Server error", error);
    res.statusCode = 500;
    res.end("Server error");
  }
});

server.listen(port, () => {
  console.log(`Obys library clone running at http://localhost:${port}`);
});
