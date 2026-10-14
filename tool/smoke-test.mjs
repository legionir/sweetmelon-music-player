#!/usr/bin/env node
/**
 * Boots a built app in a DOM (jsdom) and checks the integration:
 *
 *   node tool/build-playground.mjs && node tool/smoke-test.mjs        # playground: simulated bridge
 *   npm run build && node tool/smoke-test.mjs www                     # www: browser fallbacks
 *
 * With the simulated bridge (native mode) it proves the plugin calls happen:
 * audio.play for the track, setVolume, storage.set for the session, wakeLock
 * and haptic. With the placeholder SDK (web mode) it proves the app still
 * mounts, plays through <audio> and keeps state locally.
 *
 * Exits non-zero when the app does not mount, a call is missing or the page
 * throws.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundleDir = process.argv[2] ?? path.join(root, "playground");

const html = readFileSync(path.join(bundleDir, "index.html"), "utf8");
const sdk = readFileSync(path.join(bundleDir, "js", "native-sdk.js"), "utf8");
const nativeMode = !sdk.includes("__SWEETMELON_SDK_PLACEHOLDER__");

if (!html.includes('<script src="js/native-sdk.js"></script>')) {
  console.error("index.html does not load js/native-sdk.js — did the build change?");
  process.exit(1);
}
console.log(`Testing ${path.relative(root, bundleDir) || "."} — ${nativeMode ? "simulated bridge" : "web mode (placeholder SDK)"}`);
console.log("");

// jsdom does not execute <script type="module">, and the bundle sits in <head>
// where a classic script would run before #root exists. Move it to the end of
// <body> as a classic script: same code, same order (sdk, then bundle).
const OPEN = '<script type="module" crossorigin>';
const openAt = html.indexOf(OPEN);
const closeAt = html.indexOf("</script>", openAt);
if (openAt === -1 || closeAt === -1) {
  console.error("Could not find the module script in index.html — did the build change?");
  process.exit(1);
}
const bundle = html.slice(openAt + OPEN.length, closeAt);
const withoutBundle = html.slice(0, openAt) + html.slice(closeAt + "</script>".length);

/** Records bridge calls and every created <audio> element. */
const recorder = `
  window.__audios = [];
  (function () {
    var Original = window.Audio;
    function Tracked(source) {
      var element = new Original(source);
      window.__audios.push(element);
      return element;
    }
    Tracked.prototype = Original.prototype;
    window.Audio = Tracked;
  })();

  window.__calls = [];
  ["audio", "storage", "toast", "wakeLock", "share", "haptic"].forEach(function (plugin) {
    var target = window.NativeSDK && window.NativeSDK[plugin];
    if (!target) return;
    Object.keys(target).forEach(function (method) {
      var original = target[method];
      target[method] = function () {
        window.__calls.push({ plugin: plugin, method: method, args: arguments[0] });
        return original.apply(target, arguments);
      };
    });
  });
`;

const page = withoutBundle
  .replace(
    '<script src="js/native-sdk.js"></script>',
    `<script>${sdk}</script><script>${recorder}</script>`,
  )
  .replace("</body>", `<script>${bundle}</script></body>`);

const virtualConsole = new VirtualConsole();
const jsdomErrors = [];
virtualConsole.on("jsdomError", (error) => {
  // jsdom cannot play audio: that is expected here.
  if (/Not implemented/.test(error.message)) return;
  jsdomErrors.push(error.message);
});
virtualConsole.on("error", (message) => jsdomErrors.push(String(message)));

const dom = new JSDOM(page, {
  runScripts: "dangerously",
  pretendToBeVisual: true,
  url: "https://app.test/",
  virtualConsole,
});

const { window } = dom;
const document = window.document;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const text = () => document.getElementById("root")?.textContent ?? "";

const results = [];
function check(name, condition, detail = "") {
  results.push({ name, ok: Boolean(condition) });
  console.log(`${condition ? "ok  " : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function waitFor(predicate, timeoutMs = 4000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const value = predicate();
    if (value) return value;
    await sleep(60);
  }
  return null;
}

// 1. The app mounts and paints the library.
await waitFor(() => text().includes("Recently Added"));
check("app mounts and lists folders", text().includes("Recently Added"));
check(
  "library renders folder cards",
  text().includes("Favorites") && text().includes("Playlists"),
);
check(
  nativeMode ? "simulated bridge reported as native core" : "web mode reported in the header",
  nativeMode ? text().includes("Native core") : text().includes("Web preview"),
);

// 2. The session is persisted (storage plugin, or localStorage in web mode).
await sleep(700);
let prefs = null;
try {
  prefs =
    JSON.parse(
      window.localStorage.getItem(nativeMode ? "bridge_mmp.prefs" : "mmp.prefs") ?? "null",
    ) ?? null;
} catch {
  prefs = null;
}
check(
  nativeMode ? "session stored through the storage plugin" : "session stored locally",
  prefs !== null && typeof prefs.volume === "number",
  prefs ? `keys: ${Object.keys(prefs).join(", ")}` : "no stored preferences",
);

// 3. Playing a track reaches a player: audio plugin or <audio> element.
window.location.hash = "#/?folder=g-synthwave";
await waitFor(() => text().includes("Neon Horizon"));
const row = [...document.querySelectorAll("button")].find((button) =>
  button.textContent?.includes("Neon Horizon"),
);
check("folder view lists tracks", Boolean(row));
if (row) {
  row.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await waitFor(() => text().includes("soundhelix") || text().includes("No track selected") === false);
  await sleep(400);
}

const calls = window.__calls ?? [];
if (nativeMode) {
  const audioPlay = calls.find((call) => call.plugin === "audio" && call.method === "play");
  check(
    "audio plugin plays the track url",
    Boolean(audioPlay?.args?.url?.includes("soundhelix")),
    audioPlay ? String(audioPlay.args.url) : "no audio.play call",
  );
  check("volume set through the audio plugin", calls.some((call) => call.method === "setVolume"));
  check(
    "wake lock enabled while playing",
    calls.some((call) => call.plugin === "wakeLock" && call.method === "enable"),
  );
} else {
  const audio = (window.__audios ?? []).find((element) => element.src);
  check(
    "browser audio engine got the track source",
    Boolean(audio?.src?.includes("soundhelix")),
    audio?.src || "no <audio> element with a source",
  );
}
check("player bar shows the track", text().includes("Neon Horizon"));

// 4. Likes go through haptic + toast on a device, toast only in the browser.
const likeButton = [...document.querySelectorAll("button")].find(
  (button) => button.getAttribute("aria-label") === "Toggle like",
);
likeButton?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await waitFor(() => calls.some((call) => call.plugin === "haptic") || text().includes("Liked"));
check(
  nativeMode ? "like goes through the haptic plugin" : "like gives feedback in the app",
  nativeMode ? calls.some((call) => call.plugin === "haptic") : text().includes("Liked"),
);
check("no unexpected page errors", jsdomErrors.length === 0, jsdomErrors.slice(0, 2).join(" | "));

const failed = results.filter((result) => !result.ok);
console.log("");
console.log(`${results.length - failed.length}/${results.length} checks passed`);
window.close();
process.exit(failed.length === 0 ? 0 : 1);
