<script setup lang="ts">
import { useSeoMeta } from "#imports";

useSeoMeta({
  title: "Tsuzuru — Japanese, one sentence at a time",
  description:
    "Build a Japanese writing habit with English sentence prompts, N5–N1 vocabulary practice, flexible kana and kanji comparison, and a personal practice journal. No account needed.",
  ogTitle: "Tsuzuru — Japanese, one sentence at a time",
  ogDescription:
    "A calm place to turn English sentences into Japanese. Choose your pace, write your answer, and learn from the reference.",
  ogType: "website",
});
const features = [
  {
    number: "01",
    mark: "級",
    title: "Choose your starting point.",
    description:
      "Explore vocabulary from N5 through N1. Begin where you feel comfortable, then make room for something new.",
    note: "N5 / N4 / N3 / N2 / N1",
  },
  {
    number: "02",
    mark: "文",
    title: "Make time for one sentence.",
    description:
      "Pick a short prompt for a spare moment, or a longer sentence when you want to stretch. Your pace, your page.",
    note: "SHORT / MEDIUM / LONG",
  },
  {
    number: "03",
    mark: "字",
    title: "Write the way you’re learning.",
    description:
      "Start with kana, mix in kanji, or practice the exact reference spelling. Compare your writing without losing your train of thought.",
    note: "KANA / MIXED / EXACT",
  },
];
const steps = [
  {
    number: "01",
    title: "Set your pace",
    description:
      "Choose a vocabulary level, sentence length, and writing mode.",
  },
  {
    number: "02",
    title: "Find the Japanese",
    description:
      "Read the English prompt. Type your answer with your Japanese keyboard.",
  },
  {
    number: "03",
    title: "Compare. Keep going.",
    description:
      "See the reference and its kana reading. Revisit your writing in your journal.",
  },
];
const faqs = [
  {
    question: "Do I need an account?",
    answer:
      "No. Open the app and start practicing. Your preferences and latest 100 journal entries are saved in this browser.",
  },
  {
    question: "Can I write entirely in hiragana or katakana?",
    answer:
      "Yes. Kana-only mode accepts either script. Flexible mode lets you mix the reference kanji with their supplied kana readings. Exact mode asks you to match the reference’s spelling. Spaces and common sentence punctuation are ignored in every mode.",
  },
  {
    question: "Does a different answer mean my Japanese is wrong?",
    answer:
      "No. Japanese often has more than one valid translation. Tsuzuru compares your writing to a supplied reference and its readings; it does not judge every possible translation.",
  },
  {
    question: "Are the N5–N1 levels official?",
    answer:
      "The labels are community estimates for target vocabulary. They are not certified difficulty levels for whole sentences, and examples may contain harder grammar. The exercise bank is currently in beta and still needs language review.",
  },
  {
    question: "Can I draw characters by hand?",
    answer:
      "Tsuzuru currently uses typed Japanese input. You can use your device’s Japanese keyboard or handwriting keyboard to enter text. A drawing canvas is not part of the app yet.",
  },
  {
    question: "Where does the learning data come from?",
    answer:
      "OpenJLPT, incorporating EDRDG’s JMdict and KANJIDIC2, Jonathan Waller’s vocabulary lists, and Tatoeba sentence contributors. You can find source credits, licenses, and the full data disclosure on our Data & credits page.",
  },
];
</script>

