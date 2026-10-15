#!/usr/bin/env python3
"""Extract additional English senses for existing JLPT words from pinned JMdict."""
import argparse
import gzip
import hashlib
import json
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def meanings(element, word, reading):
    spellings = {item.findtext("keb") for item in element.findall("k_ele")}
    valid_reading = any(
        item.findtext("reb") == reading
        and (item.find("re_nokanji") is None or word == reading)
        and (not item.findall("re_restr") or word in {r.text for r in item.findall("re_restr")})
        for item in element.findall("r_ele")
    )
    if not valid_reading or (word not in spellings and word != reading):
        return []
    result = []
    for sense in element.findall("sense"):
        if sense.findall("stagk") and word not in {s.text for s in sense.findall("stagk")}:
            continue
        if sense.findall("stagr") and reading not in {s.text for s in sense.findall("stagr")}:
            continue
        for gloss in sense.findall("gloss"):
            if gloss.get("{http://www.w3.org/XML/1998/namespace}lang", "eng") != "eng":
                continue
            if gloss.text and gloss.text not in result:
                result.append(gloss.text)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--jmdict", type=Path, default=ROOT / ".cache/spelling-jmdict_e.gz")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    source = json.loads((ROOT / "data/spelling-variants/bank.json").read_text())["sources"]["jmdict"]
    if hashlib.sha256(args.jmdict.read_bytes()).hexdigest() != source["sha256"]:
        raise SystemExit("JMdict checksum differs from the pinned spelling dictionary.")
    manifest = json.loads((ROOT / "data/manifest.json").read_text())
    vocabulary = {}
    for level in range(1, 6):
        for row in json.loads((ROOT / manifest["snapshotPath"] / f"data/json/vocab/n{level}.json").read_text()):
            if row.get("jmdict_id"):
                vocabulary.setdefault(str(row["jmdict_id"]), []).append(row)
    entries = {}
    with gzip.open(args.jmdict, "rb") as stream:
        for _, element in ET.iterparse(stream, events=("end",)):
            if element.tag != "entry":
                continue
            for row in vocabulary.get(element.findtext("ent_seq"), []):
                extra = [meaning for meaning in meanings(element, row["word"], row["reading"])
                         if meaning not in row["meanings"]]
                if extra:
                    entries[row["id"]] = {"word": row["word"], "reading": row["reading"], "meanings": extra}
            element.clear()
    bank = {"version": 1, "license": "CC-BY-SA-4.0", "sourceRevision": manifest["revision"],
            "attribution": "Additional English senses extracted from JMdict, copyright James William Breen and EDRDG. See README.md.",
            "source": source, "entries": dict(sorted(entries.items()))}
    output = ROOT / "data/hint-glossary/bank.json"
    content = json.dumps(bank, ensure_ascii=False, indent=2) + "\n"
    if args.check:
        if output.read_text() != content:
            raise SystemExit("Hint glossary is stale; run hints:generate.")
    else:
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(content)
    print(f"{len(entries)} vocabulary entries with additional English senses")


if __name__ == "__main__":
    main()
