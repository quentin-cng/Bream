const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');

// Run the pure TypeScript game rules with Node's built-in test runner. Asset
// references are metadata here; no native renderer or extra test package needed.
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filename,
  });
  module._compile(compiled.outputText, filename);
};
for (const extension of ['.png']) {
  require.extensions[extension] = (module, filename) => { module.exports = filename; };
}

const { createInitialPlayerState, refundBuildingSale, rollOverDailySteps, syncStepSnapshot } = require('../src/progression/playerProgression.ts');
const { addDevelopmentEnergy } = require('../src/progression/developmentCurrency.ts');
const { ENERGY_PACKS } = require('../src/shop/energyPackCatalog.ts');
const { GRID_CONFIG, PLAYABLE_GRID_CELLS, createPlacementId, getPlacementCells, isPlayableCell, movePlacementToCell, rotateFootprint } = require('../src/island/placementGrid.ts');
const { commitPreviewPlacement, getSellRefund, sellPlacedBuilding } = require('../src/island/placementTransactions.ts');
const { getObjectsByCategory, getObjectFootprint } = require('../src/island/objectCatalog.ts');
const { validatePlacement } = require('../src/island/placementGrid.ts');
const { PREVIEW_LIFT_SCREEN_Y, formatSpriteCalibration, getDefaultSpriteCalibration, getIsoSpriteContactPoint, getIsoSpriteImageRect, getIsoSpritePosition, getIsoSpriteRenderRect, getPreviewLiftWorldY, getSpriteCalibration, getSpriteDefinition, sortIsoSprites } = require('../src/isometric/spriteCatalog.ts');
const { getBuildDragGrabOffset, getDraggedPlacementOrigin, getInitialBuildGestureMode, getPlacedBuildingAtPoint, getPlacedPressAction, isPointOnPreviewSprite, PLACED_BUILDING_LONG_PRESS_MS, PLACED_BUILDING_PRESS_TOLERANCE } = require('../src/isometric/buildDrag.ts');
const { getFootprintGroundAnchor, gridToIso, isoToGrid, isoToScreen, screenToIso } = require('../src/isometric/isometricMath.ts');
const { getBackgroundFrame } = require('../src/isometric/backgroundParallax.ts');
const { BACKGROUNDS, DEFAULT_BACKGROUND_ID } = require('../src/isometric/backgroundCatalog.ts');
const { MAIN_ISLAND_ART, MAIN_ISLAND_GRID } = require('../src/isometric/islandArt.ts');
const { getPlacementDustFrameIndex, getPlacementDustFramePose, getPlacementDustFrontBand, PLACEMENT_DUST_SPRITE, PLACEMENT_EFFECT_CLEANUP_MS } = require('../src/isometric/placementDustSprite.ts');
const { getPlacementSettlePose, PLACEMENT_SETTLE_DURATION_MS } = require('../src/isometric/placementSettle.ts');
const { generateStressTestPlacements, STRESS_TEST_COUNTS } = require('../src/isometric/dev/stressTestPlacements.ts');
const { decodeGameSave, encodeGameSave } = require('../src/storage/gameSaveSchema.ts');
const { decodeGameSaveText, GAME_SAVE_FILES, selectRecoverableGameSave, writeRecoverableGameSave } = require('../src/storage/gameSaveRecovery.ts');

const date = '2026-09-21';
const currentIsoGrid = { ...GRID_CONFIG, ...MAIN_ISLAND_GRID };
const health = (steps, localDate = date) => ({ source: 'health-connect', steps, localDate });
const placement = (id, gridX = 20, gridY = 20) => ({
  id, type: 'gardenHouse', gridX, gridY, rotationQuarterTurns: 0,
});

const saveText = (snapshot) => JSON.stringify(encodeGameSave(snapshot));
const assertPointClose = (actual, expected, epsilon = 1e-9) => {
  assert.ok(Math.abs(actual.x - expected.x) < epsilon);
  assert.ok(Math.abs(actual.y - expected.y) < epsilon);
};
const createMemorySaveStore = (initial = {}) => {
  const files = new Map(Object.entries(initial));
  return {
    files,
    readText: (name) => files.get(name) ?? null,
    writeText: (name, contents) => { files.set(name, contents); },
    replace: (source, destination) => {
      if (!files.has(source)) throw new Error(`Missing temporary file: ${source}`);
      files.set(destination, files.get(source));
      files.delete(source);
    },
    remove: (name) => { files.delete(name); },
  };
};

test('first Health sync baselines, then only new steps earn Energy once', () => {
  const initial = createInitialPlayerState(date);
  const baseline = syncStepSnapshot(initial, health(4000), date);
  assert.equal(baseline.energy, initial.energy);
  assert.equal(baseline.dailySteps.creditedStepsToday, 4000);

  const credited = syncStepSnapshot(baseline, health(4655), date);
  assert.equal(credited.energy, initial.energy + 65);
  assert.equal(credited.dailySteps.creditedStepsToday, 4650);
  assert.deepEqual(syncStepSnapshot(credited, health(4655), date), credited);

  const correctedDown = syncStepSnapshot(credited, health(4600), date);
  assert.equal(correctedDown.energy, credited.energy);
  assert.equal(correctedDown.dailySteps.creditedStepsToday, 4650);
  assert.equal(syncStepSnapshot(correctedDown, health(4655), date).energy, credited.energy);

  const restored = decodeGameSave(encodeGameSave({ player: correctedDown, placedObjects: [] }));
  assert.ok(restored);
  assert.equal(syncStepSnapshot(restored.player, health(4655), date).energy, credited.energy);
});

