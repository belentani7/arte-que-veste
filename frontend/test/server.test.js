const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");
const { after, before, test } = require("node:test");
const { setTimeout: delay } = require("node:timers/promises");

let child;
let port;

function reservePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      probe.close((error) => {
        if (error) reject(error);
        else resolve(address.port);
      });
    });
  });
}

function request(requestPath) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: "127.0.0.1", port, path: requestPath, method: "GET" },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          })
        );
      }
    );
    req.once("error", reject);
    req.end();
  });
}

before(async () => {
  port = await reservePort();
  child = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {
    env: { ...process.env, PORT: String(port) },
    stdio: "ignore",
  });

  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (child.exitCode !== null) throw new Error("Static server exited before listening");
    try {
      const response = await request("/");
      if (response.status === 200) return;
    } catch {
      // Wait for the child server to bind its local port.
    }
    await delay(50);
  }

  child.kill();
  throw new Error("Static server did not become ready");
});

after(() => {
  if (child && child.exitCode === null) child.kill();
});

test("serves the storefront with safe response headers", async () => {
  const response = await request("/");

  assert.equal(response.status, 200);
  assert.match(response.headers["content-type"], /^text\/html; charset=utf-8$/);
  assert.equal(response.headers["x-content-type-options"], "nosniff");
  assert.equal(response.headers["referrer-policy"], "strict-origin-when-cross-origin");
  assert.match(response.body, /<!doctype html>/i);
});

test("rejects a decoded parent-directory traversal", async () => {
  const response = await request("/%2e%2e/backend/seed.json");

  assert.equal(response.status, 403);
  assert.equal(response.body, "Forbidden");
});

test("rejects malformed percent encoding", async () => {
  const response = await request("/%E0%A4%A");

  assert.equal(response.status, 400);
  assert.equal(response.body, "Bad request");
});
