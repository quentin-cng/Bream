// Shop presentation data only. Nothing here can grant Energy or start a payment.
export type EnergyPack = {
  id: string;
  name: string;
  amount: number;
  displayPrice: string;
  icon: 'energy';
  enabled: boolean;
  futureProductId: string | null;
};

export const ENERGY_PACKS: readonly EnergyPack[] = [
  { id: 'energy_small', name: 'Petit pack Énergie', amount: 500, displayPrice: 'Prix à venir', icon: 'energy', enabled: false, futureProductId: null },
  { id: 'energy_medium', name: 'Pack Énergie moyen', amount: 2500, displayPrice: 'Prix à venir', icon: 'energy', enabled: false, futureProductId: null },
  { id: 'energy_large', name: 'Grand pack Énergie', amount: 8000, displayPrice: 'Prix à venir', icon: 'energy', enabled: false, futureProductId: null },
];
