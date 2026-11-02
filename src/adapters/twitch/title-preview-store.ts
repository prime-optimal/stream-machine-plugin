import { TwitchFault } from "../../auth/twitch";
import type { TwitchChannel } from "./client";

export type TitlePreview = { id: string; before: TwitchChannel; title: string; expiresAt: number; approved: boolean; consumed: boolean };

export interface TitlePreviewStore {
  create(preview: TitlePreview, now: number): Promise<void>;
  get(id: string): Promise<TitlePreview | undefined>;
  approve(id: string, now: number): Promise<boolean>;
  consume(id: string, now: number): Promise<boolean>;
  clear(): Promise<void>;
  acquire(lease: string, now: number): Promise<boolean>;
  release(lease: string): Promise<void>;
}

export class MemoryTitlePreviewStore implements TitlePreviewStore {
  private previews = new Map<string, TitlePreview>();
  private execution: { lease: string; until: number } | undefined;
  async create(preview: TitlePreview, now: number) {
    for (const [id, entry] of this.previews) if (entry.expiresAt <= now) this.previews.delete(id);
    if (this.previews.size >= 100) throw new TwitchFault("PREVIEW_LIMIT");
    this.previews.set(preview.id, structuredClone(preview));
  }
  async get(id: string) {
    const preview = this.previews.get(id);
    return preview && structuredClone(preview);
  }
  async approve(id: string, now: number) {
    const preview = this.previews.get(id);
    if (!preview || preview.consumed || preview.expiresAt <= now) return false;
    preview.approved = true;
    return true;
  }
  async consume(id: string, now: number) {
    const preview = this.previews.get(id);
    if (!preview || !preview.approved || preview.consumed || preview.expiresAt <= now) return false;
    preview.consumed = true;
    return true;
  }
  async clear() { this.previews.clear(); }
  async acquire(lease: string, now: number) {
    if (this.execution && this.execution.until > now) return false;
    this.execution = { lease, until: now + 60000 };
    return true;
  }
  async release(lease: string) { if (this.execution?.lease === lease) this.execution = undefined; }
}
