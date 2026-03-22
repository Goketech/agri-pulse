export type RegionCode = "NG" | "RW";

export type UserRole = "agripreneur" | "mentor" | "admin";

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  region: RegionCode;
  role: UserRole;
  mfaEnabled?: boolean;
}

export interface MarketplaceListing {
  id: string;
  ownerId: string;
  ownerName?: string;
  equipmentName: string;
  description: string;
  condition: string;
  price: number;
  transactionType: "rent" | "sale";
  latitude?: number;
  longitude?: number;
  region: RegionCode;
  isVerified: boolean;
  status: string;
  createdAt: string;
}

export interface CropAnalyticsPoint {
  id: string;
  agripreneurId: string;
  cropType: string;
  soilHealthIndex?: number;
  historicalYield?: number;
  currentMarketPrice?: number;
  region: RegionCode;
  createdAt: string;
}

export interface LearningModuleSummary {
  id: string;
  title: string;
  content?: string;
  cropValueChain: string;
  durationMinutes: number;
  difficultyLevel: string;
  badgeName?: string;
}

export interface MentorMatch {
  id: string;
  name: string;
  email: string;
  region: RegionCode;
  expertise?: string;
  cropValueChain?: string;
  yearsOfExperience?: number;
  assignedCount: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  content: string;
  channel: string;
  read: boolean;
  sentAt: string;
}

export interface BadgeItem {
  id: string;
  name: string;
  description: string;
  moduleId?: string;
  awardedAt: string;
}

export interface EnrollmentItem {
  id: string;
  moduleId: string;
  moduleTitle: string;
  progressPercent: number;
  completed: boolean;
  completedAt?: string;
}

export interface PriceAlert {
  id: string;
  cropType: string;
  region: string;
  currentPrice: number;
  previousPrice: number;
  changePercent: number;
}
