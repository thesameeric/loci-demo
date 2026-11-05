# loci-demo

A minimal React app showing the [loci-sdk](https://www.npmjs.com/package/loci-sdk)
map widget — LOCI datasets, choropleths, the State → LGA → Ward filter,
polygon drawing with area analysis, and three-format export (PNG, restorable
JSON map state, GeoJSON drawings) — wired into React with one small wrapper
component.

## Run it

```sh
npm install
cp .env.example .env.local   # then fill in your key
npm run dev
```

`.env.local` needs `VITE_LOCI_KEY` (a scoped read key from your LOCI org).
`VITE_MAPBOX_TOKEN` is optional — when unset, the SDK borrows the
deployment's Mapbox token using your LOCI key.

## The integration, in short

The SDK is vanilla JS and owns the DOM inside the container you give it, so
the whole React story is one effect ([src/LociMap.tsx](src/LociMap.tsx)):

```tsx
useEffect(() => {
  let cancelled = false;
  let controller: LociMapController | undefined;
  createLociMap(container.current!, options).then((c) => {
    if (cancelled) c.destroy();   // StrictMode double-mount safety
    else controller = c;
  });
  return () => {
    cancelled = true;
    controller?.destroy();
  };
}, []);
```

[src/App.tsx](src/App.tsx) adds the product loop: the `onExport` hook saves
the exported `MapState` to localStorage, and a reload passes it back as
`state` — camera, basemap, filter, dataset colours and drawings all come
back exactly as left.
