<script setup lang="ts">
import { useSeoMeta } from "#imports";
import { ref } from "vue";
import LandingStory from "~/components/LandingStory.vue";

useSeoMeta({
  title: "Tsuzuru — Japanese, one sentence at a time",
  description:
    "Build a Japanese writing habit with English sentence prompts, N5–N1 vocabulary practice, Guided or Challenge difficulty, a built-in grammar reference, answer breakdowns, and a personal practice journal. No account needed.",
  ogTitle: "Tsuzuru — Japanese, one sentence at a time",
  ogDescription:
    "A calm place to turn English sentences into Japanese. Choose your pace, write your answer, and learn from the reference.",
  ogType: "website",
});
const faqs = [
  {
    question: "Do I need an account?",
    answer:
      "No. Open the app and start practicing. Your preferences and your latest attempt at each sentence are saved in this browser.",
  },
  {
    question: "Can I write entirely in hiragana or katakana?",
    answer:
      "Yes. Kana only accepts either script. Kana + kanji lets you mix the reference kanji, their kana readings, and verified spelling variants. Exact writing asks you to match the reference’s spelling. Spaces and common sentence punctuation are ignored in every mode.",
  },
  {
    question: "Does a different answer mean my Japanese is wrong?",
    answer:
      "No. Japanese often has more than one valid translation. Tsuzuru compares your writing to a supplied reference and its readings; it does not judge every possible translation. Turn on pre-generated alternatives to accept more listed answers.",
  },
  {
    question: "What changes in Challenge mode?",
    answer:
      "Challenge hides romaji, English word hints, and the grammar reference while you practice. Answer breakdowns stay available after you check and in your journal.",
  },
  {
    question: "Can I practice offline?",
    answer:
      "Install Tsuzuru from your browser or add it to your home screen. Once loaded online, it reopens with your journal offline. New prompts and answer checks still need a connection.",
  },
  {
    question: "Are the N5–N1 levels official?",
    answer:
      "The labels are community estimates based on each sentence’s vocabulary and a reviewed set of grammar patterns. They are not certified difficulty levels, and the exercise bank is currently in beta and still needs language review.",
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
const story = ref<InstanceType<typeof LandingStory> | null>(null);
</script>

<template>
  <div class="landing-shell">
    <a class="skip-link" href="#main">Skip to content</a>
    <header class="landing-nav">
      <NuxtLink class="brand landing-brand" to="/" aria-label="Tsuzuru home">
        <span class="brand-mark" lang="ja" aria-hidden="true">綴</span>
        <span class="brand-name">
          tsuzuru
          <span class="brand-caption">JAPANESE WRITING PRACTICE</span>
        </span>
      </NuxtLink>
      <nav class="landing-links" aria-label="Main navigation">
        <button type="button" @click="story?.jump(1.5)">How it works</button>
        <a href="#faq">FAQ</a>
      </nav>
      <NuxtLink class="landing-open" to="/app">
        Open the app
        <span aria-hidden="true">↗</span>
      </NuxtLink>
    </header>
    <main id="main">
      <LandingStory ref="story" />
      <section
        id="faq"
        class="landing-faq landing-container"
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
          <NuxtLink class="primary-button" to="/app">
            Try your first sentence
            <span aria-hidden="true">→</span>
          </NuxtLink>
        </div>
      </section>
    </main>
    <footer class="page-footer landing-container">
      <span>綴る · TSUZURU</span>
      <span>JAPANESE, ONE SENTENCE AT A TIME.</span>
      <nav aria-label="Footer navigation">
        <NuxtLink to="/sources">DATA &amp; CREDITS ↗</NuxtLink>
        <NuxtLink to="/app">OPEN APP ↗</NuxtLink>
      </nav>
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
  z-index: 1000;
  top: 12px;
  left: 12px;
  padding: 10px 14px;
  background: var(--ink);
  color: var(--surface);
  text-decoration: none;
  transform: translateY(-150%);
}
.skip-link:focus {
  transform: translateY(0);
}
.landing-nav {
  position: absolute;
  z-index: 20;
  top: 0;
  right: 0;
  left: 0;
  display: flex;
  align-items: center;
  gap: 28px;
  padding: 22px max(24px, calc((100% - 1180px) / 2));
}
.landing-brand {
  font-size: 16px;
}
.skip-link:hover {
  color: var(--surface);
}
.landing-brand .brand-mark {
  width: 40px;
  height: 40px;
  font-size: 25px;
  line-height: 1;
}
.landing-links {
  display: flex;
  align-items: center;
  gap: 30px;
  margin-left: auto;
}
.landing-links a,
.landing-links button {
  padding: 0;
  border: 0;
  background: none;
  color: var(--secondary);
  font-size: 11px;
  text-decoration: none;
}
.landing-links a:hover,
.landing-links button:hover {
  color: var(--primary);
}
.landing-open {
  display: inline-flex;
  align-items: center;
  gap: 22px;
  padding: 12px 15px;
  border: 1px solid var(--ink);
  font-size: 10px;
  text-decoration: none;
}
.landing-open:hover {
  color: var(--primary);
  border-color: var(--primary);
}
.landing-faq {
  display: grid;
  grid-template-columns: 0.75fr 1.25fr;
  gap: 100px;
  padding-block: 110px;
  border-top: 1px solid var(--line);
}
.landing-faq h2 {
  margin: 0;
  font:
    500 clamp(35px, 4.5vw, 55px) / 1.05 "Hiragino Mincho ProN",
    "Yu Mincho",
    Iowan Old Style,
    Georgia,
    serif;
  letter-spacing: -0.045em;
}
.landing-faq h2 em {
  color: var(--primary);
  font-style: normal;
}
.text-action:hover {
  color: var(--primary);
}
.text-action {
  display: inline-flex;
  gap: 10px;
  margin-top: 23px;
  padding-block: 8px;
  border-bottom: 1px solid var(--line);
  text-decoration: none;
  font-size: 10px;
  color: var(--secondary);
}
.faq-list {
  border-top: 1px solid var(--line);
}
.faq-list details {
  border-bottom: 1px solid var(--line);
}
.faq-list summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  min-height: 72px;
  padding-block: 18px;
  cursor: pointer;
  list-style: none;
  font:
    15px/1.5 system-ui,
    sans-serif;
}
.faq-list summary:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 4px;
}
.faq-list summary::-webkit-details-marker {
  display: none;
}
.faq-list summary span {
  font:
    20px ui-monospace,
    monospace;
  color: var(--primary);
  transition: transform 0.3s;
}
.faq-list details[open] summary span {
  transform: rotate(45deg);
}
.faq-list p {
  max-width: 620px;
  margin: -3px 0 24px;
  padding-right: 45px;
  font:
    13px/1.75 system-ui,
    sans-serif;
  color: var(--secondary);
}
.faq-list .primary-button {
  margin-top: 36px;
  min-height: 52px;
  padding-inline: 22px;
  gap: 36px;
  font-weight: 500;
  background: var(--ink);
  border-color: var(--ink);
  font-size: 11px;
  text-decoration: none;
  transition:
    background 0.25s,
    border-color 0.25s;
}
.faq-list .primary-button span {
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.faq-list .primary-button:hover span {
  transform: translateX(4px);
}
.faq-list .primary-button:hover {
  background: var(--primary);
  border-color: var(--primary);
}
.landing-shell .page-footer {
  align-items: center;
  gap: 18px 24px;
  padding: 28px 0 36px;
  font-size: 9px;
  letter-spacing: 0.12em;
}
.landing-shell .page-footer nav {
  display: flex;
  gap: 24px;
}
.landing-shell .page-footer a {
  color: var(--secondary);
}
.landing-shell .page-footer a:hover {
  color: var(--primary);
}
@media (max-width: 980px) {
  .landing-faq {
    grid-template-columns: 1fr;
    gap: 52px;
  }
}
@media (max-width: 760px) {
  .landing-container {
    width: calc(100% - 32px);
  }
  .landing-nav {
    padding: 14px 16px;
  }
  .brand-name,
  .landing-links {
    display: none;
  }
  .landing-open {
    margin-left: auto;
  }
  .landing-faq {
    padding-block: 80px;
  }
  .faq-list summary {
    font-size: 14px;
  }
  .landing-shell .page-footer {
    flex-direction: column;
    align-items: flex-start;
  }
  .landing-shell .page-footer > span:nth-child(2) {
    display: inline;
  }
}
</style>

<style>
html:has(.landing-shell) {
  scroll-behavior: smooth;
}
.landing-shell .eyebrow {
  margin-bottom: 20px;
  font-size: 10px;
}
</style>
