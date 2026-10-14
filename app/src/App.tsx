import { HashRouter, Route, Routes } from "react-router-dom";
import { PlayerProvider } from "./context/PlayerContext";
import { NativeShell } from "./components/NativeShell";
import { Sidebar } from "./components/Sidebar";
import { MobileNav } from "./components/MobileNav";
import { PlayerBar } from "./components/PlayerBar";
import { ToastHost } from "./components/ToastHost";
import { Explorer } from "./pages/Explorer";
import { NowPlaying } from "./pages/NowPlaying";
import { Files } from "./pages/Files";

export default function App() {
  return (
    <PlayerProvider>
      <HashRouter>
        <NativeShell />
        <div className="min-h-screen bg-[#07070d] text-white antialiased">
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <MobileNav />
              <main className="flex-1 pb-24">
                <Routes>
                  <Route path="/" element={<Explorer />} />
                  <Route path="/files" element={<Files />} />
                  <Route path="/now-playing" element={<NowPlaying />} />
                </Routes>
              </main>
            </div>
          </div>
          <PlayerBar />
          <ToastHost />
        </div>
      </HashRouter>
    </PlayerProvider>
  );
}
