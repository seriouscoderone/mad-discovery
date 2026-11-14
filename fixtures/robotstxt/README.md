# robots.txt archive fixture

`sample.warc.gz` is a WARC file in the shape of Common Crawl's robots.txt archive (`crawl-data/<crawl>/segments/<segment>/robotstxt/*.warc.gz`,
measured 2026-11-12: one gzip member per record; a `warcinfo` record, then a `request` and a `response` record per capture; CRLF line ends;
a response's payload is the HTTP response). It is written by `tests/helpers/warc.ts` from `SAMPLE_CAPTURES`, and `tests/warc.test.ts` pins
its decompressed content and member count against that helper (not its compressed bytes, which depend on the zlib build): regenerate it
with the helper when the captures change. The hosts are `.example` names; nothing in it came from the archive.

It holds: hosts naming a source in a `Mad-Source` line (plain; in another case with surrounding spaces and a second line that is ignored;
with a `# comment` after the address; indented with a CRLF line end), a 404 and a 301 whose bodies are not read, a 200 without the line,
a second capture of the first host, a host whose first `Mad-Source` line is empty (so it names nothing), and a host whose line is not an
address (the finder drops it).
