/**
 * -----------------------------------------------------------------------
 * PLAYBACK ENGINES
 * -----------------------------------------------------------------------
 * The player context never talks to a player directly: it drives a
 * `PlaybackEngine`. On a device that engine is the core `audio` plugin
 * (`NativeSDK.audio.*` + the `audio.playerState` / `audio.position` events),
 * in a browser it is an `<audio>` element. The UI is identical in both.
 */
import type { Track } from "../types";
import { waitForBridge } from "./sdk";

export type EngineKind = "native" | "web";

export type EngineEvent =
  | { type: "position"; seconds: number }
  | { type: "duration"; seconds: number }
  | { type: "playing"; value: boolean }
  | { type: "loading"; value: boolean }
  | { type: "ended" };

export interface LoadOptions {
  /** Start position in seconds (0 = from the beginning). */
  startAt: number;
  /** 0..1 */
  volume: number;
}

export interface PlaybackEngine {
  readonly kind: EngineKind;
  /** Track id currently handed to the engine, null when nothing is loaded. */
  readonly loadedId: string | null;
  load(track: Track, options: LoadOptions): Promise<void>;
  resume(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  seek(seconds: number): Promise<void>;
  setVolume(value: number): Promise<void>;
  position(): Promise<number>;
  dispose(): void;
}

type Emit = (event: EngineEvent) => void;

function isRemoteSource(src: string): boolean {
  return /^https?:\/\//i.test(src);
}

interface MillisecondsPayload {
  positionMs?: number;
  positionSec?: number;
  durationMs?: number;
  durationSec?: number;
}

function secondsOf(payload: MillisecondsPayload | null): number {
  if (!payload) return 0;
  if (typeof payload.positionSec === "number") return payload.positionSec;
  if (typeof payload.durationSec === "number") return payload.durationSec;
  return ((payload.positionMs ?? payload.durationMs ?? 0) || 0) / 1000;
}

/**
 * Core `audio` plugin. `play({url})` streams a remote track, `play({path})`
 * plays a file on the device; progress comes from `audio.position` events and
 * a 1 s poll, because the plugin only pushes position events while playing.
 */
function createNativeEngine(emit: Emit): PlaybackEngine {
  let loadedId: string | null = null;
  let durationSec = 0;
  let ended = false;
  let lastPlaying: boolean | null = null;
  let suppressUntil = 0;
  let timer: number | null = null;

  const finish = () => {
    if (ended) return;
    ended = true;
    emit({ type: "ended" });
  };

  const setPlaying = (value: boolean, force = false) => {
    if (!force && lastPlaying === value) return;
    lastPlaying = value;
    emit({ type: "playing", value });
  };

  if (window.NativeSDK) {
    window.NativeSDK.on("audio.position", (data) => {
      const payload = data as { positionMs?: number; positionSec?: number };
      const seconds = secondsOf(payload);
      emit({ type: "position", seconds });
      if (durationSec > 0 && seconds >= durationSec - 0.6) finish();
    });

    window.NativeSDK.on("audio.playerState", (data) => {
      const payload = data as { state?: string };
      switch (payload?.state) {
        case "completed":
          finish();
          break;
        case "playing":
          setPlaying(true);
          break;
        case "paused":
          if (Date.now() >= suppressUntil) setPlaying(false);
          break;
        default:
          // "stopped" / "disposed" also fire while switching tracks: ignore.
          break;
      }
    });
  }

  const tick = async () => {
    if (!loadedId || ended || !window.NativeSDK) return;
    try {
      const position = await window.NativeSDK.audio.getPosition();
      const seconds = secondsOf(position);
      emit({ type: "position", seconds });

      if (durationSec === 0) {
        const duration = await window.NativeSDK.audio.getDuration();
        const value = secondsOf(duration);
        if (value > 0) {
          durationSec = value;
          emit({ type: "duration", seconds: value });
        }
      } else if (seconds >= durationSec - 1) {
        const state = await window.NativeSDK.audio.isPlaying();
        if (state?.playing === false) finish();
      }
    } catch {
      /* bridge busy: try again on the next tick */
    }
  };

  const startTimer = () => {
    if (timer !== null) return;
    timer = window.setInterval(() => void tick(), 1000);
  };

  return {
    kind: "native",
    get loadedId() {
      return loadedId;
    },

    async load(track, { startAt, volume }) {
      if (!window.NativeSDK) return;
      ended = false;
      lastPlaying = null;
      durationSec = track.duration > 0 ? track.duration : 0;
      suppressUntil = Date.now() + 800;
      emit({ type: "loading", value: true });
      startTimer();

      try {
        // Replace whatever was playing: `play` switches the source anyway.
        await window.NativeSDK.audio.stop();
        if (isRemoteSource(track.src)) {
          await window.NativeSDK.audio.play({ url: track.src, volume });
        } else {
          await window.NativeSDK.audio.play({ path: track.src, volume });
        }
        loadedId = track.id;
        if (startAt > 0.5) {
          await window.NativeSDK.audio.seek(Math.round(startAt * 1000));
        }
      } catch {
        emit({ type: "loading", value: false });
        return;
      }

      if (durationSec > 0) emit({ type: "duration", seconds: durationSec });
      emit({ type: "position", seconds: startAt });
      emit({ type: "loading", value: false });
      setPlaying(true, true);
    },

    async resume() {
      if (!window.NativeSDK) return;
      ended = false;
      suppressUntil = Date.now() + 500;
      try {
        await window.NativeSDK.audio.resume();
      } catch {
        /* ignore */
      }
      setPlaying(true, true);
    },

    async pause() {
      if (window.NativeSDK) {
        try {
          await window.NativeSDK.audio.pause();
        } catch {
          /* ignore */
        }
      }
      setPlaying(false, true);
    },

    async stop() {
      if (window.NativeSDK) {
        try {
          await window.NativeSDK.audio.stop();
        } catch {
          /* ignore */
        }
      }
      loadedId = null;
      setPlaying(false, true);
    },

    async seek(seconds) {
      if (!window.NativeSDK) return;
      try {
        await window.NativeSDK.audio.seek(Math.max(0, Math.round(seconds * 1000)));
        emit({ type: "position", seconds });
        ended = false;
      } catch {
        /* ignore */
      }
    },

    async setVolume(value) {
      if (!window.NativeSDK) return;
      try {
        await window.NativeSDK.audio.setVolume(Math.min(1, Math.max(0, value)));
      } catch {
        /* ignore */
      }
    },

    async position() {
      if (!window.NativeSDK) return 0;
      try {
        return secondsOf(await window.NativeSDK.audio.getPosition());
      } catch {
        return 0;
      }
    },

    dispose() {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
      loadedId = null;
    },
  };
}

/** Browser fallback: a plain `<audio>` element, used by the dev server. */
function createWebEngine(emit: Emit): PlaybackEngine {
  const audio = new Audio();
  audio.preload = "metadata";
  let loadedId: string | null = null;
  /** Swapping `src` fires a `pause` event; don't report that as "user paused". */
  let swappingSource = false;

  audio.addEventListener("timeupdate", () => {
    emit({ type: "position", seconds: audio.currentTime });
  });
  audio.addEventListener("durationchange", () => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      emit({ type: "duration", seconds: audio.duration });
    }
  });
  audio.addEventListener("playing", () => emit({ type: "playing", value: true }));
  audio.addEventListener("pause", () => {
    if (!swappingSource) emit({ type: "playing", value: false });
  });
  audio.addEventListener("waiting", () => emit({ type: "loading", value: true }));
  audio.addEventListener("canplay", () => emit({ type: "loading", value: false }));
  audio.addEventListener("ended", () => emit({ type: "ended" }));
  audio.addEventListener("error", () => emit({ type: "loading", value: false }));

  const playElement = async () => {
    try {
      await audio.play();
      emit({ type: "loading", value: false });
    } catch {
      emit({ type: "loading", value: false });
      emit({ type: "playing", value: false });
    }
  };

  return {
    kind: "web",
    get loadedId() {
      return loadedId;
    },

    async load(track, { startAt, volume }) {
      emit({ type: "loading", value: true });
      if (audio.src !== track.src && !audio.src.endsWith(track.src)) {
        swappingSource = true;
        audio.src = track.src;
        audio.load();
        window.setTimeout(() => {
          swappingSource = false;
        }, 300);
      }
      audio.volume = volume;
      loadedId = track.id;
      await playElement();
      if (startAt > 0.5) {
        audio.currentTime = startAt;
        emit({ type: "position", seconds: startAt });
      }
    },

    async resume() {
      await playElement();
    },

    async pause() {
      audio.pause();
    },

    async stop() {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      loadedId = null;
    },

    async seek(seconds) {
      audio.currentTime = Math.max(0, seconds);
      emit({ type: "position", seconds: Math.max(0, seconds) });
    },

    async setVolume(value) {
      audio.volume = Math.min(1, Math.max(0, value));
    },

    async position() {
      return audio.currentTime;
    },

    dispose() {
      audio.pause();
      audio.removeAttribute("src");
    },
  };
}

/** Picks the engine for the environment the app runs in. */
export async function createEngine(emit: Emit): Promise<PlaybackEngine> {
  const native = await waitForBridge();
  return native ? createNativeEngine(emit) : createWebEngine(emit);
}
