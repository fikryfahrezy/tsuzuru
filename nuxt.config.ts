import { preparePwa } from "./scripts/prepare-pwa";

export default defineNuxtConfig({
  compatibilityDate: "2026-10-13",
  devtools: { enabled: true },
  nitro: { preset: "bun" },
  typescript: { strict: true },
  css: ["~/assets/css/main.css"],
  routeRules: {
    "/sw.js": { headers: { "cache-control": "no-cache" } },
  },
  hooks: {
    "nitro:build:public-assets": async (nitro) => {
      await preparePwa(nitro.options.output.publicDir);
    },
  },
  app: {
    head: {
      title: "Tsuzuru",
      htmlAttrs: { lang: "en" },
      link: [{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
      script: [
        {
          defer: true,
          src: "https://analytics.fahrezy.work/script.js",
          "data-website-id": "c997d98f-8940-460e-900c-52a728ffd2cf",
        },
      ],
      meta: [
        {
          name: "description",
          content: "A space to practice Japanese writing.",
        },
      ],
    },
  },
});
