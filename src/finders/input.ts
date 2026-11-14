import http from "node:http";
import https from "node:https";
import type { IncomingHttpHeaders } from "node:http";
import type { Readable } from "node:stream";
import { USER_AGENT, resolveNames, type Resolve } from "../fetch.ts";
import { isLoopback, isPublic, parseIPv4 } from "../ip.ts";

/** The public inputs a finder reads: hosts named here and nowhere else. A test's local origins stand in through the test option. */
export type InputBases = { archive: string; index: string; github: string };
export const PUBLIC_INPUTS: InputBases = { archive: "https://data.commoncrawl.org/", index: "https://index.commoncrawl.org/", github: "https://api.github.com/" };

export type InputOptions = {
  test?: boolean;                        // admits plain-HTTP loopback bases and loopback answers; set by test code only
  connections?: number;                  // sockets to one host at a time; 16 by default (docs/design.md, Fetching safely)
  retries?: number;                      // after a 429, a rate-limited 403, a 5xx, a connection error or an idle connection; 8 by default
  pause?: number;                        // the first pause in ms, doubling; 1000 by default
  maxPause?: number;                     // no doubled pause is longer; 60 s by default
  idleMs?: number;                       // no bytes for this long is a connection error; 60 s by default
  sleep?: (ms: number) => Promise<void>; // tests inject one
  now?: () => number;                    // tests inject a clock
  resolve?: Resolve;                     // tests inject answers; resolveNames otherwise
};

export type InputReason = "refused-url" | "refused-address" | "status" | "redirected" | "encoded" | "too-large" | "unreachable";

export class InputError extends Error {
  readonly url: string;
  readonly reason: InputReason;
  readonly status: number | undefined;
  constructor(url: string, reason: InputReason, status?: number) {
    super(`${reason}${status !== undefined ? ` ${status}` : ""}: ${url}`);
    this.url = url;
    this.reason = reason;
    this.status = status;
  }
}

export const RETRY_AFTER_MAX = 120_000;   // a host's Retry-After, honoured up to two minutes
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const LOOPBACK_BASE = /^http:\/\/(127\.0\.0\.1|\[::1\]|localhost)(:\d+)?\//;

/**
 * One streaming GET of a fixed public input (docs/design.md "What a finder returns": a finder's reads of its own public input are
 * outside the limits that bound fetches of strangers' addresses). It keeps every other guarantee of fetchJson: a name resolved once
 * to public addresses and the socket connected to the address checked, TLS verified, no redirect, no content encoding. It gives up an
 * idle connection, retries a 429, a rate-limited 403, a 5xx or a connection error no faster than once a second, honours Retry-After,
 * makes every request wait out a host's slow-down, and holds at most `connections` sockets to a host.
 */
export class Input {
  readonly bases: InputBases;
  readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;
  private readonly resolve: Resolve;
  private readonly test: boolean;
  private readonly retries: number;
  private readonly pause: number;
  private readonly maxPause: number;
  private readonly idleMs: number;
  private readonly httpsAgent: https.Agent;
  private readonly httpAgent: http.Agent;
  private readonly checked = new Map<string, Promise<string>>();   // host -> its one lookup, shared by every request
  private pausedUntil = 0;                                 // a host said slow down: no request starts before this

  constructor(bases: InputBases, opts: InputOptions = {}) {
    this.bases = bases;
    this.sleep = opts.sleep ?? wait;
    this.now = opts.now ?? Date.now;
    this.resolve = opts.resolve ?? resolveNames;
    this.test = opts.test === true;
    this.retries = opts.retries ?? 8;
    this.pause = opts.pause ?? 1000;
    this.maxPause = opts.maxPause ?? 60_000;
    this.idleMs = opts.idleMs ?? 60_000;
    const max = opts.connections ?? 16;
    this.httpsAgent = new https.Agent({ keepAlive: true, maxSockets: max });
    this.httpAgent = new http.Agent({ keepAlive: true, maxSockets: max });
  }

  /** The URL must extend one of the bases, and the base must be https unless the test option admits a loopback one. */
  private admitted(url: string): boolean {
    const base = [this.bases.archive, this.bases.index, this.bases.github].find((b) => url.startsWith(b) && url.length > b.length);
    if (base === undefined) return false;
    if (base.startsWith("https://")) return true;
    return this.test && LOOPBACK_BASE.test(base);
  }

  /** The one address an https host's sockets connect to: resolved once, every answer public (loopback only under test). */
  private address(url: string, host: string): Promise<string> {
    const known = this.checked.get(host);
    if (known !== undefined) return known;
    const lookup = (async () => {
      let answers: string[];
      try { answers = await this.resolve(host, this.idleMs); } catch { throw new InputError(url, "unreachable"); }
      if (answers.length === 0 || !answers.every((a) => isPublic(a) || (this.test && isLoopback(a)))) throw new InputError(url, "refused-address");
      return answers[0]!;
    })();
    this.checked.set(host, lookup);
    lookup.catch(() => { if (this.checked.get(host) === lookup) this.checked.delete(host); });
    return lookup;
  }

