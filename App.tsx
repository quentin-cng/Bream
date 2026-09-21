import { useState } from 'react';
import {
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

import { IslandScene } from './src/island/IslandScene';
import {
  OBJECT_DEFINITIONS,
  getObjectsByCategory,
  type PlaceableType,
} from './src/island/objectCatalog';
import {
  findFirstValidPlacement,
  movePlacementToCell,
  validatePlacement,
  type BuildingDraft,
  type BuildingPlacement,
} from './src/island/placementGrid';
import { GameIcon, type GameIconName } from './src/ui/GameIcon';
import { GameNav, type MainTab } from './src/ui/GameNav';
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
        <GameIcon name={icon} size={20} color={accent} strokeWidth={2.4} />
      </View>
      <View style={styles.hudCopy}>
        <Text style={styles.hudValue}>{value}</Text>
        <Text style={styles.hudLabel}>{label}</Text>
      </View>
    </View>
  );
}

function IslandHud() {
  return (
    <View style={styles.islandHud}>
      <HudPill icon="steps" value="3 240" label="PAS" accent="#76E0EE" tone="steps" />
      <HudPill icon="streak" value="7" label="JOURS" accent="#FF9B68" tone="streak" />
      <HudPill icon="energy" value="240" label="ÉNERGIE" accent="#FFD75A" tone="energy" />
    </View>
  );
}

function PlacementToolbar({
  editing,
  preview,
  valid,
  colliding,
  onCancel,
  onRotate,
  onConfirm,
}: {
  editing: boolean;
  preview: BuildingDraft | null;
  valid: boolean;
  colliding: boolean;
  onCancel: () => void;
  onRotate: () => void;
  onConfirm: () => void;
}) {
  const name = preview ? OBJECT_DEFINITIONS[preview.type].name : 'Objet';
  return (
    <View style={styles.placementToolbar}>
      <View style={styles.placementInfo}>
        <Text style={styles.placementEyebrow}>{editing ? 'MODIFIER' : 'PLACER'}</Text>
        <Text numberOfLines={1} style={styles.placementTitle}>
          {name} · {(preview?.rotationQuarterTurns ?? 0) * 90}°
        </Text>
        <Text style={[styles.placementHint, !valid && styles.placementHintInvalid]}>
          {valid ? 'Choisis une zone puis confirme' : colliding ? 'Zone déjà occupée' : 'Hors de la zone constructible'}
        </Text>
      </View>
      <View style={styles.placementActions}>
        <Pressable accessibilityRole="button" onPress={onCancel} style={[styles.toolButton, styles.cancelToolButton]}>
          <GameIcon name="cancel" size={13} color="#FFB0A8" />
          <Text style={[styles.toolButtonText, styles.cancelToolText]}>Annuler</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onRotate} style={styles.toolButton}>
          <GameIcon name="rotate" size={13} color="#B8C9D7" />
          <Text style={styles.toolButtonText}>90°</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !valid }}
          disabled={!valid}
          onPress={onConfirm}
          style={[styles.confirmButton, !valid && styles.confirmButtonDisabled]}
        >
          <GameIcon name="confirm" size={13} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.confirmButtonText}>Valider</Text>
        </Pressable>
      </View>
    </View>
  );
}

