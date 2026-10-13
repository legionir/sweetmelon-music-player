import { NavLink } from "react-router-dom";
import { Compass, Disc3, Music4 } from "lucide-react";
import { cn } from "../utils/cn";
import { CoreStatus } from "./CoreStatus";

export function MobileNav() {
  return (
    <header className="flex items-center justify-between border-b border-white/5 bg-[#0b0b14]/70 px-4 py-3 backdrop-blur-xl lg:hidden">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-500 via-violet-500 to-cyan-400">
          <Music4 className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-bold text-white">SWEETMELON</span>
        <CoreStatus variant="pill" />
      </div>
      <nav className="flex items-center gap-1 rounded-full bg-white/5 p-1">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition",
              isActive ? "bg-white text-[#0a0a12]" : "text-white/60",
            )
          }
        >
          <Compass className="h-3.5 w-3.5" /> Explorer
        </NavLink>
        <NavLink
          to="/now-playing"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition",
              isActive ? "bg-white text-[#0a0a12]" : "text-white/60",
            )
          }
        >
          <Disc3 className="h-3.5 w-3.5" /> Playing
        </NavLink>
      </nav>
    </header>
  );
}