test('local midnight resets displayed steps without re-crediting an old day', () => {
  const baseline = syncStepSnapshot(createInitialPlayerState(date), health(4000), date);
  const previousDay = syncStepSnapshot(baseline, health(4655), date);
  const nextDay = rollOverDailySteps(previousDay, '2026-09-22');
  assert.equal(nextDay.steps, 0);
  assert.equal(nextDay.energy, previousDay.energy);
  assert.equal(nextDay.carriedSteps, 5);
  assert.equal(syncStepSnapshot(nextDay, health(9999, date), '2026-09-22'), nextDay);
  const newSteps = syncStepSnapshot(nextDay, health(5, '2026-09-22'), '2026-09-22');
  assert.equal(newSteps.energy, nextDay.energy + 1);
});

test('V1 migration preserves progress and placements without treating old steps as today', () => {
  const saved = decodeGameSave({
    version: 1,
    player: { steps: 5000, energy: 123, xp: 260 },
    placedObjects: [placement('gardenHouse-1')],
  });
  assert.ok(saved);
  assert.equal(saved.player.energy, 123);
  assert.equal(saved.player.level, 3);
  assert.equal(saved.player.steps, 0);
  assert.equal(saved.placedObjects[0].id, 'gardenHouse-1');
  assert.equal(encodeGameSave(saved).version, 2);
});

test('save decoder rejects duplicate IDs and overlapping footprints', () => {
  const player = { energy: 100, xp: 0, carriedSteps: 0 };
  const dailySteps = { date, reportedStepsToday: 0, creditedStepsToday: 0, source: 'mock' };
  assert.equal(decodeGameSave({ version: 2, player, dailySteps, placedObjects: [placement('a'), placement('a', 24, 24)] }), null);
  assert.equal(decodeGameSave({ version: 2, player, dailySteps, placedObjects: [placement('a'), placement('b', 21, 20)] }), null);
  assert.equal(decodeGameSave({ version: 99, player, dailySteps, placedObjects: [] }), null);
});

test('save recovery prefers a valid primary over its backup', () => {
  const primary = { player: { ...createInitialPlayerState(date), energy: 321 }, placedObjects: [] };
  const backup = { player: { ...createInitialPlayerState(date), energy: 123 }, placedObjects: [] };
  const loaded = selectRecoverableGameSave(saveText(primary), saveText(backup));
  assert.equal(loaded.source, 'primary');
  assert.equal(loaded.snapshot.player.energy, 321);
});

test('save recovery uses a valid backup for a malformed or schema-invalid primary', () => {
  const stepped = syncStepSnapshot(createInitialPlayerState(date), health(4000), date);
  const backup = {
    player: { ...stepped, energy: 456, xp: 260, level: 3 },
    placedObjects: [placement('recovered-house')],
  };
  for (const corruptPrimary of ['not-json', JSON.stringify({ version: 2, player: {} })]) {
    const loaded = selectRecoverableGameSave(corruptPrimary, saveText(backup));
    assert.equal(loaded.source, 'backup');
    assert.equal(loaded.snapshot.player.energy, 456);
    assert.equal(loaded.snapshot.player.xp, 260);
    assert.equal(loaded.snapshot.player.dailySteps.creditedStepsToday, 4000);
    assert.equal(loaded.snapshot.placedObjects[0].id, 'recovered-house');
  }
});

test('save recovery uses backup when primary is missing and defaults only when both are unusable', () => {
  const backup = { player: { ...createInitialPlayerState(date), energy: 789 }, placedObjects: [] };
  const recovered = selectRecoverableGameSave(null, saveText(backup));
  assert.equal(recovered.source, 'backup');
  assert.equal(recovered.snapshot.player.energy, 789);
  assert.deepEqual(selectRecoverableGameSave('{bad', JSON.stringify({ version: 99 })), {
    snapshot: null,
    source: 'none',
  });
});

test('valid writes atomically preserve the previous primary as recovery state', () => {
  const first = { player: { ...createInitialPlayerState(date), energy: 100 }, placedObjects: [] };
  const second = { player: { ...createInitialPlayerState(date), energy: 250 }, placedObjects: [] };
  const store = createMemorySaveStore();
  writeRecoverableGameSave(store, first);
  assert.equal(decodeGameSaveText(store.files.get(GAME_SAVE_FILES.primary)).player.energy, 100);
  assert.equal(decodeGameSaveText(store.files.get(GAME_SAVE_FILES.backup)).player.energy, 100);
  assert.equal(store.files.has(GAME_SAVE_FILES.primaryTemp), false);
  assert.equal(store.files.has(GAME_SAVE_FILES.backupTemp), false);

  writeRecoverableGameSave(store, second);
  assert.equal(decodeGameSaveText(store.files.get(GAME_SAVE_FILES.primary)).player.energy, 250);
  assert.equal(decodeGameSaveText(store.files.get(GAME_SAVE_FILES.backup)).player.energy, 100);
});

