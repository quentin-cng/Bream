import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GameIcon, type GameIconName } from './GameIcon';

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
                size={primary ? 24 : 18}
                color={primary && active ? '#15354B' : active ? '#DDF3FF' : '#829BB0'}
                strokeWidth={active ? 2.35 : 2}
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
    height: 72,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 7,
    paddingTop: 8,
    paddingBottom: 6,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#0D2232',
    borderTopWidth: 1.5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(108, 177, 214, 0.3)',
    shadowColor: '#071629',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.38,
    shadowRadius: 15,
    elevation: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    height: 55,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabActive: { backgroundColor: '#1F5573', borderColor: 'rgba(119, 213, 245, 0.35)' },
  tabPressed: { transform: [{ scale: 0.96 }], opacity: 0.9 },
  primaryTab: {
    alignSelf: 'stretch',
  },
  iconWrap: {
    width: 34,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  iconWrapActive: {
    backgroundColor: 'rgba(112, 212, 246, 0.13)',
  },
  primaryIconWrap: {
    width: 60,
    height: 60,
    marginTop: -18,
    borderRadius: 20,
    backgroundColor: '#21455C',
    borderWidth: 2,
    borderColor: 'rgba(143, 214, 244, 0.36)',
    shadowColor: '#071522',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 9,
    elevation: 6,
  },
  primaryIconWrapActive: {
    backgroundColor: '#7BD3F1',
    borderColor: '#C8F1FF',
  },
  label: {
    color: '#91A6BF',
    fontSize: 7.5,
    fontWeight: '800',
    marginTop: 2,
  },
  labelActive: {
    color: '#FFFFFF',
  },
  activeDot: {
    width: 14,
    height: 3,
    marginTop: 3,
    borderRadius: 3,
    backgroundColor: '#76D8FA',
  },
});
