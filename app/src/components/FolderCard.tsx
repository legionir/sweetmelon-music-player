import { Clock3, Folder, HardDrive, Heart, ListMusic, Sparkles } from "lucide-react";
import type { FolderNode } from "../types";

const ICONS: Record<NonNullable<FolderNode["kind"]>, typeof Folder> = {
  root: Folder,
  smart: Sparkles,
  playlist: ListMusic,
  genre: Clock3,
  device: HardDrive,
  default: Folder,
};

const colorFor: Record<string, string> = {
  smart: "from-amber-500/25 to-orange-500/5 text-amber-300",
  playlist: "from-fuchsia-500/25 to-violet-500/5 text-fuchsia-300",
  genre: "from-cyan-500/25 to-sky-500/5 text-cyan-300",
  device: "from-emerald-500/25 to-teal-500/5 text-emerald-300",
  default: "from-violet-500/25 to-indigo-500/5 text-violet-300",
  root: "from-violet-500/25 to-indigo-500/5 text-violet-300",
};

export function FolderCard({ folder, onOpen }: { folder: FolderNode; onOpen: () => void }) {
  const Icon = folder.id === "favorites" ? Heart : ICONS[folder.kind ?? "default"];
  const palette = colorFor[folder.kind ?? "default"];

  return (
    <button
      onClick={onOpen}
      className="group flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-left transition hover:-translate-y-0.5 hover:border-white/10 hover:bg-white/[0.06] hover:shadow-lg hover:shadow-black/20"
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${palette}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white group-hover:text-white">
          {folder.name}
        </p>
        {folder.description && (
          <p className="truncate text-xs text-white/40">{folder.description}</p>
        )}
      </div>
    </button>
  );
}
