# Practice guide

[Back to README](../README.md)

Open `/app`, choose a vocabulary level and sentence length, then translate the
English prompt into Japanese. A level offers sentences whose vocabulary is at
that level or easier; kanji and grammar are not graded. **Ctrl / Command + Enter** checks your answer;
press it again to continue.

## Choose a practice difficulty

Open **Settings** beside the page title and choose **Guided** or **Challenge**.
Guided is the default and offers answer breakdowns, grammar reference, romaji
hints, and clickable English word hints. Challenge hides these four aids during
practice and closes any that were open. It keeps your draft and input mode.

Both difficulties allow answer breakdowns after checking and in the journal.
Your difficulty choice is saved in this browser. The available aids are defined
by the permissions map in [practice-difficulty.ts](../shared/practice-difficulty.ts);
new difficulty levels can choose their own permissions from that list.

## Choose a writing mode

| Mode          | Accepted writing                                               |
| ------------- | -------------------------------------------------------------- |
| Kana only     | Hiragana or katakana, without kanji                            |
| Kana + kanji  | Reference kanji, kana readings, and verified spelling variants |
| Exact writing | The reference's spelling and script                            |

All modes ignore whitespace, common sentence punctuation, and Unicode width differences.
N5–N1 filters describe vocabulary focus, not the difficulty of the whole sentence.

## Get a hint

- **Show romaji hint** reveals the reference in Latin letters.
- Click an underlined English word or phrase for Japanese vocabulary and readings.
- Press **Escape** to close a vocabulary hint.

Hints may use dictionary forms or wording from the sentence reference. They are
suggestions, not word-for-word translations.

## Look up grammar while writing

Open **Grammar reference** beside the answer label to search without leaving your
prompt or losing your draft. Search in English, Japanese, or romaji—for example,
“want to”, “must”, or `〜たい`. The panel starts at your current vocabulary level;
choose **All levels** to broaden your search. Use **Browse by topic** to find
patterns for wishes, permission, time, conditions, and other purposes. Topic,
level, and search filters work together. **All topics** is the default, and a
pattern can appear in several groups. Topic labels are Tsuzuru browsing aids
mapped from the source tags.

Open a pattern to read its meaning, formation, usage notes, and examples with
furigana and translations. Related patterns share topic tags. Close the panel or
press **Escape** to return to writing; reopening retains your search and entry.
The reference sits beside your answer on desktop and below it on smaller screens.

The navigation's **Reference** link opens the standalone `/grammar` library in a
new tab. Reference entries come from the imported OpenJLPT snapshot and have not
been independently reviewed; JLPT labels are unofficial estimates. The panel is
a general reference and does not identify the required grammar for a prompt.

## Understand your result

Highlights show replaced or extra characters; `□` marks missing characters.
**Why it differs** explains the differences and writing-mode rules.

Enable **Pre-generated alternatives** to accept additional listed answers.
You can view those answers and their origins even with the setting off.

A mismatch does not mean your translation is wrong: the app compares against
listed answers rather than judging meaning. The source bank is unreviewed, and
alternatives—including AI-authored additions—may contain errors.

## Keep your practice

The journal saves up to 100 entries, including comparison results, in this
browser. Settings are saved here too. Clearing browser storage removes them.
Answers are checked on the server without being stored there.

Use your browser's install action or **Add to Home Screen** to install the
workspace. Once loaded online, it can reopen with your saved journal offline.
Getting new prompts and checking answers still need a connection.

For source credits and limitations, visit `/sources` or read the
[data disclosure](../DATA_DISCLOSURE.md).