function BuildCatalogTray({ canPlace, onSelect, onClose }: {
  canPlace: (type: PlaceableType) => boolean;
  onSelect: (type: PlaceableType) => void;
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
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
          <GameIcon name="cancel" size={16} color="#FFAAA2" />
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
              size={16}
              color={active ? '#15354B' : '#91A8B9'}
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
          const available = canPlace(type);
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
                {!available ? (
                  <View style={styles.buildCardLock}>
                    <GameIcon name="lock" size={12} color="#B8C5CE" />
                  </View>
                ) : null}
              </View>
              <Text numberOfLines={1} style={styles.buildCardName}>{definition.name}</Text>
              <View style={styles.buildCardMetaRow}>
                <View style={styles.buildCardMetaPill}>
                  <GameIcon name="footprint" size={8} color="#91AFC2" />
                  <Text style={styles.buildCardMeta}>{definition.footprint.width}×{definition.footprint.height}</Text>
                </View>
                <View style={styles.buildCardMetaPill}>
                  <GameIcon name="energy" size={8} color="#E8C96E" />
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
  const [activeTab, setActiveTab] = useState<MainTab>('island');
  const [buildCatalogOpen, setBuildCatalogOpen] = useState(true);
  const [placementMode, setPlacementMode] = useState(false);
  const [placementFromCatalog, setPlacementFromCatalog] = useState(false);
  const [placedBuildings, setPlacedBuildings] = useState<BuildingPlacement[]>([]);
  const [previewBuilding, setPreviewBuilding] = useState<BuildingDraft | null>(null);
  const [editingBuildingId, setEditingBuildingId] = useState<string | null>(null);

  const previewValidity = previewBuilding
    ? validatePlacement(previewBuilding, placedBuildings, editingBuildingId)
    : null;

  const closePlacement = (returnToCatalog = false) => {
    setPlacementMode(false);
    setPreviewBuilding(null);
    setEditingBuildingId(null);
    setPlacementFromCatalog(false);
    setBuildCatalogOpen(returnToCatalog);
  };

  const selectTab = (tab: MainTab) => {
    if (tab !== 'island') {
      if (placementMode) closePlacement(false);
      setBuildCatalogOpen(false);
    }
    setActiveTab(tab);
  };

  const startObjectPlacement = (type: PlaceableType) => {
    const initialPlacement = findFirstValidPlacement(type, placedBuildings);
    if (!initialPlacement) return;
    setBuildCatalogOpen(false);
    setPreviewBuilding(initialPlacement);
    setEditingBuildingId(null);
    setPlacementFromCatalog(true);
    setPlacementMode(true);
    setActiveTab('island');
  };

  const editBuilding = (buildingId: string) => {
    const building = placedBuildings.find((candidate) => candidate.id === buildingId);
    if (!building) return;
    setPreviewBuilding({
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

  const rotatePreview = () => {
    setPreviewBuilding((current) => current ? {
      ...current,
      rotationQuarterTurns: (current.rotationQuarterTurns + 1) % 4,
    } : current);
  };

  const confirmPlacement = () => {
    if (!previewBuilding || !previewValidity?.valid) return;
    if (editingBuildingId) {
      setPlacedBuildings((current) => current.map((building) => (
        building.id === editingBuildingId ? { ...building, ...previewBuilding } : building
      )));
    } else {
      setPlacedBuildings((current) => [
        ...current,
        { ...previewBuilding, id: `${previewBuilding.type}-${current.length + 1}` },
      ]);
    }
    closePlacement(placementFromCatalog);
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <IslandScene
        placementMode={placementMode}
        placedBuildings={placedBuildings}
        previewBuilding={previewBuilding}
        editingBuildingId={editingBuildingId}
        onPreviewCell={(cell) => setPreviewBuilding((current) => (
          current ? movePlacementToCell(current, cell) : current
        ))}
        onEditBuilding={editBuilding}
      />

      {activeTab !== 'island' ? <View pointerEvents="none" style={styles.worldVeil} /> : null}
      <View pointerEvents="none" style={styles.edgeShade} />
      <View pointerEvents="none" style={styles.bottomNavBackdrop} />

      <SafeAreaView pointerEvents="box-none" style={styles.safeArea}>
        <View style={styles.content}>
          {activeTab === 'island' ? <IslandHud /> : null}
          {activeTab === 'collection' ? (
            <CollectionScreen onBuild={startObjectPlacement} />
          ) : null}
          {activeTab === 'shop' ? <ShopScreen /> : null}
          {activeTab === 'friends' ? <FriendsScreen /> : null}
          {activeTab === 'profile' ? <ProfileScreen /> : null}
          {activeTab === 'island' ? <View style={styles.worldSpace} /> : null}

          {activeTab === 'island' && buildCatalogOpen ? (
            <BuildCatalogTray
              canPlace={(type) => Boolean(findFirstValidPlacement(type, placedBuildings))}
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
              onCancel={() => closePlacement(placementFromCatalog)}
              onRotate={rotatePreview}
              onConfirm={confirmPlacement}
            />
          ) : null}
        </View>

        <GameNav activeTab={activeTab} onSelect={selectTab} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#92BEE3' },
  worldVeil: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(8, 25, 45, 0.73)' },
  edgeShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(8, 25, 45, 0.06)' },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingBottom: 0,
  },
  content: { flex: 1, paddingHorizontal: 12 },
  bottomNavBackdrop: { position: 'absolute', left: 0, right: 0, bottom: 0, height: Platform.OS === 'ios' ? 38 : 8, backgroundColor: '#0D2232' },
  islandHud: { width: '100%', flexDirection: 'row', alignSelf: 'center', gap: 7, marginTop: 8 },
  hudPill: {
    flex: 1,
    minWidth: 0,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    borderRadius: 16,
    borderWidth: 1.5,
    shadowColor: '#0A1E34',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.28,
    shadowRadius: 9,
    elevation: 5,
  },
  hudPillSteps: { backgroundColor: 'rgba(16, 61, 78, 0.94)', borderColor: 'rgba(102, 218, 235, 0.5)' },
  hudPillStreak: { backgroundColor: 'rgba(83, 47, 43, 0.94)', borderColor: 'rgba(255, 138, 95, 0.5)' },
  hudPillEnergy: { backgroundColor: 'rgba(78, 64, 30, 0.95)', borderColor: 'rgba(255, 211, 77, 0.52)' },
  hudIcon: { width: 31, height: 31, alignItems: 'center', justifyContent: 'center', borderRadius: 11, borderWidth: 1 },
  hudIconSteps: { backgroundColor: 'rgba(80, 208, 226, 0.14)', borderColor: 'rgba(109, 226, 239, 0.24)' },
  hudIconStreak: { backgroundColor: 'rgba(255, 116, 75, 0.15)', borderColor: 'rgba(255, 145, 100, 0.25)' },
  hudIconEnergy: { backgroundColor: 'rgba(255, 205, 62, 0.14)', borderColor: 'rgba(255, 221, 103, 0.25)' },
  hudCopy: { marginLeft: 6, minWidth: 0 },
  hudValue: { color: '#FFFFFF', fontSize: 14, lineHeight: 15, fontWeight: '900', letterSpacing: 0.1 },
  hudLabel: { color: 'rgba(237, 246, 252, 0.68)', fontSize: 5.5, lineHeight: 8, fontWeight: '800', letterSpacing: 0.55 },
  worldSpace: { flex: 1 },
  buildTray: {
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(17, 36, 50, 0.97)',
    borderWidth: 1,
    borderColor: 'rgba(103, 190, 229, 0.28)',
    shadowColor: '#071522',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 7,
  },
  trayHandle: {
    alignSelf: 'center',
    width: 28,
    height: 3,
    marginBottom: 7,
    borderRadius: 2,
    backgroundColor: 'rgba(175, 204, 225, 0.32)',
  },
  buildTrayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  buildTrayTitle: { color: '#F4F8FC', fontSize: 14, fontWeight: '800' },
  buildTraySubtitle: { color: '#9CB2C4', fontSize: 7, marginTop: 1 },
  closeButton: {
    width: 27,
    height: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: 'rgba(121, 49, 50, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 130, 121, 0.24)',
  },
  buildCategories: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  buildCategory: {
    width: 36,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#293E4F',
    borderWidth: 1,
    borderColor: 'rgba(169, 201, 225, 0.12)',
    opacity: 0.72,
  },
  buildCategoryActive: {
    backgroundColor: '#76D4F2',
    borderColor: '#C6F0FF',
    opacity: 1,
  },
  buildList: { gap: 7, paddingRight: 8 },
  buildCard: {
    width: 118,
    minHeight: 92,
    padding: 6,
    borderRadius: 13,
    backgroundColor: '#294458',
    borderWidth: 1.5,
    borderColor: 'rgba(91, 190, 133, 0.48)',
    shadowColor: '#071522',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.24,
    shadowRadius: 6,
    elevation: 3,
  },
  buildCardPressed: { borderColor: '#8BE1FF', backgroundColor: '#365B70', transform: [{ scale: 0.97 }, { translateY: 1 }] },
  buildCardDisabled: { opacity: 0.56, backgroundColor: '#302D48', borderColor: 'rgba(157, 116, 218, 0.46)' },
  buildCardVisual: {
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#17191D',
    borderWidth: 1,
    borderColor: 'rgba(183, 218, 238, 0.08)',
  },
  buildCardThumbnail: { width: '100%', height: '100%' },
  buildCardKind: { position: 'absolute', top: 4, left: 5, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 5, overflow: 'hidden', color: '#B8ECF7', backgroundColor: 'rgba(12, 39, 51, 0.76)', fontSize: 4.5, fontWeight: '900', letterSpacing: 0.7 },
  buildCardLock: { position: 'absolute', top: 5, right: 5, width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: 'rgba(10, 25, 35, 0.72)' },
  buildCardName: { color: '#F2F7FB', fontSize: 7.5, fontWeight: '800', marginTop: 6 },
  buildCardMetaRow: { flexDirection: 'row', gap: 3, marginTop: 4 },
  buildCardMetaPill: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(8, 25, 36, 0.48)', borderWidth: 1, borderColor: 'rgba(163, 200, 222, 0.08)' },
  buildCardMeta: { color: '#A7BBC9', fontSize: 5.5, fontWeight: '700' },
  placementToolbar: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: 'rgba(13, 34, 58, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(173, 207, 235, 0.24)',
    shadowColor: '#07182B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 6,
  },
  placementInfo: { flex: 1, minWidth: 0, paddingRight: 6 },
  placementEyebrow: { color: '#73B8DB', fontSize: 7, fontWeight: '800', letterSpacing: 1.2 },
  placementTitle: { color: '#FFFFFF', fontSize: 10, fontWeight: '800', marginTop: 2 },
  placementHint: { color: '#91A9BF', fontSize: 7, marginTop: 2 },
  placementHintInvalid: { color: '#F1AAA5' },
  placementActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  toolButton: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 9, borderRadius: 11, backgroundColor: 'rgba(67, 128, 166, 0.34)', borderWidth: 1, borderColor: 'rgba(126, 193, 228, 0.2)' },
  cancelToolButton: { backgroundColor: 'rgba(131, 50, 51, 0.4)', borderColor: 'rgba(255, 126, 116, 0.25)' },
  toolButtonText: { color: '#B3C6D8', fontSize: 7, fontWeight: '800' },
  cancelToolText: { color: '#FFB0A8' },
  confirmButton: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 11, backgroundColor: '#4FC36A', borderWidth: 1, borderColor: '#8FE3A0', shadowColor: '#102719', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.28, shadowRadius: 4, elevation: 3 },
  confirmButtonDisabled: { backgroundColor: '#344E68', opacity: 0.7 },
  confirmButtonText: { color: '#FFFFFF', fontSize: 7, fontWeight: '800' },
});
