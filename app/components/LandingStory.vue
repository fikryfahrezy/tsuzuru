<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import LandingReplica from "~/components/LandingReplica.vue";
import {
  STORY_UNITS,
  cameraAt,
  clamp,
  replicaAt,
  span,
  storyChapters,
  type Rect,
  type StoryTarget,
} from "~/utils/landing-story";

const STAGE: Rect = { x: 0, y: 0, width: 1280, height: 800 };
const FINALE = 12.3;

const section = ref<HTMLElement | null>(null);
const stage = ref<HTMLElement | null>(null);
const rig = ref<HTMLElement | null>(null);
const ring = ref<HTMLElement | null>(null);
const cursor = ref<HTMLElement | null>(null);
const replica = ref<InstanceType<typeof LandingReplica> | null>(null);

const ready = ref(false);
const units = ref(0);
const state = shallowRef(replicaAt(0));
const scroll = ref(0);

const active = computed(() =>
  storyChapters.find(
    (chapter) => units.value >= chapter.start && units.value < chapter.end,
  ),
);
const heroOut = computed(() => span(units.value, 0.2, 0.75));
const finale = computed(() => units.value >= FINALE);
const progress = computed(() => units.value / STORY_UNITS);

let frame = 0;
let current = 0;
let reduced = false;
let visible = false;
let observer: IntersectionObserver | null = null;

function lerpRect(a: Rect, b: Rect, t: number): Rect {
  const mix = (p: number, q: number) => p + (q - p) * t;
  return {
    x: mix(a.x, b.x),
    y: mix(a.y, b.y),
    width: mix(a.width, b.width),
    height: mix(a.height, b.height),
  };
}

// The part of the screen the camera frames, which shifts as the story moves
// from the hero, into the captioned walkthrough, and out to the finale.
function focusAt(u: number, width: number, height: number): Rect {
  const narrow = width < 760;
  const full = { x: 0, y: 0, width, height };
  const intro = narrow
    ? { x: 0, y: height * 0.5, width, height: height * 0.55 }
    : {
        x: width * 0.46,
        y: height * 0.1,
        width: width * 0.56,
        height: height * 0.85,
      };
  const side = narrow
    ? { x: 8, y: 80, width: width - 16, height: height * 0.56 - 80 }
    : { x: width * 0.4, y: 84, width: width * 0.53, height: height - 140 };
  const end = { x: 0, y: height * 0.42, width, height: height * 0.9 };
  let rect = lerpRect(intro, full, span(u, 0, 0.9));
  rect = lerpRect(rect, side, span(u, 1, 1.5));
  rect = lerpRect(rect, full, span(u, 11.9, 12.4));
  return lerpRect(rect, end, span(u, 12.4, 13.2));
}

function measure(target: StoryTarget): Rect {
  const root = replica.value?.$el as HTMLElement | undefined;
  const el = root?.querySelector<HTMLElement>(`[data-target="${target}"]`);
  if (!root || !el) return STAGE;
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== root) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  for (let a = el.parentElement; a && a !== root; a = a.parentElement) {
    y -= a.scrollTop;
  }
  return { x, y, width: el.offsetWidth, height: el.offsetHeight };
}

function place(el: HTMLElement | null, target: StoryTarget | null, pad = 0) {
  if (!el) return;
  if (!target) {
    el.style.opacity = "0";
    return;
  }
  const rect = measure(target);
  el.style.opacity = "1";
  el.style.width = `${rect.width + pad * 2}px`;
  el.style.height = `${rect.height + pad * 2}px`;
  el.style.transform = `translate(${rect.x - pad}px, ${rect.y - pad}px)`;
}

function scrollTarget() {
  const el = section.value;
  if (!el) return 0;
  const top = el.getBoundingClientRect().top;
  return clamp(-top / window.innerHeight, 0, STORY_UNITS);
}

