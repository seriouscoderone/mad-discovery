import { test } from "node:test";
import assert from "node:assert/strict";
import { parseIPv4, parseIPv6, isPublic, isLoopback } from "../src/ip.ts";

test("IPv4 parses dotted quads and nothing else", () => {
  assert.equal(parseIPv4("93.184.216.34"), 0x5db8d822);
  assert.equal(parseIPv4("0.0.0.0"), 0);
  assert.equal(parseIPv4("255.255.255.255"), 0xffffffff);
  for (const bad of ["1.2.3", "1.2.3.4.5", "256.1.1.1", "01.2.3.4", "1.2.3.4 ", "", "::1"]) assert.equal(parseIPv4(bad), null, bad);
});

test("IPv6 parses compressed forms and dotted tails", () => {
  assert.equal(parseIPv6("::1"), 1n);
  assert.equal(parseIPv6("::"), 0n);
  assert.equal(parseIPv6("2001:db8::1"), 0x20010db8000000000000000000000001n);
  assert.equal(parseIPv6("::ffff:8.8.8.8"), 0xffff08080808n);
  assert.equal(parseIPv6("64:ff9b::93.184.216.34"), (0x64ff9bn << 96n) | 0x5db8d822n);
  assert.equal(parseIPv6("1:2:3:4:5:6:7:8"), 0x00010002000300040005000600070008n);
  for (const bad of ["fe80::1%en0", "1::2::3", "1:2:3:4:5:6:7:8:9", "1:2:3:4:5:6:7", "::ffff:1.2.3.4.5", "g::1", "12345::1"]) assert.equal(parseIPv6(bad), null, bad);
});

test("the public check refuses every listed range and accepts their neighbours", () => {
  const refused = [
    "0.1.2.3", "10.1.2.3", "100.64.0.1", "100.127.255.255", "127.0.0.1", "127.255.255.254", "169.254.169.254", "172.16.0.1", "172.31.255.255",
    "192.0.0.1", "192.0.2.1", "192.168.1.1", "198.18.0.1", "198.19.255.255", "198.51.100.7", "203.0.113.9", "224.0.0.1", "239.255.255.255", "240.0.0.1", "255.255.255.255",
    "::1", "::", "fe80::1", "fc00::1", "fd12:3456::1", "ff02::1", "2001::1", "2001:1ff::1", "2001:db8::1", "2002:c000:204::1", "1::1", "1fff:ffff::1", "4000::1",
    "::ffff:127.0.0.1", "::ffff:10.0.0.1", "::ffff:192.168.0.1", "64:ff9b::7f00:1", "64:ff9b::10.0.0.1",
  ];
  for (const a of refused) assert.equal(isPublic(a), false, a);
  const accepted = [
    "93.184.216.34", "8.8.8.8", "1.1.1.1", "100.128.0.1", "172.32.0.0", "172.15.255.255", "192.0.1.1", "192.0.3.1", "198.17.255.255", "198.20.0.1", "223.255.255.255",
    "2606:4700::1111", "2001:4860:4860::8888", "2001:200::1", "2001:db9::1", "2003::1", "2000::1", "3fff:ffff:ffff:ffff:ffff:ffff:ffff:ffff",
    "::ffff:8.8.8.8", "::ffff:93.184.216.34", "64:ff9b::5db8:d822", "64:ff9b::8.8.8.8",
  ];
  for (const a of accepted) assert.equal(isPublic(a), true, a);
  for (const bad of ["fe80::1%en0", "1.2.3.4.5", "01.2.3.4", "", "example.com"]) assert.equal(isPublic(bad), false, bad);
});

test("loopback is 127/8 and ::1", () => {
  assert.equal(isLoopback("127.0.0.1"), true);
  assert.equal(isLoopback("127.1.2.3"), true);
  assert.equal(isLoopback("::1"), true);
  for (const a of ["128.0.0.1", "::2", "::ffff:127.0.0.1", "10.0.0.1", "nope"]) assert.equal(isLoopback(a), false, a);
});
