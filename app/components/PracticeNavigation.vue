<script setup lang="ts">
import { PracticeTab } from "~/utils/practice";
defineProps<{ tab: PracticeTab; journalCount: number }>();
const emit = defineEmits<{ select: [tab: PracticeTab] }>();
</script>

<template>
  <aside class="workspace-rail" aria-label="Workspace navigation">
    <NuxtLink
      class="workspace-home"
      to="/"
      aria-label="Tsuzuru home"
      title="Back to home"
    >
      <span class="brand-mark" lang="ja">綴</span>
    </NuxtLink>
    <nav aria-label="Main navigation">
      <button
        :class="{ active: tab === PracticeTab.Practice }"
        :aria-pressed="tab === PracticeTab.Practice"
        @click="emit('select', PracticeTab.Practice)"
      >
        <span class="rail-mark" lang="ja" aria-hidden="true">文</span>
        <span>Practice</span>
      </button>
      <button
        :class="{ active: tab === PracticeTab.Journal }"
        :aria-pressed="tab === PracticeTab.Journal"
        @click="emit('select', PracticeTab.Journal)"
      >
        <span class="rail-mark" lang="ja" aria-hidden="true">記</span>
        <span>
          Journal
          <span class="nav-count">{{ journalCount }}</span>
        </span>
      </button>
      <NuxtLink
        class="reference-nav"
        to="/grammar"
        target="_blank"
        title="Open grammar library in a new tab"
      >
        <span class="rail-mark" lang="ja" aria-hidden="true">引</span>
        <span>Reference</span>
      </NuxtLink>
    </nav>
    <NuxtLink class="workspace-credits" to="/sources" title="Data and credits">
      <span aria-hidden="true">ⓘ</span>
      <span>Credits</span>
    </NuxtLink>
  </aside>
</template>

<style scoped>
.nav-count {
  margin-left: 6px;
  font-size: 9px;
}
.workspace-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 18px 6px;
  border-right: 1px solid var(--line);
  background: rgba(251, 247, 232, 0.45);
}
.workspace-home {
  text-decoration: none;
}
.workspace-home .brand-mark {
  width: 40px;
  height: 40px;
}
.workspace-rail nav {
  display: grid;
  gap: 10px;
  width: 100%;
}
.workspace-rail nav .reference-nav,
.workspace-rail nav button,
.workspace-credits {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 12px 3px;
  min-height: 65px;
  border: 1px solid transparent;
  background: none;
  font-size: 9px;
  color: var(--secondary);
  text-decoration: none;
}
.workspace-rail nav button.active {
  color: var(--primary);
  border-color: rgba(185, 51, 39, 0.25);
  background: rgba(185, 51, 39, 0.07);
}
.rail-mark {
  font:
    24px/1 "Yu Mincho",
    serif;
}
.workspace-rail .nav-count {
  margin-left: 2px;
  font-size: 8px;
}
.workspace-credits {
  margin-top: auto;
}
.workspace-credits > span:first-child {
  font-size: 22px;
}
@media (max-width: 640px) {
  .workspace-rail {
    grid-row: 2;
    flex-direction: row;
    justify-content: space-around;
    gap: 8px;
    padding: 5px max(8px, env(safe-area-inset-right))
      max(5px, env(safe-area-inset-bottom));
    border-right: 0;
    border-top: 1px solid var(--line);
  }
  .workspace-home .brand-mark {
    width: 34px;
    height: 34px;
    font-size: 23px;
  }
  .workspace-rail nav {
    display: flex;
    width: auto;
    flex: 1;
    justify-content: space-evenly;
    gap: 8px;
  }
  .workspace-rail nav .reference-nav,
  .workspace-rail nav button,
  .workspace-credits {
    min-height: 49px;
    min-width: 64px;
    padding: 5px 10px;
    gap: 4px;
  }
  .rail-mark {
    font-size: 19px;
  }
  .workspace-credits {
    margin: 0;
  }
  .workspace-credits > span:first-child {
    font-size: 18px;
  }
}
</style>
