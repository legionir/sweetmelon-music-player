import { useEffect, useState } from "react";
import { subscribeToasts, type ToastMessage } from "../native/notify";

/**
 * Renders the messages that the core `toast` plugin shows natively. In a
 * browser there is no toast plugin, so `notify()` routes them here instead.
 */
export function ToastHost() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(
    () =>
      subscribeToasts((message) => {
        setToasts((list) => [...list, message]);
        window.setTimeout(() => {
          setToasts((list) => list.filter((entry) => entry.id !== message.id));
        }, 2600);
      }),
    [],
  );

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-28">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="rounded-full border border-white/10 bg-[#13131f]/95 px-4 py-2 text-xs font-medium text-white/90 shadow-xl shadow-black/40 backdrop-blur-xl"
        >
          {toast.text}
        </div>
      ))}
    </div>
  );
}
