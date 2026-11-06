import type { MapState, PolygonAnalysis } from "loci-sdk";

/** One captured analysis: what the onAnalyze hook delivered, and when. */
export interface StoredAnalysis {
  at: string; // ISO timestamp
  result: PolygonAnalysis;
}

const fmt = (n: number, dp = 0) =>
  n.toLocaleString("en", { maximumFractionDigits: dp, minimumFractionDigits: 0 });

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * A self-contained, printable HTML report: the map snapshot, one section per
 * analysed area (totals, amenities, travel times), and the drawn shapes as
 * GeoJSON in an appendix. Open it in a tab and Cmd/Ctrl+P makes the PDF —
 * no dependency carries more weight than the browser's own print engine.
 */
export function buildReport(opts: {
  analyses: StoredAnalysis[];
  mapPng: string | null;
  state: MapState;
  drawings: GeoJSON.FeatureCollection;
}): string {
  const { analyses, mapPng, state, drawings } = opts;
  const generated = new Date().toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" });

  const sections = analyses
    .map((a, i) => {
      const r = a.result;
      const agg = r.aggregate;
      const metrics = (agg?.metrics ?? [])
        .map(
          (m) =>
            `<tr><td>${esc(m.label)}</td><td class="num">${fmt(m.total)}</td><td class="num">${fmt(m.density, 1)} / km²</td></tr>`
        )
        .join("");
      const amenities = r.amenities
        .map((am) => {
          const nearest = am.nearest
            ? `nearest: <strong>${esc(am.nearest.name || am.nearest.id)}</strong> (${fmt(am.nearest.distanceM / 1000, 1)} km)`
            : "none nearby";
          return `<tr><td>${esc(am.layer.name)}</td><td class="num">${fmt(am.inside.length)} inside</td><td>${nearest}</td></tr>`;
        })
        .join("");
      const travel = r.travel
        ? r.travel.legs
            .map(
              (l) =>
                `<tr><td>${esc(l.mode)}</td><td class="num">${l.reachable ? `${fmt(l.minutes)} min` : "unreachable"}</td><td class="num">${l.reachable ? `${fmt(l.distanceKm, 1)} km` : "—"}</td></tr>`
            )
            .join("")
        : "";
      return `
  <section>
    <h2>Area ${i + 1}</h2>
    <p class="meta">Analysed ${new Date(a.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}${
        agg
          ? ` · ${fmt(agg.areaKm2, 1)} km² · ${fmt(agg.coverage * 100)}% covered by data · ${fmt(agg.frames)} frames`
          : ""
      }</p>
    ${metrics ? `<table><thead><tr><th>Metric</th><th class="num">Total</th><th class="num">Density</th></tr></thead><tbody>${metrics}</tbody></table>` : ""}
    ${amenities ? `<h3>Amenities</h3><table><thead><tr><th>Dataset</th><th class="num">In the area</th><th>Nearest</th></tr></thead><tbody>${amenities}</tbody></table>` : ""}
    ${travel ? `<h3>Travel time to ${esc(r.travel!.to)}</h3><table><thead><tr><th>Mode</th><th class="num">Time</th><th class="num">Distance</th></tr></thead><tbody>${travel}</tbody></table>` : ""}
  </section>`;
    })
    .join("\n");

  const layersOn = state.datasets.filter((d) => d.on).length;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>LOCI analysis report</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0 auto; max-width: 780px; padding: 40px 24px 64px; color: #16181d;
         font: 14px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #fff; }
  h1 { font-size: 22px; margin: 0 0 2px; letter-spacing: -0.01em; }
  h2 { font-size: 16px; margin: 36px 0 2px; }
  h3 { font-size: 13px; margin: 18px 0 6px; color: #3c4047; }
  .meta { color: #6b7076; font-size: 12.5px; margin: 0 0 12px; }
  img.map { width: 100%; border-radius: 10px; border: 1px solid #e3e5e8; margin: 18px 0 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; padding: 7px 10px; border-bottom: 1px solid #eceef1; }
  th { color: #6b7076; font-weight: 600; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.04em; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  details { margin-top: 36px; }
  summary { cursor: pointer; color: #6b7076; font-size: 12.5px; }
  pre { background: #f6f7f8; border: 1px solid #eceef1; border-radius: 8px; padding: 12px;
        font-size: 11px; overflow: auto; max-height: 320px; }
  footer { margin-top: 44px; color: #9aa0a6; font-size: 11.5px; border-top: 1px solid #eceef1; padding-top: 12px; }
  .hint { background: #f6f7f8; border-radius: 8px; padding: 9px 12px; color: #6b7076; font-size: 12px; margin: 14px 0 0; }
  @media print { .hint { display: none; } body { padding-top: 0; } }
</style>
</head>
<body>
  <h1>LOCI analysis report</h1>
  <p class="meta">Generated ${generated} · ${analyses.length} analysed area${analyses.length === 1 ? "" : "s"} · ${layersOn} layer${layersOn === 1 ? "" : "s"} shown · basemap: ${esc(state.basemap)}</p>
  <p class="hint">Print this page (Cmd/Ctrl + P) to save it as a PDF.</p>
  ${mapPng ? `<img class="map" src="${mapPng}" alt="The analysed map view">` : ""}
  ${sections}
  <details>
    <summary>Drawn shapes (GeoJSON, ${drawings.features.length})</summary>
    <pre>${esc(JSON.stringify(drawings, null, 2))}</pre>
  </details>
  <footer>Figures are area-weighted totals computed by the LOCI API at analysis time. Dataset contents remain licensed to the API key that produced them.</footer>
</body>
</html>`;
}
