import { HederaService } from './hedera-client';
import { EnvironmentalCredit, MarketplaceListing, ReFiPool, Transaction } from './types';

export class MarketplaceService {
  private hederaService: HederaService;

  constructor() {
    this.hederaService = new HederaService();
  }

  /**
   * Create a new environmental credit listing
   */
  async createListing(
    credit: EnvironmentalCredit,
    price: number,
    quantity: number,
    minPurchase: number = 1
  ): Promise<MarketplaceListing> {
    const listing: MarketplaceListing = {
      id: `listing-${Date.now()}`,
      creditId: credit.id,
      sellerId: credit.owner,
      price,
      currency: 'HBAR',
      quantity,
      minPurchase,
      description: `${credit.type} credits from ${credit.vintageYear}`,
      active: true,
      createdAt: new Date()
    };

    // In production, this would be stored on-chain or in a database
    // For now, we'll simulate the listing creation
    console.log('Creating marketplace listing:', listing);

    return listing;
  }

  /**
   * Purchase environmental credits
   */
  async purchaseCredits(
    listingId: string,
    buyerId: string,
    quantity: number
  ): Promise<Transaction> {
    // Simulate fetching the listing
    const listing = await this.getListingById(listingId);
    
    if (!listing) {
      throw new Error('Listing not found');
    }

    if (quantity < listing.minPurchase) {
      throw new Error(`Minimum purchase is ${listing.minPurchase} credits`);
    }

    if (quantity > listing.quantity) {
      throw new Error('Insufficient credits available');
    }

    const totalPrice = listing.price * quantity;

    // Execute the transfer
    const transferResult = await this.hederaService.transferHbar(
      listing.sellerId,
      totalPrice
    );

    const transaction: Transaction = {
      id: `tx-${Date.now()}`,
      type: 'credit_purchase',
      from: buyerId,
      to: listing.sellerId,
      amount: totalPrice,
      currency: 'HBAR',
      creditId: listing.creditId,
      timestamp: new Date(),
      hederaTxId: transferResult.transactionId,
      status: 'completed'
    };

    // Update listing quantity
    listing.quantity -= quantity;
    if (listing.quantity === 0) {
      listing.active = false;
    }

    return transaction;
  }

  /**
   * Create a ReFi staking pool
   */
  async createReFiPool(
    name: string,
    description: string,
    targetZones: string[],
    minimumStake: number,
    lockPeriod: number,
    targetApy: number
  ): Promise<ReFiPool> {
    const pool: ReFiPool = {
      id: `pool-${Date.now()}`,
      name,
      description,
      targetZones,
      totalStaked: 0,
      currency: 'HBAR',
      apy: targetApy,
      minimumStake,
      lockPeriod,
      impactMetrics: {
        carbonOffset: 0,
        biodiversityScore: 0,
        communityBenefit: 0
      },
      participants: 0,
      status: 'active'
    };

    // Create HCS topic for pool updates
    const topicResult = await this.hederaService.createMonitoringTopic(
      name,
      `ReFi Pool: ${description}`
    );

    console.log('Created ReFi pool with topic:', topicResult.topicId);

    return pool;
  }

  /**
   * Stake HBAR in a ReFi pool
   */
  async stakeInPool(
    poolId: string,
    stakerId: string,
    amount: number
  ): Promise<Transaction> {
    const pool = await this.getPoolById(poolId);
    
    if (!pool) {
      throw new Error('Pool not found');
    }

    if (amount < pool.minimumStake) {
      throw new Error(`Minimum stake is ${pool.minimumStake} HBAR`);
    }

    if (pool.status !== 'active') {
      throw new Error('Pool is not accepting new stakes');
    }

    // In production, this would lock the funds in a smart contract
    // For now, we simulate the staking
    const transaction: Transaction = {
      id: `tx-${Date.now()}`,
      type: 'stake',
      from: stakerId,
      to: poolId,
      amount,
      currency: 'HBAR',
      poolId,
      timestamp: new Date(),
      hederaTxId: `simulated-${Date.now()}`,
      status: 'completed'
    };

    // Update pool metrics
    pool.totalStaked += amount;
    pool.participants += 1;

    return transaction;
  }

