// Flare Network Integration - FTSO V2 & FAssets
import { ethers } from 'ethers';
import axios from 'axios';

// FTSO V2 Configuration for Coston2 Testnet
const FTSO_V2_CONFIG = {
  coston2: {
    ftsoV2: '0x3d893C53D9e8056135C26C8c638B76C8b60Df726',
    fastUpdatesConfiguration: '0xE7d1D5D58cAE01a82b84989A931999Cb34A86B14',
    relay: '0x6C4A5B5E87Be5CB16ecF1a9B78BCa5Ca07ca1F0b',
    ftsoRegistry: '0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019',
    wnat: '0xC67DCE33D7A8efA5FfEB961899C73fe01bCe9273'
  },
  flare: {
    ftsoV2: '0x5C5B5E7BcD1C432032b10c8cE57a08958A06dE07',
    fastUpdatesConfiguration: '0x3B1771C8CD2d60f8E1aF7C3C46d4A72261b7AEE8',
    relay: '0x31Ce666d4B38A7e1281244C59106c35AB53cD71B',
    ftsoRegistry: '0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019',
    wnat: '0x1D80c49BbBCd1C0911346656B529DF9E5c2F783d'
  }
};

// Feed ID mappings (bytes21 format)
const FEED_IDS = {
  'FLR/USD': '0x01464c522f55534400000000000000000000000000',
  'BTC/USD': '0x014254432f55534400000000000000000000000000', 
  'ETH/USD': '0x014554482f55534400000000000000000000000000',
  'XRP/USD': '0x015852502f55534400000000000000000000000000',
  'LTC/USD': '0x014c54432f55534400000000000000000000000000'
};

class FlareIntegration {
  constructor(config) {
    this.network = config.network || 'coston2';
    this.rpcUrl = this.getRPCUrl();
    this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
    
    // Use FTSO V2 contract addresses
    this.contracts = FTSO_V2_CONFIG[this.network];
    this.feedIds = FEED_IDS;
    
    this.ftsoSymbols = ['FLR/USD', 'XRP/USD', 'BTC/USD', 'ETH/USD', 'LTC/USD'];
    this.priceCache = new Map();
    this.cacheTimeout = 30000; // 30 seconds
  }

  getRPCUrl() {
    const urls = {
      'flare': 'https://flare-api.flare.network/ext/C/rpc',
      'coston': 'https://coston-api.flare.network/ext/C/rpc',
      'coston2': 'https://coston2-api.flare.network/ext/C/rpc'
    };
    return urls[this.network] || urls.flare;
  }

  // Get FTSO V2 contract
  getFTSOV2Contract() {
    const abi = [
      'function getFeedById(bytes21 feedId) external view returns (uint256 value, int8 decimals, uint64 timestamp)',
      'function getFeedByIdInWei(bytes21 feedId) external view returns (uint256 value, uint64 timestamp)',
      'function getFeedsById(bytes21[] calldata feedIds) external view returns (tuple(uint256 value, int8 decimals, uint64 timestamp)[] memory)',
      'function verifyFeedData(tuple(bytes32[] proof, tuple(uint32 votingRoundId, bytes21 id, int32 value, uint16 turnoutBIPS, int8 decimals) body) calldata) external view returns (bool)'
    ];
    
    return new ethers.Contract(this.contracts.ftsoV2, abi, this.provider);
  }

  // Get current price from FTSO V2
  async getCurrentPrice(symbol) {
    // Check cache first
    const cached = this.priceCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    
    const feedId = this.feedIds[symbol];
    if (!feedId) {
      throw new Error(`Unsupported symbol: ${symbol}`);
    }

    try {
      const ftsoV2 = this.getFTSOV2Contract();
      
      // Fetch price from FTSO V2
      const [value, decimals, timestamp] = await ftsoV2.getFeedById(feedId);
      
      const priceData = {
        symbol,
        price: Number(value) / Math.pow(10, Math.abs(Number(decimals))),
        timestamp: Number(timestamp) * 1000,
        decimals: Number(decimals),
        feedId,
        blockNumber: await this.provider.getBlockNumber(),
        verified: true,
        network: this.network
      };
      
      // Cache the result
      this.priceCache.set(symbol, {
        data: priceData,
        timestamp: Date.now()
      });
      
      console.log(`✅ Real FTSO V2 price for ${symbol}: $${priceData.price}`);
      return priceData;
      
    } catch (error) {
      console.error(`Failed to get FTSO V2 price for ${symbol}:`, error);
      
      // Fallback to mock data if testnet is down
      return {
        symbol,
        price: this.getMockPrice(symbol),
        timestamp: Date.now(),
        decimals: 5,
        feedId,
        mock: true,
        error: error.message
      };
    }
  }

