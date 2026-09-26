import * as THREE from 'three';
import { topographicWetness } from './wetness.js';
import { connectedInundation } from './inundation.js';

const $ = id => document.getElementById(id);

export function createWaterLayers({ data, hydro, geometry, terrainGroup, centerIndex, onPickSource, onCancelSource }) {
  const { heights, n, spacing } = data;
  const wetness = topographicWetness(heights, n, spacing, hydro.accumulation);
  const elevationColors = geometry.attributes.color.array.slice();
  const wetnessColors = new Float32Array(elevationColors.length);
  const stops = ['#c4ac79', '#8fae89', '#4a9da0', '#206b98'].map(color => new THREE.Color(color));
  for (let i = 0; i < heights.length; i++) {
    const t = Math.min(2.99999, wetness.relative[i] * 3), k = Math.floor(t);
    const color = stops[k].clone().lerp(stops[k + 1], t - k);
    wetnessColors.set([color.r, color.g, color.b], i * 3);
  }
  function updateSurface() {
    const isWetness = $('surface').value === 'wetness';
    geometry.attributes.color.array.set(isWetness ? wetnessColors : elevationColors);
    geometry.attributes.color.needsUpdate = true;
    $('wetness-note').hidden = !isWetness;
    $('legend-title').textContent = isWetness ? 'WETNESS' : 'ELEVATION';
    $('legend-unit').textContent = isWetness ? 'RELATIVE TWI' : 'METERS';
    $('terrain-gradient').classList.toggle('wetness', isWetness);
    const min = Math.min(...heights), max = Math.max(...heights);
    const values = isWetness ? ['Lower', '', 'Higher'] : [Math.round(min), Math.round((min + max) / 2), Math.round(max)];
    ['min-height', 'mid-height', 'max-height'].forEach((id, i) => $(id).textContent = values[i]);
  }
  $('surface').onchange = updateSurface;
  updateSurface();

  const waterMaterial = new THREE.MeshStandardMaterial({
    color: '#4cadc8', transparent: true, opacity: 0.72,
    roughness: 0.3, metalness: 0.12, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  });
  const waterMesh = new THREE.Mesh(new THREE.BufferGeometry(), waterMaterial);
  waterMesh.visible = false;
  terrainGroup.add(waterMesh);
  const sourceMarker = new THREE.Group();
  const markerMaterial = new THREE.MeshBasicMaterial({ color: '#a7f4ff' });
  const bead = new THREE.Mesh(new THREE.SphereGeometry(19, 12, 8), markerMaterial);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 1, 8), markerMaterial);
  sourceMarker.add(bead, pole);
  sourceMarker.visible = false;
  terrainGroup.add(sourceMarker);
  const state = { seed: centerIndex, enabled: false, result: null };
  let requestedFrame;

  function updateFlood() {
    requestedFrame = undefined;
    const rise = Number($('water-rise').value), level = heights[state.seed] + rise;
    $('water-rise-value').textContent = `${rise.toFixed(1)} m`;
    $('water-elevation').textContent = `Water-surface elevation: ${level.toFixed(1)} m (terrain datum)`;
    if (!state.enabled) return;
    state.result = connectedInundation(heights, n, spacing, state.seed, level);
    const { positions, area, maxDepth, reachesBoundary } = state.result;
    const waterGeometry = new THREE.BufferGeometry();
    waterGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    waterGeometry.computeVertexNormals();
    waterMesh.geometry.dispose();
    waterMesh.geometry = waterGeometry;
    waterMesh.visible = area > 0;
    sourceMarker.position.set((state.seed % n - (n - 1) / 2) * spacing, heights[state.seed], (Math.floor(state.seed / n) - (n - 1) / 2) * spacing);
    pole.scale.y = rise + 65;
    pole.position.y = (rise + 65) / 2;
    bead.position.y = rise + 65;
    sourceMarker.visible = true;
    $('flood-area').textContent = area >= 1e6 ? `${(area / 1e6).toFixed(2)} km²` : `${(area / 10000).toFixed(2)} ha`;
    $('flood-depth').textContent = `${maxDepth.toFixed(1)} m`;
    $('flood-note').textContent = area === 0
      ? 'No inundation at the source ground level. Raise the water to explore.'
      : reachesBoundary
        ? 'Water reaches the study boundary. Extent and area beyond the map are unknown.'
        : 'Water remains inside the study area at this level.';
  }
  function scheduleFlood() {
    if (requestedFrame !== undefined) cancelAnimationFrame(requestedFrame);
    requestedFrame = requestAnimationFrame(updateFlood);
  }
  $('water-rise').oninput = scheduleFlood;
  $('flood').onchange = event => {
    state.enabled = event.target.checked;
    $('flood-controls').hidden = !state.enabled;
    $('flood-legend').hidden = !state.enabled;
    if (state.enabled) updateFlood();
    else {
      waterMesh.visible = false;
      sourceMarker.visible = false;
      onCancelSource();
    }
  };
  $('flood-source').disabled = false;
  $('flood-source').onclick = onPickSource;
  updateFlood();

  return {
    wetness, state,
    selectPoint(i) {
      $('selected-wetness').textContent = `TWI ${wetness.index[i].toFixed(1)}`;
    },
    selectFloodSource(i) {
      state.seed = i;
      const mercatorY = Math.asinh(Math.tan(data.lat * Math.PI / 180)) - ((Math.floor(i / n) - (n - 1) / 2) * spacing) / (6378137 * Math.cos(data.lat * Math.PI / 180));
      const lat = Math.atan(Math.sinh(mercatorY)) * 180 / Math.PI;
      const lon = data.lon + ((i % n - (n - 1) / 2) * spacing) / (6378137 * Math.cos(data.lat * Math.PI / 180)) * 180 / Math.PI;
      $('flood-source-label').textContent = i === centerIndex ? 'Source: your location' : `Source: ${lat.toFixed(5)}° N, ${lon.toFixed(5)}° E`;
      updateFlood();
    },
  };
}
