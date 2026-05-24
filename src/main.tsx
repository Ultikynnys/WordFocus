import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";

async function reportFrontendFailure(prefix: string, details: string) {
  const message = `${prefix}: ${details}`;
  console.error(message);

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("log_frontend_error", { message });
  } catch (error) {
    console.error("Failed to forward frontend error to backend console", error);
  }
}

window.addEventListener("error", (event) => {
  const details = event.error instanceof Error
    ? `${event.error.name}: ${event.error.message}\n${event.error.stack ?? ""}`
    : event.message;

  void reportFrontendFailure("Unhandled error", details);
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason instanceof Error
    ? `${event.reason.name}: ${event.reason.message}\n${event.reason.stack ?? ""}`
    : String(event.reason);

  void reportFrontendFailure("Unhandled promise rejection", reason);
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