function render() {
  const target = scrollTarget();
  current = reduced ? target : current + (target - current) * 0.12;
  if (Math.abs(target - current) < 0.0005) current = target;
  const u = current;
  if (Math.abs(units.value - u) > 0.004) units.value = u;

  const next = replicaAt(u);
  if (JSON.stringify(next) !== JSON.stringify(state.value)) state.value = next;
  const nextScroll = Math.round(span(u, 8.3, 9.5) * 200) / 200;
  if (nextScroll !== scroll.value) scroll.value = nextScroll;

  const view = stage.value;
  const el = rig.value;
  if (view && el) {
    const focus = focusAt(u, view.clientWidth, view.clientHeight);
    const camera = cameraAt(u, measure, STAGE, focus, reduced);
    el.style.transform =
      `translate3d(${focus.x + focus.width / 2}px, ${focus.y + focus.height / 2}px, 0)` +
      ` rotateX(${camera.rotateX}deg) rotateY(${camera.rotateY}deg)` +
      ` skewY(${camera.skew}deg) scale(${camera.scale})` +
      ` translate(${-camera.x}px, ${-camera.y}px)`;
    el.style.setProperty("--inverse", String(1 / camera.scale));
    el.style.opacity = String(1 - span(u, 12.6, 13.3) * 0.55);
    place(ring.value, next.highlight, 8);
    place(cursor.value, next.cursor);
    cursor.value?.classList.toggle("pressing", next.pressing);
  }
  frame = visible ? requestAnimationFrame(render) : 0;
}

function start() {
  if (!frame) frame = requestAnimationFrame(render);
}

function jump(at: number) {
  const el = section.value;
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({
    top: top + at * window.innerHeight,
    behavior: reduced ? "auto" : "smooth",
  });
}

onMounted(() => {
  reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  current = scrollTarget();
  observer = new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting);
    if (visible) start();
  });
  if (section.value) observer.observe(section.value);
  visible = true;
  render();
  ready.value = true;
});

onBeforeUnmount(() => {
  observer?.disconnect();
  cancelAnimationFrame(frame);
});

defineExpose({ jump });
</script>