test('writing after corruption never replaces a valid backup with corrupted primary data', () => {
  const backup = { player: { ...createInitialPlayerState(date), energy: 600 }, placedObjects: [] };
  const recoveredNext = { player: { ...backup.player, energy: 625 }, placedObjects: [] };
  const store = createMemorySaveStore({
    [GAME_SAVE_FILES.primary]: '{broken',
    [GAME_SAVE_FILES.backup]: saveText(backup),
  });
  writeRecoverableGameSave(store, recoveredNext);
  assert.equal(decodeGameSaveText(store.files.get(GAME_SAVE_FILES.primary)).player.energy, 625);
  assert.equal(decodeGameSaveText(store.files.get(GAME_SAVE_FILES.backup)).player.energy, 600);
});

test('recovered Health watermark does not duplicate previously credited Energy', () => {
  const baseline = syncStepSnapshot(createInitialPlayerState(date), health(4000), date);
  const credited = syncStepSnapshot(baseline, health(4655), date);
  const recovered = selectRecoverableGameSave('{broken', saveText({ player: credited, placedObjects: [] }));
  assert.equal(recovered.source, 'backup');
  const repeated = syncStepSnapshot(recovered.snapshot.player, health(4655), date);
  assert.equal(repeated.energy, credited.energy);
  assert.equal(repeated.dailySteps.creditedStepsToday, 4650);
});

test('new placement IDs avoid collisions in sparse or migrated saves', () => {
  assert.equal(createPlacementId('gardenHouse', [placement('gardenHouse-2')]), 'gardenHouse-3');
  assert.equal(createPlacementId('gardenHouse', [placement('gardenHouse-2'), placement('gardenHouse-3', 24, 24)]), 'gardenHouse-4');
});

test('background parallax follows pan gently without exposing viewport edges', () => {
  const center = getBackgroundFrame(400, 800, 0, 0);
  const moved = getBackgroundFrame(400, 800, 200, -200);
  assert.equal(moved.x - center.x, 15);
  assert.equal(moved.y - center.y, -9);
  for (const pan of [-10000, -200, 0, 200, 10000]) {
    const frame = getBackgroundFrame(400, 800, pan, pan);
    assert.ok(frame.x <= 0 && frame.x + frame.width >= 400);
    assert.ok(frame.y <= 0 && frame.y + frame.height >= 800);
  }
});

test('DEV stress generator reaches each requested object count on the playable island', () => {
  assert.deepEqual(STRESS_TEST_COUNTS, [0, 25, 50, 100, 150]);
  for (const requested of STRESS_TEST_COUNTS) {
    assert.equal(generateStressTestPlacements(requested).length, requested);
  }
});

test('DEV stress objects occupy unique valid cells and respect real placements', () => {
  const real = [placement('real-house', 20, 20)];
  const occupied = new Set(getPlacementCells(real[0]).map((cell) => `${cell.gridX}:${cell.gridY}`));
  const stress = generateStressTestPlacements(150, real);
  assert.equal(stress.length, 150);
  for (const object of stress) {
    assert.match(object.id, /^__dev-stress-/);
    for (const cell of getPlacementCells(object)) {
      assert.equal(isPlayableCell(cell), true);
      const key = `${cell.gridX}:${cell.gridY}`;
      assert.equal(occupied.has(key), false);
      occupied.add(key);
    }
  }
});

test('DEV stress objects remain separate from the snapshot sent to persistence', () => {
  const real = [placement('real-house', 20, 20)];
  const realBefore = structuredClone(real);
  const stress = generateStressTestPlacements(100, real);
  const encoded = encodeGameSave({ player: createInitialPlayerState(date), placedObjects: real });
  assert.deepEqual(real, realBefore);
  assert.equal(stress.length, 100);
  assert.deepEqual(encoded.placedObjects.map((object) => object.id), ['real-house']);
  assert.equal(encoded.placedObjects.some((object) => object.id.startsWith('__dev-stress-')), false);
});

test('only the new level-1 house is offered while preserved house types remain save-compatible', () => {
  assert.deepEqual(getObjectsByCategory('buildings').map(([type]) => type), ['house1']);
  assert.deepEqual(getObjectFootprint('house1'), { width: 3, height: 3 });
  assert.deepEqual(getObjectFootprint('house2'), { width: 2, height: 2 });
  assert.deepEqual(getObjectFootprint('house3'), { width: 2, height: 2 });
  for (const type of ['house1', 'house2', 'house3']) {
    const sprite = getSpriteDefinition(type);
    assert.equal(sprite.id, type);
    assert.match(sprite.source, /house-level-1\.png$/);
    assert.ok(sprite.renderSize.width > 0 && sprite.renderSize.height > 0);
  }
  assert.equal(validatePlacement({ type: 'house2', gridX: 18, gridY: 18, rotationQuarterTurns: 0 }, [
    { id: 'house1-1', type: 'house1', gridX: 17, gridY: 17, rotationQuarterTurns: 0 },
  ]).colliding, true);
  assert.deepEqual(sortIsoSprites([
    { id: 'front', type: 'house3', gridX: 20, gridY: 20, rotationQuarterTurns: 0 },
    { id: 'back', type: 'house1', gridX: 17, gridY: 17, rotationQuarterTurns: 0 },
  ]).map(({ id }) => id), ['back', 'front']);
});

test('default isometric art catalog uses the new sky and calibrated starter island', () => {
  assert.equal(DEFAULT_BACKGROUND_ID, 'default_sky');
  assert.match(BACKGROUNDS.default_sky.source, /sky-background\.png$/);
  assert.match(MAIN_ISLAND_ART.source, /starter-island\.png$/);
  assert.deepEqual(
    {
      width: MAIN_ISLAND_ART.width,
      height: MAIN_ISLAND_ART.height,
      gridOriginX: MAIN_ISLAND_ART.gridOriginX,
      gridOriginY: MAIN_ISLAND_ART.gridOriginY,
    },
    { width: 1482, height: 2223, gridOriginX: 741, gridOriginY: 955 },
  );
  assert.deepEqual(MAIN_ISLAND_GRID, { tileWidth: 26, tileHeight: 12.5 });
});

