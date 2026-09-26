# Watershed

An interactive 3D terrain and drainage explorer centered on **40.920722° N, 0.461112° E**.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. `npm run build` produces a static site in `dist/`; `npm run preview` serves that build.

## Explore

- Drag to orbit, scroll/pinch to zoom, right-drag/two-finger drag to pan.
- Select **Drop water on the map**, then click/tap the terrain to trace drainage. Escape cancels selection.
- Switch between 3D and top-down views. Toggle drainage, moving flow markers, and 50 m contours.
- Adjust vertical exaggeration from 1× to 3×; elevations and path statistics always use real, unexaggerated values.
- Home resets the camera when the canvas has keyboard focus; +/− zoom. The house button also resets the selected path to the supplied location.
- The compass returns the camera to a north-facing orientation.

## Data and method

The bundled `public/data/terrain.json` contains a 257 × 257 grid over approximately 8 × 8 km, centered precisely on the supplied coordinates. Grid spacing is 31.25 m; this is sampling spacing, not a claim of source accuracy. The grid is bilinearly sampled from zoom-12 Mapzen Terrarium tiles on AWS. Local ground distances use Web Mercator scale at the center latitude. The file includes source tile URLs and retrieval time.

`npm run data:fetch` regenerates the data from the public AWS endpoint. The app serves the bundled data locally and needs no API key or external map service at runtime. Google Fonts are optional; system font fallbacks are included.

A priority-flood algorithm fills depressions, with a small elevation increment to route flats. D8 selects the steepest descending neighbor on the conditioned surface; contributing cell counts accumulate downstream. The network displays cells with at least 65 contributing grid cells (approximately 6.35 hectares). The rendered terrain and selected-path profile use the original elevations, so routes across filled depressions may appear uphill on the raw surface. Each such route is marked in the interface. All study-boundary cells act as outlets. Catchments outside the study area are excluded.

These are potential drainage paths, not surveyed rivers, rainfall-runoff simulations, or flood forecasts. Soil infiltration, rainfall, buildings, channels, and culverts are not modeled. Particle animation illustrates direction, not physical speed or discharge. Path length is horizontal grid distance; net drop is the original start elevation minus original endpoint elevation.

Elevation source: [Mapzen / AWS Terrain Tiles](https://registry.opendata.aws/terrain-tiles/). Europe terrain produced using Copernicus data and information funded by the European Union — EU-DEM layers. Global GMTED2010 and SRTM terrain data courtesy of the U.S. Geological Survey. See [provider attribution](https://github.com/tilezen/joerd/blob/master/docs/attribution.md).

## Validation

`npm test` checks drainage on a plane, depression handling, cycle-free routing, boundary outlets, and accumulation conservation on the bundled terrain.

With the dev server running at port 5173, `node scripts/check-browser.mjs` exercises actual WebGL rendering, path selection, view controls, layer controls, exaggeration, reset, and mobile layout through Playwright. A Playwright Chromium installation is required (`npx playwright install chromium`). Screenshots are written to the system temporary directory.
