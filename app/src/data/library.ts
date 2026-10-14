/**
 * -----------------------------------------------------------------------
 * LIBRARY SERVICE
 * -----------------------------------------------------------------------
 * The single data source the UI talks to. It merges the bundled demo
 * catalogue with the audio files imported from the device (`file_picker`
 * plugin) and applies the likes stored on the device (`storage` plugin).
 * -----------------------------------------------------------------------
 */
import type { FolderNode, Track } from "../types";
import type { PickedFile } from "../native/sdk";
import { folders as demoFolders, tracks as demoTracks } from "./demoLibrary";
import {
  loadImportedFiles,
  saveImportedFiles,
  saveLikedIds,
  loadLikedIds,
  type ImportedFile,
} from "./userStore";

export interface LibraryService {
  getFolders(): Promise<FolderNode[]>;
  getAllTracks(): Promise<Track[]>;
  /** Returns the folders + tracks that live directly inside a given folder id. */
  getFolderContents(folderId: string): Promise<{ folders: FolderNode[]; tracks: Track[] }>;
  getFolderPath(folderId: string): Promise<FolderNode[]>;
  searchTracks(query: string): Promise<Track[]>;
  toggleLike(trackId: string): Promise<Track>;
}

/** Cover art for imported files: an inline SVG, so nothing has to be bundled. */
const DEVICE_COVER = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#111827"/><stop offset="1" stop-color="#4338ca"/></linearGradient></defs>` +
    `<rect width="320" height="320" fill="url(#g)"/>` +
    `<g fill="none" stroke="#a78bfa" stroke-width="13" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="M126 212V118l88-22v92"/><circle cx="112" cy="216" r="20"/><circle cx="200" cy="194" r="20"/>` +
    `</g></svg>`,
)}`;

let importedFiles: ImportedFile[] = [];
let likedIds = new Set<string>();
const listeners = new Set<() => void>();

export function subscribeLibrary(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function publish() {
  listeners.forEach((listener) => listener());
}

function hashId(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

function titleFromFileName(name: string): string {
  return name
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function fileToTrack(file: ImportedFile): Track {
  return {
    id: file.id,
    title: titleFromFileName(file.name),
    artist: "This device",
    album: "Imported files",
    genre: "Local",
    duration: file.duration ?? 0,
    src: file.path,
    cover: DEVICE_COVER,
    addedAt: file.addedAt,
    liked: false,
    folderId: "device",
    origin: "device",
  };
}

function importedTracks(): Track[] {
  return importedFiles.map(fileToTrack);
}

function persistImported(): Promise<void> {
  return saveImportedFiles(importedFiles);
}

/** Likes are stored as ids; tracks without a stored like keep the demo value. */
function withLike(track: Track): Track {
  return { ...track, liked: likedIds.has(track.id) };
}

function allTracks(): Track[] {
  return [...demoTracks, ...importedTracks()].map(withLike);
}

function allFolders(): FolderNode[] {
  return demoFolders;
}

export function trackById(id: string): Track | undefined {
  return allTracks().find((track) => track.id === id);
}

/** Loads the likes and the imported files from the device. Call once at boot. */
export async function hydrateLibrary(): Promise<void> {
  const [files, likes] = await Promise.all([loadImportedFiles(), loadLikedIds()]);
  importedFiles = files;
  likedIds = new Set(
    likes ?? demoTracks.filter((track) => track.liked).map((track) => track.id),
  );
  if (likes === null) void saveLikedIds([...likedIds]);
  publish();
}

/** A playable track for a file on the device, without adding it to the library. */
export function deviceTrack(file: PickedFile): Track {
  const id = `device-${hashId(file.path)}`;
  const known = importedFiles.find((entry) => entry.id === id);
  return withLike(
    fileToTrack(
      known ?? {
        id,
        name: file.name || file.path.split("/").pop() || "audio",
        path: file.path,
        size: file.size,
        addedAt: new Date().toISOString(),
      },
    ),
  );
}

/** Remembers files played from the Files tab, so the queue survives a restart. */
export async function rememberDeviceFiles(files: PickedFile[]): Promise<Track[]> {
  if (files.length === 0) return [];

  const known = new Set(importedFiles.map((file) => file.path));
  const added: ImportedFile[] = files
    .filter((file) => {
      if (!file.path || known.has(file.path)) return false;
      known.add(file.path);
      return true;
    })
    .map((file) => ({
      id: `device-${hashId(file.path)}`,
      name: file.name || file.path.split("/").pop() || "audio",
      path: file.path,
      size: file.size,
      addedAt: new Date().toISOString(),
    }));

  if (added.length === 0) return [];

  importedFiles = [...importedFiles, ...added];
  await persistImported();
  publish();
  return added.map(fileToTrack);
}

export async function removeImportedTrack(id: string): Promise<void> {
  importedFiles = importedFiles.filter((file) => file.id !== id);
  await persistImported();
  publish();
}

/** The engine reports the real duration the first time a file plays. */
export function noteTrackDuration(id: string, seconds: number): void {
  const file = importedFiles.find((entry) => entry.id === id);
  if (!file || seconds <= 0) return;
  const rounded = Math.round(seconds);
  if (file.duration === rounded) return;
  file.duration = rounded;
  void persistImported();
  publish();
}

function simulateLatency<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), 40));
}

export const libraryService: LibraryService = {
  async getFolders() {
    return simulateLatency(allFolders());
  },

  async getAllTracks() {
    return simulateLatency(allTracks());
  },

  async getFolderContents(folderId) {
    const tracks = allTracks();

    if (folderId === "recent") {
      const sorted = [...tracks].sort(
        (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime(),
      );
      return simulateLatency({ folders: [], tracks: sorted });
    }
    if (folderId === "favorites") {
      return simulateLatency({ folders: [], tracks: tracks.filter((t) => t.liked) });
    }

    return simulateLatency({
      folders: allFolders().filter((folder) => folder.parentId === folderId),
      tracks: tracks.filter((track) => track.folderId === folderId),
    });
  },

  async getFolderPath(folderId) {
    const path: FolderNode[] = [];
    let current = allFolders().find((folder) => folder.id === folderId) ?? null;
    while (current) {
      path.unshift(current);
      const parentId = current.parentId;
      current = parentId
        ? allFolders().find((folder) => folder.id === parentId) ?? null
        : null;
    }
    return simulateLatency(path);
  },

  async searchTracks(query) {
    const needle = query.trim().toLowerCase();
    if (!needle) return simulateLatency([]);
    return simulateLatency(
      allTracks().filter(
        (track) =>
          track.title.toLowerCase().includes(needle) ||
          track.artist.toLowerCase().includes(needle) ||
          track.album.toLowerCase().includes(needle) ||
          track.genre.toLowerCase().includes(needle),
      ),
    );
  },

  async toggleLike(trackId) {
    const track = allTracks().find((entry) => entry.id === trackId);
    if (!track) throw new Error(`Track ${trackId} not found`);

    if (likedIds.has(trackId)) likedIds.delete(trackId);
    else likedIds.add(trackId);
    void saveLikedIds([...likedIds]);
    publish();
    return { ...track, liked: likedIds.has(trackId) };
  },
};
