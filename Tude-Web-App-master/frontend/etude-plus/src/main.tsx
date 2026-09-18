import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n";

Sentry.init({
  dsn: "https://d2025be86e870aeac824935b1b067c6e@o4511182895579136.ingest.us.sentry.io/4511229774987264",
  sendDefaultPii: true,
});

createRoot(document.getElementById("root")!).render(<App />);
