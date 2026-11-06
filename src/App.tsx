import { useRef, useState } from "react";
import { type LociMapController, type MapState, type PolygonAnalysis } from "loci-sdk";
import LociMap from "./LociMap";
import { buildReport, type StoredAnalysis } from "./report";

const env = import.meta.env;

// The demo round-trips the SDK's "Export → Map (JSON)" through localStorage:
// export saves the workspace, a reload restores the exact view — camera,
// basemap, place filter, dataset colours and drawings.
const STATE_KEY = "loci-demo-state";

function savedState(): MapState | undefined {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    return raw ? (JSON.parse(raw) as MapState) : undefined;
  } catch {
    return undefined;
  }
}

export default function App() {
  const ctrl = useRef<LociMapController | null>(null);
  // Every analysis the user runs, captured through the onAnalyze hook — the
  // raw material for the report. Kept to the latest ten.
  const [analyses, setAnalyses] = useState<StoredAnalysis[]>([]);
  const [busy, setBusy] = useState(false);

  // The report: the map snapshot (exportImage), the captured analyses, and the
  // workspace state — composed into one self-contained printable HTML page.
  // This is the host-app side of the SDK's hook contract, demonstrated.
  const openReport = async () => {
    const c = ctrl.current;
    if (!c || !analyses.length || busy) return;
    setBusy(true);
    try {
      const png = await c
        .exportImage()
        .then(
          (blob) =>
            new Promise<string | null>((resolve) => {
              const r = new FileReader();
              r.onload = () => resolve(String(r.result));
              r.onerror = () => resolve(null);
              r.readAsDataURL(blob);
            })
        )
        .catch(() => null);
      const html = buildReport({ analyses, mapPng: png, state: c.getState(), drawings: c.getDrawings() });
      const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
      // A new tab for reading/printing; a download when the popup is blocked.
      if (!window.open(url, "_blank")) {
        const a = document.createElement("a");
        a.href = url;
        a.download = `loci-report-${new Date().toISOString().slice(0, 10)}.html`;
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <strong>loci demo</strong>
        <span>React + loci-sdk</span>
        <button
          className="report-btn"
          onClick={openReport}
          disabled={!analyses.length || busy}
          title={analyses.length ? "Open a printable report of the analysed areas" : "Draw a shape and analyse it first"}
        >
          {busy ? "Preparing…" : `Report${analyses.length ? ` (${analyses.length})` : ""}`}
        </button>
        <a href="https://www.npmjs.com/package/loci-sdk" target="_blank" rel="noreferrer">
          npm: loci-sdk
        </a>
      </header>
      <main className="map-wrap">
        <LociMap
          options={{
            baseUrl: env.VITE_LOCI_BASE || "https://api.loci.ng",
            auth: { apiKey: env.VITE_LOCI_KEY },
            // Optional: the SDK borrows the deployment's Mapbox token with
            // your key when this is unset.
            mapboxToken: env.VITE_MAPBOX_TOKEN || undefined,
            title: "loci",
            subtitle: "Nigeria — demo",
            basemap: "dark",
            onAnalyze: (r: PolygonAnalysis) =>
              setAnalyses((prev) => [...prev.slice(-9), { at: new Date().toISOString(), result: r }]),
            onExport: (exp) => {
              console.log("export", exp.kind, exp);
              if (exp.kind === "map") {
                localStorage.setItem(STATE_KEY, JSON.stringify(exp.state));
              }
            },
            state: savedState(),
          }}
          onReady={(controller) => {
            ctrl.current = controller;
            // Handy for poking around in the devtools console.
            (window as unknown as { loci: unknown }).loci = controller;
          }}
        />
      </main>
    </div>
  );
}
