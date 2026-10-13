import { useState } from "react";
import {
  Heart,
  ListMusic,
  Mic2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Share2,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { formatDuration, formatTime } from "../utils/format";
import { cn } from "../utils/cn";
import { Visualizer } from "../components/Visualizer";

export function NowPlaying() {
  const {
    currentTrack,
    queue,
    currentIndex,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    next,
    previous,
    seek,
    volume,
    muted,
    setVolume,
    toggleMute,
    shuffle,
    toggleShuffle,
    repeat,
    cycleRepeat,
    toggleLike,
    playQueue,
    shareCurrent,
    bridge,
  } = usePlayer();
  const [tab, setTab] = useState<"queue" | "lyrics">("queue");

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  if (!currentTrack) {
    return (
      <div className="flex h-[calc(100vh-5.5rem)] flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/5">
          <ListMusic className="h-9 w-9 text-white/30" />
        </div>
        <h2 className="text-xl font-semibold text-white">Nothing is playing yet</h2>
        <p className="max-w-sm text-sm text-white/40">
          Head over to the Explorer, pick any track from your library, and it will show up here
          with full playback controls.
        </p>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-5.5rem)] overflow-hidden px-4 pb-10 pt-6 sm:px-8">
      {/* Ambient blurred backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <img
          src={currentTrack.cover}
          alt=""
          className="h-full w-full scale-110 object-cover opacity-30 blur-3xl"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#07070d]/60 via-[#07070d]/80 to-[#07070d]" />
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
        {/* Main player */}
        <div className="flex flex-col items-center gap-8 pt-4 lg:items-start">
          <div className="relative w-full max-w-md">
            <div
              className={cn(
                "absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-fuchsia-500/30 via-violet-500/20 to-cyan-400/20 blur-2xl transition-opacity",
                isPlaying ? "opacity-100" : "opacity-40",
              )}
            />
            <div className="relative aspect-square w-full overflow-hidden rounded-[1.75rem] border border-white/10 shadow-2xl shadow-black/50">
              <img src={currentTrack.cover} alt={currentTrack.album} className="h-full w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 flex h-16 items-end justify-center gap-[3px] bg-gradient-to-t from-black/70 to-transparent p-3">
                <Visualizer active={isPlaying} bars={40} className="h-10 w-full" />
              </div>
            </div>
          </div>

          <div className="w-full max-w-md text-center lg:text-left">
            <p className="text-xs font-semibold uppercase tracking-widest text-fuchsia-400">
              {currentTrack.genre}
            </p>
            <h1 className="mt-1 text-3xl font-bold text-white sm:text-4xl">{currentTrack.title}</h1>
            <p className="mt-1 text-base text-white/50">
              {currentTrack.artist} &middot; {currentTrack.album}
            </p>
          </div>

          {/* Progress */}
          <div className="w-full max-w-md">
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={currentTime}
              onChange={(e) => seek(Number(e.target.value))}
              className="player-seek h-1.5 w-full cursor-pointer appearance-none bg-transparent"
              style={{
                background: `linear-gradient(to right, #e879f9 ${progress}%, rgba(255,255,255,0.12) ${progress}%)`,
              }}
            />
            <div className="mt-1.5 flex justify-between text-xs tabular-nums text-white/40">
              <span>{formatTime(currentTime)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex w-full max-w-md items-center justify-between">
            <button
              onClick={toggleShuffle}
              className={cn("text-white/50 transition hover:text-white", shuffle && "text-fuchsia-400")}
              aria-label="Shuffle"
            >
              <Shuffle className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-5">
              <button onClick={previous} className="text-white/80 transition hover:text-white" aria-label="Previous">
                <SkipBack className="h-6 w-6" fill="currentColor" />
              </button>
              <button
                onClick={togglePlay}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white shadow-xl shadow-fuchsia-500/30 transition hover:scale-105 active:scale-95"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="h-7 w-7" fill="currentColor" />
                ) : (
                  <Play className="ml-1 h-7 w-7" fill="currentColor" />
                )}
              </button>
              <button onClick={next} className="text-white/80 transition hover:text-white" aria-label="Next">
                <SkipForward className="h-6 w-6" fill="currentColor" />
              </button>
            </div>
            <button
              onClick={cycleRepeat}
              className={cn("text-white/50 transition hover:text-white", repeat !== "off" && "text-fuchsia-400")}
              aria-label="Repeat"
            >
              {repeat === "one" ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
            </button>
          </div>

          {/* Secondary controls */}
          <div className="flex w-full max-w-md items-center justify-between">
            <button
              onClick={() => toggleLike(currentTrack.id)}
              className={cn(
                "flex items-center gap-2 text-sm text-white/50 transition hover:text-fuchsia-400",
                currentTrack.liked && "text-fuchsia-500",
              )}
            >
              <Heart className={cn("h-5 w-5", currentTrack.liked && "fill-current")} />
              {currentTrack.liked ? "Liked" : "Like"}
            </button>
            <div className="flex items-center gap-4">
              <span className="hidden text-[11px] text-white/30 sm:inline">
                {bridge.mode === "native" ? "core audio" : "web audio"}
              </span>
              <button
                onClick={() => void shareCurrent()}
                className="flex items-center gap-2 text-sm text-white/50 transition hover:text-cyan-300"
              >
                <Share2 className="h-4.5 w-4.5" size={18} /> Share
              </button>
              <button onClick={toggleMute} className="text-white/50 transition hover:text-white">
                <VolumeIcon className="h-5 w-5" />
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={muted ? 0 : volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="player-seek h-1.5 w-28 cursor-pointer appearance-none bg-transparent"
                style={{
                  background: `linear-gradient(to right, #22d3ee ${(muted ? 0 : volume) * 100}%, rgba(255,255,255,0.12) ${(muted ? 0 : volume) * 100}%)`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div className="flex flex-col rounded-3xl border border-white/5 bg-white/[0.03] p-5 backdrop-blur-xl lg:h-[calc(100vh-8rem)]">
          <div className="mb-4 flex gap-1 rounded-full bg-white/5 p-1">
            <button
              onClick={() => setTab("queue")}
              className={cn(
                "flex-1 rounded-full py-2 text-xs font-semibold transition",
                tab === "queue" ? "bg-white text-[#0a0a12]" : "text-white/50 hover:text-white",
              )}
            >
              Up Next
            </button>
            <button
              onClick={() => setTab("lyrics")}
              className={cn(
                "flex-1 rounded-full py-2 text-xs font-semibold transition",
                tab === "lyrics" ? "bg-white text-[#0a0a12]" : "text-white/50 hover:text-white",
              )}
            >
              Lyrics
            </button>
          </div>

          {tab === "queue" ? (
            <div className="flex-1 space-y-1 overflow-y-auto pr-1">
              {queue.map((track, i) => (
                <button
                  key={`${track.id}-${i}`}
                  onClick={() => playQueue(queue, i)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl p-2 text-left transition",
                    i === currentIndex ? "bg-fuchsia-500/10" : "hover:bg-white/5",
                  )}
                >
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                    <img src={track.cover} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate text-sm font-medium",
                        i === currentIndex ? "text-fuchsia-300" : "text-white/85",
                      )}
                    >
                      {track.title}
                    </p>
                    <p className="truncate text-xs text-white/40">{track.artist}</p>
                  </div>
                  <span className="text-xs tabular-nums text-white/30">{formatDuration(track.duration)}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <Mic2 className="h-8 w-8 text-white/20" />
              <p className="text-sm text-white/40">
                Lyrics aren't wired up yet — this panel is ready for a real lyrics API
                <br />
                (e.g. fetch by <code className="rounded bg-white/10 px-1">artist</code> +{" "}
                <code className="rounded bg-white/10 px-1">title</code>).
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
