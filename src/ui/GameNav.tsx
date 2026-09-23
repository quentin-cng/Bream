import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GameIcon, type GameIconName } from './GameIcon';
import { GAME_COLORS, GAME_RADII, GAME_SHADOWS } from './gameTheme';

export type MainTab = 'shop' | 'collection' | 'island' | 'friends' | 'profile';

const TABS: ReadonlyArray<{ id: MainTab; label: string; icon: GameIconName }> = [
  { id: 'shop', label: 'Shop', icon: 'shop' },
  { id: 'collection', label: 'Collection', icon: 'collection' },
  { id: 'island', label: 'Île', icon: 'island' },
  { id: 'friends', label: 'Amis', icon: 'friends' },
  { id: 'profile', label: 'Profil', icon: 'profile' },
];

export function GameNav({ activeTab, onSelect }: {
  activeTab: MainTab;
  onSelect: (tab: MainTab) => void;
}) {
  return (
    <View style={styles.shell}>
      {TABS.map((tab) => {
        const active = activeTab === tab.id;
        const primary = tab.id === 'island';
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(tab.id)}
            style={({ pressed }) => [
              styles.tab,
              primary && styles.primaryTab,
              active && !primary && styles.tabActive,
              pressed && styles.tabPressed,
            ]}
          >
            <View style={[
              styles.iconWrap,
              active && styles.iconWrapActive,
              primary && styles.primaryIconWrap,
              primary && active && styles.primaryIconWrapActive,
            ]}>
              <GameIcon
                name={tab.icon}
                size={primary ? 35 : 26}
                color={primary && active ? GAME_COLORS.primaryDark : active ? GAME_COLORS.primaryDark : '#6F7787'}
                strokeWidth={active ? 2.8 : 2.3}
              />
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
            {active ? <View style={styles.activeDot} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    height: 92,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 7,
    paddingTop: 8,
    paddingBottom: 6,
    borderTopLeftRadius: GAME_RADII.panel,
    borderTopRightRadius: GAME_RADII.panel,
    backgroundColor: GAME_COLORS.cream,
    borderTopWidth: 1.5,
    borderColor: GAME_COLORS.border,
    shadowColor: GAME_COLORS.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    height: 72,
    marginHorizontal: 2,
    borderRadius: GAME_RADII.control,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  tabActive: { backgroundColor: GAME_COLORS.white, borderColor: GAME_COLORS.border, ...GAME_SHADOWS.soft },
  tabPressed: { transform: [{ scale: 0.95 }, { translateY: 2 }], opacity: 0.9 },
  primaryTab: {
    alignSelf: 'stretch',
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  iconWrap: {
    width: 43,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: GAME_RADII.control,
  },
  iconWrapActive: {
    backgroundColor: GAME_COLORS.primarySoft,
  },
  primaryIconWrap: {
    width: 72,
    height: 66,
    marginTop: -24,
    borderRadius: 22,
    backgroundColor: GAME_COLORS.card,
    borderWidth: 2,
    borderColor: GAME_COLORS.border,
    ...GAME_SHADOWS.raised,
  },
  primaryIconWrapActive: {
    backgroundColor: GAME_COLORS.primarySoft,
    borderColor: '#7FD8FA',
  },
  label: {
    color: '#696879',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 2,
  },
  labelActive: {
    color: GAME_COLORS.ink,
  },
  activeDot: {
    width: 22,
    height: 3,
    marginTop: 3,
    borderRadius: 3,
    backgroundColor: GAME_COLORS.primary,
  },
});
