import type { ComponentProps } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Armchair from 'lucide-react-native/icons/armchair';
import Bell from 'lucide-react-native/icons/bell';
import Building2 from 'lucide-react-native/icons/building';
import ChartNoAxesColumnIncreasing from 'lucide-react-native/icons/chart-no-axes-column-increasing';
import Check from 'lucide-react-native/icons/check';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Coins from 'lucide-react-native/icons/coins';
import Flame from 'lucide-react-native/icons/flame';
import Footprints from 'lucide-react-native/icons/footprints';
import Grid2X2 from 'lucide-react-native/icons/grid-2x2';
import House from 'lucide-react-native/icons/house';
import LayoutGrid from 'lucide-react-native/icons/layout-grid';
import LockKeyhole from 'lucide-react-native/icons/lock-keyhole';
import Mountain from 'lucide-react-native/icons/mountain';
import RotateCw from 'lucide-react-native/icons/rotate-cw';
import Settings from 'lucide-react-native/icons/settings';
import Sparkles from 'lucide-react-native/icons/sparkles';
import Store from 'lucide-react-native/icons/store';
import TreePine from 'lucide-react-native/icons/tree-pine';
import UserRound from 'lucide-react-native/icons/user-round';
import UsersRound from 'lucide-react-native/icons/users-round';
import X from 'lucide-react-native/icons/x';
import type { LucideIcon } from 'lucide-react-native';

export type GameIconName =
  | 'shop'
  | 'collection'
  | 'island'
  | 'friends'
  | 'profile'
  | 'steps'
  | 'streak'
  | 'energy'
  | 'lock'
  | 'arrow'
  | 'account'
  | 'notifications'
  | 'settings'
  | 'statistics'
  | 'rotate'
  | 'confirm'
  | 'cancel'
  | 'building'
  | 'house'
  | 'nature'
  | 'decor'
  | 'special'
  | 'footprint';

const ICONS: Record<GameIconName, LucideIcon> = {
  shop: Store,
  collection: LayoutGrid,
  island: Mountain,
  friends: UsersRound,
  profile: UserRound,
  steps: Footprints,
  streak: Flame,
  energy: Coins,
  lock: LockKeyhole,
  arrow: ChevronRight,
  account: UserRound,
  notifications: Bell,
  settings: Settings,
  statistics: ChartNoAxesColumnIncreasing,
  rotate: RotateCw,
  confirm: Check,
  cancel: X,
  building: Building2,
  house: House,
  nature: TreePine,
  decor: Armchair,
  special: Sparkles,
  footprint: Grid2X2,
};

export function GameIcon({
  name,
  size = 20,
  color = '#FFFFFF',
  strokeWidth = 2.1,
  style,
}: {
  name: GameIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const Icon = ICONS[name];
  const iconProps: ComponentProps<LucideIcon> = {
    size,
    color,
    strokeWidth,
    style,
  };
  return <Icon {...iconProps} />;
}
