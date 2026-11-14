import http from "node:http";
import https from "node:https";
import type { Readable } from "node:stream";
import { USER_AGENT, resolveNames, type Resolve } from "../fetch.ts";
import { isLoopback, isPublic, parseIPv4 } from "../ip.ts";

/** The public inputs a finder reads: hosts named here and nowhere else. A test's local origins stand in through the test option. */
export type InputBases = { archive: string; index: string; github: string };
export const PUBLIC_INPUTS: InputBases = { archive: "https://data.commoncrawl.org/", index: "https://index.commoncrawl.org/", github: "https://api.github.com/" };

export type InputOptions = {
  test?: boolean;                        // admits plain-HTTP loopback bases and loopback answers; set by test code only
  connections?: number;                  // sockets to one host at a time; 16 by default (docs/design.md, Fetching safely)
  pause?: number;                        // the first pause in ms, doubling up to MAX_PAUSE; 1000 by default
  idleMs?: number;                       // no bytes for this long is a connection error; 60 s by default
  sleep?: (ms: number) => Promise<void>; // tests inject one
  now?: () => number;                    // tests inject a clock
  resolve?: Resolve;                     // tests inject answers; resolveNames otherwise
  onThrottle?: (host: string, status: number, ms: number) => void;   // told each pause a host's slow-down sets: the URL's hostname, never text from the answer
  ccRate?: number;                       // request starts a second to Common Crawl's hosts; COMMON_CRAWL_RATE by default; set by test code only
};

export type InputReason = "refused-url" | "refused-address" | "status" | "redirected" | "encoded" | "too-large" | "unreachable";

export class InputError extends Error {
  readonly reason: InputReason;
  readonly status: number | undefined;
  constructor(url: string, reason: InputReason, status?: number) {
    super(`${reason}${status !== undefined ? ` ${status}` : ""}: ${url}`);
    this.reason = reason;
    this.status = status;
  }
}

export const RETRY_AFTER_MAX = 120_000;   // a host's Retry-After, honoured up to two minutes
export const RETRIES = 8;                 // after a 5xx other than a 503, a connection error, an idle connection, or a body that broke off
export const COMMON_CRAWL_RATE = 5;      // request starts a second to Common Crawl's hosts, retries included: under the per-client rule its WAF enforces, tripped at 2,341 requests in 130 s at 18 a second
export const THROTTLE_RETRIES = 15;       // after a host said slow down (a 429, a 503, a rate-limited 403): 1+2+4+...+32+60*9 = 603 s, about ten minutes
const MAX_PAUSE = 60_000;                 // no doubled pause is longer
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const LOOPBACK_BASE = /^http:\/\/(127\.0\.0\.1|\[::1\]|localhost)(:\d+)?\//;

/**
 * One streaming GET of a fixed public input (docs/design.md "What a finder returns": a finder's reads of its own public input are
 * outside the limits that bound fetches of strangers' addresses). It keeps every other guarantee of fetchJson: a name resolved once
 * to public addresses and the socket connected to the address checked, TLS verified, no redirect, no content encoding. It gives up an
 * idle connection, retries another 5xx, a connection error or (readAll) a body that broke off eight times, no faster than once a second; a
 * host saying slow down (a 429, a 503, GitHub's rate-limited 403, any 403 from Common Crawl, whose missing file is a 404) fifteen times,
 * about ten minutes, honouring Retry-After and making every request wait out the pause; and holds at most `connections` sockets to a host.
 * It starts at most COMMON_CRAWL_RATE requests a second to Common Crawl's hosts (the archive and the index together), shared by every
 * worker; GitHub's pace is the GitHub finder's own.
 */
export class Input {
  readonly bases: InputBases;
  readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;
  private readonly resolve: Resolve;
  private readonly onThrottle: (host: string, status: number, ms: number) => void;
  private readonly test: boolean;
  private readonly pause: number;
  private readonly idleMs: number;
  private readonly httpsAgent: https.Agent;
  private readonly httpAgent: http.Agent;
  private readonly checked = new Map<string, Promise<string>>();   // host -> its one lookup, shared by every request
  private pausedUntil = 0;                                 // a host said slow down: no request starts before this
  private readonly spacing: number;                        // ms between two starts to Common Crawl's hosts
  private nextStart = 0;                                   // the earliest the next start to Common Crawl's hosts may be

