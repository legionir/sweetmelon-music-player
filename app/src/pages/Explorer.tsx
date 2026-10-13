import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowDownAZ,
  Clock,
  HardDrive,
  LayoutGrid,
  Search,
  Shuffle,
  SlidersHorizontal,
  Upload,
} from "lucide-react";
import type { FolderNode, Track } from "../types";
import { importAudioFiles, libraryService, subscribeLibrary } from "../data/library";
import { notify } from "../native/notify";
import { usePlayer } from "../context/PlayerContext";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { FolderCard } from "../components/FolderCard";
import { TrackRow } from "../components/TrackRow";
import { cn } from "../utils/cn";

type SortKey = "title" | "artist" | "duration" | "addedAt";

export function Explorer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const folderId = searchParams.get("folder") ?? "root";

  const [folderPath, setFolderPath] = useState<FolderNode[]>([]);
  const [childFolders, setChildFolders] = useState<FolderNode[]>([]);
  const [childTracks, setChildTracks] = useState<Track[]>([]);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Track[] | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("title");
  const [sortOpen, setSortOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  /** Bumped whenever the library changes (import, like, learned duration). */
  const [libraryVersion, setLibraryVersion] = useState(0);

  const { currentTrack, isPlaying, playTrack, toggleLike, addToQueue, playQueue, bridge } =
    usePlayer();

  useEffect(() => subscribeLibrary(() => setLibraryVersion((version) => version + 1)), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      libraryService.getFolderContents(folderId),
      libraryService.getFolderPath(folderId === "recent" || folderId === "favorites" ? "root" : folderId),
    ]).then(([contents, path]) => {
      if (cancelled) return;
      setChildFolders(contents.folders);
      setChildTracks(contents.tracks);
      setFolderPath(
        folderId === "recent"
          ? [...path, { id: "recent", type: "folder", name: "Recently Added", parentId: "root" }]
          : folderId === "favorites"
          ? [...path, { id: "favorites", type: "folder", name: "Favorites", parentId: "root" }]
          : path,
      );
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [folderId, libraryVersion]);

  useEffect(() => {
    let cancelled = false;
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    const timeout = setTimeout(() => {
      libraryService.searchTracks(query).then((res) => {
        if (!cancelled) setSearchResults(res);
      });
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query, libraryVersion]);

  const sortedTracks = useMemo(() => {
    const list = searchResults ?? childTracks;
    const copy = [...list];
    copy.sort((a, b) => {
      switch (sortKey) {
        case "artist":
          return a.artist.localeCompare(b.artist);
        case "duration":
          return a.duration - b.duration;
        case "addedAt":
          return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
        default:
          return a.title.localeCompare(b.title);
      }
    });
    return copy;
  }, [childTracks, searchResults, sortKey]);

  const navigate = (id: string) => {
    setQuery("");
    setSearchParams(id === "root" ? {} : { folder: id });
  };

  const currentFolder = folderPath[folderPath.length - 1];
  const title = searchResults
    ? `Results for "${query}"`
    : folderId === "root"
    ? "Your Library"
    : currentFolder?.name ?? "Library";

  const onImport = async () => {
    if (bridge.mode !== "native") {
      notify("Importing files needs the Android/iOS build");
      return;
    }
    setImporting(true);
    try {
      const added = await importAudioFiles();
      if (added.length === 0) notify("No new audio files picked");
      else notify(`Imported ${added.length} file${added.length === 1 ? "" : "s"}`);
    } finally {
      setImporting(false);
    }
  };

  const playAll = (shuffled = false) => {
    if (sortedTracks.length === 0) return;
    playQueue(sortedTracks, 0);
    if (shuffled) {
      // handled by shuffle toggle separately; kept simple for this context-based start
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pb-10 pt-6 sm:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl">
            {title}
          </h1>
          <div className="relative w-40 sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tracks, artists, albums..."
              className="w-full rounded-full border border-white/10 bg-white/5 py-2 pl-9 pr-4 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-fuchsia-400/40 focus:bg-white/10"
            />
          </div>
        </div>
        {!searchResults && <Breadcrumbs path={folderPath} onNavigate={navigate} />}
      </div>

      {/* Folder grid */}
      {!searchResults && childFolders.length > 0 && (
        <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {childFolders.map((folder) => (
            <FolderCard key={folder.id} folder={folder} onOpen={() => navigate(folder.id)} />
          ))}
        </div>
      )}

      {/* Track list toolbar */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => playAll()}
            disabled={sortedTracks.length === 0}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-fuchsia-500/20 transition hover:scale-105 disabled:opacity-30 disabled:hover:scale-100"
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Play All
          </button>
          <button
            onClick={() => {
              if (sortedTracks.length === 0) return;
              const shuffled = [...sortedTracks].sort(() => Math.random() - 0.5);
              playQueue(shuffled, 0);
            }}
            disabled={sortedTracks.length === 0}
            className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/5 disabled:opacity-30"
          >
            <Shuffle className="h-3.5 w-3.5" /> Shuffle
          </button>
          <button
            onClick={onImport}
            disabled={importing}
            className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/5 disabled:opacity-30"
          >
            <Upload className="h-3.5 w-3.5" /> {importing ? "Importing…" : "Import"}
          </button>
        </div>
        <div className="relative">
          <button
            onClick={() => setSortOpen((o) => !o)}
            className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-medium text-white/60 transition hover:bg-white/5"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Sort
          </button>
          {sortOpen && (
            <div className="absolute right-0 z-10 mt-2 w-40 overflow-hidden rounded-xl border border-white/10 bg-[#13131f] shadow-xl">
              {[
                { key: "title" as const, label: "Title", icon: ArrowDownAZ },
                { key: "artist" as const, label: "Artist", icon: ArrowDownAZ },
                { key: "duration" as const, label: "Duration", icon: Clock },
                { key: "addedAt" as const, label: "Recently Added", icon: Clock },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => {
                    setSortKey(key);
                    setSortOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-white/5",
                    sortKey === key ? "text-fuchsia-300" : "text-white/60",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Track rows */}
      <div className="space-y-0.5">
        {loading && (
          <div className="flex flex-col gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-white/[0.03]" />
            ))}
          </div>
        )}
        {!loading &&
          sortedTracks.map((track, i) => (
            <TrackRow
              key={track.id}
              track={track}
              index={i}
              isActive={currentTrack?.id === track.id}
              isPlaying={isPlaying}
              onPlay={() => playTrack(track, sortedTracks)}
              onToggleLike={() => toggleLike(track.id)}
              onAddToQueue={() => addToQueue(track)}
            />
          ))}
        {!loading && sortedTracks.length === 0 && childFolders.length === 0 && (
          <div className="mt-16 flex flex-col items-center gap-3 text-center">
            {folderId === "device" && <HardDrive className="h-6 w-6 text-white/20" />}
            <p className="text-sm text-white/30">
              {folderId === "device"
                ? "No imported files yet. Use Import to add audio from this device — the file picker plugin copies the path, the audio plugin plays it."
                : folderId === "favorites"
                  ? "Nothing liked yet. Tap the heart on a track."
                  : "No audio files found here."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