test('expanded island exposes a 52 × 52 grid with a backward-compatible playable mask', () => {
  assert.deepEqual(GRID_CONFIG, { columns: 52, rows: 52 });
  assert.equal(PLAYABLE_GRID_CELLS.length, 2360);

  const legacyPlayableCells = Array.from({ length: 44 }, (_, gridY) => Array.from(
    { length: 44 },
    (__, gridX) => ({ gridX, gridY }),
  )).flat().filter(({ gridX, gridY }) => {
    const normalizedX = (gridX - 21.5) / 22;
    const normalizedY = (gridY - 21.5) / 22;
    return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
  });
  assert.equal(legacyPlayableCells.length, 1528);
  assert.ok(legacyPlayableCells.every(isPlayableCell));
});

test('2 × 2 and 3 × 3 placements work near new edges while the mask rejects overflow', () => {
  const house3x3 = { type: 'house1', gridX: 49, gridY: 24, rotationQuarterTurns: 0 };
  const house2x2 = { type: 'house2', gridX: 50, gridY: 24, rotationQuarterTurns: 0 };
  assert.equal(validatePlacement(house3x3, []).valid, true);
  assert.equal(validatePlacement(house2x2, []).valid, true);
  assert.equal(validatePlacement({ ...house3x3, gridX: 50 }, []).outsideGrid, true);
  assert.equal(validatePlacement({ ...house2x2, gridX: 51 }, []).outsideGrid, true);
  assert.equal(validatePlacement(house2x2, [{ id: 'edge-house', ...house3x3 }]).colliding, true);
  assert.equal(isPlayableCell({ gridX: 0, gridY: 0 }), false);
  assert.equal(isPlayableCell({ gridX: 51, gridY: 51 }), false);
});

test('44 × 44-era coordinates load unchanged inside the expanded world', () => {
  const legacyPlacement = { id: 'legacy-edge-house', type: 'house1', gridX: 6, gridY: 6, rotationQuarterTurns: 0 };
  const raw = {
    version: 2,
    player: { energy: 321, xp: 456, carriedSteps: 0 },
    dailySteps: { date, reportedStepsToday: 4200, creditedStepsToday: 4200, source: 'health-connect' },
    placedObjects: [legacyPlacement],
  };
  const restored = decodeGameSave(raw);
  assert.ok(restored);
  assert.deepEqual(restored.placedObjects, [legacyPlacement]);
  assert.deepEqual(encodeGameSave(restored).placedObjects, [legacyPlacement]);
});

test('V2 saves retain every legacy type and footprint without converting player progress', () => {
  const oldObjects = [
    { id: 'a', type: 'balconyHouse', gridX: 12, gridY: 18, rotationQuarterTurns: 0 },
    { id: 'b', type: 'townBuilding', gridX: 20, gridY: 18, rotationQuarterTurns: 0 },
    { id: 'c', type: 'civicHouse', gridX: 28, gridY: 18, rotationQuarterTurns: 0 },
    { id: 'd', type: 'gardenHouse', gridX: 18, gridY: 26, rotationQuarterTurns: 0 },
    { id: 'e', type: 'cozyCottage', gridX: 25, gridY: 25, rotationQuarterTurns: 0 },
  ];
  const raw = {
    version: 2,
    player: { energy: 321, xp: 456, carriedSteps: 0 },
    dailySteps: { date, reportedStepsToday: 4200, creditedStepsToday: 4200, source: 'health-connect' },
    placedObjects: oldObjects,
  };
  const restored = decodeGameSave(raw);
  assert.ok(restored);
  assert.deepEqual(restored.placedObjects, oldObjects);
  assert.equal(restored.player.energy, 321);
  assert.equal(restored.player.xp, 456);
  assert.deepEqual(encodeGameSave(restored).placedObjects, oldObjects);
  assert.deepEqual(getObjectFootprint('civicHouse'), { width: 2, height: 3 });
  assert.equal(getSpriteDefinition('civicHouse').id, 'house3');
  assert.equal(validatePlacement(oldObjects[2], restored.placedObjects, 'c').valid, true);
  assert.equal(validatePlacement({ type: 'house2', gridX: 28, gridY: 19, rotationQuarterTurns: 0 }, restored.placedObjects).colliding, true);
});

test('development Energy changes only currency and survives normal save validation', () => {
  const player = syncStepSnapshot(createInitialPlayerState(date), health(4000), date);
  const boosted = addDevelopmentEnergy(addDevelopmentEnergy(player, 500), 5000);
  assert.equal(boosted.energy, player.energy + 5500);
  assert.equal(boosted.steps, player.steps);
  assert.equal(boosted.xp, player.xp);
  assert.equal(boosted.level, player.level);
  assert.deepEqual(boosted.dailySteps, player.dailySteps);
  assert.equal(boosted.carriedSteps, player.carriedSteps);
  assert.deepEqual(decodeGameSave(encodeGameSave({ player: boosted, placedObjects: [] })).player, boosted);
  assert.equal(addDevelopmentEnergy(boosted, Number.MAX_SAFE_INTEGER), boosted);
});