  // Get mock price for development
  getMockPrice(symbol) {
    const prices = {
      'FLR/USD': 0.02 + Math.random() * 0.002,
      'XRP/USD': 0.50 + Math.random() * 0.05,
      'BTC/USD': 45000 + Math.random() * 1000,
      'ETH/USD': 2500 + Math.random() * 100,
      'LTC/USD': 65 + Math.random() * 5
    };
    return prices[symbol] || 100;
  }

  // Get multiple prices at once using batch FTSO V2 call
  async getMultiplePrices(symbols) {
    const feedIds = symbols.map(symbol => this.feedIds[symbol]).filter(Boolean);
    
    if (feedIds.length === 0) {
      console.error('No valid feed IDs for symbols:', symbols);
      return {};
    }
    
    try {
      const ftsoV2 = this.getFTSOV2Contract();
      
      // Batch fetch prices from FTSO V2
      const results = await ftsoV2.getFeedsById(feedIds);
      
      const prices = {};
      symbols.forEach((symbol, index) => {
        if (this.feedIds[symbol] && results[index]) {
          const [value, decimals, timestamp] = results[index];
          prices[symbol] = {
            symbol,
            price: Number(value) / Math.pow(10, Math.abs(Number(decimals))),
            timestamp: Number(timestamp) * 1000,
            decimals: Number(decimals),
            feedId: this.feedIds[symbol],
            verified: true,
            network: this.network
          };
        }
      });
      
      console.log(`✅ Fetched ${Object.keys(prices).length} real FTSO V2 prices`);
      return prices;
      
    } catch (error) {
      console.error('Batch price fetch failed:', error);
      
      // Fallback to individual fetches
      const pricePromises = symbols.map(symbol => this.getCurrentPrice(symbol));
      const pricesArray = await Promise.all(pricePromises);
      
      return pricesArray.reduce((acc, price) => {
        acc[price.symbol] = price;
        return acc;
      }, {});
    }
  }

  // Subscribe to price updates with event monitoring
  subscribeToPriceUpdates(symbols, callback, interval = 30000) {
    const updatePrices = async () => {
      try {
        const prices = await this.getMultiplePrices(symbols);
        callback(prices);
      } catch (error) {
        console.error('Price update error:', error);
      }
    };
    
    // Initial fetch
    updatePrices();
    
    // Set up polling (will be replaced with events when available)
    const intervalId = setInterval(updatePrices, interval);
    
    // Monitor for relay events (FTSO V2 updates)
    if (this.contracts.relay) {
      try {
        const relayAbi = ['event SigningPolicyRelayed(uint256 indexed rewardEpochId, bytes32 signingPolicyHash, bool isInitialRelay)'];
        const relay = new ethers.Contract(this.contracts.relay, relayAbi, this.provider);
        
        relay.on('SigningPolicyRelayed', async () => {
          console.log('📡 FTSO V2 update detected, fetching new prices...');
          await updatePrices();
        });
      } catch (error) {
        console.error('Failed to setup relay event listener:', error);
      }
    }
    
    // Return unsubscribe function
    return () => {
      clearInterval(intervalId);
      if (this.contracts.relay) {
        try {
          const relay = new ethers.Contract(this.contracts.relay, [], this.provider);
          relay.removeAllListeners('SigningPolicyRelayed');
        } catch {}
      }
    };
  }

  // Get supported FTSO V2 symbols
  async getSupportedSymbols() {
    // FTSO V2 uses feed IDs, return our configured symbols
    return Object.keys(this.feedIds);
  }
  
  // Verify feed data with Merkle proof
  async verifyFeedData(feedDataWithProof) {
    try {
      const ftsoV2 = this.getFTSOV2Contract();
      const isValid = await ftsoV2.verifyFeedData(feedDataWithProof);
      console.log(`📝 Feed data verification: ${isValid ? 'VALID' : 'INVALID'}`);
      return isValid;
    } catch (error) {
      console.error('Feed verification failed:', error);
      return false;
    }
  }

  // Calculate FAssets collateral requirements
  calculateCollateralRequirement(assetAmount, assetPrice, collateralRatio = 1.5) {
    const assetValueUSD = assetAmount * assetPrice;
    const requiredCollateral = assetValueUSD * collateralRatio;
    
    return {
      assetAmount,
      assetPrice,
      assetValueUSD,
      collateralRatio,
      requiredCollateral,
      currency: 'USD'
    };
  }

  // Mint FAssets (when available)
  async mintFAssets(assetType, amount, collateral) {
    console.log(`Minting ${amount} ${assetType} with ${collateral} USD collateral`);
    
    // This would interact with FAssets contracts when deployed
    // For now, return mock response
    return {
      success: true,
      assetType,
      amount,
      collateral,
      txHash: `0x${crypto.randomBytes(32).toString('hex')}`,
      fassetAddress: this.contracts.fassets[assetType.toLowerCase()] || '0x0',
      mock: true
    };
  }

