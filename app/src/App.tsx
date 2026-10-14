import { HashRouter, Route, Routes, useLocation } from "react-router-dom";
import { PlayerProvider } from "./context/PlayerContext";
import { NativeShell } from "./components/NativeShell";
import { Sidebar } from "./components/Sidebar";
import { MobileNav } from "./components/MobileNav";
import { PlayerBar } from "./components/PlayerBar";
import { ToastHost } from "./components/ToastHost";
import { Explorer } from "./pages/Explorer";
import { Files } from "./pages/Files";
import { NowPlaying } from "./pages/NowPlaying";
import { cn } from "./utils/cn";

/**
 * The shell is exactly the height of the screen and never scrolls itself.
 * Lists scroll inside <main>; the Now Playing page does not scroll at all and
 * has no mini player under it.
 */
function Shell() {
  const onNowPlaying = useLocation().pathname === "/now-playing";

  return (
    <div className="flex h-full flex-col bg-[#07070d] text-white antialiased">
      <MobileNav />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main
          className={cn(
            "min-h-0 min-w-0 flex-1",
            onNowPlaying ? "overflow-hidden" : "overflow-y-auto overscroll-contain pb-28",
          )}
        >
          <Routes>
            <Route path="/" element={<Explorer />} />
            <Route path="/files" element={<Files />} />
            <Route path="/now-playing" element={<NowPlaying />} />
          </Routes>
        </main>
      </div>
      {!onNowPlaying && <PlayerBar />}
      <ToastHost />
    </div>
  );
}

export default function App() {
  return (
    <PlayerProvider>
      <HashRouter>
        <NativeShell />
        <Shell />
      </HashRouter>
    </PlayerProvider>
  );
}
