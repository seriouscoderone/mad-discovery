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
aws s3 cp /tmp/mad-site/.well-known/ai-catalog.json s3://mad-seriouscoder-one/.well-known/ai-catalog.json --content-type application/ai-catalog+json --cache-control "public, max-age=300"
aws cloudfront create-invalidation --distribution-id E3PDWZWR269C2D --paths "/source.json" "/pages/*" "/sitemap.xml" "/.well-known/*"
```

The source sits at the host root, so the build also writes `.well-known/ai-catalog.json`; it is uploaded with the media type the specification names, `application/ai-catalog+json`, which `aws s3 sync` would not guess.

`aws s3 sync` sets content types from file extensions (`.json` as `application/json`, which the tool requires). Definitions never need invalidating: a changed definition is a new SAID and a new file.

The robots.txt line for this source, `Mad-Source: https://mad.seriouscoder.one/source.json`, sits in `https://seriouscoder.one/robots.txt` since 2026-11-10 (see "The robots.txt lines" below).

## mad.josephleehunsaker.com

The second deployed source, since 2026-11-10: one gym-bp definition, `ECru8k3CerlcJF0Khe0EOubRaA4U4APPGqOdvkzNR0L1`, which `mad.seriouscoder.one` also serves, labelled as test data in its publication. Neither source introduces the other: they are the two strangers the second epic's live check needs (design, "Acceptance", clause 2). Address: `https://mad.josephleehunsaker.com/source.json`.

- Configuration: `mad.josephleehunsaker.com/config.json` (inputs are `fixtures/pretty`).
- Bucket: `mad-josephleehunsaker-com` (us-east-1, private, read through CloudFront origin access control with `ListBucket` so a missing file answers 404).
- Certificate: ACM `mad.josephleehunsaker.com` (us-east-1, DNS-validated; the site's own certificate has no wildcard).
- Distribution: `E8LQQKF16X4MY`, alias `mad.josephleehunsaker.com`, TLS 1.2 and up, no compression, `GET` and `HEAD` only.
- DNS: `A` and `AAAA` aliases in the `josephleehunsaker.com` zone.
- Updating it is the same procedure as above with the bucket, configuration and distribution id swapped.

## The header for browser wallets

Ruling 11: a source that wants browser wallets to read it sends `Access-Control-Allow-Origin: *` on `source.json` and on `definitions/*`. Both distributions above, `E3PDWZWR269C2D` (`mad.seriouscoder.one`) and `E8LQQKF16X4MY` (`mad.josephleehunsaker.com`), get it from CloudFront's managed response headers policy "SimpleCORS" (ID `60669652-455b-4ae9-85a4-c4c02393f86c`), which adds `Access-Control-Allow-Origin: *` to responses for simple CORS requests. It is attached to the cache behavior; nothing in the buckets changes.

**Not applied yet.** This step is the operator's, in AWS. The change that wrote this note (2026-11-12) ran no `aws` command and changed neither live source.

In the console, for each distribution: Distributions, the distribution, Behaviors, select the behavior, Edit, "Response headers policy", SimpleCORS, Save changes.

With the CLI, for each distribution id (`AWS_PROFILE=personal`):

```bash
aws cloudfront get-distribution-config --id <id> --output yaml > dist-config.yaml
# In the cache behavior, add:  ResponseHeadersPolicyId: 60669652-455b-4ae9-85a4-c4c02393f86c
# Rename the ETag field to IfMatch.
aws cloudfront update-distribution --id <id> --cli-input-yaml file://dist-config.yaml
```

Steps checked against the AWS CloudFront Developer Guide on 2026-11-12. Afterwards `verify` over a definition's address reports that browser wallets can read the file.

## The robots.txt lines

Placed on 2026-11-10, each in the robots.txt of a site in the maintainer's personal account:

| Site | Bucket and distribution | Line |
|---|---|---|
| `https://seriouscoder.one/robots.txt` | `site-seriouscoder-one-117870855864`, `E1CKA05MNLD7XU` | `Mad-Source: https://mad.seriouscoder.one/source.json` |
| `https://josephleehunsaker.com/robots.txt` | `site-josephleehunsaker-com-117870855864`, `ERB0EISAIW44N` | `Mad-Source: https://mad.josephleehunsaker.com/source.json` |

Each file is `User-agent: *`, `Allow: /`, a blank line and the `Mad-Source:` line; neither site had a robots.txt before. On that day Common Crawl's three newest crawls (CC-MAIN-2026-43, -39, -34) held no capture of either host, checked by range requests into each crawl's `cluster.idx` (Ruling 10). Whether a later crawl picks them up is checked the same way when the second epic's finder runs; the GitHub-topic finder is the route that does not depend on it.
