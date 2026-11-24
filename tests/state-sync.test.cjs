"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = readFileSync(path.join(__dirname, "../src/home/state-sync.js"), "utf8");

for (const fails of [false, true]) {
  test(`a delayed khatmah ${fails ? "error" : "response"} is ignored after leaving it`, async () => {
    const response = Promise.withResolvers();
    const calls = [];
    const appState = { code: "ABCD", state: { title: "الختمة السابقة" }, screen: "main", viewer: null };
    const context = vm.createContext({
      appState,
      rpc(method, { p_code }) {
        assert.equal(method, "get_state");
        assert.equal(p_code, "ABCD");
        return response.promise;
      },
      mineForget: () => calls.push("mineForget"),
      activeKhatmahForget: () => calls.push("activeKhatmahForget"),
      localStorage: { removeItem: () => calls.push("removeItem") },
      render: () => calls.push("render"),
      toast: () => calls.push("toast")
    });
    vm.runInContext(source, context);

    const loading = context.refresh();
    Object.assign(appState, { code: "", state: null, screen: "home" });
    if (fails) response.reject(new Error("Network unavailable"));
    else response.resolve(null);

    assert.equal(await loading, false);
    assert.equal(appState.state, null);
    assert.equal(appState.screen, "home");
    assert.deepEqual(calls, []);
  });
}