<template>
  <div class="landing-shell">
    <a class="skip-link" href="#main">Skip to content</a>
    <header class="topbar landing-nav">
      <NuxtLink class="brand" to="/" aria-label="Tsuzuru home">
        <span class="brand-mark" lang="ja">綴</span>
        <span>
          tsuzuru
          <span class="brand-caption">JAPANESE WRITING PRACTICE</span>
        </span>
      </NuxtLink>
      <nav aria-label="Main navigation">
        <a href="#features">Features</a>
        <a href="#how-it-works">How it works</a>
        <a href="#faq">FAQ</a>
      </nav>
      <NuxtLink class="landing-open" to="/app">
        Open the app
        <span aria-hidden="true">↗</span>
      </NuxtLink>
    </header>
    <main id="main">
      <section
        class="landing-hero landing-container"
        aria-labelledby="hero-title"
      >
        <div class="hero-copy">
          <p class="eyebrow">綴る / A LITTLE PRACTICE, EVERY DAY</p>
          <h1 id="hero-title">
            Japanese,
            <br />
            <em>
              one sentence
              <br />
              at a time.
            </em>
          </h1>
          <p class="hero-lede">
            You know more words than you think. Give them a place on the page. A
            calm space to turn English sentences into Japanese, and build a
            writing habit that stays with you.
          </p>
          <div class="hero-actions">
            <NuxtLink class="primary-button" to="/app">
              Start practicing
              <span aria-hidden="true">→</span>
            </NuxtLink>
            <a class="text-action" href="#how-it-works">
              See how it works
              <span aria-hidden="true">↓</span>
            </a>
          </div>
          <ul class="hero-notes" aria-label="Product highlights">
            <li>No account needed</li>
            <li>Free to practice</li>
            <li>In your browser</li>
          </ul>
        </div>
        <div
          class="product-scene"
          aria-label="Screenshot of the Tsuzuru practice app"
        >
          <span class="scene-kanji" lang="ja" aria-hidden="true">綴</span>
          <div class="preview-window">
            <img
              class="preview-screenshot"
              src="/app-screenshot.webp"
              alt="Tsuzuru’s sentence practice app with vocabulary level, sentence length, and writing mode settings alongside a checked Japanese answer and a Grammar reference button."
              width="2000"
              height="1600"
              fetchpriority="high"
              decoding="async"
            />
          </div>
          <div class="scene-note">
            <span lang="ja">一文ずつ</span>
            <p>
              One sentence.
              <br />
              One step forward.
            </p>
          </div>
          <p class="preview-caption">A GLIMPSE OF YOUR PRACTICE SPACE</p>
        </div>
      </section>
      <section
        class="landing-trust landing-container"
        aria-label="Practice highlights"
      >
        <div>
          <span>01</span>
          <strong>From N5 to N1</strong>
          <small>Find your vocabulary focus</small>
        </div>
        <div>
          <span>02</span>
          <strong>A page at your pace</strong>
          <small>Short, medium, or long sentences</small>
        </div>
        <div>
          <span>03</span>
          <strong>A habit worth keeping</strong>
          <small>Your writing, saved in this browser</small>
        </div>
      </section>
      <section
        id="features"
        class="landing-features landing-section landing-container"
        aria-labelledby="features-title"
      >
        <div class="landing-section-heading">
          <div>
            <p class="eyebrow">LESS SETUP. MORE WRITING.</p>
            <h2 id="features-title">
              A small space.
              <br />
              <em>Room to grow.</em>
            </h2>
          </div>
          <p>
            Just enough structure to get you started.
            <br />
            Just enough freedom to make it yours.
          </p>
        </div>
        <div class="feature-grid">
          <article
            v-for="feature in features"
            :key="feature.number"
            class="feature-card"
          >
            <span class="feature-number">{{ feature.number }}</span>
            <span class="feature-mark" lang="ja" aria-hidden="true">
              {{ feature.mark }}
            </span>
            <h3>{{ feature.title }}</h3>
            <p>{{ feature.description }}</p>
            <span class="feature-note">{{ feature.note }}</span>
          </article>
        </div>
      </section>
      <section
        id="how-it-works"
        class="landing-process landing-section landing-container"
        aria-labelledby="process-title"
      >
        <div class="landing-section-heading">
          <div>
            <p class="eyebrow">A SIMPLE DAILY RITUAL</p>
            <h2 id="process-title">
              Read. Write.
              <br />
              <em>Come back tomorrow.</em>
            </h2>
          </div>
          <NuxtLink class="text-action" to="/app">
            Try your first sentence →
          </NuxtLink>
        </div>
        <ol class="process-steps">
          <li v-for="step in steps" :key="step.number">
            <span>{{ step.number }} /</span>
            <h3>{{ step.title }}</h3>
            <p>{{ step.description }}</p>
          </li>
        </ol>
      </section>
      <section
        class="journal-promo landing-container"
        aria-labelledby="journal-title"
      >
        <div class="journal-stamp" lang="ja" aria-hidden="true">記</div>
        <div>
          <p class="eyebrow">YOUR WORDS HAVE A HOME</p>
          <h2 id="journal-title">
            See how far
            <br />
            a sentence can take you.
          </h2>
        </div>
        <div>
          <p>
            Your journal keeps your latest 100 entries, so you can look back at
            your writing and learn from the references. No account to set up. No
            streak to protect.
          </p>
          <p class="journal-promo-note">
            History stays in this browser. Answers go to the app server for
            comparison, without being saved there.
          </p>
        </div>
      </section>
      <section
        id="faq"
        class="landing-faq landing-section landing-container"
        aria-labelledby="faq-title"
      >
        <div>
          <p class="eyebrow">BEFORE YOUR FIRST SENTENCE</p>
          <h2 id="faq-title">
            A few things
            <br />
            <em>to know.</em>
          </h2>
          <NuxtLink class="text-action" to="/sources">
            Data &amp; credits ↗
          </NuxtLink>
        </div>
        <div class="faq-list">
          <details v-for="faq in faqs" :key="faq.question">
            <summary>
              {{ faq.question }}
              <span aria-hidden="true">+</span>
            </summary>
            <p>{{ faq.answer }}</p>
          </details>
        </div>
      </section>
      <section class="landing-final" aria-labelledby="final-title">
        <p class="eyebrow">THE NEXT SENTENCE IS YOURS</p>
        <h2 id="final-title">
          A little Japanese.
          <br />
          <em>A little every day.</em>
        </h2>
        <NuxtLink class="primary-button" to="/app">
          Open your practice space
          <span aria-hidden="true">→</span>
        </NuxtLink>
        <p>No account needed. Start with one sentence.</p>
      </section>
    </main>
    <footer class="page-footer landing-container">
      <span>綴る · TSUZURU</span>
      <span>JAPANESE, ONE SENTENCE AT A TIME.</span>
      <NuxtLink to="/sources">DATA &amp; CREDITS ↗</NuxtLink>
    </footer>
  </div>
