import { describe, expect, test } from "bun:test";
import { connectionUrl, createConnectionState, hostedConnectUrl, localConnectUrl } from "../src/ui/connections";
import { requiredTwitchScopes, twitchConsentDisclosure, twitchPermissions } from "../src/auth/permissions";
import type { ToolResult } from "../src/ui/tool-transport";

function status(id = "owner", scopes = requiredTwitchScopes): ToolResult {
  return { structuredContent: { twitch: { mode: "live", account: { id, login: id, displayName: "Synthetic owner", scopes } } } };
}
function link(): ToolResult {
  return {
    structuredContent: {
      twitch: {
        mode: "live", connectUrl: "http://localhost:4017/connect",
        requestedScopes: requiredTwitchScopes, retainedScopes: [], disclosure: "Synthetic consent response"
      }
    }
  };
}
function deferred() {
  let resolve: (value: ToolResult) => void = () => { throw new Error("Uninitialized deferred"); };
  const promise = new Promise<ToolResult>(done => { resolve = done; });
  return { promise, resolve };
}

describe("Twitch Connections", () => {
  test("construction performs no requests; URL creation is never verification", async () => {
    const calls: string[] = []; let invalidated = 0;
    const model = createConnectionState(async name => { calls.push(name); return link(); }, () => { }, () => invalidated++);
    expect(calls).toEqual([]);
    await model.startConnect();
    expect(calls).toEqual(["stream_machine_twitch_connect"]);
    expect(model.state().connect.kind).toBe("link");
    expect(model.state().check.kind).toBe("not_checked");
    expect(invalidated).toBe(1);
  });
  test("explicit status authenticates account but preserves missing grants", async () => {
    const model = createConnectionState(async () => status("owner", ["channel:manage:broadcast"]), () => { }, () => { });
    await model.recheck();
    const { check } = model.state();
    expect(check.kind).toBe("verified");
    if (check.kind !== "verified") throw Error("Expected account verification");
    expect(twitchPermissions(check.value.account.scopes).missingScopes).toHaveLength(11);
    expect(requiredTwitchScopes).toHaveLength(12);
  });
  test("newer checks win; reconnect suppresses older status responses", async () => {
    const first = deferred(), second = deferred(); let reads = 0;
    const model = createConnectionState(name => name.endsWith("connect") ? Promise.resolve(link()) :
      (++reads === 1 ? first.promise : second.promise), () => { }, () => { });
    const older = model.recheck(), newer = model.recheck();
    second.resolve(status("newer")); await newer;
    first.resolve(status("older")); await older;
    const checked = model.state().check;
    expect(checked.kind === "verified" && checked.value.account.id).toBe("newer");
    const old = deferred();
    const reconnect = createConnectionState(name => name.endsWith("connect") ? Promise.resolve(link()) : old.promise, () => { }, () => { });
    const pending = reconnect.recheck(); await reconnect.startConnect(); old.resolve(status()); await pending;
    expect(reconnect.state().check.kind).toBe("not_checked");
    expect(reconnect.state().connect.kind).toBe("link");
  });
  test("failed refresh retains stale data; malformed, mock and tool errors never verify", async () => {
    let valid = true;
    const model = createConnectionState(async () => valid ? status() : { isError: true }, () => { }, () => { });
    await model.recheck(); valid = false; await model.recheck();
    const failed = model.state().check;
    expect(failed.kind === "failed" && failed.previous?.account.id).toBe("owner");
    for (const result of [{ structuredContent: { mode: "mock" } }, { structuredContent: { twitch: { mode: "live", account: { id: 3 } } } },
    { isError: true, ...status() }, { structuredContent: { error: { code: "TWITCH_CONNECTION_REQUIRED" } } }]) {
      const invalid = createConnectionState(async () => result, () => { }, () => { });
      await invalid.recheck(); expect(invalid.state().check.kind).toBe("failed");
    }
  });
  test("account change invalidates title preview; disposal suppresses completion", async () => {
    let id = "first", invalidated = 0, changed = 0;
    const model = createConnectionState(async () => status(id), () => changed++, () => invalidated++);
    await model.recheck(); id = "second"; await model.recheck(); expect(invalidated).toBe(1);
    const pending = deferred();
    const closed = createConnectionState(() => pending.promise, () => changed++, () => { });
    const read = closed.recheck(); closed.dispose(); const count = changed;
    pending.resolve(status()); await read; expect(changed).toBe(count);
    expect(closed.state().check.kind).toBe("checking");
  });
  test("connect rejects incomplete scopes, unsafe URLs and duplicate starts", async () => {
    const pending = deferred(); let calls = 0;
    const model = createConnectionState(() => { calls++; return pending.promise; }, () => { }, () => { });
    const first = model.startConnect(); await model.startConnect(); await model.recheck();
    expect(calls).toBe(1); pending.resolve({
      structuredContent: {
        twitch: {
          mode: "live", connectUrl: "http://localhost:4017/connect",
          requestedScopes: [], retainedScopes: [], disclosure: "Synthetic"
        }
      }
    }); await first;
    expect(model.state().connect.kind).toBe("failed");
    for (const url of ["javascript:alert(1)", "https://example.com/connect", "http://localhost:4017/approve",
      "http://owner:secret@localhost:4017/connect", "http://localhost:4017/connect?next=other", "http://localhost:4017/connect#token"])
      expect(() => connectionUrl(url, localConnectUrl)).toThrow();
  });
  test("connectionUrl accepts only the exact allowed origin and path, plus the hosted owner", () => {
    const site = "https://stream-machine-oauth-test.tinycocoa22.chatgpt.site";
    const connect = hostedConnectUrl(site);
    expect(connectionUrl(localConnectUrl, localConnectUrl)).toBe(localConnectUrl);
    expect(connectionUrl(`${connect}?owner=user-a%2Fb`, connect, true)).toBe(`${connect}?owner=user-a%2Fb`);
    expect(() => connectionUrl(`${connect}?owner=alice`, connect)).toThrow();
    expect(() => connectionUrl(localConnectUrl, connect, true)).toThrow();
    for (const url of [`${site}/`, `${site}/other?owner=alice`, `${connect}?owner=`, `${connect}?owner=alice&next=x`, `${connect}?next=x`,
    `${connect}?owner=alice#token`, "https://owner:secret@stream-machine-oauth-test.tinycocoa22.chatgpt.site/connect?owner=alice",
      "https://evil.example/connect?owner=alice", `${site}.evil.example/connect?owner=alice`, "javascript:alert(1)"])
      expect(() => connectionUrl(url, connect, true)).toThrow();
  });
  test("hosted connect skips preflight and never asks for a browser", async () => {
    const site = "https://stream-machine-oauth-test.tinycocoa22.chatgpt.site";
    const calls: { name: string; args?: Record<string, unknown> }[] = [];
    const hostedLink = (url: string): ToolResult => ({
      structuredContent: {
        twitch: {
          mode: "live", connectionUrl: url, authorizationUrl: url,
          browserRequested: false, disclosure: "Synthetic consent response", ...twitchPermissions([])
        }
      }
    });
    const link = `${site}/connect?owner=alice`;
    const model = createConnectionState(async (name, args) => { calls.push({ name, args }); return hostedLink(link); }, () => { }, () => { }, () => ({ runtime: "hosted", siteOrigin: site }));
    await model.startConnect();
    expect(calls).toEqual([{ name: "stream_machine_twitch_connect", args: undefined }]);
    expect(model.state().connect).toMatchObject({ kind: "link", url: link, browserRequested: false });
    const hostile = createConnectionState(async () => hostedLink("https://evil.example/"), () => { }, () => { }, () => ({ runtime: "hosted", siteOrigin: site }));
    await hostile.startConnect();
    expect(hostile.state().connect.kind).toBe("failed");
  });
  test("busy port and browser failures stay actionable without automatic retries", async () => {
    for (const [code, message] of [["TWITCH_LOCAL_PORT_BUSY", "port 4017 is in use"], ["TWITCH_LOCAL_PORT_PLUGIN", "Another Stream Machine chat"], ["TWITCH_BROWSER_OPEN_FAILED", "browser could not be opened"]]) {
      let attempts = 0;
      const model = createConnectionState(async name => { if (name.endsWith("preflight") && code === "TWITCH_BROWSER_OPEN_FAILED") return { structuredContent: { twitch: { mode: "live", status: "ready" } } }; attempts++; return { isError: true, structuredContent: { error: { code } } }; }, () => { }, () => { });
      await model.startConnect(true);
      const state = model.state();
      expect(state.connect.kind === "failed" && state.connect.message).toContain(message);
      expect(state.connect.kind === "failed" && state.connect.replaceable).toBe(code === "TWITCH_LOCAL_PORT_PLUGIN");
      expect(state.check.kind).toBe("not_checked");
      expect(attempts).toBe(1);
    }
  });
  test("replacing another Stream Machine chat is a separate explicit request", async () => {
    const calls: { name: string; args: unknown }[] = [];
    const model = createConnectionState(async (name, args) => {
      calls.push({ name, args });
      if (calls.length === 1) return { isError: true, structuredContent: { error: { code: "TWITCH_LOCAL_PORT_PLUGIN" } } };
      return {
        structuredContent: {
          twitch: {
            mode: "live", connectUrl: "http://localhost:4017/connect", requestedScopes: requiredTwitchScopes,
            retainedScopes: [], disclosure: twitchConsentDisclosure, browserRequested: true
          }
        }
      };
    }, () => { }, () => { });
    await model.startConnect(true);
    expect(calls).toEqual([{ name: "stream_machine_twitch_preflight", args: undefined }]);
    await model.startConnect(true, true);
    expect(calls.slice(1)).toEqual([{ name: "stream_machine_twitch_connect", args: { openBrowser: true, replacePluginListener: true } }]);
    expect(model.state().connect.kind).toBe("link");
  });
});
