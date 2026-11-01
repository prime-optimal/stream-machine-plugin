import { describe, expect, test } from "bun:test";
import { renderAlert, obsAlertSchema } from "../src/adapters/obs/artifact";
import { alertTemplate } from "../src/adapters/obs/template";
import { withObs } from "../src/adapters/obs/client";

describe("OBS alert boundary", () => {
  test("keeps untrusted text inside JSON, never executable HTML", () => {
    const payload = '</script><img src=x onerror=alert(1)>';
    const html = renderAlert(payload);
    expect(html).not.toContain(payload);
    expect(html).toContain("\\u003c/script>");
    expect(html.match(/<script[ >]/g)?.length).toBe((alertTemplate.match(/<script[ >]/g)?.length ?? 0) + 1);
    expect(html).toContain("name.textContent=value");
  });
  test("retains accepted finite lifecycle and reduced-motion implementation", () => {
    expect(alertTemplate).toContain('"duration":4');
    expect(alertTemplate).toContain("time<config.duration");
    expect(alertTemplate).toContain("prefers-reduced-motion: reduce");
    expect(alertTemplate).toContain("queue.length>=20");
    expect(alertTemplate).toContain("replay:()");
    expect(alertTemplate).not.toMatch(/https?:\/\//);
  });
  test("validates text codepoints and replay variant before OBS access", () => {
    expect(() => renderAlert(" ")).toThrow();
    expect(() => renderAlert("👻".repeat(65))).toThrow();
    expect(renderAlert("👻".repeat(64))).toContain("StreamAlert.play");
    expect(obsAlertSchema.parse({ action: "replay" })).toEqual({ action: "replay" });
    expect(() => obsAlertSchema.parse({ action: "play" })).toThrow();
  });
});

function fixture(mode: "ok" | "auth" | "reject" | "invalid") {
  const requests: string[] = [];
  const server = Bun.serve({
    port: 0,
    fetch(request, server) { if (server.upgrade(request)) return; return new Response("WebSocket only", { status: 400 }); },
    websocket: {
      open(socket) { socket.send(mode === "invalid" ? "invalid-json" : JSON.stringify({ op: 0, d: mode === "auth" ? { authentication: { challenge: "x" } } : {} })); },
      message(socket, raw) {
        const frame = JSON.parse(String(raw));
        if (frame.op === 1) socket.send(JSON.stringify({ op: 2, d: { negotiatedRpcVersion: 1 } }));
        if (frame.op === 6) {
          requests.push(frame.d.requestType);
          socket.send(JSON.stringify({ op: 7, d: {
            requestId: frame.d.requestId, requestStatus: { result: mode !== "reject", code: mode === "reject" ? 600 : 100 },
            responseData: { obsVersion: "fixture" },
          } }));
        }
      },
    },
  });
  return { server, requests, endpoint: "ws://127.0.0.1:" + server.port };
}
describe("OBS WebSocket missing-CLI operation boundary", () => {
  test("real socket identifies, correlates response and rejects forbidden broadcast operation", async () => {
    const f = fixture("ok");
    try {
      const response = await withObs(async request => {
        await expect(request("StartStream")).rejects.toThrow("not allowed");
        return request("GetVersion");
      }, f.endpoint);
      expect(response).toEqual({ obsVersion: "fixture" });
      expect(f.requests).toEqual(["GetVersion"]);
    } finally { await f.server.stop(true); }
  });
  for (const mode of ["auth", "reject", "invalid"] as const) {
    test("reports " + mode + " instead of success", async () => {
      const f = fixture(mode);
      try { await expect(withObs(request => request("GetVersion"), f.endpoint)).rejects.toThrow(); }
      finally { await f.server.stop(true); }
    });
  }
});
