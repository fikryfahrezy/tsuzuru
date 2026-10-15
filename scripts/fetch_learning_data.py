#!/usr/bin/env python3
"""Fetch a pinned OpenJLPT snapshot and prepare unreviewed sentence candidates."""
import argparse
import hashlib
import json
import re
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
REPO = "evanclan/OpenJLPT"
REPAIRS = ROOT / "data/reading-repairs/repairs.json"
GENERATED_FURIGANA = ROOT / "data/generated-furigana/furigana.json"
ENTRY_ANNOTATION = re.compile(r"\{([^{}|]+)\|#(\d+)\}")


def fetch(url):
    request = Request(url, headers={"User-Agent": "tsuzuru-data-import/1.0"})
    with urlopen(request, timeout=60) as response:
        return response.read()


def save_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def load_repairs(path=REPAIRS):
    """(spelling, JMdict entry id) to reading; see scripts/generate-reading-repairs.py."""
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    if data.get("version") != 1:
        raise ValueError(f"Unsupported reading repair version: {path}")
    return {(row["spelling"], row["entry"]): row["reading"] for row in data["repairs"]}


def repair_furigana(furigana, repairs):
    """Replace annotations that name a JMdict entry ({前|#1392580}) with the
    entry's reading. An unrepaired entry annotation stops the import."""
    def replace(match):
        reading = repairs.get((match[1], match[2]))
        if reading is None:
            raise ValueError(f"Unrepaired entry annotation {match[0]}; run readings:generate.")
        return f"{{{match[1]}|{reading}}}"
    return ENTRY_ANNOTATION.sub(replace, furigana)


def load_generated_furigana(path=GENERATED_FURIGANA):
    """Sentence id to generated furigana; see scripts/generate-furigana.py."""
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    if data.get("version") != 1:
        raise ValueError(f"Unsupported generated furigana version: {path}")
    return data["entries"]


def build_candidates(snapshot, revision, repairs=None, generated=None):
    repairs = load_repairs() if repairs is None else repairs
    generated = load_generated_furigana() if generated is None else generated
    pairs = {}
    counts = {}
    for category in ("vocab", "kanji", "grammar"):
        counts[category] = {}
        for level in ("n5", "n4", "n3", "n2", "n1"):
            path = snapshot / "data/json" / category / f"{level}.json"
            rows = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(rows, list):
                raise ValueError(f"Expected an array: {path}")
            counts[category][level.upper()] = len(rows)
            if category != "vocab":
                continue
            for row in rows:
                for example in row.get("examples", []):
                    if not example.get("ja") or not example.get("en"):
                        continue
                    key = (example["ja"], example["en"])
                    candidate = pairs.setdefault(key, {
                        "id": hashlib.sha256((key[0] + "\0" + key[1]).encode()).hexdigest()[:24],
                        "english": key[1],
                        "japanese": key[0],
                        "furiganaVariants": [],
                        "englishWordCount": len(re.findall(r"\b\w+(?:['’]\w+)*\b", key[1])),
                        "japaneseCharacterCount": len(re.sub(r"\s", "", key[0])),
                        "targetVocabulary": [],
                        "sources": [],
                        "sentenceJlptLevel": None,
                        "reviewStatus": "unreviewed",
                        "license": "CC-BY-SA-4.0",
                    })
                    furigana = repair_furigana(example.get("furigana") or "", repairs)
                    if furigana and furigana not in candidate["furiganaVariants"]:
                        candidate["furiganaVariants"].append(furigana)
                    target = {"id": row["id"], "word": row["word"], "level": row["level"]}
                    if target not in candidate["targetVocabulary"]:
                        candidate["targetVocabulary"].append(target)
                    source = {
                        "dataset": "OpenJLPT", "revision": revision,
                        "path": f"data/json/vocab/{level}.json", "vocabularyId": row["id"],
                        "tatoebaId": example.get("tatoeba_id"),
                        "tatoebaUrl": (f"https://tatoeba.org/sentences/show/{example['tatoeba_id']}"
                                       if example.get("tatoeba_id") else None),
                    }
                    if source not in candidate["sources"]:
                        candidate["sources"].append(source)
    meta = json.loads((snapshot / "data/json/meta.json").read_text(encoding="utf-8"))
    for category, levels in counts.items():
        for level, count in levels.items():
            if meta["counts"][category][level] != count:
                raise ValueError(f"Upstream count mismatch: {category} {level}")
    # Generated furigana fills in only sentences upstream left unannotated,
    # and only while the source text it was generated from still matches.
    for candidate in pairs.values():
        entry = generated.get(candidate["id"])
        if not candidate["furiganaVariants"] and entry and entry["sourceJapanese"] == candidate["japanese"]:
            candidate["furiganaVariants"].append(entry["furigana"])
    candidates = sorted(pairs.values(), key=lambda row: row["id"])
    return counts, candidates


