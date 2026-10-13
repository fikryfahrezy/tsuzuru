import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const source = await readFile(
  new URL("../scripts/pwa-worker.js", import.meta.url),
  "utf8",
);
const origin = "https://tsuzuru.example";

function worker(offline = false) {
  const listeners = new Map<string, (event: object) => void>();
  const stored = new Map<string, Response>();
  const deleted: string[] = [];
  const fetched: string[] = [];
  const cache = {
    async addAll(paths: string[]) {
      for (const path of paths) stored.set(path, new Response("asset"));
    },
    async put(path: string, response: Response) {
      stored.set(path, response);
    },
    async match(path: string) {
      return stored.get(path)?.clone();
    },
  };
  runInNewContext(
    source
      .replace("__PWA_VERSION__", "test")
      .replace('"__PWA_ASSETS__"', '"/_nuxt/app.js"'),
    {
      URL,
      Response,
      self: {
        location: { origin },
        clients: { claim: async () => {} },
        addEventListener: (name: string, handler: (event: object) => void) =>
          listeners.set(name, handler),
      },
      caches: {
        open: async () => cache,
        keys: async () => ["tsuzuru-app-old", "tsuzuru-app-test", "other-app"],
        delete: async (name: string) => deleted.push(name),
      },
      fetch: async (request: string | { url: string }) => {
        fetched.push(typeof request === "string" ? request : request.url);
        if (offline) throw new TypeError("Offline");
        return new Response("network");
      },
    },
  );
  function request(path: string, mode = "cors", method = "GET") {
    let response: Promise<Response> | undefined;
    listeners.get("fetch")!({
      request: { url: new URL(path, origin).href, mode, method },
      respondWith: (value: Promise<Response>) => (response = value),
    });
    return response;
  }
  async function lifecycle(name: string) {
    let pending: Promise<void> | undefined;
    listeners.get(name)!({
      waitUntil: (value: Promise<void>) => (pending = value),
    });
    await pending;
  }
  return { stored, deleted, fetched, request, lifecycle };
}

describe("practice PWA", () => {
  test("installation caches the shell and built assets", async () => {
    const sw = worker();
    await sw.lifecycle("install");
    expect(await sw.stored.get("/app")?.text()).toBe("network");
    expect(sw.stored.has("/_nuxt/app.js")).toBe(true);
  });

  test("offline navigation and assets use the current cache", async () => {
    const sw = worker(true);
    sw.stored.set("/app", new Response("workspace"));
    sw.stored.set("/_nuxt/app.js", new Response("script"));
    expect(
      await (await sw.request("/app?installed=1", "navigate"))?.text(),
    ).toBe("workspace");
    expect(await (await sw.request("/app/", "navigate"))?.text()).toBe(
      "workspace",
    );
    expect(await (await sw.request("/_nuxt/app.js"))?.text()).toBe("script");
  });

  test("online navigation fetches fresh HTML without replacing the cached build", async () => {
    const sw = worker();
    sw.stored.set("/app", new Response("old shell"));
    expect(await (await sw.request("/app", "navigate"))?.text()).toBe(
      "network",
    );
    expect(await sw.stored.get("/app")?.text()).toBe("old shell");
  });

  test("APIs, other pages, and external requests pass through", () => {
    const sw = worker();
    expect(sw.request("/api/exercises")).toBeUndefined();
    expect(sw.request("/api/compare", "cors", "POST")).toBeUndefined();
    expect(sw.request("/", "navigate")).toBeUndefined();
    expect(sw.request("/sources", "navigate")).toBeUndefined();
    expect(sw.request("https://other.example/_nuxt/app.js")).toBeUndefined();
  });

  test("activation removes only older Tsuzuru caches", async () => {
    const sw = worker();
    await sw.lifecycle("activate");
    expect(sw.deleted).toEqual(["tsuzuru-app-old"]);
  });

  test("failed offline installation does not activate an incomplete shell", async () => {
    await expect(worker(true).lifecycle("install")).rejects.toThrow("Offline");
  });
});
