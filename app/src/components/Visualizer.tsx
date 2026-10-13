import { useEffect, useRef } from "react";
import { cn } from "../utils/cn";

/**
 * Lightweight decorative audio visualizer.
 *
 * This is deliberately CSS/JS driven (not tied to a Web Audio
 * AnalyserNode) because the demo audio sources are third-party and may
 * not expose CORS-enabled byte streams. The hook below is isolated so it
 * can be swapped for a real `AnalyserNode`-based implementation later:
 * just replace `useFakeAmplitude` with real frequency data sampling and
 * feed it into the same `heights` array.
 */
function useFakeAmplitude(bars: number, active: boolean) {
  const ref = useRef<number[]>(Array.from({ length: bars }, () => 0.2));

  useEffect(() => {
    if (!active) return;
    let frame: number;
    const tick = () => {
      ref.current = ref.current.map(() => 0.15 + Math.random() * 0.85);
      frame = requestAnimationFrame(() => setTimeout(tick, 140));
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [active]);

  return ref;
}

export function Visualizer({
  active,
  bars = 24,
  className,
  barClassName,
}: {
  active: boolean;
  bars?: number;
  className?: string;
  barClassName?: string;
}) {
  const amplitudeRef = useFakeAmplitude(bars, active);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf: number;
    const render = () => {
      const el = containerRef.current;
      if (el) {
        const children = el.children;
        for (let i = 0; i < children.length; i++) {
          const bar = children[i] as HTMLDivElement;
          const h = active ? amplitudeRef.current[i] ?? 0.2 : 0.12;
          bar.style.transform = `scaleY(${h})`;
        }
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [active, amplitudeRef]);

  return (
    <div ref={containerRef} className={cn("flex items-end gap-[3px]", className)}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-full w-[3px] origin-bottom rounded-full bg-gradient-to-t from-fuchsia-500 via-violet-400 to-cyan-300 transition-transform duration-150 ease-out",
            barClassName,
          )}
          style={{ transform: "scaleY(0.12)" }}
        />
      ))}
    </div>
  );
}
