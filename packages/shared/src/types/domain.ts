export type RegionCode = "NG" | "RW";

export type UserRole = "agripreneur" | "mentor" | "admin";

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  region: RegionCode;
  role: UserRole;
}

export interface MarketplaceListing {
  id: string;
  ownerId: string;
  equipmentName: string;
  condition: string;
  price: number;
  transactionType: "rent" | "sale";
  geolocation?: string;
  isVerified: boolean;
}

export interface CropAnalyticsPoint {
  id: string;
  agripreneurId: string;
  cropType: string;
  soilHealthIndex?: number;
  historicalYield?: number;
  currentMarketPrice?: number;
  region: RegionCode;
}

export interface LearningModuleSummary {
  id: string;
  title: string;
  cropValueChain: string;
  durationMinutes: number;
  difficultyLevel: string;
}