  // Redeem FAssets
  async redeemFAssets(assetType, amount) {
    console.log(`Redeeming ${amount} ${assetType}`);
    
    // Mock redemption
    return {
      success: true,
      assetType,
      amount,
      underlyingAmount: amount * 0.99, // 1% fee
      txHash: `0x${crypto.randomBytes(32).toString('hex')}`,
      mock: true
    };
  }

  // Get secure random number from Flare
  async getSecureRandom() {
    try {
      const randomAbi = [
        'function getCurrentRandom() external view returns (uint256, bool, uint256)'
      ];
      
      // Flare's secure random contract
      const randomAddress = '0x1000000000000000000000000000000000000002';
      const randomContract = new ethers.Contract(randomAddress, randomAbi, this.provider);
      
      const [randomNumber, isSecure, timestamp] = await randomContract.getCurrentRandom();
      
      return {
        value: randomNumber.toString(),
        isSecure,
        timestamp: Number(timestamp),
        normalized: Number(randomNumber % 1000000n) / 1000000 // 0-1 range
      };
      
    } catch (error) {
      console.error('Failed to get secure random:', error);
      
      // Fallback to pseudo-random
      return {
        value: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(),
        isSecure: false,
        timestamp: Date.now(),
        normalized: Math.random(),
        mock: true
      };
    }
  }

  // Wrap native FLR tokens
  async wrapNativeTokens(amount, signer) {
    try {
      const wnatAbi = [
        'function deposit() external payable',
        'function withdraw(uint256) external',
        'function balanceOf(address) external view returns (uint256)'
      ];
      
      const wnat = new ethers.Contract(this.contracts.wnat, wnatAbi, signer);
      
      // Wrap FLR to WFLR
      const tx = await wnat.deposit({ value: ethers.parseEther(amount.toString()) });
      await tx.wait();
      
      return {
        success: true,
        amount,
        txHash: tx.hash,
        wnatAddress: this.contracts.wnat
      };
      
    } catch (error) {
      console.error('Failed to wrap tokens:', error);
      throw error;
    }
  }

  // Get reward epoch info
  async getRewardEpochInfo() {
    try {
      const ftsoManagerAbi = [
        'function getCurrentRewardEpoch() external view returns (uint256)',
        'function getRewardEpochStartTimestamp(uint256 _rewardEpoch) external view returns (uint256)',
        'function getRewardEpochDurationSeconds() external view returns (uint256)'
      ];
      
      const ftsoManager = new ethers.Contract(
        this.contracts.ftsoManager, 
        ftsoManagerAbi, 
        this.provider
      );
      
      const currentEpoch = await ftsoManager.getCurrentRewardEpoch();
      const startTimestamp = await ftsoManager.getRewardEpochStartTimestamp(currentEpoch);
      const duration = await ftsoManager.getRewardEpochDurationSeconds();
      
      return {
        currentEpoch: Number(currentEpoch),
        startTimestamp: Number(startTimestamp),
        duration: Number(duration),
        endTimestamp: Number(startTimestamp) + Number(duration)
      };
      
    } catch (error) {
      console.error('Failed to get reward epoch info:', error);
      
      // Mock data
      return {
        currentEpoch: Math.floor(Date.now() / (3.5 * 24 * 60 * 60 * 1000)),
        startTimestamp: Date.now() - (24 * 60 * 60 * 1000),
        duration: 3.5 * 24 * 60 * 60,
        endTimestamp: Date.now() + (2.5 * 24 * 60 * 60 * 1000),
        mock: true
      };
    }
  }

  // Get price history (mock implementation)
  async getPriceHistory(symbol, periods = 24) {
    const currentPrice = await this.getCurrentPrice(symbol);
    const history = [];
    
    for (let i = periods; i > 0; i--) {
      const variation = (Math.random() - 0.5) * 0.1;
      const historicalPrice = currentPrice.price * (1 + variation);
      
      history.push({
        timestamp: Date.now() - (i * 60 * 60 * 1000),
        price: historicalPrice,
        symbol
      });
    }
    
    history.push({
      timestamp: Date.now(),
      price: currentPrice.price,
      symbol
    });
    
    return history;
  }

  // Calculate price statistics
  calculatePriceStats(priceHistory) {
    const prices = priceHistory.map(p => p.price);
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    const variance = prices.reduce((sum, price) => {
      return sum + Math.pow(price - mean, 2);
    }, 0) / prices.length;
    
    const stdDev = Math.sqrt(variance);
    
    return {
      mean,
      min: Math.min(...prices),
      max: Math.max(...prices),
      stdDev,
      volatility: (stdDev / mean) * 100,
      trend: prices[prices.length - 1] > prices[0] ? 'up' : 'down'
    };
  }
}

export default FlareIntegration;