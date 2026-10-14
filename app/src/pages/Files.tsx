import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, FileAudio, Folder, FolderPlus, HardDrive, Play, RefreshCw } from "lucide-react";
import type { BrowseEntry } from "../native/sdk";
import { browseStorage, requestAudioAccess } from "../native/plugins";
import { addDeviceFiles, deviceTrack } from "../data/library";
import { notify } from "../native/notify";
import { usePlayer } from "../context/PlayerContext";
import { formatBytes } from "../utils/format";
import { cn } from "../utils/cn";

/**
 * File manager for the device's storage (`file_system` plugin, read-only).
 * Folders open in place, audio files play on tap with the rest of the folder
 * as the queue, and a whole folder can be added to the library at once.
 */
export function Files() {
  const { bridge, currentTrack, isPlaying, playQueue } = usePlayer();
  const [path, setPath] = useState("");
  const [parent, setParent] = useState<string | null>(null);
  const [items, setItems] = useState<BrowseEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asked, setAsked] = useState(false);

  const native = bridge.mode === "native";

  const open = useCallback(async (target: string) => {
    setLoading(true);
    setError(null);
    try {
      if (!asked) {
        await requestAudioAccess();
        setAsked(true);
      }
      const result = await browseStorage(target);
      setPath(result.path);
      setParent(result.parent);
      setItems(result.items);
    } catch (e) {
      const message = (e as { message?: string } | null)?.message;
      setError(message ?? "Could not open this folder");
    } finally {
      setLoading(false);
    }
  }, [asked]);

  useEffect(() => {
    if (native) void open("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [native]);

  const folders = useMemo(() => items.filter((entry) => entry.type === "directory"), [items]);
  const files = useMemo(() => items.filter((entry) => entry.type === "file"), [items]);
  const tracks = useMemo(() => files.map((file) => deviceTrack(file)), [files]);

  const segments = path ? path.split("/").filter(Boolean) : [];

  const addFolder = async () => {
    const added = await addDeviceFiles(files);
    notify(
      added.length === 0
        ? "These files are already in your library"
        : `Added ${added.length} file${added.length === 1 ? "" : "s"} to On this device`,
    );
  };

  if (!native) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-10 text-center text-sm text-white/40">
        Browsing the device needs the Android/iOS build.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-10 pt-6 sm:px-8">
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => parent !== null && void open(parent)}
          disabled={parent === null || loading}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/70 transition active:bg-white/10 disabled:opacity-30"
          aria-label="Up one folder"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-xl font-bold text-white">
          {segments.length > 0 ? segments[segments.length - 1] : "Files"}
        </h1>
        <button
          onClick={() => void open(path)}
          disabled={loading}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/70 transition active:bg-white/10"
          aria-label="Refresh"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </button>
      </div>

      {path && <p className="mb-4 truncate text-xs text-white/30">{path}</p>}

      {path && files.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => playQueue(tracks, 0)}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-600 px-4 py-2 text-xs font-semibold text-white"
          >
            <Play className="h-3.5 w-3.5 fill-current" /> Play folder ({files.length})
          </button>
          <button
            onClick={() => void addFolder()}
            className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white/70 active:bg-white/10"
          >
            <FolderPlus className="h-3.5 w-3.5" /> Add to library
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-xs text-red-200">
          {error}
          <button onClick={() => void open(path)} className="ml-2 underline">
            Retry
          </button>
        </div>
      )}

      <div className="space-y-0.5">
        {folders.map((folder) => (
          <button
            key={folder.path}
            onClick={() => void open(folder.path)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition active:bg-white/[0.07]"
          >
            {path === "" ? (
              <HardDrive className="h-5 w-5 shrink-0 text-emerald-300" />
            ) : (
              <Folder className="h-5 w-5 shrink-0 text-violet-300" />
            )}
            <span className="min-w-0 flex-1 truncate text-sm text-white/90">{folder.name}</span>
          </button>
        ))}

        {files.map((file, index) => {
          const active = currentTrack?.id === tracks[index].id;
          return (
            <button
              key={file.path}
              onClick={() => playQueue(tracks, index)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition active:bg-white/[0.07]"
            >
              <FileAudio className={cn("h-5 w-5 shrink-0", active ? "text-fuchsia-400" : "text-white/40")} />
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate text-sm", active ? "text-fuchsia-300" : "text-white/90")}>
                  {file.name}
                </span>
                <span className="text-[11px] text-white/30">
                  {formatBytes(file.size)}
                  {active && isPlaying ? " · playing" : ""}
                </span>
              </span>
            </button>
          );
        })}

        {!loading && !error && items.length === 0 && (
          <p className="mt-16 text-center text-sm text-white/30">
            No folders or audio files here.
          </p>
        )}
      </div>
    </div>
  );
}
