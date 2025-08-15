// Core type definitions for EcoNexus platform

export interface CommunityZone {
  id: string;
  name: string;
  description: string;
  location: {
    latitude: number;
    longitude: number;
    area: number; // in hectares
  };
  owner: {
    accountId: string;
    name: string;
    type: 'individual' | 'community' | 'organization';
  };
  metrics: EnvironmentalMetrics;
  status: 'pending' | 'active' | 'verified' | 'suspended';
  createdAt: Date;
  verifiedAt?: Date;
  guardianPolicyId?: string;
}

export interface EnvironmentalMetrics {
  carbonSequestration: {
    current: number; // tons CO2
    baseline: number;
    change: number; // percentage
  };
  biodiversity: {
    speciesCount: number;
    biodiversityIndex: number; // 0-100
    endangeredSpecies: string[];
  };
  waterQuality: {
    index: number; // 0-100
    pollutants: string[];
  };
  soilHealth: {
    organicMatter: number; // percentage
    erosionRate: number;
    fertility: number; // 0-100
  };
  lastUpdated: Date;
}

export interface EnvironmentalCredit {
  id: string;
  type: 'carbon' | 'biodiversity' | 'water' | 'soil';
  amount: number;
  unit: string;
  zoneId: string;
  vintageYear: number;
  methodology: string;
  status: 'pending' | 'verified' | 'issued' | 'retired';
  tokenId?: string;
  price?: number;
  owner: string;
  metadata: Record<string, any>;
}

export interface MarketplaceListing {
  id: string;
  creditId: string;
  sellerId: string;
  price: number;
  currency: 'HBAR' | 'USD';
  quantity: number;
  minPurchase: number;
  description: string;
  active: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

export interface ReFiPool {
  id: string;
  name: string;
  description: string;
  targetZones: string[];
  totalStaked: number;
  currency: 'HBAR';
  apy: number;
  minimumStake: number;
  lockPeriod: number; // in days
  impactMetrics: {
    carbonOffset: number;
    biodiversityScore: number;
    communityBenefit: number;
  };
  participants: number;
  status: 'active' | 'closed' | 'completed';
}

export interface Transaction {
  id: string;
  type: 'credit_purchase' | 'stake' | 'unstake' | 'reward_distribution';
  from: string;
  to: string;
  amount: number;
  currency: string;
  creditId?: string;
  poolId?: string;
  timestamp: Date;
  hederaTxId: string;
  status: 'pending' | 'completed' | 'failed';
}

export interface AIMonitoringAlert {
  id: string;
  zoneId: string;
  type: 'deforestation' | 'illegal_activity' | 'biodiversity_change' | 'water_pollution';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: Date;
  location: {
    latitude: number;
    longitude: number;
  };
  evidence: {
    type: 'satellite' | 'audio' | 'sensor' | 'citizen_report';
    data: string; // URL or base64 encoded data
  };
  resolved: boolean;
  resolvedAt?: Date;
  actions: string[];
}

export interface UserProfile {
  id: string;
  accountId: string;
  name: string;
  email: string;
  role: 'farmer' | 'conservationist' | 'investor' | 'consumer' | 'admin';
  zones: string[];
  credits: {
    owned: EnvironmentalCredit[];
    sold: number;
    purchased: number;
  };
  stakingPositions: {
    poolId: string;
    amount: number;
    rewards: number;
  }[];
  impactScore: number;
  joinedAt: Date;
}

export interface SupplyChainProduct {
  id: string;
  name: string;
  description: string;
  producer: string;
  origin: {
    zoneId: string;
    location: string;
  };
  certifications: string[];
  environmentalFootprint: {
    carbonEmissions: number;
    waterUsage: number;
    sustainabilityScore: number;
  };
  trackingHistory: {
    stage: string;
    location: string;
    timestamp: Date;
    handler: string;
  }[];
  qrCode: string;
  verified: boolean;
}