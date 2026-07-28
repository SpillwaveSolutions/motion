import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const container = document.getElementById("root");
if (!container) {
    throw new Error("Root element not found");
}

const root = createRoot(container);
root.render(<App />);

// E2E readiness signal. Specs wait for [data-app-ready] rather than racing a
// half-mounted tree. Set after paint so it means "React has rendered", not
// merely "the bundle parsed".
requestAnimationFrame(() => {
    document.documentElement.dataset["appReady"] = "true";
});
