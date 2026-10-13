import { AnimatePresence, motion } from "framer-motion";
import { ListMusic, Play, X, GripVertical, Trash2 } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { formatDuration } from "../utils/format";
import { cn } from "../utils/cn";

export function QueueDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { queue, currentIndex, playQueue, removeFromQueue } = usePlayer();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-sm flex-col border-l border-white/10 bg-[#0d0d18]/95 p-5 backdrop-blur-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <ListMusic className="h-4 w-4 text-fuchsia-400" />
                <h3 className="font-semibold">Up Next</h3>
                <span className="text-xs text-white/40">({queue.length})</span>
              </div>
              <button onClick={onClose} className="text-white/50 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-1 overflow-y-auto pr-1">
              {queue.length === 0 && (
                <p className="mt-10 text-center text-sm text-white/30">
                  Your queue is empty. Play a track from the Explorer.
                </p>
              )}
              {queue.map((track, i) => (
                <div
                  key={`${track.id}-${i}`}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl p-2 transition",
                    i === currentIndex ? "bg-fuchsia-500/10" : "hover:bg-white/5",
                  )}
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-white/20" />
                  <button
                    onClick={() => playQueue(queue, i)}
                    className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg"
                  >
                    <img src={track.cover} alt="" className="h-full w-full object-cover" />
                    {i === currentIndex && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <Play className="h-3.5 w-3.5 fill-white text-white" />
                      </div>
                    )}
                  </button>
                  <button onClick={() => playQueue(queue, i)} className="min-w-0 flex-1 text-left">
                    <p
                      className={cn(
                        "truncate text-sm font-medium",
                        i === currentIndex ? "text-fuchsia-300" : "text-white/85",
                      )}
                    >
                      {track.title}
                    </p>
                    <p className="truncate text-xs text-white/40">{track.artist}</p>
                  </button>
                  <span className="shrink-0 text-xs tabular-nums text-white/30">
                    {formatDuration(track.duration)}
                  </span>
                  <button
                    onClick={() => removeFromQueue(i)}
                    className="shrink-0 text-white/20 opacity-0 transition hover:text-rose-400 group-hover:opacity-100"
                    aria-label="Remove from queue"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
