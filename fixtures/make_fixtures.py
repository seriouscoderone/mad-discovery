"""Make the gym-bp, bpm-core and constructed fixtures. Usage: python -I make_fixtures.py <clean gym-bp store> <fixtures folder>"""
import base64, json, os, shutil, sys
from blake3 import blake3
from bpm_core.said import saidify

store, out = sys.argv[1], sys.argv[2]
FILL = "#" * 44

def compact(doc): return json.dumps(doc, separators=(",", ":"), ensure_ascii=False).encode()
def encode(digest): return "E" + base64.urlsafe_b64encode(b"\x00" + digest).decode()[1:]
def said_of(hashed): return encode(blake3(hashed).digest())
def write(folder, name, data):
    os.makedirs(os.path.join(out, folder), exist_ok=True)
    with open(os.path.join(out, folder, name), "wb") as f: f.write(data)

# 1. gym-bp: the store's pretty copies, and the compact bytes bpm-core hashed.
for fn in sorted(os.listdir(store)):
    if not fn.endswith(".json"): continue
    raw = open(os.path.join(store, fn), "rb").read()
    write("pretty", fn, raw)
    write("compact", fn, compact(json.loads(raw)))

# 2. bpm-core saidifies documents with awkward values; Node's JSON round trip would change these bytes.
for doc in [
    {"d": "", "kind": "fixture", "1": "an integer-like key comes first"},
    {"d": "", "kind": "fixture", "x": 1.0},
    {"d": "", "kind": "fixture", "y": 1e-05},
    {"d": "", "kind": "fixture", "z": 9007199254740993},
    {"d": "", "kind": "fixture", "u": "� and a non-ASCII word: Prüfung"},
]:
    frozen = saidify(doc)
    write("compact", frozen["d"] + ".json", compact(frozen))

# 3. A document whose SAID is directly followed by '#': fixes the direction of the rebuild step.
hashed = ('{"a":"' + FILL + '#"}').encode()
s = said_of(hashed)
write("compact", s + ".json", ('{"a":"' + s + '#"}').encode())

# 4. Honest documents the check must refuse: their content holds a run of '#'.
index = []
for n, name in [(44, "content-holds-44-hashes.json"), (50, "content-holds-50-hashes.json")]:
    hashed = ('{"d":"' + FILL + '","note":"' + "#" * n + '"}').encode()
    s = said_of(hashed)
    write("refused", name, ('{"d":"' + s + '","note":"' + "#" * n + '"}').encode())
    index.append({"file": name, "said": s, "why": f"its content holds {n} consecutive # beside the SAID slot"})
write("refused", "index.json", (json.dumps(index, indent=2) + "\n").encode())

# 5. A configuration for the gym fixtures: serve the three selections, each with a publication.
docs = {fn[:-5]: json.load(open(os.path.join(store, fn))) for fn in os.listdir(store) if fn.endswith(".json")}
selections = sorted((s, d["alias"]) for s, d in docs.items() if d.get("kind") == "selection")
config = {
    "source": "https://gym.example/mad/source.json",
    "serve": [s for s, _ in selections],
    "publications": [
        {"target": s, "name": alias, "description": f"Test data from gym-bp: the {alias} selection.", "tags": ["gym", "test-data"], "collection": "gym-bp test data"}
        for s, alias in selections
    ],
    "introductions": [],
    "catalogs": [],
}
with open(os.path.join(out, "gym-config.json"), "w") as f: json.dump(config, f, indent=2); f.write("\n")
print("made", len(os.listdir(os.path.join(out, "compact"))), "compact and", len(os.listdir(os.path.join(out, "pretty"))), "pretty fixtures")
