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
      <NuxtLink class="brand" to="/" aria-label="Tsuzuru home">
        <span class="brand-mark" lang="ja">綴</span>
        <span>
          tsuzuru
          <span class="brand-caption">JAPANESE WRITING PRACTICE</span>
        </span>
      </NuxtLink>
      <nav aria-label="Main navigation">
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
  z-index: 30;
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
  position: fixed;
  z-index: 20;
  top: 0;
  left: 50%;
  display: flex;
  align-items: center;
  gap: 20px;
  width: min(1180px, calc(100% - 48px));
  height: 80px;
  translate: -50% 0;
}
.landing-nav nav {
  display: flex;
  gap: 26px;
  margin-left: auto;
  font-size: 11px;
}
.landing-nav nav a,
.landing-nav nav button {
  padding: 8px 0;
  border: 0;
  background: none;
  color: var(--secondary);
  font-size: 11px;
  text-decoration: none;
}
.landing-open {
  display: inline-flex;
  align-items: center;
  gap: 22px;
  padding: 12px 15px;
  border: 1px solid var(--ink);
  background: rgba(227, 222, 208, 0.7);
  backdrop-filter: blur(8px);
  text-decoration: none;
  font-size: 10px;
}
.landing-open:hover {
  background: var(--ink);
  color: var(--surface);
}
.landing-faq {
  display: grid;
  grid-template-columns: 0.8fr 1.2fr;
  gap: 80px;
  padding-block: 110px 96px;
  border-top: 1px solid var(--line);
  scroll-margin-top: 80px;
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
  transition: transform 0.3s;
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
.faq-list .primary-button {
  margin-top: 36px;
  min-height: 50px;
  padding-inline: 20px;
  background: var(--ink);
  border-color: var(--ink);
  font-size: 11px;
  text-decoration: none;
}
.faq-list .primary-button:hover {
  background: var(--primary);
  border-color: var(--primary);
}
@media (max-width: 760px) {
  .landing-container,
  .landing-nav {
    width: calc(100% - 32px);
  }
  .landing-nav {
    height: 64px;
  }
  .landing-nav nav,
  .brand-caption {
    display: none;
  }
  .landing-open {
    padding: 10px 11px;
    font-size: 9px;
    gap: 12px;
  }
  .landing-faq {
    grid-template-columns: 1fr;
    gap: 30px;
    padding-block: 64px;
  }
  .landing-shell .page-footer > span:nth-child(2) {
    display: none;
  }
}
</style>
