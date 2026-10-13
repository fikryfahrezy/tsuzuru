export default defineNuxtConfig({
  compatibilityDate: "2026-10-13",
  devtools: { enabled: true },
  nitro: { preset: "bun" },
  typescript: { strict: true },
  css: ["~/assets/css/main.css"],
  app: {
    head: {
      title: "Tsuzuru",
      htmlAttrs: { lang: "en" },
      meta: [
        {
          name: "description",
          content: "A space to practice Japanese writing.",
        },
      ],
    },
  },
});
