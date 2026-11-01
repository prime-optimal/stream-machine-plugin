import { Database } from "bun:sqlite";
import { chmodSync, existsSync, lstatSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { z } from "zod";
import type { Connection, ConnectionStore } from "./upstream/store";

const connectionSchema = z.object({ ownerId: z.string(), twitchUserId: z.string(), profile: z.object({ id: z.string(), login: z.string(), displayName: z.string(), profileImageUrl: z.string(), broadcasterType: z.string() }), scopes: z.array(z.string()), ciphertext: z.string(), expiresAt: z.number(), validatedAt: z.number() });
export class LocalConnectionStore implements ConnectionStore {
  private db: Database;
  constructor(path: string) {
    if (path !== ":memory:") {
      const directory = dirname(path);
      mkdirSync(directory, { recursive: true, mode: 0o700 });
      if (lstatSync(directory).isSymbolicLink() || (lstatSync(directory).mode & 0o077)) throw new Error("Twitch store directory must be private");
      if (existsSync(path) && lstatSync(path).isSymbolicLink()) throw new Error("Unsafe Twitch store path");
    }
    this.db = new Database(path, { create: true });
    if (path !== ":memory:") chmodSync(path, 0o600);
    this.db.exec("CREATE TABLE IF NOT EXISTS connection (owner TEXT PRIMARY KEY, data TEXT NOT NULL, lease TEXT, until_at INTEGER); CREATE TABLE IF NOT EXISTS states (hash TEXT PRIMARY KEY, owner TEXT, scopes TEXT, expires INTEGER, used INTEGER)");
  }
  close() { this.db.close(); }
  async saveState(hash: string, owner: string, scopes: string[], expires: number) {
    this.db.query("DELETE FROM states WHERE expires <= ?").run(expires - 600000);
    this.db.query("INSERT INTO states VALUES (?, ?, ?, ?, NULL)").run(hash, owner, JSON.stringify(scopes), expires);
  }
  async consumeState(hash: string, owner: string, now: number) {
    const row = this.db.query<{ scopes: string }, [number, string, string, number]>("UPDATE states SET used=? WHERE hash=? AND owner=? AND expires>? AND used IS NULL RETURNING scopes").get(now, hash, owner, now);
    return row ? z.array(z.string()).parse(JSON.parse(row.scopes)) : null;
  }
  async get(owner: string) {
    const row = this.db.query<{ data: string }, [string]>("SELECT data FROM connection WHERE owner=?").get(owner);
    return row ? connectionSchema.parse(JSON.parse(row.data)) : null;
  }
  async put(c: Connection, hash: string, now: number) {
    const row = this.db.query<{ owner: string }, [string, string, string, string, number]>("INSERT INTO connection(owner,data) SELECT ?,? FROM states WHERE hash=? AND owner=? AND used IS NOT NULL AND expires>? ON CONFLICT(owner) DO UPDATE SET data=excluded.data,lease=NULL,until_at=NULL RETURNING owner").get(c.ownerId, JSON.stringify(c), hash, c.ownerId, now);
    return !!row;
  }
  async dropState(hash: string, owner: string) { this.db.query("DELETE FROM states WHERE hash=? AND owner=?").run(hash, owner); }
  async remove(owner: string, ciphertext?: string) {
    if (ciphertext) this.db.query("DELETE FROM connection WHERE owner=? AND json_extract(data,'$.ciphertext')=?").run(owner, ciphertext);
    else this.db.query("DELETE FROM connection WHERE owner=?").run(owner);
  }
  async disconnect(owner: string) {
    return this.db.transaction(() => {
      this.db.query("DELETE FROM states WHERE owner=?").run(owner);
      const row = this.db.query<{ data: string }, [string]>("DELETE FROM connection WHERE owner=? RETURNING data").get(owner);
      return row ? connectionSchema.parse(JSON.parse(row.data)) : null;
    })();
  }
  async claimRefresh(owner: string, ciphertext: string, lease: string, now: number) {
    return !!this.db.query("UPDATE connection SET lease=?,until_at=? WHERE owner=? AND json_extract(data,'$.ciphertext')=? AND (until_at IS NULL OR until_at<=?) RETURNING owner").get(lease, now + 30000, owner, ciphertext, now);
  }
  async replaceRefreshed(c: Connection, lease: string) { return !!this.db.query("UPDATE connection SET data=?,lease=NULL,until_at=NULL WHERE owner=? AND lease=? RETURNING owner").get(JSON.stringify(c), c.ownerId, lease); }
  async releaseRefresh(owner: string, lease: string) { this.db.query("UPDATE connection SET lease=NULL,until_at=NULL WHERE owner=? AND lease=?").run(owner, lease); }
  async markValidated(owner: string, ciphertext: string, scopes: string[], expiresAt: number, validatedAt: number) {
    const c = await this.get(owner); if (!c || c.ciphertext !== ciphertext) return false;
    return !!this.db.query("UPDATE connection SET data=? WHERE owner=? AND data=? RETURNING owner").get(JSON.stringify({ ...c, scopes, expiresAt, validatedAt }), owner, JSON.stringify(c));
  }
}
