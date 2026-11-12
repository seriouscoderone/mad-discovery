import http from "node:http";
import https from "node:https";
import { Resolver } from "node:dns/promises";
import { parseHttpsAddress, type AddressOptions } from "./address.ts";
import { isLoopback, isPublic, parseIPv4 } from "./ip.ts";

export const USER_AGENT = "mad-discovery (+https://github.com/seriouscoderone/mad-discovery)";

/** The fixed list of docs/design.md "Outcomes". disallowed is the catalog build's and skipped is the scheduler's; neither is produced here. */
export type Outcome = "ok" | "truncated" | "not-found" | "unreachable" | "timed-out" | "redirected" | "refused-address" | "disallowed" | "invalid" | "skipped";

/** What one request ended in. read and ms are charged to the host whatever the outcome. */
export type Fetched =
  | { outcome: "ok"; bytes: Uint8Array; anyOrigin: boolean; read: number; ms: number }
  | { outcome: "redirected"; target: string | null; read: number; ms: number }
  | { outcome: "not-found" | "unreachable" | "timed-out" | "refused-address" | "invalid"; read: number; ms: number };

/** Every address a name resolves to, IPv4 and IPv6 together; rejects when there is none or no answer in time. */
export type Resolve = (hostname: string, timeoutMs: number) => Promise<string[]>;

export type FetchOptions = AddressOptions & {
  timeoutMs: number;   // from before name resolution to the last byte
  maxBytes: number;    // a longer body is refused while it is read
  resolve?: Resolve;   // tests inject one; the default is resolveNames
  now?: () => number;  // tests inject a clock
};

/** c-ares through node:dns/promises, cancelled at the deadline: unlike dns.lookup its queries can be timed out and abandoned. */
const resolveNames: Resolve = async (hostname, timeoutMs) => {
  const resolver = new Resolver({ timeout: Math.max(1, Math.ceil(timeoutMs)), tries: 1 });
  const timer = setTimeout(() => resolver.cancel(), timeoutMs);
  try {
    const [v4, v6] = await Promise.allSettled([resolver.resolve4(hostname), resolver.resolve6(hostname)]);
    const addresses = [...(v4.status === "fulfilled" ? v4.value : []), ...(v6.status === "fulfilled" ? v6.value : [])];
    if (addresses.length === 0) throw v4.status === "rejected" ? v4.reason : v6.status === "rejected" ? v6.reason : new Error("the name has no address");
    return addresses;
  } finally {
    clearTimeout(timer);
  }
};

const httpsAgent = new https.Agent({ keepAlive: false });
const httpAgent = new http.Agent({ keepAlive: false });

function isJsonType(header: string | undefined): boolean {
  if (header === undefined) return false;
  const type = header.split(";")[0]!.trim().toLowerCase();
  return type === "application/json" || type.endsWith("+json");
}

function isTimeout(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  const code = (e as { code?: unknown }).code;
  return code === "ECANCELLED" || code === "ETIMEOUT";
}

type Ending =
  | { outcome: "ok"; bytes: Uint8Array; anyOrigin: boolean }
  | { outcome: "redirected"; target: string | null }
  | { outcome: "not-found" | "unreachable" | "timed-out" | "refused-address" | "invalid" };

/**
 * The one fetch routine of docs/design.md "Fetching safely". The address rule first; then the name is resolved once and every
 * answer checked; then the socket is told the one address it may connect to; no redirect is followed, no encoding accepted,
 * and the body is cut at maxBytes while it arrives. One deadline covers all of it.
 */
export function fetchJson(address: string, opts: FetchOptions): Promise<Fetched> {
  const now = opts.now ?? (() => performance.now());
  const start = now();
  let read = 0;
  return new Promise<Fetched>((done) => {
    let settled = false;
    let req: http.ClientRequest | null = null;
    const finish = (ending: Ending): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      req?.destroy();
      done({ ...ending, read, ms: now() - start } as Fetched);
    };
    const timer = setTimeout(() => finish({ outcome: "timed-out" }), opts.timeoutMs);

    const href = parseHttpsAddress(address, opts);
    if (href === null) { finish({ outcome: "refused-address" }); return; }
    const url = new URL(href);
    const test = opts.test === true;
    const secure = url.protocol === "https:";

    void (async () => {
      // The address rule admits an IP literal only under test, and only loopback; a name is resolved once, here.
      const literal = parseIPv4(url.hostname) !== null || url.hostname.startsWith("[");
      let target: string;
      if (literal) {
        target = url.hostname.replace(/^\[|\]$/g, "");
      } else {
        let answers: string[];
        try {
          answers = await (opts.resolve ?? resolveNames)(url.hostname, Math.max(1, opts.timeoutMs - (now() - start)));
        } catch (e) {
          finish({ outcome: isTimeout(e) ? "timed-out" : "unreachable" });
          return;
        }
        if (settled) return;
        if (answers.length === 0 || !answers.every((a) => isPublic(a) || (test && isLoopback(a)))) { finish({ outcome: "refused-address" }); return; }
        target = answers[0]!;
      }
      const family = parseIPv4(target) !== null ? 4 : 6;
      // What the socket is told instead of a lookup: the one address that was checked. Node asks with all: true.
      const lookup: NonNullable<http.RequestOptions["lookup"]> = (_hostname, options, callback) => {
        if (options.all) callback(null, [{ address: target, family }]); else callback(null, target, family);
      };
      const options: https.RequestOptions = {
        hostname: literal ? target : url.hostname,
        port: url.port === "" ? (secure ? 443 : 80) : Number(url.port),
        path: url.pathname,
        method: "GET",
        agent: secure ? httpsAgent : httpAgent,
        lookup,
        rejectUnauthorized: true,
        headers: { accept: "application/json", "accept-encoding": "identity", "user-agent": USER_AGENT },
      };
      const onResponse = (res: http.IncomingMessage): void => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400) {
          const location = res.headers.location;
          finish({ outcome: "redirected", target: typeof location === "string" ? location.slice(0, 512) : null });
          return;
        }
        if (status === 404 || status === 410) { finish({ outcome: "not-found" }); return; }
        if (status >= 500) { finish({ outcome: "unreachable" }); return; }
        if (status !== 200) { finish({ outcome: "invalid" }); return; }
        const encoding = res.headers["content-encoding"];
        if (encoding !== undefined && encoding.toLowerCase() !== "identity") { finish({ outcome: "invalid" }); return; }
        if (!isJsonType(res.headers["content-type"])) { finish({ outcome: "invalid" }); return; }
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => {
          read += chunk.length;
          if (read > opts.maxBytes) { finish({ outcome: "invalid" }); return; }
          chunks.push(chunk);
        });
        // Whether a page on any origin may read this answer: what a browser wallet needs (docs/design.md "Rules for a source").
        const anyOrigin = res.headers["access-control-allow-origin"]?.trim() === "*";
        res.on("end", () => finish({ outcome: "ok", bytes: new Uint8Array(Buffer.concat(chunks)), anyOrigin }));
        res.on("error", () => finish({ outcome: "unreachable" }));
      };
      req = secure ? https.request(options, onResponse) : http.request(options, onResponse);
      req.on("error", () => finish({ outcome: "unreachable" }));
      req.end();
    })().catch(() => finish({ outcome: "unreachable" }));
  });
}
