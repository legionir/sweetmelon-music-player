import { NavLink } from "react-router-dom";
import { Compass, Disc3, FolderOpen, Music4 } from "lucide-react";
import { cn } from "../utils/cn";

const items = [
  { to: "/", label: "Explorer", icon: Compass, end: true },
  { to: "/files", label: "Files", icon: FolderOpen, end: false },
  { to: "/now-playing", label: "Playing", icon: Disc3, end: false },
];

/** The active tab shows its name, the others only an icon, so the bar always fits. */
export function MobileNav() {
  return (
    <header className="flex items-center justify-between gap-2 border-b border-white/5 bg-[#0b0b14]/70 px-3 py-2.5 backdrop-blur-xl lg:hidden">
      <div className="flex min-w-0 shrink items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-500 via-violet-500 to-cyan-400">
          <Music4 className="h-4 w-4 text-white" />
        </div>
        <span className="truncate text-sm font-bold text-white">Melon Player</span>
      </div>
      <nav className="flex shrink-0 items-center gap-1 rounded-full bg-white/5 p-1">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            aria-label={label}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition",
                isActive ? "bg-white text-[#0a0a12]" : "text-white/60",
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="h-4 w-4" />
                {isActive && label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
