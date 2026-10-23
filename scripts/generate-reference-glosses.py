#!/usr/bin/env python3
"""Extract JMdict English senses for reference words missing from OpenJLPT."""
import argparse
import gzip
import hashlib
import json
import re
import subprocess
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data/reference-glosses/bank.json"
USUALLY_KANA = "word usually written using kana alone"
KANJI = re.compile(r"[㐀-鿿々]")
KANA_ONLY = re.compile(r"^[ぁ-ゟ゠-ヿー]+$")


def senses(element, codes, word, reading=None, roles=None):
    """English glosses and part-of-speech codes for one spelling of an entry.

    `reading` None accepts any reading of `word` (used for kanji lemmas).
    `roles` keeps only senses with one of those part-of-speech codes.
    """
    spellings = {item.findtext("keb") for item in element.findall("k_ele")}
    if reading is not None:
        valid_reading = any(
            item.findtext("reb") == reading
            and (item.find("re_nokanji") is None or word == reading)
            and (not item.findall("re_restr") or word in {r.text for r in item.findall("re_restr")})
            for item in element.findall("r_ele")
        )
        if not valid_reading or (word not in spellings and word != reading):
            return [], []
    elif word not in spellings:
        return [], []
    # A kana-only word must not borrow senses from a kanji homophone.
    kana_word = word not in spellings
    glosses, pos, inherited = [], [], []
    for sense in element.findall("sense"):
        inherited = [codes.get(item.text, item.text) for item in sense.findall("pos")] or inherited
        if sense.findall("stagk") and word not in {s.text for s in sense.findall("stagk")}:
            continue
        if reading is not None and sense.findall("stagr") and reading not in {s.text for s in sense.findall("stagr")}:
            continue
        if kana_word and spellings and USUALLY_KANA not in {m.text for m in sense.findall("misc")}:
            continue
        if roles and not roles & set(inherited):
            continue
        english = [
            gloss.text for gloss in sense.findall("gloss")
            if gloss.text and gloss.get("{http://www.w3.org/XML/1998/namespace}lang", "eng") == "eng"
        ]
        if not english:
            continue
        glosses += [text for text in english if text not in glosses]
        pos += [code for code in inherited if code not in pos]
    return glosses, pos


def entity_codes(path):
    """Map expanded JMdict entity text back to its short code (n, pn, v5r)."""
    with gzip.open(path, "rt", encoding="utf-8") as stream:
        header = []
        for line in stream:
            header.append(line)
            if line.startswith("]>"):
                break
    return {text: code for code, text in re.findall(r'<!ENTITY (\S+) "([^"]*)">', "".join(header))}


def match(found):
    """Use a sense set only when exactly one dictionary entry supplies it."""
    found = [item for item in found if item[1]]
    return found[0] if len(found) == 1 else None


def hiragana(text):
    return "".join(chr(ord(c) - 0x60) if "ァ" <= c <= "ヶ" else c for c in text)


def readings(element, word):
    """Readings valid for one spelling, as written in JMdict."""
    spellings = {item.findtext("keb") for item in element.findall("k_ele")}
    return [
        item.findtext("reb") for item in element.findall("r_ele")
        if word == item.findtext("reb") or (
            word in spellings and item.find("re_nokanji") is None
            and (not item.findall("re_restr") or word in {r.text for r in item.findall("re_restr")})
        )
    ]


SUFFIX = {"suf", "n-suf"}
COUNTER = {"ctr", "suf", "n-suf"}
# After a katakana name (パーカーさん), only the honorific is explained.
NAME_SUFFIXES = {"さん", "様", "さま", "君", "くん", "ちゃん", "氏"}
NOUN = {"n", "pn", "adj-na", "adj-no"}
GODAN = {"v5u", "v5k", "v5g", "v5s", "v5t", "v5n", "v5b", "v5m", "v5r"}
# Godan potential endings: 救える → 救う, 楽しめる → 楽しむ.
POTENTIAL = {"え": "う", "け": "く", "げ": "ぐ", "せ": "す", "て": "つ", "ね": "ぬ", "べ": "ぶ", "め": "む", "れ": "る"}


def part(index, codes, spelling, kana, roles=None):
    """The single entry, senses and pos for one compound part read as `kana`."""
    found = []
    for element in index.get(spelling, []):
        for reading in readings(element, spelling):
            if hiragana(reading) == kana:
                glosses, pos = senses(element, codes, spelling, reading, roles)
                if glosses and all(item[0] is not element for item in found):
                    found.append((element, glosses, pos))
    return found[0] if len(found) == 1 else None


