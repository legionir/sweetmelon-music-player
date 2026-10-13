/**
 * Core domain types for the music player.
 *
 * These interfaces are intentionally decoupled from any specific data
 * source. Today they're backed by `src/data/library.ts`, which merges the
 * bundled demo catalogue with the files imported from the device.
 */

export type RepeatMode = "off" | "all" | "one";

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  /** Duration in seconds. 0 means "unknown until the engine reports it". */
  duration: number;
  /** Playable audio source: an http(s) URL or an absolute path on the device. */
  src: string;
  /** Square cover artwork URL (bundled artwork or an inline SVG placeholder). */
  cover: string;
  /** ISO date string representing when the file was added to the library. */
  addedAt: string;
  liked: boolean;
  /** Id of the parent folder this track lives in. */
  folderId: string;
  /** Where the track comes from: the demo catalogue or this device. */
  origin?: "demo" | "device";
}

export type FileSystemNodeType = "folder" | "track";

export interface FolderNode {
  id: string;
  type: "folder";
  name: string;
  parentId: string | null;
  /** Optional icon hint used by the explorer UI. */
  kind?: "root" | "playlist" | "genre" | "smart" | "device" | "default";
  description?: string;
}

export type ExplorerEntry =
  | (FolderNode & { type: "folder" })
  | (Track & { type: "track" });

export interface PlayerState {
  queue: Track[];
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
}

/** Persisted with the core `storage` plugin (SharedPreferences on device). */
export interface PlayerPrefs {
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  /** Queue as track ids: artwork is inlined, so tracks are rebuilt on launch. */
  queueIds: string[];
  currentIndex: number;
  /** Playback position in seconds, to resume where the user left off. */
  position: number;
}
