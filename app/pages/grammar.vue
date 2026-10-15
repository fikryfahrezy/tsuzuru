<script setup lang="ts">
import { useSeoMeta } from "#imports";
useSeoMeta({
  title: "Grammar reference — Tsuzuru",
  description:
    "Look up Japanese grammar patterns, formation rules, and examples from N5 to N1.",
});
</script>

<template>
  <div class="library-shell">
    <header class="library-heading">
      <NuxtLink to="/" class="brand">
        <span class="brand-mark" lang="ja">綴</span>
        Tsuzuru
      </NuxtLink>
      <NuxtLink to="/app">Go to practice →</NuxtLink>
    </header>
    <main><GrammarReference /></main>
  </div>
</template>

<style scoped>
.library-shell {
  height: 100dvh;
  display: flex;
  flex-direction: column;
  max-width: 780px;
  margin: auto;
  border-inline: 1px solid var(--line);
}
.library-heading {
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  border-bottom: 1px solid var(--line);
  font-size: 12px;
}
main {
  min-height: 0;
  flex: 1;
}
</style>
