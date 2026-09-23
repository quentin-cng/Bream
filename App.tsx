import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { connectHealth, getHealthStatus, readTodaySteps } from './src/health/healthService';
import type { StepSourceStatus } from './src/health/stepSource';
import { IsometricWorld } from './src/isometric/IsometricWorld';
import { DevSpriteCalibrationPanel } from './src/isometric/DevSpriteCalibrationPanel';
import { PLACEMENT_EFFECT_CLEANUP_MS } from './src/isometric/placementDustSprite';
import type { SettlingPlacement } from './src/isometric/SpriteLayer';
import { getSpriteCalibration, getSpriteDefinition, type SpriteCalibrationOverrides } from './src/isometric/spriteCatalog';
import {
  OBJECT_DEFINITIONS,
  getObjectDefinition,
  getObjectsByCategory,
  isBuildableType,
  type BuildableType,
} from './src/island/objectCatalog';
import {
  findFirstValidPlacement,
  movePlacementToCell,
  validatePlacement,
  type BuildingDraft,
  type BuildingPlacement,
} from './src/island/placementGrid';
import { commitPreviewPlacement, getSellRefund, sellPlacedBuilding } from './src/island/placementTransactions';
import { canAfford, canUnlock, type PlayerState } from './src/progression/playerProgression';
import { usePlayerProgression } from './src/progression/usePlayerProgression';
import { clearGameSave, loadGameSave, saveGameState } from './src/storage/gameSave';
import type { GameSnapshot } from './src/storage/gameSaveSchema';
import { GameIcon, type GameIconName } from './src/ui/GameIcon';
import { GameNav, type MainTab } from './src/ui/GameNav';
import { GAME_COLORS, GAME_RADII, GAME_SHADOWS } from './src/ui/gameTheme';
import {
  CollectionScreen,
  FriendsScreen,
  ProfileScreen,
  ShopScreen,
} from './src/ui/GameScreens';

type HudTone = 'steps' | 'streak' | 'energy';

function HudPill({ icon, value, label, accent, tone }: {
  icon: GameIconName;
  value: string;
  label: string;
  accent: string;
  tone: HudTone;
}) {
  const pillTone = tone === 'steps'
    ? styles.hudPillSteps
    : tone === 'streak'
      ? styles.hudPillStreak
      : styles.hudPillEnergy;
  const iconTone = tone === 'steps'
    ? styles.hudIconSteps
    : tone === 'streak'
      ? styles.hudIconStreak
      : styles.hudIconEnergy;
  return (
    <View style={[styles.hudPill, pillTone]}>
      <View style={[styles.hudIcon, iconTone]}>
        <GameIcon name={icon} size={24} color={accent} strokeWidth={2.6} />
      </View>
      <View style={styles.hudCopy}>
        <Text style={styles.hudLabel}>{label}</Text>
        <Text style={styles.hudValue}>{value}</Text>
      </View>
    </View>
  );
}

function IslandHud({ player }: { player: PlayerState }) {
  return (
    <View style={styles.islandHud}>
      <HudPill icon="steps" value={String(player.steps).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} label="PAS" accent="#76E0EE" tone="steps" />
      <HudPill icon="streak" value="7" label="JOURS" accent="#FF9B68" tone="streak" />
      <HudPill icon="energy" value={String(player.energy)} label="ÉNERGIE" accent="#FFD75A" tone="energy" />
    </View>
  );
}