def kana_verb(index, codes, lemma, verb_class):
    """The one common verb a kana lemma (くる) is read as, with its senses for
    that verb class. Several common verbs (やめる: 止める, 辞める) are skipped."""
    found = []
    for element in index.get(lemma, []):
        if not any(item.findtext("reb") == lemma and item.findall("re_pri") for item in element.findall("r_ele")):
            continue
        for spelling in [item.findtext("keb") for item in element.findall("k_ele")] or [lemma]:
            glosses, pos = senses(element, codes, spelling, lemma, {verb_class})
            if glosses:
                found.append((element, glosses, pos))
                break
    return found[0] if len(found) == 1 else None


def translated(glosses, english):
    """Whether an English translation uses one of the glosses' words, in the
    same case: a capitalized "Frank" is a name, not "frank"."""
    text = english.replace("-", "")
    for word in {w for gloss in glosses for w in re.findall(r"[A-Za-z]{3,}", re.sub(r"\(.*?\)", "", gloss))}:
        for found in re.finditer(r"(?<![A-Za-z])" + re.escape(word), text, re.IGNORECASE):
            if found.group() == word or found.start() == 0:
                return True
    return False


def confirmed_katakana(index, codes, word, english):
    """The one common entry for a katakana word whose senses every
    translation of its sentences uses. ポール is Paul in most sentences, not
    a pole, so it is skipped; メール is email in all of them."""
    found = [
        (element, *senses(element, codes, word, word)) for element in index.get(word, [])
        if any(item.findtext("reb") == word and item.findall("re_pri") for item in element.findall("r_ele"))
    ]
    found = match(found)
    return found if found and english and all(translated(found[1], line) for line in english) else None


def head(index, codes, spelling, kana):
    """A compound's final part, preferring its suffix senses, and whether
    those were found."""
    suffix = part(index, codes, spelling, kana, SUFFIX)
    if suffix or (KANA_ONLY.match(spelling) and not re.search("[ァ-ヶ]", spelling)):
        return suffix, True
    return part(index, codes, spelling, kana, NOUN), False


