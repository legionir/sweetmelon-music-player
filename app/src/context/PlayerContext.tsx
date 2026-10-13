import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { PlayerPrefs, RepeatMode, Track } from "../types";
import { createEngine, type EngineEvent, type EngineKind, type PlaybackEngine } from "../native/engine";
import { hapticTap, notify, shareText } from "../native/notify";
import { bridgeStatus, setWakeLock } from "../native/plugins";
import type { BridgeStatus } from "../native/sdk";
import { hydrateLibrary, libraryService, noteTrackDuration, trackById } from "../data/library";
import { loadPlayerPrefs, savePlayerPrefs } from "../data/userStore";

/**
 * -----------------------------------------------------------------------
 * PLAYER CONTEXT — the single source of truth for playback.
 * -----------------------------------------------------------------------
 * Every control in the UI reads/writes through this context instead of
 * touching a player directly. Under the hood it drives a `PlaybackEngine`:
 * the core `audio` plugin on a device, an `<audio>` element in a browser.
 *
 * The bridge also carries the app's state: likes, queue, shuffle/repeat,
 * volume and the playback position live in the core `storage` plugin, the
 * screen stays awake through `wake_lock` while a track plays, and `toast` /
 * `haptic` / `share` give feedback the native way.
 * -----------------------------------------------------------------------
 */

