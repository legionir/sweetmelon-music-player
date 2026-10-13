import { ChevronRight, Home } from "lucide-react";
import type { FolderNode } from "../types";

export function Breadcrumbs({
  path,
  onNavigate,
}: {
  path: FolderNode[];
  onNavigate: (folderId: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 text-sm text-white/50">
      <button
        onClick={() => onNavigate("root")}
        className="flex items-center gap-1 rounded-lg px-2 py-1 transition hover:bg-white/5 hover:text-white"
      >
        <Home className="h-3.5 w-3.5" />
      </button>
      {path
        .filter((f) => f.id !== "root")
        .map((folder, i, arr) => (
          <span key={folder.id} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-white/20" />
            <button
              onClick={() => onNavigate(folder.id)}
              className={`rounded-lg px-2 py-1 transition hover:bg-white/5 hover:text-white ${
                i === arr.length - 1 ? "font-semibold text-white" : ""
              }`}
            >
              {folder.name}
            </button>
          </span>
        ))}
    </div>
  );
}
