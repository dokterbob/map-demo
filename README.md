# Watershed

An interactive 3D terrain and drainage explorer centered on **40.920722° N, 0.461112° E**.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite.

## Static build and hosting

With a current Node.js version supported by Vite installed (Node 22.12+ or 24 LTS):

```sh
git pull --ff-only
npm ci
npm run build
npm run preview
```

`npm run build` creates **`dist/`**, including the terrain data and all application code. Upload the **contents of `dist/`** to any static web host. No backend, API key, or runtime Node.js service is required. `npm run preview` serves the built site locally at the URL it prints (normally `http://localhost:4173/`); it is for checking the build, not a production server.

The build uses relative asset paths (`base: './'`), so the same output works at `/` or a subdirectory such as `/map-demo/`. Keep `index.html`, `assets/`, and `data/` together. Serve the files over HTTP(S); opening `index.html` directly with `file://` does not support the app's data fetch. Fonts may load from Google Fonts; system fonts work without that connection. The elevation data is bundled, so map exploration needs no external data requests.

For a static host that builds from Git, use `npm run build` as the build command and `dist` as the publish directory. See [Vite's static deployment guide](https://vite.dev/guide/static-deploy.html).

## Explore

- Drag to orbit, scroll/pinch to zoom, right-drag/two-finger drag to pan.
- Select **Drop water on the map**, then click/tap the terrain to trace drainage. Escape cancels selection.
- Switch between 3D and top-down views. Toggle drainage, moving flow markers, and 50 m contours.
- Choose **Terrain wetness (TWI)** under **Terrain color** to see where the terrain tends to concentrate water. The selected flow point's index appears below the selector.
- Enable **Show inundation**, choose a water source on the terrain, and adjust **Water above source ground** (0–30 m). The water-surface elevation, connected inundated area, and maximum depth update immediately. Flood-source selection is independent of flow-path selection. Escape cancels either selection.
- Inundation is relative to the selected source's ground elevation. A level of 0 m is dry. Maximum depth elsewhere can exceed the rise at the source. The source remains fixed when switching camera views or resetting the flow path.
- Adjust vertical exaggeration from 1× to 3×; elevations and path statistics always use real, unexaggerated values.
- Home resets the camera when the canvas has keyboard focus; +/− zoom. The house button also resets the selected path to the supplied location.
- The compass returns the camera to a north-facing orientation.

## Data and method

The bundled `public/data/terrain.json` contains a 257 × 257 grid over approximately 8 × 8 km, centered precisely on the supplied coordinates. Grid spacing is 31.25 m; this is sampling spacing, not a claim of source accuracy. The grid is bilinearly sampled from zoom-12 Mapzen Terrarium tiles on AWS. Local ground distances use Web Mercator scale at the center latitude. The file includes source tile URLs and retrieval time.

`npm run data:fetch` regenerates the data from the public AWS endpoint. The app serves the bundled data locally and needs no API key or external map service at runtime. Google Fonts are optional; system font fallbacks are included.

A priority-flood algorithm fills depressions, with a small elevation increment to route flats. D8 selects the steepest descending neighbor on the conditioned surface; contributing cell counts accumulate downstream. The network displays cells with at least 65 contributing grid cells (approximately 6.35 hectares). The rendered terrain and selected-path profile use the original elevations, so routes across filled depressions may appear uphill on the raw surface. Each such route is marked in the interface. All study-boundary cells act as outlets. Catchments outside the study area are excluded.

These are potential drainage paths, not surveyed rivers, rainfall-runoff simulations, or flood forecasts. Soil infiltration, rainfall, buildings, channels, and culverts are not modeled. Particle animation illustrates direction, not physical speed or discharge. Path length is horizontal grid distance; net drop is the original start elevation minus original endpoint elevation.

Elevation source: [Mapzen / AWS Terrain Tiles](https://registry.opendata.aws/terrain-tiles/). Europe terrain produced using Copernicus data and information funded by the European Union — EU-DEM layers. Global GMTED2010 and SRTM terrain data courtesy of the U.S. Geological Survey. See [provider attribution](https://github.com/tilezen/joerd/blob/master/docs/attribution.md).

## Wetness and inundation methods

**Terrain wetness:** An approximate topographic wetness index is calculated as `ln(a / max(slope, 0.001))`. Specific catchment area `a` is approximated by D8 contributing cell count × grid spacing (meters). Slope is the magnitude of central differences on the original terrain, with one-sided differences at the edges. The 0.001 m/m slope floor avoids infinite values on flats. Accumulation comes from the depression-conditioned drainage model. Colors stretch between the local 5th and 95th percentiles, clipping values outside that range. They indicate relative terrain-driven accumulation potential, not measured moisture, saturation percentages, or a wet/dry classification. Results depend on grid resolution, flat handling, and omitted upstream terrain. Formula reference: [SAGA GIS TWI documentation](https://saga-gis.sourceforge.io/saga_tool_doc/9.12.0/ta_hydrology_20.html).

**Flood scenario:** The selected source defines a held horizontal water-surface elevation: its original terrain elevation plus the slider value. The model traverses the original terrain mesh edges to find connected vertices below that level. Each connected triangle is clipped at the water plane to obtain an interpolated shoreline; the displayed inundated area is the horizontal area of those clipped triangles. Maximum depth is water-surface elevation minus the lowest connected terrain vertex. Statistics are independent of display exaggeration. The model does not fill disconnected basins or cross a ridge until the water overtops it. A notice identifies scenarios that reach the study boundary; the displayed area includes only the mapped extent.

This is a geometric, constant-level inundation scenario with no volume constraint, drainage over time, hydraulic gradients, rainfall, infiltration, or river discharge. It cannot estimate how much rain would produce a chosen level or whether that level could be sustained. A held level can produce very deep water downhill from a high source. The source DEM does not resolve small channels, walls, or culverts, and the slider precision is not terrain accuracy. These layers support exploration, not flood-risk decisions. For background on connectivity and terrain limitations, see [NOAA's inundation mapping methods](https://coast.noaa.gov/data/digitalcoast/pdf/slr-inundation-methods.pdf); this app is not NOAA's model or data product.

## Validation

`npm test` checks drainage on a plane, depression handling, cycle-free routing, boundary outlets, accumulation conservation on the bundled terrain, wetness response to slope and area, finite flat-terrain values, isolated flood basins, ridge overtopping, shoreline area, and dry-source behavior.

`npm run test:browser` builds the app and serves the production output on a temporary local server. It checks root and nested-path static hosting, actual WebGL rendering, path and flood-source selection, wetness and water controls, zero-level inundation, exaggeration-independent flood statistics, camera/layer controls, and mobile layout. A Playwright Chromium installation is required (`npx playwright install chromium`). Screenshots are written to the system temporary directory. To test an already-running dev server instead, run `node scripts/check-browser.mjs` (defaults to port 5173), or set `MAP_TEST_URL`.