function PlacementToolbar({
  editing,
  preview,
  valid,
  colliding,
  affordable,
  onCancel,
  onRotate,
  onConfirm,
}: {
  editing: boolean;
  preview: BuildingDraft | null;
  valid: boolean;
  colliding: boolean;
  affordable: boolean;
  onCancel: () => void;
  onRotate: () => void;
  onConfirm: () => void;
}) {
  const definition = preview ? getObjectDefinition(preview.type) : null;
  const name = definition?.name ?? 'Objet';
  const canConfirm = valid && (editing || affordable);
  return (
    <View style={styles.placementToolbar}>
      <View style={styles.placementTop}>
        <View style={styles.placementThumbnail}>
          {definition ? <Image source={definition.thumbnail} resizeMode="contain" style={styles.placementImage} /> : null}
        </View>
        <View style={styles.placementInfo}>
          <Text style={styles.placementEyebrow}>{editing ? 'MODIFIER' : 'PLACER'}</Text>
          <Text numberOfLines={1} style={styles.placementTitle}>{name}</Text>
          <Text style={styles.placementMeta}>{definition ? `${definition.footprint.width} × ${definition.footprint.height}` : ''} · {(preview?.rotationQuarterTurns ?? 0) * 90}°</Text>
          <Text style={[styles.placementHint, !canConfirm && styles.placementHintInvalid]}>
            {!editing && !affordable ? 'Pas assez d’Énergie' : valid ? 'Choisis une zone puis confirme' : colliding ? 'Zone déjà occupée' : 'Hors de la zone constructible'}
          </Text>
        </View>
        {definition && !editing ? <View style={styles.placementCost}><GameIcon name="energy" size={20} color="#D99412" /><Text style={styles.placementCostText}>{definition.cost}</Text></View> : null}
      </View>
      <View style={styles.placementActions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Annuler le placement" onPress={onCancel} style={({ pressed }) => [styles.placementAction, styles.cancelToolButton, pressed && styles.actionPressed]}>
          <GameIcon name="cancel" size={27} color="#FFFFFF" strokeWidth={3} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Tourner de 90 degrés" onPress={onRotate} style={({ pressed }) => [styles.placementAction, styles.rotateToolButton, pressed && styles.actionPressed]}>
          <GameIcon name="rotate" size={27} color="#FFFFFF" strokeWidth={2.7} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canConfirm }}
          disabled={!canConfirm}
          onPress={onConfirm}
          accessibilityLabel="Confirmer le placement"
          style={({ pressed }) => [styles.placementAction, styles.confirmButton, !canConfirm && styles.confirmButtonDisabled, pressed && styles.actionPressed]}
        >
          <GameIcon name="confirm" size={27} color="#FFFFFF" strokeWidth={3} />
        </Pressable>
      </View>
    </View>
  );
}

