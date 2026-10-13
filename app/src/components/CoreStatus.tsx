import { usePlayer } from "../context/PlayerContext";
import { cn } from "../utils/cn";

/**
 * Shows which playback engine and which plugins the app is running on.
 * "Native core" means the Sweetmelon bridge answered; "Web preview" means the
 * bundle runs in a plain browser (Vite dev server) with web fallbacks.
 */
export function CoreStatus({ variant = "card" }: { variant?: "card" | "pill" }) {
  const { bridge, ready, engineKind } = usePlayer();
  const native = bridge.mode === "native";
  const label = !ready ? "Connecting…" : native ? "Native core" : "Web preview";
  const detail = native
    ? "audio · storage · toast · wake-lock · share · file-picker"
    : bridge.placeholder
      ? "js/native-sdk.js is the dev placeholder: browser audio and localStorage"
      : "Bridge unavailable: browser audio and localStorage";

  if (variant === "pill") {
    return (
      <span className="flex items-center gap-2 rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/60">
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            !ready ? "bg-amber-400" : native ? "bg-emerald-400" : "bg-cyan-400",
          )}
        />
        {native ? "core" : "web"}
      </span>
    );
  }

  return (
    <div className="mt-auto rounded-2xl bg-gradient-to-br from-violet-600/20 via-fuchsia-500/10 to-transparent p-4">
      <p className="flex items-center gap-2 text-xs font-semibold text-white/80">
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            !ready ? "bg-amber-400" : native ? "bg-emerald-400" : "bg-cyan-400",
          )}
        />
        {label}
        {engineKind === "native" && <span className="text-white/30">· audio plugin</span>}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-white/40">{detail}</p>
    </div>
  );
}