def rebuild():
    """Rebuild candidates from the pinned snapshot without downloading."""
    manifest = json.loads((ROOT / "data/manifest.json").read_text(encoding="utf-8"))
    _, candidates = build_candidates(ROOT / manifest["snapshotPath"], manifest["revision"])
    candidate_path = ROOT / "data/processed/sentence-candidates.json"
    save_json(candidate_path, candidates)
    manifest["sentenceCandidateCount"] = len(candidates)
    manifest["derivedFiles"] = [{"path": str(candidate_path.relative_to(ROOT)),
                                 "sha256": hashlib.sha256(candidate_path.read_bytes()).hexdigest()}]
    save_json(ROOT / "data/manifest.json", manifest)
    print(json.dumps({"revision": manifest["revision"], "sentenceCandidates": len(candidates)}, indent=2))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--revision", default="main", help="Git commit SHA or ref; resolved to a commit before downloading")
    parser.add_argument("--rebuild", action="store_true",
                        help="Rebuild candidates from the pinned snapshot without downloading")
    args = parser.parse_args()
    if args.rebuild:
        rebuild()
        return
    commit = json.loads(fetch(f"https://api.github.com/repos/{REPO}/commits/{args.revision}"))
    revision = commit["sha"]
    tree = json.loads(fetch(f"https://api.github.com/repos/{REPO}/git/trees/{revision}?recursive=1"))
    if tree.get("truncated"):
        raise ValueError("GitHub returned an incomplete tree")
    paths = sorted(item["path"] for item in tree["tree"] if item["type"] == "blob" and (
        (item["path"].startswith("data/json/") and item["path"].endswith(".json"))
        or item["path"] in ("LICENSE", "NOTICE.md", "README.md")
    ))
    snapshot = ROOT / "data/sources/openjlpt" / revision

    def download(path):
        url = f"https://raw.githubusercontent.com/{REPO}/{revision}/{path}"
        body = fetch(url)
        if path.endswith(".json"):
            json.loads(body)
        return path, url, body

    # Download and validate first so a network failure leaves the existing snapshot intact.
    with ThreadPoolExecutor(max_workers=5) as executor:
        downloaded = list(executor.map(download, paths))
    manifest_files = []
    for path, url, body in downloaded:
        destination = snapshot / path
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(body)
        manifest_files.append({"path": str(destination.relative_to(ROOT)), "url": url,
                               "bytes": len(body), "sha256": hashlib.sha256(body).hexdigest()})
    counts, candidates = build_candidates(snapshot, revision)
    candidate_path = ROOT / "data/processed/sentence-candidates.json"
    save_json(candidate_path, candidates)
    manifest = {
        "dataset": "OpenJLPT", "repository": f"https://github.com/{REPO}",
        "revision": revision, "retrievedAt": datetime.now(timezone.utc).isoformat(),
        "license": "CC-BY-SA-4.0", "snapshotPath": str(snapshot.relative_to(ROOT)),
        "counts": counts, "sentenceCandidateCount": len(candidates),
        "files": manifest_files,
        "derivedFiles": [{"path": str(candidate_path.relative_to(ROOT)),
                          "sha256": hashlib.sha256(candidate_path.read_bytes()).hexdigest()}],
    }
    save_json(ROOT / "data/manifest.json", manifest)
    print(json.dumps({"revision": revision, "files": len(paths), "counts": counts,
                      "sentenceCandidates": len(candidates)}, indent=2))


if __name__ == "__main__":
    main()
