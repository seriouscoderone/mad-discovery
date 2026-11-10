# Deployed sources

A source is a folder of static files; deploying one is copying that folder to a static host built for its address. This folder records the sources the maintainer runs, one subfolder per source address, each holding the `build` configuration that made it. The hosting is the maintainer's personal AWS account; nothing here is code the tool needs.

## mad.seriouscoder.one

The first deployed source, since 2026-11-10: gym-bp's three selections and the 23 definitions they contain, labelled as test data in their publications (Ruling 4). Address: `https://mad.seriouscoder.one/source.json`. Readable pages at `https://mad.seriouscoder.one/pages/index.html`.

- Configuration: `mad.seriouscoder.one/config.json` (the fixture configuration with this address; inputs are `fixtures/pretty`).
- Bucket: `mad-seriouscoder-one` (us-east-1, private, read through CloudFront origin access control; the policy also grants `ListBucket` so a missing file answers 404, which the tool reports as `not-found`, instead of 403).
- Distribution: `E3PDWZWR269C2D`, alias `mad.seriouscoder.one`, certificate `*.seriouscoder.one` (ACM, us-east-1), TLS 1.2 and up, no compression (the bytes on the wire are the bytes checked), `GET` and `HEAD` only, no default root object.
- DNS: `A` and `AAAA` aliases in the `seriouscoder.one` zone.
- Cache headers: `definitions/*` are immutable (`max-age=31536000, immutable`: a SAID names one byte string forever); everything else `max-age=300`.

To update it, from a checkout with Node 24 and `AWS_PROFILE=personal`:

```bash
node bin/mad-discovery.ts build fixtures/pretty --config deploy/mad.seriouscoder.one/config.json --out /tmp/mad-site
aws s3 sync /tmp/mad-site s3://mad-seriouscoder-one --delete --cache-control "public, max-age=300"
aws s3 cp s3://mad-seriouscoder-one/definitions s3://mad-seriouscoder-one/definitions --recursive --metadata-directive REPLACE --content-type application/json --cache-control "public, max-age=31536000, immutable"
aws cloudfront create-invalidation --distribution-id E3PDWZWR269C2D --paths "/source.json" "/pages/*" "/sitemap.xml"
```

`aws s3 sync` sets content types from file extensions (`.json` as `application/json`, which the tool requires). Definitions never need invalidating: a changed definition is a new SAID and a new file.

The robots.txt line for this source, `Mad-Source: https://mad.seriouscoder.one/source.json`, is not placed anywhere yet; the second epic chooses the hosts for the live stranger check and checks them against Common Crawl's index first (Ruling 4).
