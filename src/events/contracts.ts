import { z } from "zod";

export const workerEventSchema = z.strictObject({
  id: z.string().min(1).max(256),
  type: z.string().min(1).max(128),
  occurredAt: z.iso.datetime(),
  text: z.string().min(1).max(512),
});
export type WorkerEvent = z.infer<typeof workerEventSchema>;

export function parseWorkerEvent(input: unknown, now = Date.now()): WorkerEvent {
  const event = workerEventSchema.parse(input);
  const age = now - Date.parse(event.occurredAt);
  if (age > 300_000 || age < -30_000) throw new Error("EVENT_STALE");
  return event;
}
