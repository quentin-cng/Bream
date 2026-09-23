import { useState, type ReactNode } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  getObjectsByCategory,
  type BuildableType,
} from '../island/objectCatalog';
import {
  canUnlock,
  getXpForNextLevel,
  LEVEL_THRESHOLDS,
  type PlayerState,
} from '../progression/playerProgression';
import type { StepSourceStatus } from '../health/stepSource';
import { ENERGY_PACKS } from '../shop/energyPackCatalog';
import { GameIcon, type GameIconName } from './GameIcon';
import { GAME_COLORS, GAME_RADII, GAME_SHADOWS } from './gameTheme';

function ScreenHeader({ eyebrow, title, subtitle, trailing }: {
  eyebrow: string;
  title: string;
  subtitle: string;
  trailing?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      {trailing}
    </View>
  );
}

function ScreenScroll({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

type CollectionCategory = 'all' | 'buildings' | 'nature' | 'decor' | 'special';

const COLLECTION_CATEGORIES: ReadonlyArray<{ id: CollectionCategory; label: string }> = [
  { id: 'all', label: 'Tout' },
  { id: 'buildings', label: 'Bâtiments' },
  { id: 'nature', label: 'Nature' },
  { id: 'decor', label: 'Déco' },
  { id: 'special', label: 'Spécial' },
];

type CollectionItem = {
  id: string;
  name: string;
  category: Exclude<CollectionCategory, 'all'>;
  level: number;
  cost: number;
  icon: GameIconName;
  thumbnail?: number;
  description: string;
  footprint?: string;
  placeableType?: BuildableType;
  locked?: boolean;
  comingSoon?: boolean;
};

const BUILDING_DESCRIPTIONS: Record<BuildableType, string> = {
  house1: 'Une maison bleue fantastique avec une petite tour.',
  house2: 'Une maison de ville élancée qui donne du relief au village.',
  house3: 'Un cottage rustique et chaleureux pour un coin calme.',
};

const BUILDABLE_COLLECTION_ITEMS: CollectionItem[] = getObjectsByCategory('buildings').map(
  ([type, definition]) => ({
    id: type,
    name: definition.name,
    category: 'buildings',
    level: definition.unlockLevel,
    cost: definition.cost,
    icon: type === 'house2' ? 'building' : 'house',
    thumbnail: definition.thumbnail,
    description: BUILDING_DESCRIPTIONS[type],
    footprint: `${definition.footprint.width}×${definition.footprint.height}`,
    placeableType: type,
  }),
);

const FUTURE_COLLECTION_ITEMS: CollectionItem[] = [
  { id: 'tree', name: 'Arbre rond', category: 'nature', level: 2, cost: 120, icon: 'nature', description: 'Une future touche de verdure pour les espaces naturels.', locked: true },
  { id: 'garden', name: 'Petit jardin', category: 'nature', level: 3, cost: 240, icon: 'nature', description: 'Un jardin fleuri qui arrivera dans une prochaine collection.', locked: true },
  { id: 'bench', name: 'Banc cozy', category: 'decor', level: 2, cost: 180, icon: 'decor', description: 'Une future décoration pour créer des coins de repos.', locked: true },
  { id: 'fountain', name: 'Fontaine', category: 'decor', level: 4, cost: 640, icon: 'decor', description: 'Une pièce décorative rare prévue pour une future version.', locked: true },
  { id: 'moon', name: 'Lune calme', category: 'special', level: 1, cost: 400, icon: 'special', description: 'Un objet spécial encore en préparation.', comingSoon: true },
  { id: 'pet', name: 'Petit ami', category: 'special', level: 1, cost: 450, icon: 'special', description: 'Un futur compagnon pour rendre l’île plus vivante.', comingSoon: true },
];

const COLLECTION_ITEMS: CollectionItem[] = [
  ...BUILDABLE_COLLECTION_ITEMS,
  ...FUTURE_COLLECTION_ITEMS,
];

export function CollectionScreen({ playerLevel, onBuild }: {
  playerLevel: number;
  onBuild: (type: BuildableType) => void;
}) {
  const [category, setCategory] = useState<CollectionCategory>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const items = COLLECTION_ITEMS.filter((item) => category === 'all' || item.category === category);
  const selectedItem = COLLECTION_ITEMS.find((item) => item.id === selectedId);
  const selectedLocked = selectedItem
    ? Boolean(selectedItem.locked) || !canUnlock(selectedItem.level, playerLevel)
    : false;

  const selectCategory = (nextCategory: CollectionCategory) => {
    setCategory(nextCategory);
    setSelectedId(null);
  };
  return (
    <View style={styles.collectionScreen}>
      <ScreenScroll>
      <View style={styles.collectionHeader}>
        <Text style={styles.collectionTitle}>Collection</Text>
        <View style={styles.playerLevelBadge} accessibilityLabel={`Niveau actuel ${playerLevel}`}>
          <Text style={styles.playerLevelBadgeText}>NIV. {playerLevel}</Text>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
      >
        {COLLECTION_CATEGORIES.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityState={{ selected: category === item.id }}
            onPress={() => selectCategory(item.id)}
            style={({ pressed }) => [
              styles.categoryChip,
              category === item.id && styles.categoryChipActive,
              pressed && styles.categoryChipPressed,
            ]}
          >
            <Text style={[styles.categoryText, category === item.id && styles.categoryTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.collectionGrid}>
        {items.map((item) => {
          const locked = Boolean(item.locked) || !canUnlock(item.level, playerLevel);
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedId === item.id }}
              onPress={() => setSelectedId(item.id)}
              style={({ pressed }) => [
                styles.objectCard,
                !locked && !item.comingSoon && styles.objectCardOwned,
                locked && styles.objectCardLocked,
                selectedId === item.id && styles.objectCardSelected,
                pressed && styles.objectCardPressed,
              ]}
            >
              <View style={[styles.objectVisual, locked && styles.objectVisualLocked]}>
                <View style={[styles.objectIconWrap, locked && styles.objectIconWrapLocked]}>
                  {item.thumbnail ? (
                    <Image source={item.thumbnail} resizeMode="contain" style={styles.objectThumbnail} />
                  ) : (
                    <GameIcon
                      name={item.icon}
                      size={28}
                      color={locked ? '#85818A' : GAME_COLORS.primaryDark}
                      strokeWidth={1.8}
                    />
                  )}
                </View>
                {locked ? (
                  <View style={styles.lockOverlay}>
                    <GameIcon name="lock" size={17} />
                  </View>
                ) : null}
                {item.comingSoon ? (
                  <View style={styles.cardBadge}><Text style={styles.cardBadgeText}>SOON</Text></View>
                ) : null}
              </View>
              <Text numberOfLines={1} style={styles.objectName}>{item.name}</Text>
              <Text style={styles.objectLevel}>{locked ? `Niveau ${item.level} requis` : `Niv. ${item.level}`}</Text>
              {locked ? (
                <View style={styles.levelRequirement}>
                  <GameIcon name="lock" size={8} color="#C9A6FF" />
                  <Text style={[styles.objectMeta, styles.lockedMeta]}>Verrouillé</Text>
                </View>
              ) : item.comingSoon ? (
                <Text style={[styles.objectMeta, styles.specialMeta]}>Coming Soon</Text>
              ) : (
                <View style={styles.costBadge}>
                  <GameIcon name="energy" size={8} color="#D99412" />
                  <Text style={styles.costBadgeText}>{item.cost}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      </ScreenScroll>
      {selectedItem ? (
        <View style={[styles.collectionDetail, (selectedLocked || selectedItem.comingSoon) && styles.collectionDetailLocked]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Fermer les détails" onPress={() => setSelectedId(null)} style={styles.collectionDetailClose}>
            <GameIcon name="cancel" size={18} color={GAME_COLORS.text} />
          </Pressable>
          <View style={styles.collectionDetailTop}>
            <View style={styles.collectionDetailIcon}>
              {selectedItem.thumbnail ? <Image source={selectedItem.thumbnail} resizeMode="contain" style={styles.collectionDetailImage} /> : (
                <GameIcon name={selectedItem.icon} size={32} color={selectedLocked || selectedItem.comingSoon ? GAME_COLORS.purple : GAME_COLORS.primaryDark} />
              )}
            </View>
            <View style={styles.collectionDetailCopy}>
              <Text style={styles.collectionDetailEyebrow}>{selectedLocked ? `NIVEAU ${selectedItem.level} REQUIS` : selectedItem.comingSoon ? 'COMING SOON' : 'PRÊT À CONSTRUIRE'}</Text>
              <Text style={styles.collectionDetailTitle}>{selectedItem.name}</Text>
              <Text numberOfLines={2} style={styles.collectionDetailText}>{selectedItem.description}</Text>
              <View style={styles.collectionDetailMeta}>
                {selectedItem.footprint ? <View style={styles.detailMetaPill}><GameIcon name="footprint" size={13} color={GAME_COLORS.primaryDark} /><Text style={styles.detailMetaText}>{selectedItem.footprint}</Text></View> : null}
                <View style={styles.detailMetaPill}><GameIcon name="energy" size={13} color="#D99412" /><Text style={styles.detailMetaText}>{selectedItem.cost}</Text></View>
              </View>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: selectedLocked || !selectedItem.placeableType }}
            disabled={selectedLocked || !selectedItem.placeableType}
            onPress={() => selectedItem.placeableType && !selectedLocked && onBuild(selectedItem.placeableType)}
            style={({ pressed }) => [styles.detailBuildButton, (selectedLocked || !selectedItem.placeableType) && styles.detailBuildButtonDisabled, pressed && styles.primaryButtonPressed]}
          >
            <GameIcon name={selectedItem.placeableType && !selectedLocked ? 'building' : 'lock'} size={21} color="#FFFFFF" />
            <Text style={styles.detailBuildButtonText}>{selectedLocked ? `Niveau ${selectedItem.level} requis` : selectedItem.placeableType ? 'Construire cet objet' : selectedItem.comingSoon ? 'Bientôt' : 'Verrouillé'}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export function ShopScreen({ energy }: { energy: number }) {
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const selectedPack = ENERGY_PACKS.find((pack) => pack.id === selectedPackId);
  return (
    <ScreenScroll>
      <ScreenHeader
        eyebrow="NOUVEAUTÉS"
        title="Shop"
        subtitle="Des ambiances et objets cosmétiques pour personnaliser ton monde."
        trailing={<CurrencyBadge energy={energy} />}
      />
      <View style={styles.featuredCard}>
        <View style={styles.featuredOrb}>
          <GameIcon name="special" size={46} color={GAME_COLORS.purple} strokeWidth={1.7} />
        </View>
        <Text style={styles.featuredEyebrow}>COLLECTION À VENIR</Text>
        <Text style={styles.featuredTitle}>Ciel d’aurore</Text>
        <Text style={styles.featuredText}>Une lumière douce et de nouvelles décorations célestes.</Text>
        <View style={styles.soonPill}><Text style={styles.soonPillText}>COMING SOON</Text></View>
      </View>
      <Text style={styles.sectionTitle}>Énergie</Text>
      <Text style={styles.energyPackIntro}>Des packs pour ton monde, bientôt disponibles. Aucun achat n’est possible actuellement.</Text>
      <View style={styles.energyPackList}>
        {ENERGY_PACKS.map((pack) => (
          <Pressable
            key={pack.id}
            accessibilityRole="button"
            accessibilityLabel={`${pack.name}, ${pack.amount} Énergie, bientôt disponible`}
            accessibilityHint="Affiche un aperçu sans effectuer d’achat"
            onPress={() => setSelectedPackId(pack.id)}
            style={({ pressed }) => [
              styles.energyPackCard,
              !pack.enabled && styles.energyPackUnavailable,
              selectedPackId === pack.id && styles.energyPackSelected,
              pressed && styles.primaryButtonPressed,
            ]}
          >
            <View style={styles.energyPackIcon}><GameIcon name={pack.icon} size={26} color="#D99412" strokeWidth={2.4} /></View>
            <View style={styles.energyPackCopy}>
              <Text style={styles.energyPackName}>{pack.name}</Text>
              <Text style={styles.energyPackAmount}>+{String(pack.amount).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} Énergie</Text>
            </View>
            <View style={styles.energyPackRight}>
              <Text style={styles.energyPackSoon}>BIENTÔT</Text>
              <Text style={styles.energyPackPrice}>{pack.displayPrice}</Text>
            </View>
          </Pressable>
        ))}
      </View>
      {selectedPack ? (
        <View accessibilityLiveRegion="polite" style={styles.energyPackMessage}>
          <Text style={styles.energyPackMessageText}>{selectedPack.name} : bientôt disponible. Aucun achat ni crédit d’Énergie effectué.</Text>
        </View>
      ) : null}
      <Text style={styles.sectionTitle}>À découvrir</Text>
      <View style={styles.shopGrid}>
        {[
          { icon: 'nature', name: 'Jardin secret', cost: 180, tone: 'green' },
          { icon: 'special', name: 'Nuit étoilée', cost: 320, tone: 'purple' },
          { icon: 'collection', name: 'Trésors rares', cost: 500, tone: 'gold' },
          { icon: 'house', name: 'Toits pastel', cost: 240, tone: 'blue' },
          { icon: 'special', name: 'Étoiles douces', cost: 360, tone: 'purple' },
          { icon: 'building', name: 'Tours célestes', cost: 420, tone: 'blue' },
        ].map(({ icon, name, cost, tone }) => (
          <View key={name} style={styles.shopCard}>
            <View style={[
              styles.shopVisual,
              tone === 'green' && styles.shopVisualGreen,
              tone === 'purple' && styles.shopVisualPurple,
              tone === 'gold' && styles.shopVisualGold,
            ]}>
              <View style={styles.shopSoonBadge}><Text style={styles.shopSoonText}>BIENTÔT</Text></View>
              <GameIcon name={icon as GameIconName} size={27} color={GAME_COLORS.primaryDark} strokeWidth={1.9} />
            </View>
            <Text style={styles.shopName}>{name}</Text>
            <View style={styles.shopMetaRow}>
              <Text style={styles.shopMeta}>Aperçu</Text>
              <View style={styles.shopCostBadge}>
                <GameIcon name="energy" size={7} color="#D99412" />
                <Text style={styles.shopCostText}>{cost}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScreenScroll>
  );
}

function CurrencyBadge({ energy }: { energy: number }) {
  return (
    <View style={styles.currencyBadge}>
      <GameIcon name="energy" size={14} color="#D99412" />
      <Text style={styles.currencyValue}>{energy}</Text>
    </View>
  );
}

export function FriendsScreen() {
  return (
    <View style={styles.centeredScreen}>
      <View style={styles.comingSoonIcon}>
        <GameIcon name="friends" size={42} color={GAME_COLORS.primary} />
      </View>
      <Text style={styles.comingSoonEyebrow}>BIENTÔT</Text>
      <Text style={styles.comingSoonTitle}>Explorez ensemble</Text>
      <Text style={styles.comingSoonText}>
        Visite les îles de tes amis et partage ton monde lorsqu’il sera prêt.
      </Text>
      <View style={styles.soonPill}><Text style={styles.soonPillText}>COMING SOON</Text></View>
    </View>
  );
}

function ProfileRow({ icon, label, value }: {
  icon: GameIconName;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.profileRow}>
      <View style={styles.profileRowIcon}><GameIcon name={icon} size={17} color={GAME_COLORS.primaryDark} /></View>
      <Text style={styles.profileRowLabel}>{label}</Text>
      <Text style={styles.profileRowValue}>{value}</Text>
      <GameIcon name="arrow" size={18} color={GAME_COLORS.muted} />
    </View>
  );
}

export function ProfileScreen({ player, healthStatus, healthBusy, onConnectHealth, onAddMockSteps, onAddMockEnergy, onAddMockXp, onResetLocalSave }: {
  player: PlayerState;
  healthStatus: StepSourceStatus;
  healthBusy: boolean;
  onConnectHealth: () => void;
  onAddMockSteps: () => void;
  onAddMockEnergy: (amount: number) => void;
  onAddMockXp: () => void;
  onResetLocalSave: () => void;
}) {
  const nextLevelXp = getXpForNextLevel(player.xp);
  const currentLevelXp = LEVEL_THRESHOLDS[player.level - 1] ?? 0;
  const xpProgress = nextLevelXp === null
    ? 1
    : Math.min(1, Math.max(0, (player.xp - currentLevelXp) / (nextLevelXp - currentLevelXp)));
  const healthDescription: Record<StepSourceStatus, string> = {
    connected: 'Connecté · pas du jour synchronisés',
    'permission-required': 'Autorisation de lecture des pas requise',
    denied: 'Accès refusé · réessaie ou autorise Bream dans Health Connect',
    unavailable: 'Health Connect indisponible · installe-le ou mets-le à jour',
    'no-data': 'Connecté · aucun pas disponible aujourd’hui',
    mock: 'Données de démonstration',
    error: 'Synchronisation impossible · réessaie',
  };
  return (
    <ScreenScroll>
      <ScreenHeader eyebrow="TON ESPACE" title="Profil" subtitle="Tes préférences et ta progression en un coup d’œil." />
      <View style={styles.profileIdentity}>
        <View style={styles.profileAvatar}><Text style={styles.profileInitial}>A</Text></View>
        <View style={styles.profileIdentityCopy}>
          <Text style={styles.profileName}>Alex</Text>
          <Text style={styles.profileDetail}>Explorateur de l’île · {healthStatus === 'connected' || healthStatus === 'no-data' ? 'pas synchronisés' : 'progression locale'}</Text>
        </View>
      </View>
      <View style={styles.xpCard}>
        <View style={styles.xpCardTop}>
          <Text style={styles.xpCardHeading}>PROGRESSION</Text>
          <View style={styles.xpLevelBadge}>
            <Text style={styles.xpLevelBadgeText}>NIV. {player.level}</Text>
          </View>
        </View>
        <View style={styles.xpNumbers}>
          <Text style={styles.xpCurrent}>{player.xp} XP</Text>
          <Text style={styles.xpTarget}>{nextLevelXp === null ? 'Niveau maximum' : `Prochain niveau : ${nextLevelXp} XP`}</Text>
        </View>
        <View style={styles.xpTrack} accessibilityLabel={nextLevelXp === null ? 'Niveau maximum atteint' : `${player.xp - currentLevelXp} XP sur ${nextLevelXp - currentLevelXp} pour le prochain niveau`}>
          <View style={[styles.xpFill, { width: `${Math.round(xpProgress * 100)}%` }]} />
        </View>
        <Text style={styles.xpRemaining}>{nextLevelXp === null ? 'Tous les niveaux actuels sont débloqués' : `${nextLevelXp - player.xp} XP avant le niveau ${player.level + 1}`}</Text>
      </View>
      <View style={styles.statsGrid}>
        {[
          { value: String(player.steps), label: 'Pas du jour', icon: 'steps' as const, tone: 'cyan' },
          { value: '7', label: 'Jours de série', icon: 'streak' as const, tone: 'orange' },
          { value: String(player.energy), label: 'Énergie', icon: 'energy' as const, tone: 'gold' },
        ].map(({ value, label, icon, tone }) => (
          <View key={label} style={[
            styles.statCard,
            tone === 'cyan' && styles.statCardCyan,
            tone === 'orange' && styles.statCardOrange,
            tone === 'gold' && styles.statCardGold,
          ]}>
            <GameIcon
              name={icon}
              size={14}
              color={tone === 'cyan' ? '#76E0EE' : tone === 'orange' ? '#FF9B68' : '#FFD75A'}
            />
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>
      {Platform.OS === 'android' ? (
        <View style={styles.healthPanel}>
          <View style={styles.healthPanelCopy}>
            <Text style={styles.healthPanelTitle}>Pas · Health Connect</Text>
            <Text style={styles.healthPanelStatus}>{healthDescription[healthStatus]}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: healthBusy }}
            disabled={healthBusy}
            onPress={onConnectHealth}
            style={({ pressed }) => [styles.healthPanelButton, pressed && styles.primaryButtonPressed]}
          >
            <Text style={styles.healthPanelButtonText}>{healthBusy ? '...' : healthStatus === 'connected' || healthStatus === 'no-data' ? 'Actualiser' : 'Connecter'}</Text>
          </Pressable>
        </View>
      ) : null}
      <Text style={styles.sectionTitle}>Compte et préférences</Text>
      <View style={styles.profileList}>
        <ProfileRow icon="account" label="Compte" value="Local" />
        <ProfileRow icon="notifications" label="Notifications" value="Bientôt" />
        <ProfileRow icon="settings" label="Réglages" value="" />
        <ProfileRow icon="statistics" label="Statistiques" value="Aperçu" />
      </View>
      {__DEV__ ? (
        <View style={styles.debugProgression}>
          <Text style={styles.debugTitle}>TEST PROGRESSION · DÉVELOPPEMENT</Text>
          <View style={styles.debugActions}>
            {[
              ...(player.dailySteps.source === 'mock' ? [{ label: '+1 000 pas', action: onAddMockSteps }] : []),
              { label: '+500 Énergie', action: () => onAddMockEnergy(500) },
              { label: '+5 000 Énergie', action: () => onAddMockEnergy(5000) },
              { label: '+100 XP', action: onAddMockXp },
            ].map(({ label, action }) => (
              <Pressable key={label} accessibilityRole="button" onPress={action} style={styles.debugButton}>
                <Text style={styles.debugButtonText}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable accessibilityRole="button" onPress={onResetLocalSave} style={styles.debugResetButton}>
            <Text style={styles.debugResetText}>Réinitialiser la sauvegarde locale</Text>
          </Pressable>
        </View>
      ) : null}
    </ScreenScroll>
  );
}

const colors = {
  text: GAME_COLORS.ink,
  muted: GAME_COLORS.muted,
  accent: GAME_COLORS.primary,
};

const styles = StyleSheet.create({
  collectionScreen: { flex: 1 },
  collectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 14 },
  collectionTitle: { color: GAME_COLORS.ink, fontSize: 30, fontWeight: '900', letterSpacing: -0.9 },
  playerLevelBadge: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: GAME_RADII.control, backgroundColor: GAME_COLORS.primary, borderWidth: 2, borderColor: '#91DDFC', ...GAME_SHADOWS.soft },
  playerLevelBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 11, paddingBottom: 18 },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 13 },
  headerCopy: { flex: 1, paddingRight: 12 },
  eyebrow: { color: GAME_COLORS.primaryDark, fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 25, fontWeight: '800', letterSpacing: -0.8, marginTop: 2 },
  subtitle: { color: colors.muted, fontSize: 9, lineHeight: 14, marginTop: 3 },
  categoryRow: { gap: 5, paddingRight: 6, marginBottom: 17 },
  categoryChip: { minHeight: 39, justifyContent: 'center', paddingHorizontal: 12, borderRadius: GAME_RADII.control, backgroundColor: GAME_COLORS.card, borderWidth: 1.5, borderColor: GAME_COLORS.border, ...GAME_SHADOWS.soft },
  categoryChipActive: { backgroundColor: GAME_COLORS.primary, borderColor: '#8BDAFA' },
  categoryChipPressed: { transform: [{ scale: 0.96 }, { translateY: 2 }], opacity: 0.9 },
  categoryText: { color: GAME_COLORS.text, fontSize: 10, fontWeight: '800' },
  categoryTextActive: { color: '#FFFFFF' },
  collectionDetail: { position: 'absolute', left: 2, right: 2, bottom: 8, padding: 12, borderRadius: GAME_RADII.panel, backgroundColor: GAME_COLORS.cream, borderWidth: 1.5, borderColor: GAME_COLORS.border, ...GAME_SHADOWS.raised },
  collectionDetailLocked: { backgroundColor: '#F5F0FA', borderColor: '#C7B7E5' },
  collectionDetailTop: { flexDirection: 'row', alignItems: 'center', paddingRight: 25 },
  collectionDetailClose: { position: 'absolute', top: 9, right: 9, width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#E6DED3', zIndex: 2 },
  collectionDetailIcon: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: GAME_RADII.card, backgroundColor: '#F0E9DF', borderWidth: 1, borderColor: GAME_COLORS.border },
  collectionDetailImage: { width: '100%', height: '100%' },
  collectionDetailCopy: { flex: 1, minWidth: 0, marginLeft: 12 },
  collectionDetailEyebrow: { color: GAME_COLORS.greenDark, fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  collectionDetailTitle: { color: GAME_COLORS.ink, fontSize: 16, fontWeight: '900', marginTop: 2 },
  collectionDetailText: { color: GAME_COLORS.muted, fontSize: 9, lineHeight: 12, marginTop: 3 },
  collectionDetailMeta: { flexDirection: 'row', gap: 6, marginTop: 7 },
  detailMetaPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8, backgroundColor: GAME_COLORS.cardSoft },
  detailMetaText: { color: GAME_COLORS.text, fontSize: 10, fontWeight: '900' },
  detailBuildButton: { height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10, borderRadius: GAME_RADII.control, backgroundColor: GAME_COLORS.green, borderWidth: 2, borderColor: '#B9EA97', ...GAME_SHADOWS.soft },
  detailBuildButtonDisabled: { backgroundColor: GAME_COLORS.purple, borderColor: '#CFC0EE', opacity: 0.78 },
  detailBuildButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  collectionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  objectCard: { width: '31%', minHeight: 172, padding: 6, borderRadius: GAME_RADII.card, backgroundColor: GAME_COLORS.card, borderWidth: 1.5, borderColor: GAME_COLORS.border, ...GAME_SHADOWS.soft },
  objectCardOwned: { borderColor: '#A7D59F', backgroundColor: '#FFFDF8' },
  objectCardLocked: { opacity: 0.72, backgroundColor: '#E7E4E5', borderColor: '#C9C3C6' },
  objectCardSelected: { borderColor: GAME_COLORS.primary, backgroundColor: GAME_COLORS.primarySoft, transform: [{ translateY: -1 }] },
  objectCardPressed: { transform: [{ scale: 0.97 }], opacity: 0.92 },
  objectVisual: { height: 104, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: GAME_RADII.control, backgroundColor: '#E9F5F4', borderWidth: 1, borderColor: '#CFE6E4' },
  objectVisualLocked: { backgroundColor: '#DCDADC', borderColor: '#CAC5CA' },
  objectIconWrap: { width: '94%', height: '85%', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.28)' },
  objectIconWrapLocked: { opacity: 0.55, backgroundColor: 'rgba(255,255,255,0.18)' },
  objectThumbnail: { width: '100%', height: '100%' },
  lockOverlay: { position: 'absolute', width: 35, height: 35, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: GAME_COLORS.purple, borderWidth: 1, borderColor: '#CFC0ED' },
  cardBadge: { position: 'absolute', top: 5, right: 5, paddingHorizontal: 5, paddingVertical: 3, borderRadius: 6, backgroundColor: '#7654CD' },
  cardBadgeText: { color: '#FFFFFF', fontSize: 5, fontWeight: '900', letterSpacing: 0.6 },
  objectName: { color: colors.text, fontSize: 11, fontWeight: '900', textAlign: 'center', marginTop: 7 },
  objectLevel: { color: GAME_COLORS.muted, fontSize: 9, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  objectMeta: { color: colors.muted, fontSize: 8, marginTop: 3, fontWeight: '800' },
  lockedMeta: { color: '#C9A6FF' },
  specialMeta: { color: '#B99AF3' },
  levelRequirement: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  costBadge: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8, backgroundColor: GAME_COLORS.goldSoft, borderWidth: 1, borderColor: '#E9CF83' },
  costBadgeText: { color: '#7B5711', fontSize: 10, fontWeight: '900' },
  primaryButtonPressed: { transform: [{ scale: 0.985 }, { translateY: 2 }], shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  currencyBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 8, borderRadius: GAME_RADII.control, backgroundColor: GAME_COLORS.goldSoft, borderWidth: 1.5, borderColor: '#E7C966', ...GAME_SHADOWS.soft },
  currencyValue: { color: colors.text, fontSize: 12, fontWeight: '800' },
  featuredCard: { minHeight: 138, justifyContent: 'flex-end', overflow: 'hidden', padding: 14, borderRadius: GAME_RADII.panel, backgroundColor: '#EEE8FF', borderWidth: 1.5, borderColor: '#CDBFEB', ...GAME_SHADOWS.soft },
  featuredOrb: { position: 'absolute', top: -30, right: -4, width: 130, height: 130, alignItems: 'center', justifyContent: 'center', borderRadius: 65, backgroundColor: '#D9CDF6' },
  featuredEyebrow: { color: '#7655B7', fontSize: 8, fontWeight: '900', letterSpacing: 1.3 },
  featuredTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 3 },
  featuredText: { width: '62%', color: colors.muted, fontSize: 9, lineHeight: 14, marginTop: 4 },
  soonPill: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: GAME_COLORS.purple, borderWidth: 1, borderColor: '#CDBDEE' },
  soonPillText: { color: '#FFFFFF', fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  sectionTitle: { color: colors.text, fontSize: 13, fontWeight: '800', marginTop: 13, marginBottom: 7 },
  energyPackIntro: { color: GAME_COLORS.muted, fontSize: 9, lineHeight: 14, marginBottom: 8 },
  energyPackList: { gap: 8 },
  energyPackCard: { minHeight: 76, flexDirection: 'row', alignItems: 'center', padding: 9, borderRadius: GAME_RADII.card, backgroundColor: GAME_COLORS.card, borderWidth: 1.5, borderColor: '#E4CC87', ...GAME_SHADOWS.soft },
  energyPackUnavailable: { backgroundColor: '#FFFDF8' },
  energyPackSelected: { borderColor: GAME_COLORS.gold, backgroundColor: '#FFF6D9' },
  energyPackIcon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: GAME_RADII.control, backgroundColor: GAME_COLORS.goldSoft, borderWidth: 1.5, borderColor: '#E7C763' },
  energyPackCopy: { flex: 1, minWidth: 0, marginLeft: 10 },
  energyPackName: { color: GAME_COLORS.ink, fontSize: 11, fontWeight: '900' },
  energyPackAmount: { color: '#9B7015', fontSize: 12, fontWeight: '900', marginTop: 3 },
  energyPackRight: { alignItems: 'flex-end', marginLeft: 6 },
  energyPackSoon: { color: '#FFFFFF', fontSize: 7, fontWeight: '900', letterSpacing: 0.5, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, overflow: 'hidden', backgroundColor: GAME_COLORS.purple },
  energyPackPrice: { color: GAME_COLORS.muted, fontSize: 8, fontWeight: '700', marginTop: 5 },
  energyPackMessage: { marginTop: 8, padding: 9, borderRadius: 10, backgroundColor: GAME_COLORS.goldSoft, borderWidth: 1, borderColor: '#E6C86E' },
  energyPackMessageText: { color: '#71541B', fontSize: 9, lineHeight: 13, fontWeight: '700' },
  shopGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  shopCard: { width: '31.9%', padding: 6, borderRadius: GAME_RADII.card, backgroundColor: GAME_COLORS.card, borderWidth: 1.5, borderColor: GAME_COLORS.border, ...GAME_SHADOWS.soft },
  shopVisual: { height: 74, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: GAME_RADII.control, backgroundColor: GAME_COLORS.primarySoft, borderWidth: 1, borderColor: '#B6DFEF' },
  shopVisualGreen: { backgroundColor: '#E4F4DD', borderColor: '#BEDDB1' },
  shopVisualPurple: { backgroundColor: GAME_COLORS.purpleSoft, borderColor: '#CFC1EC' },
  shopVisualGold: { backgroundColor: GAME_COLORS.goldSoft, borderColor: '#E5CB7B' },
  shopSoonBadge: { position: 'absolute', top: 5, right: 5, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 5, backgroundColor: '#7654CD' },
  shopSoonText: { color: '#FFFFFF', fontSize: 4.5, fontWeight: '900', letterSpacing: 0.45 },
  shopName: { color: colors.text, fontSize: 8, fontWeight: '800', marginTop: 6 },
  shopMeta: { color: colors.muted, fontSize: 6, marginTop: 1 },
  shopMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 2 },
  shopCostBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 5, backgroundColor: 'rgba(100, 78, 18, 0.55)' },
  shopCostText: { color: '#FFE89A', fontSize: 5.5, fontWeight: '900' },
  centeredScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34, paddingBottom: 28 },
  comingSoonIcon: { width: 92, height: 92, alignItems: 'center', justifyContent: 'center', borderRadius: 32, backgroundColor: GAME_COLORS.primarySoft, borderWidth: 1.5, borderColor: '#A7DBF1', ...GAME_SHADOWS.soft },
  comingSoonEyebrow: { color: colors.accent, fontSize: 9, fontWeight: '800', letterSpacing: 1.8, marginTop: 18 },
  comingSoonTitle: { color: colors.text, fontSize: 25, fontWeight: '800', letterSpacing: -0.7, marginTop: 5 },
  comingSoonText: { maxWidth: 280, color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 7 },
  profileIdentity: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: GAME_RADII.panel, backgroundColor: GAME_COLORS.card, borderWidth: 1.5, borderColor: GAME_COLORS.border, ...GAME_SHADOWS.soft },
  profileAvatar: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: GAME_COLORS.primary, borderWidth: 2, borderColor: '#98DFFC' },
  profileInitial: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  profileIdentityCopy: { flex: 1, marginLeft: 12 },
  profileName: { color: colors.text, fontSize: 17, fontWeight: '800' },
  profileDetail: { color: colors.muted, fontSize: 8, marginTop: 3 },
  xpCard: { marginTop: 10, padding: 12, borderRadius: GAME_RADII.card, backgroundColor: GAME_COLORS.primarySoft, borderWidth: 1.5, borderColor: '#A7DBF0', ...GAME_SHADOWS.soft },
  xpCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  xpCardHeading: { color: GAME_COLORS.primaryDark, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  xpLevelBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: GAME_COLORS.primary, borderWidth: 1, borderColor: '#8EDCF3' },
  xpLevelBadgeText: { color: '#F3FBFF', fontSize: 10, fontWeight: '900' },
  xpNumbers: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginTop: 8 },
  xpCurrent: { color: GAME_COLORS.ink, fontSize: 18, fontWeight: '900' },
  xpTarget: { color: GAME_COLORS.muted, fontSize: 10, fontWeight: '700' },
  xpTrack: { height: 11, overflow: 'hidden', borderRadius: 6, backgroundColor: '#D5E8EE', borderWidth: 1, borderColor: '#B6D8E4', marginTop: 9 },
  xpFill: { height: '100%', borderRadius: 5, backgroundColor: GAME_COLORS.primary },
  xpRemaining: { color: GAME_COLORS.muted, fontSize: 9, fontWeight: '700', marginTop: 6 },
  statsGrid: { flexDirection: 'row', gap: 7, marginTop: 10 },
  statCard: { flex: 1, minWidth: 0, paddingVertical: 11, paddingHorizontal: 8, borderRadius: GAME_RADII.card, backgroundColor: GAME_COLORS.card, borderWidth: 1.5, borderColor: GAME_COLORS.border, ...GAME_SHADOWS.soft },
  statCardCyan: { backgroundColor: '#E4F7FB', borderColor: '#B4E0E8' },
  statCardOrange: { backgroundColor: '#FFF0E3', borderColor: '#F0C6A3' },
  statCardGold: { backgroundColor: GAME_COLORS.goldSoft, borderColor: '#E6CB79' },
  statValue: { color: colors.text, fontSize: 15, fontWeight: '800' },
  statLabel: { color: colors.muted, fontSize: 7, lineHeight: 10, marginTop: 2 },
  profileList: { overflow: 'hidden', borderRadius: GAME_RADII.card, backgroundColor: GAME_COLORS.card, borderWidth: 1.5, borderColor: GAME_COLORS.border, ...GAME_SHADOWS.soft },
  profileRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: GAME_COLORS.border },
  profileRowIcon: { width: 29, height: 29, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: GAME_COLORS.primarySoft },
  profileRowLabel: { flex: 1, color: colors.text, fontSize: 10, fontWeight: '700', marginLeft: 9 },
  profileRowValue: { color: colors.muted, fontSize: 8, marginRight: 4 },
  healthPanel: { marginTop: 14, padding: 12, borderRadius: GAME_RADII.card, flexDirection: 'row', alignItems: 'center', backgroundColor: GAME_COLORS.card, borderWidth: 1.5, borderColor: '#A8D6E8', ...GAME_SHADOWS.soft },
  healthPanelCopy: { flex: 1, paddingRight: 8 },
  healthPanelTitle: { color: GAME_COLORS.ink, fontSize: 12, fontWeight: '800' },
  healthPanelStatus: { color: GAME_COLORS.muted, fontSize: 10, marginTop: 3 },
  healthPanelButton: { minWidth: 82, minHeight: 38, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8, borderRadius: 11, backgroundColor: GAME_COLORS.primary, borderWidth: 1.5, borderColor: '#8ED5E9', ...GAME_SHADOWS.soft },
  healthPanelButtonText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  debugProgression: { marginTop: 16, padding: 10, borderRadius: GAME_RADII.control, backgroundColor: '#EAE7E1', borderWidth: 1, borderColor: '#CFC8BE' },
  debugTitle: { color: GAME_COLORS.muted, fontSize: 8, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8 },
  debugActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  debugButton: { width: '48%', minHeight: 38, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderRadius: 9, backgroundColor: '#D9EAF0' },
  debugButtonText: { color: GAME_COLORS.ink, fontSize: 9, fontWeight: '700', textAlign: 'center' },
  debugResetButton: { minHeight: 38, alignItems: 'center', justifyContent: 'center', marginTop: 8, borderRadius: 9, backgroundColor: '#F7DDDD', borderWidth: 1, borderColor: '#D98789' },
  debugResetText: { color: GAME_COLORS.redDark, fontSize: 10, fontWeight: '800' },
});
