export type GridPoint = { gridX: number; gridY: number };
export type IsoPoint = { x: number; y: number };
export type IsoGridMetrics = {
  columns: number;
  rows: number;
  tileWidth: number;
  tileHeight: number;
};
export type IsoViewport = { centerX: number; centerY: number; panX: number; panY: number; zoom: number };

// Coordinates are centered on the logical grid. No 3D world units are required.
export function gridToIso(point: GridPoint, grid: IsoGridMetrics): IsoPoint {
  const x = point.gridX - (grid.columns - 1) / 2;
  const y = point.gridY - (grid.rows - 1) / 2;
  return {
    x: (x - y) * grid.tileWidth / 2,
    y: (x + y) * grid.tileHeight / 2,
  };
}

// gridX/gridY identify the first CELL CENTER, not a corner of a tile.
// The footprint's ground center is the midpoint of its occupied cell centers.
// For even dimensions this intentionally falls between cells (e.g. x + 0.5).
export function getFootprintGroundAnchor(
  origin: GridPoint,
  footprint: { width: number; height: number },
  grid: IsoGridMetrics,
): IsoPoint {
  return gridToIso({
    gridX: origin.gridX + (footprint.width - 1) / 2,
    gridY: origin.gridY + (footprint.height - 1) / 2,
  }, grid);
}

export function isoToGrid(point: IsoPoint, grid: IsoGridMetrics): GridPoint {
  const difference = point.x / (grid.tileWidth / 2);
  const sum = point.y / (grid.tileHeight / 2);
  return {
    gridX: (sum + difference) / 2 + (grid.columns - 1) / 2,
    gridY: (sum - difference) / 2 + (grid.rows - 1) / 2,
  };
}

export function isoToScreen(point: IsoPoint, viewport: IsoViewport): IsoPoint {
  return {
    x: viewport.centerX + viewport.panX + point.x * viewport.zoom,
    y: viewport.centerY + viewport.panY + point.y * viewport.zoom,
  };
}

export function screenToIso(point: IsoPoint, viewport: IsoViewport): IsoPoint {
  return {
    x: (point.x - viewport.centerX - viewport.panX) / viewport.zoom,
    y: (point.y - viewport.centerY - viewport.panY) / viewport.zoom,
  };
}

export function screenToGridCell(point: IsoPoint, grid: IsoGridMetrics, viewport: IsoViewport): GridPoint {
  const continuous = isoToGrid(screenToIso(point, viewport), grid);
  return { gridX: Math.round(continuous.gridX), gridY: Math.round(continuous.gridY) };
}

// Leave a quarter of the viewport able to see the island at the pan extremes.
// This scales with zoom, so zooming in still permits inspection of the edges.
export function clampIsoPan(viewport: IsoViewport, grid: IsoGridMetrics): IsoViewport {
  const halfWidth = grid.columns * grid.tileWidth * 0.37 * viewport.zoom;
  const halfHeight = (grid.rows * grid.tileHeight * 0.37 + 90) * viewport.zoom;
  const maxPanX = halfWidth + viewport.centerX * 0.5;
  const maxPanY = halfHeight + viewport.centerY * 0.5;
  return {
    ...viewport,
    panX: Math.max(-maxPanX, Math.min(maxPanX, viewport.panX)),
    panY: Math.max(-maxPanY, Math.min(maxPanY, viewport.panY)),
  };
}
