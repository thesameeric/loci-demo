import { type MapState } from "loci-sdk";
import LociMap from "./LociMap";

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
  return (
    <div className="app">
      <header className="app-header">
        <strong>loci demo</strong>
        <span>React + loci-sdk</span>
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
            onAnalyze: (r) => console.log("area analysis", r),
            onExport: (exp) => {
              console.log("export", exp.kind, exp);
              if (exp.kind === "map") {
                localStorage.setItem(STATE_KEY, JSON.stringify(exp.state));
              }
            },
            state: savedState(),
          }}
          onReady={(controller) => {
            // Handy for poking around in the devtools console.
            (window as unknown as { loci: unknown }).loci = controller;
          }}
        />
      </main>
    </div>
  );
}
