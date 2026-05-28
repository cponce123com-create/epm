import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react/custom-fetch";
import { initSentry } from "./lib/sentry";

initSentry();

const apiUrl = import.meta.env.VITE_API_URL;
if (apiUrl) {
  setBaseUrl(apiUrl);
}

// ── Para los curiosos del inspector ──
console.log(
  "%c🛡️  NO!\\n%cSi estás viendo esto, probablemente sabés lo que hacés.\\nEste sitio corre sobre Express + React + PostgreSQL.\\nNo hay secretos acá, solo comunicación ciudadana desde la selva.\\n— El Príncipe Mestizo",
  "font-size:2em;font-weight:bold;color:#7A1F1F;",
  "color:#888;font-style:italic;"
);

createRoot(document.getElementById("root")!).render(<App />);

