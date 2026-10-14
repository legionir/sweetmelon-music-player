import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Heart,
  ListMusic,
  Pause,
  Play,
  Repeat,
  Repeat1,
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
import { Visualizer } from "./Visualizer";
import { QueueDrawer } from "./QueueDrawer";
import { BACK_EVENT } from "./NativeShell";

export function PlayerBar() {
  const {
    currentTrack,
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
    isLoading,
  } = usePlayer();
  const [queueOpen, setQueueOpen] = useState(false);

  // Android back (core `back_button` plugin) closes the drawer first.
  useEffect(() => {
    const onBack = (event: Event) => {
      if (!queueOpen) return;
      event.preventDefault();
      setQueueOpen(false);
    };
    window.addEventListener(BACK_EVENT, onBack);
    return () => window.removeEventListener(BACK_EVENT, onBack);
  }, [queueOpen]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <>
      <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-white/5 bg-[#0a0a12]/90 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-2xl sm:px-5">
        {/* progress bar */}
        <div className="group absolute inset-x-0 -top-1 flex h-2 w-full items-center px-0">
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={currentTime}
            onChange={(e) => seek(Number(e.target.value))}
            className="player-seek h-1 w-full cursor-pointer appearance-none bg-transparent"
            style={{
              background: `linear-gradient(to right, #e879f9 ${progress}%, rgba(255,255,255,0.12) ${progress}%)`,
            }}
            disabled={!currentTrack}
            aria-label="Seek"
          />
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {/* Track info */}
          <Link
            to="/now-playing"
            className="flex min-w-0 flex-1 items-center gap-3 sm:w-72 sm:flex-none"
          >
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg shadow-lg shadow-black/40">
              {currentTrack ? (
                <img src={currentTrack.cover} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-white/5" />
              )}
              {isLoading && currentTrack && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {currentTrack?.title ?? "No track selected"}
              </p>
              <p className="truncate text-xs text-white/45">
                {currentTrack?.artist ?? "Pick a song from the Explorer"}
              </p>
            </div>
            {currentTrack && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  toggleLike(currentTrack.id);
                }}
                className="ml-1 hidden shrink-0 text-white/40 transition hover:text-fuchsia-400 sm:block"
                aria-label="Toggle like"
              >
                <Heart
                  className={cn("h-4 w-4", currentTrack.liked && "fill-fuchsia-500 text-fuchsia-500")}
                />
              </button>
            )}
          </Link>

          {/* Controls */}
          <div className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={toggleShuffle}
                className={cn(
                  "hidden text-white/50 transition hover:text-white sm:block",
                  shuffle && "text-fuchsia-400",
                )}
                aria-label="Shuffle"
              >
                <Shuffle className="h-4 w-4" />
              </button>
              <button
                onClick={previous}
                className="text-white/70 transition hover:text-white disabled:opacity-30"
                disabled={!currentTrack}
                aria-label="Previous"
              >
                <SkipBack className="h-5 w-5" />
              </button>
              <button
                onClick={togglePlay}
                disabled={!currentTrack}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white shadow-lg shadow-fuchsia-500/30 transition hover:scale-105 active:scale-95 disabled:opacity-40"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="h-4.5 w-4.5" size={18} fill="currentColor" />
                ) : (
                  <Play className="ml-0.5 h-4.5 w-4.5" size={18} fill="currentColor" />
                )}
              </button>
              <button
                onClick={next}
                className="text-white/70 transition hover:text-white disabled:opacity-30"
                disabled={!currentTrack}
                aria-label="Next"
              >
                <SkipForward className="h-5 w-5" />
              </button>
              <button
                onClick={cycleRepeat}
                className={cn(
                  "hidden text-white/50 transition hover:text-white sm:block",
                  repeat !== "off" && "text-fuchsia-400",
                )}
                aria-label="Repeat"
              >
                {repeat === "one" ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
              </button>
            </div>
            <div className="hidden w-full max-w-md items-center gap-2 text-[11px] text-white/40 sm:flex">
              <span className="w-9 text-right tabular-nums">{formatTime(currentTime)}</span>
              <Visualizer active={isPlaying} bars={28} className="h-4 flex-1" barClassName="w-[2px]" />
              <span className="w-9 tabular-nums">{formatDuration(duration)}</span>
            </div>
          </div>

          {/* Volume + Queue */}
          <div className="hidden flex-none items-center gap-3 sm:flex sm:w-48">
            <button
              onClick={() => setQueueOpen(true)}
              className="text-white/50 transition hover:text-white"
              aria-label="Open queue"
            >
              <ListMusic className="h-4.5 w-4.5" size={18} />
            </button>
            <button onClick={toggleMute} className="text-white/50 transition hover:text-white">
              <VolumeIcon className="h-4.5 w-4.5" size={18} />
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="player-seek h-1 w-24 cursor-pointer appearance-none bg-transparent"
              style={{
                background: `linear-gradient(to right, #22d3ee ${(muted ? 0 : volume) * 100}%, rgba(255,255,255,0.12) ${(muted ? 0 : volume) * 100}%)`,
              }}
              aria-label="Volume"
            />
          </div>

          <button
            onClick={() => setQueueOpen(true)}
            className="text-white/50 transition hover:text-white sm:hidden"
            aria-label="Open queue"
          >
            <ListMusic className="h-5 w-5" />
          </button>
        </div>
      </footer>
      <QueueDrawer open={queueOpen} onClose={() => setQueueOpen(false)} />
    </>
  );
}
