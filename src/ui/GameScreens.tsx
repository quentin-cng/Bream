import { useState, type ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  getObjectsByCategory,
  type PlaceableType,
} from '../island/objectCatalog';
import { GameIcon, type GameIconName } from './GameIcon';

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
  placeableType?: PlaceableType;
  locked?: boolean;
  comingSoon?: boolean;
};

const BUILDING_DESCRIPTIONS: Record<PlaceableType, string> = {
  balconyHouse: 'Une maison accueillante avec un balcon ouvert sur les nuages.',
  townBuilding: 'Un bâtiment élancé qui donne du relief à ton petit village.',
  civicHouse: 'Une maison longue, idéale pour structurer un quartier.',
  gardenHouse: 'Une petite maison compacte qui se glisse facilement partout.',
  cozyCottage: 'Un cottage chaleureux pour créer un coin calme et cozy.',
};

const BUILDABLE_COLLECTION_ITEMS: CollectionItem[] = getObjectsByCategory('buildings').map(
  ([type, definition]) => ({
    id: type,
    name: definition.name,
    category: 'buildings',
    level: definition.unlockLevel,
    cost: definition.cost,
    icon: type === 'townBuilding' ? 'building' : 'house',
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

export function CollectionScreen({ onBuild }: { onBuild: (type: PlaceableType) => void }) {
  const [category, setCategory] = useState<CollectionCategory>('all');
  const [selectedId, setSelectedId] = useState(BUILDABLE_COLLECTION_ITEMS[0]?.id ?? '');
  const items = COLLECTION_ITEMS.filter((item) => category === 'all' || item.category === category);
  const selectedItem = COLLECTION_ITEMS.find((item) => item.id === selectedId) ?? items[0];

  const selectCategory = (nextCategory: CollectionCategory) => {
    setCategory(nextCategory);
    const firstItem = COLLECTION_ITEMS.find((item) => (
      nextCategory === 'all' || item.category === nextCategory
    ));
    if (firstItem) setSelectedId(firstItem.id);
  };
  return (
    <ScreenScroll>
      <ScreenHeader
        eyebrow="MON MONDE"
        title="Collection"
        subtitle="Découvre ce qui donnera vie à ton île."
        trailing={(
          <View style={styles.countBadge}>
            <Text style={styles.countValue}>{BUILDABLE_COLLECTION_ITEMS.length}</Text>
            <Text style={styles.countLabel}>débloqués</Text>
          </View>
        )}
      />
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
      {selectedItem ? (
        <View style={[
          styles.collectionDetail,
          (selectedItem.locked || selectedItem.comingSoon) && styles.collectionDetailLocked,
        ]}>
          <View style={styles.collectionDetailIcon}>
            {selectedItem.thumbnail ? (
              <Image source={selectedItem.thumbnail} resizeMode="contain" style={styles.collectionDetailImage} />
            ) : (
              <GameIcon
                name={selectedItem.icon}
                size={28}
                color={selectedItem.locked || selectedItem.comingSoon ? '#C9A6FF' : '#C5EAF7'}
                strokeWidth={1.9}
              />
            )}
          </View>
          <View style={styles.collectionDetailCopy}>
            <Text style={styles.collectionDetailEyebrow}>
              {selectedItem.locked ? `DÉBLOCAGE · NIVEAU ${selectedItem.level}` : selectedItem.comingSoon ? 'COMING SOON' : 'PRÊT À CONSTRUIRE'}
            </Text>
            <Text style={styles.collectionDetailTitle}>{selectedItem.name}</Text>
            <Text numberOfLines={2} style={styles.collectionDetailText}>{selectedItem.description}</Text>
            <View style={styles.collectionDetailMeta}>
              {selectedItem.footprint ? (
                <View style={styles.detailMetaPill}>
                  <GameIcon name="footprint" size={9} color="#9ED4E7" />
                  <Text style={styles.detailMetaText}>{selectedItem.footprint}</Text>
                </View>
              ) : null}
              <View style={styles.detailMetaPill}>
                <GameIcon name="energy" size={9} color="#FFD75A" />
                <Text style={styles.detailMetaText}>{selectedItem.cost}</Text>
              </View>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !selectedItem.placeableType }}
            disabled={!selectedItem.placeableType}
            onPress={() => selectedItem.placeableType && onBuild(selectedItem.placeableType)}
            style={({ pressed }) => [
              styles.detailBuildButton,
              !selectedItem.placeableType && styles.detailBuildButtonDisabled,
              pressed && styles.primaryButtonPressed,
            ]}
          >
            <GameIcon
              name={selectedItem.placeableType ? 'building' : 'lock'}
              size={14}
              color="#FFFFFF"
            />
            <Text style={styles.detailBuildButtonText}>
              {selectedItem.placeableType ? 'Construire' : selectedItem.comingSoon ? 'Bientôt' : 'Verrouillé'}
            </Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.collectionGrid}>
        {items.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedId === item.id }}
            onPress={() => setSelectedId(item.id)}
            style={({ pressed }) => [
              styles.objectCard,
              !item.locked && !item.comingSoon && styles.objectCardOwned,
              item.locked && styles.objectCardLocked,
              selectedId === item.id && styles.objectCardSelected,
              pressed && styles.objectCardPressed,
            ]}
          >
            <View style={[styles.objectVisual, item.locked && styles.objectVisualLocked]}>
              <View style={[
                styles.levelBadge,
                item.locked && styles.levelBadgeLocked,
                item.comingSoon && styles.levelBadgeSpecial,
              ]}>
                <Text style={styles.levelBadgeText}>NIV. {item.level}</Text>
              </View>
              <View style={[styles.objectIconWrap, item.locked && styles.objectIconWrapLocked]}>
                {item.thumbnail ? (
                  <Image source={item.thumbnail} resizeMode="contain" style={styles.objectThumbnail} />
                ) : (
                  <GameIcon
                    name={item.icon}
                    size={28}
                    color={item.locked ? '#617585' : '#BFDFEE'}
                    strokeWidth={1.8}
                  />
                )}
              </View>
              {item.locked ? (
                <View style={styles.lockOverlay}>
                  <GameIcon name="lock" size={17} />
                </View>
              ) : null}
              {item.comingSoon ? (
                <View style={styles.cardBadge}><Text style={styles.cardBadgeText}>SOON</Text></View>
              ) : null}
            </View>
            <Text numberOfLines={1} style={styles.objectName}>{item.name}</Text>
            {item.locked ? (
              <View style={styles.levelRequirement}>
                <GameIcon name="lock" size={8} color="#C9A6FF" />
                <Text style={[styles.objectMeta, styles.lockedMeta]}>Niveau {item.level}</Text>
              </View>
            ) : item.comingSoon ? (
              <Text style={[styles.objectMeta, styles.specialMeta]}>Coming Soon</Text>
            ) : (
              <View style={styles.costBadge}>
                <GameIcon name="energy" size={8} color="#FFD75A" />
                <Text style={styles.costBadgeText}>{item.cost}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </ScreenScroll>
  );
}

export function ShopScreen() {
  return (
    <ScreenScroll>
      <ScreenHeader
        eyebrow="NOUVEAUTÉS"
        title="Shop"
        subtitle="Des ambiances et objets cosmétiques pour personnaliser ton monde."
        trailing={<CurrencyBadge />}
      />
      <View style={styles.featuredCard}>
        <View style={styles.featuredOrb}>
          <GameIcon name="special" size={46} color="#B7D8EE" strokeWidth={1.5} />
        </View>
        <Text style={styles.featuredEyebrow}>COLLECTION À VENIR</Text>
        <Text style={styles.featuredTitle}>Ciel d’aurore</Text>
        <Text style={styles.featuredText}>Une lumière douce et de nouvelles décorations célestes.</Text>
        <View style={styles.soonPill}><Text style={styles.soonPillText}>COMING SOON</Text></View>
      </View>
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
              <GameIcon name={icon as GameIconName} size={27} color="#B8D6EA" strokeWidth={1.7} />
            </View>
            <Text style={styles.shopName}>{name}</Text>
            <View style={styles.shopMetaRow}>
              <Text style={styles.shopMeta}>Aperçu</Text>
              <View style={styles.shopCostBadge}>
                <GameIcon name="energy" size={7} color="#FFD75A" />
                <Text style={styles.shopCostText}>{cost}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScreenScroll>
  );
}

function CurrencyBadge() {
  return (
    <View style={styles.currencyBadge}>
      <GameIcon name="energy" size={14} color="#F3D786" />
      <Text style={styles.currencyValue}>240</Text>
    </View>
  );
}

export function FriendsScreen() {
  return (
    <View style={styles.centeredScreen}>
      <View style={styles.comingSoonIcon}>
        <GameIcon name="friends" size={42} color="#A9C8E6" />
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
      <View style={styles.profileRowIcon}><GameIcon name={icon} size={17} color="#A9C8E6" /></View>
      <Text style={styles.profileRowLabel}>{label}</Text>
      <Text style={styles.profileRowValue}>{value}</Text>
      <GameIcon name="arrow" size={18} color="#7188A1" />
    </View>
  );
}

export function ProfileScreen() {
  return (
    <ScreenScroll>
      <ScreenHeader eyebrow="TON ESPACE" title="Profil" subtitle="Tes préférences et ta progression en un coup d’œil." />
      <View style={styles.profileIdentity}>
        <View style={styles.profileAvatar}><Text style={styles.profileInitial}>A</Text></View>
        <View style={styles.profileIdentityCopy}>
          <Text style={styles.profileName}>Alex</Text>
          <Text style={styles.profileDetail}>Explorateur de l’île · données fictives</Text>
        </View>
      </View>
      <View style={styles.statsGrid}>
        {[
          { value: '128k', label: 'Pas au total', icon: 'steps' as const, tone: 'cyan' },
          { value: '7', label: 'Jours de série', icon: 'streak' as const, tone: 'orange' },
          { value: '240', label: 'Énergie', icon: 'energy' as const, tone: 'gold' },
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
      <Text style={styles.sectionTitle}>Compte et préférences</Text>
      <View style={styles.profileList}>
        <ProfileRow icon="account" label="Compte" value="Local" />
        <ProfileRow icon="notifications" label="Notifications" value="Bientôt" />
        <ProfileRow icon="settings" label="Réglages" value="" />
        <ProfileRow icon="statistics" label="Statistiques" value="Aperçu" />
      </View>
    </ScreenScroll>
  );
}

const colors = {
  navy: '#102A49',
  navySoft: '#183858',
  text: '#F3F8FD',
  muted: '#A4B8CB',
  accent: '#65CFF1',
  green: '#63D47C',
  gold: '#FFD75A',
  purple: '#A881F1',
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 11, paddingBottom: 18 },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 13 },
  headerCopy: { flex: 1, paddingRight: 12 },
  eyebrow: { color: '#82A9C4', fontSize: 7, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: colors.text, fontSize: 25, fontWeight: '800', letterSpacing: -0.8, marginTop: 2 },
  subtitle: { color: colors.muted, fontSize: 9, lineHeight: 14, marginTop: 3 },
  countBadge: { alignItems: 'center', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 12, backgroundColor: '#1E5570', borderWidth: 1.5, borderColor: 'rgba(112, 213, 247, 0.42)', shadowColor: '#071522', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 3 },
  countValue: { color: '#D9F5FF', fontSize: 12, fontWeight: '900' },
  countLabel: { color: colors.muted, fontSize: 6, fontWeight: '700' },
  categoryRow: { gap: 5, paddingRight: 6, marginBottom: 11 },
  categoryChip: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 11, backgroundColor: '#263B4D', borderWidth: 1.5, borderColor: 'rgba(162, 197, 222, 0.17)', shadowColor: '#071522', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.13, shadowRadius: 3, elevation: 2 },
  categoryChipActive: { backgroundColor: '#70D1F1', borderColor: '#C8F1FF', shadowOpacity: 0.27 },
  categoryChipPressed: { transform: [{ scale: 0.96 }], opacity: 0.9 },
  categoryText: { color: '#D5E0E9', fontSize: 8, fontWeight: '700' },
  categoryTextActive: { color: colors.navy },
  collectionDetail: { minHeight: 112, flexDirection: 'row', alignItems: 'center', marginBottom: 11, padding: 10, borderRadius: 16, backgroundColor: '#1E4C5C', borderWidth: 1.5, borderColor: 'rgba(94, 211, 121, 0.58)', shadowColor: '#071522', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  collectionDetailLocked: { backgroundColor: '#352E4E', borderColor: 'rgba(170, 126, 229, 0.58)' },
  collectionDetailIcon: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 16, backgroundColor: '#17191D', borderWidth: 1, borderColor: 'rgba(182, 224, 240, 0.16)' },
  collectionDetailImage: { width: '100%', height: '100%' },
  collectionDetailCopy: { flex: 1, minWidth: 0, marginHorizontal: 9 },
  collectionDetailEyebrow: { color: '#72DC8C', fontSize: 5.5, fontWeight: '900', letterSpacing: 0.75 },
  collectionDetailTitle: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', marginTop: 2 },
  collectionDetailText: { color: '#B6C8D4', fontSize: 7, lineHeight: 10, marginTop: 2 },
  collectionDetailMeta: { flexDirection: 'row', gap: 4, marginTop: 5 },
  detailMetaPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 5, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(8, 25, 36, 0.42)' },
  detailMetaText: { color: '#D4E2EB', fontSize: 6, fontWeight: '800' },
  detailBuildButton: { minWidth: 72, height: 42, alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 8, borderRadius: 12, backgroundColor: '#55CB6F', borderWidth: 1.5, borderColor: '#93E6A4', shadowColor: '#102C18', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.32, shadowRadius: 5, elevation: 4 },
  detailBuildButtonDisabled: { backgroundColor: '#674D8D', borderColor: 'rgba(211, 178, 255, 0.34)', opacity: 0.78 },
  detailBuildButtonText: { color: '#FFFFFF', fontSize: 6.5, fontWeight: '900' },
  collectionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  objectCard: { width: '31.9%', minHeight: 132, padding: 6, borderRadius: 14, backgroundColor: '#263C4E', borderWidth: 1.5, borderColor: 'rgba(171, 204, 228, 0.2)', shadowColor: '#071522', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.26, shadowRadius: 8, elevation: 4 },
  objectCardOwned: { borderColor: 'rgba(94, 211, 121, 0.7)', backgroundColor: '#294A55' },
  objectCardLocked: { opacity: 0.82, backgroundColor: '#322D4A', borderColor: 'rgba(164, 120, 224, 0.56)' },
  objectCardSelected: { borderColor: '#7BDCF8', backgroundColor: '#31576A', shadowOpacity: 0.38, transform: [{ translateY: -1 }] },
  objectCardPressed: { transform: [{ scale: 0.97 }], opacity: 0.92 },
  objectVisual: { height: 77, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 10, backgroundColor: '#315A6C', borderWidth: 1, borderColor: 'rgba(128, 220, 239, 0.16)' },
  objectVisualLocked: { backgroundColor: '#342E4C', borderColor: 'rgba(174, 130, 235, 0.18)' },
  objectIconWrap: { width: '86%', height: '78%', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 12, backgroundColor: 'rgba(18, 24, 28, 0.72)' },
  objectIconWrapLocked: { opacity: 0.55, backgroundColor: 'rgba(15, 30, 40, 0.4)' },
  objectThumbnail: { width: '100%', height: '100%' },
  lockOverlay: { position: 'absolute', width: 35, height: 35, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: 'rgba(79, 49, 113, 0.88)', borderWidth: 1, borderColor: 'rgba(205, 169, 255, 0.34)' },
  levelBadge: { position: 'absolute', top: 5, left: 5, zIndex: 2, paddingHorizontal: 5, paddingVertical: 3, borderRadius: 6, backgroundColor: '#2A8EAD', borderWidth: 1, borderColor: 'rgba(163, 232, 251, 0.35)' },
  levelBadgeLocked: { backgroundColor: '#704FA7', borderColor: 'rgba(214, 183, 255, 0.36)' },
  levelBadgeSpecial: { backgroundColor: '#7654CD' },
  levelBadgeText: { color: '#FFFFFF', fontSize: 5, fontWeight: '900', letterSpacing: 0.45 },
  cardBadge: { position: 'absolute', top: 5, right: 5, paddingHorizontal: 5, paddingVertical: 3, borderRadius: 6, backgroundColor: '#7654CD' },
  cardBadgeText: { color: '#FFFFFF', fontSize: 5, fontWeight: '900', letterSpacing: 0.6 },
  objectName: { color: colors.text, fontSize: 8, fontWeight: '800', marginTop: 7 },
  objectMeta: { color: colors.muted, fontSize: 6, marginTop: 2, fontWeight: '700' },
  lockedMeta: { color: '#C9A6FF' },
  specialMeta: { color: '#B99AF3' },
  levelRequirement: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  costBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3, paddingHorizontal: 5, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(100, 78, 18, 0.56)', borderWidth: 1, borderColor: 'rgba(255, 218, 90, 0.25)' },
  costBadgeText: { color: '#FFE89A', fontSize: 6, fontWeight: '900' },
  buildCallout: { marginTop: 11, padding: 12, borderRadius: 17, backgroundColor: '#224554', borderWidth: 1.5, borderColor: 'rgba(92, 213, 122, 0.48)', shadowColor: '#071522', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  calloutCopy: { marginBottom: 8 },
  calloutEyebrow: { color: colors.green, fontSize: 8, fontWeight: '800', letterSpacing: 1.3 },
  calloutTitle: { color: colors.text, fontSize: 14, fontWeight: '800', marginTop: 2 },
  calloutText: { color: colors.muted, fontSize: 8, lineHeight: 12, marginTop: 2 },
  primaryButton: { height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 12, backgroundColor: '#55CB6F', borderWidth: 1.5, borderColor: '#93E6A4', shadowColor: '#102C18', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 5, elevation: 5 },
  primaryButtonPressed: { transform: [{ scale: 0.985 }, { translateY: 2 }], shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  currencyBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 14, backgroundColor: 'rgba(84, 66, 22, 0.94)', borderWidth: 1.5, borderColor: 'rgba(255, 215, 90, 0.48)', shadowColor: '#191305', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.28, shadowRadius: 5, elevation: 3 },
  currencyValue: { color: colors.text, fontSize: 12, fontWeight: '800' },
  featuredCard: { minHeight: 138, justifyContent: 'flex-end', overflow: 'hidden', padding: 14, borderRadius: 17, backgroundColor: '#3C3568', borderWidth: 1.5, borderColor: 'rgba(190, 153, 245, 0.48)', shadowColor: '#0D081B', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 11, elevation: 5 },
  featuredOrb: { position: 'absolute', top: -30, right: -4, width: 130, height: 130, alignItems: 'center', justifyContent: 'center', borderRadius: 65, backgroundColor: 'rgba(160, 119, 222, 0.28)' },
  featuredEyebrow: { color: '#C9A6FF', fontSize: 8, fontWeight: '900', letterSpacing: 1.3 },
  featuredTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 3 },
  featuredText: { width: '62%', color: colors.muted, fontSize: 9, lineHeight: 14, marginTop: 4 },
  soonPill: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(152, 104, 219, 0.4)', borderWidth: 1, borderColor: 'rgba(215, 183, 255, 0.22)' },
  soonPillText: { color: '#E1CCFF', fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  sectionTitle: { color: colors.text, fontSize: 13, fontWeight: '800', marginTop: 13, marginBottom: 7 },
  shopGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  shopCard: { width: '31.9%', padding: 6, borderRadius: 14, backgroundColor: '#294355', borderWidth: 1.5, borderColor: 'rgba(102, 193, 229, 0.32)', shadowColor: '#071522', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.23, shadowRadius: 7, elevation: 3 },
  shopVisual: { height: 74, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 10, backgroundColor: '#315A70', borderWidth: 1, borderColor: 'rgba(122, 213, 244, 0.18)' },
  shopVisualGreen: { backgroundColor: '#315D58', borderColor: 'rgba(99, 214, 124, 0.26)' },
  shopVisualPurple: { backgroundColor: '#493D69', borderColor: 'rgba(190, 153, 245, 0.3)' },
  shopVisualGold: { backgroundColor: '#65582E', borderColor: 'rgba(255, 215, 90, 0.28)' },
  shopSoonBadge: { position: 'absolute', top: 5, right: 5, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 5, backgroundColor: '#7654CD' },
  shopSoonText: { color: '#FFFFFF', fontSize: 4.5, fontWeight: '900', letterSpacing: 0.45 },
  shopName: { color: colors.text, fontSize: 8, fontWeight: '800', marginTop: 6 },
  shopMeta: { color: colors.muted, fontSize: 6, marginTop: 1 },
  shopMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 2 },
  shopCostBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 5, backgroundColor: 'rgba(100, 78, 18, 0.55)' },
  shopCostText: { color: '#FFE89A', fontSize: 5.5, fontWeight: '900' },
  centeredScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34, paddingBottom: 28 },
  comingSoonIcon: { width: 92, height: 92, alignItems: 'center', justifyContent: 'center', borderRadius: 32, backgroundColor: 'rgba(25, 59, 89, 0.86)', borderWidth: 1, borderColor: 'rgba(176, 208, 235, 0.2)' },
  comingSoonEyebrow: { color: colors.accent, fontSize: 9, fontWeight: '800', letterSpacing: 1.8, marginTop: 18 },
  comingSoonTitle: { color: colors.text, fontSize: 25, fontWeight: '800', letterSpacing: -0.7, marginTop: 5 },
  comingSoonText: { maxWidth: 280, color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 7 },
  profileIdentity: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 20, backgroundColor: '#193F5D', borderWidth: 1.5, borderColor: 'rgba(103, 203, 239, 0.34)', shadowColor: '#071522', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.22, shadowRadius: 9, elevation: 4 },
  profileAvatar: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#4E9ED0', borderWidth: 2, borderColor: '#90DDF7' },
  profileInitial: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  profileIdentityCopy: { flex: 1, marginLeft: 12 },
  profileName: { color: colors.text, fontSize: 17, fontWeight: '800' },
  profileDetail: { color: colors.muted, fontSize: 8, marginTop: 3 },
  statsGrid: { flexDirection: 'row', gap: 7, marginTop: 10 },
  statCard: { flex: 1, minWidth: 0, paddingVertical: 11, paddingHorizontal: 8, borderRadius: 15, backgroundColor: '#183A53', borderWidth: 1.5, borderColor: 'rgba(164, 199, 228, 0.18)', shadowColor: '#071522', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 5, elevation: 3 },
  statCardCyan: { backgroundColor: '#174B5B', borderColor: 'rgba(118, 224, 238, 0.35)' },
  statCardOrange: { backgroundColor: '#593C39', borderColor: 'rgba(255, 155, 104, 0.38)' },
  statCardGold: { backgroundColor: '#594C2B', borderColor: 'rgba(255, 215, 90, 0.38)' },
  statValue: { color: colors.text, fontSize: 15, fontWeight: '800' },
  statLabel: { color: colors.muted, fontSize: 7, lineHeight: 10, marginTop: 2 },
  profileList: { overflow: 'hidden', borderRadius: 18, backgroundColor: '#173A55', borderWidth: 1.5, borderColor: 'rgba(103, 190, 229, 0.28)', shadowColor: '#071522', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 7, elevation: 3 },
  profileRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(155, 188, 217, 0.14)' },
  profileRowIcon: { width: 29, height: 29, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: 'rgba(93, 141, 181, 0.17)' },
  profileRowLabel: { flex: 1, color: colors.text, fontSize: 10, fontWeight: '700', marginLeft: 9 },
  profileRowValue: { color: colors.muted, fontSize: 8, marginRight: 4 },
});