def compound(index, codes, word, kana, verb=False):
    """Explain a word missing from JMdict from unambiguous known parts.

    Returns (parts, pos), where each part is (spelling, kana, entry, glosses,
    label), or None. A word with several possible splits is skipped. `verb`
    marks a chip the tokenizer read as a verb form.
    """
    # A kana base (ひける: 引く, 弾く or 轢く) is too ambiguous to guess.
    if len(word) > 2 and KANJI.search(word) and word[-1] == "る" == kana[-1] and word[-2] == kana[-2] in POTENTIAL:
        base, base_kana = word[:-2] + POTENTIAL[word[-2]], kana[:-2] + POTENTIAL[kana[-2]]
        found = part(index, codes, base, base_kana, GODAN)
        if found:
            return [(base, base_kana, found[0], found[1], f"potential of {base}")], ["v1"]
    number = re.match(r"^([0-9０-９]+)(.+)$", word)
    if number and kana.startswith(number[1]):
        # Some counters are plain nouns in JMdict (時間, 円).
        count_kana = kana[len(number[1]):]
        found = part(index, codes, number[2], count_kana, COUNTER) or part(index, codes, number[2], count_kana, NOUN)
        return ([(number[2], count_kana, found[0], found[1], number[2])], ["n"]) if found else None
    # A kana verb starting with お (おって from おる) is not お + a word.
    if word[0] in "おご御" and kana[0] in "おご" and len(word) > 1 and not (verb and KANA_ONLY.match(word)):
        prefix = part(index, codes, word[0], kana[0], {"pref"})
        base = part(index, codes, word[1:], kana[1:])
        if prefix and base:
            return [(word[0], kana[0], prefix[0], prefix[1], word[0]),
                    (word[1:], kana[1:], base[0], base[1], word[1:])], base[2]
    for suffix in NAME_SUFFIXES:
        name = word[: -len(suffix)]
        if word.endswith(suffix) and re.fullmatch("[ァ-ヶー]+", name):
            # A katakana name's kana has the same length as the name.
            found = part(index, codes, suffix, kana[len(name):], SUFFIX)
            return ([(suffix, kana[len(name):], found[0], found[1], suffix)], ["n"]) if found else None
    splits = []
    for cut in range(1, len(word)):
        stem, rest = word[:cut], word[cut:]
        # A kana-only stem is usually a tokenizer join (たくさん + 輪).
        if not re.search(r"[\u3400-\u9fff々ァ-ヶ]", stem):
            continue
        for element in index.get(stem, []):
            for reading in readings(element, stem):
                if not kana.startswith(hiragana(reading)) or len(kana) == len(reading):
                    continue
                first = part(index, codes, stem, hiragana(reading), NOUN)
                last, suffix = head(index, codes, rest, kana[len(reading):])
                if first and last:
                    split = [(stem, hiragana(reading), first[0], first[1], stem),
                             (rest, kana[len(reading):], last[0], last[1], rest)]
                    if all(other != split for other, _ in splits):
                        splits.append((split, suffix))
    # Several splits: a single one ending in a real suffix wins (朝食 + 用, not 朝 + 食用).
    if len(splits) > 1:
        splits = [item for item in splits if item[1]]
    return (splits[0][0], ["n"]) if len(splits) == 1 else None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--jmdict", type=Path, default=ROOT / ".cache/spelling-jmdict_e.gz")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    source = json.loads((ROOT / "data/spelling-variants/bank.json").read_text())["sources"]["jmdict"]
    if hashlib.sha256(args.jmdict.read_bytes()).hexdigest() != source["sha256"]:
        raise SystemExit("JMdict checksum differs from the pinned spelling dictionary.")
    targets = json.loads(subprocess.run(
        ["bun", "scripts/reference-gloss-targets.ts"], cwd=ROOT, check=True,
        capture_output=True, text=True,
    ).stdout)
    wanted = {target["lemma"] for target in targets if "lemma" in target}
    for target in targets:
        word, kana = target["japanese"], target["kana"]
        # Every substring may be a compound part; potential verbs need their base.
        wanted |= {word[start:end] for start in range(len(word)) for end in range(start + 1, len(word) + 1)}
        if len(word) > 2 and word[-2] in POTENTIAL:
            wanted.add(word[:-2] + POTENTIAL[word[-2]])
    codes = entity_codes(args.jmdict)
    by_spelling = {}
    with gzip.open(args.jmdict, "rb") as stream:
        for _, element in ET.iterparse(stream, events=("end",)):
            if element.tag != "entry":
                continue
            spellings = {item.findtext("keb") for item in element.findall("k_ele")}
            spellings |= {item.findtext("reb") for item in element.findall("r_ele")}
            for spelling in spellings & wanted:
                by_spelling.setdefault(spelling, []).append(element)
            if not spellings & wanted:
                element.clear()
    entries = []
    for target in targets:
        word, kana = target["japanese"], target["kana"]
        # Chip kana is hiragana; a katakana word is its own reading.
        reading = word if KANA_ONLY.match(word) else kana
        found = match([
            (element, *senses(element, codes, word, reading)) for element in by_spelling.get(word, [])
        ])
        if not found and KANJI.search(target.get("lemma", "")):
            # An inflected chip (下さい) uses its kanji lemma when unambiguous.
            found = match([
                (element, *senses(element, codes, target["lemma"])) for element in by_spelling.get(target["lemma"], [])
            ])
        lemma = target.get("lemma", word)
        if not found and "verbClass" in target and KANA_ONLY.match(lemma):
            # A kana verb (きた from くる) is read as its single common verb.
            found = kana_verb(by_spelling, codes, lemma, target["verbClass"])
        if not found and re.fullmatch("[ァ-ヶー・]+", word):
            # Several katakana entries (サッカー: soccer, seersucker).
            found = confirmed_katakana(by_spelling, codes, word, target.get("english"))
        # The same chip can come from different lemmas (いった: 行く, 言う).
        keyed = {"lemma": target["lemma"]} if "lemma" in target else {}
        if not found:
            explained = compound(by_spelling, codes, word, kana, "verbClass" in target)
            if explained:
                parts, pos = explained
                entries.append({
                    "japanese": word,
                    "kana": kana,
                    **keyed,
                    "parts": [
                        {"japanese": spelling, "kana": part_kana, "dictionaryEntryId": element.findtext("ent_seq"),
                         "label": label, "meanings": glosses[:3]}
                        for spelling, part_kana, element, glosses, label in parts
                    ],
                    "meanings": [f"{label}: {', '.join(glosses[:3])}" for _, _, _, glosses, label in parts],
                    "pos": [code for code in pos if not code.startswith("vs")],
                })
            continue
        if found:
            element, glosses, pos = found
            # vs marks a noun that can take する; the chip itself is the noun.
            pos = [code for code in pos if not code.startswith("vs") or word.endswith("する")]
            entries.append({
                "japanese": word,
                "kana": kana,
                **keyed,
                "dictionaryEntryId": element.findtext("ent_seq"),
                "meanings": glosses[:8],
                "pos": pos,
            })
    bank = {
        "version": 1,
        "license": "CC-BY-SA-4.0",
        "attribution": "English senses extracted from JMdict, copyright James William Breen and EDRDG. See README.md.",
        "source": source,
        "entries": entries,
    }
    content = json.dumps(bank, ensure_ascii=False, indent=2) + "\n"
    if args.check:
        if OUTPUT.read_text() != content:
            raise SystemExit("Reference glosses are stale; run glosses:generate.")
    else:
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(content)
    compounds = sum("parts" in entry for entry in entries)
    print(f"{len(entries)} of {len(targets)} reference words have JMdict senses ({compounds} from parts)")


if __name__ == "__main__":
    main()
