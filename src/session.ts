import { fetchJson, type Fetched, type Resolve } from "./fetch.ts";
import type { AddressOptions } from "./address.ts";
import type { Limits } from "./limits.ts";

export type SessionOptions = AddressOptions & { resolve?: Resolve; now?: () => number };
export type Exhausted = "host-time" | "host-bytes" | "run";

type HostState = { ms: number; bytes: number };

/** One run of the walk or get: the run clock, each host's time and bytes, and how hosts are scheduled. Nothing outlives the run. */
export class Session {
  readonly limits: Limits;
  readonly test: boolean;
  private readonly resolve: Resolve | undefined;
  private readonly now: () => number;
  private readonly started: number;
  private readonly hosts = new Map<string, HostState>();

  constructor(limits: Limits, options: SessionOptions = {}) {
    this.limits = limits;
    this.test = options.test === true;
    this.resolve = options.resolve;
    this.now = options.now ?? (() => performance.now());
    this.started = this.now();
  }

  /** The host a request to this address is charged to: host name and port as the URL serializes them. */
  static hostOf(address: string): string {
    return new URL(address).host;
  }

  private host(name: string): HostState {
    let h = this.hosts.get(name);
    if (h === undefined) { h = { ms: 0, bytes: 0 }; this.hosts.set(name, h); }
    return h;
  }

  /** Milliseconds left on the run clock; Infinity when there is none. */
  remainingRun(): number {
    return this.limits.runMs === null ? Infinity : this.limits.runMs - (this.now() - this.started);
  }

  /** Why nothing more may be asked of this host, or null. */
  exhausted(name: string): Exhausted | null {
    if (this.remainingRun() <= 0) return "run";
    const h = this.host(name);
    if (h.ms >= this.limits.hostMs) return "host-time";
    if (h.bytes >= this.limits.hostBytes) return "host-bytes";
    return null;
  }

  /** One request within the request, host and run limits, charged to its host whatever the outcome. */
  async fetch(address: string): Promise<Fetched> {
    const name = Session.hostOf(address);
    const h = this.host(name);
    const timeoutMs = Math.min(this.limits.requestMs, this.limits.hostMs - h.ms, this.remainingRun());
    const maxBytes = Math.min(this.limits.fileBytes, this.limits.hostBytes - h.bytes);
    if (timeoutMs <= 0 || maxBytes <= 0) return { outcome: "timed-out", read: 0, ms: 0 };
    const r = await fetchJson(address, { test: this.test, resolve: this.resolve, now: this.now, timeoutMs, maxBytes });
    h.ms += r.ms;
    h.bytes += r.read;
    // A body cut by the host's remaining bytes rather than the file limit means the host is used up, not that the file is bad.
    if (r.outcome === "invalid" && h.bytes >= this.limits.hostBytes) return { outcome: "timed-out", read: r.read, ms: r.ms };
    return r;
  }

  /** Runs work over the items in order: at most hostsInFlight hosts at a time, one item at a time per host. A rejection ends only its item. */
  async each<T>(items: T[], hostOf: (item: T) => string, work: (item: T) => Promise<void>): Promise<void> {
    const pending = [...items];
    const busy = new Set<string>();
    await new Promise<void>((done) => {
      const pump = (): void => {
        while (busy.size < this.limits.hostsInFlight) {
          const i = pending.findIndex((item) => !busy.has(hostOf(item)));
          if (i < 0) break;
          const item = pending.splice(i, 1)[0]!;
          const name = hostOf(item);
          busy.add(name);
          const release = (): void => { busy.delete(name); pump(); };
          work(item).then(release, release);
        }
        if (pending.length === 0 && busy.size === 0) done();
      };
      pump();
    });
  }
}
