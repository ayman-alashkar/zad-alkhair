"use strict";
// A local read-only static preview with Cloudflare's /reader clean URL alias.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 4173);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".mp4": "video/mp4", ".xml": "application/xml" };
http.createServer((req, res) => {
  if (!["GET", "HEAD"].includes(req.method)) { res.writeHead(405); res.end(); return; }
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname); }
  catch { res.writeHead(400); res.end(); return; }
  const relative = pathname.replace(/^\/+/, "");
  if (relative.split("/").some(part => part.startsWith("."))) { res.writeHead(404); res.end(); return; }
  let file = path.resolve(root, relative || "index.html");
  if (!file.startsWith(root + path.sep)) { res.writeHead(404); res.end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  else if (!path.extname(file) && fs.existsSync(file + ".html")) file += ".html";
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  const size = fs.statSync(file).size;
  const headers = { "Content-Type": types[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store", "Accept-Ranges": "bytes" };
  let start = 0, end = size - 1, status = 200;
  if (req.headers.range) {
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    if (range && (range[1] || range[2])) {
      start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
      end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    } else start = size;
    if (start > end || start >= size) { res.writeHead(416, { "Content-Range": `bytes */${size}` }); res.end(); return; }
    status = 206;
    headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
  }
  headers["Content-Length"] = end - start + 1;
  res.writeHead(status, headers);
  if (req.method === "HEAD") res.end();
  else fs.createReadStream(file, { start, end }).pipe(res);
}).listen(port, process.env.HOST || "0.0.0.0", () => console.log(`Zad Al-Khair preview: http://127.0.0.1:${port}`));