<template>
  <section
    ref="section"
    class="story"
    :class="{ ready }"
    :style="{ '--units': STORY_UNITS }"
    aria-labelledby="hero-title"
  >
    <div ref="stage" class="stage">
      <div class="grain" aria-hidden="true"></div>
      <span
        v-for="chapter in storyChapters"
        :key="chapter.id"
        class="ghost-kanji"
        :class="{ active: active?.id === chapter.id }"
        lang="ja"
        aria-hidden="true"
      >
        {{ chapter.kanji }}
      </span>

      <div ref="rig" class="rig">
        <LandingReplica ref="replica" :state="state" :scroll="scroll" />
        <div class="spotlight" aria-hidden="true">
          <div ref="ring" class="ring"></div>
        </div>
        <div ref="cursor" class="cursor" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="26" height="26">
            <path
              d="M4 2l16 9.5-7 1.6 4.2 7.4-3 1.6-4.2-7.5L5 19z"
              fill="#1f1c17"
              stroke="#fbf7e8"
              stroke-width="1.5"
              stroke-linejoin="round"
            />
          </svg>
        </div>
      </div>
      <div
        class="veil"
        :style="{
          opacity: span(units, 1, 1.4) * (1 - span(units, 11.9, 12.3)),
        }"
        aria-hidden="true"
      ></div>

      <div
        class="hero"
        :style="{
          opacity: 1 - heroOut,
          transform: `translateY(${heroOut * -60}px)`,
          visibility: heroOut >= 1 ? 'hidden' : 'visible',
        }"
      >
        <p class="eyebrow">
          <span lang="ja">綴る</span>
          / A LITTLE PRACTICE, EVERY DAY
        </p>
        <h1 id="hero-title">
          <span class="line"><span>Japanese,</span></span>
          <span class="line"><em>one sentence</em></span>
          <span class="line"><em>at a time.</em></span>
        </h1>
        <p class="hero-lede">
          You know more words than you think. Tsuzuru gives them a place on the
          page: read an English sentence, write it in Japanese, and learn from
          the reference.
        </p>
        <div class="hero-actions">
          <NuxtLink class="primary-button" to="/app">
            Start practicing
            <span aria-hidden="true">→</span>
          </NuxtLink>
          <button type="button" class="text-action" @click="jump(1.5)">
            Watch it work
            <span aria-hidden="true">↓</span>
          </button>
        </div>
        <ul class="hero-notes" aria-label="Product highlights">
          <li>No account needed</li>
          <li>Free to practice</li>
          <li>In your browser</li>
        </ul>
      </div>
      <p
        class="scroll-cue"
        :style="{ opacity: 1 - span(units, 0, 0.3) }"
        aria-hidden="true"
      >
        SCROLL
        <i></i>
      </p>

      <div class="captions">
        <article
          v-for="chapter in storyChapters"
          :key="chapter.id"
          class="caption"
          :class="{ active: active?.id === chapter.id }"
          :aria-labelledby="`chapter-${chapter.id}`"
        >
          <p class="eyebrow">
            <span lang="ja" aria-hidden="true">{{ chapter.kanji }}</span>
            {{ chapter.eyebrow }}
          </p>
          <h2 :id="`chapter-${chapter.id}`" :aria-label="chapter.title">
            <span
              v-for="(word, index) in chapter.title.split(' ')"
              :key="index"
              class="word"
              :style="{ '--i': index }"
              aria-hidden="true"
            >
              <span>{{ word }}</span>
            </span>
          </h2>
          <p class="caption-body">{{ chapter.body }}</p>
        </article>
      </div>

      <nav
        class="chapters"
        :class="{ shown: active }"
        aria-label="Walkthrough chapters"
      >
        <span class="chapters-track" aria-hidden="true">
          <span :style="{ transform: `scaleY(${progress})` }"></span>
        </span>
        <button
          v-for="chapter in storyChapters"
          :key="chapter.id"
          type="button"
          :class="{ active: active?.id === chapter.id }"
          :aria-current="active?.id === chapter.id ? 'step' : undefined"
          :aria-label="chapter.title"
          @click="jump(chapter.start + 0.45)"
        >
          <span lang="ja" aria-hidden="true">{{ chapter.kanji }}</span>
        </button>
      </nav>
      <span class="mobile-progress" aria-hidden="true">
        <span :style="{ transform: `scaleX(${progress})` }"></span>
      </span>

      <div class="finale" :class="{ active: finale }">
        <p class="eyebrow">THE NEXT SENTENCE IS YOURS</p>
        <h2>
          <span class="line"><span>A little Japanese.</span></span>
          <span class="line"><em>A little every day.</em></span>
        </h2>
        <NuxtLink
          class="primary-button"
          to="/app"
          :tabindex="finale ? undefined : -1"
        >
          Open your practice space
          <span aria-hidden="true">→</span>
        </NuxtLink>
        <p>No account needed. Start with one sentence.</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.story {
  position: relative;
  height: calc((var(--units) + 1) * 100vh);
}
.stage {
  position: sticky;
  top: 0;
  height: 100vh;
  height: 100svh;
  overflow: hidden;
  perspective: 1800px;
  perspective-origin: 50% 45%;
}
.grain {
  position: absolute;
  inset: -50%;
  z-index: 5;
  pointer-events: none;
  opacity: 0.08;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  mix-blend-mode: multiply;
}
.ghost-kanji {
  position: absolute;
  left: -2vw;
  bottom: -9vh;
  color: rgba(185, 51, 39, 0.07);
  font:
    min(58vh, 44vw) / 1 "Hiragino Mincho ProN",
    "Yu Mincho",
    serif;
  opacity: 0;
  transform: translateY(6%) scale(0.96);
  transition:
    opacity 0.8s,
    transform 1.2s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: none;
}
.ghost-kanji.active {
  opacity: 1;
  transform: none;
}
.rig {
  position: absolute;
  top: 0;
  left: 0;
  width: 1280px;
  height: 800px;
  transform-origin: 0 0;
  will-change: transform;
  opacity: 0;
  box-shadow:
    0 0 0 1px rgba(31, 28, 23, 0.18),
    0 50px 120px rgba(53, 48, 39, 0.28);
}
.story:not(.ready) .rig {
  visibility: hidden;
}
.spotlight {
  position: absolute;
  inset: 0;
  z-index: 3;
  overflow: hidden;
  pointer-events: none;
}
.ring {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 3;
  pointer-events: none;
  border: calc(2px * var(--inverse, 1)) solid var(--primary);
  box-shadow: 0 0 0 200vmax rgba(31, 28, 23, 0.32);
  opacity: 0;
  transition:
    transform 0.5s cubic-bezier(0.65, 0, 0.35, 1),
    width 0.5s cubic-bezier(0.65, 0, 0.35, 1),
    height 0.5s cubic-bezier(0.65, 0, 0.35, 1),
    opacity 0.4s;
}
.ring::before,
.ring::after {
  content: "";
  position: absolute;
  width: calc(14px * var(--inverse, 1));
  height: calc(14px * var(--inverse, 1));
  border: inherit;
  border-width: 0;
}
.ring::before {
  top: calc(-7px * var(--inverse, 1));
  left: calc(-7px * var(--inverse, 1));
  border-top-width: calc(3px * var(--inverse, 1));
  border-left-width: calc(3px * var(--inverse, 1));
}
.ring::after {
  right: calc(-7px * var(--inverse, 1));
  bottom: calc(-7px * var(--inverse, 1));
  border-right-width: calc(3px * var(--inverse, 1));
  border-bottom-width: calc(3px * var(--inverse, 1));
}
.cursor {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 4;
  pointer-events: none;
  transition:
    transform 0.7s cubic-bezier(0.65, 0, 0.35, 1),
    opacity 0.3s;
}
.cursor svg {
  position: absolute;
  top: 50%;
  left: 50%;
  width: calc(26px * var(--inverse, 1));
  height: calc(26px * var(--inverse, 1));
  filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 0.25));
  transition: transform 0.15s;
}
.cursor::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: calc(40px * var(--inverse, 1));
  height: calc(40px * var(--inverse, 1));
  margin: calc(-20px * var(--inverse, 1));
  border-radius: 50%;
  background: rgba(185, 51, 39, 0.35);
  transform: scale(0);
  opacity: 0;
}
.cursor.pressing svg {
  transform: scale(0.85);
}
.cursor.pressing::after {
  animation: press 0.5s ease-out;
}
@keyframes press {
  from {
    transform: scale(0.2);
    opacity: 1;
  }
  to {
    transform: scale(1.4);
    opacity: 0;
  }
}
.veil {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: linear-gradient(
    90deg,
    var(--paper) 0%,
    var(--paper) 30%,
    rgba(227, 222, 208, 0.85) 36%,
    rgba(227, 222, 208, 0) 46%
  );
}
.hero,
.captions,
.finale,
.scroll-cue,
.chapters,
.mobile-progress {
  z-index: 6;
}
.hero {
  position: absolute;
  top: 50%;
  left: max(24px, calc((100vw - 1180px) / 2));
  width: min(540px, 42vw);
  margin-top: -10px;
  translate: 0 -50%;
}
.hero .eyebrow span {
  font-family: "Hiragino Mincho ProN", "Yu Mincho", serif;
  letter-spacing: 0.3em;
}
.line {
  display: block;
  overflow: hidden;
  padding-bottom: 0.08em;
}
.line > * {
  display: block;
  animation: line-in 1.1s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.line:nth-child(2) > * {
  animation-delay: 0.08s;
}
.line:nth-child(3) > * {
  animation-delay: 0.16s;
}
@keyframes line-in {
  from {
    transform: translateY(105%);
  }
}
.hero h1 {
  font-size: clamp(50px, 6.2vw, 94px);
  line-height: 0.96;
  margin-bottom: 26px;
}
.hero-lede {
  max-width: 440px;
  margin: 0 0 28px;
  color: var(--secondary);
  font:
    15px/1.8 system-ui,
    sans-serif;
  animation: fade-up 1s 0.3s both;
}
.hero-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 24px;
  animation: fade-up 1s 0.4s both;
}
@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
}
.primary-button {
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
.primary-button:hover {
  background: var(--primary);
  border-color: var(--primary);
}
.primary-button span {
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.primary-button:hover span {
  transform: translateX(4px);
}
.text-action {
  display: inline-flex;
  gap: 10px;
  padding: 8px 0;
  border: 0;
  border-bottom: 1px solid var(--line);
  background: none;
  color: var(--secondary);
  font-size: 10px;
}
.text-action:hover {
  color: var(--primary);
}
.hero-notes {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  list-style: none;
  margin: 26px 0 0;
  padding: 0;
  color: var(--secondary);
  font-size: 9px;
  animation: fade-up 1s 0.5s both;
}
.hero-notes li::before {
  content: "✓";
  margin-right: 6px;
  color: var(--green);
}
.scroll-cue {
  position: absolute;
  bottom: 22px;
  left: 50%;
  display: grid;
  justify-items: center;
  gap: 10px;
  margin: 0;
  translate: -50% 0;
  color: var(--muted);
  font-size: 8px;
  letter-spacing: 0.3em;
}
.scroll-cue i {
  width: 1px;
  height: 44px;
  background: linear-gradient(var(--primary), transparent);
  transform-origin: top;
  animation: cue 1.8s cubic-bezier(0.65, 0, 0.35, 1) infinite;
}
@keyframes cue {
  0% {
    transform: scaleY(0);
  }
  50% {
    transform: scaleY(1);
    transform-origin: top;
  }
  51% {
    transform-origin: bottom;
  }
  100% {
    transform: scaleY(0);
    transform-origin: bottom;
  }
}
.captions {
  position: absolute;
  top: 50%;
  left: max(24px, calc((100vw - 1180px) / 2));
  width: min(420px, 33vw);
  translate: 0 -50%;
  pointer-events: none;
}
.caption {
  position: absolute;
  top: 50%;
  left: 0;
  width: 100%;
  translate: 0 -50%;
  visibility: hidden;
  transition: visibility 0s 0.6s;
}
.caption.active {
  visibility: visible;
  transition: none;
}
.caption .eyebrow {
  display: flex;
  align-items: center;
  gap: 12px;
  opacity: 0;
  transition: opacity 0.4s;
}
.caption .eyebrow span {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--primary);
  font:
    16px "Hiragino Mincho ProN",
    "Yu Mincho",
    serif;
  letter-spacing: 0;
}
.caption h2 {
  margin: 0 0 20px;
  font:
    500 clamp(34px, 3.6vw, 54px) / 1.04 "Hiragino Mincho ProN",
    "Yu Mincho",
    Iowan Old Style,
    Georgia,
    serif;
  letter-spacing: -0.045em;
}
.word {
  display: inline-block;
  overflow: hidden;
  margin-right: 0.22em;
  padding-bottom: 0.1em;
  vertical-align: top;
}
.word > span {
  display: inline-block;
  transform: translateY(110%) rotate(4deg);
  transition: transform 0.5s cubic-bezier(0.7, 0, 0.84, 0);
}
.caption-body {
  max-width: 380px;
  margin: 0;
  color: var(--secondary);
  font:
    15px/1.8 system-ui,
    sans-serif;
  opacity: 0;
  transform: translateY(12px);
  transition:
    opacity 0.4s,
    transform 0.4s;
}
.caption.active .eyebrow {
  opacity: 1;
  transition-delay: 0.15s;
}
.caption.active .word > span {
  transform: none;
  transition: transform 0.9s cubic-bezier(0.16, 1, 0.3, 1);
  transition-delay: calc(0.3s + var(--i) * 0.045s);
}
.caption.active .caption-body {
  opacity: 1;
  transform: none;
  transition-duration: 0.8s;
  transition-delay: 0.35s;
}
.chapters {
  opacity: 0;
  transition: opacity 0.5s;
}
.chapters.shown {
  opacity: 1;
}
.chapters {
  position: absolute;
  top: 50%;
  right: max(16px, calc((100vw - 1260px) / 2));
  display: grid;
  gap: 6px;
  translate: 0 -50%;
}
.chapters-track {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  background: var(--line);
}
.chapters-track span {
  display: block;
  height: 100%;
  background: var(--primary);
  transform-origin: top;
}
.chapters button {
  position: relative;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--muted);
  font:
    14px "Hiragino Mincho ProN",
    "Yu Mincho",
    serif;
  transition:
    background 0.3s,
    color 0.3s,
    border-color 0.3s;
}
.chapters button:hover {
  border-color: var(--primary);
  color: var(--primary);
}
.chapters button.active {
  border-color: var(--primary);
  background: var(--primary);
  color: var(--surface);
}
.mobile-progress {
  display: none;
}
.finale {
  position: absolute;
  top: 9vh;
  left: 50%;
  width: min(760px, calc(100% - 32px));
  translate: -50% 0;
  text-align: center;
  visibility: hidden;
  transition: visibility 0s 0.6s;
}
.finale.active {
  visibility: visible;
  transition: none;
}
.finale h2 {
  margin: 0 0 30px;
  font:
    500 clamp(46px, 7vw, 104px) / 0.98 "Hiragino Mincho ProN",
    "Yu Mincho",
    Iowan Old Style,
    Georgia,
    serif;
  letter-spacing: -0.055em;
}
.finale h2 em {
  color: var(--primary);
  font-style: normal;
}
.finale .line > * {
  animation: none;
  transform: translateY(105%);
  transition: transform 0.5s cubic-bezier(0.7, 0, 0.84, 0);
}
.finale.active .line > * {
  transform: none;
  transition: transform 1.1s cubic-bezier(0.16, 1, 0.3, 1);
}
.finale.active .line:nth-child(2) > * {
  transition-delay: 0.1s;
}
.finale .eyebrow,
.finale .primary-button,
.finale > p:last-child {
  opacity: 0;
  transform: translateY(12px);
  transition:
    opacity 0.4s,
    transform 0.4s;
}
.finale.active .eyebrow,
.finale.active .primary-button,
.finale.active > p:last-child {
  opacity: 1;
  transform: none;
  transition-duration: 0.8s;
  transition-delay: 0.3s;
}
.finale > p:last-child {
  margin: 18px 0 0;
  color: var(--secondary);
  font-size: 10px;
}
@media (max-width: 760px) {
  .veil {
    background: linear-gradient(
      0deg,
      var(--paper) 0%,
      rgba(227, 222, 208, 0.95) 36%,
      rgba(227, 222, 208, 0) 46%
    );
  }
  .hero {
    top: 84px;
    left: 16px;
    width: calc(100% - 32px);
    margin: 0;
    translate: none;
  }
  .hero h1 {
    font-size: clamp(44px, 13vw, 64px);
    margin-bottom: 16px;
  }
  .hero-lede {
    font-size: 14px;
    margin-bottom: 18px;
  }
  .hero-notes {
    display: none;
  }
  .captions {
    top: auto;
    bottom: 28px;
    left: 16px;
    width: calc(100% - 32px);
    height: 37vh;
    translate: none;
  }
  .caption {
    top: auto;
    bottom: 0;
    translate: none;
  }
  .caption h2 {
    font-size: clamp(28px, 8vw, 38px);
    margin-bottom: 12px;
  }
  .caption-body {
    font-size: 14px;
    line-height: 1.7;
  }
  .chapters {
    display: none;
  }
  .mobile-progress {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    display: block;
    height: 2px;
    background: var(--line);
  }
  .mobile-progress span {
    display: block;
    height: 100%;
    background: var(--primary);
    transform-origin: left;
  }
  .ghost-kanji {
    bottom: auto;
    top: 30vh;
    font-size: 70vw;
  }
  .finale {
    top: 14vh;
  }
}
@media (max-width: 760px) and (max-height: 700px) {
  .hero-lede {
    display: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .stage *,
  .stage *::before,
  .stage *::after {
    animation: none !important;
    transition: none !important;
  }
}
</style>
