import {
  Heart,
  ListMusic,
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

/**
 * Exactly one screen, never scrolls. The cover takes the space that is left,
 * the title always takes two lines (long names are cut), so the controls stay
 * where they are whatever the file is called.
 */
export function NowPlaying() {
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
    shareCurrent,
  } = usePlayer();

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  if (!currentTrack) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/5">
          <ListMusic className="h-9 w-9 text-white/30" />
        </div>
        <h2 className="text-xl font-semibold text-white">Nothing is playing yet</h2>
        <p className="max-w-sm text-sm text-white/40">
          Pick a track in the Explorer or the Files tab and it will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-hidden">
      {/* Ambient blurred backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <img
          src={currentTrack.cover}
          alt=""
          className="h-full w-full scale-110 object-cover opacity-30 blur-3xl"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#07070d]/60 via-[#07070d]/80 to-[#07070d]" />
      </div>

      <div className="mx-auto flex h-full w-full max-w-md flex-col gap-4 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
        {/* Cover: as large as the screen allows, always square */}
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div
            className="relative aspect-square overflow-hidden rounded-[1.75rem] border border-white/10 shadow-2xl shadow-black/50"
            style={{ width: "min(100%, 40vh)" }}
          >
            <img src={currentTrack.cover} alt={currentTrack.album} className="h-full w-full object-cover" />
          </div>
        </div>

        {/* Title: two lines, always the same height */}
        <div className="shrink-0 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-fuchsia-400">
            {currentTrack.genre}
          </p>
          <h1 className="mt-1 line-clamp-2 h-[3.5rem] break-words text-2xl font-bold leading-7 text-white">
            {currentTrack.title}
          </h1>
          <p className="mt-1 truncate text-sm text-white/50">
            {currentTrack.artist} &middot; {currentTrack.album}
          </p>
        </div>

        {/* Progress */}
        <div className="shrink-0">
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
        <div className="flex shrink-0 items-center justify-between">
          <button
            onClick={toggleShuffle}
            className={cn("p-2 text-white/50", shuffle && "text-fuchsia-400")}
            aria-label="Shuffle"
          >
            <Shuffle className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-5">
            <button onClick={previous} className="p-2 text-white/80" aria-label="Previous">
              <SkipBack className="h-6 w-6" fill="currentColor" />
            </button>
            <button
              onClick={togglePlay}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white shadow-xl shadow-fuchsia-500/30 transition active:scale-95"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="h-7 w-7" fill="currentColor" />
              ) : (
                <Play className="ml-1 h-7 w-7" fill="currentColor" />
              )}
            </button>
            <button onClick={next} className="p-2 text-white/80" aria-label="Next">
              <SkipForward className="h-6 w-6" fill="currentColor" />
            </button>
          </div>
          <button
            onClick={cycleRepeat}
            className={cn("p-2 text-white/50", repeat !== "off" && "text-fuchsia-400")}
            aria-label="Repeat"
          >
            {repeat === "one" ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
          </button>
        </div>

        {/* Secondary controls */}
        <div className="flex shrink-0 items-center justify-between gap-3">
          <button
            onClick={() => toggleLike(currentTrack.id)}
            className={cn(
              "flex items-center gap-2 text-sm text-white/50",
              currentTrack.liked && "text-fuchsia-500",
            )}
          >
            <Heart className={cn("h-5 w-5", currentTrack.liked && "fill-current")} />
            {currentTrack.liked ? "Liked" : "Like"}
          </button>
          <button
            onClick={() => void shareCurrent()}
            className="flex items-center gap-2 text-sm text-white/50"
          >
            <Share2 className="h-[18px] w-[18px]" /> Share
          </button>
          <div className="flex min-w-0 items-center gap-2">
            <button onClick={toggleMute} className="text-white/50" aria-label="Mute">
              <VolumeIcon className="h-5 w-5" />
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="player-seek h-1.5 w-24 cursor-pointer appearance-none bg-transparent"
              style={{
                background: `linear-gradient(to right, #22d3ee ${(muted ? 0 : volume) * 100}%, rgba(255,255,255,0.12) ${(muted ? 0 : volume) * 100}%)`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
