import { isSaid } from "./said.ts";

export type Address = { address: string; base: string };
/** test: relaxes the scheme, the port and loopback hosts, for local test servers only. Set by test code, never by a flag. */
export type AddressOptions = { test?: boolean };

const MAX_LENGTH = 512;
const IPV4 = /^\d+\.\d+\.\d+\.\d+$/;

function parseUrl(s: string, opts: AddressOptions): URL | null {
  if (s.length > MAX_LENGTH) return null;
  let url: URL;
  try { url = new URL(s); } catch { return null; }
  const test = opts.test === true;
  if (url.protocol !== "https:" && !(test && url.protocol === "http:")) return null;
  if (url.href.length > MAX_LENGTH) return null;
  // The canonical form: no user name, password, query or fragment, not even an empty one.
  if (url.href !== url.origin + url.pathname) return null;
  if (url.port !== "" && !test) return null;
  const host = url.hostname;
  if (host === "" || host.endsWith(".")) return null;
  const literal = IPV4.test(host) || host.startsWith("[");
  if (literal && !(test && (host === "127.0.0.1" || host === "[::1]"))) return null;
  if ((host === "localhost" || host.endsWith(".localhost")) && !test) return null;
  return url;
}

function parseEnding(s: string, ending: string, opts: AddressOptions): Address | null {
  const url = parseUrl(s, opts);
  if (url === null || !url.pathname.endsWith(ending)) return null;
  return { address: url.href, base: url.origin + url.pathname.slice(0, url.pathname.length - ending.length + 1) };
}

export function parseSourceAddress(s: string, opts: AddressOptions = {}): Address | null {
  return parseEnding(s, "/source.json", opts);
}

export function parseCatalogAddress(s: string, opts: AddressOptions = {}): Address | null {
  return parseEnding(s, "/catalog.json", opts);
}

/** A plain https address, for oobi and the like. Same rule without the ending. */
export function parseHttpsAddress(s: string, opts: AddressOptions = {}): string | null {
  const url = parseUrl(s, opts);
  return url === null ? null : url.href;
}

export function definitionAddress(base: string, said: string): string {
  if (!isSaid(said)) throw new Error(`not a SAID: ${said}`);
  if (!base.endsWith("/")) throw new Error("a base ends with /");
  return `${base}definitions/${said}.json`;
}