interface PlayerContextValue {
  queue: Track[];
  originalQueue: Track[];
  currentTrack: Track | null;
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  isLoading: boolean;
  /** Where playback goes and whether the native bridge answered. */
  bridge: BridgeStatus;
  engineKind: EngineKind | null;
  ready: boolean;
  /** Replaces the queue and starts playing a track (defaults to first item). */
  playQueue: (tracks: Track[], startIndex?: number) => void;
  /** Plays a single track, using `contextTracks` as the surrounding queue. */
  playTrack: (track: Track, contextTracks?: Track[]) => void;
  togglePlay: () => void;
  pause: () => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => void;
  setVolume: (value: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  toggleLike: (trackId: string) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  shareCurrent: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

function shuffleArray<T>(list: T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [originalQueue, setOriginalQueue] = useState<Track[]>([]);
  const [queue, setQueue] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [isLoading, setIsLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [ready, setReady] = useState(false);
  const [engineKind, setEngineKind] = useState<EngineKind | null>(null);
  const [bridge, setBridge] = useState<BridgeStatus>({ mode: "web", placeholder: false });

  const engineRef = useRef<PlaybackEngine | null>(null);
  /** Where the next load should start (used to resume the last session). */
  const startAtRef = useRef(0);

  // Mirrors of the state, read from engine callbacks and timers.
  const originalQueueRef = useRef(originalQueue);
  const queueRef = useRef(queue);
  const indexRef = useRef(currentIndex);
  const repeatRef = useRef(repeat);
  const trackRef = useRef<Track | null>(null);
  const timeRef = useRef(currentTime);
  const playingRef = useRef(isPlaying);
  const volumeRef = useRef(volume);
  const mutedRef = useRef(muted);
  const shuffleRef = useRef(shuffle);

  const currentTrack = currentIndex >= 0 ? queue[currentIndex] ?? null : null;

  originalQueueRef.current = originalQueue;
  queueRef.current = queue;
  indexRef.current = currentIndex;
  repeatRef.current = repeat;
  trackRef.current = currentTrack;
  timeRef.current = currentTime;
  playingRef.current = isPlaying;
  volumeRef.current = volume;
  mutedRef.current = muted;
  shuffleRef.current = shuffle;

  const snapshot = useCallback(
    (): PlayerPrefs => ({
      volume: volumeRef.current,
      muted: mutedRef.current,
      shuffle: shuffleRef.current,
      repeat: repeatRef.current,
      queueIds: queueRef.current.map((track) => track.id),
      currentIndex: indexRef.current,
      position: Math.round(timeRef.current),
    }),
    [],
  );

  const handleTrackEnd = useCallback(() => {
    const engine = engineRef.current;
    const list = queueRef.current;
    const index = indexRef.current;

    if (repeatRef.current === "one") {
      setCurrentTime(0);
      void engine?.seek(0);
      void engine?.resume();
      return;
    }

    if (index < list.length - 1) {
      setCurrentIndex(index + 1);
      return;
    }

    if (repeatRef.current === "all" && list.length > 0) {
      setCurrentIndex(0);
      return;
    }

    // End of the queue with repeat off: stop on the last track.
    setIsPlaying(false);
    setCurrentTime(0);
    void engine?.stop();
  }, []);

  const handleEngineEvent = useCallback(
    (event: EngineEvent) => {
      switch (event.type) {
        case "position":
          setCurrentTime(event.seconds);
          break;
        case "duration": {
          setDuration(event.seconds);
          const track = trackRef.current;
          // The `audio` plugin knows the real length of an imported file.
          if (track?.origin === "device") noteTrackDuration(track.id, event.seconds);
          break;
        }
        case "loading":
          setIsLoading(event.value);
          break;
        case "playing":
          // The engine stops on its own (audio focus lost, track finished).
          if (!event.value) setIsPlaying(false);
          break;
        case "ended":
          handleTrackEnd();
          break;
      }
    },
    [handleTrackEnd],
  );

  // Restore the last session from the core storage plugin.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await hydrateLibrary();
      const prefs = await loadPlayerPrefs();
      if (cancelled) return;

      setVolumeState(prefs.volume);
      setMuted(prefs.muted);
      setShuffle(prefs.shuffle);
      setRepeat(prefs.repeat);
      setBridge(bridgeStatus());

      const restored = prefs.queueIds
        .map((id) => trackById(id))
        .filter((track): track is Track => Boolean(track));

      if (restored.length > 0) {
        const list = prefs.shuffle ? shuffleArray(restored) : restored;
        const index = Math.min(Math.max(prefs.currentIndex, 0), list.length - 1);
        const track = list[index];
        setOriginalQueue(restored);
        setQueue(list);
        setCurrentIndex(index);
        setDuration(track.duration);
        setCurrentTime(Math.max(0, prefs.position));
        startAtRef.current = Math.max(0, prefs.position);
      }

      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Pick the playback engine: core `audio` plugin or browser fallback.
  useEffect(() => {
    let disposed = false;
    void (async () => {
      const engine = await createEngine(handleEngineEvent);
      if (disposed) {
        engine.dispose();
        return;
      }
      engineRef.current = engine;
      setEngineKind(engine.kind);
      setReady(true);
    })();
    return () => {
      disposed = true;
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, [handleEngineEvent]);

  // Drive the engine from the current track + play/pause intent.
  const currentTrackId = currentTrack?.id ?? null;
  useEffect(() => {
    const engine = engineRef.current;
    const track = trackRef.current;
    if (!ready || !engine || !track) return;

    if (!isPlaying) {
      if (engine.loadedId === track.id) void engine.pause();
      return;
    }

    if (engine.loadedId === track.id) {
      void engine.resume();
      return;
    }

    const startAt = startAtRef.current;
    startAtRef.current = 0;
    setCurrentTime(startAt);
    setDuration(track.duration);
    setIsLoading(true);

    void engine
      .load(track, { startAt, volume: mutedRef.current ? 0 : volumeRef.current })
      .finally(() => {
        // The user may have hit pause while the track was loading.
        if (!playingRef.current) void engine.pause();
      });
  }, [ready, isPlaying, currentTrackId]);

  // Volume through the engine.
  useEffect(() => {
    void engineRef.current?.setVolume(muted ? 0 : volume);
  }, [volume, muted, ready, engineKind]);

  // Keep the screen awake while a track plays (`wake_lock` plugin).
  useEffect(() => {
    if (!ready) return;
    void setWakeLock(isPlaying);
  }, [isPlaying, ready]);

  // Preferences into the core `storage` plugin.
  useEffect(() => {
    if (!hydrated) return;
    const timeout = window.setTimeout(() => void savePlayerPrefs(snapshot()), 400);
    return () => window.clearTimeout(timeout);
  }, [hydrated, snapshot, queue, currentIndex, volume, muted, shuffle, repeat]);

  // The playback position, every few seconds.
  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setInterval(() => {
      if (isPlaying) void savePlayerPrefs(snapshot());
    }, 5000);
    return () => window.clearInterval(timer);
  }, [hydrated, isPlaying, snapshot]);

  const playQueue = useCallback((tracks: Track[], startIndex = 0) => {
    if (tracks.length === 0) return;
    const list = shuffleRef.current ? shuffleArray(tracks) : tracks;
    const wanted = tracks[startIndex];
    const index = shuffleRef.current ? list.findIndex((t) => t.id === wanted?.id) : startIndex;

    startAtRef.current = 0;
    setOriginalQueue(tracks);
    setQueue(list);
    setCurrentIndex(index < 0 ? 0 : index);
    setCurrentTime(0);
    setIsPlaying(true);
  }, []);

  const playTrack = useCallback(
    (track: Track, contextTracks?: Track[]) => {
      const list = contextTracks && contextTracks.length > 0 ? contextTracks : [track];
      const index = list.findIndex((entry) => entry.id === track.id);
      playQueue(list, index >= 0 ? index : 0);
    },
    [playQueue],
  );

  const togglePlay = useCallback(() => {
    if (!trackRef.current) return;
    setIsPlaying((playing) => !playing);
  }, []);

  const pause = useCallback(() => setIsPlaying(false), []);

  const next = useCallback(() => {
    const list = queueRef.current;
    if (list.length === 0) return;
    const index = indexRef.current;

    if (index < list.length - 1) {
      setCurrentIndex(index + 1);
      setIsPlaying(true);
      return;
    }
    if (repeatRef.current === "all") {
      setCurrentIndex(0);
      setIsPlaying(true);
      return;
    }
    // Last track, repeat off: stop rather than sit on a finished song.
    startAtRef.current = 0;
    setCurrentTime(0);
    setIsPlaying(false);
    void engineRef.current?.stop();
  }, []);

  const previous = useCallback(() => {
    if (timeRef.current > 3) {
      setCurrentTime(0);
      void engineRef.current?.seek(0);
      return;
    }
    const list = queueRef.current;
    if (list.length === 0) return;
    const index = indexRef.current;

    if (index > 0) setCurrentIndex(index - 1);
    else if (repeatRef.current === "all") setCurrentIndex(list.length - 1);
    else {
      setCurrentTime(0);
      void engineRef.current?.seek(0);
      return;
    }
    setIsPlaying(true);
  }, []);

  const seek = useCallback((time: number) => {
    setCurrentTime(time);
    void engineRef.current?.seek(time);
  }, []);

  const setVolume = useCallback((value: number) => {
    setVolumeState(Math.min(1, Math.max(0, value)));
    if (value > 0) setMuted(false);
  }, []);

  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  const toggleShuffle = useCallback(() => {
    setShuffle((previous) => {
      const next = !previous;
      const list = queueRef.current;
      const active = list[indexRef.current];
      const source = originalQueueRef.current.length > 0 ? originalQueueRef.current : list;

      const reordered = next ? shuffleArray(source) : source;
      const index = reordered.findIndex((track) => track.id === active?.id);
      setQueue(reordered);
      setCurrentIndex(index >= 0 ? index : 0);
      if (next) notify("Shuffle on");
      return next;
    });
  }, []);

  const cycleRepeat = useCallback(() => {
    setRepeat((previous) => {
      const next: RepeatMode = previous === "off" ? "all" : previous === "all" ? "one" : "off";
      notify(next === "off" ? "Repeat off" : next === "all" ? "Repeat queue" : "Repeat track");
      return next;
    });
  }, []);

  const toggleLike = useCallback(async (trackId: string) => {
    try {
      const updated = await libraryService.toggleLike(trackId);
      const apply = (list: Track[]) =>
        list.map((track) => (track.id === trackId ? { ...track, liked: updated.liked } : track));
      setQueue(apply);
      setOriginalQueue(apply);
      hapticTap();
      notify(updated.liked ? `Liked ${updated.title}` : `Removed ${updated.title}`);
    } catch {
      notify("Could not update likes");
    }
  }, []);

  const addToQueue = useCallback((track: Track) => {
    setQueue((list) => [...list, track]);
    setOriginalQueue((list) => [...list, track]);
    hapticTap();
    notify(`${track.title} added to queue`);
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((list) => list.filter((_, i) => i !== index));
    setCurrentIndex((current) => (index < current ? current - 1 : current));
  }, []);

  const shareCurrent = useCallback(async () => {
    const track = trackRef.current;
    if (!track) return;
    const shared = await shareText(
      `${track.title} — ${track.artist}\n${track.src}`,
      "Sweetmelon Music Player",
    );
    notify(shared ? "Shared" : "Nothing to share with");
  }, []);

  const value = useMemo<PlayerContextValue>(
    () => ({
      queue,
      originalQueue,
      currentTrack,
      currentIndex,
      isPlaying,
      currentTime,
      duration,
      volume,
      muted,
      shuffle,
      repeat,
      isLoading,
      bridge,
      engineKind,
      ready,
      playQueue,
      playTrack,
      togglePlay,
      pause,
      next,
      previous,
      seek,
      setVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
      toggleLike,
      addToQueue,
      removeFromQueue,
      shareCurrent,
    }),
    [
      queue,
      originalQueue,
      currentTrack,
      currentIndex,
      isPlaying,
      currentTime,
      duration,
      volume,
      muted,
      shuffle,
      repeat,
      isLoading,
      bridge,
      engineKind,
      ready,
      playQueue,
      playTrack,
      togglePlay,
      pause,
      next,
      previous,
      seek,
      setVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
      toggleLike,
      addToQueue,
      removeFromQueue,
      shareCurrent,
    ],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("usePlayer must be used within a PlayerProvider");
  return context;
}