function EditToolbar({ name, refund, onMove, onDelete, onCancel }: {
  name: string;
  refund: number;
  onMove: () => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  return (
    <View style={styles.placementToolbar}>
      <Text style={styles.placementEyebrow}>MODIFIER</Text>
      <Text style={styles.placementTitle}>{name}</Text>
      <Text style={styles.placementHint}>Revente : +{refund} Énergie</Text>
      <View style={styles.placementActions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Déplacer la maison" onPress={onMove} style={({ pressed }) => [styles.placementAction, styles.rotateToolButton, pressed && styles.actionPressed]}>
          <GameIcon name="move" size={27} color="#FFFFFF" strokeWidth={2.7} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Supprimer ou vendre la maison" onPress={onDelete} style={({ pressed }) => [styles.placementAction, styles.cancelToolButton, pressed && styles.actionPressed]}>
          <GameIcon name="delete" size={27} color="#FFFFFF" strokeWidth={2.7} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Annuler la modification" onPress={onCancel} style={({ pressed }) => [styles.placementAction, styles.editCancelButton, pressed && styles.actionPressed]}>
          <GameIcon name="cancel" size={27} color="#FFFFFF" strokeWidth={2.7} />
        </Pressable>
      </View>
      <View style={styles.editLabels}><Text style={styles.editLabel}>Déplacer</Text><Text style={styles.editLabel}>Vendre</Text><Text style={styles.editLabel}>Annuler</Text></View>
    </View>
  );
}

function BuildCatalogTray({ canPlace, playerLevel, onSelect, onClose }: {
  canPlace: (type: BuildableType) => boolean;
  playerLevel: number;
  onSelect: (type: BuildableType) => void;
  onClose: () => void;
}) {
  const buildings = getObjectsByCategory('buildings');
  return (
    <View style={styles.buildTray}>
      <View style={styles.trayHandle} />
      <View style={styles.buildTrayHeader}>
        <View>
          <Text style={styles.buildTrayTitle}>Buildings</Text>
          <Text style={styles.buildTraySubtitle}>Choisis un bâtiment à placer</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onClose} style={({ pressed }) => [styles.closeButton, pressed && styles.actionPressed]}>
          <GameIcon name="cancel" size={20} color="#FFFFFF" />
        </Pressable>
      </View>
      <View style={styles.buildCategories}>
        {[
          { icon: 'building' as const, active: true },
          { icon: 'nature' as const, active: false },
          { icon: 'decor' as const, active: false },
          { icon: 'special' as const, active: false },
        ].map(({ icon, active }) => (
          <View key={icon} style={[styles.buildCategory, active && styles.buildCategoryActive]}>
            <GameIcon
              name={icon}
              size={21}
              color={active ? '#FFFFFF' : '#7C7A84'}
              strokeWidth={2.2}
            />
          </View>
        ))}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.buildList}
      >
        {buildings.map(([type, definition]) => {
          const locked = !canUnlock(definition.unlockLevel, playerLevel);
          const available = !locked && canPlace(type);
          return (
            <Pressable
              key={type}
              accessibilityRole="button"
              accessibilityState={{ disabled: !available }}
              disabled={!available}
              onPress={() => onSelect(type)}
              style={({ pressed }) => [
                styles.buildCard,
                pressed && styles.buildCardPressed,
                !available && styles.buildCardDisabled,
              ]}
            >
              <View style={styles.buildCardVisual}>
                <Image source={definition.thumbnail} resizeMode="contain" style={styles.buildCardThumbnail} />
                <Text style={styles.buildCardKind}>BÂTIMENT</Text>
                {locked ? (
                  <View style={styles.buildCardLock}>
                    <GameIcon name="lock" size={12} color="#FFFFFF" />
                  </View>
                ) : null}
              </View>
              <Text numberOfLines={1} style={styles.buildCardName}>{definition.name}</Text>
              {locked ? <Text style={styles.buildCardMeta}>Niveau {definition.unlockLevel} requis</Text> : null}
              <View style={styles.buildCardMetaRow}>
                <View style={styles.buildCardMetaPill}>
                  <GameIcon name="footprint" size={8} color={GAME_COLORS.primaryDark} />
                  <Text style={styles.buildCardMeta}>{definition.footprint.width}×{definition.footprint.height}</Text>
                </View>
                <View style={styles.buildCardMetaPill}>
                  <GameIcon name="energy" size={8} color="#D99412" />
                  <Text style={styles.buildCardMeta}>{definition.cost}</Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function App() {
  const [initialSave, setInitialSave] = useState<GameSnapshot | null | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    void loadGameSave().then((saved) => {
      if (mounted) setInitialSave(saved);
    });
    return () => { mounted = false; };
  }, []);

  if (initialSave === undefined) return <View style={styles.screen} />;
  return <GameApp initialSave={initialSave} />;
}

function GameApp({ initialSave }: { initialSave: GameSnapshot | null }) {
  const { player, syncSnapshot, rollOverToday, awardBuilding, refundBuilding, addMockSteps, addMockEnergy, addMockXp, resetPlayer } = usePlayerProgression(initialSave?.player);
  const [healthStatus, setHealthStatus] = useState<StepSourceStatus>(Platform.OS === 'android' ? 'permission-required' : 'mock');
  const [healthBusy, setHealthBusy] = useState(false);
  const permissionWasDenied = useRef(false);
  const healthRequestId = useRef(0);
  const healthBusyRef = useRef(false);
  const placementConfirmationInFlight = useRef(false);
  const settleToken = useRef(0);
  const [settlingPlacement, setSettlingPlacement] = useState<SettlingPlacement | null>(null);
  const deletionPendingId = useRef<string | null>(null);
  const [activeTab, setActiveTab] = useState<MainTab>('island');
  const [buildCatalogOpen, setBuildCatalogOpen] = useState(false);
  const [placementMode, setPlacementMode] = useState(false);
  const [placementFromCatalog, setPlacementFromCatalog] = useState(false);
  const [placedBuildings, setPlacedBuildings] = useState<BuildingPlacement[]>(initialSave?.placedObjects ?? []);
  const placedBuildingsRef = useRef<BuildingPlacement[]>(initialSave?.placedObjects ?? []);
  const [previewBuilding, setPreviewBuilding] = useState<BuildingDraft | null>(null);
  const previewBuildingRef = useRef<BuildingDraft | null>(null);
  const [editingBuildingId, setEditingBuildingId] = useState<string | null>(null);
  const [devSpriteCalibrations, setDevSpriteCalibrations] = useState<SpriteCalibrationOverrides>({});

  useEffect(() => {
    if (!settlingPlacement) return;
    const timer = setTimeout(() => {
      setSettlingPlacement((current) => current?.token === settlingPlacement.token ? null : current);
    }, PLACEMENT_EFFECT_CLEANUP_MS);
    return () => clearTimeout(timer);
  }, [settlingPlacement]);

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      rollOverToday();
      if (healthBusyRef.current) return;
      const requestId = ++healthRequestId.current;
      const status = await getHealthStatus();
      if (!mounted || requestId !== healthRequestId.current) return;
      setHealthStatus(status === 'permission-required' && permissionWasDenied.current ? 'denied' : status);
      if (status !== 'connected') return;
      try {
        const snapshot = await readTodaySteps();
        if (!mounted || requestId !== healthRequestId.current) return;
        if (snapshot) {
          syncSnapshot(snapshot);
          setHealthStatus(snapshot.steps === 0 ? 'no-data' : 'connected');
        } else {
          const latestStatus = await getHealthStatus();
          if (mounted && requestId === healthRequestId.current) {
            setHealthStatus(latestStatus === 'connected' ? 'no-data' : latestStatus);
          }
        }
      } catch (error) {
        console.warn('Could not read today’s Health Connect steps', error);
        if (mounted && requestId === healthRequestId.current) setHealthStatus('error');
      }
    };
    void refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    // One wake-up at local midnight; foreground refresh also covers suspended timers.
    const scheduleMidnight = (): ReturnType<typeof setTimeout> => {
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      return setTimeout(() => {
        void refresh();
        if (mounted) midnightTimer = scheduleMidnight();
      }, nextMidnight.getTime() - now.getTime() + 1000);
    };
    let midnightTimer = scheduleMidnight();
    return () => {
      mounted = false;
      subscription.remove();
      clearTimeout(midnightTimer);
    };
  }, []);

  const connectOrRetryHealth = async () => {
    if (healthBusyRef.current || Platform.OS !== 'android') return;
    healthBusyRef.current = true;
    const requestId = ++healthRequestId.current;
    setHealthBusy(true);
    try {
      const status = await connectHealth();
      if (requestId !== healthRequestId.current) return;
      permissionWasDenied.current = status === 'denied';
      setHealthStatus(status);
      if (status === 'connected') {
        const snapshot = await readTodaySteps();
        if (requestId !== healthRequestId.current) return;
        if (snapshot) {
          syncSnapshot(snapshot);
          setHealthStatus(snapshot.steps === 0 ? 'no-data' : 'connected');
        } else {
          const latestStatus = await getHealthStatus();
          if (requestId === healthRequestId.current) {
            setHealthStatus(latestStatus === 'connected' ? 'no-data' : latestStatus);
          }
        }
      }
    } catch (error) {
      console.warn('Could not read today’s Health Connect steps', error);
      if (requestId === healthRequestId.current) setHealthStatus('error');
    } finally {
      healthBusyRef.current = false;
      setHealthBusy(false);
    }
  };

  useEffect(() => {
    try {
      saveGameState({ player, placedObjects: placedBuildings });
    } catch (error) {
      console.warn('Could not save local game state', error);
    }
  }, [player, placedBuildings]);

  const previewValidity = previewBuilding
    ? validatePlacement(previewBuilding, placedBuildings, editingBuildingId)
    : null;

  const updatePreview = (next: BuildingDraft | null) => {
    previewBuildingRef.current = next;
    setPreviewBuilding(next);
  };

  const updatePlacements = (next: BuildingPlacement[]) => {
    placedBuildingsRef.current = next;
    setPlacedBuildings(next);
  };

  const closePlacement = (returnToCatalog = false) => {
    setPlacementMode(false);
    updatePreview(null);
    setEditingBuildingId(null);
    deletionPendingId.current = null;
    setPlacementFromCatalog(false);
    setBuildCatalogOpen(returnToCatalog);
  };

  const resetLocalSave = () => {
    setSettlingPlacement(null);
    healthRequestId.current += 1;
    try {
      clearGameSave();
    } catch (error) {
      console.warn('Could not clear local game state', error);
    }
    resetPlayer();
    setHealthStatus('mock');
    updatePlacements([]);
    closePlacement();
    setBuildCatalogOpen(false);
  };

  const selectTab = (tab: MainTab) => {
    if (tab !== 'island') {
      if (placementMode || editingBuildingId) closePlacement(false);
      setBuildCatalogOpen(false);
    }
    setActiveTab(tab);
  };

  const startObjectPlacement = (type: BuildableType) => {
    if (!canUnlock(OBJECT_DEFINITIONS[type].unlockLevel, player.level)) return;
    const initialPlacement = findFirstValidPlacement(type, placedBuildingsRef.current);
    if (!initialPlacement) return;
    placementConfirmationInFlight.current = false;
    setBuildCatalogOpen(false);
    updatePreview(initialPlacement);
    setEditingBuildingId(null);
    setPlacementFromCatalog(true);
    setPlacementMode(true);
    setActiveTab('island');
  };

  const editBuilding = (buildingId: string) => {
    const building = placedBuildingsRef.current.find((candidate) => candidate.id === buildingId);
    if (!building) return;
    placementConfirmationInFlight.current = false;
    updatePreview(null);
    setEditingBuildingId(building.id);
    setBuildCatalogOpen(false);
    setPlacementFromCatalog(false);
    setPlacementMode(false);
    setActiveTab('island');
  };

  const startMovingBuilding = () => {
    const building = placedBuildingsRef.current.find((candidate) => candidate.id === editingBuildingId);
    if (!building) return;
    updatePreview({
      type: building.type,
      gridX: building.gridX,
      gridY: building.gridY,
      rotationQuarterTurns: building.rotationQuarterTurns,
    });
    setPlacementMode(true);
  };

  const longPressMoveBuilding = (buildingId: string) => {
    const building = placedBuildingsRef.current.find((candidate) => candidate.id === buildingId);
    if (!building) return;
    placementConfirmationInFlight.current = false;
    updatePreview({
      type: building.type,
      gridX: building.gridX,
      gridY: building.gridY,
      rotationQuarterTurns: building.rotationQuarterTurns,
    });
    setEditingBuildingId(building.id);
    setBuildCatalogOpen(false);
    setPlacementFromCatalog(false);
    setPlacementMode(true);
    setActiveTab('island');
  };

  const cancelMove = () => {
    setPlacementMode(false);
    updatePreview(null);
  };

  const rotatePreview = () => {
    const current = previewBuildingRef.current;
    if (current) updatePreview({
      ...current,
      rotationQuarterTurns: (current.rotationQuarterTurns + 1) % 4,
    });
  };

  const confirmPlacement = () => {
    const preview = previewBuildingRef.current;
    if (placementConfirmationInFlight.current || !preview) return;
    const result = commitPreviewPlacement(preview, placedBuildingsRef.current, editingBuildingId);
    if (!result) return;
    const definition = result.isNew && isBuildableType(preview.type) ? OBJECT_DEFINITIONS[preview.type] : null;
    if (definition && (!canUnlock(definition.unlockLevel, player.level) || !canAfford(definition.cost, player.energy))) return;
    placementConfirmationInFlight.current = true;
    updatePlacements(result.placements);
    setSettlingPlacement({ id: result.placed.id, token: ++settleToken.current });
    if (definition) awardBuilding(definition.cost, definition.xpReward);
    closePlacement(placementFromCatalog);
  };

  const requestDeleteBuilding = () => {
    const id = editingBuildingId;
    if (!id || deletionPendingId.current) return;
    const building = placedBuildingsRef.current.find((candidate) => candidate.id === id);
    if (!building) return;
    const refund = getSellRefund(building.type);
    deletionPendingId.current = id;
    Alert.alert(
      'Supprimer cette maison ?',
      refund > 0
        ? `Vous récupérerez ${refund} Énergie.`
        : 'Prix d’origine inconnu : aucun remboursement.',
      [
        { text: 'Annuler', style: 'cancel', onPress: () => { if (deletionPendingId.current === id) deletionPendingId.current = null; } },
        { text: 'Supprimer', style: 'destructive', onPress: () => {
          if (deletionPendingId.current !== id) return;
          deletionPendingId.current = null;
          const sale = sellPlacedBuilding(placedBuildingsRef.current, id);
          if (!sale.deleted) return;
          updatePlacements(sale.placements);
          refundBuilding(sale.refund);
          closePlacement();
        } },
      ],
      { cancelable: true, onDismiss: () => { if (deletionPendingId.current === id) deletionPendingId.current = null; } },
    );
  };

  const calibrationBuilding = placementMode
    ? previewBuilding
    : editingBuildingId
      ? placedBuildings.find((building) => building.id === editingBuildingId) ?? null
      : null;
  const calibrationType = __DEV__ && activeTab === 'island' && calibrationBuilding
    ? getSpriteDefinition(calibrationBuilding.type).id : null;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <IsometricWorld
        placementMode={placementMode}
        placedBuildings={placedBuildings}
        previewBuilding={previewBuilding}
        editingBuildingId={editingBuildingId}
        devSpriteCalibrations={__DEV__ ? devSpriteCalibrations : undefined}
        onPreviewCell={(cell) => {
          const current = previewBuildingRef.current;
          if (current) updatePreview(movePlacementToCell(current, cell));
        }}
        onPreviewDragCell={(cell) => {
          const current = previewBuildingRef.current;
          if (current && (current.gridX !== cell.gridX || current.gridY !== cell.gridY)) {
            updatePreview({ ...current, gridX: cell.gridX, gridY: cell.gridY });
          }
        }}
        onEditBuilding={editBuilding}
        onLongPressBuilding={longPressMoveBuilding}
        settlingPlacement={settlingPlacement}
      />

      {activeTab !== 'island' ? <View pointerEvents="none" style={[styles.worldVeil, activeTab === 'collection' && styles.collectionWorldVeil]} /> : null}
      <View pointerEvents="none" style={styles.edgeShade} />
      <View pointerEvents="none" style={styles.bottomNavBackdrop} />

      <SafeAreaView pointerEvents="box-none" style={styles.safeArea}>
        <View pointerEvents={activeTab === 'island' ? 'box-none' : 'auto'} style={styles.content}>
          {activeTab === 'island' ? <IslandHud player={player} /> : null}
          {activeTab === 'collection' ? (
            <CollectionScreen playerLevel={player.level} onBuild={startObjectPlacement} />
          ) : null}
          {activeTab === 'shop' ? <ShopScreen energy={player.energy} /> : null}
          {activeTab === 'friends' ? <FriendsScreen /> : null}
          {activeTab === 'profile' ? (
            <ProfileScreen
              player={player}
              healthStatus={healthStatus}
              healthBusy={healthBusy}
              onConnectHealth={connectOrRetryHealth}
              onAddMockSteps={() => addMockSteps(1000)}
              onAddMockEnergy={addMockEnergy}
              onAddMockXp={() => addMockXp(100)}
              onResetLocalSave={resetLocalSave}
            />
          ) : null}
          {activeTab === 'island' ? <View pointerEvents="none" style={styles.worldSpace} /> : null}
          {__DEV__ && calibrationType ? (
            <DevSpriteCalibrationPanel
              type={calibrationType}
              calibration={getSpriteCalibration(calibrationType, devSpriteCalibrations)}
              onChange={(next) => setDevSpriteCalibrations((current) => ({ ...current, [calibrationType]: next }))}
              onReset={() => setDevSpriteCalibrations((current) => {
                const next = { ...current };
                delete next[calibrationType];
                return next;
              })}
            />
          ) : null}

          {activeTab === 'island' && buildCatalogOpen ? (
            <BuildCatalogTray
              canPlace={(type) => Boolean(findFirstValidPlacement(type, placedBuildings))}
              playerLevel={player.level}
              onSelect={startObjectPlacement}
              onClose={() => setBuildCatalogOpen(false)}
            />
          ) : null}
          {activeTab === 'island' && placementMode ? (
            <PlacementToolbar
              editing={Boolean(editingBuildingId)}
              preview={previewBuilding}
              valid={previewValidity?.valid ?? false}
              colliding={previewValidity?.colliding ?? false}
              affordable={previewBuilding && isBuildableType(previewBuilding.type)
                ? canAfford(OBJECT_DEFINITIONS[previewBuilding.type].cost, player.energy) : false}
              onCancel={editingBuildingId ? cancelMove : () => closePlacement(placementFromCatalog)}
              onRotate={rotatePreview}
              onConfirm={confirmPlacement}
            />
          ) : null}
          {activeTab === 'island' && editingBuildingId && !placementMode ? (() => {
            const selected = placedBuildings.find((building) => building.id === editingBuildingId);
            return selected ? <EditToolbar
              name={getObjectDefinition(selected.type).name}
              refund={getSellRefund(selected.type)}
              onMove={startMovingBuilding}
              onDelete={requestDeleteBuilding}
              onCancel={() => closePlacement()}
            /> : null;
          })() : null}
        </View>

        <GameNav activeTab={activeTab} onSelect={selectTab} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#92BEE3' },
  worldVeil: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(245, 240, 231, 0.96)' },
  collectionWorldVeil: { backgroundColor: 'rgba(245, 240, 231, 0.98)' },
  edgeShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(38, 83, 118, 0.025)' },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingBottom: 0,
  },
  content: { flex: 1, paddingHorizontal: 12 },
  bottomNavBackdrop: { position: 'absolute', left: 0, right: 0, bottom: 0, height: Platform.OS === 'ios' ? 38 : 8, backgroundColor: GAME_COLORS.cream },
  islandHud: { width: '100%', flexDirection: 'row', alignSelf: 'center', gap: 7, marginTop: 9 },
  hudPill: {
    flex: 1,
    minWidth: 0,
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255, 252, 247, 0.96)',
    borderColor: GAME_COLORS.border,
    ...GAME_SHADOWS.soft,
  },
  hudPillSteps: { borderColor: '#A6DCF3' },
  hudPillStreak: { borderColor: '#F6C991' },
  hudPillEnergy: { borderColor: '#EFD386' },
  hudIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 13, borderWidth: 1 },
  hudIconSteps: { backgroundColor: '#E1F6FD', borderColor: '#B5E5F7' },
  hudIconStreak: { backgroundColor: '#FFF0D8', borderColor: '#F8D7A1' },
  hudIconEnergy: { backgroundColor: GAME_COLORS.goldSoft, borderColor: '#F2D786' },
  hudCopy: { marginLeft: 6, minWidth: 0, justifyContent: 'center' },
  hudValue: { color: GAME_COLORS.ink, fontSize: 17, lineHeight: 20, fontWeight: '900', letterSpacing: -0.2 },
  hudLabel: { color: GAME_COLORS.text, fontSize: 8, lineHeight: 10, fontWeight: '800' },
  worldSpace: { flex: 1 },
  buildTray: {
    marginBottom: 6,
    paddingHorizontal: 11,
    paddingTop: 7,
    paddingBottom: 11,
    borderRadius: GAME_RADII.panel,
    backgroundColor: 'rgba(255, 249, 239, 0.98)',
    borderWidth: 1.5,
    borderColor: GAME_COLORS.border,
    ...GAME_SHADOWS.raised,
  },
  trayHandle: {
    alignSelf: 'center',
    width: 28,
    height: 3,
    marginBottom: 7,
    borderRadius: 2,
    backgroundColor: GAME_COLORS.borderStrong,
  },
  buildTrayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  buildTrayTitle: { color: GAME_COLORS.ink, fontSize: 18, fontWeight: '900' },
  buildTraySubtitle: { color: GAME_COLORS.muted, fontSize: 10, marginTop: 2 },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: GAME_RADII.control,
    backgroundColor: GAME_COLORS.red,
    borderWidth: 2,
    borderColor: '#FF9B99',
    ...GAME_SHADOWS.soft,
  },
  buildCategories: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  buildCategory: {
    width: 44,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: GAME_RADII.control,
    backgroundColor: GAME_COLORS.card,
    borderWidth: 1.5,
    borderColor: GAME_COLORS.border,
    opacity: 0.9,
  },
  buildCategoryActive: {
    backgroundColor: GAME_COLORS.primary,
    borderColor: '#8CDAFA',
    opacity: 1,
  },
  buildList: { gap: 7, paddingRight: 8 },
  buildCard: {
    width: 128,
    minHeight: 126,
    padding: 7,
    borderRadius: GAME_RADII.card,
    backgroundColor: GAME_COLORS.card,
    borderWidth: 1.5,
    borderColor: '#B7DCB0',
    ...GAME_SHADOWS.soft,
  },
  buildCardPressed: { borderColor: GAME_COLORS.primary, backgroundColor: GAME_COLORS.primarySoft, transform: [{ scale: 0.97 }, { translateY: 1 }] },
  buildCardDisabled: { opacity: 0.58, backgroundColor: '#EAE5EC', borderColor: '#CFC5DD' },
  buildCardVisual: {
    height: 77,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F0EBE2',
    borderWidth: 1,
    borderColor: GAME_COLORS.border,
  },
  buildCardThumbnail: { width: '100%', height: '100%' },
  buildCardKind: { position: 'absolute', top: 4, left: 5, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 5, overflow: 'hidden', color: '#FFFFFF', backgroundColor: GAME_COLORS.primaryDark, fontSize: 4.5, fontWeight: '900', letterSpacing: 0.7 },
  buildCardLock: { position: 'absolute', top: 5, right: 5, width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: GAME_COLORS.purple },
  buildCardName: { color: GAME_COLORS.ink, fontSize: 10, fontWeight: '900', marginTop: 6 },
  buildCardMetaRow: { flexDirection: 'row', gap: 3, marginTop: 4 },
  buildCardMetaPill: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 7, backgroundColor: GAME_COLORS.cardSoft, borderWidth: 1, borderColor: GAME_COLORS.border },
  buildCardMeta: { color: GAME_COLORS.text, fontSize: 8, fontWeight: '800' },
  placementToolbar: {
    minHeight: 150,
    marginBottom: 8,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: GAME_RADII.panel,
    backgroundColor: 'rgba(255, 249, 239, 0.98)',
    borderWidth: 1.5,
    borderColor: GAME_COLORS.border,
    ...GAME_SHADOWS.raised,
  },
  placementTop: { flexDirection: 'row', alignItems: 'center' },
  placementThumbnail: { width: 72, height: 72, overflow: 'hidden', borderRadius: GAME_RADII.card, backgroundColor: '#F1EAE0', borderWidth: 1, borderColor: GAME_COLORS.border },
  placementImage: { width: '100%', height: '100%' },
  placementInfo: { flex: 1, minWidth: 0, marginLeft: 10 },
  placementEyebrow: { color: GAME_COLORS.primaryDark, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  placementTitle: { color: GAME_COLORS.ink, fontSize: 18, fontWeight: '900', marginTop: 2 },
  placementMeta: { color: GAME_COLORS.text, fontSize: 11, fontWeight: '800', marginTop: 2 },
  placementHint: { color: GAME_COLORS.muted, fontSize: 8, marginTop: 3 },
  placementHintInvalid: { color: GAME_COLORS.redDark },
  placementCost: { minWidth: 65, height: 35, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 7, borderRadius: 11, backgroundColor: GAME_COLORS.goldSoft, borderWidth: 1, borderColor: '#E9CC79' },
  placementCostText: { color: GAME_COLORS.ink, fontSize: 13, fontWeight: '900' },
  placementActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', marginTop: 9 },
  placementAction: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 18, borderWidth: 2.5, ...GAME_SHADOWS.soft },
  cancelToolButton: { backgroundColor: GAME_COLORS.red, borderColor: '#FF9E9B' },
  rotateToolButton: { backgroundColor: GAME_COLORS.primary, borderColor: '#91DFFF' },
  confirmButton: { backgroundColor: GAME_COLORS.green, borderColor: '#B9EA92' },
  editCancelButton: { backgroundColor: '#8B98A2', borderColor: '#C9D1D5' },
  editLabels: { flexDirection: 'row', justifyContent: 'space-evenly', marginTop: 5 },
  editLabel: { width: 56, textAlign: 'center', color: GAME_COLORS.text, fontSize: 10, fontWeight: '800' },
  confirmButtonDisabled: { backgroundColor: '#A9B6AE', borderColor: '#CDD6CF', opacity: 0.68 },
  actionPressed: { transform: [{ scale: 0.96 }, { translateY: 2 }], opacity: 0.88, elevation: 1 },
});
