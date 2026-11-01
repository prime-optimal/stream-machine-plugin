import { parseWorkerEvent } from "../events/contracts";
import type { EventLedger } from "../events/ledger";
import type { ConnectionState, WorkerDependencies, WorkerStatus } from "./contracts";

async function bounded<T>(task: Promise<T>, milliseconds: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([task, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("TIMEOUT")), milliseconds); })]);
  } finally { clearTimeout(timer); }
}

export class WorkerRuntime {
  private abort = new AbortController();
  private actionAbort: AbortController | null = null;
  private epoch = 0;
  private arming = false;
  private task: Promise<void> | null = null;
  private state: WorkerStatus;

  constructor(private deps: WorkerDependencies, private ledger: EventLedger, fixture = false) {
    this.state = { mode: "paused", connection: "connecting", fixture, inFlight: false, ledgerSize: ledger.size, received: 0, attempted: 0, succeeded: 0, duplicates: 0, skipped: 0, error: null };
  }

  status(): WorkerStatus { return { ...this.state, ledgerSize: this.ledger.size }; }

  async start() {
    try {
      await this.deps.source.start({ onEvent: event => this.receive(event), onConnection: state => this.connection(state), signal: this.abort.signal });
    } catch { this.connection("offline"); this.state.error = "SOURCE_FAILED"; }
  }

  connection(state: ConnectionState) {
    if (this.state.mode === "stopped") return;
    this.state.connection = state;
    if (state !== "online") this.pause();
  }

  async arm() {
    if (this.state.mode === "stopped") throw new Error("WORKER_STOPPED");
    if (this.state.mode === "armed") return this.status();
    if (this.state.error === "LEDGER_FAILED") throw new Error("LEDGER_FAILED");
    if (this.arming || this.task) throw new Error("WORKER_BUSY");
    if (this.state.connection !== "online") throw new Error("SOURCE_OFFLINE");
    if (this.ledger.full) throw new Error("LEDGER_FULL");
    const epoch = this.epoch;
    this.arming = true;
    try {
      await bounded(this.deps.preflight(), 5000);
      if (this.epoch !== epoch || this.state.connection !== "online" || this.abort.signal.aborted) throw new Error("ARM_INTERRUPTED");
      this.state.mode = "armed";
      this.state.error = null;
      return this.status();
    } catch {
      this.pause();
      this.state.error = "ARM_FAILED";
      throw new Error("ARM_FAILED");
    } finally { this.arming = false; }
  }

  pause() {
    if (this.state.mode !== "stopped") this.state.mode = "paused";
    this.epoch++;
    this.actionAbort?.abort();
    return this.status();
  }

  async receive(input: unknown) {
    this.state.received++;
    let event;
    try { event = parseWorkerEvent(input); }
    catch { this.state.skipped++; return; }
    if (this.state.mode !== "armed" || this.state.connection !== "online" || this.task) { this.state.skipped++; return; }
    const epoch = this.epoch;
    this.state.inFlight = true;
    this.task = this.dispatch(event.id, event.text, epoch);
    try { await this.task; }
    finally { this.task = null; this.state.inFlight = false; }
  }

  private async dispatch(id: string, text: string, epoch: number) {
    try {
      if (await this.ledger.reserve(id) === "duplicate") { this.state.duplicates++; return; }
      if (epoch !== this.epoch || this.state.mode !== "armed" || this.state.connection !== "online") { this.state.skipped++; return; }
      this.actionAbort = new AbortController();
      this.state.attempted++;
      try {
        await this.deps.showAlert({ text, signal: this.actionAbort.signal });
        this.state.succeeded++;
      } catch { this.pause(); this.state.error = "ALERT_FAILED"; }
      finally { this.actionAbort = null; }
    } catch { this.pause(); this.state.error = "LEDGER_FAILED"; }
  }

  async stop() {
    if (this.state.mode === "stopped") return this.status();
    this.pause();
    this.state.mode = "stopped";
    this.state.connection = "offline";
    this.abort.abort();
    if (this.task) await bounded(this.task, 5000).catch(() => { this.state.error = "STOP_TIMEOUT"; });
    return this.status();
  }
}
