import { NavLink } from "react-router-dom";
import { Compass, Disc3, FolderOpen, Heart, ListMusic, Music4, Radio } from "lucide-react";
import { cn } from "../utils/cn";
import { CoreStatus } from "./CoreStatus";

const navItems = [
  { to: "/", label: "Explorer", icon: Compass, end: true },
  { to: "/files", label: "Files", icon: FolderOpen, end: false },
  { to: "/now-playing", label: "Now Playing", icon: Disc3, end: false },
];

const quickLinks = [
  { id: "favorites", label: "Favorites", icon: Heart },
  { id: "pl-chill", label: "Chill Vibes", icon: ListMusic },
  { id: "pl-workout", label: "Workout Mix", icon: Radio },
];

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-white/5 bg-[#0b0b14]/60 p-5 backdrop-blur-xl lg:flex">
      <div className="mb-8 flex items-center gap-3 px-1">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 via-violet-500 to-cyan-400 shadow-lg shadow-fuchsia-500/30">
          <Music4 className="h-5 w-5 text-white" strokeWidth={2.4} />
        </div>
        <div>
          <p className="text-sm font-bold tracking-wide text-white">Melon Player</p>
          <p className="text-[11px] text-white/40">your music</p>
        </div>
      </div>

      <nav className="space-y-1">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-white/10 text-white shadow-inner shadow-white/5"
                  : "text-white/50 hover:bg-white/5 hover:text-white/90",
              )
            }
          >
            <Icon className="h-4.5 w-4.5" size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <p className="mb-2 mt-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/30">
        Quick Access
      </p>
      <nav className="space-y-1">
        {quickLinks.map(({ id, label, icon: Icon }) => (
          <NavLink
            key={id}
            to={`/?folder=${id}`}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/50 transition-all hover:bg-white/5 hover:text-white/90"
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <CoreStatus />
    </aside>
  );
}