test('Shop Energy packs are disabled presentation records, not grants or products', () => {
  assert.equal(ENERGY_PACKS.length, 3);
  assert.equal(new Set(ENERGY_PACKS.map((pack) => pack.id)).size, 3);
  assert.ok(ENERGY_PACKS.every((pack) => pack.amount > 0 && pack.enabled === false && pack.futureProductId === null));
});

test('all house base points stay on their grid anchors through normal zoom and pan', () => {
  const grid = currentIsoGrid;
  for (const type of ['house1', 'house2', 'house3']) {
    const definition = getSpriteDefinition(type);
    assert.ok(definition.anchor.x > 0 && definition.anchor.x < 1);
    assert.ok(definition.anchor.y > 0 && definition.anchor.y < 1);
    const base = getIsoSpritePosition({ id: type, type, gridX: 20, gridY: 20, rotationQuarterTurns: 0 }, grid);
    for (const zoom of [0.456, 0.478, 1.2, 2.9]) {
      const viewport = { centerX: 200, centerY: 400, panX: 72, panY: -46, zoom };
      const restored = screenToIso(isoToScreen(base, viewport), viewport);
      assert.ok(Math.abs(restored.x - base.x) < 1e-9);
      assert.ok(Math.abs(restored.y - base.y) < 1e-9);
    }
  }
});

test('footprint ground anchor is the centroid of occupied tile centers, including even and rotated sizes', () => {
  const grid = currentIsoGrid;
  const origin = { gridX: 17, gridY: 21 };
  for (const footprint of [
    { width: 1, height: 1 },
    { width: 2, height: 2 },
    { width: 3, height: 3 },
    { width: 2, height: 3 },
    rotateFootprint({ width: 2, height: 3 }, 1),
  ]) {
    const cells = Array.from({ length: footprint.height }, (_, y) =>
      Array.from({ length: footprint.width }, (__, x) => gridToIso({ gridX: origin.gridX + x, gridY: origin.gridY + y }, grid)),
    ).flat();
    const centroid = {
      x: cells.reduce((sum, cell) => sum + cell.x, 0) / cells.length,
      y: cells.reduce((sum, cell) => sum + cell.y, 0) / cells.length,
    };
    const anchor = getFootprintGroundAnchor(origin, footprint, grid);
    assert.ok(Math.abs(anchor.x - centroid.x) < 1e-9);
    assert.ok(Math.abs(anchor.y - centroid.y) < 1e-9);
    const continuous = isoToGrid(anchor, grid);
    assert.equal(continuous.gridX, origin.gridX + (footprint.width - 1) / 2);
    assert.equal(continuous.gridY, origin.gridY + (footprint.height - 1) / 2);
  }
});

test('confirm commits precisely the preview cells and sprite base for every house', () => {
  const grid = currentIsoGrid;
  for (const type of ['house1', 'house2', 'house3']) {
    const preview = movePlacementToCell({ type, gridX: 0, gridY: 0, rotationQuarterTurns: 0 }, { gridX: 23, gridY: 19 });
    const committed = commitPreviewPlacement(preview, [], null);
    assert.ok(committed);
    assert.equal(committed.isNew, true);
    assert.deepEqual({ ...committed.placed, id: undefined }, { ...preview, id: undefined });
    assert.deepEqual(getIsoSpritePosition({ ...preview, id: 'placement-preview' }, grid), getIsoSpritePosition(committed.placed, grid));
    assert.deepEqual(getIsoSpriteImageRect(preview, grid), getIsoSpriteImageRect(committed.placed, grid));
    assertPointClose(getIsoSpriteContactPoint(preview, grid), getIsoSpritePosition(preview, grid));
    const centerOfDrawnCells = getPlacementCells(preview).map((cell) => gridToIso(cell, grid));
    assert.ok(Math.abs(getIsoSpriteContactPoint(preview, grid).x - centerOfDrawnCells.reduce((sum, cell) => sum + cell.x, 0) / centerOfDrawnCells.length) < 1e-9);
    assert.ok(Math.abs(getIsoSpriteContactPoint(preview, grid).y - centerOfDrawnCells.reduce((sum, cell) => sum + cell.y, 0) / centerOfDrawnCells.length) < 1e-9);
    const moved = movePlacementToCell(preview, { gridX: 26, gridY: 22 });
    const edited = commitPreviewPlacement(moved, committed.placements, committed.placed.id);
    assert.ok(edited);
    assert.equal(edited.placed.id, committed.placed.id);
    assert.deepEqual(getIsoSpritePosition({ ...moved, id: 'placement-preview' }, grid), getIsoSpritePosition(edited.placed, grid));
  }
});

test('preview-only lift preserves canonical grid placement and snaps back on confirm or move', () => {
  const grid = currentIsoGrid;
  for (const zoom of [0.38, 1, 2.9]) {
    const lift = getPreviewLiftWorldY(zoom);
    assert.ok(Math.abs(lift * zoom - PREVIEW_LIFT_SCREEN_Y) < 1e-9);
    for (const type of ['house1', 'house2', 'house3']) {
      const draft = { type, gridX: 20, gridY: 21, rotationQuarterTurns: 0 };
      const preview = { ...draft, id: 'placement-preview', preview: true, opacity: 0.65 };
      const committed = commitPreviewPlacement(draft, [], null);
      assert.ok(committed);
      const finalRect = getIsoSpriteRenderRect(committed.placed, grid, undefined, lift);
      const previewRect = getIsoSpriteRenderRect(preview, grid, undefined, lift);
      assert.deepEqual(finalRect, getIsoSpriteImageRect(draft, grid));
      assert.equal(previewRect.x, finalRect.x);
      assert.equal(previewRect.y, finalRect.y + lift);
      assert.equal(previewRect.width, finalRect.width);
      assert.equal(previewRect.height, finalRect.height);
      assert.deepEqual(getIsoSpritePosition(preview, grid), getIsoSpritePosition(committed.placed, grid));
      const moved = movePlacementToCell(draft, { gridX: 23, gridY: 19 });
      const edited = commitPreviewPlacement(moved, committed.placements, committed.placed.id);
      assert.ok(edited);
      assert.deepEqual(getIsoSpriteRenderRect(edited.placed, grid, undefined, lift), getIsoSpriteImageRect(moved, grid));
    }
  }
});

