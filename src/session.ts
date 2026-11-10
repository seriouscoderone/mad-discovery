import { fetchJson, type Fetched, type Resolve } from "./fetch.ts";
import { parseHttpsAddress, type AddressOptions } from "./address.ts";
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
    if (!(limits.hostsInFlight > 0)) throw new RangeError("hostsInFlight must be at least 1");
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
    const h = this.hosts.get(name) ?? { ms: 0, bytes: 0 };
    if (h.ms >= this.limits.hostMs) return "host-time";
    if (h.bytes >= this.limits.hostBytes) return "host-bytes";
    return null;
  }

  /** One request within the request, host and run limits, charged to its host whatever the outcome. One request at a time per host is each's job, not this one's. */
  async fetch(address: string): Promise<Fetched> {
    const href = parseHttpsAddress(address, { test: this.test });
    if (href === null) return { outcome: "refused-address", read: 0, ms: 0 };
    const h = this.host(Session.hostOf(href));
    const timeoutMs = Math.min(this.limits.requestMs, this.limits.hostMs - h.ms, this.remainingRun());
    const maxBytes = Math.min(this.limits.fileBytes, this.limits.hostBytes - h.bytes);
    if (timeoutMs <= 0 || maxBytes <= 0) return { outcome: "timed-out", read: 0, ms: 0 };
    const r = await fetchJson(href, { test: this.test, resolve: this.resolve, now: this.now, timeoutMs, maxBytes });
    h.ms += r.ms;
    h.bytes += r.read;
    // A body cut by the host's remaining bytes rather than the file limit means the host is used up, not that the file is bad.
    if (r.outcome === "invalid" && h.bytes >= this.limits.hostBytes) return { outcome: "timed-out", read: r.read, ms: r.ms };
    return r;
  }

  /**
   * Runs work over the items in order: at most hostsInFlight hosts at a time, one item at a time per host. Every item runs to
   * completion; if any item's work threw, the call then rejects with the first error seen, so a fault is loud and never a silent loss.
   */
  async each<T>(items: T[], hostOf: (item: T) => string, work: (item: T) => Promise<void>): Promise<void> {
    const pending = items.map((item) => ({ item, host: hostOf(item) }));
    const busy = new Set<string>();
    const errors: unknown[] = [];
    await new Promise<void>((done) => {
      const pump = (): void => {
        while (busy.size < this.limits.hostsInFlight) {
          const i = pending.findIndex((p) => !busy.has(p.host));
          if (i < 0) break;
          const { item, host } = pending.splice(i, 1)[0]!;
          busy.add(host);
          const release = (): void => { busy.delete(host); pump(); };
          const fail = (error: unknown): void => { errors.push(error); release(); };
          Promise.resolve().then(() => work(item)).then(release, fail);
        }
        if (pending.length === 0 && busy.size === 0) done();
      };
      pump();
    });
    if (errors.length > 0) throw errors[0];
  }
}
