import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { createServer as createSecureServer, type Server as SecureServer } from "node:https";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { planBuild, type BuildPlan } from "../../src/build.ts";
import { parseConfig } from "../../src/config.ts";
import type { Inputs } from "../../src/inputs.ts";

const TLS = (file: string) => new URL(`../../fixtures/tls/${file}`, import.meta.url);

const TYPES: Record<string, string> = { ".json": "application/json", ".html": "text/html; charset=utf-8", ".css": "text/css", ".xml": "application/xml" };

/** A local origin: one http server on 127.0.0.1 serving a map of files, with a hook for hostile answers. Test code only. */
export class Origin {
  readonly files = new Map<string, Uint8Array>();
  readonly requests: string[] = [];
  /** Answers the request itself and returns true, or returns false to let the file map answer. */
  behave: ((req: IncomingMessage, res: ServerResponse) => boolean) | null = null;
  readonly server: Server | SecureServer;
  readonly origin: string;
  // Not parameter properties: erasableSyntaxOnly and Node's strip-only mode both refuse those.
  private constructor(server: Server | SecureServer, origin: string) {
    this.server = server;
    this.origin = origin;
  }

  /** Plain http by default; secure serves the self-signed fixture, which nothing trusts, for the tests that expect a refusal. */
  static async start(secure = false): Promise<Origin> {
    const server = secure ? createSecureServer({ cert: readFileSync(TLS("cert.pem")), key: readFileSync(TLS("key.pem")) }) : createServer();
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const { port } = server.address() as AddressInfo;
    const o = new Origin(server, `${secure ? "https" : "http"}://127.0.0.1:${port}`);
    server.on("request", (req, res) => o.answer(req, res));
    return o;
  }

  private answer(req: IncomingMessage, res: ServerResponse): void {
    const path = (req.url ?? "/").slice(1);
    this.requests.push(path);
    if (this.behave !== null && this.behave(req, res)) return;
    const bytes = this.files.get(path);
    if (bytes === undefined) { res.statusCode = 404; res.end(); return; }
    res.setHeader("content-type", TYPES[path.slice(path.lastIndexOf("."))] ?? "application/octet-stream");
    res.end(Buffer.from(bytes));
  }

  put(path: string, bytes: Uint8Array | string): void {
    this.files.set(path, typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes);
  }

  /** Builds a source for this origin under prefix (such as "mad/") from a configuration without `source`, and serves its files. */
  source(prefix: string, config: Record<string, unknown>, inputs: Inputs): { address: string; plan: BuildPlan } {
    const address = `${this.origin}/${prefix}source.json`;
    const plan = planBuild(inputs, parseConfig(JSON.stringify({ source: address, ...config }), { test: true }), { test: true });
    for (const [path, bytes] of plan.files) this.files.set(prefix + path, bytes);
    return { address, plan };
  }

  async close(): Promise<void> {
    this.server.closeAllConnections();
    await new Promise<void>((r) => this.server.close(() => r()));
  }
}