test('settle transform starts at preview lift and ends exactly at the canonical ground pose', () => {
  assert.equal(PLACEMENT_SETTLE_DURATION_MS, 220);
  for (const zoom of [0.38, 1, 2.9]) {
    const lift = getPreviewLiftWorldY(zoom);
    assert.deepEqual(getPlacementSettlePose(0, lift), { translateY: lift, scale: 1.03 });
    assert.deepEqual(getPlacementSettlePose(1, lift), { translateY: 0, scale: 1 });
    const midpoint = getPlacementSettlePose(0.5, lift);
    assert.ok(midpoint.translateY < 0 && midpoint.translateY > lift);
    assert.ok(midpoint.scale > 1 && midpoint.scale < 1.03);
  }
});

test('dust sheet plays the final four bounded phases once at the canonical building base', () => {
  const dust = PLACEMENT_DUST_SPRITE;
  assert.equal(dust.frameCount, 4);
  assert.equal(dust.frames.length, 4);
  assert.equal(dust.sheetWidth, 1774);
  assert.equal(dust.sheetHeight, 887);
  assert.ok(dust.delayMs < PLACEMENT_SETTLE_DURATION_MS);
  assert.equal(dust.durationMs, 400);
  assert.ok(PLACEMENT_EFFECT_CLEANUP_MS > dust.delayMs + dust.durationMs);
  assert.deepEqual([0, 1 / 4, 2 / 4, 3 / 4, 1].map(getPlacementDustFrameIndex), [0, 1, 2, 3, 3]);
  for (let index = 0; index < dust.frameCount; index++) {
    const frame = dust.frames[index];
    assert.ok(frame.x >= 0 && frame.y >= 0 && frame.width > 0 && frame.height > 0);
    assert.ok(frame.x + frame.width <= dust.sheetWidth && frame.y + frame.height <= dust.sheetHeight);
  }
  assert.ok(dust.frames.every((frame) => frame.y === dust.sheetHeight / 2));
  assert.equal(dust.frames[3].x + dust.frames[3].width, dust.sheetWidth);
  assert.equal(dust.frames[3].y + dust.frames[3].height, dust.sheetHeight);
  const grid = currentIsoGrid;
  const ground = getIsoSpritePosition({ type: 'house2', gridX: 20, gridY: 20, rotationQuarterTurns: 0 }, grid);
  for (const footprint of [{ width: 2, height: 2 }, { width: 3, height: 3 }]) {
    for (const zoom of [0.54, 1, 2.9]) {
      const screenGround = isoToScreen(ground, { centerX: 180, centerY: 360, panX: 25, panY: -15, zoom });
      for (let index = 0; index < dust.frameCount; index++) {
        const pose = getPlacementDustFramePose(index, screenGround, footprint, zoom);
        assert.ok(Math.abs(pose.x + pose.source.width * pose.scale * dust.anchor.x - screenGround.x) < 1e-9);
        assert.ok(Math.abs(pose.y + pose.source.height * pose.scale * dust.anchor.y - screenGround.y) < 1e-9);
      }
    }
  }
  const smallAtMinZoom = getPlacementDustFramePose(2, isoToScreen(ground, { centerX: 180, centerY: 360, panX: 0, panY: 0, zoom: 0.38 }), { width: 2, height: 2 }, 0.38);
  const smallAtNormalZoom = getPlacementDustFramePose(2, isoToScreen(ground, { centerX: 180, centerY: 360, panX: 0, panY: 0, zoom: 1 }), { width: 2, height: 2 }, 1);
  const smallAtMaxZoom = getPlacementDustFramePose(2, isoToScreen(ground, { centerX: 180, centerY: 360, panX: 0, panY: 0, zoom: 2.9 }), { width: 2, height: 2 }, 2.9);
  assert.ok(Math.abs(smallAtMinZoom.scale / 0.38 - smallAtNormalZoom.scale) < 1e-9);
  assert.ok(Math.abs(smallAtMaxZoom.scale / 2.9 - smallAtNormalZoom.scale) < 1e-9);
  assert.equal(smallAtNormalZoom.source.width * smallAtNormalZoom.scale, dust.renderSize.width);
  assert.ok(getPlacementDustFramePose(2, ground, { width: 3, height: 3 }, 1).scale
    > getPlacementDustFramePose(2, ground, { width: 2, height: 2 }, 1).scale);
  const front = getPlacementDustFrontBand(ground, { width: 2, height: 2 }, 1);
  assert.ok(front.y < ground.y && front.y + front.height > ground.y);
  assert.ok(front.y >= ground.y - 20);
});

