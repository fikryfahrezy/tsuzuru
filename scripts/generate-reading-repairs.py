#!/usr/bin/env python3
"""Resolve furigana annotations that name a JMdict entry instead of a reading.

Some upstream annotations read {前|#1392580}: the number is a JMdict entry, not
a pronunciation. Each is repaired from that entry, never guessed: the entry
must list the annotated spelling and allow exactly one reading for it. Uses the
JMdict snapshot recorded by the spelling bank. Run with --check to verify.
"""
import argparse
import gzip
import hashlib
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data/reading-repairs/repairs.json"
ENTRY_ANNOTATION = re.compile(r"\{([^{}|]+)\|#(\d+)\}")


def entry_annotations(snapshot):
    """Every (spelling, entry id) used as a reading in the snapshot's examples."""
    found = set()
    for level in ("n5", "n4", "n3", "n2", "n1"):
        for row in json.loads((snapshot / f"data/json/vocab/{level}.json").read_text(encoding="utf-8")):
            for example in row.get("examples", []):
                found.update(ENTRY_ANNOTATION.findall(example.get("furigana") or ""))
    return found


def load_entries(path, wanted):
    """Spellings, readings, and first gloss for the wanted JMdict entries."""
    entries = {}
    for _, element in ET.iterparse(gzip.open(path), events=("end",)):
        if element.tag != "entry":
            continue
        entry_id = element.findtext("ent_seq")
        if entry_id in wanted:
            entries[entry_id] = {
                "spellings": [k.findtext("keb") for k in element.findall("k_ele")],
                "readings": [
                    {"reading": r.findtext("reb"),
                     "restrictedTo": [x.text for x in r.findall("re_restr")],
                     "kanaOnly": r.find("re_nokanji") is not None}
                    for r in element.findall("r_ele")
                ],
                "gloss": element.find("sense").findtext("gloss") if element.find("sense") is not None else "",
            }
        element.clear()
    return entries


def resolve(annotations, entries):
    """One repair per annotation, or ValueError when the entry does not fix a
    single reading for the annotated spelling."""
    repairs = []
    for spelling, entry_id in sorted(annotations, key=lambda pair: (int(pair[1]), pair[0])):
        entry = entries.get(entry_id)
        if entry is None:
            raise ValueError(f"JMdict has no entry {entry_id} for {spelling}")
        if spelling not in entry["spellings"]:
            raise ValueError(f"JMdict entry {entry_id} does not list {spelling}")
        readings = [r["reading"] for r in entry["readings"]
                    if not r["kanaOnly"] and (not r["restrictedTo"] or spelling in r["restrictedTo"])]
        if len(readings) != 1:
            raise ValueError(f"JMdict entry {entry_id} allows {len(readings)} readings for {spelling}")
        repairs.append({"entry": entry_id, "spelling": spelling, "reading": readings[0],
                        "gloss": entry["gloss"]})
    return repairs


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--jmdict", type=Path, default=ROOT / ".cache/spelling-jmdict_e.gz")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    manifest = json.loads((ROOT / "data/manifest.json").read_text())
    recorded = json.loads((ROOT / "data/spelling-variants/bank.json").read_text())["sources"]["jmdict"]
    if not args.jmdict.exists():
        raise SystemExit("JMdict is not cached; run spellings:generate --download first.")
    checksum = hashlib.sha256(args.jmdict.read_bytes()).hexdigest()
    if checksum != recorded["sha256"]:
        raise SystemExit("Cached JMdict differs from the snapshot recorded by the spelling bank.")
    annotations = entry_annotations(ROOT / manifest["snapshotPath"])
    try:
        repairs = resolve(annotations, load_entries(args.jmdict, {entry for _, entry in annotations}))
    except ValueError as error:
        raise SystemExit(f"{error}. Review the annotation before importing.") from error
    data = {
        "version": 1,
        "sourceRevision": manifest["revision"],
        "jmdict": {"url": recorded["url"], "sha256": checksum, "license": recorded["license"]},
        "note": "Upstream annotations that name a JMdict entry (#id) instead of a reading, each repaired from that entry's single reading for the annotated spelling. Applied when sentence candidates are built.",
        "repairs": repairs,
    }
    content = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text() != content:
            raise SystemExit("Reading repairs are stale; run readings:generate.")
    else:
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(content)
    print(f"{len(repairs)} entry annotations repaired")


if __name__ == "__main__":
    main()
