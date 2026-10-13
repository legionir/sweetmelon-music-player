import { Heart, ListPlus, Pause, Play } from "lucide-react";
import type { Track } from "../types";
import { formatDate, formatDuration } from "../utils/format";
import { cn } from "../utils/cn";
import { Visualizer } from "./Visualizer";

export function TrackRow({
  track,
  index,
  isActive,
  isPlaying,
  onPlay,
  onToggleLike,
  onAddToQueue,
}: {
  track: Track;
  index: number;
  isActive: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onToggleLike: () => void;
  onAddToQueue: () => void;
}) {
  return (
    <div
      className={cn(
        "group grid grid-cols-[2rem_1fr_auto_auto_auto] items-center gap-3 rounded-xl px-3 py-2.5 transition sm:grid-cols-[2rem_minmax(0,2.2fr)_minmax(0,1.2fr)_5rem_6rem]",
        isActive ? "bg-white/[0.07]" : "hover:bg-white/[0.04]",
      )}
    >
      <div className="flex h-5 w-5 items-center justify-center text-xs text-white/30">
        {isActive && isPlaying ? (
          <Visualizer active bars={3} className="h-3.5 w-3.5" barClassName="w-[2px]" />
        ) : (
          <>
            <span className="group-hover:hidden">{index + 1}</span>
            <button onClick={onPlay} className="hidden text-white group-hover:block">
              <Play className="h-3.5 w-3.5 fill-current" />
            </button>
          </>
        )}
      </div>

      <button onClick={onPlay} className="flex min-w-0 items-center gap-3 text-left">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
          <img src={track.cover} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 hidden items-center justify-center bg-black/50 group-hover:flex">
            {isActive && isPlaying ? (
              <Pause className="h-4 w-4 fill-white text-white" />
            ) : (
              <Play className="h-4 w-4 fill-white text-white" />
            )}
          </div>
        </div>
        <div className="min-w-0">
          <p className={cn("truncate text-sm font-medium", isActive ? "text-fuchsia-300" : "text-white/90")}>
            {track.title}
          </p>
          <p className="truncate text-xs text-white/40">{track.artist}</p>
        </div>
      </button>

      <p className="hidden truncate text-xs text-white/40 sm:block">{track.album}</p>

      <p className="hidden text-right text-xs text-white/30 sm:block">{formatDate(track.addedAt)}</p>

      <div className="flex items-center justify-end gap-3">
        <button
          onClick={onAddToQueue}
          className="text-white/25 opacity-0 transition hover:text-cyan-300 group-hover:opacity-100"
          aria-label="Add to queue"
        >
          <ListPlus className="h-4 w-4" />
        </button>
        <button
          onClick={onToggleLike}
          className={cn(
            "text-white/25 transition hover:text-fuchsia-400",
            track.liked && "text-fuchsia-500",
          )}
          aria-label="Toggle like"
        >
          <Heart className={cn("h-4 w-4", track.liked && "fill-current")} />
        </button>
        <span className="w-10 text-right text-xs tabular-nums text-white/35">
          {formatDuration(track.duration)}
        </span>
      </div>
    </div>
  );
}
