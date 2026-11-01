import type { WorkerEvent } from "../events/contracts";

export type ConnectionState = "connecting" | "online" | "reconnecting" | "offline" | "revoked";
export interface WorkerDependencies {
  source: {
    start(options: {
      onEvent: (event: WorkerEvent) => Promise<void>;
      onConnection: (state: ConnectionState) => void;
      signal: AbortSignal;
    }): void | Promise<void>;
  };
  preflight: () => Promise<unknown>;
  showAlert: (input: { text: string; replay?: boolean; signal?: AbortSignal }) => Promise<unknown>;
}
export type WorkerFactory = () => WorkerDependencies | Promise<WorkerDependencies>;
export type WorkerStatus = {
  mode: "paused" | "armed" | "stopped";
  connection: ConnectionState;
  fixture: boolean;
  inFlight: boolean;
  ledgerSize: number;
  received: number;
  attempted: number;
  succeeded: number;
  duplicates: number;
  skipped: number;
  error: string | null;
};
