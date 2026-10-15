<script setup lang="ts">
import { useSeoMeta } from "#imports";

useSeoMeta({
  title: "Data & credits — Tsuzuru",
  description:
    "Learning data sources, licenses, attribution, and limitations for Tsuzuru’s Japanese writing practice.",
});
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <NuxtLink to="/" class="brand">
        <span class="brand-mark" lang="ja">綴</span>
        <span>
          tsuzuru
          <span class="brand-caption">JAPANESE WRITING PRACTICE</span>
        </span>
      </NuxtLink>
      <nav aria-label="Main navigation">
        <NuxtLink to="/app">Back to practice ←</NuxtLink>
      </nav>
    </header>
    <main class="workspace sources-content">
      <p class="eyebrow">THE WORDS BEHIND THE PRACTICE</p>
      <h1>
        Open data.
        <br />
        <em>With due credit.</em>
      </h1>
      <p>
        Tsuzuru uses OpenJLPT data under CC BY-SA 4.0, incorporating JMdict and
        KANJIDIC2 from EDRDG, Jonathan Waller’s JLPT Resources, and sentences
        from Tatoeba contributors. Tsuzuru has reorganized example pairs for
        writing practice. JLPT labels are unofficial estimates.
      </p>
      <h2>Our sources</h2>
      <ul>
        <li>
          <a href="https://github.com/evanclan/OpenJLPT">
            OpenJLPT and its contributors
          </a>
          — vocabulary, kanji, grammar, and associated examples;
          <a href="https://creativecommons.org/licenses/by-sa/4.0/">
            CC BY-SA 4.0
          </a>
          .
        </li>
        <li>
          <a href="https://www.edrdg.org/edrdg/licence.html">
            EDRDG: JMdict and KANJIDIC2
          </a>
          — dictionary data and kanji information through OpenJLPT, plus JMdict
          spelling data used to generate verified writing variants.
        </li>
        <li>
          <a href="https://www.tanos.co.uk/jlpt/">
            Jonathan Waller’s JLPT Resources
          </a>
          — community vocabulary and kanji level assignments; CC BY as
          identified in the upstream notice.
        </li>
        <li>
          <a href="https://tatoeba.org/">Tatoeba and its contributors</a>
          — English–Japanese sentence examples;
          <a href="https://creativecommons.org/licenses/by/2.0/fr/">
            CC BY 2.0 FR
          </a>
          . Individual source links appear with each reference answer.
        </li>
      </ul>
      <p>
        Spelling analysis uses
        <a href="https://github.com/WorksApplications/sudachi.rs">SudachiPy</a>
        and
        <a href="https://github.com/WorksApplications/SudachiDict">
          SudachiDict
        </a>
        from Works Applications, including UniDic and NEologd data.
        <a href="/disclosures/sudachi-legal.txt">Dictionary notices</a>
        and the
        <a href="/disclosures/sudachi-license.txt">Apache 2.0 license</a>
        are retained. The
        <a href="/disclosures/spelling-variants.json" download>
          generated spelling bank
        </a>
        is available under CC BY-SA 4.0 with
        <a href="/disclosures/spelling-variants.md">
          source and maintenance details
        </a>
        . Sentence levels use the same tokenizer with OpenJLPT vocabulary; the
        <a href="/disclosures/sentence-levels.json" download>
          sentence level bank
        </a>
        is also available under CC BY-SA 4.0.
      </p>
      <h2>Reference practice, explained</h2>
      <p class="license-note">
        This is a beta exercise bank drawn from unreviewed sentence candidates.
        The level selector offers sentences whose listed vocabulary is at that
        level or easier. This is not a certified difficulty: kanji, grammar, and
        words outside the JLPT lists are not graded, so some sentences still
        contain harder kanji or grammar.
      </p>
      <p>
        The
        <a href="https://www.jlpt.jp/e/faq/">
          JLPT does not publish current vocabulary, kanji, or grammar lists
        </a>
        , and it does not test composition. Tsuzuru is an independent writing
        practice tool.
      </p>
      <p>
        Comparison checks the supplied reference and its annotated readings. It
        cannot judge every valid translation. Kana-only accepts hiragana and
        katakana. Flexible writing accepts the reference kanji or their supplied
        readings and verified spelling variants, independently of the
        alternative-translations setting. Ambiguous dictionary cases are held
        for review; it does not accept arbitrary kanji with the same sound.
        Exact writing preserves the reference script. All modes ignore spaces
        and common sentence punctuation.
      </p>
      <p>
        Only examples with complete, consistent reading annotations are
        currently used. Translations and readings may contain errors. Names,
        politeness, and omitted subjects can require context that an English
        prompt does not provide.
      </p>
      <h2>Added alternative answers</h2>
      <p>
        Pre-generated alternatives are Tsuzuru additions to the imported
        references. They come from rules that omit explicit first-person topics
        or vary integer spellings, and from AI-authored wording added during
        development. The original source files remain unchanged.
      </p>
      <p>
        Subject omission relies on the speaker being implied by the prompt.
        Number variants preserve the value and supplied readings; missing
        pronunciations are not guessed. Each alternative displays its creator
        and change explanation, and new Journal entries save those details.
        Original source attribution and sentence links are retained separately.
      </p>
      <p>
        These additions have not been independently checked by native speakers
        and may contain errors. Enabling alternatives accepts listed forms under
        your writing-mode settings; it does not assess every possible
        translation. An unlisted answer may still be valid.
      </p>
      <h2>License &amp; disclosure documents</h2>
      <p>
        The alternative-answer bank is distributed under CC BY-SA 4.0 with
        source attribution and modification notices. The learning data and
        adaptations retain their data licenses, separately from Tsuzuru’s MIT
        software license. No source organization endorses this app.
      </p>
      <ul>
        <li>
          <a href="/disclosures/data-disclosure.md">Full data disclosure</a>
        </li>
        <li>
          <a href="/disclosures/openjlpt-notice.md">
            Original source attribution notice
          </a>
        </li>
        <li>
          <a href="/disclosures/openjlpt-license.txt">Full OpenJLPT license</a>
        </li>
        <li>
          <a href="/disclosures/manifest.json">Import revision and checksums</a>
        </li>
        <li>
          <a href="/disclosures/accepted-alternatives.json">
            Pre-generated alternative answers (CC BY-SA 4.0)
          </a>
        </li>
      </ul>
      <h2>Your practice stays with you</h2>
      <p>
        Your latest 100 entries and preferences are stored in this browser.
        Clearing browser data removes them. Answers are sent to this app’s
        server for reference comparison; Tsuzuru does not persist answers on the
        server or send them to an AI service.
      </p>
      <NuxtLink class="primary-button" to="/app">
        Back to writing
        <span>→</span>
      </NuxtLink>
    </main>
    <footer class="page-footer">
      <span>綴る · TSUZURU</span>
      <span>A LITTLE PRACTICE, EVERY DAY.</span>
    </footer>
  </div>
</template>

<style scoped>
.sources-content {
  max-width: 780px;
  margin: 0 auto;
}
.sources-content h1 {
  font-size: clamp(40px, 6vw, 64px);
}
.sources-content h2 {
  margin-top: 30px;
  font:
    27px Georgia,
    serif;
}
.sources-content p,
.sources-content li {
  font:
    15px/1.8 system-ui,
    sans-serif;
  color: var(--secondary);
}
.sources-content li {
  margin-bottom: 10px;
}
.sources-content .license-note {
  padding: 22px;
  border-left: 2px solid var(--primary);
  background: rgba(251, 247, 232, 0.65);
}
</style>
