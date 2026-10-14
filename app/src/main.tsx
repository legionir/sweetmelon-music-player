import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { applySafeArea } from "./native/plugins";
import { waitForBridge } from "./native/sdk";

void waitForBridge().then((native) => {
  if (native) void applySafeArea();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
