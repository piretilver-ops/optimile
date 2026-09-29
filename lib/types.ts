export interface LoyaltyProgram {
  id: string;
  name: string;
  shortName: string;
  alliance: 'Star Alliance' | 'oneworld' | 'SkyTeam' | null;
  programType: 'airline' | 'hotel' | 'card';
  currency: string; // "miles", "points", "Avios"
  balance: number;
  statusTier: string | null;
  baselineCpp: number; // cents per point baseline
  color: string; // brand color hex
  icon: string; // emoji fallback
  loginUrl: string; // direct link to balance page
  lastUpdated: string | null; // ISO date string
}

export interface RevolutPartner {
  programName: string;
  currency: string;
  transferRatio: number; // RevPoints : Partner points
  baselineCppLow: number;
  baselineCppHigh: number;
  bestUse: string;
  sweetSpotExample: string;
  sweetSpotCpp: number;
  color: string;
  icon: string;
}

export interface StatusMatch {
  id: string;
  fromProgram: string;
  fromTier: string;
  toProgram: string;
  toTier: string;
  matchType: 'match' | 'challenge' | 'paid';
  cost: string;
  deadline: string | null;
  requirements: string;
  url: string;
  notes: string;
}

export interface Deal {
  id: string;
  title: string;
  description: string;
  program: string;
  dealType: 'buy_miles' | 'transfer_bonus' | 'status_match' | 'promo';
  url: string;
  expiresAt: string | null;
  scrapedAt: string;
  isRead: boolean;
}

export interface AwardSearchParams {
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  cabin: 'economy' | 'premium' | 'business' | 'first';
  sources: string[]; // e.g. ['eurobonus', 'finnair', 'turkish']
}

export interface AwardResult {
  id: string;
  source: string; // program source id
  origin: string;
  destination: string;
  date: string;
  cabin: string;
  miles: number;
  taxes: number; // EUR
  seatsRemaining: number;
  direct: boolean;
  airline: string;
  cashFare?: number; // EUR, from Kiwi comparison
  cpp?: number; // calculated cents per point
}

export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
}
