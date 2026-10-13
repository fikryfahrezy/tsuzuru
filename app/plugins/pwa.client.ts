import { defineNuxtPlugin } from "#app";

export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.dev || !("serviceWorker" in navigator)) return;

  let registering = false;
  const register = () => {
    if (registering || !/^\/app\/?$/.test(window.location.pathname)) return;
    registering = true;
    void navigator.serviceWorker
      .register("/sw.js", { scope: "/app", updateViaCache: "none" })
      .catch((error: unknown) => {
        registering = false;
        console.warn("Could not enable offline access to Tsuzuru.", error);
      });
  };

  nuxtApp.hook("app:mounted", register);
  nuxtApp.hook("page:finish", register);
});
