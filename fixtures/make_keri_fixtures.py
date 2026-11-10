"""Two keripy-written vectors. Usage: python -I make_keri_fixtures.py <fixtures folder>"""
import os, sys
from keri.core import eventing, signing, coring
from keri.core.coring import MtrDex
from keri.core.scheming import Schemer
from keri.kering import Kinds, Vrsn_1_0

out = sys.argv[1]
def write(name, data):
    with open(os.path.join(out, "compact", name), "wb") as f: f.write(data)

# An inception event with a self-addressing identifier: the SAID is in both d and i (JSON, KERI v1).
signer = signing.Signer(raw=b"\x01" * 32, transferable=True)
nxt = signing.Signer(raw=b"\x02" * 32, transferable=True)
icp = eventing.incept(keys=[signer.verfer.qb64], ndigs=[coring.Diger(ser=nxt.verfer.qb64b).qb64],
                      code=MtrDex.Blake3_256, version=Vrsn_1_0, kind=Kinds.json)
assert icp.raw.count(icp.said.encode()) == 2
write(icp.said + ".json", icp.raw)

# A schema with non-ASCII text; its SAID is in $id.
sch = Schemer(sed={"$id": "", "$schema": "https://json-schema.org/draft/2020-12/schema",
                   "title": "Übung: Prüfung", "description": "Ein Test mit Umlauten und 日本語", "type": "object"})
write(sch.said + ".json", sch.raw)
print("made", icp.said, sch.said)
