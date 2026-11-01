import { describe, expect, test } from "bun:test";
import { DemoWorkspace, toolResult } from "../src/domain";

const input = { recipeId: "prepare-channel", title: "Friday ranked sets", categoryId: "demo-street-fighter" };
describe("mock recipe boundary", () => {
  test("preview requires explicit demo connection", () => {
    const workspace = new DemoWorkspace();
    expect(toolResult(workspace, "stream_machine_preview", input)).toMatchObject({ isError: true, structuredContent: { error: { code: "DEMO_CONNECTION_REQUIRED" } } });
    workspace.invoke("stream_machine_connect_demo", {});
    const result = workspace.invoke("stream_machine_preview", input);
    expect(result.preview).toMatchObject({ mode: "mock", executable: false, account: { id: "demo-streamer" }, after: { title: input.title, categoryId: input.categoryId } });
    expect(result.preview?.before.title).toBe("Welcome to the demo stream");
    expect(workspace.snapshot().preview).toBeNull();
  });
  test("reset and separate process contexts do not retain connected state", () => {
    const first = new DemoWorkspace();
    first.invoke("stream_machine_connect_demo", {});
    expect(new DemoWorkspace().snapshot().connection.status).toBe("disconnected");
    first.invoke("stream_machine_reset", {});
    expect(() => first.invoke("stream_machine_preview", input)).toThrow("demo Twitch account");
  });
  test("future providers cannot silently execute", () => {
    const workspace = new DemoWorkspace();
    workspace.invoke("stream_machine_connect_demo", {});
    expect(toolResult(workspace, "stream_machine_preview", { ...input, recipeId: "clip-kit" })).toMatchObject({ isError: true, structuredContent: { error: { code: "CAPABILITY_UNAVAILABLE" } } });
    expect(toolResult(workspace, "stream_machine_apply", input)).toMatchObject({ isError: true });
  });
  test("unknown IDs and injected owner/live selectors rejected", () => {
    const workspace = new DemoWorkspace();
    workspace.invoke("stream_machine_connect_demo", {});
    for (const args of [{ ...input, categoryId: "live-category" }, { ...input, recipeId: "unknown" }, { ...input, ownerId: "other-user" }, { ...input, mode: "live" }, { ...input, title: " " }, { ...input, title: "x".repeat(141) }]) {
      expect(toolResult(workspace, "stream_machine_preview", args)).toMatchObject({ isError: true });
    }
  });
  test("returned snapshots cannot mutate catalog or account state", () => {
    const workspace = new DemoWorkspace();
    const snapshot = workspace.snapshot();
    snapshot.recipes[0].available = false;
    expect(workspace.snapshot().recipes[0].available).toBe(true);
  });
});
