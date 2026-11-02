import { expect, test } from "bun:test";
import { createClipAccountStatus } from "../src/ui/clips-account";
import type { ToolResult } from "../src/ui/tool-transport";

function deferred() {
  let finish: (result: ToolResult) => void = () => {};
  const promise = new Promise<ToolResult>(resolve => { finish = resolve; });
  return { promise, finish };
}
const account = (id: string): ToolResult => ({ structuredContent: { twitch: { account: { id } } } });

test("older account status cannot reset gallery after a newer status", async () => {
  const applied: (string | null)[] = [];
  const status = createClipAccountStatus(id => applied.push(id));
  const old = deferred(); const current = deferred();
  const a = status.read(() => old.promise); const b = status.read(() => current.promise);
  current.finish(account("B")); await b;
  old.finish(account("A")); await a;
  expect(applied).toEqual(["B"]);
  expect(status.accountId()).toBe("B");
});

test("connection or runtime invalidation ignores pending status and accepts a fresh read", async () => {
  const applied: (string | null)[] = [];
  const status = createClipAccountStatus(id => applied.push(id));
  const old = deferred(); const read = status.read(() => old.promise);
  status.invalidate(); old.finish(account("A")); await read;
  expect(applied).toEqual([]);
  expect(status.accountId()).toBeNull();
  await status.read(async () => account("B"));
  expect(applied).toEqual(["B"]);
});

test("a stale failed status cannot clear verified identity", async () => {
  const applied: (string | null)[] = [];
  const status = createClipAccountStatus(id => applied.push(id));
  const old = deferred(); const read = status.read(() => old.promise);
  await status.read(async () => account("B"));
  old.finish({ isError: true }); await read;
  expect(applied).toEqual(["B"]);
  await status.read(async () => ({ isError: true }));
  expect(applied).toEqual(["B", null]);
});
