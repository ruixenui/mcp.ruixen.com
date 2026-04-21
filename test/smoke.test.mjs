import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

function startServer() {
  const proc = spawn("node", ["dist/server.js"], {
    stdio: ["pipe", "pipe", "pipe"],
  });
  const pending = new Map();
  let buffer = "";

  proc.stdout.setEncoding("utf8");
  proc.stdout.on("data", (chunk) => {
    buffer += chunk;
    let idx;
    while ((idx = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        continue;
      }
      if (msg.id != null && pending.has(msg.id)) {
        pending.get(msg.id).resolve(msg);
        pending.delete(msg.id);
      }
    }
  });

  function call(id, method, params) {
    const req = { jsonrpc: "2.0", id, method, params };
    const waiter = new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          reject(new Error(`timeout waiting for response id=${id}`));
        }
      }, 20_000);
    });
    proc.stdin.write(JSON.stringify(req) + "\n");
    return waiter;
  }

  function notify(method, params) {
    proc.stdin.write(
      JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n",
    );
  }

  return { proc, call, notify };
}

test("MCP server boots and serves Ruixen UI registry data", async (t) => {
  const { proc, call, notify } = startServer();
  t.after(() => proc.kill());

  const init = await call(1, "initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "smoke", version: "0" },
  });
  assert.equal(init.result.serverInfo.name, "Ruixen UI MCP");
  assert.equal(init.result.serverInfo.version, "1.0.1");

  notify("notifications/initialized", {});

  const list = await call(2, "tools/call", {
    name: "listRegistryItems",
    arguments: { limit: 1 },
  });
  const listPayload = JSON.parse(list.result.content[0].text);
  assert.ok(
    listPayload.total > 0,
    "live ruixen.com registry should return at least one item",
  );
  assert.ok(Array.isArray(listPayload.items) && listPayload.items.length > 0);

  const firstName = listPayload.items[0].name;
  const detail = await call(3, "tools/call", {
    name: "getRegistryItem",
    arguments: { name: firstName },
  });
  const item = JSON.parse(detail.result.content[0].text);
  assert.match(
    item.install.command,
    /https:\/\/ruixen\.com\/r\//,
    "install command must point at ruixen.com",
  );
  assert.equal(item.install.registryUrl, `https://ruixen.com/r/${firstName}.json`);
});
