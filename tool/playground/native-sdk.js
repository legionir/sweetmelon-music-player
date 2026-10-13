/**
 * -----------------------------------------------------------------------
 * SIMULATED SWEETMELON BRIDGE — for `npm run playground` only
 * -----------------------------------------------------------------------
 * Stands in for the core's `assets/www/js/native-sdk.js` so the app can be
 * exercised in a browser as if the plugins were there: the playback engine
 * goes through the same `audio` calls, positions arrive as `audio.position`
 * events, preferences are stored per key and the status pill turns green.
 *
 * Behaviour differences from the real bridge:
 *   - `filePicker` opens a file input and returns blob: URLs as paths
 *   - `backButton.pressed` fires on Escape instead of on the hardware key
 *   - nothing is remembered across page reloads except storage keys
 *
 * Never ship this file: a Sweetmelon build injects the real SDK and this
 * file lives outside app/ and www/.
 */
(function (global) {
  "use strict";

  var listeners = {};
  var state = {
    src: null,
    playing: false,
    positionMs: 0,
    durationMs: 0,
    volume: 1,
  };
  var element = null;
  var positionTimer = null;

  function log(plugin, method, args) {
    console.info("[bridge]", plugin + "." + method, args === undefined ? "" : args);
  }

  function emit(event, data) {
    (listeners[event] || []).slice().forEach(function (callback) {
      try {
        callback(data);
      } catch (error) {
        console.error("[bridge] listener for " + event + " failed", error);
      }
    });
  }

  function element_() {
    if (!element) {
      element = new Audio();
      element.preload = "metadata";
      element.addEventListener("timeupdate", function () {
        state.positionMs = element.currentTime * 1000;
      });
      element.addEventListener("loadedmetadata", function () {
        state.durationMs = (element.duration || 0) * 1000;
      });
      element.addEventListener("play", function () {
        state.playing = true;
        emit("audio.playerState", { state: "playing", isPlaying: true });
      });
      element.addEventListener("pause", function () {
        state.playing = false;
        emit("audio.playerState", { state: "paused", isPlaying: false });
      });
      element.addEventListener("ended", function () {
        state.playing = false;
        emit("audio.playerState", { state: "completed", isPlaying: false });
      });
      element.addEventListener("error", function () {
        state.playing = false;
        emit("audio.playerState", { state: "error", isPlaying: false });
      });
    }
    return element;
  }

  function startPositions() {
    if (positionTimer !== null) return;
    positionTimer = setInterval(function () {
      if (!state.playing) return;
      state.positionMs = element_().currentTime * 1000;
      emit("audio.position", {
        positionMs: Math.round(state.positionMs),
        positionSec: Math.round(state.positionMs / 1000),
      });
    }, 1000);
  }

  function stopPositions() {
    if (positionTimer === null) return;
    clearInterval(positionTimer);
    positionTimer = null;
  }

  /* ── storage: the same key/value shape as the plugin ── */
  var storagePrefix = "bridge_";
  function readKey(key) {
    var raw = global.localStorage.getItem(storagePrefix + key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw);
    } catch (_error) {
      return raw;
    }
  }

  var sdk = {
    waitForReady: function () {
      return Promise.resolve({ initialized: true, simulated: true });
    },
    info: function () {
      return { initialized: true, pendingRequests: 0, totalRequests: 0, version: "simulated" };
    },
    on: function (event, callback) {
      (listeners[event] = listeners[event] || []).push(callback);
    },
    off: function (event, callback) {
      listeners[event] = (listeners[event] || []).filter(function (entry) {
        return entry !== callback;
      });
    },
    call: function (request) {
      log(request.plugin, request.method, request.args);
      return Promise.resolve(null);
    },
    batch: function (requests) {
      return Promise.all(requests.map(sdk.call));
    },

    audio: {
      play: function (options) {
        log("audio", "play", options);
        var audio = element_();
        var source = (options && (options.url || options.path)) || state.src;
        if (!source) return Promise.resolve({ playing: false, reason: "no_source" });
        if (options && options.volume !== undefined) audio.volume = options.volume;
        if (source !== state.src) {
          state.src = source;
          audio.src = source;
        }
        startPositions();
        return audio
          .play()
          .then(function () {
            return { playing: true, source: source };
          })
          .catch(function () {
            return { playing: false };
          });
      },
      pause: function () {
        log("audio", "pause", {});
        element_().pause();
        return Promise.resolve({ paused: true });
      },
      resume: function () {
        log("audio", "resume", {});
        return element_()
          .play()
          .then(function () {
            return { resumed: true };
          })
          .catch(function () {
            return { resumed: false };
          });
      },
      stop: function () {
        log("audio", "stop", {});
        var audio = element_();
        audio.pause();
        audio.removeAttribute("src");
        state.src = null;
        state.playing = false;
        stopPositions();
        return Promise.resolve({ stopped: true });
      },
      seek: function (positionMs) {
        log("audio", "seek", positionMs);
        var audio = element_();
        audio.currentTime = positionMs / 1000;
        state.positionMs = positionMs;
        return Promise.resolve({ seeked: true, positionMs: positionMs });
      },
      isPlaying: function () {
        return Promise.resolve({ playing: state.playing });
      },
      getDuration: function () {
        return Promise.resolve({
          durationMs: Math.round(state.durationMs),
          durationSec: Math.round(state.durationMs / 1000),
        });
      },
      getPosition: function () {
        return Promise.resolve({
          positionMs: Math.round(state.positionMs),
          positionSec: Math.round(state.positionMs / 1000),
        });
      },
      setVolume: function (volume) {
        log("audio", "setVolume", volume);
        state.volume = volume;
        element_().volume = volume;
        return Promise.resolve({ volume: volume });
      },
    },

    storage: {
      get: function (key) {
        log("storage", "get", key);
        return Promise.resolve(readKey(key));
      },
      set: function (key, value) {
        log("storage", "set", key);
        global.localStorage.setItem(storagePrefix + key, JSON.stringify(value));
        return Promise.resolve(true);
      },
      remove: function (key) {
        log("storage", "remove", key);
        global.localStorage.removeItem(storagePrefix + key);
        return Promise.resolve(true);
      },
    },

    toast: {
      show: function (text, options) {
        log("toast", "show", text + " (" + ((options && options.duration) || "short") + ")");
        var host = document.createElement("div");
        host.textContent = text;
        host.style.cssText =
          "position:fixed;left:50%;bottom:7rem;transform:translateX(-50%);z-index:9999;" +
          "background:rgba(19,19,31,.95);color:#fff;border:1px solid rgba(255,255,255,.12);" +
          "padding:8px 16px;border-radius:999px;font:500 12px system-ui;pointer-events:none";
        document.body.appendChild(host);
        setTimeout(function () {
          host.remove();
        }, 2600);
        return Promise.resolve({ shown: true });
      },
    },

    wakeLock: {
      enable: function () {
        log("wakeLock", "enable", {});
        return Promise.resolve({ enabled: true });
      },
      disable: function () {
        log("wakeLock", "disable", {});
        return Promise.resolve({ enabled: false });
      },
    },

    share: {
      shareText: function (text, subject) {
        log("share", "shareText", text);
        if (global.navigator.clipboard) {
          return global.navigator.clipboard.writeText(text).then(function () {
            return { shared: true, subject: subject };
          });
        }
        return Promise.resolve({ shared: false });
      },
    },

    filePicker: {
      pickFiles: function (options) {
        log("filePicker", "pickFiles", options);
        return new Promise(function (resolve) {
          var input = document.createElement("input");
          input.type = "file";
          input.accept = "audio/*";
          if (options && options.multiple) input.multiple = true;
          input.onchange = function () {
            var files = Array.prototype.map.call(input.files, function (file) {
              return {
                name: file.name,
                path: global.URL.createObjectURL(file),
                size: file.size,
                extension: (file.name.split(".").pop() || "").toLowerCase(),
              };
            });
            resolve({ picked: files.length > 0, files: files, count: files.length });
          };
          input.click();
        });
      },
    },

    backButton: {
      enableIntercept: function () {
        log("backButton", "enableIntercept", {});
        intercepting = true;
        return Promise.resolve({ intercepting: true });
      },
      disableIntercept: function () {
        log("backButton", "disableIntercept", {});
        intercepting = false;
        return Promise.resolve({ intercepting: false });
      },
      minimizeApp: function () {
        log("backButton", "minimizeApp", {});
        return Promise.resolve({ minimized: true });
      },
      exitApp: function () {
        log("backButton", "exitApp", {});
        return Promise.resolve({ exited: true });
      },
    },

    haptic: {
      lightImpact: function () {
        log("haptic", "lightImpact", {});
        if (global.navigator.vibrate) global.navigator.vibrate(8);
        return Promise.resolve({ vibrated: true });
      },
    },
  };

  var intercepting = false;
  global.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && intercepting) {
      emit("backButton.pressed", { simulated: true });
    }
  });

  global.Native = {
    call: function (request) {
      var plugin = sdk[request.plugin];
      if (!plugin || typeof plugin[request.method] !== "function") {
        return Promise.reject(new Error("Unsupported call: " + request.plugin + "." + request.method));
      }
      return plugin[request.method](request.args || {});
    },
    batch: function (requests) {
      return Promise.all(requests.map(global.Native.call));
    },
    on: sdk.on,
    off: sdk.off,
    info: sdk.info,
  };
  global.NativeSDK = sdk;
})(window);