  constructor(bases: InputBases, opts: InputOptions = {}) {
    this.bases = bases;
    this.sleep = opts.sleep ?? wait;
    this.now = opts.now ?? Date.now;
    this.resolve = opts.resolve ?? resolveNames;
    this.onThrottle = opts.onThrottle ?? (() => {});
    this.test = opts.test === true;
    this.pause = opts.pause ?? 1000;
    this.idleMs = opts.idleMs ?? 60_000;
    this.spacing = 1000 / (opts.ccRate ?? COMMON_CRAWL_RATE);
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
        headers: { ...headers, "accept-encoding": "identity", "user-agent": USER_AGENT },
      }, (res) => {
        res.setTimeout(this.idleMs, () => res.destroy(new InputError(url, "unreachable")));   // no bytes for idleMs: give the connection up
        resolve(res);
      });
      req.setTimeout(this.idleMs, () => req.destroy(new InputError(url, "unreachable")));
      req.on("error", (e) => { this.checked.delete(host); reject(e instanceof InputError ? e : new InputError(url, "unreachable")); });
      req.end();
    });
  }

  /** A URL on Common Crawl's hosts: its archive or its index. */
  private commonCrawl(url: string): boolean {
    return url.startsWith(this.bases.archive) || url.startsWith(this.bases.index);
  }

  /** Waits for this request's start to Common Crawl's hosts: the slot is taken before the wait, so concurrent workers queue one spacing apart. */
  private async paced(url: string): Promise<void> {
    if (!this.commonCrawl(url)) return;
    const now = this.now();
    const start = Math.max(now, this.nextStart);
    this.nextStart = start + this.spacing;
    if (start > now) await this.sleep(start - now);
  }

  /**
   * What an answer other than a 200 or a redirect is: the host saying slow down (its pause applies to every request of this input), a
   * passing fault, or final. A 403 from Common Crawl's hosts is their rate limit, since a missing file there is a 404; a 403 from GitHub
   * is its rate limit (primary or secondary) only with x-ratelimit-remaining 0 or a Retry-After.
   */
  private answer(url: string, res: http.IncomingMessage): "throttled" | "fault" | "final" {
    const status = res.statusCode ?? 0;
    if (status === 429 || status === 503) return "throttled";
    if (status === 403) {
      if (this.commonCrawl(url)) return "throttled";
      return res.headers["x-ratelimit-remaining"] === "0" || res.headers["retry-after"] !== undefined ? "throttled" : "final";
    }
    return status >= 500 ? "fault" : "final";
  }

  /** Retry-After in its seconds form, at most two minutes; the date form is ignored and the doubling pause applies. */
  private static retryAfter(value: string | string[] | undefined): number | null {
    if (typeof value !== "string") return null;
    const v = value.trim();
    if (!/^\d{1,9}$/.test(v)) return null;
    return Math.min(Number(v) * 1000, RETRY_AFTER_MAX);
  }

  /** The pause before try attempt + 1: the first pause, doubled each time, never longer than a minute. */
  backoff(attempt: number): number {
    return Math.min(this.pause * 2 ** attempt, MAX_PAUSE);
  }

  /** A 200 answer's stream, or an InputError. Slow-downs and faults have separate budgets: THROTTLE_RETRIES and RETRIES retries. */
  async open(url: string, headers: Record<string, string> = {}): Promise<Readable> {
    if (!this.admitted(url)) throw new InputError(url, "refused-url");
    let last: InputError = new InputError(url, "unreachable");
    let throttles = 0, faults = 0;   // retries so far of each kind
    for (;;) {
      for (let target = this.pausedUntil; target - this.now() > 0; ) {   // a host said slow down: wait it out, and again if it was extended meanwhile
        await this.sleep(target - this.now());
        if (this.pausedUntil === target) break;
        target = this.pausedUntil;
      }
      await this.paced(url);
      let res: http.IncomingMessage | null = null;
      try { res = await this.once(url, headers); } catch (e) {
        last = e instanceof InputError ? e : new InputError(url, "unreachable");
        if (last.reason === "refused-address") throw last;   // a private answer is not a passing fault
      }
      let throttled = false;
      let after: number | null = null;
      let status = 0;
      if (res !== null) {
        status = res.statusCode ?? 0;
        if (status === 200) {
          const encoding = res.headers["content-encoding"];
          if (encoding !== undefined && encoding.toLowerCase() !== "identity") { res.destroy(); throw new InputError(url, "encoded", 200); }
          return res;
        }
        res.resume();
        if (status >= 300 && status < 400) throw new InputError(url, "redirected", status);
        last = new InputError(url, "status", status);
        const kind = this.answer(url, res);
        if (kind === "final") throw last;
        throttled = kind === "throttled";
        after = throttled ? Input.retryAfter(res.headers["retry-after"]) : null;
      }
      if (throttled) {
        if (throttles >= THROTTLE_RETRIES) throw last;
        const delay = after === null ? this.backoff(throttles) : Math.max(after, this.pause);   // Retry-After never brings a retry under the one-pause floor
        throttles++;
        const until = this.now() + delay;
        if (until - this.pausedUntil >= this.pause) this.onThrottle(new URL(url).hostname, status, until - this.now());   // reported when the pause is new or extended by a pause; an answer inside one already reported is silent
        this.pausedUntil = Math.max(this.pausedUntil, until);   // waited out at the top of the next try
      } else {
        if (faults >= RETRIES) throw last;
        await this.sleep(this.backoff(faults++));
      }
    }
  }

  /** The whole body of a small input, bounded; read again from the start, after the backoff, when the body breaks off or stalls. */
  async readAll(url: string, maxBytes: number, headers: Record<string, string> = {}): Promise<Uint8Array> {
    for (let attempt = 0; ; attempt++) {
      const stream = await this.open(url, headers);   // a failure here has had open's own retries
      const chunks: Buffer[] = [];
      let read = 0;
      try {
        for await (const chunk of stream) {
          read += (chunk as Buffer).length;
          if (read > maxBytes) { stream.destroy(); throw new InputError(url, "too-large"); }
          chunks.push(chunk as Buffer);
        }
        return new Uint8Array(Buffer.concat(chunks));
      } catch (e) {
        if (e instanceof InputError && e.reason === "too-large") throw e;
        if (attempt >= RETRIES) throw new InputError(url, "unreachable");   // the body kept breaking off (an idle timeout, a reset)
      }
      await this.sleep(this.backoff(attempt));
    }
  }

  close(): void {
    this.httpsAgent.destroy();
    this.httpAgent.destroy();
  }
}
