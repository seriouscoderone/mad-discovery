import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { createGunzip, gunzipSync, gzipSync } from "node:zlib";
import { warcRecords, robotsLine, WarcError } from "../src/finders/warc.ts";
import { warcGz, SAMPLE_CAPTURES } from "./helpers/warc.ts";

const FIXTURE = fileURLToPath(new URL("../fixtures/robotstxt/sample.warc.gz", import.meta.url));
const records = async (gz: Uint8Array, maxFile?: number) => { const out = []; for await (const r of warcRecords(Readable.from([Buffer.from(gz)]).pipe(createGunzip()), maxFile)) out.push(r); return out; };
const members = (gz: Uint8Array): number => { let n = 0; for (let i = 0; i + 2 < gz.length; i++) if (gz[i] === 0x1f && gz[i + 1] === 0x8b && gz[i + 2] === 0x08) n++; return n; };

test("the committed fixture decompresses to the helper's output over its listed captures, member for member, and Node gunzips it", () => {
  const committed = new Uint8Array(readFileSync(FIXTURE));
  const fresh = warcGz(SAMPLE_CAPTURES);
  assert.deepEqual(gunzipSync(committed), gunzipSync(fresh), "regenerate with tests/helpers/warc.ts when the captures change");
  assert.equal(members(committed), members(fresh)); assert.equal(members(committed), 1 + 2 * SAMPLE_CAPTURES.length);
  const text = gunzipSync(committed).toString("latin1");
  assert.equal(text.split("WARC-Type: response").length - 1, SAMPLE_CAPTURES.length);
  assert.ok(text.includes("HTTP/1.1 404 Not Found") && text.includes("HTTP/1.1 301 Moved Permanently"));
});

test("warcRecords yields every record with its type, target and payload, at its decompressed offset", async () => {
  const gz = warcGz(SAMPLE_CAPTURES);
  const all = await records(gz);
  assert.equal(all.length, 1 + 2 * SAMPLE_CAPTURES.length);
  assert.equal(all[0]!.type, "warcinfo"); assert.equal(all[0]!.uri, null); assert.equal(all[0]!.offset, 0);
  const plain = gunzipSync(gz).toString("latin1");
  for (const r of all) assert.equal(plain.slice(r.offset, r.offset + 8), "WARC/1.0", `offset ${r.offset}`);
  const responses = all.filter((r) => r.type === "response");
  assert.deepEqual(responses.map((r) => r.uri), SAMPLE_CAPTURES.map((c) => c.uri));
  assert.ok(Buffer.from(responses[0]!.payload).toString("utf8").startsWith("HTTP/1.1 200 OK\r\n"));
  assert.ok(Buffer.from(responses[0]!.payload).toString("utf8").endsWith(SAMPLE_CAPTURES[0]!.body));
});

test("warcRecords refuses a header block over 8 KB, a payload over 16 MB, a file over its cap, a truncated record and a payload without its trailing CRLFs", async () => {
  const big = Buffer.from(`WARC/1.0\r\nWARC-Type: response\r\nX: ${"a".repeat(9000)}\r\nContent-Length: 0\r\n\r\n\r\n\r\n`, "latin1");
  await assert.rejects(records(gzipSync(big)), (e: unknown) => e instanceof WarcError);
  const huge = Buffer.from(`WARC/1.0\r\nWARC-Type: response\r\nContent-Length: ${17 * 1024 * 1024}\r\n\r\n`, "latin1");
  await assert.rejects(records(gzipSync(huge)), (e: unknown) => e instanceof WarcError);
  const plain = gunzipSync(warcGz(SAMPLE_CAPTURES.slice(0, 1)));
  await assert.rejects(records(gzipSync(plain.subarray(0, plain.length - 40))), (e: unknown) => e instanceof WarcError, "a record cut short");
  const lying = Buffer.from(`WARC/1.0\r\nWARC-Type: response\r\nContent-Length: 2\r\n\r\nabcd\r\n\r\n`, "latin1");
  await assert.rejects(records(gzipSync(lying)), (e: unknown) => e instanceof WarcError, "the payload length lies: no CRLFs where they must be");
  await assert.rejects(records(warcGz(SAMPLE_CAPTURES), 1000), (e: unknown) => e instanceof WarcError && e.message.includes("decompressed"), "a file over its decompressed cap");
});

test("robotsLine takes the first Mad-Source value of a 200 response, in any case or spacing, text after # cut off, and nothing from any other answer", async () => {
  const all = await records(warcGz(SAMPLE_CAPTURES));
  const responses = all.filter((r) => r.type === "response");
  assert.deepEqual(responses.map((r) => robotsLine(r.payload)), [
    "https://mad.alpha.example/source.json",
    "https://beta.example/discovery/source.json",   // the first of two lines, trimmed
    null,   // 404 with the line: not read
    null,   // 301
    null,   // 200 without the line
    "https://mad.alpha.example/source.json",   // the second capture of alpha
    null,   // zeta: the first Mad-Source line's value is empty, so this place names nothing
    "https://theta.example/source.json",   // text after # ignored
    "https://iota.example/source.json",    // leading whitespace and a CRLF line end
    "not an address",   // a value, not an address: the finder drops it
  ]);
  const long = Buffer.from(`HTTP/1.1 200 OK\r\n\r\nMad-Source: ${"a".repeat(513)}\n`, "latin1");
  assert.equal(robotsLine(long), null, "a value over 512 characters");
  assert.equal(robotsLine(Buffer.from("HTTP/1.1 2000 OK\r\n\r\nMad-Source: https://x.example/source.json\n", "latin1")), null, "2000 is not 200");
  assert.equal(robotsLine(Buffer.from("HTTP/1.0 200\r\n\r\nMAD-SOURCE:https://x.example/source.json", "latin1")), "https://x.example/source.json", "HTTP/1.0 and no space after the colon");
  assert.equal(robotsLine(Buffer.from("not http", "latin1")), null);
  assert.equal(robotsLine(Buffer.from("HTTP/1.1 200 OK\r\n\r\nUser-agent: *\rMad-Source: https://cr.example/source.json\r", "latin1")), "https://cr.example/source.json", "CR-only line ends (RFC 9309)");
  const far = Buffer.from(`HTTP/1.1 200 OK\r\n\r\n${"\n".repeat(600 * 1024)}Mad-Source: https://late.example/source.json\n`, "latin1");
  const t0 = performance.now();
  assert.equal(robotsLine(far), null, "a line past 512 KiB of body is not read");
  assert.ok(performance.now() - t0 < 200, `bounded work: ${performance.now() - t0} ms`);
});
