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
      <NuxtLink class="brand" to="/" aria-label="Tsuzuru home"
        ><span class="brand-mark" lang="ja">綴</span
        ><span
          >tsuzuru<span class="brand-caption"
            >JAPANESE WRITING PRACTICE</span
          ></span
        ></NuxtLink
      >
      <nav aria-label="Main navigation">
        <a href="#features">Features</a><a href="#how-it-works">How it works</a
        ><a href="#faq">FAQ</a>
      </nav>
      <NuxtLink class="landing-open" to="/app"
        >Open the app <span aria-hidden="true">↗</span></NuxtLink
      >
    </header>
    <main id="main">
      <section
        class="landing-hero landing-container"
        aria-labelledby="hero-title"
      >
        <div class="hero-copy">
          <p class="eyebrow">綴る / A LITTLE PRACTICE, EVERY DAY</p>
          <h1 id="hero-title">
            Japanese,<br /><em>one sentence<br />at a time.</em>
          </h1>
          <p class="hero-lede">
            You know more words than you think. Give them a place on the page. A
            calm space to turn English sentences into Japanese, and build a
            writing habit that stays with you.
          </p>
          <div class="hero-actions">
            <NuxtLink class="primary-button" to="/app"
              >Start practicing <span aria-hidden="true">→</span></NuxtLink
            ><a class="text-action" href="#how-it-works"
              >See how it works <span aria-hidden="true">↓</span></a
            >
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
              alt="Tsuzuru’s sentence practice app with vocabulary level, sentence length, and writing mode settings alongside a checked Japanese answer."
              width="2000"
              height="1600"
              fetchpriority="high"
              decoding="async"
            />
          </div>
          <div class="scene-note">
            <span lang="ja">一文ずつ</span>
            <p>One sentence.<br />One step forward.</p>
          </div>
          <p class="preview-caption">A GLIMPSE OF YOUR PRACTICE SPACE</p>
        </div>
      </section>
      <section
        class="landing-trust landing-container"
        aria-label="Practice highlights"
      >
        <div>
          <span>01</span><strong>From N5 to N1</strong
          ><small>Find your vocabulary focus</small>
        </div>
        <div>
          <span>02</span><strong>A page at your pace</strong
          ><small>Short, medium, or long sentences</small>
        </div>
        <div>
          <span>03</span><strong>A habit worth keeping</strong
          ><small>Your writing, saved in this browser</small>
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
              A small space.<br /><em>Room to grow.</em>
            </h2>
          </div>
          <p>
            Just enough structure to get you started.<br />Just enough freedom
            to make it yours.
          </p>
        </div>
        <div class="feature-grid">
          <article
            v-for="feature in features"
            :key="feature.number"
            class="feature-card"
          >
            <span class="feature-number">{{ feature.number }}</span
            ><span class="feature-mark" lang="ja" aria-hidden="true">{{
              feature.mark
            }}</span>
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
              Read. Write.<br /><em>Come back tomorrow.</em>
            </h2>
          </div>
          <NuxtLink class="text-action" to="/app"
            >Try your first sentence →</NuxtLink
          >
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
          <h2 id="journal-title">See how far<br />a sentence can take you.</h2>
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
          <h2 id="faq-title">A few things<br /><em>to know.</em></h2>
          <NuxtLink class="text-action" to="/sources"
            >Data &amp; credits ↗</NuxtLink
          >
        </div>
        <div class="faq-list">
          <details v-for="faq in faqs" :key="faq.question">
            <summary>
              {{ faq.question }}<span aria-hidden="true">+</span>
            </summary>
            <p>{{ faq.answer }}</p>
          </details>
        </div>
      </section>
      <section class="landing-final" aria-labelledby="final-title">
        <p class="eyebrow">THE NEXT SENTENCE IS YOURS</p>
        <h2 id="final-title">
          A little Japanese.<br /><em>A little every day.</em>
        </h2>
        <NuxtLink class="primary-button" to="/app"
          >Open your practice space <span aria-hidden="true">→</span></NuxtLink
        >
        <p>No account needed. Start with one sentence.</p>
      </section>
    </main>
    <footer class="page-footer landing-container">
      <span>綴る · TSUZURU</span><span>JAPANESE, ONE SENTENCE AT A TIME.</span
      ><NuxtLink to="/sources">DATA &amp; CREDITS ↗</NuxtLink>
    </footer>
  </div>
</template>