  /**
   * Calculate and distribute staking rewards
   */
  async distributeRewards(poolId: string): Promise<Transaction[]> {
    const pool = await this.getPoolById(poolId);
    
    if (!pool) {
      throw new Error('Pool not found');
    }

    // Calculate rewards based on APY and time period
    const dailyRate = pool.apy / 365 / 100;
    const totalRewards = pool.totalStaked * dailyRate;

    // In production, this would distribute proportionally to all stakers
    // For demo, we'll create a single reward transaction
    const rewardTx: Transaction = {
      id: `tx-${Date.now()}`,
      type: 'reward_distribution',
      from: poolId,
      to: 'pool-participants',
      amount: totalRewards,
      currency: 'HBAR',
      poolId,
      timestamp: new Date(),
      hederaTxId: `simulated-${Date.now()}`,
      status: 'completed'
    };

    // Update pool impact metrics based on zone performance
    pool.impactMetrics.carbonOffset += Math.random() * 10;
    pool.impactMetrics.biodiversityScore += Math.random() * 5;
    pool.impactMetrics.communityBenefit += Math.random() * 3;

    return [rewardTx];
  }

  /**
   * Get marketplace statistics
   */
  async getMarketplaceStats(): Promise<any> {
    // In production, this would query actual data
    return {
      totalListings: 42,
      activeListings: 28,
      totalVolume: 1250000, // HBAR
      averagePrice: {
        carbon: 25,
        biodiversity: 50,
        water: 30,
        soil: 20
      },
      recentTransactions: 156,
      totalPools: 8,
      totalStaked: 500000, // HBAR
      averageApy: 12.5
    };
  }

  /**
   * Search and filter marketplace listings
   */
  async searchListings(
    filters: {
      creditType?: string;
      minPrice?: number;
      maxPrice?: number;
      vintageYear?: number;
      location?: string;
    }
  ): Promise<MarketplaceListing[]> {
    // In production, this would query a database with filters
    // For demo, returning mock data
    const mockListings: MarketplaceListing[] = [
      {
        id: 'listing-1',
        creditId: 'credit-1',
        sellerId: '0.0.1234',
        price: 25,
        currency: 'HBAR',
        quantity: 100,
        minPurchase: 10,
        description: 'Premium carbon credits from rainforest conservation',
        active: true,
        createdAt: new Date()
      },
      {
        id: 'listing-2',
        creditId: 'credit-2',
        sellerId: '0.0.5678',
        price: 45,
        currency: 'HBAR',
        quantity: 50,
        minPurchase: 5,
        description: 'Biodiversity credits from wetland restoration',
        active: true,
        createdAt: new Date()
      }
    ];

    return mockListings;
  }

  /**
   * Get price history for credit types
   */
  async getPriceHistory(creditType: string, days: number = 30): Promise<any> {
    // Generate mock price history data
    const history = [];
    const basePrice = creditType === 'carbon' ? 25 : 40;
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      history.push({
        date: date.toISOString().split('T')[0],
        price: basePrice + (Math.random() - 0.5) * 10,
        volume: Math.floor(Math.random() * 1000) + 100
      });
    }

    return {
      creditType,
      period: `${days} days`,
      data: history,
      trend: Math.random() > 0.5 ? 'up' : 'down',
      changePercent: (Math.random() * 20 - 10).toFixed(2)
    };
  }

  // Helper methods
  private async getListingById(id: string): Promise<MarketplaceListing | null> {
    // In production, fetch from database
    return {
      id,
      creditId: 'credit-1',
      sellerId: '0.0.1234',
      price: 25,
      currency: 'HBAR',
      quantity: 100,
      minPurchase: 10,
      description: 'Mock listing',
      active: true,
      createdAt: new Date()
    };
  }

  private async getPoolById(id: string): Promise<ReFiPool | null> {
    // In production, fetch from database
    return {
      id,
      name: 'Amazon Rainforest Conservation',
      description: 'Supporting local communities in rainforest protection',
      targetZones: ['zone-1', 'zone-2'],
      totalStaked: 10000,
      currency: 'HBAR',
      apy: 15,
      minimumStake: 100,
      lockPeriod: 30,
      impactMetrics: {
        carbonOffset: 1000,
        biodiversityScore: 85,
        communityBenefit: 92
      },
      participants: 25,
      status: 'active'
    };
  }
}