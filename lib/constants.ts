import { LoyaltyProgram, RevolutPartner, PointsPurchaseOption } from './types';

export const USER_PROGRAMS: LoyaltyProgram[] = [
  {
    id: 'sas-eurobonus',
    name: 'SAS EuroBonus',
    shortName: 'SAS',
    alliance: 'Star Alliance',
    programType: 'airline',
    currency: 'points',
    balance: 0,
    statusTier: 'Gold',
    baselineCpp: 1.2,
    color: '#000080',
    icon: '✈️',
    loginUrl: 'https://www.flysas.com/en/eurobonus/my-eurobonus/',
    lastUpdated: null,
  },
  {
    id: 'finnair-plus',
    name: 'Finnair Plus',
    shortName: 'Finnair',
    alliance: 'oneworld',
    programType: 'airline',
    currency: 'Avios',
    balance: 0,
    statusTier: 'Gold',
    baselineCpp: 1.0,
    color: '#0B1560',
    icon: '🇫🇮',
    loginUrl: 'https://www.finnair.com/en/finnair-plus',
    lastUpdated: null,
  },
  {
    id: 'miles-and-more',
    name: 'Miles & More',
    shortName: 'Lufthansa',
    alliance: 'Star Alliance',
    programType: 'airline',
    currency: 'miles',
    balance: 0,
    statusTier: 'Gold',
    baselineCpp: 0.8,
    color: '#05164D',
    icon: '🇩🇪',
    loginUrl: 'https://www.miles-and-more.com/ee/en/account/overview.html',
    lastUpdated: null,
  },
  {
    id: 'hilton-honors',
    name: 'Hilton Honors',
    shortName: 'Hilton',
    alliance: null,
    programType: 'hotel',
    currency: 'points',
    balance: 0,
    statusTier: 'Diamond',
    baselineCpp: 0.5,
    color: '#104C97',
    icon: '🏨',
    loginUrl: 'https://www.hilton.com/en/hilton-honors/guest/my-account/',
    lastUpdated: null,
  },
  {
    id: 'revolut-ultra',
    name: 'Revolut Ultra',
    shortName: 'Revolut',
    alliance: null,
    programType: 'card',
    currency: 'RevPoints',
    balance: 0,
    statusTier: 'Ultra',
    baselineCpp: 1.0,
    color: '#0075EB',
    icon: '💳',
    loginUrl: 'https://app.revolut.com/home',
    lastUpdated: null,
  },
];

/**
 * Currencies the user can buy outright. Price is the headline rate — set it from
 * what Revolut actually quotes; a wrong rate here produces a confidently wrong
 * recommendation, so it is deliberately one obvious place to edit.
 */
export const POINTS_PURCHASE: PointsPurchaseOption[] = [
  {
    programId: 'revolut-ultra',
    // Revolut quotes 15,000 points for EUR 240 one-off, or EUR 204 on a monthly
    // standing order (-32%). Normalised per 1,000 points: 240/15 and 204/15.
    pricePer1000Eur: 16,
    recurringPricePer1000Eur: 13.6,
    maxPerTransaction: 200000,
    notes:
      'RevPoints can be bought on demand and then transferred 1:1 to partner programs. ' +
      'Buying costs 1.6 cents per point one-off, or 1.36 cents on a monthly standing order, ' +
      'so a purchase only pays off when the redemption is worth more per point than that.',
  },
];

export const REVOLUT_PARTNERS: RevolutPartner[] = [
  {
    programName: 'Turkish Miles&Smiles',
    currency: 'miles',
    transferRatio: 1,
    baselineCppLow: 1.5,
    baselineCppHigh: 2.5,
    bestUse: 'Star Alliance long-haul business',
    sweetSpotExample: 'IST→JFK Business Class: 45,000 miles (worth ~€2,100)',
    sweetSpotCpp: 4.7,
    color: '#C8102E',
    icon: '🇹🇷',
  },
  {
    programName: 'Avianca LifeMiles',
    currency: 'miles',
    transferRatio: 1,
    baselineCppLow: 1.3,
    baselineCppHigh: 1.8,
    bestUse: 'Star Alliance redemptions, no fuel surcharges',
    sweetSpotExample: 'TLL→NRT via FRA Business: 63,000 miles (worth ~€2,500)',
    sweetSpotCpp: 3.9,
    color: '#E31837',
    icon: '🌎',
  },
  {
    programName: 'Avios (BA/Iberia/Finnair)',
    currency: 'Avios',
    transferRatio: 1,
    baselineCppLow: 1.2,
    baselineCppHigh: 1.5,
    bestUse: 'Short-haul Europe business, Finnair flights',
    sweetSpotExample: 'TLL→HEL→LHR Business: 21,000 Avios (worth ~€600)',
    sweetSpotCpp: 2.9,
    color: '#2E5090',
    icon: '🇬🇧',
  },
  {
    programName: 'SAS EuroBonus',
    currency: 'points',
    transferRatio: 1,
    baselineCppLow: 1.0,
    baselineCppHigh: 1.5,
    bestUse: 'Intra-Scandinavian, Star Alliance partners',
    sweetSpotExample: 'TLL→CPH→BKK Business: 66,000 pts (worth ~€2,000)',
    sweetSpotCpp: 3.0,
    color: '#000080',
    icon: '🇸🇪',
  },
  {
    programName: 'Flying Blue (KLM/AF)',
    currency: 'miles',
    transferRatio: 1,
    baselineCppLow: 1.0,
    baselineCppHigh: 1.4,
    bestUse: 'Promo Rewards, Europe–Africa routes',
    sweetSpotExample: 'AMS→NBO Business: 53,000 miles (worth ~€1,800)',
    sweetSpotCpp: 3.4,
    color: '#00A1E4',
    icon: '🇳🇱',
  },
  {
    programName: 'Etihad Guest',
    currency: 'miles',
    transferRatio: 1,
    baselineCppLow: 1.0,
    baselineCppHigh: 1.5,
    bestUse: 'ANA First Class, partner awards',
    sweetSpotExample: 'AUH→SYD Business: 56,500 miles (worth ~€2,400)',
    sweetSpotCpp: 4.2,
    color: '#BD8B13',
    icon: '🇦🇪',
  },
  {
    programName: 'Aegean Miles+Bonus',
    currency: 'miles',
    transferRatio: 1,
    baselineCppLow: 1.0,
    baselineCppHigh: 1.5,
    bestUse: 'Star Alliance Europe, sweet spot chart',
    sweetSpotExample: 'ATH→IST Business: 15,000 miles (worth ~€400)',
    sweetSpotCpp: 2.7,
    color: '#003366',
    icon: '🇬🇷',
  },
];

export const SEATS_AERO_SOURCES = {
  'sas-eurobonus': 'eurobonus',
  'finnair-plus': 'finnair',
  'miles-and-more': 'lufthansa',
  'turkish': 'turkish',
  'flying-blue': 'flyingblue',
  'avianca': 'avianca',
} as const;

export const ALLIANCE_COLORS: Record<string, string> = {
  'Star Alliance': '#FFB800',
  'oneworld': '#D4272E',
  'SkyTeam': '#6A4B9E',
};

export const CABIN_CLASSES = [
  { value: 'economy', label: 'Economy', shortLabel: 'Y' },
  { value: 'premium', label: 'Premium Economy', shortLabel: 'W' },
  { value: 'business', label: 'Business', shortLabel: 'J' },
  { value: 'first', label: 'First', shortLabel: 'F' },
] as const;