test('drag keeps the initial grab offset while snapping 2x2 and 3x3 ground anchors', () => {
  const grid = currentIsoGrid;
  const viewport = { centerX: 180, centerY: 350, panX: 27, panY: -18, zoom: 1.4 };
  for (const type of ['house2', 'house1']) {
    const initial = { type, gridX: 18, gridY: 21, rotationQuarterTurns: 0 };
    const painted = getIsoSpriteRenderRect({ ...initial, id: 'preview', preview: true }, grid, undefined, getPreviewLiftWorldY(viewport.zoom));
    const touch = isoToScreen({ x: painted.x + painted.width * 0.45, y: painted.y + painted.height * 0.25 }, viewport);
    assert.equal(isPointOnPreviewSprite(touch, initial, grid, viewport), true);
    assert.equal(isPointOnPreviewSprite({ x: touch.x + 300, y: touch.y }, initial, grid, viewport), false);
    const grab = getBuildDragGrabOffset(touch, initial, grid, viewport);
    assert.deepEqual(getDraggedPlacementOrigin(touch, grab, initial, grid, viewport), { gridX: 18, gridY: 21 });
    const destination = { ...initial, gridX: 23, gridY: 17 };
    const destinationAnchor = isoToScreen(getIsoSpritePosition(destination, grid), viewport);
    const movedTouch = { x: destinationAnchor.x + grab.x, y: destinationAnchor.y + grab.y };
    assert.deepEqual(getDraggedPlacementOrigin(movedTouch, grab, initial, grid, viewport), { gridX: 23, gridY: 17 });
    assert.deepEqual(getDraggedPlacementOrigin({ x: movedTouch.x + 1, y: movedTouch.y + 1 }, grab, initial, grid, viewport), { gridX: 23, gridY: 17 });
  }
});

test('build gesture owner is chosen from touch-down hit area and finger count', () => {
  const grid = currentIsoGrid;
  const viewport = { centerX: 180, centerY: 350, panX: 0, panY: 0, zoom: 1 };
  const draft = { type: 'house2', gridX: 20, gridY: 20, rotationQuarterTurns: 0 };
  const rect = getIsoSpriteRenderRect({ ...draft, id: 'preview', preview: true }, grid, undefined, getPreviewLiftWorldY(viewport.zoom));
  const onBuilding = isoToScreen({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }, viewport);
  const onBackground = { x: onBuilding.x + 240, y: onBuilding.y + 120 };
  assert.equal(getInitialBuildGestureMode(onBuilding, 1, draft, grid, viewport), 'building');
  assert.equal(getInitialBuildGestureMode(onBackground, 1, draft, grid, viewport), 'camera');
  assert.equal(getInitialBuildGestureMode(onBuilding, 2, draft, grid, viewport), 'camera');
  assert.equal(getInitialBuildGestureMode(onBuilding, 1, null, grid, viewport), 'camera');
  // A background pan crossing the sprite later keeps its touch-down owner.
  const ownerAtTouchDown = getInitialBuildGestureMode(onBackground, 1, draft, grid, viewport);
  assert.equal(ownerAtTouchDown, 'camera');
  assert.equal(isPointOnPreviewSprite(onBuilding, draft, grid, viewport), true);
});

test('placed-building tap selects, long press moves, and early movement cancels recognition', () => {
  assert.equal(PLACED_BUILDING_LONG_PRESS_MS, 420);
  assert.equal(getPlacedPressAction(100, 0, 1), 'select');
  assert.equal(getPlacedPressAction(419, PLACED_BUILDING_PRESS_TOLERANCE, 1), 'select');
  assert.equal(getPlacedPressAction(420, 0, 1), 'move');
  assert.equal(getPlacedPressAction(550, 5, 1), 'move');
  assert.equal(getPlacedPressAction(100, PLACED_BUILDING_PRESS_TOLERANCE + 1, 1), 'none');
  assert.equal(getPlacedPressAction(500, 0, 2), 'none');
});

test('placed-building selection uses the visible sprite rect, including art above its footprint', () => {
  const grid = currentIsoGrid;
  const viewport = { centerX: 180, centerY: 350, panX: 0, panY: 0, zoom: 1 };
  const building = { id: 'house2-1', type: 'house2', gridX: 20, gridY: 20, rotationQuarterTurns: 0 };
  const rect = getIsoSpriteImageRect(building, grid);
  const roofPoint = isoToScreen({ x: rect.x + rect.width / 2, y: rect.y + rect.height * 0.15 }, viewport);
  assert.equal(getPlacedBuildingAtPoint(roofPoint, [building], grid, viewport)?.id, building.id);
  assert.equal(getPlacedBuildingAtPoint({ x: roofPoint.x + 300, y: roofPoint.y }, [building], grid, viewport), null);
});

test('long-press move preserves the original until Confirm and never duplicates it', () => {
  const original = { id: 'house2-1', type: 'house2', gridX: 20, gridY: 20, rotationQuarterTurns: 0 };
  const placements = [original];
  const player = createInitialPlayerState(date);
  const draft = { type: original.type, gridX: 22, gridY: 21, rotationQuarterTurns: 0 };
  assert.deepEqual(placements, [original]); // Cancel simply discards the draft.
  const confirmed = commitPreviewPlacement(draft, placements, original.id);
  assert.ok(confirmed);
  assert.equal(confirmed.isNew, false);
  assert.equal(confirmed.placements.length, 1);
  assert.deepEqual(confirmed.placed, { ...original, gridX: 22, gridY: 21 });
  assert.deepEqual(player, createInitialPlayerState(date));
});