</template>

<style scoped>
.landing-shell {
  overflow: clip;
}
.landing-container {
  width: min(1180px, calc(100% - 48px));
  margin-inline: auto;
}
.skip-link {
  position: fixed;
  z-index: 10;
  top: 10px;
  left: 10px;
  padding: 12px;
  background: var(--surface);
  transform: translateY(-200%);
}
.skip-link:focus {
  transform: translateY(0);
}
.landing-nav {
  width: min(1180px, calc(100% - 48px));
}
.landing-open {
  display: inline-flex;
  align-items: center;
  gap: 22px;
  padding: 12px 15px;
  border: 1px solid var(--ink);
  text-decoration: none;
  font-size: 10px;
}
.landing-nav nav {
  margin-left: auto;
  margin-right: 22px;
}
.landing-hero {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  gap: 54px;
  min-height: min(720px, calc(100dvh - 96px));
  padding-block: 65px 80px;
}
.landing-hero h1 {
  font-size: clamp(52px, 6.3vw, 84px);
  line-height: 0.98;
  margin-bottom: 29px;
}
.hero-lede {
  max-width: 475px;
  font:
    15px/1.85 system-ui,
    sans-serif;
  color: var(--secondary);
  margin-bottom: 28px;
}
.hero-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 25px;
}
.hero-actions .primary-button {
  min-height: 50px;
  background: var(--ink);
  border-color: var(--ink);
  font-size: 11px;
  padding-inline: 20px;
  gap: 34px;
  text-decoration: none;
}
.text-action {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding-block: 8px;
  border-bottom: 1px solid var(--line);
  text-decoration: none;
  font-size: 10px;
  color: var(--secondary);
}
.hero-notes {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  list-style: none;
  padding: 0;
  margin: 23px 0 0;
  font-size: 9px;
  color: var(--secondary);
}
.hero-notes li::before {
  content: "✓";
  margin-right: 6px;
  color: var(--green);
}
.product-scene {
  position: relative;
  min-width: 0;
  padding-block: 55px 35px;
}
.scene-kanji {
  position: absolute;
  top: -10px;
  right: -25px;
  color: rgba(185, 51, 39, 0.085);
  font:
    220px/1 "Yu Mincho",
    "Hiragino Mincho ProN",
    serif;
}
.preview-window {
  position: relative;
  z-index: 1;
  border: 1px solid rgba(31, 28, 23, 0.24);
  background: var(--surface);
  box-shadow: 0 30px 65px rgba(53, 48, 39, 0.12);
  transform: rotate(-2deg);
}
.preview-screenshot {
  display: block;
  width: 100%;
  height: auto;
}
.scene-note {
  position: relative;
  z-index: 2;
  display: flex;
  gap: 17px;
  align-items: center;
  width: fit-content;
  margin: -8px -16px 0 auto;
  padding: 18px 23px;
  border: 1px solid var(--line);
  background: #eee7d7;
  transform: rotate(4deg);
  box-shadow: 0 10px 30px rgba(53, 48, 39, 0.05);
}
.scene-note > span {
  writing-mode: vertical-rl;
  color: var(--primary);
  font:
    22px "Yu Mincho",
    serif;
  letter-spacing: 0.14em;
}
.scene-note p {
  margin: 0;
  font:
    italic 15px/1.5 Georgia,
    serif;
}
.preview-caption {
  margin: 22px 0 0;
  color: var(--muted);
  font-size: 7px;
  letter-spacing: 0.14em;
}
.landing-trust {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border-block: 1px solid var(--line);
  padding: 27px 0;
}
.landing-trust > div {
  display: grid;
  grid-template-columns: 34px 1fr;
  gap: 8px;
  padding-left: 32px;
  border-left: 1px solid var(--line);
}
.landing-trust > div:first-child {
  padding-left: 0;
  border: 0;
}
.landing-trust span {
  grid-row: span 2;
  color: var(--primary);
  font-size: 9px;
  padding-top: 3px;
}
.landing-trust strong {
  font-size: 11px;
  font-weight: 500;
}
.landing-trust small {
  font:
    12px/1.5 system-ui,
    sans-serif;
  color: var(--secondary);
}
.landing-section {
  padding-block: 96px;
  scroll-margin-top: 24px;
}
.landing-section-heading {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 32px;
  margin-bottom: 44px;
}
.landing-section-heading .eyebrow {
  margin-bottom: 12px;
}
.landing-section h2,
.journal-promo h2,
.landing-final h2 {
  margin: 0;
  font:
    500 clamp(35px, 4.5vw, 55px)/1.05 "Hiragino Mincho ProN",
    "Yu Mincho",
    Iowan Old Style,
    Georgia,
    serif;
  letter-spacing: -0.045em;
}
.landing-section h2 em,
.landing-final h2 em {
  color: var(--primary);
  font-style: normal;
}
.landing-section-heading > p {
  margin: 0;
  font:
    14px/1.8 system-ui,
    sans-serif;
  color: var(--secondary);
}
.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border: 1px solid var(--line);
  background: rgba(251, 247, 232, 0.5);
}
.feature-card {
  display: flex;
  flex-direction: column;
  padding: 28px 30px 30px;
  border-right: 1px solid var(--line);
}
.feature-card:last-child {
  border: 0;
}
.feature-number {
  font-size: 9px;
  color: var(--muted);
}
.feature-mark {
  margin: 31px 0 30px;
  font:
    47px/1 "Yu Mincho",
    serif;
  color: var(--primary);
}
.feature-card h3 {
  margin: 0 0 15px;
  font:
    21px/1.25 Georgia,
    serif;
}
.feature-card p {
  color: var(--secondary);
  font:
    14px/1.8 system-ui,
    sans-serif;
  margin-bottom: 26px;
}
.feature-note {
  margin-top: auto;
  padding-top: 19px;
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: 8px;
  letter-spacing: 0.08em;
}
.landing-process {
  border-top: 1px solid var(--line);
}
.process-steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 48px;
  list-style: none;
  padding: 0;
  margin: 0;
}
.process-steps li {
  padding-top: 20px;
  border-top: 1px solid var(--line);
}
.process-steps li > span {
  color: var(--primary);
  font-size: 10px;
}
.process-steps h3 {
  font:
    25px/1.3 Georgia,
    serif;
  margin: 28px 0 13px;
}
.process-steps p {
  margin: 0;
  font:
    14px/1.8 system-ui,
    sans-serif;
  color: var(--secondary);
}
.journal-promo {
  display: grid;
  grid-template-columns: auto 1fr 1fr;
  gap: 40px;
  align-items: center;
  padding: 48px;
  border: 1px solid var(--line);
  background: rgba(251, 247, 232, 0.55);
}
.journal-stamp {
  display: grid;
  place-items: center;
  width: 68px;
  height: 80px;
  border: 1px solid var(--primary);
  outline: 1px solid var(--primary);
  outline-offset: -5px;
  color: var(--primary);
  font:
    45px "Yu Mincho",
    serif;
  transform: rotate(-4deg);
}
.journal-promo h2 {
  font-size: clamp(30px, 3vw, 39px);
}
.journal-promo p {
  color: var(--secondary);
  font:
    14px/1.8 system-ui,
    sans-serif;
  margin-bottom: 13px;
}
.journal-promo .eyebrow {
  font:
    9px/1.5 ui-monospace,
    monospace;
  color: var(--primary);
  letter-spacing: 0.12em;
}
.journal-promo .journal-promo-note {
  font-size: 11px;
  margin-bottom: 0;
}
.landing-faq {
  display: grid;
  grid-template-columns: 0.8fr 1.2fr;
  gap: 80px;
}
.landing-faq .text-action {
  margin-top: 23px;
}
.faq-list {
  border-top: 1px solid var(--line);
}
.faq-list details {
  border-bottom: 1px solid var(--line);
  padding-block: 20px;
}
.faq-list summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  cursor: pointer;
  list-style: none;
  font:
    15px/1.5 system-ui,
    sans-serif;
}
.faq-list summary::-webkit-details-marker {
  display: none;
}
.faq-list summary span {
  font:
    20px ui-monospace,
    monospace;
  color: var(--primary);
}
.faq-list details[open] summary span {
  transform: rotate(45deg);
}
.faq-list p {
  margin: 15px 30px 0 0;
  font:
    14px/1.8 system-ui,
    sans-serif;
  color: var(--secondary);
}
.landing-final {
  padding: 72px 24px 85px;
  text-align: center;
  border-top: 1px solid var(--line);
  background: rgba(251, 247, 232, 0.36);
}
.landing-final .primary-button {
  margin-top: 32px;
  min-height: 50px;
  padding-inline: 22px;
  background: var(--ink);
  border-color: var(--ink);
  text-decoration: none;
  font-size: 11px;
}
.hero-actions .primary-button:hover:not(:disabled),
.landing-final .primary-button:hover:not(:disabled) {
  background: var(--primary);
  border-color: var(--primary);
  color: var(--surface);
}
.landing-final > p:last-child {
  margin: 18px 0 0;
  font-size: 9px;
  color: var(--secondary);
}
@media (max-width: 950px) {
  .landing-hero {
    gap: 30px;
  }
  .landing-hero h1 {
    font-size: 60px;
  }
  .landing-nav nav {
    gap: 18px;
    margin-right: 0;
  }
  .landing-open {
    gap: 12px;
  }
  .hero-notes {
    gap: 12px;
    font-size: 8px;
  }
  .landing-trust > div {
    padding-left: 18px;
    grid-template-columns: 25px 1fr;
  }
  .feature-card {
    padding: 24px;
  }
  .journal-promo {
    grid-template-columns: auto 1fr;
    padding: 32px;
    gap: 30px;
  }
  .journal-promo > div:last-child {
    grid-column: 2;
  }
  .landing-faq {
    gap: 40px;
  }
}
@media (max-width: 700px) {
  .landing-container,
  .landing-nav {
    width: calc(100% - 32px);
  }
  .landing-nav {
    min-height: 92px;
    gap: 15px;
    padding-block: 18px;
    flex-wrap: nowrap;
  }
  .landing-nav nav {
    display: none;
  }
  .landing-open {
    padding: 11px;
    font-size: 9px;
    gap: 12px;
  }
  .landing-hero {
    grid-template-columns: minmax(0, 1fr);
    gap: 25px;
    padding-block: 45px 30px;
  }
  .landing-hero h1 {
    font-size: clamp(52px, 10vw, 72px);
  }
  .hero-lede {
    font-size: 14px;
  }
  .hero-actions {
    gap: 20px;
  }
  .hero-notes {
    gap: 16px;
  }
  .product-scene {
    width: min(500px, 100%);
    margin-inline: auto;
    padding: 30px 7px;
  }
  .scene-kanji {
    top: 0;
    right: 0;
    font-size: 160px;
  }
  .scene-note {
    margin-right: -2px;
    padding: 14px 18px;
  }
  .preview-caption {
    margin-top: 15px;
  }
  .landing-trust {
    grid-template-columns: 1fr;
    gap: 20px;
    padding-block: 25px;
  }
  .landing-trust > div {
    border-left: 0;
    padding-left: 0;
    grid-template-columns: 30px 1fr;
    gap: 6px;
  }
  .landing-section {
    padding-block: 55px;
  }
  .landing-section-heading {
    flex-direction: column;
    align-items: start;
    gap: 23px;
    margin-bottom: 30px;
  }
  .feature-grid {
    grid-template-columns: 1fr;
  }
  .feature-card {
    padding: 25px;
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }
  .feature-mark {
    margin: 22px 0;
    font-size: 39px;
  }
  .feature-card h3 {
    font-size: 23px;
  }
  .feature-card p {
    margin-bottom: 20px;
  }
  .process-steps {
    grid-template-columns: 1fr;
    gap: 25px;
  }
  .process-steps h3 {
    margin-top: 18px;
  }
  .journal-promo {
    padding: 28px 22px;
    gap: 22px;
  }
  .journal-stamp {
    width: 48px;
    height: 63px;
    font-size: 32px;
  }
  .journal-promo h2 {
    font-size: 29px;
  }
  .journal-promo > div:last-child {
    grid-column: 1/-1;
  }
  .landing-faq {
    grid-template-columns: 1fr;
    gap: 30px;
  }
  .landing-final {
    padding-block: 55px;
  }
  .landing-shell .page-footer > span:nth-child(2) {
    display: none;
  }
}
</style>
