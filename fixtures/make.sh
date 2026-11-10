#!/bin/sh
# Makes every fixture from its outside source. Run once; the results are committed.
set -e
cd "$(dirname "$0")"
BPM_PY="${BPM_PY:-$(cd ../../bpm-core && pwd)/.venv/bin/python}"
KERI_PY="${KERI_PY:-$HOME/code/KERI/said-test/.venv/bin/python}"
VLEI_COMMIT="${VLEI_COMMIT:-main}"
QVI=EBfdlu8R27Fbx-ehrqwImnK-8Cm79sqbAQ4MmvEAYqao
rm -rf compact pretty refused && mkdir -p compact pretty refused
tmp=$(mktemp -d)
git clone -q ../../gym-bp "$tmp/gym-bp"
(cd "$tmp/gym-bp" && BPM="$(dirname "$BPM_PY")/bpm" ./rebuild.sh)
"$BPM_PY" -I make_fixtures.py "$tmp/gym-bp/.bpm/store" .
"$KERI_PY" -I make_keri_fixtures.py .
curl -fsSL "https://www.gleif.org/.well-known/oobi/$QVI/index.json" -o "compact/$QVI.json"
curl -fsSL "https://raw.githubusercontent.com/WebOfTrust/vLEI/$VLEI_COMMIT/schema/acdc/qualified-vLEI-issuer-vLEI-credential.json" -o "pretty/$QVI.json"
rm -rf "$tmp"
echo "compact: $(ls compact | wc -l | tr -d ' ')  pretty: $(ls pretty | wc -l | tr -d ' ')  refused: $(ls refused | wc -l | tr -d ' ')"