test('dragging a moved building changes only its draft until confirmation; cancel retains original', () => {
  const grid = currentIsoGrid;
  const viewport = { centerX: 180, centerY: 350, panX: 0, panY: 0, zoom: 1 };
  const original = { id: 'house2-1', type: 'house2', gridX: 19, gridY: 20, rotationQuarterTurns: 0 };
  const placements = [original];
  const player = createInitialPlayerState(date);
  const draft = { type: original.type, gridX: original.gridX, gridY: original.gridY, rotationQuarterTurns: 0 };
  const start = isoToScreen(getIsoSpritePosition(draft, grid), viewport);
  const grab = getBuildDragGrabOffset(start, draft, grid, viewport);
  const destination = { ...draft, gridX: 21, gridY: 20 };
  const nextAnchor = isoToScreen(getIsoSpritePosition(destination, grid), viewport);
  const cell = getDraggedPlacementOrigin(nextAnchor, grab, draft, grid, viewport);
  const movedDraft = { ...draft, ...cell };
  assert.deepEqual(placements, [original]); // Cancel: no placement transaction took place.
  assert.deepEqual(player, createInitialPlayerState(date)); // Drag never credits or spends.
  const confirmed = commitPreviewPlacement(movedDraft, placements, original.id);
  assert.ok(confirmed);
  assert.equal(confirmed.isNew, false);
  assert.deepEqual(confirmed.placed, { ...original, gridX: 21 });
});

test('DEV calibration changes painted image rect without moving the canonical ground anchor', () => {
  const grid = currentIsoGrid;
  for (const type of ['house1', 'house2', 'house3']) {
    const preview = { type, gridX: 20, gridY: 20, rotationQuarterTurns: 0 };
    const original = getDefaultSpriteCalibration(type);
    const adjusted = {
      renderWidth: original.renderWidth * 1.03,
      groundAnchorX: original.groundAnchorX + 0.01,
      groundAnchorY: original.groundAnchorY - 0.01,
    };
    const overrides = { [type]: adjusted };
    const before = getIsoSpriteImageRect(preview, grid);
    const after = getIsoSpriteImageRect(preview, grid, overrides);
    assert.ok(after.width > before.width);
    assert.notEqual(after.x, before.x);
    assert.notEqual(after.y, before.y);
    assert.deepEqual(getSpriteCalibration(type, overrides), adjusted);
    assertPointClose(getIsoSpriteContactPoint(preview, grid, overrides), getIsoSpritePosition(preview, grid));
    const committed = commitPreviewPlacement(preview, [], null);
    assert.ok(committed);
    assert.deepEqual(getIsoSpriteImageRect(committed.placed, grid, overrides), after);
    assert.deepEqual(getIsoSpriteImageRect(preview, grid), before); // Reset is simply removing the override.
    assert.match(formatSpriteCalibration(type, adjusted), /renderSize: \{ width: .*anchor: \{ x:/);
  }
  const legacy = { type: 'gardenHouse', gridX: 19, gridY: 19, rotationQuarterTurns: 0 };
  const override = { house3: { renderWidth: 99, groundAnchorX: 0.51, groundAnchorY: 0.83 } };
  assert.equal(getIsoSpriteImageRect(legacy, grid, override).width, 99);
  assert.deepEqual(getSpriteCalibration('house1', override), getDefaultSpriteCalibration('house1'));
});

test('selling refunds half the catalog cost once, frees cells, and preserves XP', () => {
  assert.equal(getSellRefund('house3'), 150);
  assert.equal(getSellRefund('house2'), 180);
  assert.equal(getSellRefund('house1'), 210);
  const sold = { id: 'house3-1', type: 'house3', gridX: 20, gridY: 20, rotationQuarterTurns: 0 };
  const first = sellPlacedBuilding([sold], sold.id);
  assert.equal(first.deleted, true);
  assert.equal(first.refund, 150);
  assert.deepEqual(first.placements, []);
  assert.equal(validatePlacement(sold, first.placements).valid, true);
  const again = sellPlacedBuilding(first.placements, sold.id);
  assert.equal(again.deleted, false);
  assert.equal(again.refund, 0);
  const player = createInitialPlayerState(date);
  const withXp = { ...player, xp: 250, level: 3 };
  const refunded = refundBuildingSale(withXp, first.refund);
  assert.equal(refunded.energy, withXp.energy + 150);
  assert.equal(refunded.xp, withXp.xp);
  assert.equal(refunded.level, withXp.level);
  assert.deepEqual(refunded.dailySteps, withXp.dailySteps);
});

test('known old houses use their original prices; unknown types delete safely without a refund', () => {
  assert.equal(getSellRefund('balconyHouse'), 210);
  assert.equal(getSellRefund('townBuilding'), 260);
  assert.equal(getSellRefund('civicHouse'), 180);
  assert.equal(getSellRefund('gardenHouse'), 150);
  assert.equal(getSellRefund('cozyCottage'), 230);
  assert.equal(getSellRefund('unrecognized-old-house'), 0);
  const unknown = { id: 'unknown-1', type: 'unrecognized-old-house', gridX: 20, gridY: 20, rotationQuarterTurns: 0 };
  const sale = sellPlacedBuilding([unknown], unknown.id);
  assert.equal(sale.deleted, true);
  assert.equal(sale.refund, 0);
  assert.deepEqual(sale.placements, []);
});
