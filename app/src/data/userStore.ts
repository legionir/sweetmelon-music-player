/**
 * -----------------------------------------------------------------------
 * USER DATA
 * -----------------------------------------------------------------------
 * Everything the app remembers between launches, stored with the core
 * `storage` plugin (JSON, SharedPreferences on the device) and mirrored to
 * localStorage when there is no bridge.
 *
 * Only ids are persisted for the queue: track objects carry cover art, and
 * artwork is inlined into the bundle.
 */
import { storeGet, storeSet } from "../native/plugins";
import type { PlayerPrefs } from "../types";

const PREFIX = "mmp.";

export const KEYS = {
  prefs: `${PREFIX}prefs`,
  likes: `${PREFIX}likes`,
  /** Audio files the user imported through the `file_picker` plugin. */
  imported: `${PREFIX}library`,
} as const;

export const defaultPrefs: PlayerPrefs = {
  volume: 0.8,
  muted: false,
  shuffle: false,
  repeat: "off",
  queueIds: [],
  currentIndex: -1,
  position: 0,
};

export async function loadPlayerPrefs(): Promise<PlayerPrefs> {
  const stored = await storeGet<Partial<PlayerPrefs>>(KEYS.prefs, {});
  return { ...defaultPrefs, ...stored };
}

export async function savePlayerPrefs(prefs: PlayerPrefs): Promise<void> {
  await storeSet(KEYS.prefs, prefs);
}

/** `null` means "never saved" — the app then starts from the demo likes. */
export async function loadLikedIds(): Promise<string[] | null> {
  const stored = await storeGet<string[] | null>(KEYS.likes, null);
  return Array.isArray(stored) ? stored : null;
}

export async function saveLikedIds(ids: string[]): Promise<void> {
  await storeSet(KEYS.likes, ids);
}

export interface ImportedFile {
  id: string;
  name: string;
  path: string;
  size?: number;
  addedAt: string;
  /** Learned from the engine the first time the file is played. */
  duration?: number;
}

export async function loadImportedFiles(): Promise<ImportedFile[]> {
  const stored = await storeGet<ImportedFile[]>(KEYS.imported, []);
  if (!Array.isArray(stored)) return [];
  return stored.filter((file) => file && typeof file.path === "string");
}

export async function saveImportedFiles(files: ImportedFile[]): Promise<void> {
  await storeSet(KEYS.imported, files);
}
