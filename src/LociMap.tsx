import { useEffect, useRef, useState } from "react";
import {
  createLociMap,
  type LociMapController,
  type MapOptions,
} from "loci-sdk";

/**
 * A thin React wrapper around loci-sdk's `createLociMap`.
 *
 * The SDK is vanilla JS: it owns the DOM inside the container you give it, so
 * the React integration is one effect — create on mount, destroy on unmount.
 * Options are read once at mount (the widget is not reconfigurable in place);
 * remount with a `key` if you need different options.
 */
export default function LociMap({
  options,
  onReady,
}: {
  options: MapOptions;
  onReady?: (controller: LociMapController) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Capture the initial options/callback so the effect runs exactly once per
  // mount, not on every render where the caller passes a fresh object literal.
  const initial = useRef({ options, onReady });

  useEffect(() => {
    // StrictMode mounts effects twice in dev: if this mount is already gone by
    // the time the async create resolves, destroy the controller immediately.
    let cancelled = false;
    let controller: LociMapController | undefined;

    const { options, onReady } = initial.current;
    createLociMap(container.current!, options).then(
      (c) => {
        if (cancelled) {
          c.destroy();
          return;
        }
        controller = c;
        onReady?.(c);
      },
      (err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      },
    );

    return () => {
      cancelled = true;
      controller?.destroy();
    };
  }, []);

  if (error) return <div className="map-error">{error}</div>;
  return <div ref={container} style={{ width: "100%", height: "100%" }} />;
}
