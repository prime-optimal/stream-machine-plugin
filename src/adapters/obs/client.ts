import { z } from "zod";

const frameSchema = z.object({ op: z.number(), d: z.unknown() });
const responseSchema = z.object({
  requestId: z.string(), requestStatus: z.object({ result: z.boolean(), code: z.number(), comment: z.string().optional() }),
  responseData: z.record(z.string(), z.unknown()).optional(),
});
export const OBS_ENDPOINT = "ws://localhost:4455";
const allowedRequests = new Set([
  "GetVersion", "GetSceneList", "GetInputList", "GetSceneItemList", "GetInputSettings",
  "CreateScene", "CreateInput", "CreateSceneItem", "SetInputSettings",
  "SetSceneItemEnabled", "SetSceneItemTransform", "SetCurrentProgramScene",
  "PressInputPropertiesButton", "GetSourceScreenshot",
  "GetSpecialInputs", "ToggleInputMute", "ToggleRecord", "ToggleStream",
]);
export async function withObs<T>(run: (request: (name: string, data?: Record<string, unknown>) => Promise<Record<string, unknown>>) => Promise<T>, endpoint = OBS_ENDPOINT): Promise<T> {
  const socket = new WebSocket(endpoint);
  const pending = new Map<string, { resolve: (value: Record<string, unknown>) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  let identified = false;
  let resolveReady: () => void = () => { };
  let rejectReady: (error: Error) => void = () => { };
  const ready = new Promise<void>((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  const fail = (error: Error) => {
    rejectReady(error);
    for (const item of pending.values()) { clearTimeout(item.timer); item.reject(error); }
    pending.clear();
  };
  const timer = setTimeout(() => { fail(new Error("OBS handshake timed out")); socket.close(); }, 5000);
  socket.onmessage = event => {
    try {
      const frame = frameSchema.parse(JSON.parse(String(event.data)));
      if (frame.op === 0) {
        const hello = z.object({ authentication: z.unknown().optional() }).parse(frame.d);
        if (hello.authentication !== undefined) throw new Error("OBS requires authentication; configure local connection through secret manager");
        socket.send(JSON.stringify({ op: 1, d: { rpcVersion: 1, eventSubscriptions: 0 } }));
      } else if (frame.op === 2) {
        identified = true; clearTimeout(timer); resolveReady();
      } else if (frame.op === 7) {
        const response = responseSchema.parse(frame.d);
        const item = pending.get(response.requestId);
        if (!item) return;
        pending.delete(response.requestId); clearTimeout(item.timer);
        if (!response.requestStatus.result) item.reject(new Error("OBS rejected request (" + response.requestStatus.code + ")"));
        else item.resolve(response.responseData ?? {});
      }
    } catch (error) { fail(error instanceof Error ? error : new Error("Invalid OBS response")); socket.close(); }
  };
  socket.onerror = () => fail(new Error("OBS unavailable at local WebSocket endpoint"));
  socket.onclose = () => fail(new Error("OBS connection closed"));
  const request = async (name: string, data: Record<string, unknown> = {}) => {
    if (!allowedRequests.has(name)) throw new Error("OBS request not allowed: " + name);
    if (!identified) throw new Error("OBS not identified");
    const requestId = crypto.randomUUID();
    return new Promise<Record<string, unknown>>((resolve, reject) => {
      const requestTimer = setTimeout(() => { pending.delete(requestId); reject(new Error("OBS request timed out; outcome unknown")); }, 5000);
      pending.set(requestId, { resolve, reject, timer: requestTimer });
      socket.send(JSON.stringify({ op: 6, d: { requestType: name, requestId, requestData: data } }));
    });
  };
  try { await ready; return await run(request); }
  finally { clearTimeout(timer); socket.close(); }
}