  /** One request; resolves with the response once its headers arrive, or rejects with an InputError. */
  private async once(url: string, headers: Record<string, string>): Promise<http.IncomingMessage> {
    const secure = url.startsWith("https://");
    const host = new URL(url).hostname;
    let lookup: http.RequestOptions["lookup"];
    if (secure) {
      const target = await this.address(url, host);
      const family = parseIPv4(target) !== null ? 4 : 6;
      lookup = (_hostname, options, callback) => { if (options.all) callback(null, [{ address: target, family }]); else callback(null, target, family); };
    }
    return await new Promise((resolve, reject) => {
      const req = (secure ? https : http).request(url, {
        method: "GET",
        agent: secure ? this.httpsAgent : this.httpAgent,
        ...(lookup !== undefined ? { lookup } : {}),
        rejectUnauthorized: true,
        headers: { "accept-encoding": "identity", "user-agent": USER_AGENT, ...headers },
      }, (res) => {
        res.setTimeout(this.idleMs, () => res.destroy(new InputError(url, "unreachable")));   // no bytes for idleMs: give the connection up
        resolve(res);
      });
      req.setTimeout(this.idleMs, () => req.destroy(new InputError(url, "unreachable")));
      req.on("error", (e) => { this.checked.delete(host); reject(e instanceof InputError ? e : new InputError(url, "unreachable")); });
      req.end();
    });
  }

  /** Whether an answer is to be tried again: a 429, a 403 that is GitHub's rate limit (primary or secondary), any 5xx. */
  private static retried(res: http.IncomingMessage): boolean {
    const status = res.statusCode ?? 0;
    return status === 429 || status >= 500 || (status === 403 && (res.headers["x-ratelimit-remaining"] === "0" || res.headers["retry-after"] !== undefined));
  }

  /** The host saying slow down: a 429, a 503, GitHub's rate-limited 403. Its pause applies to every request of this input. */
  private static throttled(res: http.IncomingMessage): boolean {
    const status = res.statusCode ?? 0;
    return status === 429 || status === 503 || status === 403;   // a 403 reaches here only when retried() said it is the rate limit
  }

  /** Retry-After in its seconds form, at most two minutes; the date form is ignored and the doubling pause applies. */
  private static retryAfter(value: string | string[] | undefined): number | null {
    if (typeof value !== "string") return null;
    const v = value.trim();
    if (!/^\d{1,9}$/.test(v)) return null;
    return Math.min(Number(v) * 1000, RETRY_AFTER_MAX);
  }

  /** A 200 answer's stream, or an InputError. */
  async open(url: string, headers: Record<string, string> = {}): Promise<{ status: 200; stream: Readable; headers: IncomingHttpHeaders }> {
    if (!this.admitted(url)) throw new InputError(url, "refused-url");
    let last: InputError = new InputError(url, "unreachable");
    for (let attempt = 0; ; attempt++) {
      for (let target = this.pausedUntil; target - this.now() > 0; ) {   // a host said slow down: wait it out, and again if it was extended meanwhile
        await this.sleep(target - this.now());
        if (this.pausedUntil === target) break;
        target = this.pausedUntil;
      }
      let res: http.IncomingMessage | null = null;
      try { res = await this.once(url, headers); } catch (e) {
        last = e instanceof InputError ? e : new InputError(url, "unreachable");
        if (last.reason === "refused-address") throw last;   // a private answer is not a passing fault
      }
      let throttled = false;
      let after: number | null = null;
      if (res !== null) {
        const status = res.statusCode ?? 0;
        if (status === 200) {
          const encoding = res.headers["content-encoding"];
          if (encoding !== undefined && encoding.toLowerCase() !== "identity") { res.destroy(); throw new InputError(url, "encoded", 200); }
          return { status, stream: res, headers: res.headers };
        }
        res.resume();
        if (status >= 300 && status < 400) throw new InputError(url, "redirected", status);
        last = new InputError(url, "status", status);
        if (!Input.retried(res)) throw last;
        throttled = Input.throttled(res);
        after = throttled ? Input.retryAfter(res.headers["retry-after"]) : null;
      }
      if (attempt >= this.retries) throw last;
      const doubling = Math.min(this.pause * 2 ** attempt, this.maxPause);
      const delay = after === null ? doubling : Math.max(after, this.pause);   // Retry-After never brings a retry under the one-pause floor
      if (throttled) this.pausedUntil = Math.max(this.pausedUntil, this.now() + delay);   // waited out at the top of the next try
      else await this.sleep(delay);
    }
  }

  /** The whole body of a small input, bounded. */
  async readAll(url: string, maxBytes: number, headers: Record<string, string> = {}): Promise<Uint8Array> {
    const { stream } = await this.open(url, headers);
    const chunks: Buffer[] = [];
    let read = 0;
    try {
      for await (const chunk of stream) {
        read += (chunk as Buffer).length;
        if (read > maxBytes) { stream.destroy(); throw new InputError(url, "too-large"); }
        chunks.push(chunk as Buffer);
      }
    } catch (e) {
      if (e instanceof InputError) throw e;
      throw new InputError(url, "unreachable");   // the stream failed mid-body (an idle timeout, a reset)
    }
    return new Uint8Array(Buffer.concat(chunks));
  }

  close(): void {
    this.httpsAgent.destroy();
    this.httpAgent.destroy();
  }
}
