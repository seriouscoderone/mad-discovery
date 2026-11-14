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

Ruling 11: a source that wants browser wallets to read it sends `Access-Control-Allow-Origin: *` on every answer for `source.json` and `definitions/*`, whatever headers the request carries. Both distributions above, `E3PDWZWR269C2D` (`mad.seriouscoder.one`) and `E8LQQKF16X4MY` (`mad.josephleehunsaker.com`), get it from the response headers policy `mad-source-any-origin` (ID `628a06e9-6f5b-4910-885c-c8fbf64853ea`) in the maintainer's account, attached to the default cache behavior; nothing in the buckets changes. Its CORS configuration allows every origin (`*`), every request header (`*`), the methods `GET`, `HEAD` and `OPTIONS`, no credentials, and overrides any such header from the origin. Response headers policies cost nothing.

**Why not the managed SimpleCORS policy**, which these distributions used from 2026-11-12 to 2026-11-13: it allows no request headers, so CloudFront leaves the header out when the request carries one that is not on the browser's safelist, such as `Cache-Control` or `Pragma`. A wallet fetches with the cache mode `no-store`, for which the browser itself adds `Cache-Control: no-cache` and `Pragma: no-cache`, so no wallet could read either source (GitHub #5, found from the maintainer's phone). The managed CORS-With-Preflight policy allows no request headers either. CloudFront refuses `Access-Control-Allow-Origin` as a custom header, so the header has to come from a CORS configuration.

**Applied** to `E3PDWZWR269C2D` and `E8LQQKF16X4MY` on 2026-11-13, with the maintainer's go-ahead. Checked afterwards on both hosts, for `source.json`, a definition, a page and a missing file: a request with `Origin` gets `access-control-allow-origin: *` whether it also carries `Cache-Control: no-cache` and `Pragma: no-cache`, `Cache-Control: max-age=0` or `Cache-Control: no-store`; a request without `Origin` gets no such header; a preflight (`OPTIONS`) is refused with 403 because the distributions allow only `GET` and `HEAD`, which no wallet needs, since its `no-store` fetch sends no preflight.

The policy, as created (`AWS_PROFILE=personal`):

```bash
aws cloudfront create-response-headers-policy --response-headers-policy-config '{
  "Name": "mad-source-any-origin",
  "Comment": "ACAO * for any GET or HEAD whatever its request headers (mad-discovery Ruling 11, GitHub #5)",
  "CorsConfig": {
    "AccessControlAllowOrigins": { "Quantity": 1, "Items": ["*"] },
    "AccessControlAllowHeaders": { "Quantity": 1, "Items": ["*"] },
    "AccessControlAllowMethods": { "Quantity": 3, "Items": ["GET", "HEAD", "OPTIONS"] },
    "AccessControlAllowCredentials": false,
    "OriginOverride": true
  }
}'
```

To attach it to a distribution, put its ID in the default cache behavior's `ResponseHeadersPolicyId` and update the distribution with the configuration's ETag:

```bash
aws cloudfront get-distribution-config --id <id> --output json > dist.json
jq '.DistributionConfig | .DefaultCacheBehavior.ResponseHeadersPolicyId = "628a06e9-6f5b-4910-885c-c8fbf64853ea"' dist.json > cfg.json
aws cloudfront update-distribution --id <id> --if-match "$(jq -r .ETag dist.json)" --distribution-config file://cfg.json
```

In the console the same change is: Distributions, the distribution, Behaviors, select the behavior, Edit, "Response headers policy", `mad-source-any-origin`, Save changes.

`verify` asks the way a wallet does, with `Origin`, `Cache-Control: no-cache` and `Pragma: no-cache`, and reports `browserWallets`; a plain `curl -I` without `Origin` shows no such header. The check, for the source document and for a definition:

```bash
node bin/mad-discovery.ts verify https://mad.seriouscoder.one/source.json
node bin/mad-discovery.ts verify https://mad.seriouscoder.one/definitions/ECru8k3CerlcJF0Khe0EOubRaA4U4APPGqOdvkzNR0L1.json ECru8k3CerlcJF0Khe0EOubRaA4U4APPGqOdvkzNR0L1
```

## The robots.txt lines

Placed on 2026-11-10, each in the robots.txt of a site in the maintainer's personal account:

| Site | Bucket and distribution | Line |
|---|---|---|
| `https://seriouscoder.one/robots.txt` | `site-seriouscoder-one-117870855864`, `E1CKA05MNLD7XU` | `Mad-Source: https://mad.seriouscoder.one/source.json` |
| `https://josephleehunsaker.com/robots.txt` | `site-josephleehunsaker-com-117870855864`, `ERB0EISAIW44N` | `Mad-Source: https://mad.josephleehunsaker.com/source.json` |

Each file is `User-agent: *`, `Allow: /`, a blank line and the `Mad-Source:` line; neither site had a robots.txt before. On that day Common Crawl's three newest crawls (CC-MAIN-2026-43, -39, -34) held no capture of either host, checked by range requests into each crawl's `cluster.idx` (Ruling 10). Whether a later crawl picks them up is checked the same way when the second epic's finder runs; the GitHub-topic finder is the route that does not depend on it.
