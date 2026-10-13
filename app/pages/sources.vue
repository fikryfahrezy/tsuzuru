<template>
  <div class="app-shell">
    <header class="topbar">
      <NuxtLink to="/" class="brand"
        ><span class="brand-mark" lang="ja">綴</span
        ><span
          >tsuzuru<span class="brand-caption"
            >JAPANESE WRITING PRACTICE</span
          ></span
        ></NuxtLink
      >
      <nav aria-label="Main navigation">
        <NuxtLink to="/">Back to practice ←</NuxtLink>
      </nav>
    </header>
    <main class="workspace sources-content">
      <p class="eyebrow">THE WORDS BEHIND THE PRACTICE</p>
      <h1>Open data.<br /><em>With due credit.</em></h1>
      <p>
        Tsuzuru uses OpenJLPT data under CC BY-SA 4.0, incorporating JMdict and
        KANJIDIC2 from EDRDG, Jonathan Waller’s JLPT Resources, and sentences
        from Tatoeba contributors. Tsuzuru has reorganized example pairs for
        writing practice. JLPT labels are unofficial estimates.
      </p>
      <h2>Our sources</h2>
      <ul>
        <li>
          <a href="https://github.com/evanclan/OpenJLPT"
            >OpenJLPT and its contributors</a
          >
          — vocabulary, kanji, grammar, and associated examples;
          <a href="https://creativecommons.org/licenses/by-sa/4.0/"
            >CC BY-SA 4.0</a
          >.
        </li>
        <li>
          <a href="https://www.edrdg.org/edrdg/licence.html"
            >EDRDG: JMdict and KANJIDIC2</a
          >
          — dictionary data and kanji information, incorporated through
          OpenJLPT.
        </li>
        <li>
          <a href="https://www.tanos.co.uk/jlpt/"
            >Jonathan Waller’s JLPT Resources</a
          >
          — community vocabulary and kanji level assignments; CC BY as
          identified in the upstream notice.
        </li>
        <li>
          <a href="https://tatoeba.org/">Tatoeba and its contributors</a> —
          English–Japanese sentence examples;
          <a href="https://creativecommons.org/licenses/by/2.0/fr/"
            >CC BY 2.0 FR</a
          >. Individual source links appear with each reference answer.
        </li>
      </ul>
      <h2>Reference practice, explained</h2>
      <p class="license-note">
        This is a beta exercise bank drawn from unreviewed sentence candidates.
        The level selector chooses a target vocabulary level, not a certified
        difficulty for the entire sentence. Some sentences contain harder
        grammar or vocabulary.
      </p>
      <p>
        The
        <a href="https://www.jlpt.jp/e/faq/"
          >JLPT does not publish current vocabulary, kanji, or grammar lists</a
        >, and it does not test composition. Tsuzuru is an independent writing
        practice tool.
      </p>
      <p>
        Comparison checks the supplied reference and its annotated readings. It
        cannot judge every valid translation. Kana-only accepts hiragana and
        katakana. Flexible writing accepts the reference kanji or their supplied
        readings; it does not accept arbitrary kanji with the same sound. Exact
        writing preserves the reference script. All modes ignore spaces and
        common sentence punctuation.
      </p>
      <p>
        Only examples with complete, consistent reading annotations are
        currently used. Translations and readings may contain errors. Names,
        politeness, and omitted subjects can require context that an English
        prompt does not provide.
      </p>
      <h2>License &amp; disclosure documents</h2>
      <p>
        The learning data and adaptations retain their data licenses, separately
        from Tsuzuru’s MIT software license. No source organization endorses
        this app.
      </p>
      <ul>
        <li>
          <a href="/disclosures/data-disclosure.md">Full data disclosure</a>
        </li>
        <li>
          <a href="/disclosures/openjlpt-notice.md"
            >Original source attribution notice</a
          >
        </li>
        <li>
          <a href="/disclosures/openjlpt-license.txt">Full OpenJLPT license</a>
        </li>
        <li>
          <a href="/disclosures/manifest.json">Import revision and checksums</a>
        </li>
      </ul>
      <h2>Your practice stays with you</h2>
      <p>
        Your latest 100 entries and preferences are stored in this browser.
        Clearing browser data removes them. Answers are sent to this app’s
        server for reference comparison; Tsuzuru does not persist answers on the
        server or send them to an AI service.
      </p>
      <NuxtLink class="primary-button" to="/"
        >Back to writing <span>→</span></NuxtLink
      >
    </main>
    <footer class="page-footer">
      <span>綴る · TSUZURU</span><span>A LITTLE PRACTICE, EVERY DAY.</span>
    </footer>
  </div>
</template>
